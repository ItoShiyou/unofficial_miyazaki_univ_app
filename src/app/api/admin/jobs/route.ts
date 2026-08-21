import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 求人・インターン・説明会掲示板の管理用API（ADMIN_SECRETによるBearer認証、
 * issue-temp-password・admin/sponsorsと同じ方式）。
 * UI画面は用意せず、運営がcurl等で直接操作する運用を前提にしている。
 */
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const VALID_POSTING_TYPES = ["job", "internship", "info_session"] as const;

// 一覧（非公開分・期限切れ分も含めて全件）
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.jobPosting.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const summary = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter((j) => j.isActive).length,
    totalImpressions: jobs.reduce((sum, j) => sum + j.impressionCount, 0),
    totalClicks: jobs.reduce((sum, j) => sum + j.clickCount, 0),
  };

  return NextResponse.json({ summary, jobs });
}

// 新規登録
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const jobType = typeof body?.jobType === "string" ? body.jobType.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const applicationUrl = typeof body?.applicationUrl === "string" ? body.applicationUrl.trim() : "";

  if (!companyName || !jobType || !description || !applicationUrl) {
    return NextResponse.json(
      { error: "companyName, jobType, description, applicationUrl は必須です" },
      { status: 400 }
    );
  }

  const postingType =
    typeof body?.postingType === "string" &&
    VALID_POSTING_TYPES.includes(body.postingType as (typeof VALID_POSTING_TYPES)[number])
      ? body.postingType
      : "job";

  let deadline: Date | null = null;
  if (typeof body?.deadline === "string" && body.deadline) {
    const parsed = new Date(body.deadline);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "deadline の日付形式が不正です" }, { status: 400 });
    }
    deadline = parsed;
  }

  const job = await prisma.jobPosting
    .create({
      data: {
        companyName,
        jobType,
        description,
        applicationUrl,
        postingType,
        industry: typeof body?.industry === "string" ? body.industry.trim() : null,
        location: typeof body?.location === "string" ? body.location.trim() : null,
        employmentType: typeof body?.employmentType === "string" ? body.employmentType.trim() : null,
        workPeriod: typeof body?.workPeriod === "string" ? body.workPeriod.trim() : null,
        targetGrade: typeof body?.targetGrade === "string" ? body.targetGrade.trim() : null,
        area: typeof body?.area === "string" ? body.area.trim() : null,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
        deadline,
      },
    })
    .catch(() => null);
  if (!job) {
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 400 });
  }

  return NextResponse.json({ job }, { status: 201 });
}
