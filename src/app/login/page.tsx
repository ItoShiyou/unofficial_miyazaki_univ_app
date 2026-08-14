"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BonjinBadge from "@/components/BonjinBadge";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ログインに失敗しました。");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-10 max-w-sm mx-auto w-full">
      <h1 className="text-2xl font-bold mb-1">ログイン</h1>
      <p className="text-sm text-gray-400 mb-6">宮大非公式アプリ（開発中）</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">メールアドレス</label>
          <input
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">パスワード</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gray-900 text-white text-sm py-2.5 font-medium disabled:opacity-50"
        >
          {submitting ? "ログイン中…" : "ログイン"}
        </button>
      </form>

      <p className="text-sm text-gray-400 text-center mt-6">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="text-blue-600">
          新規登録
        </Link>
      </p>

      <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
        パスワードを忘れた場合は、開発者までご連絡ください。
        <br />
        本人確認のうえ、24時間有効な仮パスワードを発行します。
      </p>

      <div className="flex justify-center mt-8">
        <BonjinBadge />
      </div>
    </main>
  );
}
