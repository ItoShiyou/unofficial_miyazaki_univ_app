-- AlterTable
ALTER TABLE "EventRsvp" ADD COLUMN     "feedbackAt" TIMESTAMP(3),
ADD COLUMN     "feedbackComment" TEXT,
ADD COLUMN     "feedbackRating" INTEGER;

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "qrScanCount" INTEGER NOT NULL DEFAULT 0;
