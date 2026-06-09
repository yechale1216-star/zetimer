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
import authRoutes from './routes/auth.routes';
import promotionRoutes from './routes/promotion.routes';
import subscriptionRoutes from './routes/subscription.routes';
import paymentRoutes from './routes/payment.routes';
import superAdminRoutes from './routes/super-admin.routes';
import { tenantMiddleware } from './middleware/tenant.middleware';
import { maintenanceMiddleware } from './middleware/maintenance.middleware';
import * as parentController from './controllers/parent.controller';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// Global Maintenance Guard
app.use(maintenanceMiddleware);

// Health check and Auth (Public)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});
app.use('/api/auth', authRoutes);

// Parent Login & Discovery are public (no token required)
// Define them explicitly to ensure they are handled before tenantMiddleware
const publicParentRouter = express.Router();
publicParentRouter.get('/schools', parentController.listParentSchools);
publicParentRouter.post('/login', parentController.loginParent);
app.use('/api/parent', publicParentRouter);

// Apply Tenant Isolation & Auth Middleware to all API routes
app.use('/api', tenantMiddleware);

// Subscription & Feature Management
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Other API routes are already covered by the /api middleware

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/parent', parentRoutes); // Re-use for other parent routes
app.use('/api/attendance-analytics', attendanceAnalyticsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/promotions', promotionRoutes);


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
