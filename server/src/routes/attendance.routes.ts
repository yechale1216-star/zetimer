import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller';
import { validateAttendance } from '../middleware/validate';

const router = Router();

router.post('/', validateAttendance, attendanceController.markAttendance);
router.get('/', attendanceController.getAttendance);
router.get('/student/:studentId', attendanceController.getAttendanceByStudent);

export default router;
