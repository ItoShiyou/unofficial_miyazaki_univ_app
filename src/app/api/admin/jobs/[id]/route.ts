import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { containsSalaryFigure } from "@/lib/jobPostingValidation";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const VALID_POSTING_TYPES = ["job", "internship", "info_session"] as const;

// 部分更新（掲載終了時は isActive: false にする、内容修正、表示順変更など）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const key of [
    "companyName",
    "industry",
    "jobType",
    "description",
    "location",
    "employmentType",
    "workPeriod",
    "targetGrade",
    "area",
  ] as const) {
    if (typeof body[key] === "string") data[key] = body[key].trim();
  }

  // applicationUrlは「アプリ内応募機能を持たない」という設計の要（学生は必ずここへ誘導される）
  // であるため、他の項目と違って空文字での上書きを許さない。
  if (typeof body.applicationUrl === "string") {
    const url = body.applicationUrl.trim();
    if (!url) {
      return NextResponse.json({ error: "applicationUrl を空にすることはできません" }, { status: 400 });
    }
    data.applicationUrl = url;
  }

  for (const key of ["description", "employmentType"] as const) {
    const value = data[key];
    if (typeof value === "string" && containsSalaryFigure(value)) {
      return NextResponse.json(
        { error: `${key} に金額の断定的な記載は避けてください（募集情報等提供としての位置づけを保つため）` },
        { status: 400 }
      );
    }
  }
  if (
    typeof body.postingType === "string" &&
    VALID_POSTING_TYPES.includes(body.postingType as (typeof VALID_POSTING_TYPES)[number])
  ) {
    data.postingType = body.postingType;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.featured === "boolean") data.featured = body.featured;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (body.deadline === null) {
    data.deadline = null;
  } else if (typeof body.deadline === "string") {
    const parsed = new Date(body.deadline);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "deadline の日付形式が不正です" }, { status: 400 });
    }
    data.deadline = parsed;
  }

  const job = await prisma.jobPosting
    .update({ where: { id }, data })
    .catch(() => null);
  if (!job) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ job });
}

// 完全削除（掲載終了は isActive:false のPATCHを推奨。こちらはデータごと消す用途）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.jobPosting.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
