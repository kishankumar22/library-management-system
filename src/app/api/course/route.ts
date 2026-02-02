import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const collegeId = searchParams.get('collegeId'); // ✅ Filter by college

    const pool = await getConnection();
    const request = pool.request();

    let query = `
      SELECT 
        c.id,
        c.courseName,
        c.collegeId,
        col.collegeName
      FROM Course c
      INNER JOIN College col ON c.collegeId = col.id
      WHERE 1 = 1
    `;

    if (search && search.trim() !== '') {
      query += ` AND c.courseName LIKE @search`;
      request.input('search', `%${search.trim()}%`);
    }

    if (status === 'active') {
      query += ` AND c.status = 1`;
    } else if (status === 'inactive') {
      query += ` AND c.status = 0`;
    }

    // ✅ Filter by college
    if (collegeId && collegeId.trim() !== '') {
      query += ` AND c.collegeId = @collegeId`;
      request.input('collegeId', parseInt(collegeId));
    }

    query += ` ORDER BY col.collegeName, c.courseName`;

    const result = await request.query(query);
    return NextResponse.json(result.recordset);

  } catch (error) {
    logger.error('Error fetching courses:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
