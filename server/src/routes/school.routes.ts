import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

const router = Router();

// Create or ensure a school exists (called on admin signup)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, name, email, phone, code, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'School name is required' });
    }

    // If an ID is provided, upsert with that exact ID so localStorage and Postgres stay in sync
    let school;
    if (id) {
      school = await prisma.school.upsert({
        where: { id },
        create: { id, name },
        update: { name },
      });
    } else {
      // Try to find by name first
      school = await prisma.school.findFirst({ where: { name } });
      if (!school) {
        school = await prisma.school.create({ data: { name } });
      }
    }

    res.status(201).json({ success: true, data: { id: school.id, name: school.name } });
  } catch (error) {
    next(error);
  }
});

// Get school by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const school = await prisma.school.findUnique({ where: { id: req.params.id } });
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    res.status(200).json({ success: true, data: school });
  } catch (error) {
    next(error);
  }
});

export default router;
