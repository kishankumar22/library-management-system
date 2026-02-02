import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId'); // ✅ Filter by course

    const pool = await getConnection();
    const request = pool.request();

    let query = `
      SELECT DISTINCT
        col.id,
        col.collegeName
      FROM College col
      WHERE col.status = 1
    `;

    // ✅ If course is selected, show only colleges having that course
    if (courseId && courseId.trim() !== '') {
      query = `
        SELECT DISTINCT
          col.id,
          col.collegeName
        FROM College col
        INNER JOIN Course c ON c.collegeId = col.id
        WHERE col.status = 1 
          AND c.id = @courseId
      `;
      request.input('courseId', parseInt(courseId));
    }

    query += ` ORDER BY col.collegeName`;

    const result = await request.query(query);
    return NextResponse.json(result.recordset);

  } catch (error) {
    logger.error('Error fetching colleges:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
