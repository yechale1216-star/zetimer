import { Router, Request, Response, NextFunction } from 'express';
import * as schoolService from '../services/school.service';
import { authorize, AuthenticatedRequest } from '../middleware/tenant.middleware';
import prisma from '../config/db';

const router = Router();

// Create or Update a school
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'School name is required' });
    }

    let school;
    if (id) {
      // Check if school exists
      const existing = await schoolService.getSchoolById(id);
      if (existing) {
        school = await schoolService.updateSchool(id, { name });
      } else {
        school = await schoolService.createSchool({ id, name });
      }
    } else {
      school = await schoolService.createSchool({ name });
    }

    res.status(200).json({ success: true, data: { 
      id: school.id, 
      schoolId: school.schoolId, 
      name: school.name,
      subscriptionStatus: school.subscriptionStatus
    }});
  } catch (error) {
    next(error);
  }
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
  } catch (error) {
    next(error);
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

    // Update school record
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(schoolEmail !== undefined && { schoolEmail }),
        onboardingCompleted: true,
      },
    });

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


export default router;




