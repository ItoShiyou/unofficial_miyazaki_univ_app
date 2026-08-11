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
  "MiyadaiFukoushikiApp/1.0 (+personal student project; low-frequency, manually-triggered syllabus sync)";
const REQUEST_DELAY_MS = 500;
const MAX_PAGES_SEARCH = 5;
// 全件同期は1学期あたり1,000件強・100件/ページ想定。学部増設等の余裕をみて上限を設定。
const MAX_PAGES_FULL_SYNC = 30;

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
  query: string | null,
  page: number
): Promise<{ rows: RawSyllabusRow[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    kaiko_nendo: String(year),
    kikan_code: SEMESTER_CODE[semester] ?? "",
    searchSubmit: "1",
  });
  if (query) params.set("jyugyou_kamoku_name", query);
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

  const pagingText = toHalfWidthDigits($(".dataTables_info").first().text());
  const pagingMatch = /([\d,]+)\s*～\s*([\d,]+)\s*件表示\s*\/\s*([\d,]+)\s*件中/.exec(pagingText);
  const hasMore = pagingMatch
    ? Number(pagingMatch[2].replace(/,/g, "")) < Number(pagingMatch[3].replace(/,/g, ""))
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
  for (let page = 1; page <= MAX_PAGES_SEARCH; page++) {
    const { rows, hasMore } = await fetchPage(year, semester, query.trim(), page);
    all.push(...rows);
    if (!hasMore) break;
    await sleep(REQUEST_DELAY_MS);
  }
  return all;
}

/**
 * 指定した学期の授業を全件取得する（検索語なし＝全学部・全学科が対象）。
 * 1学期あたり1,000件強、100件/ページ想定で10〜15リクエスト程度になる。
 * 学期の切り替わりなど、明示的な「同期」操作からのみ呼び出すこと。
 */
export async function fetchFullSyllabusCatalog(
  year: number,
  semester: "前期" | "後期",
  onProgress?: (fetched: number, page: number) => void
): Promise<RawSyllabusRow[]> {
  const all: RawSyllabusRow[] = [];
  for (let page = 1; page <= MAX_PAGES_FULL_SYNC; page++) {
    const { rows, hasMore } = await fetchPage(year, semester, null, page);
    all.push(...rows);
    onProgress?.(all.length, page);
    if (!hasMore) break;
    await sleep(REQUEST_DELAY_MS);
  }
  return all;
}
