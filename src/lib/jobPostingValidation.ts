/**
 * 求人掲示板が「募集情報等提供」（Wantedly等と同じ位置づけ、職業紹介事業の許可不要）
 * の範囲にとどまるための、給与等の金額を断定的に記載しないという運用方針を、
 * schema.prismaのコメントだけに頼らず実際にAPI側でも弾くための検証。
 * 実データレビュー（docs/pivot_story.md 9-1節）で、この方針をコメントのみに
 * 頼っていた点は不十分だと判明したため追加した。
 */
const SALARY_PATTERN = /(¥\s*\d|(?:年収|月収|時給|日給|給与)\s*\d|\d[\d,]*\s*万円|\d[\d,]*\s*円)/;

export function containsSalaryFigure(text: string): boolean {
  return SALARY_PATTERN.test(text);
}
