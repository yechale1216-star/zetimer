import { Router, Request, Response } from "express";
import * as SuperAdminService from "../services/super-admin.service";
import * as SubscriptionService from "../services/subscription.service";

const router = Router();

const ok = (res: Response, data: unknown) => res.json({ success: true, data });
const fail = (res: Response, msg: string, status = 400) =>
  res.status(status).json({ success: false, error: msg });

router.get("/subscription-metrics", async (_req: Request, res: Response) => {
  try {
    const metrics = await SuperAdminService.getFullDashboardMetrics();
    ok(res, metrics);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.get("/users", async (req: Request, res: Response) => {
  try {
    const { q, role, schoolId, page, limit } = req.query;
    const metrics = await SuperAdminService.searchAllUsers({
      query: q as string,
      role: role as string,
      schoolId: schoolId as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    ok(res, metrics);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.get("/settings", async (_req: Request, res: Response) => {
  try {
    const config = await SuperAdminService.getPlatformConfig();
    ok(res, config);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.patch("/settings", async (req: Request, res: Response) => {
  try {
    const config = await SuperAdminService.updatePlatformConfig(req.body);
    ok(res, config);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const logs = await SuperAdminService.getAuditLogs({
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    });
    ok(res, logs);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.post("/broadcast", async (req: Request, res: Response) => {
  try {
    const result = await SuperAdminService.broadcastMessage(req.body);
    ok(res, result);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.get("/broadcast-history", async (req: Request, res: Response) => {
  try {
    const history = await SuperAdminService.getBroadcastHistory({
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });
    ok(res, history);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── Help Desk ────────────────────────────────────────────────────────────────
router.get("/support", async (req: Request, res: Response) => {
  try {
    const data = await SuperAdminService.getSupportTickets({
      status: req.query.status as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });
    ok(res, data);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.patch("/support/:id", async (req: Request, res: Response) => {
  try {
    const ticket = await SuperAdminService.updateTicket(req.params.id, req.body);
    ok(res, ticket);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.post("/support", async (req: Request, res: Response) => {
  try {
    const ticket = await SuperAdminService.createTicket(req.body);
    ok(res, ticket);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── Billing ──────────────────────────────────────────────────────────────────
router.get("/billing", async (req: Request, res: Response) => {
  try {
    const data = await SuperAdminService.getBillingHistory({
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 30,
    });
    ok(res, data.data);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const data = await SuperAdminService.getBillingHistory({
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    });
    // Reformat as transaction ledger entries
    const transactions = data.data.map((r: any, i: number) => ({
      ...r,
      id: `TXN-${i + 1}`,
      type: "subscription",
      currency: "ETB",
      createdAt: r.date,
    }));
    ok(res, transactions);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.get("/billing-export", async (_req: Request, res: Response) => {
  try {
    const csv = await SuperAdminService.exportBillingCsv();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=billing-export.csv");
    res.send(csv);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── Enriched Schools ─────────────────────────────────────────────────────────
router.get("/schools", async (req: Request, res: Response) => {
  try {
    const data = await SuperAdminService.getEnrichedSchools({
      query: req.query.q as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });
    ok(res, data);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.patch("/schools/:id/status", async (req: Request, res: Response) => {
  try {
    const result = await SuperAdminService.updateSchoolStatus(
      req.params.id,
      req.body.action as "suspend" | "activate"
    );
    ok(res, result);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.post("/check-expirations", async (_req: Request, res: Response) => {
  try {
    const results = await SubscriptionService.checkAndExpireTrials();
    ok(res, results);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

export default router;
