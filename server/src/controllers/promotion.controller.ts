import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/tenant.middleware';
import { promotionService } from '../services/promotion.service';

export const getPromotionPreview = async (req: AuthenticatedRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const preview = await promotionService.getPromotionPreview(schoolId);
    res.status(200).json({ success: true, data: preview });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getStudentsByGrade = async (req: AuthenticatedRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { gradeId } = req.params;
  const { sectionId, streamId } = req.query;

  try {
    const students = await promotionService.getStudentsByGrade(schoolId, gradeId, sectionId as string, streamId as string);
    res.status(200).json({ success: true, data: students });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const promoteStudents = async (req: AuthenticatedRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  const userId = req.user?.id;
  if (!schoolId || !userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const result = await promotionService.promoteStudents(req.body, schoolId, userId);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('Duplicate promotion')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPromotionHistory = async (req: AuthenticatedRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { academicYear } = req.query;

  try {
    const history = await promotionService.getPromotionHistory(schoolId, academicYear as string);
    res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const rollbackPromotion = async (req: AuthenticatedRequest, res: Response) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { id } = req.params;

  try {
    const result = await promotionService.rollbackPromotion(id, schoolId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
