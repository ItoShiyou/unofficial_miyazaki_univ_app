import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      university: user.university,
      displayName: user.displayName,
    },
  });
}
