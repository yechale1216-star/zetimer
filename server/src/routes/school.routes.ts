import { Router, Request, Response, NextFunction } from 'express';
import * as schoolService from '../services/school.service';
import { authorize, AuthenticatedRequest } from '../middleware/tenant.middleware';

const router = Router();

// Create or ensure a school exists (called on admin signup)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'School name is required' });
    }

    const school = await schoolService.createSchool({ id, name });

    res.status(201).json({ success: true, data: { 
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

export default router;

