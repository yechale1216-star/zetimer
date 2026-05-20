import { Router } from 'express';
import * as studentController from '../controllers/student.controller';
import { validateStudent } from '../middleware/validate';

const router = Router();

router.get('/', studentController.getStudents);
router.post('/', validateStudent, studentController.createStudent);
router.get('/parent/:phone', studentController.getStudentsByParentPhone);
router.get('/:id', studentController.getStudentById);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

export default router;
