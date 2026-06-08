import { Router, Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import * as schoolService from '../services/school.service';
import { generateToken } from '../utils/jwt';
import { sendResetPasswordEmail } from '../utils/email';
import prisma from '../config/db';

const router = Router();

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

    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = userService.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let customSchoolId = '';
    let schoolName = 'My School';
    let schoolLogo = '';
    let onboardingCompleted = false;

    if (user.schoolId) {
      const school = await schoolService.getSchoolById(user.schoolId);
      if (school) {
        customSchoolId = school.schoolId || '';
        schoolName = school.name || 'My School';
        onboardingCompleted = school.onboardingCompleted ?? false;
        // Get logo from settings
        if (school.settings) {
          schoolLogo = school.settings.school_logo || '';
        }
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId || '',
      customSchoolId: customSchoolId,
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          schoolId: user.schoolId,
          customSchoolId,
        },
        schoolName,
        schoolLogo,
        onboardingCompleted,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Signup (Admin creates school and account)
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, schoolName, role, phone } = req.body;

    // Server-side validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Admin name must be at least 2 characters' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Create school first if admin
    let schoolId = '';
    let customSchoolId = '';
    if (role === 'admin' && schoolName) {
      const school = await schoolService.createSchool({ name: schoolName });
      schoolId = school.id;
      customSchoolId = school.schoolId || '';
    }

    // Create user
    const user = await userService.createUser({
      email,
      password_hash: password,
      full_name: name,
      role,
      phone,
      schoolId: schoolId || null,
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId || '',
      customSchoolId: customSchoolId,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          schoolId: user.schoolId,
          customSchoolId,
        },
        schoolName: schoolName || 'My School',
        schoolLogo: '',
        onboardingCompleted: false
      }
    });
  } catch (error) {
    next(error);
  }
});

// Forgot Password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
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
