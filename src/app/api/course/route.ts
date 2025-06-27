import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const pool = await getConnection();
    let query = 'SELECT id, courseName FROM Course WHERE courseName LIKE @search';
    const params: any = { search: `%${search.trim()}%` };

    if (status !== 'all') {
      query += ' AND status = @status';
      params.status = status === 'active' ? 1 : 0;
    }

    const result = await pool.request()
      .input('search', params.search)
      .input('status', params.status)
      .query(query);

    return NextResponse.json(result.recordset);
  } catch (error) {
    logger.error(`Error fetching courses: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}