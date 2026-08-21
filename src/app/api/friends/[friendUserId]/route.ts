import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// 友達関係の解除。実データレビューで、比較対象アプリ（すごい時間割・Penmark等）は
// いずれも友達関係を解除可能な設計になっている一方、本アプリには解除経路が
// 一切存在しなかったこと（招待コード受諾後は共有が永続的・一方的に解除不能）が
// 判明したため、双方向のFriendレコードを削除できるようにする。
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ friendUserId: string }> }
) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  const { allowed } = checkRateLimit(`unfriend:${clientIp(req)}`, 30, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }
  const { friendUserId } = await params;

  // 自分から見た関係・相手から見た関係の両方を消す（片方だけ残ると
  // 相手の時間割一覧に自分が残り続けてしまうため、必ず双方向で解除する）。
  await prisma.friend.deleteMany({
    where: {
      OR: [
        { userId, friendUserId },
        { userId: friendUserId, friendUserId: userId },
      ],
    },
  });

  return NextResponse.json({ ok: true });
}
