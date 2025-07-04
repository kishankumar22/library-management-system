import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const pool = await getConnection();
    let query = 'SELECT * FROM Publication WHERE Name LIKE @search';
    const params: any = { search: `%${search}%` };

    if (status !== 'all') {
      query += ' AND IsActive = @isActive';
      params.isActive = status === 'active' ? 1 : 0;
    }

    const result = await pool.request().input('search', params.search).input('isActive', params.isActive).query(query);
    // logger.info(`Fetched publications with search: ${search} and status: ${status}`);
    return NextResponse.json(result.recordset);
  } catch (error) {
    logger.error(`Error fetching publications: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { Name, IsActive, CreatedBy, CreatedOn } = await req.json();
    const pool = await getConnection();
    await pool
      .request()
      .input('Name', Name)
      .input('IsActive', IsActive)
      .input('CreatedBy', CreatedBy)
      .input('CreatedOn', CreatedOn || new Date().toISOString())
      .query('INSERT INTO Publication (Name, IsActive, CreatedBy, CreatedOn) VALUES (@Name, @IsActive, @CreatedBy, @CreatedOn)');
    logger.info(`Publication ${Name} added successfully`);
      return NextResponse.json({ message: 'Publication added' });
  } catch (error) {
    logger.error(`Error adding publication: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { PubId, Name, IsActive, ModifiedBy, ModifiedOn } = await req.json();
    if (!PubId || ModifiedBy === undefined) {
      return NextResponse.json({ message: 'PubId and ModifiedBy are required' }, { status: 400 });
    }

    const pool = await getConnection();
    await pool
      .request()
      .input('PubId', PubId)
      .input('Name', Name)
      .input('IsActive', IsActive)
      .input('ModifiedBy', ModifiedBy)
      .input('ModifiedOn', ModifiedOn || new Date().toISOString())
      .query('UPDATE Publication SET Name = @Name, IsActive = @IsActive, ModifiedBy = @ModifiedBy, ModifiedOn = @ModifiedOn WHERE PubId = @PubId');
    logger.info(`Publication with PubId ${PubId} updated successfully`);
      return NextResponse.json({ message: 'Publication updated' });
  } catch (error) {
    logger.error(`Error updating publication: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { PubId } = await req.json();

    if (!PubId) {
      return NextResponse.json({ message: 'PubId is required' }, { status: 400 });
    }

    const pool = await getConnection();

    await pool.request()
      .input('PubId', PubId)
      .query('DELETE FROM Publication WHERE PubId = @PubId');

      logger.info(`Publication with PubId ${PubId} deleted successfully`);
    return NextResponse.json({ message: 'Publication deleted successfully' });
  } catch (error: any) {
    const sqlError = error?.originalError || error;

    // Check for foreign key reference error
    if (
      sqlError?.message?.includes('REFERENCE') &&
      sqlError?.message?.includes('FK_Books_Publication') // Adjust if your FK constraint name differs
    ) {
      logger.warn(`Attempted to delete publication  which is linked to books.`);
      return NextResponse.json(
        { message: 'Cannot delete publication because it is linked to one or more books.' },
        { status: 409 } // Conflict
      );
    }
    logger.error(`Error deleting publication: ${error.message}`, { stack: error.stack });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}