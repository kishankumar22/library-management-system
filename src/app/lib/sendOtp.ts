// library-management-system/src/app/lib/sendOtp.ts
import nodemailer from 'nodemailer';
import logger from './logger';

export const sendOtp = async (email: string, otp: string): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Library Management System',
      text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
    });
  } catch (error) {
    logger.error(`Failed to send OTP to ${email}: ${error}`);
    throw new Error('Failed to send OTP');
  }
};