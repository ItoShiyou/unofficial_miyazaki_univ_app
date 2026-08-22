import Dexie, { type EntityTable } from "dexie";

export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const GRADES = ["秀", "優", "良", "可", "不可"] as const;
export type Grade = (typeof GRADES)[number];

export interface Course {
  id: string;
  name: string;
  teacher?: string;
  room?: string;
  weekday: Weekday;
  period: number; // 1〜5限（宮崎大学の公式時限。詳細は @/lib/periods）
  year: number;
  semester: "前期" | "後期" | "通年";
  absenceLimit: number; // 欠席上限回数
  credits?: number; // 単位数（自己入力）
  grade?: Grade; // 成績（自己入力）。未設定＝履修中／未判定
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

// 実データレビューで、全国大学生協連「第61回学生生活実態調査」（2024年10-11月・
// 約1.2万人回答）にて「生活費・お金の悩み」が学生の悩みで最多と確認され、
// Yahoo!知恵袋にも「学生向けの家計簿アプリってありますか」という実質問が
// 見つかったことを根拠に追加した。時間割等の個人データと同様、金銭情報は
// 特に機微なため、サーバーには一切送信せずローカル（IndexedDB）のみで完結させる。
// 「サークル・部活」を追加（サイクル206）。知恵袋に「合宿費が1.5万円と言われたが
// 追加料金が嵩み2.5万円になった」等の実例があり、遠征・合宿費のような単発の大型出費が
// 既存の「その他」に埋没して見えなくなる問題があった。事前の総額見積もりの不確実性
// 自体は個人の家計簿アプリでは解決できない（幹事側の課題）ため見送ったが、発生した
// 支出を後から見返せるようカテゴリを分ける軽微な対応にとどめた。
export const EXPENSE_CATEGORIES = [
  "食費",
  "家賃",
  "光熱費",
  "通信・サブスク",
  "交通",
  "娯楽",
  "交際費",
  "サークル・部活",
  "教材・書籍",
  "その他",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface MoneyEntry {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  type: "expense" | "income";
  amount: number; // 円
  category: ExpenseCategory; // type="income"の場合は"その他"を流用（バイト代・仕送り等はmemoで区別）
  memo?: string;
  createdAt: number;
}

export interface ExamSlot {
  id: string;
  courseId?: string; // 登録済みの授業と紐付ける場合（未設定なら手動入力の予定）
  title: string; // 授業名・試験名
  date: string; // ISO date (YYYY-MM-DD)
  startTime?: string; // "13:00" 等
  endTime?: string;
  room?: string;
  note?: string;
  year: number;
  semester: "前期" | "後期" | "通年";
  createdAt: number;
}

class MiyadaiDB extends Dexie {
  courses!: EntityTable<Course, "id">;
  attendances!: EntityTable<AttendanceRecord, "id">;
  notes!: EntityTable<CourseNote, "id">;
  tasks!: EntityTable<CourseTask, "id">;
  examSlots!: EntityTable<ExamSlot, "id">;
  moneyEntries!: EntityTable<MoneyEntry, "id">;

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
    this.version(4).stores({
      courses: "id, weekday, period, [year+semester]",
      attendances: "id, courseId, date",
      notes: "id, courseId, date",
      tasks: "id, courseId, dueDate",
      examSlots: "id, date, [year+semester]",
    });
    this.version(5).stores({
      courses: "id, weekday, period, [year+semester]",
      attendances: "id, courseId, date",
      notes: "id, courseId, date",
      tasks: "id, courseId, dueDate",
      examSlots: "id, courseId, date, [year+semester]",
    });
    this.version(6).stores({
      courses: "id, weekday, period, [year+semester]",
      attendances: "id, courseId, date",
      notes: "id, courseId, date",
      tasks: "id, courseId, dueDate",
      examSlots: "id, courseId, date, [year+semester]",
      moneyEntries: "id, date, type, category",
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
