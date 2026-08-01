import { Router } from 'express';
import { tenantMiddleware, authorize } from '../middleware/tenant.middleware';
import { DisciplineController } from '../controllers/discipline.controller';

const router = Router();

// Apply tenant authentication to all discipline routes
router.use(tenantMiddleware);

// Categories
router.get('/categories', DisciplineController.getCategories);
router.post('/categories', authorize(['admin', 'school_admin', 'discipline_officer', 'super_admin']), DisciplineController.createCategory);
router.delete('/categories/:id', authorize(['admin', 'school_admin', 'discipline_officer', 'super_admin']), DisciplineController.deleteCategory);

// Analytics
router.get('/analytics', authorize(['admin', 'school_admin', 'discipline_officer', 'teacher', 'super_admin']), DisciplineController.getAnalytics);

// Incidents List & CRUD
router.get('/', DisciplineController.getIncidents);
router.get('/:id', DisciplineController.getIncidentById);
router.post('/', authorize(['admin', 'school_admin', 'discipline_officer', 'teacher', 'super_admin']), DisciplineController.createIncident);
router.put('/:id', authorize(['admin', 'school_admin', 'discipline_officer', 'teacher', 'super_admin']), DisciplineController.updateIncident);
router.delete('/:id', authorize(['admin', 'school_admin', 'discipline_officer', 'super_admin']), DisciplineController.deleteIncident);

// Follow-ups & Parent Acknowledgment
router.post('/:id/follow-up', authorize(['admin', 'school_admin', 'discipline_officer', 'teacher', 'super_admin']), DisciplineController.addFollowUp);
router.post('/:id/acknowledge', authorize(['parent']), DisciplineController.acknowledgeIncident);

export default router;
