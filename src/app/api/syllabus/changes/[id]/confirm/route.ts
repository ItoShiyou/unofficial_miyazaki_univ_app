import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUserId } from "@/lib/currentUser";

// シラバス変更検知（自動抽出）に対して、実際にその授業を見た学生が
// 「今日も同じ内容だった／もう変わっていた」を1タップで裏付ける。
// ログイン必須（匿名の乱数投票を避け、アカウント単位で連投を抑止する）。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(`syllabus-change-confirm:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "確認が続いています。しばらく時間をおいてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const body = await req.json().catch(() => null);
  const agree = body?.agree;
  if (typeof agree !== "boolean") {
    return NextResponse.json({ error: "agree(true/false)を指定してください" }, { status: 400 });
  }

  const { id } = await params;
  const change = await prisma.syllabusChange
    .update({
      where: { id },
      data: agree ? { confirmCount: { increment: 1 } } : { refuteCount: { increment: 1 } },
    })
    .catch(() => null);
  if (!change) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ confirmCount: change.confirmCount, refuteCount: change.refuteCount });
}
