import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/attendance-analytics.service';

export const getAttendanceSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const stats = await analyticsService.getAttendanceSummary(schoolId, req.query);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getGradeStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const stats = await analyticsService.getGradeStats(schoolId, req.query);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const trends = await analyticsService.getAttendanceTrends(schoolId, req.query);
    res.status(200).json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
};

export const getDrillDownStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const { gradeId } = req.params;
    const stats = await analyticsService.getDrillDownStats(schoolId, gradeId, req.query);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const exportAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const format = req.query.format as string || 'csv';
    const stats = await analyticsService.getGradeStats(schoolId, req.query);
    
    if (format === 'csv') {
      const header = ["Grade", "Section", "Stream", "Total Students", "Present", "Absent", "Late", "Excused", "Attendance Rate %"];
      const rows = stats.map(s => [
        s.grade, 
        s.section, 
        s.stream || "", 
        s.totalStudents, 
        s.present, 
        s.absent, 
        s.late, 
        s.excused, 
        `${s.attendanceRate}%`
      ].join(","));
      
      const csv = [header.join(","), ...rows].join("\n");
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
      return res.status(200).send(csv);
    }
    
    res.status(400).json({ success: false, message: 'Unsupported format' });
  } catch (error) {
    next(error);
  }
};
