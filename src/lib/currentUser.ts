import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * リクエストのセッションCookieからログイン中のUser.idを取得する。
 *
 * 友達連携や時間割共有では「誰のデータか」をクライアントから送らせず、
 * 必ずここで導出した値を使うこと（他人のIDを送って成りすますことを防ぐ）。
 * ミドルウェアで /api/ 配下は認証済みだが、各ルートでも念のため確認する。
 */
export async function currentUserId(req: NextRequest): Promise<string | null> {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function currentUser(req: NextRequest) {
  const id = await currentUserId(req);
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
