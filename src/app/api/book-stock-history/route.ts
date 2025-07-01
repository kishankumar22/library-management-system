// src/app/api/book-stock-history/route.ts
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
    const { Remarks } = await req.json();

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
      .input('ModifiedBy', sql.NVarChar, 'Kishan Kumar')
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

// ✅ POST: Add new copies to book and log history
export async function POST(req: NextRequest) {
  try {
    const { BookId, CopiesAdded, Remarks } = await req.json();

    if (!BookId || CopiesAdded <= 0) {
      return NextResponse.json({ error: 'BookId and valid CopiesAdded are required' }, { status: 400 });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      await transaction.request()
        .input('BookId', sql.Int, BookId)
        .input('CopiesAdded', sql.Int, CopiesAdded)
        .query(`
          UPDATE Books
          SET TotalCopies = TotalCopies + @CopiesAdded,
              AvailableCopies = AvailableCopies + @CopiesAdded
          WHERE BookId = @BookId
        `);

      await transaction.request()
        .input('BookId', sql.Int, BookId)
        .input('CopiesAdded', sql.Int, CopiesAdded)
        .input('CreatedBy', sql.NVarChar, 'Kishan Kumar')
        .input('CreatedOn', sql.DateTime, new Date())
        .input('Remarks', sql.VarChar(255), Remarks || '')
        .query(`
          INSERT INTO BookStockHistory (BookId, CopiesAdded, CreatedBy, CreatedOn, Remarks)
          VALUES (@BookId, @CopiesAdded, @CreatedBy, @CreatedOn, @Remarks)
        `);

      await transaction.commit();
      logger.info(`Book copies added for BookId: ${BookId}`);
      return NextResponse.json({ message: 'Book copies added successfully' });
    } catch (txError) {
      await transaction.rollback();
      logger.error('Transaction failed during book stock update', { error: txError.message });
      return NextResponse.json({ message: 'Transaction failed' }, { status: 500 });
    }
  } catch (error: any) {
    logger.error('Error adding book copies', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'Error adding book copies' }, { status: 500 });
  }
}
