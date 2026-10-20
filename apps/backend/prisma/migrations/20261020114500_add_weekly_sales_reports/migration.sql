-- AlterEnum: add weekly report audit actions
ALTER TYPE "AuditableAction" ADD VALUE 'WEEKLY_REPORT_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'WEEKLY_REPORT_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'WEEKLY_REPORT_SUBMITTED';
ALTER TYPE "AuditableAction" ADD VALUE 'WEEKLY_REPORT_REVIEWED';

-- CreateEnum
CREATE TYPE "WeeklyReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED');

-- CreateTable
CREATE TABLE "weekly_sales_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "status" "WeeklyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "managerName" TEXT,
    "activitySummary" JSONB NOT NULL DEFAULT '{}',
    "kpis" JSONB NOT NULL DEFAULT '[]',
    "pipelineDeals" JSONB NOT NULL DEFAULT '[]',
    "wins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyLearning" TEXT,
    "commitments" JSONB NOT NULL DEFAULT '[]',
    "overallPerformance" TEXT,
    "keyWinHighlight" TEXT,
    "supportNeeded" TEXT,
    "projectedRevenueGhc" DECIMAL(12,2),
    "onTrackStatus" TEXT,
    "repSignedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "managerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_sales_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_sales_reports_userId_idx" ON "weekly_sales_reports"("userId");
CREATE INDEX "weekly_sales_reports_weekStartDate_weekEndDate_idx" ON "weekly_sales_reports"("weekStartDate", "weekEndDate");
CREATE INDEX "weekly_sales_reports_status_idx" ON "weekly_sales_reports"("status");

-- AddForeignKey
ALTER TABLE "weekly_sales_reports" ADD CONSTRAINT "weekly_sales_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
