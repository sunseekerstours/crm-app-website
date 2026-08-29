-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditableAction" ADD VALUE 'DESTINATION_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'DESTINATION_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'DESTINATION_DELETED';
ALTER TYPE "AuditableAction" ADD VALUE 'TOUR_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'TOUR_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'TOUR_PUBLISHED';
ALTER TYPE "AuditableAction" ADD VALUE 'TOUR_ARCHIVED';
ALTER TYPE "AuditableAction" ADD VALUE 'TOUR_DELETED';
ALTER TYPE "AuditableAction" ADD VALUE 'DEPARTURE_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'DEPARTURE_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'DEPARTURE_STATUS_CHANGED';
ALTER TYPE "AuditableAction" ADD VALUE 'DEPARTURE_DELETED';
