import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// 部分更新（掲載終了時は isActive: false にする、内容修正、表示順変更など）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const key of [
    "name",
    "category",
    "description",
    "offer",
    "url",
    "imageUrl",
    "area",
    "couponCode",
  ] as const) {
    if (typeof body[key] === "string") data[key] = body[key].trim();
  }
  if (body.eventLabel === null) {
    data.eventLabel = null;
  } else if (typeof body.eventLabel === "string") {
    data.eventLabel = body.eventLabel.trim() || null;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (body.endsAt === null) {
    data.endsAt = null;
  } else if (typeof body.endsAt === "string") {
    const parsed = new Date(body.endsAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "endsAt の日付形式が不正です" }, { status: 400 });
    }
    data.endsAt = parsed;
  }
  if (body.eventAt === null) {
    data.eventAt = null;
  } else if (typeof body.eventAt === "string") {
    const parsed = new Date(body.eventAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "eventAt の日付形式が不正です" }, { status: 400 });
    }
    data.eventAt = parsed;
  }

  const sponsor = await prisma.sponsor
    .update({ where: { id }, data })
    .catch(() => null);
  if (!sponsor) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ sponsor });
}

// 完全削除（掲載終了は isActive:false のPATCHを推奨。こちらはデータごと消す用途）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.sponsor.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
