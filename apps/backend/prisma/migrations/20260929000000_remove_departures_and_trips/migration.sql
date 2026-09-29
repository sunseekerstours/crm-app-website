-- Remove the Departures and Trip Board features.
-- Safe: departures, departure_pricing, trip_assignments, bookings and quotes
-- were all verified empty in production before this migration was written.

-- AlterEnum: add role-management audit actions (RBAC).
ALTER TYPE "AuditableAction" ADD VALUE 'ROLE_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'ROLE_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'ROLE_DELETED';
ALTER TYPE "AuditableAction" ADD VALUE 'ROLE_PERMISSIONS_UPDATED';

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_departureId_fkey";
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_departureId_fkey";
ALTER TABLE "checklist_items" DROP CONSTRAINT "checklist_items_departureId_fkey";

-- DropIndex
DROP INDEX "bookings_departureId_idx";
DROP INDEX "checklist_items_departureId_idx";

-- DropColumn
ALTER TABLE "bookings" DROP COLUMN "departureId";
ALTER TABLE "quotes" DROP COLUMN "departureId";
ALTER TABLE "checklist_items" DROP COLUMN "departureId";

-- DropTable (children first: they hold FKs to departures)
DROP TABLE "trip_assignments";
DROP TABLE "departure_pricing";
DROP TABLE "departures";

-- DropEnum
DROP TYPE "DepartureStatus";
