import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionTokenPayload, SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * リクエストのセッションCookieからログイン中のUser.idを取得する。
 *
 * 友達連携や時間割共有では「誰のデータか」をクライアントから送らせず、
 * 必ずここで導出した値を使うこと（他人のIDを送って成りすますことを防ぐ）。
 * ミドルウェアで /api/ 配下は認証済みだが、各ルートでも念のため確認する。
 *
 * トークン署名の検証に加え、User.sessionVersionとの照合をここで行う。
 * これにより、退会済みアカウント（Userが存在しない）や、パスワード変更後に
 * 無効化された古いトークン（sessionVersion不一致）が引き続き認証を通ってしまう
 * 問題を防ぐ（実データレビューで判明した設計上の懸念への対応）。
 */
export async function currentUserId(req: NextRequest): Promise<string | null> {
  const payload = await verifySessionTokenPayload(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { sessionVersion: true },
  });
  if (!user || user.sessionVersion !== payload.v) return null;
  return payload.uid;
}

export async function currentUser(req: NextRequest) {
  const id = await currentUserId(req);
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
