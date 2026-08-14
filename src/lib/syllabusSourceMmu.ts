import * as cheerio from "cheerio";
import type { RawSyllabusRow } from "@/lib/syllabusSource";

/**
 * 宮崎公立大学の公開シラバス検索（ログイン不要。robots.txtは当該システムに存在せず、
 * クロール制限の明示はない）から授業情報を取得するクライアント。
 *
 * 宮崎大学のシラバスと異なり、この学務システム（富士通製パッケージ）は
 * JSESSIONIDベースのセッション上で「検索」→「表示件数を500件に変更」という
 * 2段階のPOSTを踏む必要がある（ブラウザのフォーム送信を再現している）。
 * 詳細ページ（出席関連情報等）へのアクセスは今回未実装。まずは一覧の基本情報のみ取得する。
 *
 * 節度を保つための方針は @/lib/syllabusSource と同様（低頻度・単発、UA明示、間隔を空ける）。
 */

const BASE = "https://mmuportal.miyazaki-mu.ac.jp/campusweb";
const USER_AGENT =
  "MiyadaiFukoushikiApp/1.0 (+personal student project; low-frequency, manually-triggered syllabus sync)";
const REQUEST_DELAY_MS = 500;
const PAGE_SIZE = 500;
const MAX_PAGES = 10; // 500件×10ページ=5,000件分の余裕を見た上限

const CAMPUS_CD = "10"; // 船塚キャンパス（現状これ一つのみ）
const KAIKO_CD: Record<"前期" | "後期", string> = { 前期: "2", 後期: "3" };

const WEEKDAY_KANJI = ["月", "火", "水", "木", "金", "土", "日"] as const;
type WeekdayKanji = (typeof WEEKDAY_KANJI)[number];

function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

function parseSchedule(text: string): { weekday: WeekdayKanji | null; period: number | null } {
  // 例: "前期　金曜日　５時限 前期　集中講義　１時限" のように複数開講形態が
  // 連結される場合があるため、最初に見つかった「◯曜日◯時限」パターンだけを採用する。
  // 集中講義など曜日を持たない開講形態しかない場合は null のままにする。
  //
  // 宮崎大学と異なり、宮崎公立大学は「１・２時限」のようなペア表記ではなく
  // 1〜5限が単独の実時限（1限8:50-10:20〜5限16:20-17:50）として運用されているため、
  // slotFromRawPeriodによるペア変換（rawを2で割る）は行わず、そのままの番号を使う。
  const normalized = toHalfWidthDigits(text);
  const m = /(月|火|水|木|金|土|日)曜日[^\d]{0,6}?(\d+)時限/.exec(normalized);
  if (!m) return { weekday: null, period: null };
  const period = Number(m[2]);
  return { weekday: m[1] as WeekdayKanji, period: period >= 1 && period <= 5 ? period : null };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface MmuSession {
  actionUrl: string; // ";jsessionid=..." を含む絶対URL
  cookie: string;
}

async function establishSession(): Promise<MmuSession> {
  const res = await fetch(`${BASE}/slbsskgr.do`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`mmu syllabus init failed: ${res.status}`);

  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookieMatch = /JSESSIONID=([^;]+)/.exec(setCookie);
  const html = await res.text();
  const $ = cheerio.load(html);
  const action = $("form[name='sylbsActionForm']").attr("action") ?? $("form").first().attr("action");
  if (!action || !cookieMatch) {
    throw new Error("mmu syllabus: failed to establish session");
  }

  return {
    actionUrl: action.startsWith("http") ? action : `${BASE.replace(/\/campusweb$/, "")}${action}`,
    cookie: `JSESSIONID=${cookieMatch[1]}`,
  };
}

async function postForm(session: MmuSession, fields: Record<string, string>): Promise<string> {
  const res = await fetch(session.actionUrl, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: session.cookie,
    },
    body: new URLSearchParams(fields).toString(),
  });
  if (!res.ok) throw new Error(`mmu syllabus post failed: ${res.status}`);
  return res.text();
}

function parseRows($: cheerio.CheerioAPI): RawSyllabusRow[] {
  const rows: RawSyllabusRow[] = [];
  // 検索結果テーブルは class="list" の2番目（1番目はページング用、3番目は下部の表示件数UI）。
  // ヘッダー行やページング行が紛れ込むことがあるため、位置ではなく「No列が数値か」で
  // データ行かどうかを判定する。
  const table = $("table.list").eq(1);
  table.find("tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length < 5) return;
    const no = $(cells[0]).text().trim();
    if (!/^\d+$/.test(no)) return;
    const code = $(cells[1]).text().trim();
    const name = $(cells[2]).text().trim();
    const scheduleText = $(cells[3]).text();
    const teacher = $(cells[4]).text().trim() || null;
    if (!code || !name) return;
    const { weekday, period } = parseSchedule(scheduleText);
    rows.push({ code, name, teacher, weekday, period, division: null });
  });
  return rows;
}

function parsePagingInfo(html: string): { shown: number; total: number } {
  const $ = cheerio.load(html);
  const text = toHalfWidthDigits($("*:contains('件表示')").last().text());
  const m = /([\d,]+)-([\d,]+)件表示\/([\d,]+)件中/.exec(text);
  if (!m) return { shown: 0, total: 0 };
  return { shown: Number(m[2].replace(/,/g, "")), total: Number(m[3].replace(/,/g, "")) };
}

/**
 * 指定した学期の授業を全件取得する（宮崎公立大学）。
 * 学期の切り替わりなど、明示的な「同期」操作からのみ呼び出すこと。
 */
export async function fetchFullSyllabusCatalogMmu(
  year: number,
  semester: "前期" | "後期",
  onProgress?: (fetched: number, page: number) => void
): Promise<RawSyllabusRow[]> {
  const session = await establishSession();

  const searchHtml = await postForm(session, {
    "value(methodname)": "sylkougi_search",
    buttonName: "searchKougi",
    "value(nendo)": String(year),
    "value(campuscd)": CAMPUS_CD,
    "value(crclm)": "",
    tagakb: "off",
    "value(bunya)": "",
    "value(grade)": "",
    "value(kouginm)": "",
    "value(syokunm)": "",
    "value(kaikoCd)": KAIKO_CD[semester],
  });

  const all: RawSyllabusRow[] = [];
  const firstPageRows = parseRows(cheerio.load(searchHtml));
  const { total } = parsePagingInfo(searchHtml);
  if (total === 0) return [];

  await sleep(REQUEST_DELAY_MS);

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await postForm(session, {
      "value(methodname)": "sylkougi_search",
      navigateKougiList: "dummy",
      "value(pageCount)": page === 1 ? "" : String(page),
      "value(maxCount)": String(PAGE_SIZE),
      maxDispListCount: String(PAGE_SIZE),
    });
    const $ = cheerio.load(html);
    const rows = parseRows($);
    all.push(...rows);
    onProgress?.(all.length, page);

    const { shown, total: currentTotal } = parsePagingInfo(html);
    if (shown >= currentTotal || rows.length === 0) break;
    await sleep(REQUEST_DELAY_MS);
  }

  // ページング情報の取得に失敗した場合は最初の検索結果ページだけでも返す
  if (all.length === 0 && firstPageRows.length > 0) return firstPageRows;
  return all;
}
