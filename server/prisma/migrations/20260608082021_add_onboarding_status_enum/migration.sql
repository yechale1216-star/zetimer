-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'ACTIVE', 'SETUP_COMPLETE');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING';
