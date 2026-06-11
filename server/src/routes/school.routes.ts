import { Router, Request, Response, NextFunction } from 'express';
import { authorize, AuthenticatedRequest } from '../middleware/tenant.middleware';
import prisma from '../config/db';
import * as schoolService from '../services/school.service';
import * as onboardingService from '../services/onboarding.service';
import * as SuperAdminService from '../services/super-admin.service';

const router = Router();

// Create a school (Super Admin Only)
router.post('/', authorize(['super_admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, address, adminName, adminEmail, adminPhone, tier } = req.body;

    if (!name || !adminName || !adminEmail || !address) {
      return res.status(400).json({ success: false, message: 'School name, address, admin name, and admin email are required' });
    }

    const { school, admin } = await onboardingService.startOnboarding({
      schoolName: name,
      address,
      adminName,
      adminEmail,
      adminPhone,
      subscriptionTier: tier || 'free'
    });

    res.status(201).json({ 
      success: true, 
      data: { 
        id: school.id, 
        schoolId: school.schoolId, 
        name: school.name,
        subscriptionStatus: school.subscriptionStatus,
        adminUser: {
          email: admin.email,
          generatedPassword: admin.generatedPassword
        }
      }
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to create school' 
    });
  }
});

// Get all schools (Super Admin only)
router.get('/', authorize(['super_admin']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schools = await schoolService.getAllSchools();
    res.status(200).json({ success: true, data: schools });
  } catch (error) {
    next(error);
  }
});



// Get all grades for a school
router.get('/me/grades', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const grades = await schoolService.getGrades(schoolId);
    res.status(200).json({ success: true, data: grades });
  } catch (error) { next(error); }
});

// Get all sections for a school
router.get('/me/sections', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const sections = await schoolService.getSections(schoolId);
    res.status(200).json({ success: true, data: sections });
  } catch (error) { next(error); }
});

// Get all streams for a school
router.get('/me/streams', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const streams = await schoolService.getStreams(schoolId);
    res.status(200).json({ success: true, data: streams });
  } catch (error) { next(error); }
});

// Complete onboarding: save school profile + settings, mark onboarding done
router.post('/onboarding', authorize(['admin']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      schoolEmail,
      address,
      logoUrl,
      academicYear,
      attendanceMode,
      attendanceThreshold,
      allowLateMark,
    } = req.body;

    // Use centralized service to mark as complete
    await onboardingService.updateOnboardingStatus(schoolId, 'SETUP_COMPLETE');

    // Update school record email
    if (schoolEmail !== undefined) {
      await prisma.school.update({
        where: { id: schoolId },
        data: { schoolEmail },
      });
    }

    // Update school settings
    await prisma.schoolSettings.upsert({
      where: { schoolId },
      create: {
        schoolId,
        school_address: address,
        academic_year: academicYear,
        attendance_mode: attendanceMode || 'session_based',
        attendance_threshold: attendanceThreshold ?? 75,
        allow_late_mark: allowLateMark ?? true,
        school_logo: logoUrl,
      },
      update: {
        ...(address !== undefined && { school_address: address }),
        ...(academicYear !== undefined && { academic_year: academicYear }),
        ...(attendanceMode !== undefined && { attendance_mode: attendanceMode }),
        ...(attendanceThreshold !== undefined && { attendance_threshold: attendanceThreshold }),
        ...(allowLateMark !== undefined && { allow_late_mark: allowLateMark }),
        ...(logoUrl !== undefined && { school_logo: logoUrl }),
      },
    });

    res.status(200).json({ success: true, message: 'Onboarding completed' });
  } catch (error) {
    next(error);
  }
});


// ─── Help Desk (Support Tickets) ──────────────────────────────────────────────
router.get('/support', authorize(['admin']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const data = await SuperAdminService.getSupportTickets({
      schoolId,
      status: req.query.status as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.post('/support', authorize(['admin']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    const authorId = req.user?.id;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const ticket = await SuperAdminService.createTicket({
      ...req.body,
      schoolId,
      authorId,
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (error) { next(error); }
});

// Get school by ID (UUID or SCH-XXXX)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    let school;
    if (id.startsWith('SCH-')) {
      school = await schoolService.getSchoolByCustomId(id);
    } else {
      school = await schoolService.getSchoolById(id);
    }
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    res.status(200).json({ success: true, data: school });
  } catch (error) { next(error); }
});

// Get rich school details (super admin only)
router.get('/:id/details', authorize(['super_admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const school = await schoolService.getSchoolDetails(req.params.id);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    res.status(200).json({ success: true, data: school });
  } catch (error) { next(error); }
});

// Suspend / Unsuspend a school (super admin only)
router.patch('/:id/suspend', authorize(['super_admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suspend } = req.body;
    if (typeof suspend !== 'boolean') {
      return res.status(400).json({ success: false, message: '`suspend` must be a boolean' });
    }
    const school = await schoolService.setSchoolSuspended(req.params.id, suspend);
    res.status(200).json({ success: true, data: school, message: suspend ? 'School suspended' : 'School unsuspended' });
  } catch (error) { next(error); }
});

export default router;




