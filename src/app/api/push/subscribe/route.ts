import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";
import { pushNotificationsEnabled } from "@/lib/webPush";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const { allowed } = checkRateLimit(`push-subscribe:${clientIp(req)}`, 30, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }
  if (!pushNotificationsEnabled()) {
    return NextResponse.json({ error: "プッシュ通知は現在利用できません。" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh, auth },
    create: { userId, endpoint, p256dh, auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const { allowed } = checkRateLimit(`push-unsubscribe:${clientIp(req)}`, 30, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // 自分の購読だけを解除できるよう、userIdも条件に含める
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  return NextResponse.json({ ok: true });
}
