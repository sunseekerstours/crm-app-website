-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('HOTEL', 'TRANSPORT', 'GUIDE', 'ACTIVITY', 'CATERING', 'AIRLINE', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('VAN', 'BUS', 'SUV_4X4', 'SEDAN', 'BOAT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditableAction" ADD VALUE 'SUPPLIER_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'SUPPLIER_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'SUPPLIER_DELETED';
ALTER TYPE "AuditableAction" ADD VALUE 'HOTEL_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'HOTEL_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'HOTEL_DELETED';
ALTER TYPE "AuditableAction" ADD VALUE 'VEHICLE_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'VEHICLE_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'VEHICLE_DELETED';
ALTER TYPE "AuditableAction" ADD VALUE 'GUIDE_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'GUIDE_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'GUIDE_DELETED';
ALTER TYPE "AuditableAction" ADD VALUE 'DRIVER_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'DRIVER_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'DRIVER_DELETED';
ALTER TYPE "AuditableAction" ADD VALUE 'TRIP_ASSIGNED';
ALTER TYPE "AuditableAction" ADD VALUE 'TRIP_UNASSIGNED';
ALTER TYPE "AuditableAction" ADD VALUE 'CHECKLIST_CREATED';
ALTER TYPE "AuditableAction" ADD VALUE 'CHECKLIST_UPDATED';
ALTER TYPE "AuditableAction" ADD VALUE 'CHECKLIST_COMPLETED';
ALTER TYPE "AuditableAction" ADD VALUE 'CHECKLIST_DELETED';

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL DEFAULT 'OTHER',
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "country" TEXT,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierId" TEXT,
    "destinationId" TEXT,
    "starRating" INTEGER,
    "address" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "contactPerson" TEXT,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNo" TEXT,
    "type" "VehicleType" NOT NULL DEFAULT 'VAN',
    "capacity" INTEGER,
    "ownerSupplierId" TEXT,
    "driverId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supplierId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "supplierId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_assignments" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "dayNumber" INTEGER,
    "guideId" TEXT,
    "hotelId" TEXT,
    "vehicleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "departureId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_type_idx" ON "suppliers"("type");

-- CreateIndex
CREATE INDEX "hotels_supplierId_idx" ON "hotels"("supplierId");

-- CreateIndex
CREATE INDEX "vehicles_ownerSupplierId_idx" ON "vehicles"("ownerSupplierId");

-- CreateIndex
CREATE INDEX "guides_supplierId_idx" ON "guides"("supplierId");

-- CreateIndex
CREATE INDEX "drivers_supplierId_idx" ON "drivers"("supplierId");

-- CreateIndex
CREATE INDEX "trip_assignments_departureId_idx" ON "trip_assignments"("departureId");

-- CreateIndex
CREATE INDEX "checklist_items_departureId_idx" ON "checklist_items"("departureId");

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_ownerSupplierId_fkey" FOREIGN KEY ("ownerSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_assignments" ADD CONSTRAINT "trip_assignments_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "departures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_assignments" ADD CONSTRAINT "trip_assignments_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_assignments" ADD CONSTRAINT "trip_assignments_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_assignments" ADD CONSTRAINT "trip_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "departures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
