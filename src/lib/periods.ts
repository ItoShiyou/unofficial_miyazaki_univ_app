/**
 * 宮崎大学の授業時限（1〜5限）。宮崎大学の公式時刻表は「１・２時限」のように
 * 2つの時限番号をペアにした90分授業が基本のため、アプリ内では
 * 1コマ=1スロットとして 1〜5 で管理する。
 * 参照: https://www.miyazaki-u.ac.jp/manabi-jim/educational-info/schedule/timetable/
 */
export const PERIODS = [1, 2, 3, 4, 5] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_TIME: Record<Period, string> = {
  1: "8:40–10:10",
  2: "10:30–12:00",
  3: "13:00–14:30",
  4: "14:50–16:20",
  5: "16:40–18:10",
};

export function periodLabel(p: number): string {
  const time = PERIOD_TIME[p as Period];
  return time ? `${p}限（${time}）` : `${p}限`;
}

/**
 * 宮崎大学のシラバスに載っている生の時限番号（１・２時限→1、３・４時限→3、
 * ７・８時限→7、９・１０時限→9 のように、ペアの最初の番号または単独の番号）を
 * アプリ内のスロット番号（1〜5）に変換する。
 */
export function slotFromRawPeriod(raw: number): Period {
  const slot = Math.ceil(raw / 2);
  return Math.min(Math.max(slot, 1), 5) as Period;
}
