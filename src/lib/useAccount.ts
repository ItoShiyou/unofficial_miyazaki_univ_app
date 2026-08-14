"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";

export interface Account {
  id: string;
  email: string;
  university: string;
  displayName: string | null;
  /** 運営が発行した仮パスワードでログイン中。早くパスワードを変更してもらう必要がある */
  mustChangePassword: boolean;
}

const LAST_USER_KEY = "miyadai-last-user-id";

// 端末内データの持ち主が変わったかどうかの判定は1回のページ読み込みにつき1度でよい。
// useAccountは複数のコンポーネントから呼ばれるため、重複実行を防ぐ。
let ownershipChecked = false;

/**
 * 時間割・欠席記録・成績などの個人データは端末内(Dexie)にのみ保存しているため、
 * 同じ端末で別のアカウントがログインすると前の人のデータがそのまま見えてしまう。
 * ログイン中のユーザーが前回と変わっていた場合だけ、端末内データを初期化する。
 *
 * 同じユーザーがログアウト→再ログインした場合はデータを保持する
 * （サーバーに同期していないため、消すと復旧できないため）。
 */
async function resetLocalDataIfUserChanged(userId: string) {
  if (ownershipChecked) return;
  ownershipChecked = true;

  const lastUserId = localStorage.getItem(LAST_USER_KEY);
  if (lastUserId === userId) return;

  if (lastUserId) {
    // 別のアカウントに切り替わった場合のみ初期化する
    await Promise.all([
      db.courses.clear(),
      db.attendances.clear(),
      db.notes.clear(),
      db.tasks.clear(),
      db.examSlots.clear(),
    ]);
    // 友達機能で使う端末IDと表示名も、前の持ち主のものを引き継がないようにする
    localStorage.removeItem("miyadai-device-id");
    localStorage.removeItem("miyadai-display-name");
  }
  localStorage.setItem(LAST_USER_KEY, userId);
}

// 1画面で複数のコンポーネントがuseAccountを使うため、同時に発生した取得は1本にまとめる。
// 完了後は解放するので、次のページ遷移では再取得され、ログイン状態の変化も反映される。
let inflight: Promise<Account | null> | null = null;

function fetchAccount(): Promise<Account | null> {
  if (!inflight) {
    inflight = fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => (d.user ?? null) as Account | null)
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * ログイン中のアカウント情報を取得するフック。
 * ミドルウェアで全ページがログインゲートされているため、通常は必ず値が入るが、
 * 読み込み中は null を返す（未ログイン時の扱いはミドルウェア側の責務）。
 */
export function useAccount(): Account | null {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchAccount().then(async (user) => {
      if (user) await resetLocalDataIfUserChanged(user.id);
      if (!ignore) setAccount(user);
    });
    return () => {
      ignore = true;
    };
  }, []);

  return account;
}
