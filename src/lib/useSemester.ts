"use client";

import { useSyncExternalStore } from "react";
import { currentSemester, loadSemester, subscribeSemester, type SemesterKey } from "./semester";

let cachedKey = "";
let cachedValue: SemesterKey = currentSemester();

function getSnapshot(): SemesterKey {
  const next = loadSemester();
  const key = `${next.year}-${next.semester}`;
  if (key !== cachedKey) {
    cachedKey = key;
    cachedValue = next;
  }
  return cachedValue;
}

const serverSnapshot = currentSemester();
function getServerSnapshot(): SemesterKey {
  return serverSnapshot;
}

export function useCurrentSemester(): SemesterKey {
  return useSyncExternalStore(subscribeSemester, getSnapshot, getServerSnapshot);
}
