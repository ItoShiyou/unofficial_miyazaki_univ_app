"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/ui";

type TextbookListing = {
  id: string;
  title: string;
  courseName: string | null;
  price: number | null;
  condition: string | null;
  contact: string;
  createdAt: string;
  mine: boolean;
};

export default function TextbooksPage() {
  const [listings, setListings] = useState<TextbookListing[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [courseName, setCourseName] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/textbooks")
      .then((res) => res.json())
      .then((data) => setListings(data.listings ?? []))
      .catch(() => setListings([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/textbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, courseName, price: price === "" ? null : Number(price), condition, contact }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "投稿に失敗しました。");
        return;
      }
      setTitle("");
      setCourseName("");
      setPrice("");
      setCondition("");
      setContact("");
      setShowForm(false);
      load();
    } catch {
      setError("投稿に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この投稿を削除しますか？（譲渡済みになった場合など）")) return;
    await fetch(`/api/textbooks/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="flex-1 flex flex-col px-4 pb-8">
      <PageHeader title="教科書の譲渡・売買" />
      <p className="text-sm text-gray-500 px-0.5 pb-4">
        同じ大学の学生同士で、使い終わった教科書を譲り合えます。金銭のやり取り・受け渡しは投稿者同士で直接行ってください（本アプリは仲介しません）。連絡方法は自分で開示してよい範囲を入力してください。
      </p>

      <button
        onClick={() => setShowForm((v) => !v)}
        className="mb-4 rounded-xl border border-gray-300 text-sm py-2.5 text-gray-700"
      >
        {showForm ? "投稿フォームを閉じる" : "+ 教科書を出品する"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4">
          <Card>
            <div className="space-y-2.5">
              <div>
                <label className="text-xs text-gray-500">教科書名（必須）</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={100}
                  className="w-full mt-0.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="例: 基礎からわかる〇〇学"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">対象科目名（任意）</label>
                <input
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  maxLength={100}
                  className="w-full mt-0.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="例: 〇〇概論"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">価格（円・空欄で「譲ります(無料)」）</label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  min={0}
                  max={1000000}
                  className="w-full mt-0.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="例: 1000"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">状態（任意）</label>
                <input
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  maxLength={200}
                  className="w-full mt-0.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="例: 書き込みあり・美品"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">連絡方法（必須・開示してよい範囲で）</label>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  maxLength={200}
                  className="w-full mt-0.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="例: LINE ID、学内メール等"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gray-900 text-white text-sm py-2.5 disabled:opacity-50"
              >
                {submitting ? "投稿中…" : "出品する"}
              </button>
            </div>
          </Card>
        </form>
      )}

      {listings === null && (
        <p className="text-sm text-gray-400 text-center py-10">読み込み中…</p>
      )}

      {listings !== null && listings.length === 0 && (
        <Card>
          <p className="text-sm text-gray-500 text-center py-6">まだ出品がありません。</p>
        </Card>
      )}

      <div className="space-y-3">
        {listings?.map((l) => (
          <Card key={l.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold">{l.title}</h3>
                {l.courseName && <p className="text-xs text-gray-500">{l.courseName}</p>}
              </div>
              <span className="text-sm font-bold text-emerald-700 flex-shrink-0">
                {l.price != null ? `¥${l.price.toLocaleString()}` : "無料"}
              </span>
            </div>
            {l.condition && <p className="text-xs text-gray-600 mt-1.5">{l.condition}</p>}
            <p className="text-xs text-gray-500 mt-2">連絡先: {l.contact}</p>
            {l.mine && (
              <button
                onClick={() => handleDelete(l.id)}
                className="mt-2 text-xs text-red-600"
              >
                削除する
              </button>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}
