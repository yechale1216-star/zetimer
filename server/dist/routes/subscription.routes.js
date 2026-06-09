"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SubscriptionService = __importStar(require("../services/subscription.service"));
const router = (0, express_1.Router)();
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg });
// ─── Plans ────────────────────────────────────────────────────────────────────
router.get("/plans", async (_req, res) => {
    try {
        const plans = await SubscriptionService.getAllPlans();
        ok(res, plans);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.post("/plans", async (req, res) => {
    try {
        const plan = await SubscriptionService.createPlan(req.body);
        ok(res, plan);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.put("/plans/:id", async (req, res) => {
    try {
        const plan = await SubscriptionService.updatePlan(req.params.id, req.body);
        ok(res, plan);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.delete("/plans/:id", async (req, res) => {
    try {
        await SubscriptionService.deletePlan(req.params.id);
        ok(res, { deleted: true });
    }
    catch (e) {
        fail(res, e.message);
    }
});
// ─── Plan Feature Assignment ──────────────────────────────────────────────────
router.post("/plans/:id/features", async (req, res) => {
    try {
        const result = await SubscriptionService.addFeatureToPlan(req.params.id, req.body.featureId);
        ok(res, result);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.delete("/plans/:id/features/:featureId", async (req, res) => {
    try {
        await SubscriptionService.removeFeatureFromPlan(req.params.id, req.params.featureId);
        ok(res, { removed: true });
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
// ─── Features ─────────────────────────────────────────────────────────────────
router.get("/features", async (_req, res) => {
    try {
        const features = await SubscriptionService.getAllFeatures();
        ok(res, features);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.post("/features", async (req, res) => {
    try {
        const feature = await SubscriptionService.createFeature(req.body);
        ok(res, feature);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.put("/features/:id", async (req, res) => {
    try {
        const feature = await SubscriptionService.updateFeature(req.params.id, req.body);
        ok(res, feature);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.delete("/features/:id", async (req, res) => {
    try {
        await SubscriptionService.deleteFeature(req.params.id);
        ok(res, { deleted: true });
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
// ─── School Subscriptions ─────────────────────────────────────────────────────
router.get("/schools/:id/subscription", async (req, res) => {
    try {
        const sub = await SubscriptionService.getSchoolSubscription(req.params.id);
        ok(res, sub);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.post("/schools/:id/subscription", async (req, res) => {
    try {
        const sub = await SubscriptionService.upsertSchoolSubscription(req.params.id, req.body);
        ok(res, sub);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.get("/schools/:id/features", async (req, res) => {
    try {
        const features = await SubscriptionService.resolveSchoolFeatures(req.params.id);
        ok(res, features);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
// ─── School Feature Overrides ─────────────────────────────────────────────────
router.get("/schools/:id/feature-overrides", async (req, res) => {
    try {
        const overrides = await SubscriptionService.getSchoolFeatureOverrides(req.params.id);
        ok(res, overrides);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.post("/schools/:id/feature-overrides", async (req, res) => {
    try {
        const { featureId, granted, reason } = req.body;
        if (!featureId || typeof granted !== "boolean") {
            return fail(res, "featureId and granted (boolean) are required");
        }
        const result = await SubscriptionService.setSchoolFeatureOverride(req.params.id, featureId, granted, reason);
        ok(res, result);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.delete("/schools/:id/feature-overrides/:featureId", async (req, res) => {
    try {
        await SubscriptionService.removeSchoolFeatureOverride(req.params.id, req.params.featureId);
        ok(res, { removed: true });
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
// ─── Add-ons ──────────────────────────────────────────────────────────────────
router.get("/addons", async (_req, res) => {
    try {
        const addons = await SubscriptionService.getAllAddons();
        ok(res, addons);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.post("/addons", async (req, res) => {
    try {
        const addon = await SubscriptionService.createAddon(req.body);
        ok(res, addon);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.put("/addons/:id", async (req, res) => {
    try {
        const addon = await SubscriptionService.updateAddon(req.params.id, req.body);
        ok(res, addon);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.delete("/addons/:id", async (req, res) => {
    try {
        await SubscriptionService.deleteAddon(req.params.id);
        ok(res, { deleted: true });
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
// ─── School Add-ons ──────────────────────────────────────────────────────────
router.get("/schools/:id/addons", async (req, res) => {
    try {
        const addons = await SubscriptionService.getSchoolAddons(req.params.id);
        ok(res, addons);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.post("/schools/:id/addons", async (req, res) => {
    try {
        const { addonId, quantity, isActive } = req.body;
        if (!addonId)
            return fail(res, "addonId is required");
        const result = await SubscriptionService.setSchoolAddon(req.params.id, addonId, quantity, isActive);
        ok(res, result);
    }
    catch (e) {
        fail(res, e.message);
    }
});
router.delete("/schools/:id/addons/:addonId", async (req, res) => {
    try {
        await SubscriptionService.removeSchoolAddon(req.params.id, req.params.addonId);
        ok(res, { removed: true });
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
// ─── Metrics ──────────────────────────────────────────────────────────────────
router.get("/subscription-metrics", async (_req, res) => {
    try {
        const metrics = await SubscriptionService.getSubscriptionMetrics();
        ok(res, metrics);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
exports.default = router;
