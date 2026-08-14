/**
 * 授業時限（1〜5限）。時限の「番号」は全大学共通で1〜5スロットとして扱うが、
 * 各時限が実際に何時に始まるかは大学ごとに異なる。
 *
 * 宮崎大学は「１・２時限」のように2つの時限番号をペアにした90分授業が基本のため、
 * アプリ内では1コマ=1スロットとして 1〜5 で管理している（syllabusSource.tsで変換）。
 * 一方、宮崎公立大学は1〜5限が単独の実時限として運用されており、変換は行っていない
 * （syllabusSourceMmu.ts）。時限「番号」の意味は大学ごとに違っても、アプリ内の
 * 1〜5という枠組みは共通なので、時刻ラベルだけを大学ごとに出し分ける。
 *
 * 参照:
 * - 宮崎大学: https://www.miyazaki-u.ac.jp/manabi-jim/educational-info/schedule/timetable/
 * - 宮崎公立大学: 大学公式サイトの授業関連ページより
 */
export const PERIODS = [1, 2, 3, 4, 5] as const;
export type Period = (typeof PERIODS)[number];

const DEFAULT_UNIVERSITY = "miyazaki-u";

// 大学ごとの時限→時刻テーブル。未対応の大学（時刻を未確認の大学）は
// 宮崎大学の時刻を暫定値として表示する（正確な時刻ではない可能性がある）。
export const UNIVERSITY_PERIOD_TIME: Record<string, Record<Period, string>> = {
  "miyazaki-u": {
    1: "8:40–10:10",
    2: "10:30–12:00",
    3: "13:00–14:30",
    4: "14:50–16:20",
    5: "16:40–18:10",
  },
  "miyazaki-municipal-u": {
    1: "8:50–10:20",
    2: "10:30–12:00",
    3: "13:00–14:30",
    4: "14:40–16:10",
    5: "16:20–17:50",
  },
};

export function periodTimeTable(university?: string): Record<Period, string> {
  return (
    UNIVERSITY_PERIOD_TIME[university ?? DEFAULT_UNIVERSITY] ??
    UNIVERSITY_PERIOD_TIME[DEFAULT_UNIVERSITY]
  );
}

// 大学が分からない文脈（サーバー側の一部処理等）向けの後方互換エクスポート。
// 大学が分かる画面では periodLabel(p, university) / periodTimeTable(university) を使うこと。
export const PERIOD_TIME = UNIVERSITY_PERIOD_TIME[DEFAULT_UNIVERSITY];

export function periodLabel(p: number, university?: string): string {
  const time = periodTimeTable(university)[p as Period];
  return time ? `${p}限（${time}）` : `${p}限`;
}

/**
 * 宮崎大学のシラバスに載っている生の時限番号（１・２時限→1、３・４時限→3、
 * ７・８時限→7、９・１０時限→9 のように、ペアの最初の番号または単独の番号）を
 * アプリ内のスロット番号（1〜5）に変換する。宮崎大学専用（他大学は不要）。
 */
export function slotFromRawPeriod(raw: number): Period {
  const slot = Math.ceil(raw / 2);
  return Math.min(Math.max(slot, 1), 5) as Period;
}
