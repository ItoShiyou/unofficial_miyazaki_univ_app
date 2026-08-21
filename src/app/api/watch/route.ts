import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// 「この授業のシラバス変更を通知してほしい」という意思表示の登録・解除。
// 時間割データ自体（曜日・時限・メモ等）はサーバーに送らない設計を維持するため、
// ここで受け取るのはシラバス由来の授業ID（syllabusCourseId）のみ。
export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const { allowed } = checkRateLimit(`watch:${clientIp(req)}`, 60, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const syllabusCourseId = typeof body?.syllabusCourseId === "string" ? body.syllabusCourseId : "";
  if (!syllabusCourseId) {
    return NextResponse.json({ error: "syllabusCourseId is required" }, { status: 400 });
  }

  await prisma.watchedCourse
    .upsert({
      where: { userId_syllabusCourseId: { userId, syllabusCourseId } },
      update: {},
      create: { userId, syllabusCourseId },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const { allowed } = checkRateLimit(`unwatch:${clientIp(req)}`, 60, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const syllabusCourseId = typeof body?.syllabusCourseId === "string" ? body.syllabusCourseId : "";
  if (!syllabusCourseId) {
    return NextResponse.json({ error: "syllabusCourseId is required" }, { status: 400 });
  }

  await prisma.watchedCourse.deleteMany({ where: { userId, syllabusCourseId } });
  return NextResponse.json({ ok: true });
}
