import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/currentUser";

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const friends = await prisma.friend.findMany({ where: { userId } });

  const withTimetables = await Promise.all(
    friends.map(async (f) => {
      const shared = await prisma.sharedTimetable.findUnique({
        where: { userId: f.friendUserId },
      });
      return {
        userId: f.friendUserId,
        name: f.friendName,
        timetable: shared ? JSON.parse(shared.data) : [],
        updatedAt: shared?.updatedAt ?? null,
      };
    })
  );

  return NextResponse.json({ friends: withTimetables });
}
