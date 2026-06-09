import { Router, Response } from "express";
import * as PaymentService from "../services/payment.service";
import { AuthenticatedRequest } from "../middleware/tenant.middleware";

const router = Router();

router.post("/initialize", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const result = await PaymentService.initializePayment({
      ...req.body,
      schoolId
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/verify", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tx_id, school_id, tier, period } = req.body;
    
    // Security: Only allow matching schoolId or super_admin
    if (req.user?.role !== 'super_admin' && req.user?.schoolId !== school_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const result = await PaymentService.verifyPayment(tx_id, school_id, tier, period);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
