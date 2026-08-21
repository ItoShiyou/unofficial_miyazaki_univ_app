import { fetchFullSyllabusCatalogUnipa, type UnipaConfig } from "@/lib/syllabusSourceUnipa";
import type { RawSyllabusRow } from "@/lib/syllabusSource";

// 南九州大学のUNIVERSAL PASSPORT RX（ゲストログイン版シラバス照会）設定。
// 学科組織は空欄のまま検索しても全件（南九大・南九大大学院・南九短大等）取得できる。
const CONFIG: UnipaConfig = {
  origin: "https://upsv.nankyudai.ac.jp",
  guestFuncCode: "Kmh006",
  departmentCode: "",
  toggleField: "funcForm:j_idt174_input",
  toggleValue: "on",
};

export async function fetchFullSyllabusCatalogNankyudai(
  year: number,
  semester: "前期" | "後期"
): Promise<RawSyllabusRow[]> {
  return fetchFullSyllabusCatalogUnipa(CONFIG, year, semester);
}
