import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isAuthorized } from "@/lib/adminAuth";

/**
 * パスワードを忘れた利用者に、運営が仮パスワードを発行するエンドポイント。
 *
 * メール送信基盤がないため「メールアドレスを入力したら画面に仮パスワードが出る」
 * 方式にはできない（それでは誰でも他人のアカウントを乗っ取れてしまう）。
 * 運営がLINEや対面で本人確認をしたうえでこのAPIを叩き、返ってきた仮パスワードを
 * 本人に直接伝える運用を前提にしている。
 *
 * ADMIN_SECRET を知っている人だけが実行できる。ログインセッションでは実行できない
 * （middlewareの認証を通さない代わりに、ここでBearerトークンを検証する）。
 */
export const dynamic = "force-dynamic";

// 紛らわしい文字（0/O、1/l/I）を除いた文字種。口頭やチャットで伝えることを想定。
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TEMP_PASSWORD_LENGTH = 12;
const VALID_HOURS = 24;

function generateTempPassword(): string {
  const bytes = randomBytes(TEMP_PASSWORD_LENGTH);
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "email は必須です" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "そのメールアドレスのアカウントは存在しません" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const expiresAt = new Date(Date.now() + VALID_HOURS * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      tempPasswordExpiresAt: expiresAt,
      // 仮パスワード発行はパスワードを忘れた（＝端末を紛失した等の可能性もある）場面
      // のため、念のため既存の全端末のセッションもここで無効化する
      sessionVersion: { increment: 1 },
    },
  });

  return NextResponse.json({
    email: user.email,
    tempPassword,
    expiresAt,
    note: `この仮パスワードは${VALID_HOURS}時間で失効します。本人に直接伝え、ログイン後すぐにパスワードを変更するよう案内してください。`,
  });
}
