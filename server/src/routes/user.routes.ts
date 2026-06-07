import { Router, Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { AuthenticatedRequest } from '../middleware/tenant.middleware';

const router = Router();

// Get current user profile
router.get('/profile', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await userService.getUserById(userId);
    res.status(200).json({ success: true, data: user });
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

// Get all contacts for a school (admin, teacher, parent) - restricted based on requesting user
router.get('/contacts', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School ID required' });
    }
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

export default router;
