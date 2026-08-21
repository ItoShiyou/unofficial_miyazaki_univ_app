-- CreateTable
CREATE TABLE "CancellationReport" (
    "id" TEXT NOT NULL,
    "syllabusCourseId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CancellationReport_syllabusCourseId_date_idx" ON "CancellationReport"("syllabusCourseId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationReport_syllabusCourseId_date_userId_key" ON "CancellationReport"("syllabusCourseId", "date", "userId");

-- AddForeignKey
ALTER TABLE "CancellationReport" ADD CONSTRAINT "CancellationReport_syllabusCourseId_fkey" FOREIGN KEY ("syllabusCourseId") REFERENCES "SyllabusCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
