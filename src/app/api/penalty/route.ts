import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import sql from 'mssql';

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT p.*, bi.*, b.Title AS BookTitle, 
             s.fName + ' ' + s.lName AS StudentName,
             c.courseName, sad.courseYear
      FROM Penalty p
      JOIN BookIssue bi ON p.IssueId = bi.IssueId
      JOIN Books b ON bi.BookId = b.BookId
      JOIN Student s ON bi.StudentId = s.id
      JOIN Course c ON s.courseId = c.id
      LEFT JOIN StudentAcademicDetails sad ON s.id = sad.studentId
      ORDER BY p.CreatedOn DESC
    `);
    return NextResponse.json(result.recordset);
  } catch (error: any) {
    logger.error('Error fetching penalties', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error fetching penalties' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const penaltyId = searchParams.get('id');
    const { Status } = await req.json();

    if (!penaltyId) {
      logger.error('Penalty ID is required');
      return NextResponse.json({ message: 'Penalty ID is required' }, { status: 400 });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('PenaltyId', sql.Int, penaltyId)
      .query('SELECT * FROM Penalty WHERE PenaltyId = @PenaltyId');

    if (result.recordset.length === 0) {
      logger.error(`Penalty not found: ${penaltyId}`);
      return NextResponse.json({ message: 'Penalty not found' }, { status: 404 });
    }

    await pool.request()
      .input('PenaltyId', sql.Int, penaltyId)
      .input('Status', sql.VarChar, Status)
      .input('ModifiedBy', sql.NVarChar, 'Kishan Kumar')
      .input('ModifiedOn', sql.DateTime, new Date())
      .query(`
        UPDATE Penalty 
        SET Status = @Status, 
            ModifiedBy = @ModifiedBy, 
            ModifiedOn = @ModifiedOn
        WHERE PenaltyId = @PenaltyId
      `);

    logger.info(`Penalty updated successfully: ${penaltyId}`);
    return NextResponse.json({ message: 'Penalty updated successfully' });
  } catch (error: any) {
    logger.error('Error updating penalty', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error updating penalty' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { IssueId, Amount, Remarks, CreatedBy } = await req.json();

    if (!IssueId || !Amount || !CreatedBy) {
      logger.error('Missing required fields for penalty', { IssueId, Amount });
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      await transaction.request()
        .input('IssueId', sql.Int, IssueId)
        .input('Amount', sql.Float, Amount)
        .input('Status', sql.VarChar, 'unpaid')
        .input('Remarks', sql.NVarChar, Remarks || 'Penalty for late return')
        .input('CreatedBy', sql.NVarChar, CreatedBy)
        .input('CreatedOn', sql.DateTime, new Date())
        .query(`
          INSERT INTO Penalty (IssueId, Amount, Status, Remarks, CreatedBy, CreatedOn)
          VALUES (@IssueId, @Amount, @Status, @Remarks, @CreatedBy, @CreatedOn)
        `);

      await transaction.commit();
      logger.info(`Penalty created successfully for IssueId: ${IssueId}`);
      return NextResponse.json({ message: 'Penalty created successfully' });
    } catch (transactionError: any) {
      await transaction.rollback();
      logger.error('Transaction failed during penalty creation', { error: transactionError.message, stack: transactionError.stack });
      throw transactionError;
    }
  } catch (error: any) {
    logger.error('Error creating penalty', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error creating penalty' }, { status: 500 });
  }
}

