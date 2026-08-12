-- CreateTable
CREATE TABLE "SyllabusCourse" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "teacher" TEXT,
    "room" TEXT,
    "weekday" TEXT,
    "period" INTEGER,
    "division" TEXT,
    "syllabusUrl" TEXT,
    "rawHash" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusChange" (
    "id" TEXT NOT NULL,
    "syllabusCourseId" TEXT,
    "courseName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseKarte" (
    "id" TEXT NOT NULL,
    "syllabusCourseId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" TEXT NOT NULL,
    "attendanceMethod" TEXT,
    "attendanceStrictness" INTEGER,
    "assignmentVolume" INTEGER,
    "examFormat" TEXT,
    "examDifficulty" INTEGER,
    "clarity" INTEGER,
    "atmosphere" TEXT,
    "pace" TEXT,
    "advice" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseKarte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friend" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "friendDeviceId" TEXT NOT NULL,
    "friendName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "code" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "SharedTimetable" (
    "deviceId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedTimetable_pkey" PRIMARY KEY ("deviceId")
);

-- CreateIndex
CREATE INDEX "SyllabusCourse_year_semester_name_idx" ON "SyllabusCourse"("year", "semester", "name");

-- CreateIndex
CREATE INDEX "SyllabusCourse_year_semester_code_idx" ON "SyllabusCourse"("year", "semester", "code");

-- CreateIndex
CREATE INDEX "SyllabusChange_syllabusCourseId_idx" ON "SyllabusChange"("syllabusCourseId");

-- CreateIndex
CREATE INDEX "SyllabusChange_year_semester_idx" ON "SyllabusChange"("year", "semester");

-- CreateIndex
CREATE INDEX "CourseKarte_syllabusCourseId_idx" ON "CourseKarte"("syllabusCourseId");

-- CreateIndex
CREATE UNIQUE INDEX "Friend_deviceId_friendDeviceId_key" ON "Friend"("deviceId", "friendDeviceId");

-- AddForeignKey
ALTER TABLE "SyllabusChange" ADD CONSTRAINT "SyllabusChange_syllabusCourseId_fkey" FOREIGN KEY ("syllabusCourseId") REFERENCES "SyllabusCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseKarte" ADD CONSTRAINT "CourseKarte_syllabusCourseId_fkey" FOREIGN KEY ("syllabusCourseId") REFERENCES "SyllabusCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
