-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT,
    "jobType" TEXT NOT NULL,
    "postingType" TEXT NOT NULL DEFAULT 'job',
    "description" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" TEXT,
    "workPeriod" TEXT,
    "targetGrade" TEXT,
    "applicationUrl" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "area" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPosting_isActive_sortOrder_idx" ON "JobPosting"("isActive", "sortOrder");
