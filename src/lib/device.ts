"use client";

import { useSyncExternalStore } from "react";

// 友達連携の識別はアカウント（User.id）で行うため、端末ごとのIDは使わなくなった。
// 表示名だけは端末内に保持する（サーバーには友達に見せる用として送る）。
const DISPLAY_NAME_KEY = "miyadai-display-name";

export function getDisplayName(): string {
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
}

const listeners = new Set<() => void>();

export function setDisplayName(name: string) {
  localStorage.setItem(DISPLAY_NAME_KEY, name);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDisplayName(): string {
  return useSyncExternalStore(subscribe, getDisplayName, () => "");
}

// 卒業要件単位数の自己申告値。大学・学部・学科・入学年度でカリキュラムが異なり、
// アプリ側でこの値を判定・提案することはしない（サイクル134の判断を維持）。
// 学生が自分で入力した値と、既に取得した単位数（不可を除く）との単純な引き算・
// 割り算のみを行う設計にすることで、誤判定リスクを構造的に排除した（サイクル207）。
const TARGET_CREDITS_KEY = "miyadai-target-credits";

export function getTargetCredits(): number | null {
  const v = localStorage.getItem(TARGET_CREDITS_KEY);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

const targetCreditsListeners = new Set<() => void>();

export function setTargetCredits(value: number | null) {
  if (value === null) {
    localStorage.removeItem(TARGET_CREDITS_KEY);
  } else {
    localStorage.setItem(TARGET_CREDITS_KEY, String(value));
  }
  targetCreditsListeners.forEach((l) => l());
}

function subscribeTargetCredits(cb: () => void): () => void {
  targetCreditsListeners.add(cb);
  return () => targetCreditsListeners.delete(cb);
}

export function useTargetCredits(): number | null {
  return useSyncExternalStore(subscribeTargetCredits, getTargetCredits, () => null);
}
