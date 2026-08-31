-- AlterTable
ALTER TABLE "destinations" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "tours" ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "endDate" TIMESTAMP(3),
ADD COLUMN "availabilityNote" TEXT;

-- CreateTable
CREATE TABLE "tour_pricing" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "persons" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "discountPercent" DECIMAL(5,2),
    "discountPrice" DECIMAL(12,2),
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tour_pricing_tourId_idx" ON "tour_pricing"("tourId");

-- AddForeignKey
ALTER TABLE "tour_pricing" ADD CONSTRAINT "tour_pricing_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
