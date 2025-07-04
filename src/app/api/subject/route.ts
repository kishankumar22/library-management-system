import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const pool = await getConnection();
    let query = 'SELECT * FROM Subject WHERE TRIM(UPPER(Name)) LIKE @search';
    const params: any = { search: `%${search.trim().toUpperCase()}%` };

    if (status !== 'all') {
      query += ' AND IsActive = @isActive';
      params.isActive = status === 'active' ? 1 : 0;
    }

    const result = await pool.request().input('search', params.search).input('isActive', params.isActive).query(query);
    return NextResponse.json(result.recordset);
  } catch (error) {
    logger.error(`Error fetching subjects: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { Name, IsActive, CreatedBy, CreatedOn } = await req.json();
    const formattedName = Name.trim().toUpperCase();

    if (!formattedName) {
      return NextResponse.json({ message: 'Subject name cannot be empty' }, { status: 400 });
    }

    const pool = await getConnection();

    // Check if subject name already exists (case-insensitive)
    const checkResult = await pool
      .request()
      .input('Name', formattedName)
      .query('SELECT * FROM Subject WHERE TRIM(UPPER(Name)) = @Name');

    if (checkResult.recordset.length > 0) {
      return NextResponse.json({ message: 'Subject with this name already exists' }, { status: 400 });
    }

    await pool
      .request()
      .input('Name', formattedName)
      .input('IsActive', IsActive)
      .input('CreatedBy', CreatedBy)
      .input('CreatedOn', CreatedOn || new Date().toISOString())
      .query('INSERT INTO Subject (Name, IsActive, CreatedBy, CreatedOn) VALUES (TRIM(@Name), @IsActive, @CreatedBy, @CreatedOn)');
      logger.info(`Subject ${formattedName} added successfully`);
    return NextResponse.json({ message: 'Subject added' });
  } catch (error) {
    logger.error(`Error adding subject: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { SubId, Name, IsActive, ModifiedBy, ModifiedOn } = await req.json();
    const formattedName = Name.trim().toUpperCase();

    if (!formattedName) {
      return NextResponse.json({ message: 'Subject name cannot be empty' }, { status: 400 });
    }

    const pool = await getConnection();

    // Check if subject name already exists for a different SubId (case-insensitive)
    const checkResult = await pool
      .request()
      .input('Name', formattedName)
      .input('SubId', SubId)
      .query('SELECT * FROM Subject WHERE TRIM(UPPER(Name)) = @Name AND SubId != @SubId');

    if (checkResult.recordset.length > 0) {
      return NextResponse.json({ message: 'Subject with this name already exists' }, { status: 400 });
    }

    await pool
      .request()
      .input('SubId', SubId)
      .input('Name', formattedName)
      .input('IsActive', IsActive)
      .input('ModifiedBy', ModifiedBy)
      .input('ModifiedOn', ModifiedOn || new Date().toISOString())
      .query('UPDATE Subject SET Name = TRIM(@Name), IsActive = @IsActive, ModifiedBy = @ModifiedBy, ModifiedOn = @ModifiedOn WHERE SubId = @SubId');
    return NextResponse.json({ message: 'Subject updated' });
  } catch (error) {
    logger.error(`Error updating subject: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const { SubId } = await req.json();

    if (!SubId) {
      return NextResponse.json({ message: 'SubId is required' }, { status: 400 });
    }

    const pool = await getConnection();

    await pool.request()
      .input('SubId', SubId)
      .query('DELETE FROM Subject WHERE SubId = @SubId');
    logger.info(`Subject with SubId ${SubId} deleted successfully`);
    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    const sqlError = error?.originalError || error;

    // 🔍 Detect foreign key conflict (cannot delete because books reference this subject)
    if (
      sqlError?.message?.includes('REFERENCE') &&
      sqlError?.message?.includes('FK_Books_Subject')
    ) {
      logger.error(`Error deleting subject: ${error.message}`, { stack: error.stack });
      return NextResponse.json(
        { message: 'Cannot delete subject as it is associated with one or more books.' },
        { status: 409 } // Conflict
      );
    }

    logger.error(`Error deleting subject: ${error.message}`, { stack: error.stack });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
