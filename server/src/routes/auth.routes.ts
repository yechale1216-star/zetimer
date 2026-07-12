import { Router, Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import * as schoolService from '../services/school.service';
import * as onboardingService from '../services/onboarding.service';
import { getMemberships } from '../services/auth_resolution.service';
import { generateToken, verifyToken } from '../utils/jwt';
import { sendResetPasswordEmail, sendVerificationEmail } from '../utils/email';
import { validateSignup } from '../middleware/validate';
import prisma from '../config/db';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const router = Router();

// Startup Debug
console.log('Auth Routes Loaded');
try {
  fs.appendFileSync(path.join(process.cwd(), 'server_debug.log'), `[${new Date().toISOString()}] Auth Routes Loaded\n`);
} catch (err) {}

// Check email availability
router.get('/check-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    res.status(200).json({ success: true, available: !existing });
  } catch (error) {
    next(error);
  }
});

// Check phone availability
router.get('/check-phone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ success: false, message: 'Phone is required' });
    }
    const existing = await prisma.user.findFirst({ where: { phone: phone.trim() } });
    res.status(200).json({ success: true, available: !existing });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    console.log(`[LOGIN] Attempt for email: ${email}`);
    fs.appendFileSync(path.join(process.cwd(), 'server_debug.log'), `[${new Date().toISOString()}] Login attempt for: ${email}\n`);

    const user = await userService.getUserByEmail(email);
    if (!user) {
      console.log(`[LOGIN] User not found: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = userService.verifyPassword(password, user.password_hash);
    if (!valid) {
      console.log(`[LOGIN] Invalid password for: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Resolve all memberships for this user
    const memberships = await getMemberships(user.id);
    
    if (memberships.length === 0 && user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Account exists but no school associations found.' });
    }

    // Determine default/active school for initial token
    // Prioritize the schoolId set on the User record if it exists and is in memberships
    let activeMembership = memberships.find(m => m.id === user.schoolId && m.role === user.role) || memberships[0];
    
    // If user is super_admin, they might not have a school membership
    if (user.role === 'super_admin' && !activeMembership) {
      activeMembership = {
        id: 'global',
        name: 'Zetime Platform',
        role: 'super_admin'
      };
    }

    let schoolName = activeMembership?.name || 'My School';
    let schoolLogo = activeMembership?.logo || '';
    let onboardingCompleted = false;

    if (activeMembership && activeMembership.id !== 'global') {
      const school = await schoolService.getSchoolById(activeMembership.id);
      if (school) {
        onboardingCompleted = school.onboardingCompleted ?? false;
        if (school.settings) {
          schoolLogo = school.settings.school_logo || schoolLogo;
        }
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: activeMembership?.role || user.role,
      schoolId: activeMembership?.id || '',
      customSchoolId: activeMembership?.customSchoolId || '',
    });

    res.cookie('attendance_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: activeMembership?.role || user.role,
          schoolId: activeMembership?.id || '',
          customSchoolId: activeMembership?.customSchoolId || '',
        },
        schoolName,
        schoolLogo,
        onboardingCompleted,
        availableSchools: memberships, // Return all schools for selection
      }
    });
  } catch (error) {
    next(error);
  }
});

// Signup (Admin creates school and account)
router.post('/signup', validateSignup, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, schoolName, schoolAddress, phone } = req.body;

    const { school, admin } = await onboardingService.startOnboarding({
      schoolName,
      address: schoolAddress,
      adminName: name,
      adminEmail: email,
      adminPhone: phone,
      adminPassword: password,
      subscriptionTier: 'free'
    });

    // Generate a 6-digit email verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        verification_token: verificationCode,
        verification_token_expires: verificationExpires,
        is_verified: false
      }
    });

    // Send verification email (non-blocking — don't fail signup if email fails)
    sendVerificationEmail(admin.email, verificationCode).catch(err =>
      console.error('[Signup] Failed to send verification email:', err)
    );

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      schoolId: school.id,
      customSchoolId: school.schoolId || '',
    });

    res.cookie('attendance_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          schoolId: school.id,
          customSchoolId: school.schoolId,
          isVerified: false,
        },
        schoolName: school.name,
        schoolLogo: '',
        onboardingCompleted: false,
        onboardingStatus: school.onboardingStatus,
        requiresEmailVerification: true,
      }
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Signup failed' 
    });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.attendance_token || req.headers.authorization?.split(' ')[1];
    if (token) {
      let decoded: any = null;
      try {
        decoded = verifyToken(token);
      } catch (err) {
        // Safe fallback: decode token anyway without verifying expiration to clear target pushToken
        console.warn('[Logout] Token verification failed (possibly expired), decoding to clear pushToken', err);
        decoded = jwt.decode(token);
      }
      if (decoded && decoded.id) {
        await prisma.user.update({
          where: { id: decoded.id },
          data: { pushToken: null }
        });
        console.log(`[Logout] Cleared FCM pushToken for user ${decoded.id}`);
      }
    }
  } catch (err) {
    console.error('[Logout] Failed to clear user pushToken:', err);
  }

  res.clearCookie('attendance_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// Forgot Password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  console.log('Forgot password request received:', req.body.email);
  try {
    fs.appendFileSync(path.join(process.cwd(), 'server_debug.log'), `[${new Date().toISOString()}] Forgot password request for: ${req.body.email}\n`);
  } catch (err) {}
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const token = await userService.createPasswordResetToken(email);
    
    // We send success even if user not found for security (prevent email enumeration)
    if (token) {
      await sendResetPasswordEmail(email, token);
    }

    res.status(200).json({ 
      success: true, 
      message: 'If an account with that email exists, we have sent password reset instructions.' 
    });
  } catch (error) {
    next(error);
  }
});

// Verify Reset Token
router.get('/verify-reset-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const user = await userService.getUserByResetToken(token);
    if (!user) {
      return res.status(400).json({ success: false, valid: false, message: 'Invalid or expired token' });
    }

    res.status(200).json({ success: true, valid: true, email: user.email });
  } catch (error) {
    next(error);
  }
});

// Reset Password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }

    await userService.resetPasswordByToken(token, password);

    res.status(200).json({ 
      success: true, 
      message: 'Password successfully reset. You can now login with your new password.' 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to reset password' });
  }
});

// POST /api/auth/push-token — save or refresh the FCM push token for the authenticated user
// Called by NativeBridge every time the app starts or the FCM token rotates.
router.post('/push-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'token is required' });
    }

    // Resolve authenticated user from cookie or Authorization header
    const rawToken = req.cookies?.attendance_token || req.headers.authorization?.split(' ')[1];
    if (!rawToken) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const decoded = verifyToken(rawToken);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Prevent duplicate: set pushToken to null for any other user holding this token
    await prisma.user.updateMany({
      where: { pushToken: token, id: { not: decoded.id } },
      data: { pushToken: null }
    });

    await prisma.user.update({
      where: { id: decoded.id },
      data: { pushToken: token },
    });

    console.log(`[PushToken] Saved FCM token for user ${decoded.id} and cleared duplicates`);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Verify Email (6-digit code)
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        verification_token: code.trim(),
        verification_token_expires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code. Please request a new one.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        is_verified: true,
        verification_token: null,
        verification_token_expires: null
      }
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now continue with onboarding.',
      data: { isVerified: true }
    });
  } catch (error) {
    next(error);
  }
});

// Resend Verification Code
router.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    if (user.is_verified) {
      return res.status(400).json({ success: false, message: 'This email is already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verification_token: verificationCode,
        verification_token_expires: verificationExpires
      }
    });

    await sendVerificationEmail(user.email, verificationCode);

    res.status(200).json({
      success: true,
      message: 'A new verification code has been sent to your email.'
    });
  } catch (error) {
    next(error);
  }
});

// Diagnostic route to test SMTP configuration live
router.get('/smtp-test', async (req: Request, res: Response) => {
  try {
    const { sendVerificationEmail } = await import('../utils/email');
    console.log('[SMTP Test] Initiating SMTP connection test...');
    
    // We import/resolve the transporter directly to check its properties
    const { default: nodemailer } = await import('nodemailer');
    
    const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
    let EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
    let EMAIL_SECURE = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : (EMAIL_PORT === 465);
    const EMAIL_USER = process.env.EMAIL_USER || 'yechale1216@gmail.com';
    const EMAIL_PASS = process.env.EMAIL_PASS || 'ttcmdoaazznhlavr';

    if (process.env.RENDER && EMAIL_PORT === 465) {
      console.warn('[SMTP Test] Redirecting test outbound mail port 465 to port 587.');
      EMAIL_PORT = 587;
      EMAIL_SECURE = false;
    }

    const testTransporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    console.log('[SMTP Test] Verifying transporter...');
    await testTransporter.verify();
    
    console.log('[SMTP Test] Transporter verified. Sending test mail...');
    const result = await testTransporter.sendMail({
      from: `"Zetime Diagnostic" <${EMAIL_USER}>`,
      to: 'yechale1216@gmail.com',
      subject: 'Zetime SMTP Live Diagnostic Test',
      text: `SMTP test configuration successful!\n\nEmail User: ${EMAIL_USER}\nHost: ${EMAIL_HOST}\nPort: ${EMAIL_PORT}\nSecure: ${EMAIL_SECURE}`
    });

    res.status(200).json({
      success: true,
      message: 'SMTP configuration is valid and test message sent successfully.',
      config: {
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_SECURE,
        user: EMAIL_USER,
      },
      messageId: result.messageId,
      response: result.response
    });
  } catch (err: any) {
    console.error('[SMTP Test] Diagnostic failed:', err);
    res.status(500).json({
      success: false,
      message: 'SMTP Diagnostic test failed.',
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      config: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '465'),
        secure: process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : true,
        user: process.env.EMAIL_USER || 'yechale1216@gmail.com',
        hasPass: !!(process.env.EMAIL_PASS || 'ttcmdoaazznhlavr')
      }
    });
  }
});

export default router;
