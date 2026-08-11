import * as cheerio from "cheerio";

/**
 * 宮崎大学の公開シラバス検索（ログイン不要、robots.txt でも Bingbot 以外は制限なし）から
 * 授業情報を取得するクライアント。
 *
 * 節度を保つための方針:
 * - 明示的なユーザー操作（検索・同期ボタン）でのみ呼び出す。定期実行やクローリングは行わない。
 * - 詳細ページ（/syllabus/detail, robots.txt が Bingbot に対して明示的に禁止している経路）は取得しない。
 *   一覧ページの情報（講義名・担当教員・開講日）だけで用が足りるため。
 * - 素性を隠さない User-Agent を送る。
 * - 複数ページ取得時は必ず間隔を空ける。
 */

const BASE_URL = "https://syllabus.eden.miyazaki-u.ac.jp/syllabus";
const USER_AGENT =
  "MiyadaiFukoushikiApp/1.0 (+personal student project; low-frequency syllabus lookup)";
const REQUEST_DELAY_MS = 400;
const MAX_PAGES = 5;

const SEMESTER_CODE: Record<string, string> = {
  前期: "1",
  後期: "2",
};

const WEEKDAY_KANJI = ["月", "火", "水", "木", "金", "土", "日"] as const;
type WeekdayKanji = (typeof WEEKDAY_KANJI)[number];

export interface RawSyllabusRow {
  code: string;
  name: string;
  teacher: string | null;
  weekday: WeekdayKanji | null;
  period: number | null;
  division: string | null;
}

function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
}

function parseSchedule(text: string): { weekday: WeekdayKanji | null; period: number | null } {
  const normalized = toHalfWidthDigits(text.trim());
  const weekdayMatch = WEEKDAY_KANJI.find((w) => normalized.includes(w));
  const periodMatch = normalized.match(/(\d+)(?:・\d+)?時限/);
  return {
    weekday: weekdayMatch ?? null,
    period: periodMatch ? Number(periodMatch[1]) : null,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(
  year: number,
  semester: "前期" | "後期",
  query: string,
  page: number
): Promise<{ rows: RawSyllabusRow[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    kaiko_nendo: String(year),
    kikan_code: SEMESTER_CODE[semester] ?? "",
    jyugyou_kamoku_name: query,
    searchSubmit: "1",
  });
  if (page > 1) params.set("page", String(page));

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`syllabus fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const rows: RawSyllabusRow[] = [];
  $("table.table-bordered tbody tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length < 8) return;
    const code = $(cells[2]).text().trim();
    const name = $(cells[3]).text().trim();
    const teacher = $(cells[4]).text().trim() || null;
    const scheduleText = $(cells[6]).text().trim();
    const division = $(cells[7]).text().trim() || null;
    if (!code || !name) return;
    const { weekday, period } = parseSchedule(scheduleText);
    rows.push({ code, name, teacher, weekday, period, division });
  });

  const pagingText = $(".dataTables_info").first().text();
  const hasMore = /(\d+)\s*～\s*(\d+)\s*件表示\s*\/\s*(\d+)\s*件中/
    .exec(toHalfWidthDigits(pagingText))
    ? (() => {
        const m = /(\d+)\s*～\s*(\d+)\s*件表示\s*\/\s*(\d+)\s*件中/.exec(
          toHalfWidthDigits(pagingText)
        )!;
        return Number(m[2]) < Number(m[3]);
      })()
    : false;

  return { rows, hasMore };
}

export async function searchLiveSyllabus(
  year: number,
  semester: "前期" | "後期",
  query: string
): Promise<RawSyllabusRow[]> {
  if (!query.trim()) return [];

  const all: RawSyllabusRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { rows, hasMore } = await fetchPage(year, semester, query.trim(), page);
    all.push(...rows);
    if (!hasMore) break;
    await sleep(REQUEST_DELAY_MS);
  }
  return all;
}
