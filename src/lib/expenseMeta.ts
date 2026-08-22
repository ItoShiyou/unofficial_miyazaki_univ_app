import type { ExpenseCategory } from "@/lib/db";
import type { IconName, Tone } from "@/components/ui";

// 収支の記録一覧・内訳・入力フォームで共通して使うカテゴリごとの
// アイコン・色。見た目を数値の羅列だけにせず、一目でカテゴリを識別できるようにする。
export const CATEGORY_META: Record<ExpenseCategory, { icon: IconName; tone: Tone }> = {
  食費: { icon: "food", tone: "amber" },
  家賃: { icon: "home", tone: "blue" },
  光熱費: { icon: "bolt", tone: "rose" },
  "通信・サブスク": { icon: "wifi", tone: "cyan" },
  交通: { icon: "car", tone: "gray" },
  娯楽: { icon: "spark", tone: "violet" },
  交際費: { icon: "users", tone: "emerald" },
  "サークル・部活": { icon: "megaphone", tone: "amber" },
  "教材・書籍": { icon: "book", tone: "violet" },
  その他: { icon: "tag", tone: "gray" },
};

export const INCOME_META: { icon: IconName; tone: Tone } = { icon: "coin", tone: "emerald" };
