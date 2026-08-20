import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 地域協賛枠の管理用API（ADMIN_SECRETによるBearer認証、issue-temp-passwordと同じ方式）。
 * UI画面は用意せず、運営がcurl等で直接操作する運用を前提にしている。
 */
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// 一覧（非公開分・期限切れ分も含めて全件。管理側で状況を把握するため）
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sponsors = await prisma.sponsor.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ sponsors });
}

// 新規登録
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!name || !category || !description) {
    return NextResponse.json(
      { error: "name, category, description は必須です" },
      { status: 400 }
    );
  }

  const sponsor = await prisma.sponsor.create({
    data: {
      name,
      category,
      description,
      offer: typeof body?.offer === "string" ? body.offer.trim() : null,
      url: typeof body?.url === "string" ? body.url.trim() : null,
      imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl.trim() : null,
      area: typeof body?.area === "string" ? body.area.trim() : null,
      sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
      endsAt: typeof body?.endsAt === "string" ? new Date(body.endsAt) : null,
    },
  });

  return NextResponse.json({ sponsor }, { status: 201 });
}
