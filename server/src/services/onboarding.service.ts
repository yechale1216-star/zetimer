import prisma from '../config/db';
import * as schoolService from './school.service';
import * as userService from './user.service';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { generateSchoolId } from '../utils/school-id';

export interface OnboardingData {
  schoolName: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminPassword?: string;
  subscriptionTier?: string;
}

/**
 * Centralized service to handle the full school onboarding process.
 * This is used by both public signup and Super Admin school creation.
 */
export const startOnboarding = async (data: OnboardingData) => {
  const { 
    schoolName, 
    adminName, 
    adminEmail, 
    adminPhone, 
    adminPassword,
    subscriptionTier = 'standard'
  } = data;

  // 1. Validation: Ensure email is unique
  const existingUser = await userService.getUserByEmail(adminEmail);
  if (existingUser) {
    throw new Error('An account with this email already exists.');
  }

  // 2. Atomic Transaction for School and Admin Creation
  return await prisma.$transaction(async (tx) => {
    // A. Create the School (Using tx directly for atomicity)
    const customId = await generateSchoolId(); // Generate outside or inside? Inside is safer for sequence
    const school = await tx.school.create({
      data: {
        name: schoolName,
        schoolId: customId,
        subscriptionStatus: 'ACTIVE',
        settings: {
          create: {
            school_name: schoolName,
            attendance_mode: 'session_based',
            attendance_ui_type: 'card_based'
          }
        }
      }
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

    // B. Create the Admin User (Inside transaction with tx)
    // If no password provided (Super Admin flow), generate a random one
    const rawPassword = adminPassword || crypto.randomBytes(8).toString('hex');
    const hashedPassword = bcrypt.hashSync(rawPassword, 10);
    
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
  });
};

/**
 * Transitions a school to ACTIVE/SETUP_COMPLETE status.
 */
export const updateOnboardingStatus = async (schoolId: string, status: 'ACTIVE' | 'SETUP_COMPLETE') => {
  return await prisma.school.update({
    where: { id: schoolId },
    data: {
      onboardingStatus: status,
      onboardingCompleted: status === 'SETUP_COMPLETE'
    }
  });
};
