-- DropIndex
DROP INDEX "SyllabusChange_year_semester_idx";

-- DropIndex
DROP INDEX "SyllabusCourse_year_semester_code_idx";

-- DropIndex
DROP INDEX "SyllabusCourse_year_semester_name_idx";

-- AlterTable
ALTER TABLE "CourseKarte" ADD COLUMN     "university" TEXT NOT NULL DEFAULT 'miyazaki-u';

-- AlterTable
ALTER TABLE "SyllabusChange" ADD COLUMN     "university" TEXT NOT NULL DEFAULT 'miyazaki-u';

-- AlterTable
ALTER TABLE "SyllabusCourse" ADD COLUMN     "university" TEXT NOT NULL DEFAULT 'miyazaki-u';

-- CreateIndex
CREATE INDEX "SyllabusChange_university_year_semester_idx" ON "SyllabusChange"("university", "year", "semester");

-- CreateIndex
CREATE INDEX "SyllabusCourse_university_year_semester_name_idx" ON "SyllabusCourse"("university", "year", "semester", "name");

-- CreateIndex
CREATE INDEX "SyllabusCourse_university_year_semester_code_idx" ON "SyllabusCourse"("university", "year", "semester", "code");
