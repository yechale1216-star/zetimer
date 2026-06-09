import prisma from "../config/db";

// ─── Plan Management ──────────────────────────────────────────────────────────

export interface CreatePlanInput {
  name: string;
  slug: string;
  description?: string;
  pricePerStudentMonthly: number;
  pricePerStudentSemester: number;
  pricePerStudentYearly: number;
  monthlyTotal: number;
  semesterTotal: number;
  yearlyTotal: number;
  maxStudents: number;
  maxUsers: number;
  trialDays?: number;
  isActive?: boolean;
  isCustom?: boolean;
  sortOrder?: number;
}

export const getAllPlans = async () => {
  return prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      features: {
        include: { feature: true },
      },
      _count: { select: { subscriptions: true } },
    },
  });
};

export const getPlanById = async (id: string) => {
  return prisma.subscriptionPlan.findUnique({
    where: { id },
    include: {
      features: { include: { feature: true } },
    },
  });
};

export const createPlan = async (data: CreatePlanInput) => {
  const exists = await prisma.subscriptionPlan.findUnique({ where: { slug: data.slug } });
  if (exists) throw new Error(`A plan with slug '${data.slug}' already exists`);

  return prisma.subscriptionPlan.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      pricePerStudentMonthly: data.pricePerStudentMonthly,
      pricePerStudentSemester: data.pricePerStudentSemester,
      pricePerStudentYearly: data.pricePerStudentYearly,
      monthlyTotal: data.monthlyTotal ?? 0,
      semesterTotal: data.semesterTotal ?? 0,
      yearlyTotal: data.yearlyTotal ?? 0,
      maxStudents: data.maxStudents,
      maxUsers: data.maxUsers,
      trialDays: data.trialDays ?? 0,
      isActive: data.isActive ?? true,
      isCustom: data.isCustom ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
  });
};

export const updatePlan = async (id: string, data: Partial<CreatePlanInput>) => {
  return prisma.subscriptionPlan.update({ where: { id }, data });
};

export const deletePlan = async (id: string) => {
  const subCount = await prisma.schoolSubscription.count({ where: { planId: id } });
  if (subCount > 0) throw new Error("Cannot delete a plan that has active subscriptions");
  return prisma.subscriptionPlan.delete({ where: { id } });
};

// ─── Feature Catalog ──────────────────────────────────────────────────────────

export interface CreateFeatureInput {
  key: string;
  name: string;
  description?: string;
  category?: string;
  isCore?: boolean;
  isActive?: boolean;
}

export const getAllFeatures = async () => {
  return prisma.feature.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
};

export const createFeature = async (data: CreateFeatureInput) => {
  const exists = await prisma.feature.findUnique({ where: { key: data.key } });
  if (exists) throw new Error(`Feature with key '${data.key}' already exists`);
  return prisma.feature.create({ data });
};

export const updateFeature = async (id: string, data: Partial<CreateFeatureInput>) => {
  return prisma.feature.update({ where: { id }, data });
};

export const deleteFeature = async (id: string) => {
  return prisma.feature.delete({ where: { id } });
};

// ─── Plan Feature Assignment ──────────────────────────────────────────────────

export const addFeatureToPlan = async (planId: string, featureId: string) => {
  return prisma.planFeature.upsert({
    where: { planId_featureId: { planId, featureId } },
    create: { planId, featureId },
    update: {},
  });
};

export const removeFeatureFromPlan = async (planId: string, featureId: string) => {
  return prisma.planFeature.deleteMany({ where: { planId, featureId } });
};

// ─── School Subscription ──────────────────────────────────────────────────────

export interface UpsertSubscriptionInput {
  planId: string;
  billingPeriod: "monthly" | "semester" | "yearly";
  studentCount: number;
  status?: "active" | "trial" | "expired" | "suspended" | "pending_payment" | "expiring" | "cancelled" | "paused";
  discountPercent?: number;
  billingStart?: Date;
  billingEnd?: Date;
  renewalDate?: Date;
  trialEndsAt?: Date;
  notes?: string;
}

export const getSchoolSubscription = async (schoolId: string) => {
  return prisma.schoolSubscription.findUnique({
    where: { schoolId },
    include: {
      plan: {
        include: { features: { include: { feature: true } } },
      },
    },
  });
};

/**
 * Get detailed subscription info for a school, including calculated amounts and current usage.
 */
export const getSchoolSubscriptionDetailed = async (schoolId: string) => {
  const [sub, usage] = await Promise.all([
    prisma.schoolSubscription.findUnique({
      where: { schoolId },
      include: {
        plan: true,
      },
    }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        _count: {
          select: { students: true, users: true }
        }
      }
    })
  ]);

  if (!sub || !sub.plan) return null;

  const plan = sub.plan as any;
  const unitRate = Number(plan.pricePerStudentMonthly || 0);
  const effectiveMonthly = unitRate > 0 ? unitRate * sub.studentCount : Number(plan.monthlyTotal || 0);

  return {
    ...sub,
    effectiveMonthly,
    currentUsage: {
      students: usage?._count.students ?? 0,
      users: usage?._count.users ?? 0,
    }
  };
};

export const upsertSchoolSubscription = async (schoolId: string, data: UpsertSubscriptionInput) => {
  const months = data.billingPeriod === "monthly" ? 1 : data.billingPeriod === "semester" ? 6 : 12;
  const billingStart = data.billingStart ?? new Date();
  const billingEnd = data.billingEnd ?? (() => { const d = new Date(billingStart); d.setMonth(d.getMonth() + months); return d; })();
  const renewalDate = data.renewalDate ?? (() => { const d = new Date(billingEnd); d.setDate(d.getDate() + 1); return d; })();

  return prisma.schoolSubscription.upsert({
    where: { schoolId },
    create: {
      schoolId,
      planId: data.planId,
      billingPeriod: data.billingPeriod,
      studentCount: data.studentCount,
      status: data.status ?? "trial",
      discountPercent: data.discountPercent ?? 0,
      billingStart,
      billingEnd,
      renewalDate,
      trialEndsAt: data.trialEndsAt,
      notes: data.notes,
    },
    update: {
      planId: data.planId,
      billingPeriod: data.billingPeriod,
      studentCount: data.studentCount,
      status: data.status ?? "trial",
      discountPercent: data.discountPercent ?? 0,
      billingStart,
      billingEnd,
      renewalDate,
      trialEndsAt: data.trialEndsAt,
      notes: data.notes,
    },
    include: { plan: { include: { features: { include: { feature: true } } } } },
  });
};

/**
 * Get all school subscriptions for Super Admin list views.
 */
export const getAllSubscriptions = async () => {
  return prisma.schoolSubscription.findMany({
    include: {
      plan: true,
      school: { select: { name: true } },
    },
    orderBy: { renewalDate: "asc" },
  });
};

export const deleteSchoolSubscription = async (id: string) => {
  return prisma.schoolSubscription.delete({ where: { id } });
};

// ─── School Feature Overrides ─────────────────────────────────────────────────

export const setSchoolFeatureOverride = async (
  schoolId: string,
  featureId: string,
  granted: boolean,
  reason?: string
) => {
  return prisma.schoolFeatureOverride.upsert({
    where: { schoolId_featureId: { schoolId, featureId } },
    create: { schoolId, featureId, granted, reason },
    update: { granted, reason },
  });
};

export const removeSchoolFeatureOverride = async (schoolId: string, featureId: string) => {
  return prisma.schoolFeatureOverride.deleteMany({ where: { schoolId, featureId } });
};

export const getSchoolFeatureOverrides = async (schoolId: string) => {
  return prisma.schoolFeatureOverride.findMany({
    where: { schoolId },
    include: { feature: true },
  });
};

/**
 * Resolve the effective feature set for a school in the modular SaaS model:
 * 1. Start with all features marked as 'isCore'
 * 2. Add features linked to active Add-ons purchased by the school
 * 3. Apply manual Super Admin overrides (force grant/revoke)
 */
export const resolveSchoolFeatures = async (schoolId: string): Promise<string[]> => {
  // 1. Get Core Features
  const coreFeatures = await prisma.feature.findMany({
    where: { isCore: true, isActive: true },
    select: { key: true }
  });

  const featureKeys = new Set<string>(coreFeatures.map(f => f.key));

  // 2. Get Active Add-ons for the school
  const activeAddons = await prisma.schoolAddon.findMany({
    where: { schoolId, isActive: true },
    include: { addon: true }
  });

  for (const sa of activeAddons) {
    if (sa.addon.featureKey && sa.addon.isActive) {
      featureKeys.add(sa.addon.featureKey);
    }
  }

  // 3. Apply manual Overrides
  const overrides = await prisma.schoolFeatureOverride.findMany({
    where: { schoolId },
    include: { feature: true },
  });

  for (const override of overrides) {
    if (override.granted) {
      featureKeys.add(override.feature.key);
    } else {
      featureKeys.delete(override.feature.key);
    }
  }

  return Array.from(featureKeys);
};

/**
 * Get the current limits (students/users) for a school based on their subscription plan.
 */
export const getSchoolLimits = async (schoolId: string) => {
  const subscription = await prisma.schoolSubscription.findUnique({
    where: { schoolId },
    include: { plan: true }
  });

  // Default limits if no subscription (very restrictive)
  if (!subscription || !subscription.plan) {
    return { maxStudents: 50, maxUsers: 5 };
  }

  return {
    maxStudents: subscription.plan.maxStudents,
    maxUsers: subscription.plan.maxUsers
  };
};

// ─── Subscription metrics for Super Admin dashboard ───────────────────────────

export const getSubscriptionMetrics = async () => {
  const [byStatus, total, plans] = await Promise.all([
    prisma.schoolSubscription.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { studentCount: true },
    }),
    prisma.schoolSubscription.count(),
    prisma.subscriptionPlan.findMany({
      include: { _count: { select: { subscriptions: true } } },
      where: { isActive: true },
    }),
  ]);

  const statusMap = Object.fromEntries(
    byStatus.map((b: any) => [b.status, { count: b._count.id, students: b._sum.studentCount ?? 0 }])
  );

  return {
    total,
    byStatus: statusMap,
    byPlan: plans.map((p: any) => ({ plan: p.name, slug: p.slug, count: p._count.subscriptions })),
  };
};

// ─── Add-on Catalog ──────────────────────────────────────────────────────────

export interface CreateAddonInput {
  name: string;
  description?: string;
  monthlyFlat: number;
  perUnit?: boolean;
  unitLabel?: string;
  featureKey?: string;
  isActive?: boolean;
}

export const getAllAddons = async () => {
  return prisma.addon.findMany({
    orderBy: { name: "asc" },
  });
};

export const createAddon = async (data: CreateAddonInput) => {
  return prisma.addon.create({
    data: {
      name: data.name,
      description: data.description,
      monthlyFlat: data.monthlyFlat,
      perUnit: data.perUnit ?? false,
      unitLabel: data.unitLabel,
      featureKey: data.featureKey,
      isActive: data.isActive ?? true,
    },
  });
};

export const updateAddon = async (id: string, data: Partial<CreateAddonInput>) => {
  return prisma.addon.update({ where: { id }, data });
};

export const deleteAddon = async (id: string) => {
  return prisma.addon.delete({ where: { id } });
};

// ─── School Add-ons ──────────────────────────────────────────────────────────

export const getSchoolAddons = async (schoolId: string) => {
  return prisma.schoolAddon.findMany({
    where: { schoolId },
    include: { addon: true },
  });
};

export const setSchoolAddon = async (
  schoolId: string,
  addonId: string,
  quantity: number = 1,
  isActive: boolean = true
) => {
  return prisma.schoolAddon.upsert({
    where: { schoolId_addonId: { schoolId, addonId } },
    create: { schoolId, addonId, quantity, isActive },
    update: { quantity, isActive },
  });
};

export const removeSchoolAddon = async (schoolId: string, addonId: string) => {
  return prisma.schoolAddon.delete({
    where: { schoolId_addonId: { schoolId, addonId } },
  });
};

/**
 * Periodically check for expired trials and mark them accordingly.
 */
export const checkAndExpireTrials = async () => {
  const now = new Date();
  
  // Update trials that have passed trialEndsAt
  const expiredTrials = await prisma.schoolSubscription.updateMany({
    where: {
      status: 'trial',
      trialEndsAt: { lt: now }
    },
    data: {
      status: 'expired'
    }
  });

  // Also update active subscriptions that have passed billingEnd
  const expiredSubs = await prisma.schoolSubscription.updateMany({
    where: {
      status: 'active',
      billingEnd: { lt: now }
    },
    data: {
      status: 'expired'
    }
  });

  return { 
    expiredTrials: expiredTrials.count, 
    expiredSubscriptions: expiredSubs.count 
  };
};
