"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSchoolAddon = exports.setSchoolAddon = exports.getSchoolAddons = exports.deleteAddon = exports.updateAddon = exports.createAddon = exports.getAllAddons = exports.getSubscriptionMetrics = exports.resolveSchoolFeatures = exports.getSchoolFeatureOverrides = exports.removeSchoolFeatureOverride = exports.setSchoolFeatureOverride = exports.upsertSchoolSubscription = exports.getSchoolSubscription = exports.removeFeatureFromPlan = exports.addFeatureToPlan = exports.deleteFeature = exports.updateFeature = exports.createFeature = exports.getAllFeatures = exports.deletePlan = exports.updatePlan = exports.createPlan = exports.getPlanById = exports.getAllPlans = void 0;
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
            pricePerStudentMonthly: data.pricePerStudentMonthly,
            pricePerStudentSemester: data.pricePerStudentSemester,
            pricePerStudentYearly: data.pricePerStudentYearly,
            maxStudents: data.maxStudents,
            isActive: data.isActive ?? true,
            isCustom: data.isCustom ?? false,
            sortOrder: data.sortOrder ?? 0,
        },
    });
};
exports.createPlan = createPlan;
const updatePlan = async (id, data) => {
    return db_1.default.subscriptionPlan.update({ where: { id }, data });
};
exports.updatePlan = updatePlan;
const deletePlan = async (id) => {
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
    const subscription = await db_1.default.schoolSubscription.findUnique({
        where: { schoolId },
        include: {
            plan: {
                include: { features: { include: { feature: true } } },
            },
        },
    });
    if (!subscription)
        return null;
    // Get active addons for this school
    const schoolAddons = await db_1.default.schoolAddon.findMany({
        where: { schoolId, isActive: true },
        include: { addon: true },
    });
    // Calculate effective monthly price including addons
    const baseRate = Number(subscription.plan.pricePerStudentMonthly);
    let effectiveMonthly = baseRate * subscription.studentCount;
    // Add volumes/discounts if needed (for now just base + addons)
    const addonTotal = schoolAddons.reduce((sum, sa) => {
        const rate = Number(sa.addon.monthlyFlat) * (sa.addon.perUnit ? sa.quantity : 1);
        return sum + rate;
    }, 0);
    return {
        ...subscription,
        addons: schoolAddons,
        effectiveMonthly: effectiveMonthly + addonTotal,
    };
};
exports.getSchoolSubscription = getSchoolSubscription;
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
 * Resolve the effective feature set for a school:
 * 1. Start with plan features
 * 2. Apply school-level overrides (grant or revoke)
 * Returns an array of feature keys the school has access to.
 */
const resolveSchoolFeatures = async (schoolId) => {
    const subscription = await db_1.default.schoolSubscription.findUnique({
        where: { schoolId },
        include: {
            plan: {
                include: {
                    features: {
                        include: { feature: true },
                    },
                },
            },
        },
    });
    const overrides = await db_1.default.schoolFeatureOverride.findMany({
        where: { schoolId },
        include: { feature: true },
    });
    // Start with plan features (or empty if no subscription)
    const planFeatureKeys = new Set(subscription?.plan?.features
        .filter((pf) => pf.feature.isActive)
        .map((pf) => pf.feature.key) ?? []);
    // Apply overrides
    for (const override of overrides) {
        if (override.granted) {
            planFeatureKeys.add(override.feature.key);
        }
        else {
            planFeatureKeys.delete(override.feature.key);
        }
    }
    return Array.from(planFeatureKeys);
};
exports.resolveSchoolFeatures = resolveSchoolFeatures;
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
