import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import sql from 'mssql';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const issueIdParam = searchParams.get('issueId');

    const pool = await getConnection();
    if (!pool) {
      throw new Error('Failed to establish database connection');
    }

    let queryStr = `
      SELECT TOP (1000)
        lp.PaymentId,
        lp.IssueId,
        lp.AmountPaid,
        lp.PaymentMode,
        lp.TransactionId,
        lp.CreatedBy,
        lp.CreatedOn,
        
        -- Book Information
        ISNULL(b.Title, 'N/A') AS BookTitle,
        ISNULL(b.price, 0) AS price,
        
        -- Student Information  
        ISNULL((s.fName + ' ' + s.lName), 'N/A') AS StudentName,
        
        -- Course Information
        ISNULL(c.courseName, 'N/A') AS CourseName,
        ISNULL(sad.courseYear, 'N/A') AS courseYear,
        
        -- Penalty Information
        ISNULL(p.TotalPenalty, 0) AS PenaltyAmount,
        pr.Remarks
        
      FROM LibraryPayment lp WITH (NOLOCK)
      
      -- Basic joins
      LEFT JOIN BookIssue bi WITH (NOLOCK) ON lp.IssueId = bi.IssueId
      LEFT JOIN Books b WITH (NOLOCK) ON bi.BookId = b.BookId
      
      -- Student chain (Updated based on your FK change)
      LEFT JOIN StudentAcademicDetails sad WITH (NOLOCK) ON lp.StudentId = sad.id
      LEFT JOIN Student s WITH (NOLOCK) ON sad.studentId = s.id
      LEFT JOIN Course c WITH (NOLOCK) ON s.courseId = c.id
      
      -- Penalty information
      LEFT JOIN (
        SELECT IssueId, SUM(Amount) AS TotalPenalty 
        FROM Penalty WITH (NOLOCK)
        GROUP BY IssueId
      ) p ON lp.IssueId = p.IssueId
      
      OUTER APPLY (
        SELECT TOP 1 Remarks 
        FROM Penalty WITH (NOLOCK)
        WHERE IssueId = lp.IssueId 
        ORDER BY CreatedOn DESC
      ) pr
    `;

    const request = pool.request();

    // Add WHERE condition if issueId provided
    if (issueIdParam) {
      const issueId = parseInt(issueIdParam, 10);
      if (!isNaN(issueId)) {
        queryStr += ` WHERE lp.IssueId = @IssueId`;
        request.input('IssueId', sql.Int, issueId);
      }
    }

    queryStr += ` ORDER BY lp.CreatedOn DESC`;

    const result = await request.query(queryStr);

    if (!result.recordset || result.recordset.length === 0) {
      return NextResponse.json({ 
        message: 'No payment data found',
        debug: {
          issueId: issueIdParam,
          queryExecuted: true
        }
      }, { status: 404 });
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
