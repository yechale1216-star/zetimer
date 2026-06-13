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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.initializePayment = void 0;
const db_1 = __importDefault(require("../config/db"));
const SubscriptionService = __importStar(require("./subscription.service"));
const initializePayment = async (data) => {
    const { schoolId, tier, billingPeriod, paymentMethod } = data;
    // Find the plan
    const plan = await db_1.default.subscriptionPlan.findUnique({
        where: { slug: tier.toLowerCase() }
    });
    if (!plan)
        throw new Error(`Plan ${tier} not found`);
    // Calculate amount (Basic simulation matching frontend logic)
    const sub = await SubscriptionService.getSchoolSubscriptionDetailed(schoolId);
    const studentCount = sub?.studentCount || 0;
    const unitRate = Number(plan.pricePerStudentMonthly || 0);
    let baseAmount = unitRate > 0 ? unitRate * studentCount : Number(plan.monthlyTotal || 0);
    // Apply billing period multiplier
    const months = billingPeriod === "monthly" ? 1 : billingPeriod === "semester" ? 6 : 12;
    let totalAmount = baseAmount * months;
    // Apply discounts
    if (billingPeriod === "semester")
        totalAmount *= 0.9;
    if (billingPeriod === "yearly")
        totalAmount *= 0.8;
    // Create a pending transaction record (using a generic name or specific table if exists)
    // For now we'll just return a simulation URL with the data encoded
    const txId = `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    // In a real Chapa integration, we would call Chapa API here and get a real checkout URL
    const checkoutUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout-simulation?tx_id=${txId}&school_id=${schoolId}&tier=${tier}&period=${billingPeriod}&amount=${totalAmount}&method=${paymentMethod}`;
    return {
        checkout_url: checkoutUrl,
        tx_id: txId
    };
};
exports.initializePayment = initializePayment;
const verifyPayment = async (txId, schoolId, tier, period) => {
    // In a real integration, we would verify with Chapa API using txId
    // Find the plan
    const plan = await db_1.default.subscriptionPlan.findUnique({
        where: { slug: tier.toLowerCase() }
    });
    if (!plan)
        throw new Error(`Plan ${tier} not found`);
    // Update the school subscription
    await SubscriptionService.upsertSchoolSubscription(schoolId, {
        planId: plan.id,
        billingPeriod: period,
        status: "active",
        studentCount: (await SubscriptionService.getSchoolSubscriptionDetailed(schoolId))?.studentCount || 0,
        billingStart: new Date(),
        // Calculate new ends based on period
        billingEnd: undefined, // uses default logic in upsert
        renewalDate: undefined,
    });
    return { success: true, message: "Subscription activated successfully" };
};
exports.verifyPayment = verifyPayment;
