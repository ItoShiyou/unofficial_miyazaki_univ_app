"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { semesterLabel } from "@/lib/semester";
import { useCurrentSemester } from "@/lib/useSemester";
import { useDisplayName, setDisplayName, useTargetCredits, setTargetCredits } from "@/lib/device";
import { exportTimetableCsv, importTimetableCsv } from "@/lib/csv";
import { computeGpa, computeEarnedCredits } from "@/lib/gpa";
import { UNIVERSITIES, universityName, universitySupportsSyllabusSync } from "@/lib/universities";
import { useAccount } from "@/lib/useAccount";
import { PageHeader, Card, IconChip, NavLinkButton } from "@/components/ui";
import BonjinBadge from "@/components/BonjinBadge";
import AppSurveyCard from "@/components/AppSurveyCard";
import {
  getPushSubscriptionState,
  subscribeToPush,
  unsubscribeFromPush,
  watchCourse,
} from "@/lib/pushClient";

interface SyllabusChangeEntry {
  id: string;
  syllabusCourseId: string | null;
  courseName: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  detectedAt: string;
  confirmCount: number;
  refuteCount: number;
}

const FIELD_LABEL: Record<string, string> = {
  teacher: "担当教員",
  schedule: "曜日・時限",
  removed: "掲載状況",
};

interface SyllabusStatus {
  total: number;
  lastFetchedAt: string | null;
}

// マイページの各カードに添えるピクトグラム。文字だけの一覧に視覚的な目印と
// 遊びを加えるための最小限のアイコンセット（BottomNavと同じ線画スタイル）。
type IconName =
  | "user"
  | "tag"
  | "users"
  | "megaphone"
  | "checklist"
  | "chart"
  | "calendar"
  | "cap"
  | "target"
  | "file"
  | "sync"
  | "bell"
  | "history"
  | "trash"
  | "coin"
  | "briefcase"
  | "shield";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c1.5-3.5 5-5 7.5-5s6 1.5 7.5 5" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M12 3h6a2 2 0 0 1 2 2v6l-9 9-8-8z" />
          <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M2.5 20c1.2-3 4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
          <path d="M15.5 5.5c1.4.3 2.5 1.6 2.5 3s-1.1 2.7-2.5 3" />
          <path d="M16 15.8c2 .4 3.6 1.8 4.5 4.2" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...common}>
          <path d="M3 10v4a1 1 0 0 0 1 1h2l8 4V5l-8 4H4a1 1 0 0 0-1 1Z" />
          <path d="M18 9a4 4 0 0 1 0 6" />
        </svg>
      );
    case "checklist":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 12.5l2.5 2.5L16 9.5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V10M12 20V4M20 20v-7" />
          <path d="M2 20h20" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "cap":
      return (
        <svg {...common}>
          <path d="M2 9l10-4 10 4-10 4-10-4Z" />
          <path d="M6 11v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.5" fill="currentColor" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M9 9h6M9 13h6M9 17h4" />
        </svg>
      );
    case "sync":
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
          <path d="M17 3v4h-4M7 21v-4h4" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M12 8v5l3 2" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
        </svg>
      );
    case "coin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 15.5c0 1.1 1.1 2 2.5 2s2.5-.7 2.5-1.8c0-2.5-5-1.2-5-3.6 0-1.1 1.1-1.8 2.5-1.8s2.5.9 2.5 2" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function MyPage() {
  const router = useRouter();
  const savedName = useDisplayName();
  const [draftName, setDraftName] = useState(savedName);
  const [editingName, setEditingName] = useState(false);
  const semester = useCurrentSemester();
  const [changes, setChanges] = useState<SyllabusChangeEntry[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<SyllabusStatus | null>(null);
  const account = useAccount();
  const [loggingOut, setLoggingOut] = useState(false);

  async function confirmChange(id: string, agree: boolean) {
    if (confirmedIds.has(id)) return;
    setConfirmedIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/syllabus/changes/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agree }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setChanges((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, confirmCount: data.confirmCount, refuteCount: data.refuteCount } : c
        )
      );
    } catch {
      // 反映できなくても致命的ではないため、静かに無視する
    }
  }

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordDone, setPasswordDone] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingUniversity, setEditingUniversity] = useState(false);
  const [savingUniversity, setSavingUniversity] = useState(false);
  const [universityError, setUniversityError] = useState<string | null>(null);

  const [pushState, setPushState] = useState<"subscribed" | "unsubscribed" | "unsupported" | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    getPushSubscriptionState().then(setPushState);
  }, []);

  async function togglePush() {
    setPushError(null);
    setPushBusy(true);
    try {
      if (pushState === "subscribed") {
        await unsubscribeFromPush();
        setPushState("unsubscribed");
      } else {
        const result = await subscribeToPush();
        if (result === "denied") {
          setPushError(
            "通知がブロックされています。もう一度ボタンを押しても確認画面は出ません。ブラウザまたは端末の「サイトの設定」からこのアプリの通知を許可に変更し、ページを再読み込みしてください。"
          );
          return;
        }
        if (result !== "ok") {
          setPushError("通知が許可されませんでした。ブラウザの通知設定をご確認ください。");
          return;
        }
        setPushState("subscribed");
        // 購読前から時間割に登録済みだった、シラバス連携済みの授業も遡って通知対象にする
        const allCourses = await db.courses.toArray();
        const syllabusCourseIds = [
          ...new Set(allCourses.map((c) => c.syllabusCourseId).filter((id): id is string => !!id)),
        ];
        await Promise.all(syllabusCourseIds.map((id) => watchCourse(id)));
      }
    } catch {
      setPushError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setPushBusy(false);
    }
  }

  async function saveUniversity(university: string) {
    setUniversityError(null);
    setSavingUniversity(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ university }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUniversityError(data.error ?? "変更に失敗しました。");
        return;
      }
      setEditingUniversity(false);
      window.location.reload();
    } catch {
      setUniversityError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setSavingUniversity(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    if (
      !window.confirm(
        "本当にアカウントを削除しますか？時間割・友達関係などのデータは全て失われ、元に戻せません。"
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "削除に失敗しました。");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setDeleteError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setDeleting(false);
    }
  }

  const [appShareCopied, setAppShareCopied] = useState(false);

  async function shareApp() {
    const url = window.location.origin;
    const text = "宮大非公式アプリ：時間割・授業カルテ・休講速報などをまとめて確認できます。";
    if (navigator.share) {
      try {
        await navigator.share({ title: "宮大非公式アプリ", text, url });
      } catch {
        // ユーザーによる共有キャンセルも含めここに来るため、エラー表示はしない
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setAppShareCopied(true);
        setTimeout(() => setAppShareCopied(false), 2000);
      } catch {
        // クリップボードAPIが使えない環境では何もしない（共有シート非対応・コピー不可の場合、URLは画面外だが致命的ではない）
      }
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        alert("ログアウトに失敗しました。時間をおいて再度お試しください。");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      alert("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setLoggingOut(false);
    }
  }

  function closePasswordForm() {
    setShowPasswordForm(false);
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setPasswordError(null);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== newPasswordConfirm) {
      setPasswordError("新しいパスワードが一致しません。");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? "変更に失敗しました。");
        return;
      }
      closePasswordForm();
      setPasswordDone(true);
    } catch {
      setPasswordError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setChangingPassword(false);
    }
  }

  useEffect(() => {
    if (!account) return;
    let ignore = false;
    fetch(
      `/api/syllabus/changes?year=${semester.year}&semester=${semester.semester}&university=${account.university}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) setChanges(d.changes ?? []);
      })
      .catch(() => {
        if (!ignore) setChanges([]);
      });
    fetch(
      `/api/syllabus/status?year=${semester.year}&semester=${semester.semester}&university=${account.university}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) setStatus(d);
      })
      .catch(() => {
        if (!ignore) setStatus(null);
      });
    return () => {
      ignore = true;
    };
  }, [semester.year, semester.semester, account]);

  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const currentCourses = courses.filter(
    (c) => c.year === semester.year && c.semester === semester.semester
  );

  const semesterCounts = new Map<string, number>();
  for (const c of courses) {
    const key = `${c.year}年度 ${c.semester}`;
    semesterCounts.set(key, (semesterCounts.get(key) ?? 0) + 1);
  }

  const cumulativeGpa = computeGpa(courses);
  const currentSemesterGpa = computeGpa(currentCourses);
  const earnedCredits = computeEarnedCredits(courses);
  const targetCredits = useTargetCredits();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState(String(targetCredits ?? ""));

  function saveName() {
    setDisplayName(draftName.trim());
    setEditingName(false);
  }

  function saveTargetCredits() {
    const n = Number(targetDraft);
    setTargetCredits(Number.isFinite(n) && n > 0 ? n : null);
    setEditingTarget(false);
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const result = await importTimetableCsv(text, semester);
      const notes = [
        result.skipped ? `${result.skipped}件は形式不正でスキップ` : "",
        result.conflicted ? `${result.conflicted}件は時間割の重複でスキップ` : "",
      ].filter(Boolean);
      alert(`${result.imported}件の授業を読み込みました。${notes.length ? `（${notes.join(" / ")}）` : ""}`);
    } catch {
      alert("ファイルの読み込みに失敗しました。CSVの形式をご確認ください。");
    }
  }

  return (
    <main className="flex-1 pb-6">
      <PageHeader title="マイページ" />

      <div className="px-4 space-y-4">
        <AppSurveyCard />

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <IconChip tone="blue"><Icon name="user" /></IconChip>
            <p className="text-xs text-gray-400">アカウント</p>
          </div>
          {account ? (
            <div className="space-y-1 mb-3">
              <p className="text-sm font-medium">{account.email}</p>
              {editingUniversity ? (
                <div className="space-y-2 pt-1">
                  <select
                    defaultValue={account.university}
                    disabled={savingUniversity}
                    onChange={(e) => saveUniversity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {UNIVERSITIES.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  {universityError && <p className="text-xs text-red-600">{universityError}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUniversity(false);
                      setUniversityError(null);
                    }}
                    disabled={savingUniversity}
                    className="rounded-full bg-gray-100 text-gray-500 text-xs px-3 py-1.5"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">{universityName(account.university)}</p>
                  <button
                    onClick={() => setEditingUniversity(true)}
                    className="rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1"
                  >
                    変更
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-3">読み込み中...</p>
          )}

          {account?.mustChangePassword && !showPasswordForm && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-3">
              <p className="text-xs text-amber-800">
                仮パスワードでログインしています。24時間で失効するため、
                下の「パスワードを変更」から早めに新しいパスワードを設定してください。
              </p>
            </div>
          )}

          {passwordDone && (
            <p className="text-xs text-emerald-600 mb-3">パスワードを変更しました。</p>
          )}

          {showPasswordForm ? (
            <form onSubmit={handleChangePassword} className="space-y-2 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">現在のパスワード</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  新しいパスワード（8文字以上）
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  新しいパスワード（確認）
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                />
              </div>

              {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-lg bg-gray-900 text-white text-sm px-4 py-2 disabled:opacity-50"
                >
                  {changingPassword ? "変更中..." : "変更する"}
                </button>
                <button
                  type="button"
                  onClick={closePasswordForm}
                  className="rounded-lg border border-gray-300 text-sm px-4 py-2"
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setPasswordDone(false);
                setShowPasswordForm(true);
              }}
              className="rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 mb-3"
            >
              パスワードを変更
            </button>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-full bg-rose-50 text-rose-600 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
          >
            {loggingOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <IconChip tone="violet"><Icon name="tag" /></IconChip>
            <p className="text-xs text-gray-400">ニックネーム</p>
          </div>
          {editingName ? (
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              <button onClick={saveName} className="rounded-lg bg-gray-900 text-white text-sm px-4">
                保存
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{savedName || "未設定"}</span>
              <button
                onClick={() => {
                  setDraftName(savedName);
                  setEditingName(true);
                }}
                className="rounded-full bg-violet-50 text-violet-700 text-xs font-medium px-2.5 py-1"
              >
                編集
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">友達との時間割比較で表示される名前です。</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <IconChip tone="violet"><Icon name="users" /></IconChip>
              <span className="text-sm font-medium">友達と比較</span>
            </div>
            <NavLinkButton href="/friends" tone="violet">開く</NavLinkButton>
          </div>
          <p className="text-xs text-gray-400">招待コードで友達を追加し、時間割を比較できます。</p>
        </Card>

        <Card className="!bg-amber-50 !border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <IconChip tone="amber"><Icon name="megaphone" /></IconChip>
            <p className="text-sm font-medium">まだ使っていない友達がいたら</p>
          </div>
          <p className="text-xs text-amber-800/70 mb-3">
            このアプリを友達に教えることもできます（友達登録とは別に、アプリ自体を知らせたいときに）。
          </p>
          <button
            onClick={shareApp}
            className="w-full rounded-full bg-amber-500 text-white text-sm font-medium py-2.5 active:bg-amber-600"
          >
            {appShareCopied ? "リンクをコピーしました" : "アプリを紹介する"}
          </button>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <IconChip tone="blue"><Icon name="checklist" /></IconChip>
              <span className="text-sm font-medium">はじめの2週間ガイド</span>
            </div>
            <NavLinkButton href="/onboarding" tone="blue">開く</NavLinkButton>
          </div>
          <p className="text-xs text-gray-400">入学・進級直後にやっておくと良いことをチェックリストで確認できます。</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <IconChip tone="rose"><Icon name="chart" /></IconChip>
              <span className="text-sm font-medium">今学期の負荷</span>
            </div>
            <NavLinkButton href="/workload" tone="rose">開く</NavLinkButton>
          </div>
          <p className="text-xs text-gray-400">
            時間割全体の出席の厳しさ・課題の多さを、授業カルテのデータから1画面に集約します。
          </p>
        </Card>

        {/* UI/UX見直し：お金の記録・奨学金・教科書譲渡は下部タブ「くらし」
            （/life）に移設したため、マイページからは重複するカードを削除した。 */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <IconChip tone="cyan"><Icon name="calendar" /></IconChip>
            <p className="text-sm font-medium">学期</p>
          </div>
          <p className="text-xs text-gray-400 mb-2">現在表示中：{semesterLabel(semester)}（{currentCourses.length}科目）</p>
          <div className="space-y-1">
            {Array.from(semesterCounts.entries()).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between text-sm py-1">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-400">{count}科目</span>
              </div>
            ))}
            {semesterCounts.size === 0 && (
              <p className="text-xs text-gray-400">まだ授業が登録されていません。</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <IconChip tone="emerald"><Icon name="cap" /></IconChip>
            <p className="text-sm font-medium">成績・GPA</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700/70 mb-1">{semesterLabel(semester)}</p>
              <p className="text-xl font-bold text-emerald-700">
                {currentSemesterGpa.gpa != null ? currentSemesterGpa.gpa.toFixed(2) : "―"}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700/70 mb-1">通算</p>
              <p className="text-xl font-bold text-emerald-700">
                {cumulativeGpa.gpa != null ? cumulativeGpa.gpa.toFixed(2) : "―"}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            成績・単位数が入力済みの科目（{cumulativeGpa.gradedCourseCount}科目・
            {cumulativeGpa.creditsCounted}単位）から算出。各授業の詳細ページで成績を入力できます。
          </p>
        </Card>

        {/* 実データレビュー：知恵袋に「卒業に124単位必要」を前提にあと何単位か
            不安に思う投稿が複数あり、他大学の単位管理アプリ（UnitTracking等）にも
            自己申告した必要単位数に対する進捗表示機能がある。大学・学部・学科・
            入学年度別のカリキュラム判定は一切行わず、学生が自分で入力した目標値との
            単純な引き算・割り算のみにとどめることで、卒業要件判定を見送った
            サイクル134の判断（誤判定リスク）とは別種の、リスクの低い機能にした。
            不可（不合格）の科目は取得単位に含めない（サイクル207）。 */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <IconChip tone="emerald"><Icon name="target" /></IconChip>
            <p className="text-sm font-medium">卒業要件単位数（自己申告）</p>
          </div>
          {targetCredits === null && !editingTarget ? (
            <button
              onClick={() => {
                setTargetDraft("");
                setEditingTarget(true);
              }}
              className="w-full rounded-xl border border-gray-300 text-sm py-2.5 text-gray-600"
            >
              目標単位数を設定する
            </button>
          ) : editingTarget ? (
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={999}
                value={targetDraft}
                onChange={(e) => setTargetDraft(e.target.value)}
                placeholder="例: 124"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={saveTargetCredits}
                className="rounded-lg bg-gray-900 text-white text-sm px-4"
              >
                保存
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-600">
                  {earnedCredits} / {targetCredits}単位
                </span>
                <button
                  onClick={() => {
                    setTargetDraft(String(targetCredits));
                    setEditingTarget(true);
                  }}
                  className="rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1"
                >
                  変更する
                </button>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, (earnedCredits / targetCredits!) * 100)}%` }}
                />
              </div>
            </>
          )}
          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
            自分で入力した目標に対する単純な進捗表示です。学部・学科・入学年度によって卒業要件は異なるため、正式な判定は「わかば」等の大学公式システムでご確認ください。
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <IconChip tone="gray"><Icon name="file" /></IconChip>
            <p className="text-sm font-medium">時間割データ</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportTimetableCsv(currentCourses)}
              className="flex-1 rounded-full border border-gray-300 text-sm py-2"
            >
              CSVエクスポート
            </button>
            <label className="flex-1 rounded-full border border-gray-300 text-sm py-2 text-center cursor-pointer">
              CSVインポート
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-1">
            <IconChip tone="blue"><Icon name="sync" /></IconChip>
            <p className="text-sm font-medium">シラバス連携</p>
          </div>
          {account && !universitySupportsSyllabusSync(account.university) ? (
            <p className="text-xs text-gray-400">
              {universityName(account.university)}は、まだシラバス連携（自動取得・変更検知）に対応していません。時間割・授業カルテは手動で入力・登録してご利用いただけます。対応拡大のご要望は開発者までお寄せください。
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                {semesterLabel(semester)}の全授業を大学の公開シラバスから学期に1回、サーバー側で自動的に取得・保管しています（手動での再取得はできません）。
              </p>
              {status ? (
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">保管件数</span>
                    <span>{status.total}件</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">最終更新</span>
                    <span>
                      {status.lastFetchedAt
                        ? new Date(status.lastFetchedAt).toLocaleDateString("ja-JP")
                        : "未取得"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">読み込み中...</p>
              )}
            </>
          )}
        </Card>

        {pushState && pushState !== "unsupported" && (
          <Card>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <IconChip tone="blue"><Icon name="bell" /></IconChip>
                <p className="text-sm font-medium">シラバス変更のプッシュ通知</p>
              </div>
              <button
                onClick={togglePush}
                disabled={pushBusy}
                className={`shrink-0 rounded-full text-xs font-medium px-3 py-1.5 disabled:opacity-50 ${
                  pushState === "subscribed" ? "bg-gray-100 text-gray-600" : "bg-blue-600 text-white"
                }`}
              >
                {pushBusy ? "処理中..." : pushState === "subscribed" ? "通知をオフにする" : "通知をオンにする"}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              オンにすると、時間割に登録した授業（シラバス連携済みのもの）の教員変更・休講等をこの端末にプッシュ通知でお知らせします。登録した授業ごとに個別に通知するため、履修していない授業の変更は届きません。
            </p>
            {pushError && <p className="text-xs text-red-600 mt-2">{pushError}</p>}
          </Card>
        )}

        {changes.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <IconChip tone="amber"><Icon name="history" /></IconChip>
              <p className="text-sm font-medium">シラバスの変更履歴</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {semesterLabel(semester)}で検知された変更（新しい順・最大50件）
            </p>
            <ul className="space-y-2">
              {changes.map((c) => {
                const inner = (
                  <>
                    <p className="text-sm font-medium">{c.courseName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.field === "removed" ? (
                        "シラバスから掲載終了になりました"
                      ) : (
                        <>
                          {FIELD_LABEL[c.field] ?? c.field}：{c.oldValue || "（空）"} →{" "}
                          {c.newValue || "（空）"}
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {new Date(c.detectedAt).toLocaleDateString("ja-JP")}
                    </p>
                  </>
                );
                const confirmed = confirmedIds.has(c.id);
                return (
                  <li key={c.id} className="rounded-xl border border-gray-200 p-3">
                    {c.syllabusCourseId ? (
                      <Link href={`/karte/${c.syllabusCourseId}`}>{inner}</Link>
                    ) : (
                      inner
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400">
                        今日も同じ {c.confirmCount} ・ もう変わっていた {c.refuteCount}
                      </span>
                      {!confirmed ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => confirmChange(c.id, true)}
                            className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2.5 py-1"
                          >
                            今日も同じでした
                          </button>
                          <button
                            onClick={() => confirmChange(c.id, false)}
                            className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2.5 py-1"
                          >
                            もう変わっていた
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-600">確認ありがとうございました</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <IconChip tone="rose"><Icon name="trash" /></IconChip>
            <p className="text-xs text-gray-400">アカウントの削除</p>
          </div>
          {showDeleteForm ? (
            <form onSubmit={handleDeleteAccount} className="space-y-2">
              <p className="text-xs text-red-600 leading-relaxed">
                削除すると時間割・友達関係などのデータは全て失われ、元に戻せません。確認のためパスワードを入力してください。
              </p>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="パスワード"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={deleting}
                  className="rounded-lg bg-red-600 text-white text-sm px-4 py-2 disabled:opacity-50"
                >
                  {deleting ? "削除中..." : "完全に削除する"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteForm(false);
                    setDeletePassword("");
                    setDeleteError(null);
                  }}
                  className="rounded-lg border border-gray-300 text-sm px-4 py-2"
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowDeleteForm(true)}
              className="rounded-full bg-rose-50 text-rose-600 text-xs font-medium px-3 py-1.5"
            >
              アカウントを削除する
            </button>
          )}
        </Card>

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link
            href="/sponsors"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5"
          >
            <Icon name="coin" size={14} />
            地元とつながる
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-medium px-3 py-1.5"
          >
            <Icon name="briefcase" size={14} />
            求人・説明会
          </Link>
          <Link
            href="/privacy"
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1.5"
          >
            <Icon name="shield" size={14} />
            プライバシーポリシー
          </Link>
        </div>
        <p className="text-[11px] text-gray-300 text-center pt-2 leading-relaxed px-6">
          宮大非公式アプリ（開発版）。大学・大学当局とは一切関係のない、学生有志による個人開発のアプリです。学籍番号や大学配布のパスワードは取り扱いません。
        </p>
        <div className="flex justify-center pb-4">
          <BonjinBadge />
        </div>
      </div>
    </main>
  );
}
