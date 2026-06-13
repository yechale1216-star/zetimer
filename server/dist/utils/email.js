"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResetPasswordEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debugLog = (msg) => {
    const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
    try {
        fs_1.default.appendFileSync(path_1.default.join(process.cwd(), 'email_debug.log'), logMsg);
    }
    catch (err) { }
};
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
// Verify connection configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP Transporter error:', error);
    }
    else {
        console.log('SMTP Server is ready to take our messages');
    }
});
const sendResetPasswordEmail = async (email, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const mailOptions = {
        from: `"Zetime Attendance" <${process.env.EMAIL_USER}>`,
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
    }
    catch (error) {
        debugLog(`Email send error: ${error instanceof Error ? error.message : String(error)}`);
        console.error('Detailed Email send error:', error);
        return false;
    }
};
exports.sendResetPasswordEmail = sendResetPasswordEmail;
