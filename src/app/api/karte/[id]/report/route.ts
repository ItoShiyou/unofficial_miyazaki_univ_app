import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { notifyAdmin } from "@/lib/adminNotify";
import { currentUserId } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

// 匿名投稿である授業カルテは、特定の教員・授業への誹謗中傷に使われるリスクがある。
// 一定数の通報が集まった投稿は運営の確認を待たず自動的に非表示にし、被害の拡大を抑える。
// 通報の乱用（特定投稿を狙い撃ちで消す嫌がらせ）を防ぐため、IPごとの通報回数もレート制限する。
//
// 実データレビューで、報告数のみによる自動非表示は集団による悪意ある通報（brigading）で
// 正当な投稿も消せてしまう弱点だと判明した。RateMyProfessors・Penmark等の実際のサービスは
// いずれも人間によるレビューを経てから対応しており、これに倣い、
// (1) 通報理由の選択を必須化し、(2) 非表示はあくまで運営確認待ちの一時的な保留として扱う
// （`/api/admin/karte`で管理者が内容を確認し、復元または削除を判断する）。
const HIDE_THRESHOLD = 3;
const VALID_REASONS = ["defamation", "harassment", "spam", "other"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(`karte-report:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "通報が続いています。しばらく時間をおいてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const body = await req.json().catch(() => null);
  const reason = body?.reason;
  if (typeof reason !== "string" || !VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
    return NextResponse.json(
      { error: "通報理由を選択してください" },
      { status: 400 }
    );
  }

  const { id } = await params;

  // 同一ユーザーが同じ投稿に何度も通報し、HIDE_THRESHOLDを連打だけで
  // 超えさせてしまわないよう、ユーザーごとに1回までの制約をDBのunique制約
  // （KarteReport）で担保する。
  const existingReport = await prisma.karteReport.findUnique({
    where: { courseKarteId_userId: { courseKarteId: id, userId } },
  });
  if (existingReport) {
    return NextResponse.json({ error: "この投稿には既に通報済みです" }, { status: 409 });
  }

  const karte = await prisma.$transaction(async (tx) => {
    await tx.karteReport.create({ data: { courseKarteId: id, userId, reason } });
    return tx.courseKarte.update({
      where: { id },
      data: {
        reportCount: { increment: 1 },
        reportReasons: { push: reason },
      },
    });
  }).catch(() => null);
  if (!karte) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (karte.reportCount >= HIDE_THRESHOLD && !karte.hidden) {
    await prisma.courseKarte.update({ where: { id }, data: { hidden: true } });
    // 運営（自分）が能動的に管理APIを定期確認しなくても気付けるよう、
    // 一時的に保留した時点で通知する。応答は待たない（失敗しても通報自体は成立させる）。
    notifyAdmin(
      `⚠️ 授業カルテが通報により一時非表示になりました（ID: ${id}, 通報${karte.reportCount}件）。` +
        `\`/api/admin/karte\`で内容を確認し、復元か削除かを判断してください。`
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
