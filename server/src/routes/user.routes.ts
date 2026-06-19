import { Router, Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { AuthenticatedRequest } from '../middleware/tenant.middleware';

const router = Router();

// Get current user profile
router.get('/profile', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    // Fetch base user info
    const user = await userService.getUserById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Override the role with the context-specific role resolved by tenantMiddleware
    const contextUser = {
      ...user,
      role: req.user?.role || user.role,
      schoolId: schoolId || user.schoolId
    };
    
    res.status(200).json({ success: true, data: contextUser });
  } catch (error) { next(error); }
});

// Get user by email — used by auth login (Public or filtered)
router.get('/by-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const user = await userService.getUserByEmail(email as string);
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
});

// Get all users for a school (teachers list)
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'School ID required' });
    const users = await userService.getUsers(schoolId);
    res.status(200).json({ success: true, data: users });
  } catch (error) { next(error); }
});

// Get all contacts for a school - SECURITY: always scoped to the JWT-authenticated school.
// For non-parent users, the x-school-id header MUST match the JWT schoolId to prevent
// cross-school contact list exposure.
router.get('/contacts', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Always use schoolId from JWT (set by tenant middleware) - never blindly trust the header
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'Authenticated school ID required' });
    }

    // For non-parent roles: if x-school-id header is sent, it MUST match the JWT school.
    // Parents legitimately switch schools via the header, so they are exempt.
    const headerSchoolId = req.headers['x-school-id'] as string | undefined;
    if (req.user?.role !== 'parent' && headerSchoolId && headerSchoolId !== schoolId) {
      console.warn(
        `[contacts] SECURITY: x-school-id header (${headerSchoolId}) does not match JWT schoolId (${schoolId}) for user ${req.user?.id} (role: ${req.user?.role}). Rejecting request.`
      );
      return res.status(403).json({
        success: false,
        message: 'School ID mismatch: request rejected for security reasons'
      });
    }

    // Always query using JWT schoolId - ignore header value for data scoping
    const contacts = await userService.getContacts(schoolId, req.user);
    res.status(200).json({ success: true, data: contacts });
  } catch (error) { next(error); }
});

// Create user
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    const data = { ...req.body };
    if (schoolId) data.schoolId = schoolId;
    const user = await userService.createUser(data);
    res.status(201).json({ success: true, data: user });
  } catch (error) { next(error); }
});

// Update user
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    const user = await userService.updateUser(req.params.id, req.body, schoolId);
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
});

// Delete user
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    await userService.deleteUser(req.params.id, schoolId);
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) { next(error); }
});

// Verify password (legacy or internal)
router.post('/verify-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await userService.getUserByEmail(email);
    if (!user) return res.status(200).json({ success: false, valid: false, message: 'User not found' });
    const valid = userService.verifyPassword(password, user.password_hash);
    res.status(200).json({ success: true, valid, data: valid ? user : null });
  } catch (error) { next(error); }
});

// Get all schools this user belongs to
router.get('/me/schools', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { getMemberships } = require('../services/auth_resolution.service');
    const schools = await getMemberships(req.user.id);
    res.status(200).json({ success: true, data: schools });
  } catch (error) { next(error); }
});

// Set active school context
router.post('/me/active-school', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { schoolId } = req.body;
    if (!schoolId) return res.status(400).json({ success: false, message: 'schoolId is required' });

    const { resolveRoleInSchool, getMemberships } = require('../services/auth_resolution.service');
    const role = await resolveRoleInSchool(req.user.id, schoolId);
    
    if (!role) {
      return res.status(403).json({ success: false, message: 'You do not have an active role in this school.' });
    }

    const memberships = await getMemberships(req.user.id);
    const school = memberships.find((m: any) => m.schoolId === schoolId);
    
    res.status(200).json({ success: true, data: school });
  } catch (error) { next(error); }
});

export default router;
