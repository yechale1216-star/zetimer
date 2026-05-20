import { Router, Request, Response, NextFunction } from 'express';
import * as assignmentService from '../services/assignment.service';

const router = Router();

// Get assignments for a school (optionally filtered by teacherId)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    if (!schoolId) return res.status(400).json({ success: false, message: 'x-school-id header required' });
    const { teacherId } = req.query;
    const assignments = await assignmentService.getAssignments(schoolId, teacherId as string);
    res.status(200).json({ success: true, data: assignments });
  } catch (error) { next(error); }
});

// Create assignment
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    if (!schoolId) return res.status(400).json({ success: false, message: 'x-school-id header required' });
    const assignment = await assignmentService.createAssignment({ ...req.body, school_id: schoolId });
    res.status(201).json({ success: true, data: assignment });
  } catch (error) { next(error); }
});

// Delete assignment
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assignmentService.deleteAssignment(req.params.id);
    res.status(200).json({ success: true, message: 'Assignment removed' });
  } catch (error) { next(error); }
});

export default router;
