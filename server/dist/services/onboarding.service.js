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
const schoolService = __importStar(require("./school.service"));
const userService = __importStar(require("./user.service"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Centralized service to handle the full school onboarding process.
 * This is used by both public signup and Super Admin school creation.
 */
const startOnboarding = async (data) => {
    const { schoolName, adminName, adminEmail, adminPhone, adminPassword, subscriptionTier = 'standard' } = data;
    // 1. Validation: Ensure email is unique
    const existingUser = await userService.getUserByEmail(adminEmail);
    if (existingUser) {
        throw new Error('An account with this email already exists.');
    }
    // 2. Atomic Transaction for School and Admin Creation
    return await db_1.default.$transaction(async (tx) => {
        // A. Create the School
        const school = await schoolService.createSchool({
            name: schoolName
        });
        // B. Create real School Subscription record
        // Find the plan based on slug
        const plan = await tx.subscriptionPlan.findUnique({
            where: { slug: subscriptionTier.toLowerCase() }
        });
        if (plan) {
            await tx.schoolSubscription.create({
                data: {
                    schoolId: school.id,
                    planId: plan.id,
                    billingPeriod: 'monthly',
                    status: 'trial',
                    studentCount: 0,
                    billingStart: new Date(),
                    billingEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
                    renewalDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
                    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
        }
        // Update legacy field for backward compatibility (optional but safer for now)
        await tx.school.update({
            where: { id: school.id },
            data: {
                subscriptionStatus: subscriptionTier.toUpperCase(),
                onboardingStatus: 'PENDING'
            }
        });
        // B. Create the Admin User
        // If no password provided (Super Admin flow), generate a random one
        const password = adminPassword || crypto_1.default.randomBytes(8).toString('hex');
        const user = await userService.createUser({
            email: adminEmail.toLowerCase().trim(),
            password_hash: password,
            full_name: adminName,
            role: 'admin', // Default role for school creator
            phone: adminPhone,
            schoolId: school.id,
            is_active: true
        });
        return {
            school,
            admin: {
                id: user.id,
                email: user.email,
                name: user.full_name,
                role: user.role,
                generatedPassword: adminPassword ? undefined : password
            }
        };
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
