-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WellnessGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellnessGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WellnessGoal_userId_status_idx" ON "WellnessGoal"("userId", "status");

-- CreateIndex
CREATE INDEX "WellnessGoal_userId_createdAt_idx" ON "WellnessGoal"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "WellnessGoal" ADD CONSTRAINT "WellnessGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
