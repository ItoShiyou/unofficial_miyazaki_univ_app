import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/currentUser";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// 投稿者本人のみが自分の掲示（譲渡済み・削除）を取り下げられる。
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser(req);
  if (!me) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const { allowed } = checkRateLimit(`textbook-delete:${clientIp(req)}`, 30, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const { id } = await params;
  const listing = await prisma.textbookListing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (listing.userId !== me.id) {
    return NextResponse.json({ error: "自分の投稿のみ削除できます。" }, { status: 403 });
  }

  await prisma.textbookListing.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
