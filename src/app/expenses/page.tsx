"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, newId, EXPENSE_CATEGORIES, type MoneyEntry, type ExpenseCategory } from "@/lib/db";
import { todayLocalDate } from "@/lib/date";
import { PageHeader, Card, IconChip, Icon } from "@/components/ui";
import MoneyEntryFormModal from "@/components/MoneyEntryFormModal";
import LifeSectionNav from "@/components/LifeSectionNav";
import { CATEGORY_META, INCOME_META } from "@/lib/expenseMeta";

// 実データレビュー（全国大学生協連「第61回学生生活実態調査」で「生活費・お金の
// 悩み」が学生の悩みで最多、Yahoo!知恵袋にも「学生向け家計簿アプリ」の実質問あり）
// を根拠に新設。個人の金銭情報は特に機微なため、サーバーには一切送信せず
// ローカル（IndexedDB）のみで完結させる。

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${y}年${Number(m)}月`;
}

function adjacentMonth(key: string, dir: 1 | -1): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type TypeFilter = "all" | "expense" | "income";

// 実データレビュー：既存ページは「右上の＋記録する」を押すとモーダルが開く
// という1手間があった。ユーザーから「タブ内部に収入・支出の選択肢があれば
// そのまま入力するだけで済む」という直接的な要望があり、ページ内に常設の
// クイック入力フォームを追加し、モーダルは既存記録の編集専用にした。
function QuickAddForm({ monthKey }: { monthKey: string }) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("食費");
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleAdd() {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return;
    const today = todayLocalDate();
    const date = today.startsWith(monthKey) ? today : `${monthKey}-01`;
    await db.moneyEntries.add({
      id: newId(),
      type,
      amount: amountNum,
      category,
      date,
      memo: memo.trim() || undefined,
      createdAt: Date.now(),
    });
    setAmount("");
    setMemo("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Card className="mb-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setType("expense")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            type === "expense" ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          支出
        </button>
        <button
          onClick={() => setType("income")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            type === "income" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          収入
        </button>
      </div>

      <input
        type="number"
        inputMode="numeric"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-bold mb-3"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="金額（円）"
      />

      {type === "expense" && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {EXPENSE_CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c];
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium ${
                  active ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900" : "border-gray-200 text-gray-600"
                }`}
              >
                <Icon name={meta.icon} size={14} />
                {c}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={memo}
          onChange={(e) => setMemo(e.target.value.slice(0, 100))}
          placeholder={type === "income" ? "例: 仕送り、バイト代（任意）" : "例: 学食（任意）"}
        />
        <button
          onClick={handleAdd}
          className={`shrink-0 rounded-lg px-5 py-2 text-sm font-medium text-white ${
            type === "income" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {saved ? "記録しました" : "記録する"}
        </button>
      </div>
    </Card>
  );
}

export default function ExpensesPage() {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [editing, setEditing] = useState<MoneyEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const allEntries = useLiveQuery(() => db.moneyEntries.toArray(), []) ?? [];
  const monthEntries = allEntries
    .filter((e) => e.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date));
  const entries =
    typeFilter === "all" ? monthEntries : monthEntries.filter((e) => e.type === typeFilter);

  const totalExpense = monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const totalIncome = monthEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of monthEntries) {
    if (e.type !== "expense") continue;
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const categoryRows = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  const maxCategoryAmount = categoryRows.length > 0 ? categoryRows[0][1] : 0;

  // 実データレビュー：既存ページは単月のスナップショット表示のみで、前月との比較が
  // 一切なかった。マネーフォワードME等の商用家計簿アプリは「先月比」「使いすぎ警告」を
  // 標準搭載しており、業界標準機能との差が明確だった。全期間のMoneyEntryは既に
  // 端末内にあるため、新規データ収集なしで前月の支出合計を集計するだけで実現できる
  // （追加ライブラリも不要、サイクル199）。
  const prevMonthKey = adjacentMonth(monthKey, -1);
  const prevMonthExpense = allEntries
    .filter((e) => e.date.startsWith(prevMonthKey) && e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);
  const expenseDiff = prevMonthExpense > 0 ? totalExpense - prevMonthExpense : null;

  // 統計的な可視化（ユーザー要望）：直近6ヶ月分の支出合計を棒グラフで表示し、
  // カテゴリ内訳の数字だけでは分からない「使いすぎている時期」を一目で分かるようにする。
  const last6Months: string[] = [];
  {
    let k = monthKey;
    for (let i = 0; i < 6; i++) {
      last6Months.unshift(k);
      k = adjacentMonth(k, -1);
    }
  }
  const trendData = last6Months.map((k) => ({
    key: k,
    expense: allEntries.filter((e) => e.date.startsWith(k) && e.type === "expense").reduce((s, e) => s + e.amount, 0),
  }));
  const maxTrendExpense = Math.max(...trendData.map((t) => t.expense), 1);

  return (
    <main className="flex-1 pb-6">
      <PageHeader title="お金の記録" />
      <div className="px-4 mb-4">
        <LifeSectionNav />
      </div>
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-3">
        収入・支出をこの端末内だけに記録します。サーバーには送信されません。
      </p>

      <div className="px-4 mb-4">
        <QuickAddForm monthKey={monthKey} />
      </div>

      <div className="px-4 flex items-center justify-center gap-3 mb-3">
        <button onClick={() => setMonthKey((k) => adjacentMonth(k, -1))} className="text-gray-400 px-2">
          ‹
        </button>
        <span className="text-sm font-medium">{monthLabel(monthKey)}</span>
        <button onClick={() => setMonthKey((k) => adjacentMonth(k, 1))} className="text-gray-400 px-2">
          ›
        </button>
      </div>

      <div className="px-4 mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-emerald-50 p-3 text-center">
          <p className="text-[11px] text-emerald-700/70">収入</p>
          <p className="text-base font-bold text-emerald-700 mt-0.5">¥{totalIncome.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-rose-50 p-3 text-center">
          <p className="text-[11px] text-rose-700/70">支出</p>
          <p className="text-base font-bold text-rose-700 mt-0.5">¥{totalExpense.toLocaleString()}</p>
          {expenseDiff !== null && (
            <p className={`text-[10px] mt-0.5 ${expenseDiff > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              先月比{expenseDiff > 0 ? "+" : ""}¥{expenseDiff.toLocaleString()}
            </p>
          )}
        </div>
        <div className={`rounded-2xl p-3 text-center ${balance >= 0 ? "bg-blue-50" : "bg-rose-50"}`}>
          <p className={`text-[11px] ${balance >= 0 ? "text-blue-700/70" : "text-rose-700/70"}`}>収支</p>
          <p className={`text-base font-bold mt-0.5 ${balance >= 0 ? "text-blue-700" : "text-rose-700"}`}>
            {balance >= 0 ? "+" : ""}¥{balance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="px-4 mb-4">
        <h2 className="text-sm font-medium text-gray-500 mb-2">支出の推移（直近6ヶ月）</h2>
        <Card>
          <div className="flex items-end justify-between gap-2 h-24">
            {trendData.map((t) => {
              const height = Math.max((t.expense / maxTrendExpense) * 100, t.expense > 0 ? 6 : 0);
              const isCurrent = t.key === monthKey;
              return (
                <div key={t.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-md ${isCurrent ? "bg-rose-500" : "bg-rose-200"}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${isCurrent ? "text-rose-700 font-bold" : "text-gray-400"}`}>
                    {Number(t.key.split("-")[1])}月
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {categoryRows.length > 0 && (
        <div className="px-4 mb-4">
          <h2 className="text-sm font-medium text-gray-500 mb-2">支出カテゴリの内訳</h2>
          <Card>
            <div className="space-y-2.5">
              {categoryRows.map(([cat, amount]) => {
                const meta = CATEGORY_META[cat];
                const ratio = maxCategoryAmount > 0 ? amount / maxCategoryAmount : 0;
                const share = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
                return (
                  <div key={cat} className="flex items-center gap-2.5">
                    <IconChip tone={meta.tone}><Icon name={meta.icon} size={16} /></IconChip>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat}</span>
                        <span className="font-medium">
                          ¥{amount.toLocaleString()}
                          <span className="text-gray-400 font-normal ml-1">（{share}%）</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${Math.max(ratio * 100, 4)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-500">記録一覧</h2>
          <div className="flex gap-1">
            {([
              ["all", "すべて"],
              ["expense", "支出"],
              ["income", "収入"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  typeFilter === key ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {entries.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">
            まだ{monthLabel(monthKey)}の記録がありません。
          </p>
        )}
        <ul className="space-y-1.5">
          {entries.map((e) => {
            const meta = e.type === "income" ? INCOME_META : CATEGORY_META[e.category];
            return (
              <li key={e.id}>
                <button
                  onClick={() => {
                    setEditing(e);
                    setShowForm(true);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-left"
                >
                  <IconChip tone={meta.tone}><Icon name={meta.icon} size={16} /></IconChip>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">
                      {e.type === "income" ? "収入" : e.category}
                      {e.memo && <span className="text-gray-400"> ・ {e.memo}</span>}
                    </p>
                    <p className="text-[11px] text-gray-400">{e.date}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 ml-2 text-sm font-medium ${
                      e.type === "income" ? "text-emerald-600" : "text-gray-700"
                    }`}
                  >
                    {e.type === "income" ? "+" : "-"}¥{e.amount.toLocaleString()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {showForm && (
        <MoneyEntryFormModal
          entry={editing ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}
