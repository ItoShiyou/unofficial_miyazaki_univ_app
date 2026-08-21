"use client";

import { useEffect, useState } from "react";

const SECRET_KEY = "miyadai-admin-secret";

type Sponsor = {
  id: string;
  name: string;
  category: string;
  description: string;
  offer: string | null;
  url: string | null;
  area: string | null;
  isActive: boolean;
  couponCode: string | null;
  eventLabel: string | null;
  eventAt: string | null;
  impressionCount: number;
  clickCount: number;
  codeRevealCount: number;
  rsvpCount: number;
  checkinCount: number;
  qrScanCount: number;
  feedbackAvg: number | null;
  feedbackCount: number;
};

type Job = {
  id: string;
  companyName: string;
  jobType: string;
  postingType: string;
  description: string;
  applicationUrl: string;
  area: string | null;
  deadline: string | null;
  isActive: boolean;
  featured: boolean;
  impressionCount: number;
  clickCount: number;
};

type ReportedKarte = {
  id: string;
  comment: string | null;
  advice: string | null;
  reportCount: number;
  reportReasons: string[];
  hidden: boolean;
  syllabusCourse: { name: string; teacher: string | null } | null;
};

const REASON_LABEL: Record<string, string> = {
  defamation: "誹謗中傷",
  harassment: "嫌がらせ",
  spam: "スパム",
  other: "その他",
};

function authHeaders(secret: string): HeadersInit {
  return { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
}

export default function AdminPage() {
  const [secret, setSecret] = useState(() =>
    typeof window === "undefined" ? "" : sessionStorage.getItem(SECRET_KEY) ?? ""
  );
  const [secretInput, setSecretInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<"sponsors" | "jobs" | "karte" | "survey">("sponsors");

  async function tryLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch("/api/admin/sponsors", { headers: authHeaders(secretInput) }).catch(() => null);
    if (!res || !res.ok) {
      setAuthError("パスワードが正しくないか、通信に失敗しました。");
      return;
    }
    sessionStorage.setItem(SECRET_KEY, secretInput);
    setSecret(secretInput);
  }

  function logout() {
    sessionStorage.removeItem(SECRET_KEY);
    setSecret("");
    setSecretInput("");
  }

  if (!secret) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <form onSubmit={tryLogin} className="w-full max-w-sm space-y-3">
          <h1 className="text-lg font-semibold mb-1">管理画面</h1>
          <p className="text-xs text-gray-400 mb-3">
            ADMIN_SECRETを入力してください。この画面はブラウザのメモリ上でのみ値を保持し、サーバーには保存しません。
          </p>
          <input
            type="password"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="ADMIN_SECRET"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
          />
          {authError && <p className="text-xs text-red-600">{authError}</p>}
          <button type="submit" className="w-full rounded-lg bg-gray-900 text-white text-sm py-2.5">
            入室する
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex-1 pb-10 px-4 pt-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">管理画面</h1>
        <button onClick={logout} className="text-xs text-gray-400">
          ロックする
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { key: "sponsors", label: "協賛・イベント" },
          { key: "jobs", label: "求人掲示板" },
          { key: "karte", label: "カルテ通報" },
          { key: "survey", label: "アンケート" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              tab === t.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sponsors" && <SponsorsPanel secret={secret} />}
      {tab === "jobs" && <JobsPanel secret={secret} />}
      {tab === "karte" && <KartePanel secret={secret} />}
      {tab === "survey" && <SurveyPanel secret={secret} />}
    </main>
  );
}

function SponsorsPanel({ secret }: { secret: string }) {
  const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    offer: "",
    url: "",
    area: "",
    couponCode: "",
    eventLabel: "",
    eventAt: "",
  });

  function load() {
    fetch("/api/admin/sponsors", { headers: authHeaders(secret) })
      .then((r) => r.json())
      .then((d) => {
        setSponsors(d.sponsors ?? []);
        setSummary(d.summary ?? null);
      })
      .catch(() => setSponsors([]));
  }

  useEffect(load, [secret]);

  async function toggleActive(s: Sponsor) {
    await fetch(`/api/admin/sponsors/${s.id}`, {
      method: "PATCH",
      headers: authHeaders(secret),
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  }

  async function remove(s: Sponsor) {
    if (!confirm(`「${s.name}」を完全に削除しますか？`)) return;
    await fetch(`/api/admin/sponsors/${s.id}`, { method: "DELETE", headers: authHeaders(secret) });
    load();
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/sponsors", {
      method: "POST",
      headers: authHeaders(secret),
      body: JSON.stringify({
        ...form,
        offer: form.offer || undefined,
        url: form.url || undefined,
        area: form.area || undefined,
        couponCode: form.couponCode || undefined,
        eventLabel: form.eventLabel || undefined,
        eventAt: form.eventAt ? new Date(form.eventAt).toISOString() : undefined,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "作成に失敗しました");
      return;
    }
    setForm({ name: "", category: "", description: "", offer: "", url: "", area: "", couponCode: "", eventLabel: "", eventAt: "" });
    setShowForm(false);
    load();
  }

  return (
    <div className="space-y-3">
      {summary && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="表示回数" value={summary.totalImpressions} />
          <Stat label="クリック" value={summary.totalClicks} />
          <Stat label="コード開封" value={summary.totalCodeReveals} />
        </div>
      )}

      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full rounded-lg border border-gray-300 text-sm py-2"
      >
        {showForm ? "閉じる" : "＋ 新規協賛枠を追加"}
      </button>

      {showForm && (
        <form onSubmit={submitNew} className="rounded-xl border border-gray-200 p-3 space-y-2">
          <Field label="店舗・企業名" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="カテゴリ" value={form.category} onChange={(v) => setForm({ ...form, category: v })} required />
          <Field label="紹介文" value={form.description} onChange={(v) => setForm({ ...form, description: v })} required textarea />
          <Field label="特典（任意）" value={form.offer} onChange={(v) => setForm({ ...form, offer: v })} />
          <Field label="URL（任意）" value={form.url} onChange={(v) => setForm({ ...form, url: v })} />
          <Field label="エリア（任意）" value={form.area} onChange={(v) => setForm({ ...form, area: v })} />
          <Field label="クーポンコード（任意）" value={form.couponCode} onChange={(v) => setForm({ ...form, couponCode: v })} />
          <Field label="イベント名（任意）" value={form.eventLabel} onChange={(v) => setForm({ ...form, eventLabel: v })} />
          <Field label="イベント日時（任意）" value={form.eventAt} onChange={(v) => setForm({ ...form, eventAt: v })} type="datetime-local" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" className="w-full rounded-lg bg-gray-900 text-white text-sm py-2">
            作成
          </button>
        </form>
      )}

      {sponsors === null && <p className="text-sm text-gray-400">読み込み中…</p>}
      {sponsors?.map((s) => (
        <div key={s.id} className="rounded-xl border border-gray-200 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold">
                {s.name}{" "}
                {!s.isActive && <span className="text-[10px] text-gray-400">（非公開）</span>}
                {s.eventLabel && <span className="text-[10px] text-violet-600 ml-1">イベント有</span>}
              </p>
              <p className="text-xs text-gray-500">{s.category}{s.area ? ` ・ ${s.area}` : ""}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => toggleActive(s)} className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2 py-1">
                {s.isActive ? "非公開にする" : "公開する"}
              </button>
              <button onClick={() => remove(s)} className="text-[11px] text-red-600 border border-red-200 rounded-full px-2 py-1">
                削除
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            表示{s.impressionCount}・クリック{s.clickCount}・開封{s.codeRevealCount}
            {s.qrScanCount > 0 && `・QR流入${s.qrScanCount}`}
          </p>
          {s.eventLabel && (
            <p className="text-[11px] text-violet-600 mt-0.5">
              イベント申込{s.rsvpCount}件・来場{s.checkinCount}件
              {s.rsvpCount > 0 && `（転換率${Math.round((s.checkinCount / s.rsvpCount) * 100)}%）`}
              {s.feedbackCount > 0 && `・満足度${s.feedbackAvg}/5（${s.feedbackCount}件）`}
            </p>
          )}
        </div>
      ))}
      {sponsors?.length === 0 && <p className="text-sm text-gray-400">協賛枠がありません。</p>}
    </div>
  );
}

function JobsPanel({ secret }: { secret: string }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  function load() {
    fetch("/api/admin/jobs", { headers: authHeaders(secret) })
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.jobs ?? []);
        setSummary(d.summary ?? null);
      })
      .catch(() => setJobs([]));
  }

  useEffect(load, [secret]);

  async function toggleActive(j: Job) {
    await fetch(`/api/admin/jobs/${j.id}`, {
      method: "PATCH",
      headers: authHeaders(secret),
      body: JSON.stringify({ isActive: !j.isActive }),
    });
    load();
  }

  async function toggleFeatured(j: Job) {
    await fetch(`/api/admin/jobs/${j.id}`, {
      method: "PATCH",
      headers: authHeaders(secret),
      body: JSON.stringify({ featured: !j.featured }),
    });
    load();
  }

  async function remove(j: Job) {
    if (!confirm(`「${j.companyName} - ${j.jobType}」を完全に削除しますか？`)) return;
    await fetch(`/api/admin/jobs/${j.id}`, { method: "DELETE", headers: authHeaders(secret) });
    load();
  }

  return (
    <div className="space-y-3">
      {summary && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="掲載中" value={summary.activeJobs} />
          <Stat label="表示回数" value={summary.totalImpressions} />
          <Stat label="クリック" value={summary.totalClicks} />
        </div>
      )}
      <p className="text-[11px] text-gray-400">
        新規登録はcurlでの直接操作を継続（掲載件数が少数のため、実データレビューにより現状の運用で妥当と判断済み）。ここでは公開切替・注目掲載・削除のみ行えます。
      </p>
      {jobs === null && <p className="text-sm text-gray-400">読み込み中…</p>}
      {jobs?.map((j) => (
        <div key={j.id} className="rounded-xl border border-gray-200 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold">
                {j.companyName}
                {!j.isActive && <span className="text-[10px] text-gray-400 ml-1">（非公開）</span>}
                {j.featured && <span className="text-[10px] text-amber-600 ml-1">注目</span>}
              </p>
              <p className="text-xs text-gray-500">{j.jobType}{j.area ? ` ・ ${j.area}` : ""}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0 items-end">
              <div className="flex gap-1.5">
                <button onClick={() => toggleActive(j)} className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2 py-1">
                  {j.isActive ? "非公開" : "公開"}
                </button>
                <button onClick={() => toggleFeatured(j)} className="text-[11px] text-amber-600 border border-amber-200 rounded-full px-2 py-1">
                  {j.featured ? "注目解除" : "注目にする"}
                </button>
                <button onClick={() => remove(j)} className="text-[11px] text-red-600 border border-red-200 rounded-full px-2 py-1">
                  削除
                </button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            表示{j.impressionCount}・クリック{j.clickCount}
            {j.deadline && ` ・締切${new Date(j.deadline).toLocaleDateString("ja-JP")}`}
          </p>
        </div>
      ))}
      {jobs?.length === 0 && <p className="text-sm text-gray-400">求人がありません。</p>}
    </div>
  );
}

function KartePanel({ secret }: { secret: string }) {
  const [kartes, setKartes] = useState<ReportedKarte[] | null>(null);

  function load() {
    fetch("/api/admin/karte", { headers: authHeaders(secret) })
      .then((r) => r.json())
      .then((d) => setKartes(d.kartes ?? []))
      .catch(() => setKartes([]));
  }

  useEffect(load, [secret]);

  async function act(id: string, action: "restore" | "delete") {
    if (action === "delete" && !confirm("この投稿を完全に削除しますか？")) return;
    await fetch(`/api/admin/karte/${id}`, {
      method: "PATCH",
      headers: authHeaders(secret),
      body: JSON.stringify({ action }),
    });
    load();
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-400">
        通報が1件以上入った授業カルテのみ表示します。3件以上の通報で自動的に一時非表示（保留）になり、ここで復元か削除かを判断します。
      </p>
      {kartes === null && <p className="text-sm text-gray-400">読み込み中…</p>}
      {kartes?.map((k) => (
        <div key={k.id} className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs font-medium">
            {k.syllabusCourse?.name ?? "（授業不明）"}
            {k.syllabusCourse?.teacher && ` ・ ${k.syllabusCourse.teacher}`}
            {k.hidden && <span className="text-[10px] text-red-600 ml-1">非表示中</span>}
          </p>
          {k.comment && <p className="text-sm mt-1 whitespace-pre-wrap">{k.comment}</p>}
          {k.advice && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">アドバイス: {k.advice}</p>}
          <p className="text-[11px] text-gray-400 mt-1.5">
            通報{k.reportCount}件（{k.reportReasons.map((r) => REASON_LABEL[r] ?? r).join("・")}）
          </p>
          <div className="flex gap-1.5 mt-2">
            <button onClick={() => act(k.id, "restore")} className="text-[11px] text-emerald-700 border border-emerald-200 rounded-full px-2 py-1">
              復元する
            </button>
            <button onClick={() => act(k.id, "delete")} className="text-[11px] text-red-600 border border-red-200 rounded-full px-2 py-1">
              削除する
            </button>
          </div>
        </div>
      ))}
      {kartes?.length === 0 && <p className="text-sm text-gray-400">通報された投稿はありません。</p>}
    </div>
  );
}

type SurveyResponse = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
};

function SurveyPanel({ secret }: { secret: string }) {
  const [data, setData] = useState<{ count: number; avg: number | null; responses: SurveyResponse[] } | null>(
    null
  );

  useEffect(() => {
    fetch("/api/admin/survey", { headers: authHeaders(secret) })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ count: 0, avg: null, responses: [] }));
  }, [secret]);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-400">
        マイページに表示される超軽量ヒアリング「使い続けたいと思いますか？」（1〜5点）の回答一覧です。
      </p>
      {data === null && <p className="text-sm text-gray-400">読み込み中…</p>}
      {data && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          回答{data.count}件{data.avg != null && `・平均${data.avg}/5`}
        </div>
      )}
      {data?.responses.map((r) => (
        <div key={r.id} className="rounded-xl border border-gray-200 p-3">
          <p className="text-sm font-medium text-amber-600">{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</p>
          {r.comment && <p className="text-sm mt-1 whitespace-pre-wrap">{r.comment}</p>}
          <p className="text-[11px] text-gray-400 mt-1.5">{new Date(r.createdAt).toLocaleString("ja-JP")}</p>
        </div>
      ))}
      {data?.responses.length === 0 && <p className="text-sm text-gray-400">まだ回答がありません。</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2">
      <p className="text-base font-bold">{value ?? 0}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  textarea,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  textarea?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-0.5">{label}</label>
      {textarea ? (
        <textarea
          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={2}
        />
      ) : (
        <input
          type={type ?? "text"}
          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </div>
  );
}
