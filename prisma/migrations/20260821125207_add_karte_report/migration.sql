-- CreateTable
CREATE TABLE "KarteReport" (
    "id" TEXT NOT NULL,
    "courseKarteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KarteReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KarteReport_courseKarteId_userId_key" ON "KarteReport"("courseKarteId", "userId");

-- AddForeignKey
ALTER TABLE "KarteReport" ADD CONSTRAINT "KarteReport_courseKarteId_fkey" FOREIGN KEY ("courseKarteId") REFERENCES "CourseKarte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
