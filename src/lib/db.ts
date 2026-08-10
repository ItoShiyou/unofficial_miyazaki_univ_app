import Dexie, { type EntityTable } from "dexie";

export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface Course {
  id: string;
  name: string;
  teacher?: string;
  room?: string;
  weekday: Weekday;
  period: number; // 1〜6限
  year: number;
  semester: "前期" | "後期" | "通年";
  absenceLimit: number; // 欠席上限回数
  color: string;
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  courseId: string;
  date: string; // ISO date (YYYY-MM-DD)
  status: "absent" | "late";
  createdAt: number;
}

export interface CourseNote {
  id: string;
  courseId: string;
  date: string; // ISO date
  content: string;
  nextPreview?: string; // 次回予告
  createdAt: number;
  updatedAt: number;
}

class MiyadaiDB extends Dexie {
  courses!: EntityTable<Course, "id">;
  attendances!: EntityTable<AttendanceRecord, "id">;
  notes!: EntityTable<CourseNote, "id">;

  constructor() {
    super("miyadai-app");
    this.version(1).stores({
      courses: "id, weekday, period, year, semester",
      attendances: "id, courseId, date",
      notes: "id, courseId, date",
    });
  }
}

export const db = new MiyadaiDB();

export function newId(): string {
  return crypto.randomUUID();
}

export const COURSE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
];
