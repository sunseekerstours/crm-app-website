/*
  Warnings:

  - You are about to drop the column `userId` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `deals` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `body` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `tasks` table. All the data in the column will be lost.
  - Added the required column `content` to the `notes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "AuditableAction" ADD VALUE 'ACTIVITY_DELETED';

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_userId_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT "companies_userId_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_userId_fkey";

-- DropForeignKey
ALTER TABLE "deals" DROP CONSTRAINT "deals_userId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_userId_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_userId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_userId_fkey";

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "deals" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "leads" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "body",
DROP COLUMN "userId",
ADD COLUMN     "content" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "userId",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "sortOrder" INTEGER DEFAULT 0;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
