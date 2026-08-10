import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  const friends = await prisma.friend.findMany({ where: { deviceId } });

  const withTimetables = await Promise.all(
    friends.map(async (f) => {
      const shared = await prisma.sharedTimetable.findUnique({
        where: { deviceId: f.friendDeviceId },
      });
      return {
        deviceId: f.friendDeviceId,
        name: f.friendName,
        timetable: shared ? JSON.parse(shared.data) : [],
        updatedAt: shared?.updatedAt ?? null,
      };
    })
  );

  return NextResponse.json({ friends: withTimetables });
}
