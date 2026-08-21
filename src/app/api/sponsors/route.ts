import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { currentUserId } from "@/lib/currentUser";

// 地域協賛枠の一覧を返す。学生から課金しない代わりの収益源であり、
// 広告ではなく「宮崎県内の学生生活で使える店舗・企業」として提示する。
export async function GET(req: NextRequest) {
  const now = new Date();
  const sponsors = await prisma.sponsor.findMany({
    where: {
      isActive: true,
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  // 将来、協賛企業へ「実際に何回表示されたか」を示せるようにするための表示回数計測。
  // レスポンスは待たせず、加算は裏で行う。
  // impressionCountも協賛企業への効果訴求に使う数値のため、同一IPからの連続取得で
  // 際限なく水増しできないよう、加算のみレート制限する（一覧の取得自体は制限しない）。
  const { allowed } = checkRateLimit(`sponsor-impression:${clientIp(req)}`, 10, 60_000);
  if (allowed && sponsors.length > 0) {
    prisma.sponsor
      .updateMany({
        where: { id: { in: sponsors.map((s) => s.id) } },
        data: { impressionCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  // ログイン中であれば、自分がイベントに申込・来場済みかどうかも一緒に返す
  // （/sponsorsは未ログインでも見られる公開ページのため、ログインは必須にしない）。
  const userId = await currentUserId(req);
  const myRsvpBySponsorId = new Map<string, { checkedIn: boolean }>();
  if (userId) {
    const eventSponsorIds = sponsors.filter((s) => s.eventLabel).map((s) => s.id);
    if (eventSponsorIds.length > 0) {
      const myRsvps = await prisma.eventRsvp.findMany({
        where: { userId, sponsorId: { in: eventSponsorIds } },
      });
      for (const r of myRsvps) myRsvpBySponsorId.set(r.sponsorId, { checkedIn: r.checkedIn });
    }
  }

  // couponCodeは「開封」操作を経て初めて渡す（一覧取得時点では見せない）。
  const publicSponsors = sponsors.map((s) => {
    const { couponCode, codeRevealCount, ...rest } = s;
    void codeRevealCount;
    const myRsvp = myRsvpBySponsorId.get(s.id) ?? null;
    return {
      ...rest,
      hasCoupon: Boolean(couponCode),
      rsvped: !!myRsvp,
      checkedIn: myRsvp?.checkedIn ?? false,
    };
  });

  return NextResponse.json({ sponsors: publicSponsors });
}
