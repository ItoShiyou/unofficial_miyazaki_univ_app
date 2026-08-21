import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUser } from "@/lib/currentUser";

// 教科書の譲渡・売買掲示板。求人掲示板と異なり運営の事前確認なしに学生本人が
// 直接投稿するため、他大学への非表示（university一致）と、連絡先の開示範囲は
// 本人管理（自由入力）で金銭授受はアプリ外で行う設計とする。
const MAX_TITLE_LEN = 100;
const MAX_COURSE_NAME_LEN = 100;
const MAX_CONDITION_LEN = 200;
const MAX_CONTACT_LEN = 200;

export async function GET(req: NextRequest) {
  const me = await currentUser(req);
  if (!me) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const listings = await prisma.textbookListing.findMany({
    where: { university: me.university, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      courseName: l.courseName,
      price: l.price,
      condition: l.condition,
      contact: l.contact,
      createdAt: l.createdAt,
      mine: l.userId === me.id,
    })),
  });
}

export async function POST(req: NextRequest) {
  const me = await currentUser(req);
  if (!me) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { allowed, retryAfterMs } = checkRateLimit(`textbook-post:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "投稿が続いています。しばらく時間をおいてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const courseName = typeof body?.courseName === "string" ? body.courseName.trim() : "";
  const condition = typeof body?.condition === "string" ? body.condition.trim() : "";
  const contact = typeof body?.contact === "string" ? body.contact.trim() : "";
  const priceRaw = body?.price;

  if (!title || title.length > MAX_TITLE_LEN) {
    return NextResponse.json({ error: "教科書名を入力してください（100文字以内）。" }, { status: 400 });
  }
  if (courseName.length > MAX_COURSE_NAME_LEN) {
    return NextResponse.json({ error: "科目名が長すぎます。" }, { status: 400 });
  }
  if (condition.length > MAX_CONDITION_LEN) {
    return NextResponse.json({ error: "状態の説明が長すぎます。" }, { status: 400 });
  }
  if (!contact || contact.length > MAX_CONTACT_LEN) {
    return NextResponse.json({ error: "連絡方法を入力してください（200文字以内）。" }, { status: 400 });
  }

  let price: number | null = null;
  if (priceRaw !== null && priceRaw !== undefined && priceRaw !== "") {
    const n = Number(priceRaw);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) {
      return NextResponse.json({ error: "価格は0円以上100万円以下の整数で入力してください。" }, { status: 400 });
    }
    price = n;
  }

  const listing = await prisma.textbookListing.create({
    data: {
      userId: me.id,
      university: me.university,
      title,
      courseName: courseName || null,
      price,
      condition: condition || null,
      contact,
    },
  });

  return NextResponse.json({ id: listing.id });
}
