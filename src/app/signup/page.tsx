"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UNIVERSITIES } from "@/lib/universities";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [university, setUniversity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!university) {
      setError("大学を選択してください。");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, university }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました。");
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
      <h1 className="text-2xl font-bold mb-1">新規登録</h1>
      <p className="text-sm text-gray-400 mb-6">
        宮大非公式アプリ（開発中）。大学・大学当局とは一切関係のない、学生有志による個人開発のアプリです。学籍番号や大学配布のパスワードは使用せず、ここで登録するメールアドレス・パスワードのみでログインします。時間割・欠席記録などのデータは端末内にのみ保存され、サーバーには送信されません。
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">大学</label>
          <select
            required
            className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
          >
            <option value="" disabled>
              選択してください
            </option>
            {UNIVERSITIES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
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
          <label className="block text-xs text-gray-500 mb-1">パスワード（8文字以上）</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
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
          {submitting ? "登録中…" : "登録する"}
        </button>
      </form>

      <p className="text-sm text-gray-400 text-center mt-6">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="text-blue-600">
          ログイン
        </Link>
      </p>
    </main>
  );
}
