import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendOtp } from '@/app/lib/sendOtp';
import logger from '@/app/lib/logger';

// Singleton OTP store for development (in-memory)
const otpStore: { [key: string]: { otp: string; expires: number; role: string } } = {};

export async function POST(req: NextRequest) {
  try {
    const { email, password, dob, step, rememberMe } = await req.json();
    const normalizedEmail = email?.toLowerCase()?.trim();

    console.log('Login Request:', { email: normalizedEmail, step, rememberMe });

    if (!normalizedEmail) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const pool = await getConnection();

    // Check if valid token exists in Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          userId?: number;
          studentId?: number;
          role: string;
        };
        console.log('Validating token for:', { email: normalizedEmail, role: decoded.role });
        const userData = await getUserData(pool, normalizedEmail, decoded.role);
        if (userData) {
          console.log('Token valid, returning user data:', userData);
          return NextResponse.json({
            token,
            user: userData,
            userType: decoded.role,
          });
        } else {
          console.log('Token valid but user not found');
        }
      } catch (error: any) {
        logger.warn(`Invalid token provided: ${error.message}`);
      }
    }

    // Step 1: Check email in both tables
    if (step === 'email') {
      console.log('Checking email:', normalizedEmail);
      const adminResult = await pool
        .request()
        .input('email', normalizedEmail)
        .query('SELECT * FROM [User] WHERE email = @email');

      if (adminResult.recordset.length > 0) {
        console.log('Admin user found');
        return NextResponse.json({
          userType: 'admin',
          message: 'Admin user found',
        });
      }

      const studentResult = await pool
        .request()
        .input('email', normalizedEmail)
        .query('SELECT * FROM Student WHERE email = @email');

      if (studentResult.recordset.length > 0) {
        console.log('Student user found');
        return NextResponse.json({
          userType: 'student',
          message: 'Student user found',
        });
      }

      console.log('Email not found');
      return NextResponse.json({ message: 'Email not found' }, { status: 404 });
    }

    // Step 2: Handle password or DOB verification
    if (step === 'verify') {
      console.log('Verifying credentials for:', normalizedEmail);
      const adminResult = await pool
        .request()
        .input('email', normalizedEmail)
        .query('SELECT * FROM [User] WHERE email = @email');

      if (adminResult.recordset.length > 0) {
        if (!password) {
          console.log('Password required for admin');
          return NextResponse.json({ message: 'Password is required' }, { status: 400 });
        }

        const user = adminResult.recordset[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          console.log('Invalid password for admin');
          return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[normalizedEmail] = {
          otp,
          expires: Date.now() + 10 * 60 * 1000, // 10 minutes
          role: 'admin',
        };
        console.log('Stored OTP for admin:', {
          email: normalizedEmail,
          otp,
          expires: otpStore[normalizedEmail].expires,
        });

        try {
          await sendOtp(normalizedEmail, otp);
          console.log('OTP sent successfully');
          return NextResponse.json({ otpRequired: true, userType: 'admin' });
        } catch (error: any) {
          logger.error(`Failed to send OTP to ${normalizedEmail}: ${error.message}`);
          return NextResponse.json({ message: `Failed to send OTP: ${error.message}` }, { status: 500 });
        }
      }

      const studentResult = await pool
        .request()
        .input('email', normalizedEmail)
        .query('SELECT * FROM Student WHERE email = @email');

      if (studentResult.recordset.length > 0) {
        if (!dob) {
          console.log('DOB required for student');
          return NextResponse.json({ message: 'Date of birth is required' }, { status: 400 });
        }

        const student = studentResult.recordset[0];
        if (new Date(student.dob).toISOString().split('T')[0] !== dob) {
          console.log('Invalid DOB for student');
          return NextResponse.json({ message: 'Invalid date of birth' }, { status: 401 });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[normalizedEmail] = {
          otp,
          expires: Date.now() + 10 * 60 * 1000, // 10 minutes
          role: 'student',
        };
        console.log('Stored OTP for student:', {
          email: normalizedEmail,
          otp,
          expires: otpStore[normalizedEmail].expires,
        });

        try {
          await sendOtp(normalizedEmail, otp);
          console.log('OTP sent successfully');
          return NextResponse.json({ otpRequired: true, userType: 'student' });
        } catch (error: any) {
          logger.error(`Failed to send OTP to ${normalizedEmail}: ${error.message}`);
          return NextResponse.json({ message: `Failed to send OTP: ${error.message}` }, { status: 500 });
        }
      }

      console.log('User not found');
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    console.log('Invalid step:', step);
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
        return user; // return full user record (all columns)
      }

    } else if (role === 'student') {
      const result = await pool
        .request()
        .input('email', email)
        .query('SELECT * FROM Student WHERE email = @email');

      if (result.recordset.length > 0) {
        const student = result.recordset[0];
        return student; // return full student record (all columns)
      }
    }

    return null;

  } catch (error: any) {
    logger.error(`Error fetching user data: ${error.message}`);
    return null;
  }
}


export { otpStore };