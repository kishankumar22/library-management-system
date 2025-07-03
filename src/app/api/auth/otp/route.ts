import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/app/lib/db';
import logger from '@/app/lib/logger';
import { otpStore } from '../login/route';

export async function POST(req: NextRequest) {
  try {
    const { email, otp, role } = await req.json();
    if (!email || !otp || !role) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const storedOtp = otpStore[normalizedEmail];
    console.log('OTP Verification - Request:', { email: normalizedEmail, otp, role });
    console.log('Stored OTP:', storedOtp);
    console.log('Current Time:', Date.now(), 'Stored Expiration:', storedOtp?.expires);

    if (!storedOtp || String(storedOtp.otp) !== String(otp) || storedOtp.expires < Date.now()) {
      console.log('OTP Check Failed:', {
        storedOtpExists: !!storedOtp,
        otpMatch: storedOtp?.otp === otp,
        isExpired: storedOtp?.expires < Date.now(),
      });
      return NextResponse.json({ message: 'Invalid or expired OTP' }, { status: 401 });
    }

    if (storedOtp.role !== role) {
      return NextResponse.json({ message: 'Invalid role for OTP' }, { status: 401 });
    }

    // Clear OTP after successful verification
    delete otpStore[normalizedEmail];

    const pool = await getConnection();
    const rememberMe = req.headers.get('X-Remember-Me') === 'true';
    const expiresIn = rememberMe ? '7d' : '1h';

    if (role === 'admin') {
      const result = await pool
        .request()
        .input('email', normalizedEmail)
        .query('SELECT * FROM [User] WHERE email = @email');

      if (result.recordset.length === 0) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      const user = result.recordset[0];
      const token = jwt.sign({ userId: user.user_id, role: 'admin' }, process.env.JWT_SECRET!, {
        expiresIn,
      });

      return NextResponse.json({
        token,
        user: { name: user.name, profilePic: user.profile_pic_url },
      });
    } else {
      const result = await pool
        .request()
        .input('email', normalizedEmail)
        .query('SELECT * FROM Student WHERE email = @email');

      if (result.recordset.length === 0) {
        return NextResponse.json({ message: 'Student not found' }, { status: 404 });
      }

      const student = result.recordset[0];
      const token = jwt.sign({ studentId: student.id, role: 'student' }, process.env.JWT_SECRET!, {
        expiresIn,
      });

      return NextResponse.json({
        token,
        user: { name: `${student.fName} ${student.lName}`, profilePic: student.studentImage },
      });
    }
  } catch (error: any) {
    logger.error(`OTP verification error: ${error.message}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}