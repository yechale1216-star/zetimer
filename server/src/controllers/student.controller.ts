import { Request, Response, NextFunction } from 'express';
import * as studentService from '../services/student.service';

export const getStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const students = await studentService.getAllStudents(schoolId);
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error(`[controller] getStudents Error for school: ${req.headers['x-school-id']}:`, error);
    next(error);
  }
};

export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const schoolName = req.headers['x-school-name'] as string;
    const student = await studentService.createStudent({ ...req.body, schoolName }, schoolId);
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await studentService.updateStudent(req.params.id, req.body);
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await studentService.deleteStudent(req.params.id);
    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getStudentsByParentPhone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const students = await studentService.getStudentsByParentPhone(req.params.phone);
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
};
