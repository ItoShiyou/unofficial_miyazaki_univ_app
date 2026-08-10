export type SemesterName = "前期" | "後期";

export interface SemesterKey {
  year: number;
  semester: SemesterName;
}

export function currentSemester(): SemesterKey {
  const now = new Date();
  const month = now.getMonth() + 1;
  if (month >= 4 && month <= 9) {
    return { year: now.getFullYear(), semester: "前期" };
  }
  const year = month >= 10 ? now.getFullYear() : now.getFullYear() - 1;
  return { year, semester: "後期" };
}

export function semesterLabel(s: SemesterKey): string {
  return `${s.year}年度 ${s.semester}`;
}

export function adjacentSemester(s: SemesterKey, dir: 1 | -1): SemesterKey {
  if (dir === 1) {
    return s.semester === "前期"
      ? { year: s.year, semester: "後期" }
      : { year: s.year + 1, semester: "前期" };
  }
  return s.semester === "後期"
    ? { year: s.year, semester: "前期" }
    : { year: s.year - 1, semester: "後期" };
}

const KEY = "miyadai-current-semester";

export function loadSemester(): SemesterKey {
  if (typeof window === "undefined") return currentSemester();
  const raw = localStorage.getItem(KEY);
  if (!raw) return currentSemester();
  try {
    return JSON.parse(raw) as SemesterKey;
  } catch {
    return currentSemester();
  }
}

const listeners = new Set<() => void>();

export function saveSemester(s: SemesterKey) {
  localStorage.setItem(KEY, JSON.stringify(s));
  listeners.forEach((l) => l());
}

export function subscribeSemester(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
