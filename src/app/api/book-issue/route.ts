import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import sql from 'mssql';


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');

    const pool = await getConnection();

    // ✅ Step 1: Auto-update overdue records
    await pool.request().query(`
      UPDATE BookIssue
      SET Status = 'overdue'
      WHERE Status = 'issued' AND DueDate < GETDATE() AND ReturnDate IS NULL
    `);

    // ✅ Step 2: Prepare filtered SELECT query
    let query = `
      SELECT 
        bi.*, 
        b.Title AS BookTitle, 
        s.fName + ' ' + s.lName AS StudentName,
        s.id,s.email,
        c.courseName,
        bi.ReturnDate
      FROM BookIssue bi
      JOIN Books b ON bi.BookId = b.BookId
      JOIN Student s ON bi.StudentId = s.id
      JOIN Course c ON s.courseId = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (studentId) {
      query += ` AND bi.StudentId = @StudentId`;
      params.push({ name: 'StudentId', type: sql.Int, value: studentId });
    }

    if (status) {
      query += ` AND bi.Status = @Status`;
      params.push({ name: 'Status', type: sql.VarChar, value: status });
    }

    query += ` ORDER BY bi.IssueDate DESC`;

    const request = pool.request();
    params.forEach(param => request.input(param.name, param.type, param.value));
    const result = await request.query(query);

    return NextResponse.json(result.recordset);

  } catch (error: any) {
    logger.error('Error fetching book issues', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error fetching book issues' }, { status: 500 });
  }
}




export async function POST(req: NextRequest) {
  try {
    const { BookId, StudentId, Days, Remarks ,CreatedBy} = await req.json();

    if (!BookId || !StudentId || !Days) {
      logger.error('Missing required fields for book issue', { BookId, StudentId, Days });
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const pool = await getConnection();

    // Check book availability
    const bookCheck = await pool.request()
      .input('BookId', sql.Int, BookId)
      .query('SELECT AvailableCopies FROM Books WHERE BookId = @BookId');

    if (bookCheck.recordset.length === 0 || bookCheck.recordset[0].AvailableCopies <= 0) {
      logger.error(`Book not available: ${BookId}`);
      return NextResponse.json({ message: 'Book not available' }, { status: 400 });
    }

    // Check if the same book is already issued or overdue to the same student
    const existingIssue = await pool.request()
      .input('BookId', sql.Int, BookId)
      .input('StudentId', sql.Int, StudentId)
      .query(`
        SELECT Status FROM BookIssue 
        WHERE BookId = @BookId 
          AND StudentId = @StudentId 
          AND Status IN ('issued', 'overdue')
      `);

    if (existingIssue.recordset.length > 0) {
      const status = existingIssue.recordset[0].Status;
      const message =
        status === 'overdue'
          ? 'This book is overdue and cannot be issued again until returned'
          : 'This book is already issued to the student';

      logger.error(`${message}: Book ${BookId}, Student ${StudentId}`);
      return NextResponse.json({ message }, { status: 400 });
    }

    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Days);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Insert Book Issue
    await pool.request()
      .input('BookId', sql.Int, BookId)
      .input('StudentId', sql.Int, StudentId)
      .input('IssueDate', sql.Date, issueDate)
      .input('DueDate', sql.Date, dueDateStr)
      .input('Status', sql.VarChar, 'issued')
      .input('Remarks', sql.NVarChar, Remarks || 'Added New Book')
      .input('CreatedBy', sql.NVarChar, CreatedBy || 'system')

      .query(`
        INSERT INTO BookIssue (BookId, StudentId, IssueDate, DueDate, Status, CreatedBy, Remarks)
        VALUES (@BookId, @StudentId, @IssueDate, @DueDate, @Status, @CreatedBy, @Remarks)
      `);

    // Update Book availability
    await pool.request()
      .input('BookId', sql.Int, BookId)
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
    const { status, remarks, fineAmount, renewDays ,ModifiedBy } = await req.json();

    if (!issueId) {
      logger.error('Issue ID is required');
      return NextResponse.json({ message: 'Issue ID is required' }, { status: 400 });
    }

    const pool = await getConnection();

    const issueResult = await pool.request()
      .input('IssueId', sql.Int, issueId)
      .query('SELECT BookId, Status, DueDate FROM BookIssue WHERE IssueId = @IssueId');

    if (issueResult.recordset.length === 0) {
      logger.error(`Issue not found: ${issueId}`);
      return NextResponse.json({ message: 'Issue not found' }, { status: 404 });
    }

    const currentIssue = issueResult.recordset[0];

    if (status === 'returned') {
      if (currentIssue.Status !== 'issued' && currentIssue.Status !== 'overdue') {
        logger.error(`Book not in issued state: ${issueId}`);
        return NextResponse.json({ message: 'Book is not currently issued' }, { status: 400 });
      }

      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        const returnDate = new Date().toISOString();
        const dueDate = new Date(currentIssue.DueDate);
        const returnDateObj = new Date(returnDate);
        const isLate = returnDateObj > dueDate;

        await transaction.request()
          .input('IssueId', sql.Int, issueId)
          .input('ReturnDate', sql.VarChar, returnDate)
          .input('Status', sql.VarChar, 'returned')
          .input('Remarks', sql.NVarChar, remarks || null)
          .input('ModifiedBy', sql.NVarChar, ModifiedBy || 'system')
          .query(`
            UPDATE BookIssue 
            SET ReturnDate = @ReturnDate, 
                Status = @Status,
                Remarks = CASE 
                            WHEN @Remarks IS NOT NULL AND CAST(@ReturnDate AS DATE) <= CAST(DueDate AS DATE) 
                            THEN @Remarks 
                            ELSE Remarks 
                          END,
                ModifiedBy = @ModifiedBy,
                ModifiedOn = GETDATE()
            WHERE IssueId = @IssueId
          `);

        await transaction.request()
          .input('BookId', sql.Int, currentIssue.BookId)
          .query('UPDATE Books SET AvailableCopies = AvailableCopies + 1 WHERE BookId = @BookId');

        if (isLate && fineAmount && fineAmount > 0) {
          await transaction.request()
            .input('IssueId', sql.Int, issueId)
            .input('Amount', sql.Float, fineAmount)
            .input('CreatedBy', sql.NVarChar, 'admin')
            .input('Remarks', sql.NVarChar, remarks || 'Late return penalty')
            .query(`
              INSERT INTO Penalty (IssueId, Amount, Status, Remarks, CreatedBy, CreatedOn)
              VALUES (@IssueId, @Amount, 'unpaid', @Remarks, @CreatedBy, GETDATE())
            `);
        }

        await transaction.commit();

        logger.info(`Book returned successfully: ${issueId}`);
        return NextResponse.json({ message: 'Book returned successfully' });
      } catch (transactionError: any) {
        await transaction.rollback();
        logger.error('Transaction failed during book return', { error: transactionError.message, stack: transactionError.stack });
        throw transactionError;
      }
    } else if (status === 'renewed') {
      if (currentIssue.Status !== 'issued') {
        logger.error(`Book not in issued state: ${issueId}`);
        return NextResponse.json({ message: 'Book is not currently issued' }, { status: 400 });
      }

      const newDueDate = new Date(currentIssue.DueDate);
      newDueDate.setDate(newDueDate.getDate() + (renewDays || 7));

      await pool.request()
        .input('IssueId', sql.Int, issueId)
        .input('DueDate', sql.VarChar, newDueDate.toISOString())
        .input('IsRenewed', sql.Bit, true)
        .input('ModifiedOn', sql.VarChar, new Date().toISOString())
        .query(`
          UPDATE BookIssue 
          SET DueDate = @DueDate,
              IsRenewed = @IsRenewed,
              ModifiedOn = @ModifiedOn
          WHERE IssueId = @IssueId
        `);

      logger.info(`Book renewed successfully: ${issueId} for ${renewDays || 7} days`);
      return NextResponse.json({
        message: 'Book renewed successfully',
        newDueDate: newDueDate.toISOString(),
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
    const { BookId, StudentId, Days, Remarks, ModifiedBy } = await req.json();

    if (!issueId) {
      logger.error('Issue ID is required');
      return NextResponse.json({ message: 'Issue ID is required' }, { status: 400 });
    }

    if (!BookId || !StudentId || !Days) {
      logger.error('Missing required fields for updating book issue', { BookId, StudentId, Days });
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const pool = await getConnection();

    const issueResult = await pool.request()
      .input('IssueId', sql.Int, issueId)
      .query('SELECT BookId, Status FROM BookIssue WHERE IssueId = @IssueId');

    if (issueResult.recordset.length === 0) {
      logger.error(`Issue not found: ${issueId}`);
      return NextResponse.json({ message: 'Issue not found' }, { status: 404 });
    }

 const currentIssue = issueResult.recordset[0];
if (currentIssue.Status !== 'issued' && currentIssue.Status !== 'overdue') {
  logger.error(`Book not in returnable state: ${issueId}`);
  return NextResponse.json({ message: 'Book is not currently eligible for return' }, { status: 400 });
}


    let originalBookId = currentIssue.BookId;
    if (BookId !== originalBookId) {
      const bookCheck = await pool.request()
        .input('BookId', sql.Int, BookId)
        .query('SELECT AvailableCopies FROM Books WHERE BookId = @BookId');

      if (bookCheck.recordset.length === 0 || bookCheck.recordset[0].AvailableCopies <= 0) {
        logger.error(`Book not available: ${BookId}`);
        return NextResponse.json({ message: 'Book not available' }, { status: 400 });
      }
    }

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      const issueDate = new Date().toISOString();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Days);

     await transaction.request()
  .input('IssueId', sql.Int, issueId)
  .input('BookId', sql.Int, BookId)
  .input('StudentId', sql.Int, StudentId)
  .input('IssueDate', sql.VarChar, issueDate)
  .input('DueDate', sql.VarChar, dueDate.toISOString())
  .input('Remarks', sql.NVarChar, Remarks || null)
  .input('ModifiedBy', sql.NVarChar, ModifiedBy || 'system')
  .query(`
    UPDATE BookIssue 
    SET BookId = @BookId,
        StudentId = @StudentId,
        IssueDate = @IssueDate,
        DueDate = @DueDate,
        Remarks = @Remarks,
        ModifiedBy = @ModifiedBy,
        ModifiedOn = GETDATE()
    WHERE IssueId = @IssueId
  `);


      if (BookId !== originalBookId) {
        await transaction.request()
          .input('BookId', sql.Int, originalBookId)
          .query('UPDATE Books SET AvailableCopies = AvailableCopies + 1 WHERE BookId = @BookId');

        await transaction.request()
          .input('BookId', sql.Int, BookId)
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
      logger.error('Issue ID is required');
      return NextResponse.json({ message: 'Issue ID is required' }, { status: 400 });
    }

    const pool = await getConnection();

    const issueResult = await pool.request()
      .input('IssueId', sql.Int, issueId)
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

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      await transaction.request()
        .input('IssueId', sql.Int, issueId)
        .query('DELETE FROM BookIssue WHERE IssueId = @IssueId');

      await transaction.request()
        .input('BookId', sql.Int, currentIssue.BookId)
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