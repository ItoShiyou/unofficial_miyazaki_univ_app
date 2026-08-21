"use client";

import { useState } from "react";
import { db, newId, EXPENSE_CATEGORIES, type MoneyEntry, type ExpenseCategory } from "@/lib/db";
import { todayLocalDate } from "@/lib/date";

export default function MoneyEntryFormModal({
  entry,
  onClose,
}: {
  entry?: MoneyEntry;
  onClose: () => void;
}) {
  const [type, setType] = useState<"expense" | "income">(entry?.type ?? "expense");
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory>(entry?.category ?? "食費");
  const [date, setDate] = useState(entry?.date ?? todayLocalDate());
  const [memo, setMemo] = useState(entry?.memo ?? "");

  async function handleSave() {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0 || !date) return;
    if (entry) {
      await db.moneyEntries.update(entry.id, {
        type,
        amount: amountNum,
        category,
        date,
        memo: memo.trim() || undefined,
      });
    } else {
      await db.moneyEntries.add({
        id: newId(),
        type,
        amount: amountNum,
        category,
        date,
        memo: memo.trim() || undefined,
        createdAt: Date.now(),
      });
    }
    onClose();
  }

  async function handleDelete() {
    if (!entry) return;
    if (!confirm("この記録を削除しますか？")) return;
    await db.moneyEntries.delete(entry.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">{entry ? "記録を編集" : "収支を記録"}</h2>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setType("expense")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                type === "expense" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              支出
            </button>
            <button
              onClick={() => setType("income")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                type === "income" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              収入（バイト代・仕送り等）
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">金額（円）</label>
            <input
              type="number"
              inputMode="numeric"
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例: 800"
            />
          </div>

          {type === "expense" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">日付</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">メモ（任意）</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 100))}
              placeholder={type === "income" ? "例: 仕送り、バイト代" : "例: 学食"}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {entry && (
            <button
              onClick={handleDelete}
              className="rounded-lg px-4 py-2 text-red-600 border border-red-300 text-sm"
            >
              削除
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg px-4 py-2 bg-gray-900 text-white text-sm font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
