"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGenericEmail = exports.sendVerificationEmail = exports.sendResetPasswordEmail = void 0;
const resend_1 = require("resend");
// ─── Resend Configuration ────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
if (!RESEND_API_KEY) {
    console.error('[EmailService] RESEND_API_KEY is not configured. Emails will fail.');
}
const resend = new resend_1.Resend(RESEND_API_KEY);
// Resend requires a verified sender domain, or you can use the shared onboarding address.
// Update FROM_EMAIL once you've verified your domain in Resend dashboard.
const FROM_EMAIL = 'Zetime Attendance <onboarding@resend.dev>';
/**
 * Low-level email sender. All email functions route through here.
 * Returns true on success, false on failure.
 */
const sendEmail = async (options) => {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
        if (error) {
            console.error('[EmailService] Resend API error:', error);
            return false;
        }
        console.log(`[EmailService] Email sent successfully to ${options.to} — ID: ${data?.id}`);
        return true;
    }
    catch (error) {
        console.error('[EmailService] Failed to send email:', error instanceof Error ? error.message : error);
        return false;
    }
};
// ─── Password Reset Email ───────────────────────────────────────────────────
const sendResetPasswordEmail = async (email, token) => {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; padding: 12px 20px;">
          <span style="color: white; font-size: 20px; font-weight: bold; letter-spacing: 1px;">Zetime</span>
        </div>
      </div>
      <h2 style="color: #111827; margin-bottom: 8px;">Password Reset Request</h2>
      <p style="color: #6b7280;">You requested a password reset for your Zetime account. Click the button below to set a new password.</p>
      <p style="color: #ef4444; font-size: 14px; font-weight: 600;">⏱ This link expires in 15 minutes.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated email from Zetime — please do not reply.</p>
    </div>
  `;
    return sendEmail({ to: email, subject: 'Password Reset Request — Zetime', html });
};
exports.sendResetPasswordEmail = sendResetPasswordEmail;
// ─── Email Verification ─────────────────────────────────────────────────────
const sendVerificationEmail = async (email, code) => {
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
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
  `;
    return sendEmail({ to: email, subject: 'Verify Your Zetime Account', html });
};
exports.sendVerificationEmail = sendVerificationEmail;
// ─── Generic Email (for future notifications) ──────────────────────────────
const sendGenericEmail = async (to, subject, html) => {
    return sendEmail({ to, subject, html });
};
exports.sendGenericEmail = sendGenericEmail;
