import * as cheerio from "cheerio";
import { slotFromRawPeriod } from "@/lib/periods";
import type { RawSyllabusRow } from "@/lib/syllabusSource";

/**
 * "UNIVERSAL PASSPORT RX"（日本システム技術製の学務システム。JSF/PrimeFacesベース）が
 * 提供する「一般の方向けシラバス照会（ゲストログイン）」から授業情報を取得する共通クライアント。
 *
 * 南九州大学・九州医療科学大学など、このシステムを採用している大学はURLのホスト名が
 * 異なるだけでコンポーネント構成（funcForm等のID体系）が共通のため、大学ごとの差異は
 * host・学科組織の初期値・キャンパス名の正規化表だけに閉じ込めている。
 *
 * ログインの流れ:
 * 1. GET .../pk/pky001/Pky00101.xhtml?guestlogin=Kmh006 でゲストセッションのCookieを得る
 * 2. POST 同URLへ loginForm:autoLogin を送信すると、ゲスト用のシラバス照会フォーム
 *    （funcForm、実体はKmh00601.xhtml）がそのまま返る
 * 3. funcForm:search を送信して検索、以降 funcForm:table のページング用postbackで全件取得
 *
 * PrimeFacesの部分レスポンス（<partial-response>）はCDATA内にHTML断片が複数含まれる形式のため、
 * XMLとしてではなく正規表現でCDATAを抜き出して連結し、cheerioでHTMLとして解析する。
 * ViewStateとrx-token/rx-loginKeyは各レスポンスのたびに更新されるため、次のリクエストの前に
 * 必ず抽出し直す。
 *
 * 節度を保つための方針は @/lib/syllabusSource と同様（低頻度・単発、UA明示、間隔を空ける）。
 * ここはゲスト向けに公式に開放された機能であり、ログイン情報の入力は一切行わない。
 */

const USER_AGENT =
  "MiyadaiFukoushikiApp/1.0 (+personal student project; low-frequency, manually-triggered syllabus sync)";
const REQUEST_DELAY_MS = 500;
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // 100件×20ページ=2,000件分の余裕を見た上限

export interface UnipaConfig {
  origin: string; // 例: "https://upsv.nankyudai.ac.jp"
  guestFuncCode: string; // 例: "Kmh006"
  // 学科組織（cgksSearchType0）の初期値。空文字で全件検索できる大学と、
  // トップレベルの組織コードを明示しないと0件になる大学があるため大学ごとに指定する。
  departmentCode: string;
  // 「英語で表示」トグルボタンの隠しフィールド名と値。JSFの自動採番コンポーネントIDのため
  // 大学（＝画面構成）ごとに異なる（例: "funcForm:j_idt174_input"→"on" or "funcForm:j_idt180"→"0"）。
  // 実際のブラウザでの検索リクエストをキャプチャして値を確認すること。
  toggleField: string;
  toggleValue: string;
}

const SEMESTER_CODE: Record<"前期" | "後期", string> = { 前期: "01", 後期: "02" };
type WeekdayKanji = "月" | "火" | "水" | "木" | "金" | "土" | "日";

interface RxState {
  cookieJar: Map<string, string>;
  viewState: string;
  rxToken: string;
  rxLoginKey: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSetCookies(res: Response, jar: Map<string, string>) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function extractCdataHtml(xml: string): string {
  const parts: string[] = [];
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) parts.push(m[1]);
  return parts.join("\n");
}

function updateStateFromHtml(html: string, state: RxState) {
  const vs = /javax\.faces\.ViewState[^>]*value="([^"]*)"/.exec(html);
  if (vs) state.viewState = vs[1];
  const token = /rx-token"\s*value="([^"]*)"/.exec(html);
  if (token) state.rxToken = token[1];
  const key = /rx-loginKey"\s*value="([^"]*)"/.exec(html);
  if (key) state.rxLoginKey = key[1];
}

async function establishGuestSession(config: UnipaConfig): Promise<RxState> {
  const jar = new Map<string, string>();
  const entryUrl = `${config.origin}/uprx/up/pk/pky001/Pky00101.xhtml?guestlogin=${config.guestFuncCode}`;

  const initialRes = await fetch(entryUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!initialRes.ok) throw new Error(`unipa guest entry failed: ${initialRes.status}`);
  parseSetCookies(initialRes, jar);

  const loginUrl = `${config.origin}/uprx/up/pk/pky001/Pky00101.xhtml`;
  const loginRes = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({
      loginForm: "loginForm",
      "loginForm:autoLogin": "loginForm:autoLogin",
      "javax.faces.ViewState": "stateless",
    }).toString(),
  });
  if (!loginRes.ok) throw new Error(`unipa guest auto-login failed: ${loginRes.status}`);
  parseSetCookies(loginRes, jar);
  const html = await loginRes.text();

  const state: RxState = { cookieJar: jar, viewState: "", rxToken: "", rxLoginKey: "" };
  updateStateFromHtml(html, state);
  if (!state.rxToken || !html.includes("funcForm:search")) {
    throw new Error("unipa guest auto-login did not return the syllabus search form");
  }
  return state;
}

function baseSearchFields(config: UnipaConfig, year: number, semester: "前期" | "後期") {
  return {
    [config.toggleField]: config.toggleValue,
    "funcForm:nendo": "",
    "funcForm:nyugakuGakkiSearchType0_focus": "",
    "funcForm:nyugakuGakkiSearchType0_input": "",
    "funcForm:cgksSearchType0_focus": "",
    "funcForm:cgksSearchType0_input": config.departmentCode,
    "funcForm:kmkbnr_focus": "",
    "funcForm:kmkbnr_input": "",
    "funcForm:jbushoCd_focus": "",
    "funcForm:jbushoCd_input": "",
    "funcForm:kaikoNendo_input": String(year),
    "funcForm:kaikoGakki_focus": "",
    "funcForm:kaikoGakki_input": SEMESTER_CODE[semester],
    "funcForm:jugyoKamoku": "",
    "funcForm:tantoKyoin": "",
    "funcForm:campus_focus": "",
    "funcForm:campus_input": "",
    "funcForm:jugyoSbt_focus": "",
    "funcForm:jugyoSbt_input": "",
    "funcForm:kamokuNumbering": "",
    "funcForm:keyword": "",
  };
}

async function postAjax(
  config: UnipaConfig,
  state: RxState,
  fields: Record<string, string>
): Promise<string> {
  const body = new URLSearchParams({
    ...fields,
    funcForm: "funcForm",
    "rx-token": state.rxToken,
    "rx-loginKey": state.rxLoginKey,
    "rx-deviceKbn": "1",
    "rx-loginType": "Gakuen",
    "javax.faces.ViewState": state.viewState,
  });
  const searchUrl = `${config.origin}/uprx/up/km/${config.guestFuncCode.toLowerCase()}/${config.guestFuncCode}01.xhtml`;
  const res = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      "Faces-Request": "partial/ajax",
      Cookie: cookieHeader(state.cookieJar),
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`unipa syllabus search failed: ${res.status}`);
  parseSetCookies(res, state.cookieJar);
  const xml = await res.text();
  const html = extractCdataHtml(xml);
  updateStateFromHtml(html, state);
  return html;
}

function parseScheduleCell(text: string): {
  weekday: WeekdayKanji | null;
  period: number | null;
} {
  const normalized = text.trim();
  const m = /^([月火水木金土日])(\d+)/.exec(normalized);
  if (!m) return { weekday: null, period: null };
  const raw = Number(m[2]);
  const period = raw >= 1 && raw <= 5 ? raw : slotFromRawPeriod(raw);
  return { weekday: m[1] as WeekdayKanji, period };
}

function parseRows(html: string): RawSyllabusRow[] {
  // ページング後のpartial-responseは<tr>が<table>/<tbody>で囲まれずに断片として
  // 送られてくるため、HTML5パーサに孤立<tr>として捨てられないよう<table><tbody>で包む。
  // 1ページ目（検索直後）はもともと<table>を含むが、二重に包んでも
  // tr[data-ri]の探索には影響しない。
  const $ = cheerio.load(`<table><tbody>${html}</tbody></table>`);
  const rows: RawSyllabusRow[] = [];

  $("tr[data-ri]").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 3) return;
    const scheduleText = $(cells[0]).text().trim();
    const nameCell = $(cells[1]).text().trim();
    const teacher = $(cells[2]).text().trim() || null;
    if (!nameCell) return;

    const nameMatch = /^(\S+)\s+(.+)$/.exec(nameCell);
    const code = nameMatch ? nameMatch[1] : nameCell;
    const name = nameMatch ? nameMatch[2] : nameCell;
    const { weekday, period } = parseScheduleCell(scheduleText);

    rows.push({ code, name, teacher, weekday, period, division: null });
  });

  return rows;
}

export async function fetchFullSyllabusCatalogUnipa(
  config: UnipaConfig,
  year: number,
  semester: "前期" | "後期"
): Promise<RawSyllabusRow[]> {
  const state = await establishGuestSession(config);
  const fields = baseSearchFields(config, year, semester);

  const searchHtml = await postAjax(config, state, {
    "javax.faces.partial.ajax": "true",
    "javax.faces.source": "funcForm:search",
    "javax.faces.partial.execute": "@all",
    "javax.faces.partial.render": "funcForm",
    "funcForm:search": "funcForm:search",
    ...fields,
  });

  const all = parseRows(searchHtml);
  if (all.length < PAGE_SIZE) return all; // 1ページ目で全件取得済み

  await sleep(REQUEST_DELAY_MS);

  // ページごとの件数がPAGE_SIZE未満になった時点で最終ページと判断する
  // （合計件数はページャのテキストから信頼して抽出できる保証がないため使わない）。
  for (let page = 1; page < MAX_PAGES; page++) {
    const html = await postAjax(config, state, {
      "javax.faces.partial.ajax": "true",
      "javax.faces.source": "funcForm:table",
      "javax.faces.partial.execute": "funcForm:table",
      "javax.faces.partial.render": "funcForm:table",
      "javax.faces.behavior.event": "page",
      "javax.faces.partial.event": "page",
      "funcForm:table_pagination": "true",
      "funcForm:table_first": String(page * PAGE_SIZE),
      "funcForm:table_rows": String(PAGE_SIZE),
      "funcForm:table_encodeFeature": "true",
      ...fields,
    });
    const rows = parseRows(html);
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    await sleep(REQUEST_DELAY_MS);
  }

  return all;
}
