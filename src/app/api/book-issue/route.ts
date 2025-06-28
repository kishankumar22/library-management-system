import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import sql from 'mssql';

export async function GET() {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT bi.*, b.Title AS BookTitle, 
                   s.fName + ' ' + s.lName AS StudentName,
                   c.courseName, sad.courseYear
            FROM BookIssue bi
            JOIN Books b ON bi.BookId = b.BookId
            JOIN Student s ON bi.StudentId = s.id
            JOIN Course c ON s.courseId = c.id
            LEFT JOIN StudentAcademicDetails sad ON s.id = sad.studentId
            ORDER BY bi.IssueDate DESC
        `);
        return NextResponse.json(result.recordset);
    } catch (error: any) {
        logger.error('Error fetching book issues', { error: error.message, stack: error.stack });
        return NextResponse.json({ message: 'Error fetching book issues' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { BookId, StudentId, Days, Remarks } = await req.json();
        
        if (!BookId || !StudentId || !Days) {
            logger.error('Missing required fields for book issue', { BookId, StudentId, Days });
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const pool = await getConnection();
        
        // Check book availability
        const bookCheck = await pool.request()
            .input('BookId', BookId)
            .query('SELECT AvailableCopies FROM Books WHERE BookId = @BookId');
            
        if (bookCheck.recordset.length === 0 || bookCheck.recordset[0].AvailableCopies <= 0) {
            logger.error(`Book not available: ${BookId}`);
            return NextResponse.json({ message: 'Book not available' }, { status: 400 });
        }
        
        // Calculate dates
        const issueDate = new Date().toISOString();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Days);
        
        // Create issue record
        await pool.request()
            .input('BookId', BookId)
            .input('StudentId', StudentId)
            .input('IssueDate', issueDate)
            .input('DueDate', dueDate.toISOString())
            .input('Status', 'issued')
            .input('CreatedBy', 'admin')
            .query(`
                INSERT INTO BookIssue (BookId, StudentId, IssueDate, DueDate, Status, CreatedBy)
                VALUES (@BookId, @StudentId, @IssueDate, @DueDate, @Status, @CreatedBy)
            `);
            
        // Update book available copies
        await pool.request()
            .input('BookId', BookId)
            .query('UPDATE Books SET AvailableCopies = AvailableCopies - 1 WHERE BookId = @BookId');
            
        logger.info(`Book issued successfully: ${BookId} to student ${StudentId}`);
        return NextResponse.json({ message: 'Book issued successfully' });
    } catch (error: any) {
        logger.error('Error issuing book', { error: error.message, stack: error.stack });
        return NextResponse.json({ message: 'Error issuing book' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const issueId = searchParams.get('id');
        const { status, remarks, renewDays } = await req.json();
        
        if (!issueId) {
            logger.error('Issue ID is required');
            return NextResponse.json({ message: 'Issue ID is required' }, { status: 400 });
        }

        const pool = await getConnection();
        
        // First get the current issue details
        const issueResult = await pool.request()
            .input('IssueId', issueId)
            .query('SELECT BookId, Status, DueDate FROM BookIssue WHERE IssueId = @IssueId');
            
        if (issueResult.recordset.length === 0) {
            logger.error(`Issue not found: ${issueId}`);
            return NextResponse.json({ message: 'Issue not found' }, { status: 404 });
        }
        
        const currentIssue = issueResult.recordset[0];
        
        if (status === 'returned') {
            // Verify book is currently issued
            if (currentIssue.Status !== 'issued') {
                logger.error(`Book not in issued state: ${issueId}`);
                return NextResponse.json({ message: 'Book is not currently issued' }, { status: 400 });
            }
            
            // Start transaction to ensure both operations succeed or fail together
            const transaction = new sql.Transaction(pool);
            try {
                await transaction.begin();
                
                // Update book issue record
                await transaction.request()
                    .input('IssueId', issueId)
                    .input('ReturnDate', new Date().toISOString())
                    .input('Status', 'returned')
                    .input('Remarks', remarks || null)
                    .query(`
                        UPDATE BookIssue 
                        SET ReturnDate = @ReturnDate, 
                            Status = @Status,
                            Remarks = @Remarks,
                            ModifiedOn = GETDATE()
                        WHERE IssueId = @IssueId
                    `);
                
                // Update book available copies
                await transaction.request()
                    .input('BookId', currentIssue.BookId)
                    .query('UPDATE Books SET AvailableCopies = AvailableCopies + 1 WHERE BookId = @BookId');
                
                await transaction.commit();
                
                logger.info(`Book returned successfully: ${issueId}`);
                return NextResponse.json({ message: 'Book returned successfully' });
            } catch (transactionError: any) {
                await transaction.rollback();
                logger.error('Transaction failed during book return', { error: transactionError.message, stack: transactionError.stack });
                throw transactionError;
            }
            
        } else if (renewDays) {
            // Verify book is currently issued
            if (currentIssue.Status !== 'issued') {
                logger.error(`Book not in issued state: ${issueId}`);
                return NextResponse.json({ message: 'Book is not currently issued' }, { status: 400 });
            }
            
            // Calculate new due date
            const currentDueDate = new Date(currentIssue.DueDate);
            const newDueDate = new Date(currentDueDate);
            newDueDate.setDate(currentDueDate.getDate() + renewDays);
            
            // Update book issue record
            await pool.request()
                .input('IssueId', issueId)
                .input('DueDate', newDueDate.toISOString())
                .input('IsRenewed', true)
                .input('ModifiedOn', new Date().toISOString())
                .query(`
                    UPDATE BookIssue 
                    SET DueDate = @DueDate,
                        IsRenewed = @IsRenewed,
                        ModifiedOn = @ModifiedOn
                    WHERE IssueId = @IssueId
                `);
                
            logger.info(`Book renewed successfully: ${issueId} for ${renewDays} days`);
            return NextResponse.json({ 
                message: 'Book renewed successfully',
                newDueDate: newDueDate.toISOString()
            });
        } else {
            logger.error('Invalid action for book issue');
            return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        logger.error('Error processing book issue request', { error: error.message, stack: error.stack });
        return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const issueId = searchParams.get('id');
        const { BookId, StudentId, Days, Remarks } = await req.json();
        
        if (!issueId) {
            logger.error('Issue ID is required');
            return NextResponse.json({ message: 'Issue ID is required' }, { status: 400 });
        }

        if (!BookId || !StudentId || !Days) {
            logger.error('Missing required fields for updating book issue', { BookId, StudentId, Days });
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const pool = await getConnection();
        
        // Check if issue exists and is in issued state
        const issueResult = await pool.request()
            .input('IssueId', issueId)
            .query('SELECT BookId, Status FROM BookIssue WHERE IssueId = @IssueId');
            
        if (issueResult.recordset.length === 0) {
            logger.error(`Issue not found: ${issueId}`);
            return NextResponse.json({ message: 'Issue not found' }, { status: 404 });
        }

        const currentIssue = issueResult.recordset[0];
        if (currentIssue.Status !== 'issued') {
            logger.error(`Book not in issued state: ${issueId}`);
            return NextResponse.json({ message: 'Book is not currently issued' }, { status: 400 });
        }

        // Check book availability if BookId is changing
        let originalBookId = currentIssue.BookId;
        if (BookId !== originalBookId) {
            const bookCheck = await pool.request()
                .input('BookId', BookId)
                .query('SELECT AvailableCopies FROM Books WHERE BookId = @BookId');
                
            if (bookCheck.recordset.length === 0 || bookCheck.recordset[0].AvailableCopies <= 0) {
                logger.error(`Book not available: ${BookId}`);
                return NextResponse.json({ message: 'Book not available' }, { status: 400 });
            }
        }

        // Start transaction
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();

            // Calculate new due date
            const issueDate = new Date().toISOString();
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + Days);

            // Update issue record
            await transaction.request()
                .input('IssueId', issueId)
                .input('BookId', BookId)
                .input('StudentId', StudentId)
                .input('IssueDate', issueDate)
                .input('DueDate', dueDate.toISOString())
                .input('Remarks', Remarks || null)
                .query(`
                    UPDATE BookIssue 
                    SET BookId = @BookId,
                        StudentId = @StudentId,
                        IssueDate = @IssueDate,
                        DueDate = @DueDate,
                        Remarks = @Remarks,
                        ModifiedOn = GETDATE()
                    WHERE IssueId = @IssueId
                `);

            // Update book copies if BookId changed
            if (BookId !== originalBookId) {
                // Increment copies for original book
                await transaction.request()
                    .input('BookId', originalBookId)
                    .query('UPDATE Books SET AvailableCopies = AvailableCopies + 1 WHERE BookId = @BookId');
                
                // Decrement copies for new book
                await transaction.request()
                    .input('BookId', BookId)
                    .query('UPDATE Books SET AvailableCopies = AvailableCopies - 1 WHERE BookId = @BookId');
            }

            await transaction.commit();
            logger.info(`Book issue updated successfully: ${issueId}`);
            return NextResponse.json({ message: 'Book issue updated successfully' });
        } catch (transactionError: any) {
            await transaction.rollback();
            logger.error('Transaction failed during book issue update', { error: transactionError.message, stack: transactionError.stack });
            throw transactionError;
        }
    } catch (error: any) {
        logger.error('Error updating book issue', { error: error.message, stack: error.stack });
        return NextResponse.json({ message: 'Error updating book issue' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const issueId = searchParams.get('id');
        
        if (!issueId) {
            logger.error('Issue ID is required for deletion');
            return NextResponse.json({ message: 'Issue ID is required' }, { status: 400 });
        }

        const pool = await getConnection();
        
        // Check if issue exists and is in issued state
        const issueResult = await pool.request()
            .input('IssueId', issueId)
            .query('SELECT BookId, Status FROM BookIssue WHERE IssueId = @IssueId');
            
        if (issueResult.recordset.length === 0) {
            logger.error(`Issue not found: ${issueId}`);
            return NextResponse.json({ message: 'Issue not found' }, { status: 404 });
        }

        const currentIssue = issueResult.recordset[0];
        if (currentIssue.Status !== 'issued') {
            logger.error(`Book not in issued state: ${issueId}`);
            return NextResponse.json({ message: 'Book is not currently issued' }, { status: 400 });
2        }

        // Start transaction
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();

            // Delete issue record
            await transaction.request()
                .input('IssueId', issueId)
                .query('DELETE FROM BookIssue WHERE IssueId = @IssueId');

            // Update book available copies
            await transaction.request()
                .input('BookId', currentIssue.BookId)
                .query('UPDATE Books SET AvailableCopies = AvailableCopies + 1 WHERE BookId = @BookId');

            await transaction.commit();
            logger.info(`Book issue deleted successfully: ${issueId}`);
            return NextResponse.json({ message: 'Book issue deleted successfully' });
        } catch (transactionError: any) {
            await transaction.rollback();
            logger.error('Transaction failed during book issue deletion', { error: transactionError.message, stack: transactionError.stack });
            throw transactionError;
        }
    } catch (error: any) {
        logger.error('Error deleting book issue', { error: error.message, stack: error.stack });
        return NextResponse.json({ message: 'Error deleting book issue' }, { status: 500 });
    }
}