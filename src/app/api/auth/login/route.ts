
// library-management-system/src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import { sendOtp } from '@/app/lib/sendOtp';
import logger from '@/app/lib/logger';

// In-memory OTP store (replace with Redis or DB in production)
const otpStore: { [key: string]: { otp: string; expires: number; role: string } } = {};

export async function POST(req: NextRequest) {
  try {
    const { email, password, dob, role } = await req.json();
    const pool = await getConnection();
    const rememberMe = req.headers.get('X-Remember-Me') === 'true';

    if (role === 'admin') {
      const result = await pool
        .request()
        .input('email', email)
        .input('password', password)
        .query('SELECT * FROM [User] WHERE email = @email AND password = @password AND roleId = 2');

      if (result.recordset.length === 0) {
        return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
      }

      const user = result.recordset[0];
      console.log(user)

      // Skip OTP if rememberMe is true
      if (rememberMe) {
        const token = jwt.sign({ userId: user.user_id, role: 'admin' }, process.env.JWT_SECRET!, {
          expiresIn: '1h',
        });
        return NextResponse.json({
          token,
          user: { name: user.name, profilePic: user.profile_pic_url },
        });
      }

      // Send OTP for first-time login
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[email] = {
        otp,
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
        role: 'admin',
      };
      await sendOtp(email, otp);
      return NextResponse.json({ otpRequired: true });
    } else {
      const result = await pool
        .request()
        .input('email', email)
        .input('dob', dob)
        .query('SELECT * FROM Student WHERE email = @email AND dob = @dob');

      if (result.recordset.length === 0) {
        return NextResponse.json({ message: 'Invalid email or date of birth' }, { status: 401 });
      }

      const student = result.recordset[0];

      // Skip OTP if rememberMe is true
      if (rememberMe) {
        const token = jwt.sign({ studentId: student.id, role: 'student' }, process.env.JWT_SECRET!, {
          expiresIn: '1h',
        });
        return NextResponse.json({
          token,
          user: { name: `${student.fName} ${student.lName}`, profilePic: student.studentImage },
        });
      }

      // Send OTP for first-time login
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[email] = {
        otp,
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
        role: 'student',
      };
      await sendOtp(email, otp);
      return NextResponse.json({ otpRequired: true });
    }
  } catch (error) {
    logger.error(`Login error: ${error}`);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// Expose OTP store for verification in otp/route.ts
export { otpStore };
