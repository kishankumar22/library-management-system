import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import sql from 'mssql';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const issueIdParam = searchParams.get('issueId');

    // Validate and convert issueId to a number
    const issueId = issueIdParam ? parseInt(issueIdParam, 10) : null;
    if (issueIdParam && isNaN(issueId)) {
      throw new Error('Invalid IssueId parameter. Must be a valid number.');
    }

    const pool = await getConnection();
    if (!pool) {
      throw new Error('Failed to establish database connection');
    }

    let result;
    if (issueId !== null) {
      result = await pool
        .request()
        .input('IssueId', sql.Int, issueId)
        .query(`
          SELECT TOP (1000)
            lp.PaymentId,
            b.Title AS BookTitle,
            s.fName + ' ' + s.lName AS StudentName,
            c.courseName AS CourseName,
            lp.AmountPaid,
            lp.PaymentMode,
            lp.TransactionId,
            lp.CreatedBy,
            lp.CreatedOn,
            lp.IssueId
          FROM [jkconsultancyadmindb].[dbo].[LibraryPayment] lp WITH (NOLOCK)
          LEFT JOIN [jkconsultancyadmindb].[dbo].[BookIssue] bi WITH (NOLOCK) ON lp.IssueId = bi.IssueId
          LEFT JOIN [jkconsultancyadmindb].[dbo].[Books] b WITH (NOLOCK) ON bi.BookId = b.BookId
          LEFT JOIN [jkconsultancyadmindb].[dbo].[Student] s WITH (NOLOCK) ON bi.StudentId = s.id
          LEFT JOIN [jkconsultancyadmindb].[dbo].[Course] c WITH (NOLOCK) ON s.courseId = c.id
          WHERE lp.IssueId = @IssueId
          ORDER BY lp.CreatedOn DESC
        `);
    } else {
      result = await pool
        .request()
        .query(`
  SELECT TOP (1000)
  lp.PaymentId,
  b.Title AS BookTitle,
  s.fName + ' ' + s.lName AS StudentName,
  c.courseName AS CourseName,
  lp.AmountPaid,
  lp.PaymentMode,
  lp.TransactionId,
  lp.CreatedBy,
  lp.CreatedOn,
  lp.IssueId,
  ISNULL(p.TotalPenalty, 0) AS PenaltyAmount
FROM [jkconsultancyadmindb].[dbo].[LibraryPayment] lp WITH (NOLOCK)
LEFT JOIN [jkconsultancyadmindb].[dbo].[BookIssue] bi WITH (NOLOCK) ON lp.IssueId = bi.IssueId
LEFT JOIN [jkconsultancyadmindb].[dbo].[Books] b WITH (NOLOCK) ON bi.BookId = b.BookId
LEFT JOIN [jkconsultancyadmindb].[dbo].[Student] s WITH (NOLOCK) ON bi.StudentId = s.id
LEFT JOIN [jkconsultancyadmindb].[dbo].[Course] c WITH (NOLOCK) ON s.courseId = c.id
LEFT JOIN (
  SELECT IssueId, SUM(Amount) AS TotalPenalty
  FROM [jkconsultancyadmindb].[dbo].[Penalty]
  GROUP BY IssueId
) p ON lp.IssueId = p.IssueId
ORDER BY lp.CreatedOn DESC;


        `);
    }

    if (!result.recordset || result.recordset.length === 0) {
      return NextResponse.json({ message: 'No payment data found' }, { status: 404 });
    }

    return NextResponse.json(result.recordset);
  } catch (error) {
    logger.error('Error fetching library payment history', {
      error: error.message,
      stack: error.stack,
      details: {
        issueId: searchParams.get('issueId'),
        timestamp: new Date().toISOString(),
      },
    });
    return NextResponse.json(
      { message: 'Error fetching library payment history', details: error.message },
      { status: 500 }
    );
  }
}