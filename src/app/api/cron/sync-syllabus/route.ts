import { NextRequest, NextResponse } from "next/server";
import { currentSemester } from "@/lib/semester";
import { runFullSemesterSync } from "@/lib/syllabusSync";

/**
 * 学期に一度、サーバー側の判断のみでシラバスを全件同期するエンドポイント。
 *
 * - クライアント（ブラウザ）からは呼び出せない。CRON_SECRET を知っている
 *   呼び出し元（Vercel Cron 等のスケジューラ）だけが実行できる。
 * - 対象の年度・学期はリクエストの引数ではなく、サーバーの現在時刻から
 *   自動的に決定する（クライアントが指定することはできない）。
 * - 実行タイミングは vercel.json の crons 設定（4/1・10/1）を参照。
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // シークレット未設定の環境では常に拒否する
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { year, semester } = currentSemester();

  try {
    const result = await runFullSemesterSync(year, semester);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: `シラバスの取得に失敗しました: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }
}
