"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, WEEKDAYS, type Weekday } from "@/lib/db";
import { semesterLabel } from "@/lib/semester";
import { useCurrentSemester } from "@/lib/useSemester";
import { useDisplayName, setDisplayName } from "@/lib/device";
import { useAccount } from "@/lib/useAccount";
import { PageHeader } from "@/components/ui";
import { PERIODS, currentPeriod, periodLabel } from "@/lib/periods";

const DAYS = WEEKDAYS.slice(0, 5);

interface FriendEntry {
  userId: string;
  name: string;
  timetable: Array<{ weekday: Weekday; period: number; name: string }>;
}

export default function FriendsPage() {
  const semester = useCurrentSemester();
  const name = useDisplayName();
  const account = useAccount();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [showAdd, setShowAdd] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [enterCode, setEnterCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const courses =
    useLiveQuery(
      () =>
        db.courses.where("[year+semester]").equals([semester.year, semester.semester]).toArray(),
      [semester.year, semester.semester]
    ) ?? [];

  const loadFriends = useCallback(() => {
    if (!name) return;
    // 誰の友達一覧かはサーバー側がセッションから判断する
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []));
  }, [name]);

  const timetableSignature = courses
    .map((c) => `${c.weekday}${c.period}:${c.name}`)
    .sort()
    .join(",");

  useEffect(() => {
    if (!name || courses.length === 0) return;
    fetch("/api/timetable/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: name,
        data: courses.map((c) => ({ weekday: c.weekday, period: c.period, name: c.name })),
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, timetableSignature]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const effectiveIdx = activeIdx === -1 && friends.length > 0 ? 0 : activeIdx;

  function saveName(n: string) {
    setDisplayName(n);
  }

  async function createInvite() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/friends/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.code) {
        setError(data?.error ?? "招待コードの発行に失敗しました");
        return;
      }
      setInviteCode(data.code);
    } catch {
      setError("通信に失敗しました。時間をおいて再度お試しください");
    } finally {
      setBusy(false);
    }
  }

  const [copied, setCopied] = useState(false);

  function inviteMessage(code: string) {
    return `宮大非公式アプリで友達登録しよう！招待コード: ${code}（24時間有効）`;
  }

  async function copyInviteCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError("");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ボタンを押しても無反応に見えるのを防ぐため、画面上のコードを手入力してもらう案内を出す
      setError("コピーできませんでした。上に表示されているコードを直接お伝えください。");
    }
  }

  async function shareInviteCode(code: string) {
    if (navigator.share) {
      try {
        await navigator.share({ text: inviteMessage(code) });
      } catch {
        // ユーザーによる共有キャンセルも含めここに来るため、エラー表示はしない
      }
    } else {
      copyInviteCode(code);
    }
  }

  async function removeFriend(friendUserId: string, friendName: string) {
    if (!window.confirm(`${friendName}さんとの友達関係を解除しますか？`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/friends/${friendUserId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("友達の解除に失敗しました");
        return;
      }
      setActiveIdx(-1);
      loadFriends();
    } catch {
      setError("通信に失敗しました。時間をおいて再度お試しください");
    } finally {
      setBusy(false);
    }
  }

  async function acceptInvite() {
    if (!enterCode.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, code: enterCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      setEnterCode("");
      setShowAdd(false);
      loadFriends();
    } finally {
      setBusy(false);
    }
  }

  if (!name) {
    return (
      <main className="flex-1 pb-6">
        <PageHeader title="友達と比較" />
        <div className="px-4">
          <p className="text-sm text-gray-500 mb-3">
            友達機能を使うには、まずニックネームを設定してください。
          </p>
          <NicknameForm onSave={saveName} />
        </div>
      </main>
    );
  }

  const friend = friends[effectiveIdx];

  // 実データレビュー：競合の学生専用時間割アプリ「Penmark」（慶大生の8割が利用）が
  // 「空きコマが同じ友達を探す」機能を公式に持っており、市場で需要が実証済みと
  // 判断した。既存の「友達と比較」機能は1人ずつ週間時間割を並べて見る設計で、
  // 「今この瞬間、誰が空いているか」をひと目で確認する機能は無かった。位置情報等の
  // 新規データは不要で、既存の共有時間割データ（/api/friends）だけで実現できるため
  // プライバシー面の追加リスクも無い（サイクル195）。
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // 0=Mon
  const today = todayIdx < 5 ? WEEKDAYS[todayIdx] : null;
  const nowPeriod = today ? currentPeriod(account?.university, now) : null;
  const freeFriends =
    today && nowPeriod
      ? friends.filter((f) => !f.timetable.some((c) => c.weekday === today && c.period === nowPeriod))
      : [];

  function ownAt(w: Weekday, p: number) {
    return courses.find((c) => c.weekday === w && c.period === p);
  }
  function friendAt(w: Weekday, p: number) {
    return friend?.timetable.find((c) => c.weekday === w && c.period === p);
  }

  let together = 0;
  let overlapping = 0;
  if (friend) {
    for (const w of DAYS) {
      for (const p of PERIODS) {
        const o = ownAt(w, p);
        const f = friendAt(w, p);
        if (o && f) {
          overlapping++;
          if (o.name === f.name) together++;
        }
      }
    }
  }

  return (
    <main className="flex-1 pb-6">
      <div className="flex items-center justify-between px-4 pt-4 mb-1">
        <h1 className="text-xl font-bold">友達と比較</h1>
        <button onClick={() => setShowAdd(true)} className="text-xl text-gray-500">
          +
        </button>
      </div>
      <p className="px-4 text-xs text-gray-400 mb-3">{semesterLabel(semester)}</p>

      <div className="flex gap-2 px-4 mb-4 overflow-x-auto">
        {["自分", ...friends.map((f) => f.name)].map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i - 1)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
              (i === 0 && effectiveIdx < 0) || i - 1 === effectiveIdx
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {friends.length === 0 && (
        <p className="px-4 text-sm text-gray-400">
          まだ友達がいません。右上の「+」から招待コードを共有・入力してください。
        </p>
      )}

      {friends.length > 0 && today && nowPeriod && (
        <div className="px-4 mb-4">
          <div className="rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 mb-1.5">
              今空いている友達（{periodLabel(nowPeriod, account?.university)}）
            </p>
            {freeFriends.length > 0 ? (
              <p className="text-sm">
                {freeFriends.map((f) => f.name).join("・")}
              </p>
            ) : (
              <p className="text-sm text-gray-400">今は授業中の友達ばかりのようです</p>
            )}
          </div>
        </div>
      )}

      {friend && (
        <>
          <div className="px-4">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="w-5"></th>
                  {DAYS.map((w) => (
                    <th key={w} className="font-normal text-gray-400 pb-1">
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p}>
                    <td className="text-center text-gray-300">{p}</td>
                    {DAYS.map((w) => {
                      const o = ownAt(w, p);
                      const f = friendAt(w, p);
                      let cls = "bg-gray-50";
                      let label = "";
                      if (o && f && o.name === f.name) {
                        cls = "bg-emerald-100 text-emerald-700";
                        label = o.name;
                      } else if (o && f) {
                        cls = "bg-amber-100 text-amber-700";
                        label = `${o.name}/${f.name}`;
                      } else if (o) {
                        cls = "bg-blue-50 text-blue-600";
                        label = o.name;
                      } else if (f) {
                        cls = "bg-pink-50 text-pink-600";
                        label = f.name;
                      }
                      return (
                        <td key={w} className="p-0.5">
                          <div className={`h-9 rounded-lg flex items-center justify-center text-center leading-tight px-0.5 ${cls}`}>
                            {label}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
              <span className="text-sm text-gray-500">一緒の授業</span>
              <span className="text-sm font-medium">{together}コマ</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
              <span className="text-sm text-gray-500">時間が被っているコマ</span>
              <span className="text-sm font-medium">{overlapping}コマ</span>
            </div>
            <button
              onClick={() => removeFriend(friend.userId, friend.name)}
              disabled={busy}
              className="w-full text-center text-xs text-gray-400 py-2"
            >
              {friend.name}さんとの友達を解除
            </button>
            {error && !showAdd && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
          </div>
        </>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">友達を追加</h2>

            <div className="mb-5">
              <p className="text-xs text-gray-500 mb-2">自分の招待コードを共有</p>
              {inviteCode ? (
                <div className="text-center rounded-xl bg-gray-50 py-4">
                  <span className="text-2xl font-bold tracking-widest">{inviteCode}</span>
                  <p className="text-xs text-gray-400 mt-1">24時間有効・1回のみ使用可</p>
                  <div className="flex gap-2 mt-3 px-4">
                    <button
                      onClick={() => shareInviteCode(inviteCode)}
                      className="flex-1 rounded-lg bg-gray-900 text-white text-xs py-2"
                    >
                      共有する
                    </button>
                    <button
                      onClick={() => copyInviteCode(inviteCode)}
                      className="flex-1 rounded-lg border border-gray-300 text-xs py-2"
                    >
                      {copied ? "コピーしました" : "コードをコピー"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={createInvite}
                  disabled={busy}
                  className="w-full rounded-xl border border-gray-300 py-2.5 text-sm"
                >
                  招待コードを発行
                </button>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">友達の招待コードを入力</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
                  placeholder="例: AB12CD"
                  value={enterCode}
                  onChange={(e) => setEnterCode(e.target.value)}
                />
                <button
                  onClick={acceptInvite}
                  disabled={busy}
                  className="rounded-lg bg-gray-900 text-white text-sm px-4"
                >
                  追加
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>

            <button
              onClick={() => setShowAdd(false)}
              className="w-full text-center text-sm text-gray-400 mt-5"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function NicknameForm({ onSave }: { onSave: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <input
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        placeholder="例: たろう"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        onClick={() => value.trim() && onSave(value.trim())}
        className="rounded-lg bg-gray-900 text-white text-sm px-4"
      >
        設定
      </button>
    </div>
  );
}
