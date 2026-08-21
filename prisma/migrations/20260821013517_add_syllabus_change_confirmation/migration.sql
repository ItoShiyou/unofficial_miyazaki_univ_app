-- AlterTable
ALTER TABLE "SyllabusChange" ADD COLUMN     "confirmCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refuteCount" INTEGER NOT NULL DEFAULT 0;
