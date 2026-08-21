import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/currentUser";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// 使い始めてから一定期間経つまでは聞かない（インストール直後の感想は
// 「使い続けたいか」という問いの答えとして意味が薄いため）。
const MIN_ACCOUNT_AGE_DAYS = 3;

// 超軽量ヒアリング（1問アンケート）。アカウント作成から3日以上経っていて、
// まだ回答していないユーザーにのみ「聞く」よう促す。
export async function GET(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) {
    return NextResponse.json({ shouldAsk: false });
  }

  const accountAgeMs = Date.now() - user.createdAt.getTime();
  if (accountAgeMs < MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ shouldAsk: false });
  }

  const existing = await prisma.appSurveyResponse.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ shouldAsk: !existing });
}

export async function POST(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`app-survey:${clientIp(req)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const score = typeof body?.score === "number" ? Math.trunc(body.score) : NaN;
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: "scoreは1〜5の整数で指定してください。" }, { status: 400 });
  }
  const comment =
    typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) || null : null;

  await prisma.appSurveyResponse
    .create({ data: { userId: user.id, score, comment } })
    .catch(() => null); // 既に回答済み（unique制約）なら何もしない

  return NextResponse.json({ ok: true });
}
