"use client";

import { useEffect, useState } from "react";

export interface Account {
  email: string;
  university: string;
  displayName: string | null;
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
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) setAccount(d.user ?? null);
      })
      .catch(() => {
        if (!ignore) setAccount(null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return account;
}
