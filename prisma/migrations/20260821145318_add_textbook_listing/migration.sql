-- CreateTable
CREATE TABLE "TextbookListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "courseName" TEXT,
    "price" INTEGER,
    "condition" TEXT,
    "contact" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextbookListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TextbookListing_university_isActive_createdAt_idx" ON "TextbookListing"("university", "isActive", "createdAt");

-- AddForeignKey
ALTER TABLE "TextbookListing" ADD CONSTRAINT "TextbookListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
