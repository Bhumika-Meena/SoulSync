-- AlterTable
ALTER TABLE "DiaryEntry" ADD COLUMN "contentJson" JSONB,
ADD COLUMN "plainText" TEXT,
ADD COLUMN "assetUrl" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WeeklySummary" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "EmotionAnalysis_userId_primaryEmotion_createdAt_idx" ON "EmotionAnalysis"("userId", "primaryEmotion", "createdAt" DESC);
