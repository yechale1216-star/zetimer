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
exports.updateOnboardingStatus = exports.startOnboarding = void 0;
const db_1 = __importDefault(require("../config/db"));
const userService = __importStar(require("./user.service"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const school_id_1 = require("../utils/school-id");
/**
 * Centralized service to handle the full school onboarding process.
 * This is used by both public signup and Super Admin school creation.
 */
const startOnboarding = async (data) => {
    const { schoolName, address, adminName, adminEmail, adminPhone, adminPassword, subscriptionTier = 'free' } = data;
    // 1. Validation: Ensure email is unique
    const existingUser = await userService.getUserByEmail(adminEmail);
    if (existingUser) {
        throw new Error('An account with this email already exists.');
    }
    // 2. Generate a unique School ID (outside transaction to avoid connection deadlock)
    const customId = await (0, school_id_1.generateSchoolId)();
    // 3. Prepare credentials outside to avoid blocking the transaction with CPU-intensive hashing
    const rawPassword = adminPassword || crypto_1.default.randomBytes(8).toString('hex');
    const hashedPassword = bcryptjs_1.default.hashSync(rawPassword, 10);
    // 4. Atomic Transaction for School and Admin Creation
    return await db_1.default.$transaction(async (tx) => {
        // A. Create the School
        const school = await tx.school.create({
            data: {
                name: schoolName,
                schoolId: customId,
                subscriptionStatus: 'ACTIVE',
                settings: {
                    create: {
                        school_name: schoolName,
                        school_address: address,
                        attendance_mode: 'session_based',
                        attendance_ui_type: 'card_based'
                    }
                }
            }
        });
        // B. Create real School Subscription record
        const plan = await tx.subscriptionPlan.findUnique({
            where: { slug: subscriptionTier.toLowerCase() }
        });
        if (plan) {
            const trialDays = plan.trialDays || 0;
            const billingStart = new Date();
            const trialEndsAt = new Date(billingStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
            const billingEnd = trialDays > 0 ? trialEndsAt : new Date(billingStart.getTime() + 30 * 24 * 60 * 60 * 1000);
            const renewalDate = new Date(billingEnd.getTime() + 24 * 60 * 60 * 1000);
            await tx.schoolSubscription.create({
                data: {
                    schoolId: school.id,
                    planId: plan.id,
                    billingPeriod: 'monthly',
                    status: trialDays > 0 ? 'trial' : 'active',
                    studentCount: 0,
                    billingStart,
                    billingEnd,
                    renewalDate,
                    trialEndsAt: trialDays > 0 ? trialEndsAt : null
                }
            });
        }
        // Update legacy field
        await tx.school.update({
            where: { id: school.id },
            data: {
                subscriptionStatus: subscriptionTier.toUpperCase(),
                onboardingStatus: 'PENDING'
            }
        });
        // B. Create the Admin User (Inside transaction with tx)
        const user = await tx.user.create({
            data: {
                email: adminEmail.toLowerCase().trim(),
                password_hash: hashedPassword,
                full_name: adminName,
                role: 'admin',
                phone: adminPhone,
                schoolId: school.id,
                is_active: true
            }
        });
        return {
            school,
            admin: {
                id: user.id,
                email: user.email,
                name: user.full_name,
                role: user.role,
                generatedPassword: adminPassword ? undefined : rawPassword
            }
        };
    }, {
        timeout: 30000
    });
};
exports.startOnboarding = startOnboarding;
/**
 * Transitions a school to ACTIVE/SETUP_COMPLETE status.
 */
const updateOnboardingStatus = async (schoolId, status) => {
    return await db_1.default.school.update({
        where: { id: schoolId },
        data: {
            onboardingStatus: status,
            onboardingCompleted: status === 'SETUP_COMPLETE'
        }
    });
};
exports.updateOnboardingStatus = updateOnboardingStatus;
