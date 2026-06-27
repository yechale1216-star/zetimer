import { Router, Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import * as schoolService from '../services/school.service';
import * as onboardingService from '../services/onboarding.service';
import { getMemberships } from '../services/auth_resolution.service';
import { generateToken } from '../utils/jwt';
import { sendResetPasswordEmail } from '../utils/email';
import { validateSignup } from '../middleware/validate';
import prisma from '../config/db';
import fs from 'fs';
import path from 'path';

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
      subscriptionTier: 'free' // Default for public signup
    });

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
        },
        schoolName: school.name,
        schoolLogo: '',
        onboardingCompleted: false,
        onboardingStatus: school.onboardingStatus
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
router.post('/logout', (req: Request, res: Response) => {
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

export default router;
