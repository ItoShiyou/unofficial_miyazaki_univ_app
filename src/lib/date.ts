export function todayLocalDate(): string {
  return formatLocalDate(new Date());
}

// サーバー側（Vercel等）は実行環境のタイムゾーンがUTCであることが多く、
// new Date()の年月日をそのまま使うと日本時間の深夜0時〜9時台に日付が
// 1日ずれてしまう。「今日休講速報」等、サーバー側で「今日」を判定する
// 機能のために、常に日本時間基準で日付文字列を返す。
export function todayJstDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export function addDaysLocalDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
