import { Response, NextFunction } from 'express';
import * as attendanceService from '../services/attendance.service';
import { AuthenticatedRequest } from '../middleware/tenant.middleware';

export const markAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'School ID context missing' });
    }
    const result = await attendanceService.markAttendance(req.body, schoolId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'School ID context missing' });
    }
    const filters = {
      ...req.query,
      schoolId // Override any incoming schoolId in query with the authenticated one
    };
    const result = await attendanceService.getAttendance(filters, schoolId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceByStudent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'School ID context missing' });
    }
    const result = await attendanceService.getAttendanceByStudent(req.params.studentId, schoolId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const bulkMarkAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'School ID context missing' });
    }
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Records must be an array' });
    }

    const results = await Promise.all(records.map(record => 
      attendanceService.markAttendance(record, schoolId)
    ));

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};
