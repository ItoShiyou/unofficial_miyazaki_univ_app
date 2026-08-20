export interface University {
  id: string;
  name: string;
  // 公開シラバスからの自動取得（@/lib/syllabusSync の CATALOG_FETCHERS）に対応しているか。
  // false の大学は、シラバス検索・授業カルテのシラバス連携・変更検知が使えず、
  // 時間割は手動入力のみになる。UI側で「未対応」であることを分かりやすく伝えるために使う。
  syllabusSyncSupported: boolean;
}

// 新しい大学を追加する場合はここに1件追加するだけでよい（DBスキーマ変更は不要）。
// シラバス自動取得にも対応させる場合は、別途 syllabusSourceXxx.ts を実装し
// @/lib/syllabusSync の CATALOG_FETCHERS に登録した上で、ここも true にする。
export const UNIVERSITIES: University[] = [
  { id: "miyazaki-u", name: "宮崎大学", syllabusSyncSupported: true },
  { id: "miyazaki-municipal-u", name: "宮崎公立大学", syllabusSyncSupported: true },
  { id: "miyazaki-nursing-u", name: "宮崎県立看護大学", syllabusSyncSupported: false },
  { id: "other", name: "その他", syllabusSyncSupported: false },
];

export function universityName(id: string): string {
  return UNIVERSITIES.find((u) => u.id === id)?.name ?? id;
}

export function universitySupportsSyllabusSync(id: string): boolean {
  return UNIVERSITIES.find((u) => u.id === id)?.syllabusSyncSupported ?? false;
}
