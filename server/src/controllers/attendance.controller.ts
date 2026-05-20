import { Request, Response, NextFunction } from 'express';
import * as attendanceService from '../services/attendance.service';

export const markAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const attendance = await attendanceService.markAttendance({ ...req.body, schoolId });
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const { studentId, date, session, grade, section, startDate, endDate } = req.query;
    const attendance = await attendanceService.getAttendance({ 
      studentId, date, session, grade, section, startDate, endDate, schoolId 
    });
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceByStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attendance = await attendanceService.getAttendanceByStudent(req.params.studentId);
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};
