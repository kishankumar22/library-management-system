import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendOtp } from '@/app/lib/sendOtp';
import logger from '@/app/lib/logger';

const otpStore: { [key: string]: { otp: string; expires: number; role: string } } = {};

export async function POST(req: NextRequest) {
  try {
    const { email, password, dob, step, rememberMe } = await req.json();
    
    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const pool = await getConnection();

    // Check if valid token exists in Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: number; studentId?: number; role: string };
        const userData = await getUserData(pool, email, decoded.role);
        if (userData) {
          return NextResponse.json({
            token,
            user: userData,
          });
        }
      } catch (error: any) {
        logger.warn(`Invalid token provided: ${error.message}`);
      }
    }

    // Step 1: Check email in both tables
    if (step === 'email') {
      // Check in User table (admin)
      const adminResult = await pool
        .request()
        .input('email', email)
        .query('SELECT * FROM [User] WHERE email = @email');

      if (adminResult.recordset.length > 0) {
        return NextResponse.json({ 
          userType: 'admin',
          message: 'Admin user found' 
        });
      }

      // Check in Student table
      const studentResult = await pool
        .request()
        .input('email', email)
        .query('SELECT * FROM Student WHERE email = @email');

      if (studentResult.recordset.length > 0) {
        return NextResponse.json({ 
          userType: 'student',
          message: 'Student user found' 
        });
      }

      return NextResponse.json({ message: 'Email not found' }, { status: 404 });
    }

    // Step 2: Handle password or DOB verification
    if (step === 'verify') {
      // Check if admin login
      const adminResult = await pool
        .request()
        .input('email', email)
        .query('SELECT * FROM [User] WHERE email = @email');

      if (adminResult.recordset.length > 0) {
        // Admin login flow
        if (!password) {
          return NextResponse.json({ message: 'Password is required' }, { status: 400 });
        }

        const user = adminResult.recordset[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = {
          otp,
          expires: Date.now() + 10 * 60 * 1000, // 10 minutes
          role: 'admin',
        };

        try {
          await sendOtp(email, otp);
          return NextResponse.json({ otpRequired: true });
        } catch (error: any) {
          logger.error(`Failed to send OTP to ${email}: ${error.message}`);
          return NextResponse.json({ message: `Failed to send OTP: ${error.message}` }, { status: 500 });
        }
      }

      // Check if student login
      const studentResult = await pool
        .request()
        .input('email', email)
        .query('SELECT * FROM Student WHERE email = @email');

      if (studentResult.recordset.length > 0) {
        // Student login flow
        if (!dob) {
          return NextResponse.json({ message: 'Date of birth is required' }, { status: 400 });
        }

        const student = studentResult.recordset[0];
        if (new Date(student.dob).toISOString().split('T')[0] !== dob) {
          return NextResponse.json({ message: 'Invalid date of birth' }, { status: 401 });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = {
          otp,
          expires: Date.now() + 10 * 60 * 1000, // 10 minutes
          role: 'student',
        };

        try {
          await sendOtp(email, otp);
          return NextResponse.json({ otpRequired: true });
        } catch (error: any) {
          logger.error(`Failed to send OTP to ${email}: ${error.message}`);
          return NextResponse.json({ message: `Failed to send OTP: ${error.message}` }, { status: 500 });
        }
      }

      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Invalid step' }, { status: 400 });
  } catch (error: any) {
    logger.error(`Login error: ${error.message}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

async function getUserData(pool: any, email: string, role: string) {
  try {
    if (role === 'admin') {
      const result = await pool
        .request()
        .input('email', email)
        .query('SELECT * FROM [User] WHERE email = @email');
      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        return { user_id: user.user_id, name: user.name, profilePic: user.profile_pic_url };
      }
    } else {
      const result = await pool
        .request()
        .input('email', email)
        .query('SELECT * FROM Student WHERE email = @email');
      if (result.recordset.length > 0) {
        const student = result.recordset[0];
        return { id: student.id, name: `${student.fName} ${student.lName}`, profilePic: student.studentImage };
      }
    }
    return null;
  } catch (error: any) {
    logger.error(`Error fetching user data: ${error.message}`);
    return null;
  }
}

export { otpStore };