import { db, newId, COURSE_COLORS, WEEKDAYS, type Course, type Weekday } from "@/lib/db";
import type { SemesterKey } from "@/lib/semester";
import { PERIODS } from "@/lib/periods";

const HEADER = ["授業名", "曜日", "時限", "教員", "教室", "欠席上限", "単位数"];

// 実データレビューで、科目名等の自由入力値が`=`/`+`/`-`/`@`で始まる場合、
// このCSVを他人がExcel/Googleスプレッドジートで開くとセルが数式として解釈され、
// 外部URLへのデータ流出等につながりうる「CSVインジェクション」のリスクが
// 指摘されたため、先頭にシングルクォートを付与して数式解釈を防ぐ。
function csvEscape(v: string): string {
  const escaped = /^[=+\-@]/.test(v) ? `'${v}` : v;
  if (/[",\n]/.test(escaped)) return `"${escaped.replace(/"/g, '""')}"`;
  return escaped;
}

export function exportTimetableCsv(courses: Course[]) {
  const rows = [
    HEADER,
    ...courses.map((c) => [
      c.name,
      c.weekday,
      String(c.period),
      c.teacher ?? "",
      c.room ?? "",
      String(c.absenceLimit),
      c.credits != null ? String(c.credits) : "",
    ]),
  ];
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "timetable.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export async function importTimetableCsv(
  text: string,
  semester: SemesterKey
): Promise<{ imported: number; skipped: number; conflicted: number }> {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  let imported = 0;
  let skipped = 0;
  let conflicted = 0;

  const existing = await db.courses
    .where("[year+semester]")
    .equals([semester.year, semester.semester])
    .toArray();
  const occupied = new Set(existing.map((c) => `${c.weekday}${c.period}`));

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const [name, weekdayRaw, periodRaw, teacher, room, limitRaw, creditsRaw] = cols;
    if (!name?.trim() || !weekdayRaw || !periodRaw) {
      skipped++;
      continue;
    }
    const weekday = weekdayRaw.trim() as Weekday;
    if (!WEEKDAYS.includes(weekday)) {
      skipped++;
      continue;
    }
    const period = Number(periodRaw);
    if (!period || !(PERIODS as readonly number[]).includes(period)) {
      skipped++;
      continue;
    }

    const slotKey = `${weekday}${period}`;
    if (occupied.has(slotKey)) {
      conflicted++;
      continue;
    }

    const palette = COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)];
    await db.courses.add({
      id: newId(),
      name: name.trim(),
      teacher: teacher?.trim() || undefined,
      room: room?.trim() || undefined,
      weekday,
      period,
      year: semester.year,
      semester: semester.semester,
      absenceLimit: limitRaw?.trim() && Number(limitRaw) >= 0 ? Number(limitRaw) : 5,
      credits: creditsRaw && Number(creditsRaw) > 0 ? Number(creditsRaw) : undefined,
      color: palette.bg,
      textColor: palette.text,
      createdAt: Date.now(),
    });
    occupied.add(slotKey);
    imported++;
  }

  return { imported, skipped, conflicted };
}
