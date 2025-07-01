import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import sql from 'mssql';

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        p.PenaltyId,
        p.IssueId,
        p.Amount,
        CASE 
          WHEN p.Amount <= COALESCE(SUM(lp.AmountPaid), 0) THEN 'paid'
          ELSE 'unpaid'
        END AS PenaltyStatus,
        p.CreatedOn,
        p.CreatedBy,
        p.ModifiedBy,
        p.ModifiedOn,
        p.Remarks,
        bi.BookId,
        bi.StudentId,
        bi.IssueDate,
        bi.DueDate,
        bi.ReturnDate,
        bi.Status AS BookIssueStatus,
        bi.IsRenewed,
        b.Title AS BookTitle,
        s.fName + ' ' + s.lName AS StudentName,
        c.courseName,
        sad.courseYear,
        COALESCE(SUM(lp.AmountPaid), 0) AS TotalPaid
      FROM Penalty p WITH (NOLOCK)
      JOIN BookIssue bi WITH (NOLOCK) ON p.IssueId = bi.IssueId
      JOIN Books b WITH (NOLOCK) ON bi.BookId = b.BookId
      JOIN Student s WITH (NOLOCK) ON bi.StudentId = s.id
      JOIN Course c WITH (NOLOCK) ON s.courseId = c.id
      LEFT JOIN StudentAcademicDetails sad WITH (NOLOCK) ON s.id = sad.studentId
      LEFT JOIN LibraryPayment lp WITH (NOLOCK) ON p.IssueId = lp.IssueId
      GROUP BY 
        p.PenaltyId, p.IssueId, p.Amount, p.Status, p.CreatedOn, p.CreatedBy, 
        p.ModifiedBy, p.ModifiedOn, p.Remarks, bi.BookId, bi.StudentId, 
        bi.IssueDate, bi.DueDate, bi.ReturnDate, bi.Status, bi.IsRenewed, 
        b.Title, s.fName, s.lName, c.courseName, sad.courseYear
      ORDER BY p.CreatedOn DESC
    `);
    return NextResponse.json(result.recordset);
  } catch (error) {
    logger.error('Error fetching penalties', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error fetching penalties' }, { status: 500 });
  }
}

export async function PUT(req) {
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
      .query('SELECT * FROM Penalty WITH (NOLOCK) WHERE PenaltyId = @PenaltyId');

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
  } catch (error) {
    logger.error('Error updating penalty', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error updating penalty' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { IssueId, StudentId, AmountPaid, PaymentMode, TransactionId, ReceiveBy, CreatedBy } = await req.json();

    if (!IssueId || !StudentId || !AmountPaid || !PaymentMode || !ReceiveBy || !CreatedBy) {
      logger.error('Missing required fields for payment', { IssueId, StudentId, AmountPaid, PaymentMode });
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); // Use stricter isolation to prevent deadlocks

      // Verify penalty exists and get Amount
      const penaltyResult = await pool.request()
        .input('IssueId', sql.Int, IssueId)
        .query(`
          SELECT p.PenaltyId, p.Amount, COALESCE(SUM(lp.AmountPaid), 0) AS TotalPaid
          FROM Penalty p WITH (NOLOCK)
          LEFT JOIN LibraryPayment lp WITH (NOLOCK) ON p.IssueId = lp.IssueId
          WHERE p.IssueId = @IssueId
          GROUP BY p.PenaltyId, p.Amount
        `);

      if (penaltyResult.recordset.length === 0) {
        await transaction.rollback();
        logger.error(`Penalty not found for IssueId: ${IssueId}`);
        return NextResponse.json({ message: 'Penalty not found' }, { status: 404 });
      }

      const { PenaltyId, Amount, TotalPaid } = penaltyResult.recordset[0];
      const newTotalPaid = TotalPaid + AmountPaid;

      if (newTotalPaid > Amount) {
        await transaction.rollback();
        logger.error(`Payment exceeds penalty amount for IssueId: ${IssueId}`);
        return NextResponse.json({ message: 'Payment amount exceeds remaining penalty amount' }, { status: 400 });
      }

      // Insert payment into LibraryPayment
      await transaction.request()
        .input('IssueId', sql.Int, IssueId)
        .input('StudentId', sql.Int, StudentId)
        .input('AmountPaid', sql.Float, AmountPaid)
        .input('PaymentMode', sql.VarChar, PaymentMode)
        .input('TransactionId', sql.VarChar, TransactionId || null)
        .input('ReceiveBy', sql.NVarChar, ReceiveBy)
        .input('CreatedBy', sql.NVarChar, CreatedBy)
        .input('CreatedOn', sql.DateTime, new Date())
        .query(`
          INSERT INTO LibraryPayment (StudentId, IssueId, AmountPaid, PaymentMode, TransactionId, ReceiveBy, CreatedBy, CreatedOn)
          VALUES (@StudentId, @IssueId, @AmountPaid, @PaymentMode, @TransactionId, @ReceiveBy, @CreatedBy, @CreatedOn)
        `);

      // Update Penalty status if fully paid
      if (newTotalPaid >= Amount) {
        await transaction.request()
          .input('PenaltyId', sql.Int, PenaltyId)
          .input('Status', sql.VarChar, 'paid')
          .input('ModifiedBy', sql.NVarChar, 'Kishan Kumar')
          .input('ModifiedOn', sql.DateTime, new Date())
          .query(`
            UPDATE Penalty 
            SET Status = @Status, 
                ModifiedBy = @ModifiedBy, 
                ModifiedOn = @ModifiedOn
            WHERE PenaltyId = @PenaltyId
          `);
      }

      await transaction.commit();
      logger.info(`Payment created successfully for IssueId: ${IssueId}, StudentId: ${StudentId}`);
      return NextResponse.json({ message: 'Payment created successfully' });
    } catch (transactionError) {
      await transaction.rollback();
      logger.error('Transaction failed during payment creation', { error: transactionError.message, stack: transactionError.stack });
      return NextResponse.json({ message: `Transaction failed: ${transactionError.message}` }, { status: 500 });
    }
  } catch (error) {
    logger.error('Error creating payment', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: `Error creating payment: ${error.message}` }, { status: 500 });
  }
}
