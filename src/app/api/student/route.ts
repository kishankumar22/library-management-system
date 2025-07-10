import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get('courseId');
        const search = searchParams.get('search') || '';
        const pool = await getConnection();
        let query = `
            SELECT DISTINCT
                s.id as StudentId,
                sad.id as StudentAcademicDetailsId,
                s.fName,
                s.lName,
                s.email,
                s.mobileNumber,
                s.courseId,
                s.studentImage,
                c.courseName,
                sad.courseYear
            FROM Student s
            LEFT JOIN Course c ON s.courseId = c.id
            LEFT JOIN StudentAcademicDetails sad ON s.id = sad.studentId
            WHERE (s.fName + ' ' + s.lName LIKE @search OR s.mobileNumber LIKE @search)
        `;
        const request = pool.request().input('search', `%${search.trim()}%`);
        if (courseId) {
            query += ' AND s.courseId = @courseId';
            request.input('courseId', parseInt(courseId));
        }
        query += ' ORDER BY s.fName, s.lName';
        const result = await request.query(query);
        // Transform the data to include the id array format and separate StudentId/StudentAcademicDetailsId
        const transformedData = result.recordset.map(row => ({
            id: [row.StudentId, row.StudentAcademicDetailsId],
            StudentId: row.StudentId,
            StudentAcademicDetailsId: row.StudentAcademicDetailsId,
            fName: row.fName,
            lName: row.lName,
            email: row.email,
            mobileNumber: row.mobileNumber,
            courseId: row.courseId,
            studentImage: row.studentImage,
            courseName: row.courseName,
            courseYear: row.courseYear
        }));
        return NextResponse.json(transformedData);
    } catch (error) {
        logger.error('Error fetching students', error);
        return NextResponse.json({ message: 'Error fetching students' }, { status: 500 });
    }
}














