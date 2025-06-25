import nodemailer from 'nodemailer';
import logger from './logger';

export const sendOtp = async (email: string, otp: string): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // For local testing; set to true in production
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    logger.info(`SMTP connection verified for ${process.env.EMAIL_USER}`);

    const mailOptions = {
      from: `"Library Management System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP for Library Management System',
      text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
      html: `<p>Your OTP is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`OTP sent successfully to ${email}`);
  } catch (error: any) {
    logger.error(`Failed to send OTP to ${email}: ${error.message}`);
    if (error.responseCode === 535) {
      throw new Error('Invalid email credentials. Please check your EMAIL_USER and EMAIL_PASS in .env.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to SMTP server. Check EMAIL_HOST and EMAIL_PORT.');
    } else {
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }
};