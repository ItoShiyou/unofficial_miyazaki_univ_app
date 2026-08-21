import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const friends = await prisma.friend.findMany({ where: { userId } });

  // 友達1人ずつfindUniqueするとN+1になるため、まとめて1回のfindManyで取得する
  const sharedTimetables = await prisma.sharedTimetable.findMany({
    where: { userId: { in: friends.map((f) => f.friendUserId) } },
  });
  const sharedByUserId = new Map(sharedTimetables.map((s) => [s.userId, s]));

  const withTimetables = friends.map((f) => {
    const shared = sharedByUserId.get(f.friendUserId);
    return {
      userId: f.friendUserId,
      name: f.friendName,
      timetable: shared ? JSON.parse(shared.data) : [],
      updatedAt: shared?.updatedAt ?? null,
    };
  });

  return NextResponse.json({ friends: withTimetables });
}
