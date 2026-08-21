-- CreateTable
CREATE TABLE "SyllabusChangeVote" (
    "id" TEXT NOT NULL,
    "syllabusChangeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agree" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusChangeVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusChangeVote_syllabusChangeId_userId_key" ON "SyllabusChangeVote"("syllabusChangeId", "userId");

-- AddForeignKey
ALTER TABLE "SyllabusChangeVote" ADD CONSTRAINT "SyllabusChangeVote_syllabusChangeId_fkey" FOREIGN KEY ("syllabusChangeId") REFERENCES "SyllabusChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
