import { Request, Response, NextFunction } from 'express';

export const validateStudent = (req: Request, res: Response, next: NextFunction) => {
  const { name, student_id, grade, section, parent_email, parent_phone, parent_name } = req.body;

  if (!name || !student_id || !grade || !section || !parent_email || !parent_phone || !parent_name) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields. Required: name, student_id, grade, section, parent_email, parent_phone, parent_name',
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(parent_email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid parent email format',
    });
  }

  next();
};

export const validateAttendance = (req: Request, res: Response, next: NextFunction) => {
  let { studentId, status, session } = req.body;

  if (!studentId || !status) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields. Required: studentId, status',
    });
  }

  // Normalize case
  req.body.status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  if (!session) {
    req.body.session = 'Full Day';
  } else {
    req.body.session = session.charAt(0).toUpperCase() + session.slice(1).toLowerCase();
  }

  // Validate status
  const validStatuses = ['Present', 'Absent', 'Late', 'Excused'];
  if (!validStatuses.includes(req.body.status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  // Validate session
  const validSessions = ['Morning', 'Afternoon', 'Full Day'];
  if (!validSessions.includes(req.body.session)) {
    return res.status(400).json({
      success: false,
      message: `Invalid session. Must be one of: ${validSessions.join(', ')}`,
    });
  }

  next();
};
