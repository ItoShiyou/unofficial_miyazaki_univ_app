import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { UNIVERSITIES } from "@/lib/universities";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

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
      mustChangePassword: user.mustChangePassword,
    },
  });
}

// サインアップ時に大学を選び間違えた場合の訂正手段。
// 授業カルテは匿名投稿でユーザーに紐付かないため、変更しても既存データの整合性は崩れない。
// 時間割等はブラウザのIndexedDBにローカル保存されており、大学が変わっても自動では移行されない
// （新しい大学のシラバスと紐付いていないだけで、手動入力データとしては引き続き参照できる）。
export async function PATCH(req: NextRequest) {
  const { allowed } = checkRateLimit(`change-university:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "しばらく時間をおいて再度お試しください。" }, { status: 429 });
  }

  const userId = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const university = typeof body?.university === "string" ? body.university : "";
  if (!UNIVERSITIES.some((u) => u.id === university)) {
    return NextResponse.json({ error: "大学を選択してください。" }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id: userId }, data: { university } });
  return NextResponse.json({ university: user.university });
}
