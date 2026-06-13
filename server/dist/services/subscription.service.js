"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndExpireTrials = exports.removeSchoolAddon = exports.setSchoolAddon = exports.getSchoolAddons = exports.deleteAddon = exports.updateAddon = exports.createAddon = exports.getAllAddons = exports.getSubscriptionMetrics = exports.getSchoolLimits = exports.resolveSchoolFeatures = exports.getSchoolFeatureOverrides = exports.removeSchoolFeatureOverride = exports.setSchoolFeatureOverride = exports.deleteSchoolSubscription = exports.getAllSubscriptions = exports.upsertSchoolSubscription = exports.getSchoolSubscriptionDetailed = exports.getSchoolSubscription = exports.removeFeatureFromPlan = exports.addFeatureToPlan = exports.deleteFeature = exports.updateFeature = exports.createFeature = exports.getAllFeatures = exports.deletePlan = exports.updatePlan = exports.createPlan = exports.getPlanById = exports.getAllPlans = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAllPlans = async () => {
    return db_1.default.subscriptionPlan.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
            features: {
                include: { feature: true },
            },
            _count: { select: { subscriptions: true } },
        },
    });
};
exports.getAllPlans = getAllPlans;
const getPlanById = async (id) => {
    return db_1.default.subscriptionPlan.findUnique({
        where: { id },
        include: {
            features: { include: { feature: true } },
        },
    });
};
exports.getPlanById = getPlanById;
const createPlan = async (data) => {
    const exists = await db_1.default.subscriptionPlan.findUnique({ where: { slug: data.slug } });
    if (exists)
        throw new Error(`A plan with slug '${data.slug}' already exists`);
    return db_1.default.subscriptionPlan.create({
        data: {
            name: data.name,
            slug: data.slug,
            description: data.description,
            pricePerStudentMonthly: Number(data.pricePerStudentMonthly || 0),
            pricePerStudentSemester: Number(data.pricePerStudentSemester || 0),
            pricePerStudentYearly: Number(data.pricePerStudentYearly || 0),
            monthlyTotal: Number(data.monthlyTotal ?? 0),
            semesterTotal: Number(data.semesterTotal ?? 0),
            yearlyTotal: Number(data.yearlyTotal ?? 0),
            maxStudents: Number(data.maxStudents || 0),
            maxUsers: Number(data.maxUsers || 0),
            trialDays: Number(data.trialDays ?? 0),
            isActive: data.isActive ?? true,
            isCustom: data.isCustom ?? false,
            sortOrder: data.sortOrder ?? 0,
        },
    });
};
exports.createPlan = createPlan;
const updatePlan = async (id, data) => {
    // Ensure numeric fields are actually numbers to satisfy Prisma
    const updateData = { ...data };
    if (data.pricePerStudentMonthly !== undefined)
        updateData.pricePerStudentMonthly = Number(data.pricePerStudentMonthly);
    if (data.pricePerStudentSemester !== undefined)
        updateData.pricePerStudentSemester = Number(data.pricePerStudentSemester);
    if (data.pricePerStudentYearly !== undefined)
        updateData.pricePerStudentYearly = Number(data.pricePerStudentYearly);
    if (data.monthlyTotal !== undefined)
        updateData.monthlyTotal = Number(data.monthlyTotal);
    if (data.semesterTotal !== undefined)
        updateData.semesterTotal = Number(data.semesterTotal);
    if (data.yearlyTotal !== undefined)
        updateData.yearlyTotal = Number(data.yearlyTotal);
    if (data.maxStudents !== undefined)
        updateData.maxStudents = Number(data.maxStudents);
    if (data.maxUsers !== undefined)
        updateData.maxUsers = Number(data.maxUsers);
    if (data.trialDays !== undefined)
        updateData.trialDays = Number(data.trialDays);
    return db_1.default.subscriptionPlan.update({ where: { id }, data: updateData });
};
exports.updatePlan = updatePlan;
const deletePlan = async (id) => {
    const plan = await db_1.default.subscriptionPlan.findUnique({ where: { id } });
    if (!plan)
        throw new Error("Plan not found");
    if (plan.slug === "free")
        throw new Error("The 'Free' system plan cannot be deleted");
    const subCount = await db_1.default.schoolSubscription.count({ where: { planId: id } });
    if (subCount > 0)
        throw new Error("Cannot delete a plan that has active subscriptions");
    return db_1.default.subscriptionPlan.delete({ where: { id } });
};
exports.deletePlan = deletePlan;
const getAllFeatures = async () => {
    return db_1.default.feature.findMany({
        orderBy: [{ category: "asc" }, { name: "asc" }],
    });
};
exports.getAllFeatures = getAllFeatures;
const createFeature = async (data) => {
    const exists = await db_1.default.feature.findUnique({ where: { key: data.key } });
    if (exists)
        throw new Error(`Feature with key '${data.key}' already exists`);
    return db_1.default.feature.create({ data });
};
exports.createFeature = createFeature;
const updateFeature = async (id, data) => {
    return db_1.default.feature.update({ where: { id }, data });
};
exports.updateFeature = updateFeature;
const deleteFeature = async (id) => {
    return db_1.default.feature.delete({ where: { id } });
};
exports.deleteFeature = deleteFeature;
// ─── Plan Feature Assignment ──────────────────────────────────────────────────
const addFeatureToPlan = async (planId, featureId) => {
    return db_1.default.planFeature.upsert({
        where: { planId_featureId: { planId, featureId } },
        create: { planId, featureId },
        update: {},
    });
};
exports.addFeatureToPlan = addFeatureToPlan;
const removeFeatureFromPlan = async (planId, featureId) => {
    return db_1.default.planFeature.deleteMany({ where: { planId, featureId } });
};
exports.removeFeatureFromPlan = removeFeatureFromPlan;
const getSchoolSubscription = async (schoolId) => {
    return db_1.default.schoolSubscription.findUnique({
        where: { schoolId },
        include: {
            plan: {
                include: { features: { include: { feature: true } } },
            },
        },
    });
};
exports.getSchoolSubscription = getSchoolSubscription;
/**
 * Get detailed subscription info for a school, including calculated amounts and current usage.
 */
const getSchoolSubscriptionDetailed = async (schoolId) => {
    const [sub, usage] = await Promise.all([
        db_1.default.schoolSubscription.findUnique({
            where: { schoolId },
            include: {
                plan: true,
            },
        }),
        db_1.default.school.findUnique({
            where: { id: schoolId },
            select: {
                _count: {
                    select: { students: true, users: true }
                }
            }
        })
    ]);
    if (!sub || !sub.plan)
        return null;
    const plan = sub.plan;
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
exports.getSchoolSubscriptionDetailed = getSchoolSubscriptionDetailed;
const upsertSchoolSubscription = async (schoolId, data) => {
    const months = data.billingPeriod === "monthly" ? 1 : data.billingPeriod === "semester" ? 6 : 12;
    const billingStart = data.billingStart ?? new Date();
    const billingEnd = data.billingEnd ?? (() => { const d = new Date(billingStart); d.setMonth(d.getMonth() + months); return d; })();
    const renewalDate = data.renewalDate ?? (() => { const d = new Date(billingEnd); d.setDate(d.getDate() + 1); return d; })();
    return db_1.default.schoolSubscription.upsert({
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
exports.upsertSchoolSubscription = upsertSchoolSubscription;
/**
 * Get all school subscriptions for Super Admin list views.
 */
const getAllSubscriptions = async () => {
    return db_1.default.schoolSubscription.findMany({
        include: {
            plan: true,
            school: { select: { name: true, schoolId: true } },
        },
        orderBy: { renewalDate: "asc" },
    });
};
exports.getAllSubscriptions = getAllSubscriptions;
const deleteSchoolSubscription = async (id) => {
    return db_1.default.schoolSubscription.delete({ where: { id } });
};
exports.deleteSchoolSubscription = deleteSchoolSubscription;
// ─── School Feature Overrides ─────────────────────────────────────────────────
const setSchoolFeatureOverride = async (schoolId, featureId, granted, reason) => {
    return db_1.default.schoolFeatureOverride.upsert({
        where: { schoolId_featureId: { schoolId, featureId } },
        create: { schoolId, featureId, granted, reason },
        update: { granted, reason },
    });
};
exports.setSchoolFeatureOverride = setSchoolFeatureOverride;
const removeSchoolFeatureOverride = async (schoolId, featureId) => {
    return db_1.default.schoolFeatureOverride.deleteMany({ where: { schoolId, featureId } });
};
exports.removeSchoolFeatureOverride = removeSchoolFeatureOverride;
const getSchoolFeatureOverrides = async (schoolId) => {
    return db_1.default.schoolFeatureOverride.findMany({
        where: { schoolId },
        include: { feature: true },
    });
};
exports.getSchoolFeatureOverrides = getSchoolFeatureOverrides;
/**
 * Resolve the effective feature set for a school in the modular SaaS model:
 * 1. Start with all features marked as 'isCore'
 * 2. Add features linked to active Add-ons purchased by the school
 * 3. Apply manual Super Admin overrides (force grant/revoke)
 */
const resolveSchoolFeatures = async (schoolId) => {
    try {
        // 0. Fetch school and its subscription/plan
        const school = await db_1.default.school.findUnique({
            where: { id: schoolId },
            include: {
                subscription: {
                    include: {
                        plan: { include: { features: { include: { feature: true } } } }
                    }
                }
            }
        });
        if (!school)
            return [];
        const sub = school.subscription;
        const rawStatus = (sub?.status || '').toLowerCase();
        // 1. Detect if school is in an active TRIAL period
        // A school is in trial if:
        //   - status is explicitly 'trial', OR
        //   - trialEndsAt exists and is still in the future (even if status shows 'active')
        const now = new Date();
        const trialEndsAt = sub?.trialEndsAt ? new Date(sub.trialEndsAt) : null;
        const isInActiveTrial = rawStatus === 'trial' ||
            (trialEndsAt !== null && trialEndsAt > now);
        if (isInActiveTrial) {
            // Full access to ALL features during trial
            const allFeatures = await db_1.default.feature.findMany({
                where: { isActive: true },
                select: { key: true }
            });
            return allFeatures.map(f => f.key);
        }
        // 2. IF EXPIRED or SUSPENDED: Only Core Features
        if (rawStatus === 'expired' || rawStatus === 'suspended') {
            const coreFeatures = await db_1.default.feature.findMany({
                where: { isCore: true, isActive: true },
                select: { key: true }
            });
            return coreFeatures.map(f => f.key);
        }
        // 3. ACTIVE paid subscription: Core + Plan Features + Add-ons + Overrides
        const featureKeys = new Set();
        // A. Core Features (always available)
        const coreFeatures = await db_1.default.feature.findMany({
            where: { isCore: true, isActive: true },
            select: { key: true }
        });
        coreFeatures.forEach(f => featureKeys.add(f.key));
        // B. Plan Features
        if (sub?.plan?.features) {
            for (const pf of sub.plan.features) {
                if (pf.feature.isActive)
                    featureKeys.add(pf.feature.key);
            }
        }
        // C. Emergency Fallback: Grant messaging to any non-free active school if plan mapping is missing
        const planSlug = (sub?.plan?.slug || '').toLowerCase();
        if (planSlug && planSlug !== 'free') {
            featureKeys.add('messaging');
        }
        // D. Get Active Add-ons
        const activeAddons = await db_1.default.schoolAddon.findMany({
            where: { schoolId, isActive: true },
            include: { addon: true }
        });
        for (const sa of activeAddons) {
            if (sa.addon.featureKey && sa.addon.isActive) {
                featureKeys.add(sa.addon.featureKey);
            }
        }
        // E. Apply manual Super Admin Overrides
        const overrides = await db_1.default.schoolFeatureOverride.findMany({
            where: { schoolId },
            include: { feature: true },
        });
        for (const override of overrides) {
            if (override.granted) {
                featureKeys.add(override.feature.key);
            }
            else {
                featureKeys.delete(override.feature.key);
            }
        }
        return Array.from(featureKeys);
    }
    catch (error) {
        console.error(`[resolveSchoolFeatures] Error for school ${schoolId}:`, error);
        // On error, grant core + messaging to avoid total blackout
        try {
            const core = await db_1.default.feature.findMany({ where: { isCore: true }, select: { key: true } });
            return [...core.map(f => f.key), 'messaging'];
        }
        catch {
            return ['messaging', 'attendance_tracking', 'student_management'];
        }
    }
};
exports.resolveSchoolFeatures = resolveSchoolFeatures;
/**
 * Get the current limits (students/users) for a school based on their subscription plan.
 */
const getSchoolLimits = async (schoolId) => {
    const [subscription, config] = await Promise.all([
        db_1.default.schoolSubscription.findUnique({
            where: { schoolId },
            include: { plan: true }
        }),
        db_1.default.platformConfig.findUnique({
            where: { id: "singleton" }
        })
    ]);
    // Default limits if no subscription (very restrictive)
    if (!subscription || !subscription.plan) {
        return { maxStudents: 50, maxUsers: 5 };
    }
    // If in trial, we use the stricter of (Plan Limits) and (Super Admin Trial Capacity)
    if (subscription.status === 'trial') {
        const trialCap = config?.trialCapacity ?? 100;
        return {
            maxStudents: subscription.plan.maxStudents === -1
                ? trialCap
                : Math.min(subscription.plan.maxStudents, trialCap),
            maxUsers: subscription.plan.maxUsers === -1
                ? 10
                : Math.min(subscription.plan.maxUsers, 10)
        };
    }
    return {
        maxStudents: subscription.plan.maxStudents,
        maxUsers: subscription.plan.maxUsers
    };
};
exports.getSchoolLimits = getSchoolLimits;
// ─── Subscription metrics for Super Admin dashboard ───────────────────────────
const getSubscriptionMetrics = async () => {
    const [byStatus, total, plans] = await Promise.all([
        db_1.default.schoolSubscription.groupBy({
            by: ["status"],
            _count: { id: true },
            _sum: { studentCount: true },
        }),
        db_1.default.schoolSubscription.count(),
        db_1.default.subscriptionPlan.findMany({
            include: { _count: { select: { subscriptions: true } } },
            where: { isActive: true },
        }),
    ]);
    const statusMap = Object.fromEntries(byStatus.map((b) => [b.status, { count: b._count.id, students: b._sum.studentCount ?? 0 }]));
    return {
        total,
        byStatus: statusMap,
        byPlan: plans.map((p) => ({ plan: p.name, slug: p.slug, count: p._count.subscriptions })),
    };
};
exports.getSubscriptionMetrics = getSubscriptionMetrics;
const getAllAddons = async () => {
    return db_1.default.addon.findMany({
        orderBy: { name: "asc" },
    });
};
exports.getAllAddons = getAllAddons;
const createAddon = async (data) => {
    return db_1.default.addon.create({
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
exports.createAddon = createAddon;
const updateAddon = async (id, data) => {
    return db_1.default.addon.update({ where: { id }, data });
};
exports.updateAddon = updateAddon;
const deleteAddon = async (id) => {
    return db_1.default.addon.delete({ where: { id } });
};
exports.deleteAddon = deleteAddon;
// ─── School Add-ons ──────────────────────────────────────────────────────────
const getSchoolAddons = async (schoolId) => {
    return db_1.default.schoolAddon.findMany({
        where: { schoolId },
        include: { addon: true },
    });
};
exports.getSchoolAddons = getSchoolAddons;
const setSchoolAddon = async (schoolId, addonId, quantity = 1, isActive = true) => {
    return db_1.default.schoolAddon.upsert({
        where: { schoolId_addonId: { schoolId, addonId } },
        create: { schoolId, addonId, quantity, isActive },
        update: { quantity, isActive },
    });
};
exports.setSchoolAddon = setSchoolAddon;
const removeSchoolAddon = async (schoolId, addonId) => {
    return db_1.default.schoolAddon.delete({
        where: { schoolId_addonId: { schoolId, addonId } },
    });
};
exports.removeSchoolAddon = removeSchoolAddon;
/**
 * Periodically check for expired trials and mark them accordingly.
 */
const checkAndExpireTrials = async () => {
    const now = new Date();
    // Update trials that have passed trialEndsAt
    const expiredTrials = await db_1.default.schoolSubscription.updateMany({
        where: {
            status: 'trial',
            trialEndsAt: { lt: now }
        },
        data: {
            status: 'expired'
        }
    });
    // Also update active subscriptions that have passed billingEnd
    const expiredSubs = await db_1.default.schoolSubscription.updateMany({
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
exports.checkAndExpireTrials = checkAndExpireTrials;
