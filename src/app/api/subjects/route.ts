// library-management-system/src/app/api/subjects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Subjects');
    return NextResponse.json(result.recordset);
  } catch (error) {
    logger.error(`Error fetching subjects: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, isActive } = await req.json();
    const pool = await getConnection();
    await pool
      .request()
      .input('name', name)
      .input('isActive', isActive)
      .query('INSERT INTO Subjects (name, isActive) VALUES (@name, @isActive)');
    return NextResponse.json({ message: 'Subject added' });
  } catch (error) {
    logger.error(`Error adding subject: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, isActive } = await req.json();
    const pool = await getConnection();
    await pool
      .request()
      .input('id', id)
      .input('name', name)
      .input('isActive', isActive)
      .query('UPDATE Subjects SET name = @name, isActive = @isActive WHERE id = @id');
    return NextResponse.json({ message: 'Subject updated' });
  } catch (error) {
    logger.error(`Error updating subject: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const pool = await getConnection();
    await pool.request().input('id', id).query('DELETE FROM Subjects WHERE id = @id');
    return NextResponse.json({ message: 'Subject deleted' });
  } catch (error) {
    logger.error(`Error deleting subject: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}