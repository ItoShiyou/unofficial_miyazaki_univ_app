-- CreateTable
CREATE TABLE "SponsorStamp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorStamp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsorStamp_userId_idx" ON "SponsorStamp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorStamp_userId_sponsorId_key" ON "SponsorStamp"("userId", "sponsorId");

-- AddForeignKey
ALTER TABLE "SponsorStamp" ADD CONSTRAINT "SponsorStamp_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
