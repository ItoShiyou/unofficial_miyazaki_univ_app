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
