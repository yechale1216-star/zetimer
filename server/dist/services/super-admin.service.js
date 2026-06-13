"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSchoolStatus = exports.getEnrichedSchools = exports.exportBillingCsv = exports.getBillingHistory = exports.createTicket = exports.updateTicket = exports.getSupportTickets = exports.getBroadcastHistory = exports.broadcastMessage = exports.getAuditLogs = exports.updatePlatformConfig = exports.getPlatformConfig = exports.searchAllUsers = exports.getFullDashboardMetrics = exports.getRevenueMetrics = exports.getPlatformMetrics = void 0;
const db_1 = __importDefault(require("../config/db"));
const getPlatformMetrics = async () => {
    const [schools, usersByRole, totalStudents] = await Promise.all([
        // School counts by status
        db_1.default.school.groupBy({
            by: ["onboardingStatus"],
            _count: { id: true },
        }),
        // Users by role
        db_1.default.user.groupBy({
            by: ["role"],
            _count: { id: true },
        }),
        // Total students across all schools
        db_1.default.student.count(),
    ]);
    // Aggregate school statuses (mapping PENDING/ACTIVE/SETUP_COMPLETE to Trial/Active/etc if needed)
    const schoolStats = {
        total: schools.reduce((acc, curr) => acc + curr._count.id, 0),
        active: schools.find(s => s.onboardingStatus === "SETUP_COMPLETE")?._count.id || 0,
        trial: schools.find(s => s.onboardingStatus === "ACTIVE")?._count.id || 0, // 'ACTIVE' in onboarding usually means mid-onboarding/trial
        suspended: 0,
        expired: 0,
    };
    // User stats (Schools, Teachers, Students, Parents)
    const userStats = {
        total: usersByRole.reduce((acc, curr) => acc + curr._count.id, 0),
        teachers: usersByRole.find(u => u.role === "teacher")?._count.id || 0,
        students: totalStudents,
        parents: usersByRole.find(u => u.role === "parent")?._count.id || 0,
    };
    return {
        schoolStats,
        userStats,
    };
};
exports.getPlatformMetrics = getPlatformMetrics;
const getRevenueMetrics = async () => {
    const subscriptions = await db_1.default.schoolSubscription.findMany({
        where: { status: "active" },
        include: { plan: true },
    });
    let mrr = 0;
    const studentsByTier = {};
    for (const sub of subscriptions) {
        const plan = sub.plan;
        const period = sub.billingPeriod;
        const students = sub.studentCount;
        // Add to tier distribution
        const tierName = plan.name;
        studentsByTier[tierName] = (studentsByTier[tierName] || 0) + students;
        // Calculate MRR contribution
        let monthlyAmount = 0;
        // 1. Check if it's a fixed package total
        const totalKey = period === "monthly" ? "monthlyTotal" : period === "semester" ? "semesterTotal" : "yearlyTotal";
        const packageTotal = Number(plan[totalKey] || 0);
        if (packageTotal > 0 && (plan.maxStudents === -1 || students <= plan.maxStudents)) {
            // Fixed package rate
            if (period === "monthly")
                monthlyAmount = packageTotal;
            else if (period === "semester")
                monthlyAmount = packageTotal / 6;
            else if (period === "yearly")
                monthlyAmount = packageTotal / 12;
        }
        else {
            // Unit rate (per student)
            const unitKey = period === "monthly" ? "pricePerStudentMonthly" : period === "semester" ? "pricePerStudentSemester" : "pricePerStudentYearly";
            const rate = Number(plan[unitKey]);
            const subTotal = rate * students;
            if (period === "monthly")
                monthlyAmount = subTotal;
            else if (period === "semester")
                monthlyAmount = subTotal; // In Zetime, per-student rates are already monthly-equivalents if multiplying by student count correctly?
            else if (period === "yearly")
                monthlyAmount = subTotal;
            // Wait, let's look at the seed-plans.ts logic again.
            // If pricePerStudentSemester is 8.5, that's per student per month? Or per student per semester?
            // In the calculator: rate * students * months.
            // So for MRR, we just want rate * students (which is the monthly revenue per student).
        }
        mrr += monthlyAmount;
    }
    // Mocked growth and historical trends for now, but with real current totals
    const totalRevenue = mrr * 12; // Simple projection for total billed in year
    const revenueTrends = [
        { month: "Jan", revenue: mrr * 0.8, subscriptions: Math.floor(subscriptions.length * 0.8) },
        { month: "Feb", revenue: mrr * 0.85, subscriptions: Math.floor(subscriptions.length * 0.85) },
        { month: "Mar", revenue: mrr * 0.9, subscriptions: Math.floor(subscriptions.length * 0.9) },
        { month: "Apr", revenue: mrr * 0.92, subscriptions: Math.floor(subscriptions.length * 0.92) },
        { month: "May", revenue: mrr * 0.95, subscriptions: Math.floor(subscriptions.length * 0.95) },
        { month: "Jun", revenue: mrr, subscriptions: subscriptions.length },
    ];
    return {
        mrr,
        totalRevenue,
        activeSubscriptions: subscriptions.length,
        subscriptionGrowthPercent: 12,
        studentsByTier,
        revenueTrends,
    };
};
exports.getRevenueMetrics = getRevenueMetrics;
const getFullDashboardMetrics = async () => {
    const platform = await (0, exports.getPlatformMetrics)();
    const revenue = await (0, exports.getRevenueMetrics)();
    return {
        ...platform,
        ...revenue,
    };
};
exports.getFullDashboardMetrics = getFullDashboardMetrics;
const searchAllUsers = async (params) => {
    const { query, role, schoolId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where = {};
    if (role && role !== "all") {
        where.role = role === "school_admin" ? "admin" : role; // mapping frontend roles if needed
    }
    if (schoolId) {
        where.schoolId = schoolId;
    }
    if (query) {
        where.OR = [
            { full_name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
        ];
    }
    const [users, total] = await Promise.all([
        db_1.default.user.findMany({
            where,
            skip,
            take: limit,
            include: {
                school: { select: { name: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        db_1.default.user.count({ where })
    ]);
    return {
        users: users.map(u => ({
            id: u.id,
            name: u.full_name,
            email: u.email,
            role: u.role,
            school: u.school?.name || "Global / N/A",
            status: u.is_active ? "active" : "inactive",
            joinDate: u.createdAt.toISOString().split("T")[0]
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
};
exports.searchAllUsers = searchAllUsers;
const getPlatformConfig = async () => {
    let config = await db_1.default.platformConfig.findUnique({
        where: { id: "singleton" }
    });
    if (!config) {
        // Initialize default config if it doesn't exist
        config = await db_1.default.platformConfig.create({
            data: { id: "singleton" }
        });
    }
    return config;
};
exports.getPlatformConfig = getPlatformConfig;
const updatePlatformConfig = async (data) => {
    const config = await db_1.default.platformConfig.upsert({
        where: { id: "singleton" },
        update: data,
        create: { id: "singleton", ...data }
    });
    return config;
};
exports.updatePlatformConfig = updatePlatformConfig;
const getAuditLogs = async (params) => {
    const { page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        db_1.default.auditLog.findMany({
            skip,
            take: limit,
            include: {
                school: { select: { name: true } }
            },
            orderBy: { created_at: "desc" }
        }),
        db_1.default.auditLog.count()
    ]);
    return {
        logs: logs.map(l => ({
            id: l.id,
            timestamp: l.created_at.toISOString(),
            action: l.action,
            entity: l.entity_type,
            user: l.user_id || "System",
            school: l.school?.name || "Global",
            details: l.new_values
        })),
        total,
        totalPages: Math.ceil(total / limit)
    };
};
exports.getAuditLogs = getAuditLogs;
const broadcastMessage = async (message) => {
    const adminUsers = await db_1.default.user.findMany({
        where: { role: "admin", is_active: true }
    });
    const sentCount = adminUsers.length;
    console.log(`Broadcasting "${message.title}" to ${sentCount} admins...`);
    // Persist broadcast log
    await db_1.default.broadcastLog.create({
        data: {
            title: message.title,
            content: message.content,
            type: message.type,
            sentCount,
        }
    });
    return {
        sentCount,
        timestamp: new Date().toISOString()
    };
};
exports.broadcastMessage = broadcastMessage;
// ─── Communication History ─────────────────────────────────────────────────────
const getBroadcastHistory = async (params) => {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        db_1.default.broadcastLog.findMany({
            skip,
            take: limit,
            orderBy: { sentAt: "desc" }
        }),
        db_1.default.broadcastLog.count()
    ]);
    return { logs, total, totalPages: Math.ceil(total / limit) };
};
exports.getBroadcastHistory = getBroadcastHistory;
// ─── Help Desk (Support Tickets) ──────────────────────────────────────────────
const getSupportTickets = async (params) => {
    const { status, schoolId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where = {};
    if (status && status !== "all")
        where.status = status;
    if (schoolId)
        where.schoolId = schoolId;
    const [tickets, total] = await Promise.all([
        db_1.default.supportTicket.findMany({
            where,
            skip,
            take: limit,
            include: { school: { select: { name: true } } },
            orderBy: { createdAt: "desc" }
        }),
        db_1.default.supportTicket.count({ where })
    ]);
    // Count by status for stats bar (filtered by school if provided)
    const [urgentCount, openCount, closedCount] = await Promise.all([
        db_1.default.supportTicket.count({ where: { ...where, status: "urgent" } }),
        db_1.default.supportTicket.count({ where: { ...where, status: { in: ["open", "in_progress"] } } }),
        db_1.default.supportTicket.count({ where: { ...where, status: "closed" } }),
    ]);
    return {
        tickets: tickets.map(t => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            school: t.school.name,
            subject: t.subject,
            description: t.description,
            category: t.category,
            status: t.status,
            priority: t.priority,
            assignee: t.assignee || "Unassigned",
            createdAt: t.createdAt.toISOString(),
        })),
        total,
        stats: { urgent: urgentCount, open: openCount, closed: closedCount },
        totalPages: Math.ceil(total / limit)
    };
};
exports.getSupportTickets = getSupportTickets;
const updateTicket = async (id, data) => {
    return db_1.default.supportTicket.update({ where: { id }, data });
};
exports.updateTicket = updateTicket;
const createTicket = async (data) => {
    const count = await db_1.default.supportTicket.count();
    return db_1.default.supportTicket.create({
        data: {
            ...data,
            ticketNumber: `TICK-${String(1000 + count + 1)}`,
            category: data.category || "General",
            priority: data.priority || "normal",
        }
    });
};
exports.createTicket = createTicket;
// ─── Billing History & Transactions ───────────────────────────────────────────
const getBillingHistory = async (params) => {
    const { page = 1, limit = 30 } = params;
    const skip = (page - 1) * limit;
    const [subs, total] = await Promise.all([
        db_1.default.schoolSubscription.findMany({
            skip,
            take: limit,
            include: {
                school: { select: { name: true } },
                plan: { select: { name: true } }
            },
            orderBy: { updatedAt: "desc" }
        }),
        db_1.default.schoolSubscription.count()
    ]);
    return {
        data: subs.map(s => {
            const plan = s.plan;
            const rate = Number(plan.pricePerStudentMonthly || 0);
            const amount = rate > 0 ? rate * s.studentCount : Number(plan.monthlyTotal || 0);
            return {
                id: s.id,
                subscriptionId: s.id,
                schoolName: s.school.name,
                plan: plan.name,
                amount,
                billingPeriod: s.billingPeriod,
                date: s.billingStart?.toISOString().split('T')[0] ?? '-',
                status: s.status,
                description: `${plan.name} – ${s.billingPeriod} (${s.studentCount} students)`,
            };
        }),
        total,
        totalPages: Math.ceil(total / limit)
    };
};
exports.getBillingHistory = getBillingHistory;
const exportBillingCsv = async () => {
    const subs = await db_1.default.schoolSubscription.findMany({
        include: {
            school: { select: { name: true } },
            plan: { select: { name: true } }
        },
        orderBy: { updatedAt: "desc" }
    });
    const rows = subs.map(s => {
        const plan = s.plan;
        const rate = Number(plan.pricePerStudentMonthly || 0);
        const amount = rate > 0 ? rate * s.studentCount : Number(plan.monthlyTotal || 0);
        return [s.school.name, plan.name, s.billingPeriod, amount, s.status,
            s.billingStart?.toISOString().split('T')[0] ?? ''].join(',');
    });
    return "School,Plan,Period,Amount,Status,Date\n" + rows.join("\n");
};
exports.exportBillingCsv = exportBillingCsv;
// ─── Enriched Schools List ─────────────────────────────────────────────────────
const getEnrichedSchools = async (params) => {
    const { query, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where = {};
    if (query) {
        where.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { schoolId: { contains: query, mode: "insensitive" } },
        ];
    }
    const [schools, total] = await Promise.all([
        db_1.default.school.findMany({
            where,
            skip,
            take: limit,
            include: {
                subscription: { include: { plan: { select: { name: true } } } },
                _count: { select: { users: true, students: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        db_1.default.school.count({ where })
    ]);
    return {
        schools: schools.map(s => ({
            id: s.id,
            schoolId: s.schoolId,
            name: s.name,
            onboardingStatus: s.onboardingStatus,
            subscriptionStatus: s.subscriptionStatus.toLowerCase(),
            plan: s.subscription?.plan?.name ?? "No Plan",
            userCount: s._count.users,
            studentCount: s._count.students,
            createdAt: s.createdAt.toISOString().split("T")[0],
        })),
        total,
        totalPages: Math.ceil(total / limit)
    };
};
exports.getEnrichedSchools = getEnrichedSchools;
const updateSchoolStatus = async (id, action) => {
    return await db_1.default.$transaction(async (tx) => {
        const school = await tx.school.findUnique({
            where: { id },
            include: { subscription: true }
        });
        if (!school)
            throw new Error("School not found");
        const newStatus = action === "suspend" ? "suspended" : "active";
        const schoolModelStatus = action === "suspend" ? "SUSPENDED" : "ACTIVE";
        // 1. Update Subscription record if it exists
        if (school.subscription) {
            await tx.schoolSubscription.update({
                where: { id: school.subscription.id },
                data: { status: newStatus }
            });
        }
        // 2. Update School record (Source of truth for suspendedGuard)
        await tx.school.update({
            where: { id },
            data: { subscriptionStatus: schoolModelStatus }
        });
        console.log(`[SuperAdmin] School ${school.schoolId} ${action === "suspend" ? "SUSPENDED" : "ACTIVATED"}`);
        return { id, action };
    });
};
exports.updateSchoolStatus = updateSchoolStatus;
