import { Router } from 'express';
import * as studentController from '../controllers/student.controller';
import { validateStudent } from '../middleware/validate';

const router = Router();

// Static routes MUST come before dynamic /:id routes
router.get('/', studentController.getStudents);
router.get('/auto/next-id', studentController.getNextStudentId);
router.get('/parent/:phone', studentController.getStudentsByParentPhone);
router.post('/', validateStudent, studentController.createStudent);
router.post('/bulk', studentController.bulkCreateStudents);

// Dynamic routes last
router.get('/:id', studentController.getStudentById);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

export default router;
