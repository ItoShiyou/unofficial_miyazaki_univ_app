import { fetchFullSyllabusCatalogUnipa, type UnipaConfig } from "@/lib/syllabusSourceUnipa";
import type { RawSyllabusRow } from "@/lib/syllabusSource";

// 九州医療科学大学のUNIVERSAL PASSPORT RX（ゲストログイン版シラバス照会）設定。
// この大学は学科組織を無指定（空欄）のままだと0件になるため、
// トップレベル組織コード "4"（大学）を指定する必要がある（短大等は対象外）。
const CONFIG: UnipaConfig = {
  origin: "https://unipa.jei.ac.jp",
  guestFuncCode: "Kmh006",
  departmentCode: "4",
  toggleField: "funcForm:j_idt180",
  toggleValue: "0",
};

export async function fetchFullSyllabusCatalogKyushuIryo(
  year: number,
  semester: "前期" | "後期"
): Promise<RawSyllabusRow[]> {
  return fetchFullSyllabusCatalogUnipa(CONFIG, year, semester);
}
