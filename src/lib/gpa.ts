import type { Course, Grade } from "@/lib/db";

// 一般的な国内大学のGPA換算（秀=4.0〜不可=0）
export const GRADE_POINTS: Record<Grade, number> = {
  秀: 4,
  優: 3,
  良: 2,
  可: 1,
  不可: 0,
};

export interface GpaResult {
  gpa: number | null; // 対象科目がなければ null
  creditsCounted: number; // GPA計算に使われた単位数の合計
  gradedCourseCount: number; // 成績が入力済みの科目数
}

/**
 * 成績（grade）と単位数（credits）の両方が入力されている科目のみを対象にGPAを算出する。
 * 履修中・成績未入力・単位数未入力の科目は対象外。
 */
export function computeGpa(courses: Course[]): GpaResult {
  const graded = courses.filter(
    (c): c is Course & { grade: Grade; credits: number } =>
      !!c.grade && typeof c.credits === "number" && c.credits > 0
  );
  if (graded.length === 0) {
    return { gpa: null, creditsCounted: 0, gradedCourseCount: 0 };
  }
  const totalCredits = graded.reduce((sum, c) => sum + c.credits, 0);
  const totalPoints = graded.reduce((sum, c) => sum + c.credits * GRADE_POINTS[c.grade], 0);
  return {
    gpa: totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : null,
    creditsCounted: totalCredits,
    gradedCourseCount: graded.length,
  };
}
