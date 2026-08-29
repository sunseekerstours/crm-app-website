-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DepartureStatus" AS ENUM ('SCHEDULED', 'OPEN', 'GUARANTEED', 'LOCKED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tours" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT,
    "difficulty" TEXT,
    "minPax" INTEGER NOT NULL DEFAULT 1,
    "maxPax" INTEGER,
    "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverImage" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "basePrice" DECIMAL(12,2),
    "status" "TourStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_destinations" (
    "tourId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,

    CONSTRAINT "tour_destinations_pkey" PRIMARY KEY ("tourId","destinationId")
);

-- CreateTable
CREATE TABLE "tour_days" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "meals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accommodation" TEXT,
    "destinationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departures" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "DepartureStatus" NOT NULL DEFAULT 'SCHEDULED',
    "minPax" INTEGER NOT NULL DEFAULT 1,
    "maxPax" INTEGER,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departure_pricing" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'GHS',

    CONSTRAINT "departure_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations"("slug");

-- CreateIndex
CREATE INDEX "destinations_country_idx" ON "destinations"("country");

-- CreateIndex
CREATE UNIQUE INDEX "tours_slug_key" ON "tours"("slug");

-- CreateIndex
CREATE INDEX "tours_status_idx" ON "tours"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tour_days_tourId_dayNumber_key" ON "tour_days"("tourId", "dayNumber");

-- CreateIndex
CREATE INDEX "departures_tourId_idx" ON "departures"("tourId");

-- CreateIndex
CREATE INDEX "departures_startDate_idx" ON "departures"("startDate");

-- CreateIndex
CREATE INDEX "departure_pricing_departureId_idx" ON "departure_pricing"("departureId");

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_destinations" ADD CONSTRAINT "tour_destinations_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_destinations" ADD CONSTRAINT "tour_destinations_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_days" ADD CONSTRAINT "tour_days_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_days" ADD CONSTRAINT "tour_days_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departures" ADD CONSTRAINT "departures_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departure_pricing" ADD CONSTRAINT "departure_pricing_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "departures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
