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
// ?sort=clicks / ?sort=impressions / ?sort=reveals で並び替えられる（更新提案の優先順位づけ用）。
// 各件にctr（クリック数÷表示回数）とrevealRate（コード開封数÷表示回数）を付与する。
// 注意: ctrは表示形式の広告一般において低くなりやすい指標であり、単体では協賛企業への
// 効果訴求に使わないこと（実データレビュー済み、docs/autonomous_improvement_log.md サイクル11参照）。
// 管理者内部のトリアージ（クリックがほぼ無い協賛枠を見つける等）にのみ用いる。
// 協賛企業への説明にはimpressionCount（リーチ）とcodeRevealCount/revealRate（来店・購入意図）を主指標とする。
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sortParam = req.nextUrl.searchParams.get("sort");
  const orderBy =
    sortParam === "clicks"
      ? [{ clickCount: "desc" as const }]
      : sortParam === "impressions"
        ? [{ impressionCount: "desc" as const }]
        : sortParam === "reveals"
          ? [{ codeRevealCount: "desc" as const }]
          : [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }];

  const sponsors = await prisma.sponsor.findMany({
    orderBy,
    include: { _count: { select: { eventRsvps: true } } },
  });

  // イベント枠については、申込数だけでなく「実際に来場した数」も見せる
  // （ビジコンの検証計画Gate Bが測定項目に挙げる「申込→来場」の転換率のため）。
  const eventSponsorIds = sponsors.filter((s) => s.eventLabel).map((s) => s.id);
  const checkinCounts = eventSponsorIds.length
    ? await prisma.eventRsvp.groupBy({
        by: ["sponsorId"],
        where: { sponsorId: { in: eventSponsorIds }, checkedIn: true },
        _count: true,
      })
    : [];
  const checkinCountBySponsorId = new Map(checkinCounts.map((c) => [c.sponsorId, c._count]));

  const withMetrics = sponsors.map((s) => ({
    ...s,
    ctr:
      s.impressionCount > 0
        ? Math.round((s.clickCount / s.impressionCount) * 1000) / 10 // %表示（小数点1桁・内部トリアージ専用）
        : null,
    revealRate:
      s.impressionCount > 0
        ? Math.round((s.codeRevealCount / s.impressionCount) * 1000) / 10 // %表示（小数点1桁）
        : null,
    rsvpCount: s._count.eventRsvps,
    checkinCount: checkinCountBySponsorId.get(s.id) ?? 0,
  }));

  const summary = {
    totalSponsors: sponsors.length,
    activeSponsors: sponsors.filter((s) => s.isActive).length,
    totalImpressions: sponsors.reduce((sum, s) => sum + s.impressionCount, 0),
    totalClicks: sponsors.reduce((sum, s) => sum + s.clickCount, 0),
    totalCodeReveals: sponsors.reduce((sum, s) => sum + s.codeRevealCount, 0),
  };

  return NextResponse.json({ summary, sponsors: withMetrics });
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

  let endsAt: Date | null = null;
  if (typeof body?.endsAt === "string" && body.endsAt) {
    const parsed = new Date(body.endsAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "endsAt の日付形式が不正です" }, { status: 400 });
    }
    endsAt = parsed;
  }

  let eventAt: Date | null = null;
  if (typeof body?.eventAt === "string" && body.eventAt) {
    const parsed = new Date(body.eventAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "eventAt の日付形式が不正です" }, { status: 400 });
    }
    eventAt = parsed;
  }

  const sponsor = await prisma.sponsor
    .create({
      data: {
        name,
        category,
        description,
        offer: typeof body?.offer === "string" ? body.offer.trim() : null,
        url: typeof body?.url === "string" ? body.url.trim() : null,
        imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl.trim() : null,
        area: typeof body?.area === "string" ? body.area.trim() : null,
        couponCode: typeof body?.couponCode === "string" ? body.couponCode.trim() : null,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
        endsAt,
        eventLabel: typeof body?.eventLabel === "string" ? body.eventLabel.trim() || null : null,
        eventAt,
      },
    })
    .catch(() => null);
  if (!sponsor) {
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 400 });
  }

  return NextResponse.json({ sponsor }, { status: 201 });
}
