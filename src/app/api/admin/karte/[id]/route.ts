import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// 通報された授業カルテを確認したうえでの判断（復元 or 削除）。
// body.action: "restore"（非表示を解除し、以後すぐ再非表示にならないよう通報数もリセット）
//            | "delete"（内容を確認のうえ、悪質だったため完全削除）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (body?.action === "restore") {
    // reportCount/reportReasonsのリセットに合わせて、通報レコード（KarteReport）も
    // 削除しておく。残したままだと、restore後に同じ利用者が改めて通報しようとしても
    // unique制約で弾かれ続けてしまい、reportCountとの整合が取れなくなるため。
    const karte = await prisma.$transaction(async (tx) => {
      await tx.karteReport.deleteMany({ where: { courseKarteId: id } });
      return tx.courseKarte.update({
        where: { id },
        data: { hidden: false, reportCount: 0, reportReasons: [] },
      });
    }).catch(() => null);
    if (!karte) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ karte });
  }

  if (body?.action === "delete") {
    await prisma.courseKarte.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action must be 'restore' or 'delete'" }, { status: 400 });
}
