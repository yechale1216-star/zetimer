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
const SuperAdminService = __importStar(require("../services/super-admin.service"));
const SubscriptionService = __importStar(require("../services/subscription.service"));
const router = (0, express_1.Router)();
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg });
router.get("/subscription-metrics", async (_req, res) => {
    try {
        const metrics = await SuperAdminService.getFullDashboardMetrics();
        ok(res, metrics);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.get("/users", async (req, res) => {
    try {
        const { q, role, schoolId, page, limit } = req.query;
        const metrics = await SuperAdminService.searchAllUsers({
            query: q,
            role: role,
            schoolId: schoolId,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        ok(res, metrics);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.get("/settings", async (_req, res) => {
    try {
        const config = await SuperAdminService.getPlatformConfig();
        ok(res, config);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.patch("/settings", async (req, res) => {
    try {
        const config = await SuperAdminService.updatePlatformConfig(req.body);
        ok(res, config);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.get("/audit-logs", async (req, res) => {
    try {
        const logs = await SuperAdminService.getAuditLogs({
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
        });
        ok(res, logs);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.post("/broadcast", async (req, res) => {
    try {
        const result = await SuperAdminService.broadcastMessage(req.body);
        ok(res, result);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.get("/broadcast-history", async (req, res) => {
    try {
        const history = await SuperAdminService.getBroadcastHistory({
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
        });
        ok(res, history);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
// ─── Help Desk ────────────────────────────────────────────────────────────────
router.get("/support", async (req, res) => {
    try {
        const data = await SuperAdminService.getSupportTickets({
            status: req.query.status,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
        });
        ok(res, data);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.patch("/support/:id", async (req, res) => {
    try {
        const ticket = await SuperAdminService.updateTicket(req.params.id, req.body);
        ok(res, ticket);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.post("/support", async (req, res) => {
    try {
        const ticket = await SuperAdminService.createTicket(req.body);
        ok(res, ticket);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
// ─── Billing ──────────────────────────────────────────────────────────────────
router.get("/billing", async (req, res) => {
    try {
        const data = await SuperAdminService.getBillingHistory({
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 30,
        });
        ok(res, data.data);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.get("/transactions", async (req, res) => {
    try {
        const data = await SuperAdminService.getBillingHistory({
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
        });
        // Reformat as transaction ledger entries
        const transactions = data.data.map((r, i) => ({
            ...r,
            id: `TXN-${i + 1}`,
            type: "subscription",
            currency: "ETB",
            createdAt: r.date,
        }));
        ok(res, transactions);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.get("/billing-export", async (_req, res) => {
    try {
        const csv = await SuperAdminService.exportBillingCsv();
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=billing-export.csv");
        res.send(csv);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
// ─── Enriched Schools ─────────────────────────────────────────────────────────
router.get("/schools", async (req, res) => {
    try {
        const data = await SuperAdminService.getEnrichedSchools({
            query: req.query.q,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
        });
        ok(res, data);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.patch("/schools/:id/status", async (req, res) => {
    try {
        const result = await SuperAdminService.updateSchoolStatus(req.params.id, req.body.action);
        ok(res, result);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
router.post("/check-expirations", async (_req, res) => {
    try {
        const results = await SubscriptionService.checkAndExpireTrials();
        ok(res, results);
    }
    catch (e) {
        fail(res, e.message, 500);
    }
});
exports.default = router;
