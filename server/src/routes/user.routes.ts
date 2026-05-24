import { Router, Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

const router = Router();

// Get user by email — used by auth login
router.get('/by-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const user = await userService.getUserByEmail(email as string);
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
});

// Get all users for a school (teachers list)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const users = await userService.getUsers(schoolId);
    res.status(200).json({ success: true, data: users });
  } catch (error) { next(error); }
});

// Get all contacts for a school (admin, teacher, parent, no students)
router.get('/contacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School ID required' });
    }
    const contacts = await userService.getContacts(schoolId);
    res.status(200).json({ success: true, data: contacts });
  } catch (error) { next(error); }
});

// Create user — used by auth signup
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.headers['x-school-id'] as string;
    const data = { ...req.body };
    if (schoolId && !data.school_id) data.school_id = schoolId;
    const user = await userService.createUser(data);
    res.status(201).json({ success: true, data: user });
  } catch (error) { next(error); }
});

// Update user
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
});

// Delete user
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) { next(error); }
});

// Verify password (login check)
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
