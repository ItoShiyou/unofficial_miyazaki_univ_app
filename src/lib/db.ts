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
  color: string; // 背景色(pastel)
  textColor: string; // 文字色
  syllabusCourseId?: string; // カルテ機能用: サーバー側シラバスカタログとの紐付け
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

export interface CourseTask {
  id: string;
  courseId: string;
  title: string;
  dueDate?: string; // ISO date
  done: boolean;
  createdAt: number;
}

class MiyadaiDB extends Dexie {
  courses!: EntityTable<Course, "id">;
  attendances!: EntityTable<AttendanceRecord, "id">;
  notes!: EntityTable<CourseNote, "id">;
  tasks!: EntityTable<CourseTask, "id">;

  constructor() {
    super("miyadai-app");
    this.version(1).stores({
      courses: "id, weekday, period, year, semester",
      attendances: "id, courseId, date",
      notes: "id, courseId, date",
    });
    this.version(2).stores({
      courses: "id, weekday, period, year, semester",
      attendances: "id, courseId, date",
      notes: "id, courseId, date",
      tasks: "id, courseId, dueDate",
    });
    this.version(3).stores({
      courses: "id, weekday, period, [year+semester]",
      attendances: "id, courseId, date",
      notes: "id, courseId, date",
      tasks: "id, courseId, dueDate",
    });
  }
}

export const db = new MiyadaiDB();

export function newId(): string {
  return crypto.randomUUID();
}

export interface PastelColor {
  bg: string;
  text: string;
}

export const COURSE_COLORS: PastelColor[] = [
  { bg: "#dbeafe", text: "#1d4ed8" }, // blue
  { bg: "#dcfce7", text: "#15803d" }, // green
  { bg: "#fee2e2", text: "#b91c1c" }, // red
  { bg: "#ede9fe", text: "#6d28d9" }, // purple
  { bg: "#fef3c7", text: "#b45309" }, // amber
  { bg: "#cffafe", text: "#0e7490" }, // cyan
  { bg: "#fce7f3", text: "#be185d" }, // pink
  { bg: "#e2e8f0", text: "#334155" }, // slate
];
