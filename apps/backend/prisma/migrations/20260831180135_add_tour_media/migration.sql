-- AlterTable
ALTER TABLE "tours" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "videoUrl" TEXT;
