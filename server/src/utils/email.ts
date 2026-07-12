import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const debugLog = (msg: string) => {
  const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(path.join(process.cwd(), 'email_debug.log'), logMsg);
  } catch (err) {}
};

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
let EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
let EMAIL_SECURE = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : (EMAIL_PORT === 465);
const EMAIL_USER = process.env.EMAIL_USER || 'yechale1216@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ttcmdoaazznhlavr';

// Auto-correction for Render hosting environment:
// Outbound SMTP on port 465 is blocked by Render’s firewall.
if (process.env.RENDER && EMAIL_PORT === 465) {
  console.warn('[SMTP Setup] Outgoing mail port 465 is blocked by Render. Redirecting connection to port 587.');
  EMAIL_PORT = 587;
  EMAIL_SECURE = false;
}

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Transporter error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

export const sendResetPasswordEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Zetime Attendance" <${EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
        <h2 style="color: #3b82f6;">Password Reset Request</h2>
        <p>You requested a password reset for your Zetime account. Click the button below to set a new password. This link will expire in 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated email, please do not reply.</p>
      </div>
    `,
  };

  try {
    debugLog(`Attempting to send reset email to: ${email}`);
    console.log(`Attempting to send reset email to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    debugLog(`Email sent successfully: ${info.messageId}`);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    debugLog(`Email send error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Detailed Email send error:', error);
    return false;
  }
};

export const sendVerificationEmail = async (email: string, code: string): Promise<boolean> => {
  const mailOptions = {
    from: `"Zetime Attendance" <${EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Zetime Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; padding: 12px 20px;">
            <span style="color: white; font-size: 20px; font-weight: bold; letter-spacing: 1px;">Zetime</span>
          </div>
        </div>
        <h2 style="color: #111827; margin-bottom: 8px;">Verify Your Email Address</h2>
        <p style="color: #6b7280; margin-bottom: 24px;">Thank you for signing up! Enter the 6-digit code below to verify your email and continue setting up your school.</p>
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background: #f0f4ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px 40px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1d4ed8;">${code}</span>
          </div>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code will expire in <strong>24 hours</strong>. If you didn't create a Zetime account, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated email from Zetime — please do not reply.</p>
      </div>
    `,
  };

  try {
    debugLog(`Sending verification email to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    debugLog(`Verification email sent: ${info.messageId}`);
    console.log(`[Email] Verification email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    debugLog(`Verification email error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('[Email] Verification email send error:', error);
    return false;
  }
};
