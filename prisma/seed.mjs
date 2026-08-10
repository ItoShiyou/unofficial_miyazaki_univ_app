import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

const YEAR = 2025;
const SEMESTER = "後期";

const courses = [
  { name: "微分積分学", teacher: "佐藤一郎", room: "A101", weekday: "月", period: 1 },
  { name: "線形代数学", teacher: "田中花子", room: "B203", weekday: "火", period: 2 },
  { name: "英語I", teacher: "John Smith", room: "C301", weekday: "水", period: 3 },
  { name: "情報基礎", teacher: "鈴木健", room: "D402", weekday: "木", period: 4 },
  { name: "スポーツ科学", teacher: "高橋実", room: "体育館", weekday: "金", period: 5 },
  { name: "統計学入門", teacher: "伊藤誠", room: "E305", weekday: "木", period: 3 },
  { name: "プログラミング演習", teacher: "渡辺learning", room: "PC教室1", weekday: "月", period: 3 },
  { name: "化学基礎", teacher: "小林修", room: "F102", weekday: "水", period: 1 },
];

function hashOf(c) {
  return createHash("sha256")
    .update(`${c.name}|${c.teacher}|${c.room}`)
    .digest("hex");
}

async function main() {
  for (const c of courses) {
    const existing = await prisma.syllabusCourse.findFirst({
      where: { name: c.name, year: YEAR, semester: SEMESTER },
    });
    if (existing) continue;
    const created = await prisma.syllabusCourse.create({
      data: {
        year: YEAR,
        semester: SEMESTER,
        name: c.name,
        teacher: c.teacher,
        room: c.room,
        weekday: c.weekday,
        period: c.period,
        rawHash: hashOf(c),
      },
    });

    if (c.name === "線形代数学") {
      await prisma.courseKarte.createMany({
        data: [
          {
            syllabusCourseId: created.id,
            year: YEAR,
            semester: SEMESTER,
            attendanceMethod: "毎回：出席カードで確認",
            attendanceStrictness: 4,
            assignmentVolume: 3,
            examFormat: "期末試験（記述・計算）",
            examDifficulty: 4,
            clarity: 4,
            atmosphere: "静かで真面目な雰囲気",
            pace: "板書中心。後半は少し速くなる。",
            advice: "前半のうちにしっかり復習しておくと良い。",
            comment: "課題は毎回小レポートがあるが、内容は基礎的。",
          },
          {
            syllabusCourseId: created.id,
            year: YEAR,
            semester: SEMESTER,
            attendanceMethod: "毎回：出席カードで確認",
            attendanceStrictness: 4,
            assignmentVolume: 3,
            examFormat: "期末試験（記述・計算）",
            examDifficulty: 3,
            clarity: 4,
            atmosphere: "質問しやすい",
            pace: "ちょうどいいペース",
            advice: "行列の計算に慣れておくと期末が楽。",
            comment: "先生がとても丁寧で分かりやすかった。",
          },
        ],
      });
    }
  }
  console.log("seed done");
}

main().finally(() => prisma.$disconnect());
