"use client";

import { useSyncExternalStore } from "react";

const DEVICE_ID_KEY = "miyadai-device-id";
const DISPLAY_NAME_KEY = "miyadai-display-name";

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

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
