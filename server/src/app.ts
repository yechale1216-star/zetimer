import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import studentRoutes from './routes/student.routes';
import attendanceRoutes from './routes/attendance.routes';
import schoolRoutes from './routes/school.routes';
import userRoutes from './routes/user.routes';
import assignmentRoutes from './routes/assignment.routes';
import settingsRoutes from './routes/settings.routes';
import parentRoutes from './routes/parent.routes';
import attendanceAnalyticsRoutes from './routes/attendance-analytics.routes';
import messageRoutes from './routes/message.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/attendance-analytics', attendanceAnalyticsRoutes);
app.use('/api/messages', messageRoutes);



// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  // Prisma Error Handling
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this unique value already exists.',
      details: err.meta,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found.',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
