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
const PaymentService = __importStar(require("../services/payment.service"));
const router = (0, express_1.Router)();
router.post("/initialize", async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const result = await PaymentService.initializePayment({
            ...req.body,
            schoolId
        });
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
router.post("/verify", async (req, res) => {
    try {
        const { tx_id, school_id, tier, period } = req.body;
        // Security: Only allow matching schoolId or super_admin
        if (req.user?.role !== 'super_admin' && req.user?.schoolId !== school_id) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
        const result = await PaymentService.verifyPayment(tx_id, school_id, tier, period);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.default = router;
