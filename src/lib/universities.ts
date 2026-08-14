export interface University {
  id: string;
  name: string;
}

// 新しい大学を追加する場合はここに1件追加するだけでよい（DBスキーマ変更は不要）
export const UNIVERSITIES: University[] = [
  { id: "miyazaki-u", name: "宮崎大学" },
  { id: "miyazaki-municipal-u", name: "宮崎公立大学" },
  { id: "miyazaki-nursing-u", name: "宮崎県立看護大学" },
  { id: "other", name: "その他" },
];

export function universityName(id: string): string {
  return UNIVERSITIES.find((u) => u.id === id)?.name ?? id;
}
