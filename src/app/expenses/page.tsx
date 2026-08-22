"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db, type MoneyEntry, type ExpenseCategory } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import MoneyEntryFormModal from "@/components/MoneyEntryFormModal";

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

export default function ExpensesPage() {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [editing, setEditing] = useState<MoneyEntry | null>(null);
  const [showForm, setShowForm] = useState(false);

  const allEntries = useLiveQuery(() => db.moneyEntries.toArray(), []) ?? [];
  const entries = allEntries
    .filter((e) => e.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalExpense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const totalIncome = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of entries) {
    if (e.type !== "expense") continue;
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const categoryRows = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);

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

  return (
    <main className="flex-1 pb-6">
      <PageHeader
        title="お金の記録"
        right={
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="text-sm text-blue-600 font-medium"
          >
            + 記録する
          </button>
        }
      />
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-3">
        収入・支出をこの端末内だけに記録します。サーバーには送信されません。
      </p>

      <div className="px-4 flex items-center justify-center gap-3 mb-3">
        <button onClick={() => setMonthKey((k) => adjacentMonth(k, -1))} className="text-gray-400 px-2">
          ‹
        </button>
        <span className="text-sm font-medium">{monthLabel(monthKey)}</span>
        <button onClick={() => setMonthKey((k) => adjacentMonth(k, 1))} className="text-gray-400 px-2">
          ›
        </button>
      </div>

      <div className="px-4 mb-4">
        <Card>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[11px] text-gray-400">収入</p>
              <p className="text-sm font-bold text-emerald-600">¥{totalIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">支出</p>
              <p className="text-sm font-bold text-red-600">¥{totalExpense.toLocaleString()}</p>
              {expenseDiff !== null && (
                <p className={`text-[10px] mt-0.5 ${expenseDiff > 0 ? "text-red-500" : "text-emerald-600"}`}>
                  先月比{expenseDiff > 0 ? "+" : ""}¥{expenseDiff.toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] text-gray-400">収支</p>
              <p className={`text-sm font-bold ${balance >= 0 ? "text-gray-900" : "text-red-600"}`}>
                {balance >= 0 ? "+" : ""}¥{balance.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {categoryRows.length > 0 && (
        <div className="px-4 mb-4">
          <h2 className="text-sm font-medium text-gray-500 mb-2">支出カテゴリの内訳</h2>
          <Card>
            <div className="space-y-1.5">
              {categoryRows.map(([cat, amount]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{cat}</span>
                  <span className="font-medium">¥{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="px-4">
        <h2 className="text-sm font-medium text-gray-500 mb-2">記録一覧</h2>
        {entries.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">
            まだ{monthLabel(monthKey)}の記録がありません。
          </p>
        )}
        <ul className="space-y-1.5">
          {entries.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => {
                  setEditing(e);
                  setShowForm(true);
                }}
                className="w-full flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-left"
              >
                <div className="min-w-0">
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
          ))}
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
