import { Router } from 'express';
import * as analyticsController from '../controllers/attendance-analytics.controller';

const router = Router();

router.get('/summary', analyticsController.getAttendanceSummary);
router.get('/grade-stats', analyticsController.getGradeStats);
router.get('/trends', analyticsController.getAttendanceTrends);
router.get('/drill-down/:gradeId', analyticsController.getDrillDownStats);
router.get('/export', analyticsController.exportAttendance);

export default router;
