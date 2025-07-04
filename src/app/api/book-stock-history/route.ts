import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import sql from 'mssql';

// ✅ GET: Fetch book stock history with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get('searchTerm');
    const publicationId = searchParams.get('publicationId');

    const pool = await getConnection();
    const request = pool.request();

    let query = `
      SELECT TOP (1000)
        bsh.BookStockHistoryId,
        bsh.BookId,
        b.Title AS BookName,
        p.Name AS PublicationName,
        bsh.CopiesAdded,
        bsh.Remarks,
        bsh.CreatedOn,
        bsh.CreatedBy,
        bsh.ModifiedOn,
        bsh.ModifiedBy
      FROM BookStockHistory bsh
      JOIN Books b ON bsh.BookId = b.BookId
      JOIN Publication p ON b.PublicationId = p.PubId
      WHERE 1=1
    `;

    if (searchTerm) {
      query += ` AND b.Title LIKE @SearchTerm`;
      request.input('SearchTerm', sql.VarChar, `%${searchTerm}%`);
    }

    if (publicationId) {
      query += ` AND b.PublicationId = @PublicationId`;
      request.input('PublicationId', sql.Int, publicationId);
    }

    query += ` ORDER BY bsh.CreatedOn DESC`;

    const result = await request.query(query);
    return NextResponse.json(result.recordset);
  } catch (error: any) {
    logger.error('Error fetching book stock history', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error fetching book stock history' }, { status: 500 });
  }
}

// ✅ PUT: Update Remarks or ModifiedBy
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { Remarks,ModifiedBy  } = await req.json();

    if (!id) {
      return NextResponse.json({ message: 'BookStockHistoryId is required' }, { status: 400 });
    }

    const pool = await getConnection();

    const exists = await pool.request()
      .input('Id', sql.Int, id)
      .query(`SELECT * FROM BookStockHistory WHERE BookStockHistoryId = @Id`);

    if (exists.recordset.length === 0) {
      return NextResponse.json({ message: 'Book stock history record not found' }, { status: 404 });
    }

    await pool.request()
      .input('Id', sql.Int, id)
      .input('Remarks', sql.VarChar(255), Remarks || '')
      .input('ModifiedOn', sql.DateTime, new Date())
      .input('ModifiedBy', sql.NVarChar, ModifiedBy || 'system')

      .query(`
        UPDATE BookStockHistory
        SET Remarks = @Remarks,
            ModifiedOn = @ModifiedOn,
            ModifiedBy = @ModifiedBy
        WHERE BookStockHistoryId = @Id
      `);

    return NextResponse.json({ message: 'Book stock history updated successfully' });
  } catch (error: any) {
    logger.error('Error updating book stock history', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error updating book stock history' }, { status: 500 });
  }
}

// ✅ POST: Add or remove copies to/from book and log history
export async function POST(req: NextRequest) {
  try {
    const { BookId, CopiesAdded, Remarks, CreatedBy } = await req.json();

    if (!BookId || Math.abs(CopiesAdded) <= 0) {
      return NextResponse.json({ error: 'BookId and valid CopiesAdded are required' }, { status: 400 });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Check if the book exists and get current stock
      const bookCheck = await transaction.request()
        .input('BookId', sql.Int, BookId)
        .query(`
          SELECT TotalCopies, AvailableCopies
          FROM Books
          WHERE BookId = @BookId
        `);

      if (bookCheck.recordset.length === 0) {
        throw new Error('Book not found');
      }

      const { TotalCopies, AvailableCopies } = bookCheck.recordset[0];

      // Validate stock for removal (negative CopiesAdded)
      if (CopiesAdded < 0 && AvailableCopies < Math.abs(CopiesAdded)) {
        throw new Error('Insufficient available copies to remove');
      }

      if (CopiesAdded < 0 && TotalCopies < Math.abs(CopiesAdded)) {
        throw new Error('Insufficient total copies to remove');
      }

      // Update Books table
      await transaction.request()
        .input('BookId', sql.Int, BookId)
        .input('CopiesAdded', sql.Int, CopiesAdded)
        .query(`
          UPDATE Books
          SET TotalCopies = TotalCopies + @CopiesAdded,
              AvailableCopies = AvailableCopies + @CopiesAdded
          WHERE BookId = @BookId
        `);

      // Insert into BookStockHistory
      await transaction.request()
        .input('BookId', sql.Int, BookId)
        .input('CopiesAdded', sql.Int, CopiesAdded)
        .input('CreatedBy', sql.NVarChar, CreatedBy || 'system')
        .input('CreatedOn', sql.DateTime, new Date())
        .input('Remarks', sql.VarChar(255), Remarks || '')
        .query(`
          INSERT INTO BookStockHistory (BookId, CopiesAdded, CreatedBy, CreatedOn, Remarks)
          VALUES (@BookId, @CopiesAdded, @CreatedBy, @CreatedOn, @Remarks)
        `);

      await transaction.commit();
      logger.info(`Book ${CopiesAdded > 0 ? 'added' : 'removed'} for BookId: ${BookId}`);
      return NextResponse.json({ message: `Book ${CopiesAdded > 0 ? 'added' : 'removed'} successfully` });
    } catch (txError: any) {
      await transaction.rollback();
      logger.error('Transaction failed during book stock update', {
        error: txError.message,
        stack: txError.stack,
        details: { BookId, CopiesAdded, Remarks },
      });
      return NextResponse.json({ message: txError.message || 'Transaction failed' }, { status: 400 });
    }
  } catch (error: any) {
    logger.error('Error managing book copies', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error managing book copies' }, { status: 500 });
  }
}