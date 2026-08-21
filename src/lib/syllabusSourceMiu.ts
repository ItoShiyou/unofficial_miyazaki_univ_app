import * as cheerio from "cheerio";
import type { RawSyllabusRow } from "@/lib/syllabusSource";

/**
 * 宮崎国際大学 国際教養学部の公開シラバス一覧（ログイン不要。robots.txtが存在せず、
 * クロール制限の明示はない）から授業情報を取得するクライアント。
 *
 * このページは検索フォームを持たず、年度ごとに全授業がstatic HTMLの表として
 * 1ページに列挙されている（ページングなし＝1回のGETで完結）。曜日・時限・担当教員は
 * このページに存在しないため常にnullとし、開講期（前期/後期）は「配当年次」欄の
 * 末尾についたS（Spring=前期）/F（Fall=後期）表記から判定する（両方含む場合は通年扱いで
 * 両学期に含める）。教育学部（www.miu.ac.jp/course/education/syllabus/）は表構造が
 * 大きく異なる（学年×開講時期のマトリクス表）ため今回は対象外。
 *
 * 節度を保つための方針は @/lib/syllabusSource と同様（低頻度・単発、UA明示）。
 * このページは1年度ぶんが1リクエストで完結するため、間隔調整は不要。
 */

const USER_AGENT =
  "MiyadaiFukoushikiApp/1.0 (+personal student project; low-frequency, manually-triggered syllabus sync)";

function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

function jpNameFromCell(html: string): string {
  const parts = html
    .split(/<br\s*\/?>/i)
    .map((p) => p.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? parts[0] ?? "";
}

function includesSemester(gradeCell: string, semester: "前期" | "後期"): boolean {
  const normalized = toHalfWidthDigits(gradeCell);
  const hasS = /S/.test(normalized);
  const hasF = /F/.test(normalized);
  if (!hasS && !hasF) return true; // 表記なし＝通年扱いで両学期に含める
  return semester === "前期" ? hasS : hasF;
}

export async function fetchFullSyllabusCatalogMiu(
  year: number,
  semester: "前期" | "後期"
): Promise<RawSyllabusRow[]> {
  const url = `https://syllabus.miu.ac.jp/?year=${year}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    if (res.status === 404) return []; // 未公開年度
    throw new Error(`miu syllabus fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const rows: RawSyllabusRow[] = [];
  let currentDivision: string | null = null;

  $(".container .row .col").children().each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    if (tag === "h1" || tag === "h2") {
      const text = $(el).text().trim();
      if (text) currentDivision = text;
      return;
    }
    if (tag !== "table") return;

    $(el)
      .find("tbody tr")
      .each((_, tr) => {
        const cells = $(tr).find("td");
        if (cells.length < 3) return;
        const name = jpNameFromCell($(cells[0]).html() ?? "");
        const code = $(cells[1]).text().trim();
        const gradeCell = $(cells[2]).text().trim();
        if (!code || !name) return;
        if (!includesSemester(gradeCell, semester)) return;

        rows.push({
          code,
          name,
          teacher: null,
          weekday: null,
          period: null,
          division: currentDivision,
        });
      });
  });

  return rows;
}
