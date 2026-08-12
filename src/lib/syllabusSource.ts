import * as cheerio from "cheerio";
import { slotFromRawPeriod } from "@/lib/periods";

/**
 * 宮崎大学の公開シラバス検索（ログイン不要、robots.txt でも Bingbot 以外は制限なし）から
 * 授業情報を取得するクライアント。
 *
 * 節度を保つための方針:
 * - 明示的なユーザー操作（検索・同期ボタン）でのみ呼び出す。定期実行やクローリングは行わない。
 * - 一覧ページの全件取得・検索は積極的に使うが、詳細ページ（/syllabus/detail）は
 *   ユーザーが時間割に授業を登録する瞬間に「その1件だけ」を都度取得する用途に限定する
 *   （履修上の注意欄から出席関連の記載を拾うため）。robots.txtはBingbotに対してのみ
 *   /syllabus/ 以下を禁止しており、低頻度・単発の個人利用は許容範囲と判断している。
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
  // シラバスは「１・２時限」のようにペア表記。アプリ内では1コマ=1スロット(1〜5)として扱うため、
  // 生の時限番号（１・２→1、３・４→3、７・８→7、９・１０→9）をスロット番号に変換する。
  const periodMatch = normalized.match(/(\d+)(?:・\d+)?時限/);
  return {
    weekday: weekdayMatch ?? null,
    period: periodMatch ? slotFromRawPeriod(Number(periodMatch[1])) : null,
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

const ATTENDANCE_KEYWORDS = ["欠席", "出席"];

/**
 * シラバス詳細ページの「履修上の注意」欄から、出席・欠席に関する記述だけを
 * 抜き出す。宮崎大学のシラバスには「欠席◯回まで」のような構造化された
 * 上限回数フィールドは存在しないため、数値としての自動反映はできない。
 * ユーザーが自分で欠席上限を設定する際の参考情報として提示する用途。
 */
export async function fetchAttendanceHint(
  year: number,
  code: string
): Promise<string | null> {
  const params = new URLSearchParams({ n: String(year), j: code, s: code });
  const res = await fetch(
    `https://syllabus.eden.miyazaki-u.ac.jp/syllabus/detail?${params.toString()}`,
    { headers: { "User-Agent": USER_AGENT } }
  );
  if (!res.ok) return null;

  const html = await res.text();
  const $ = cheerio.load(html);

  const sections: string[] = [];
  $(".card-header.panel-header-syllabus").each((_, el) => {
    const heading = $(el).text().trim();
    if (heading === "履修上の注意" || heading === "成績評価方法") {
      const body = $(el).parent().find(".card-body").text();
      sections.push(body);
    }
  });

  const combined = sections.join("\n");
  const sentences = combined
    .split(/(?<=。)/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const hits = sentences.filter((s) => ATTENDANCE_KEYWORDS.some((k) => s.includes(k)));
  if (hits.length === 0) return null;
  return hits.slice(0, 3).join(" ");
}
