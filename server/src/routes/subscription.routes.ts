import { Router, Request, Response } from "express";
import * as SubscriptionService from "../services/subscription.service";

const router = Router();

const ok = (res: Response, data: unknown) => res.json({ success: true, data });
const fail = (res: Response, msg: string, status = 400) =>
  res.status(status).json({ success: false, error: msg });

// ─── Plans ────────────────────────────────────────────────────────────────────

router.get("/plans", async (_req: Request, res: Response) => {
  try {
    const plans = await SubscriptionService.getAllPlans();
    ok(res, plans);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.post("/plans", async (req: Request, res: Response) => {
  try {
    const plan = await SubscriptionService.createPlan(req.body);
    ok(res, plan);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.put("/plans/:id", async (req: Request, res: Response) => {
  try {
    const plan = await SubscriptionService.updatePlan(req.params.id, req.body);
    ok(res, plan);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.delete("/plans/:id", async (req: Request, res: Response) => {
  try {
    await SubscriptionService.deletePlan(req.params.id);
    ok(res, { deleted: true });
  } catch (e: any) {
    fail(res, e.message);
  }
});

// ─── Plan Feature Assignment ──────────────────────────────────────────────────

router.post("/plans/:id/features", async (req: Request, res: Response) => {
  try {
    const result = await SubscriptionService.addFeatureToPlan(req.params.id, req.body.featureId);
    ok(res, result);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.delete("/plans/:id/features/:featureId", async (req: Request, res: Response) => {
  try {
    await SubscriptionService.removeFeatureFromPlan(req.params.id, req.params.featureId);
    ok(res, { removed: true });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── Features ─────────────────────────────────────────────────────────────────

router.get("/features", async (_req: Request, res: Response) => {
  try {
    const features = await SubscriptionService.getAllFeatures();
    ok(res, features);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.post("/features", async (req: Request, res: Response) => {
  try {
    const feature = await SubscriptionService.createFeature(req.body);
    ok(res, feature);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.put("/features/:id", async (req: Request, res: Response) => {
  try {
    const feature = await SubscriptionService.updateFeature(req.params.id, req.body);
    ok(res, feature);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.delete("/features/:id", async (req: Request, res: Response) => {
  try {
    await SubscriptionService.deleteFeature(req.params.id);
    ok(res, { deleted: true });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── Global Subscriptions ─────────────────────────────────────────────────────

router.get("/", async (_req: Request, res: Response) => {
  try {
    const subs = await SubscriptionService.getAllSubscriptions();
    ok(res, subs);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await SubscriptionService.deleteSchoolSubscription(req.params.id);
    ok(res, { deleted: true });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── School Subscriptions ─────────────────────────────────────────────────────

router.get("/schools/:id/subscription", async (req: Request, res: Response) => {
  try {
    const sub = await SubscriptionService.getSchoolSubscription(req.params.id);
    ok(res, sub);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.post("/schools/:id/subscription", async (req: Request, res: Response) => {
  try {
    const sub = await SubscriptionService.upsertSchoolSubscription(req.params.id, req.body);
    ok(res, sub);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.get("/schools/:id/features", async (req: Request, res: Response) => {
  try {
    const features = await SubscriptionService.resolveSchoolFeatures(req.params.id);
    ok(res, features);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── School Feature Overrides ─────────────────────────────────────────────────

router.get("/schools/:id/feature-overrides", async (req: Request, res: Response) => {
  try {
    const overrides = await SubscriptionService.getSchoolFeatureOverrides(req.params.id);
    ok(res, overrides);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.post("/schools/:id/feature-overrides", async (req: Request, res: Response) => {
  try {
    const { featureId, granted, reason } = req.body;
    if (!featureId || typeof granted !== "boolean") {
      return fail(res, "featureId and granted (boolean) are required");
    }
    const result = await SubscriptionService.setSchoolFeatureOverride(
      req.params.id,
      featureId,
      granted,
      reason
    );
    ok(res, result);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.delete("/schools/:id/feature-overrides/:featureId", async (req: Request, res: Response) => {
  try {
    await SubscriptionService.removeSchoolFeatureOverride(req.params.id, req.params.featureId);
    ok(res, { removed: true });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── Add-ons ──────────────────────────────────────────────────────────────────

router.get("/addons", async (_req: Request, res: Response) => {
  try {
    const addons = await SubscriptionService.getAllAddons();
    ok(res, addons);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.post("/addons", async (req: Request, res: Response) => {
  try {
    const addon = await SubscriptionService.createAddon(req.body);
    ok(res, addon);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.put("/addons/:id", async (req: Request, res: Response) => {
  try {
    const addon = await SubscriptionService.updateAddon(req.params.id, req.body);
    ok(res, addon);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.delete("/addons/:id", async (req: Request, res: Response) => {
  try {
    await SubscriptionService.deleteAddon(req.params.id);
    ok(res, { deleted: true });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── School Add-ons ──────────────────────────────────────────────────────────

router.get("/schools/:id/addons", async (req: Request, res: Response) => {
  try {
    const addons = await SubscriptionService.getSchoolAddons(req.params.id);
    ok(res, addons);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.post("/schools/:id/addons", async (req: Request, res: Response) => {
  try {
    const { addonId, quantity, isActive } = req.body;
    if (!addonId) return fail(res, "addonId is required");
    const result = await SubscriptionService.setSchoolAddon(
      req.params.id,
      addonId,
      quantity,
      isActive
    );
    ok(res, result);
  } catch (e: any) {
    fail(res, e.message);
  }
});

router.delete("/schools/:id/addons/:addonId", async (req: Request, res: Response) => {
  try {
    await SubscriptionService.removeSchoolAddon(req.params.id, req.params.addonId);
    ok(res, { removed: true });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── Metrics ──────────────────────────────────────────────────────────────────

router.get("/subscription-metrics", async (_req: Request, res: Response) => {
  try {
    const metrics = await SubscriptionService.getSubscriptionMetrics();
    ok(res, metrics);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

// ─── Tenant-Aware Routes (My Subscription) ───────────────────────────────────

router.get("/me/overview", async (req: any, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return fail(res, "Unauthorized", 401);

    const data = await SubscriptionService.getSchoolSubscriptionDetailed(schoolId);
    if (!data) return fail(res, "Subscription not found", 404);
    ok(res, data);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

router.get("/me/billing", async (req: any, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return fail(res, "Unauthorized", 401);

    // Reuse the mapping logic from SuperAdminService but filter for this school
    // Actually, we'll just return the current subscription formatted as history for now
    const sub = await SubscriptionService.getSchoolSubscriptionDetailed(schoolId);
    if (!sub) return ok(res, []);

    // Return as a list of "transactions"
    const record = {
      id: sub.id,
      amount: sub.effectiveMonthly,
      currency: "ETB",
      status: "completed",
      description: `${sub.plan.name} – ${sub.billingPeriod}`,
      createdAt: sub.billingStart,
      paymentMethod: "Card / Telebirr"
    };
    ok(res, [record]);
  } catch (e: any) {
    fail(res, e.message, 500);
  }
});

export default router;
