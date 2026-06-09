import prisma from "../config/db";
import * as SubscriptionService from "./subscription.service";

export interface InitializePaymentInput {
  schoolId: string;
  tier: string;
  billingPeriod: "monthly" | "semester" | "yearly";
  paymentMethod: string;
}

export const initializePayment = async (data: InitializePaymentInput) => {
  const { schoolId, tier, billingPeriod, paymentMethod } = data;

  // Find the plan
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug: tier.toLowerCase() }
  });

  if (!plan) throw new Error(`Plan ${tier} not found`);

  // Calculate amount (Basic simulation matching frontend logic)
  const sub = await SubscriptionService.getSchoolSubscriptionDetailed(schoolId);
  const studentCount = sub?.studentCount || 0;
  
  const unitRate = Number(plan.pricePerStudentMonthly || 0);
  let baseAmount = unitRate > 0 ? unitRate * studentCount : Number(plan.monthlyTotal || 0);
  
  // Apply billing period multiplier
  const months = billingPeriod === "monthly" ? 1 : billingPeriod === "semester" ? 6 : 12;
  let totalAmount = baseAmount * months;

  // Apply discounts
  if (billingPeriod === "semester") totalAmount *= 0.9;
  if (billingPeriod === "yearly") totalAmount *= 0.8;

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

export const verifyPayment = async (txId: string, schoolId: string, tier: string, period: string) => {
  // In a real integration, we would verify with Chapa API using txId
  
  // Find the plan
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug: tier.toLowerCase() }
  });

  if (!plan) throw new Error(`Plan ${tier} not found`);

  // Update the school subscription
  await SubscriptionService.upsertSchoolSubscription(schoolId, {
    planId: plan.id,
    billingPeriod: period as any,
    status: "active",
    studentCount: (await SubscriptionService.getSchoolSubscriptionDetailed(schoolId))?.studentCount || 0,
    billingStart: new Date(),
    // Calculate new ends based on period
    billingEnd: undefined, // uses default logic in upsert
    renewalDate: undefined,
  });

  return { success: true, message: "Subscription activated successfully" };
};
