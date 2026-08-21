import * as cheerio from "cheerio";
import type { RawSyllabusRow } from "@/lib/syllabusSource";

/**
 * 宮崎県立看護大学の公開シラバス検索（Active Academy Advance。ログイン不要、
 * robots.txtは存在せずクロール制限の明示はない）から授業情報を取得するクライアント。
 *
 * ASP.NET WebForms（ViewState方式）のポストバックで動作し、宮崎公立大学
 * （@/lib/syllabusSourceMmu）と似た「検索→ページング」の2段階操作が必要。
 * ただしセッションCookieには依存せず、各レスポンスに含まれる__VIEWSTATE等の
 * hidden fieldを次のリクエストに引き継ぐだけで完結する（JSESSIONID等は不要）。
 *
 * このシステムの一覧・詳細のどちらにも曜日・時限の情報は存在しない（別システムの
 * 時間割・履修登録側にのみ存在すると見られる）ため常にnullとする。また一覧には
 * 大学公式の講義コードが表示されず、詳細ページ（授業ごとに別リクエストが必要）に
 * しかないため、全件同期では取得しない。かわりに科目名を差分検知用のcodeとして使う
 * （this大学の規模ではおおむね一意）。
 *
 * 節度を保つための方針は @/lib/syllabusSource と同様（低頻度・単発、UA明示、間隔を空ける）。
 */

const ORIGIN = "https://kyoumu.mpu.ac.jp";
const INITIAL_PATH = "/aa_web/syllabus/se0010.aspx?me=EU&opi=mt0010";
const USER_AGENT =
  "MiyadaiFukoushikiApp/1.0 (+personal student project; low-frequency, manually-triggered syllabus sync)";
const REQUEST_DELAY_MS = 500;
const PAGE_SIZE = 20;
const MAX_PAGES = 30; // 20件×30ページ=600件分の余裕を見た上限

const SEMESTER_LABEL: Record<"前期" | "後期", string> = { 前期: "前期", 後期: "後期" };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FormState {
  actionUrl: string;
  fields: Record<string, string>;
}

function extractFormState(html: string, currentUrl: string): FormState {
  const $ = cheerio.load(html);
  const form = $("form#aspnetForm");
  const action = form.attr("action") ?? "";
  const actionUrl = new URL(action, currentUrl).toString();

  const fields: Record<string, string> = {};
  form.find("input[name]").each((_, el) => {
    const type = ($(el).attr("type") ?? "text").toLowerCase();
    if (type === "submit" || type === "image" || type === "button") return;
    if ((type === "checkbox" || type === "radio") && $(el).attr("checked") === undefined) return;
    fields[$(el).attr("name")!] = $(el).attr("value") ?? "";
  });
  form.find("select[name]").each((_, el) => {
    const selected = $(el).find("option[selected]").first();
    fields[$(el).attr("name")!] = selected.attr("value") ?? $(el).find("option").first().attr("value") ?? "";
  });

  return { actionUrl, fields };
}

async function postForm(state: FormState, overrides: Record<string, string>): Promise<string> {
  const body = new URLSearchParams({ ...state.fields, ...overrides });
  const res = await fetch(state.actionUrl, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`mpu syllabus post failed: ${res.status}`);
  return res.text();
}

function parseRawRows($: cheerio.CheerioAPI): Array<{ term: string; row: RawSyllabusRow }> {
  const rows: Array<{ term: string; row: RawSyllabusRow }> = [];
  const table = $("#ctl00_cphMain_grdSyllabusList");
  table.find("tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 6) return;
    const name = $(cells[0]).text().trim();
    const term = $(cells[1]).text().trim();
    const teacherRaw = $(cells[5]).text().trim();
    if (!name || !term) return;

    const teacher = teacherRaw.replace(/^◎/, "").trim() || null;
    rows.push({
      term,
      row: { code: name, name, teacher, weekday: null, period: null, division: null },
    });
  });
  return rows;
}

/**
 * 指定した学期の授業を全件取得する（宮崎県立看護大学）。
 * 学期の切り替わりなど、明示的な「同期」操作からのみ呼び出すこと。
 */
export async function fetchFullSyllabusCatalogMpu(
  year: number,
  semester: "前期" | "後期"
): Promise<RawSyllabusRow[]> {
  const initialUrl = `${ORIGIN}${INITIAL_PATH}`;
  const initialRes = await fetch(initialUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!initialRes.ok) throw new Error(`mpu syllabus init failed: ${initialRes.status}`);
  const initialState = extractFormState(await initialRes.text(), initialUrl);

  const searchHtml = await postForm(initialState, {
    "ctl00$cphMain$cmbNendo": String(year),
    "ctl00$cphMain$cmbSchGakubu": "",
    "ctl00$cphMain$txtKamokuName": "",
    "ctl00$cphMain$txtKyoinName": "",
    "ctl00$cphMain$ibtnSearch.x": "1",
    "ctl00$cphMain$ibtnSearch.y": "1",
  });

  let state = extractFormState(searchHtml, initialState.actionUrl);
  const all: RawSyllabusRow[] = [];
  const label = SEMESTER_LABEL[semester];

  let rawRows = parseRawRows(cheerio.load(searchHtml));
  if (rawRows.length === 0) return [];
  all.push(...rawRows.filter((r) => r.term.includes(label)).map((r) => r.row));

  await sleep(REQUEST_DELAY_MS);

  for (let page = 2; page <= MAX_PAGES; page++) {
    const html = await postForm(state, {
      __EVENTTARGET: "ctl00$cphMain$grdSyllabusList",
      __EVENTARGUMENT: `Page$${page}`,
    });
    const $ = cheerio.load(html);
    rawRows = parseRawRows($);
    if (rawRows.length === 0) break;
    all.push(...rawRows.filter((r) => r.term.includes(label)).map((r) => r.row));
    state = extractFormState(html, state.actionUrl);

    if (rawRows.length < PAGE_SIZE) break;
    await sleep(REQUEST_DELAY_MS);
  }

  return all;
}
