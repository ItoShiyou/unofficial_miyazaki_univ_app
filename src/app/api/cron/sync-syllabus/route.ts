import { NextRequest, NextResponse } from "next/server";
import { currentSemester } from "@/lib/semester";
import { runFullSemesterSync, supportsSyllabusSync } from "@/lib/syllabusSync";
import { notifyAdmin } from "@/lib/adminNotify";

// 全件取得は1学期あたり30秒前後かかるため、デフォルトの実行時間上限では
// 途中で打ち切られる可能性がある。Vercel Hobby/Proの範囲で余裕を持たせる。
export const maxDuration = 60;
// cronからのみ叩かれる非キャッシュ対象のエンドポイント
export const dynamic = "force-dynamic";

/**
 * 学期に一度、サーバー側の判断のみでシラバスを全件同期するエンドポイント。
 *
 * - クライアント（ブラウザ）からは呼び出せない。CRON_SECRET を知っている
 *   呼び出し元（Vercel Cron 等のスケジューラ）だけが実行できる。
 * - 対象の年度・学期はリクエストの引数ではなく、サーバーの現在時刻から
 *   自動的に決定する（クライアントが指定することはできない）。
 * - 対象の大学は ?university=<id> クエリで指定する（省略時は宮崎大学）。
 *   大学ごとにシラバスサイトの構造が全く異なり、1リクエストあたりの
 *   処理時間もmaxDurationの制約を受けるため、1回のcron実行につき1大学のみ
 *   同期する設計にしている。複数大学の同期はvercel.json側で大学ごとに
 *   別のcronエントリ（パス末尾のクエリが異なる）を用意することで実現する。
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
  const university = req.nextUrl.searchParams.get("university") ?? "miyazaki-u";

  if (!supportsSyllabusSync(university)) {
    return NextResponse.json({ error: `未対応の大学です: ${university}` }, { status: 400 });
  }

  try {
    const result = await runFullSemesterSync(university, year, semester);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // 実データレビューで、このcronは学期に1回しか実行されず、失敗しても
    // 誰も気づかない「サイレント失敗」のリスクが指摘されたため、運営（自分）へ
    // 通知する。応答は待たない（失敗しても呼び出し元へのエラー応答自体は成立させる）。
    notifyAdmin(
      `⚠️ シラバス同期に失敗しました（大学: ${university}, ${year}年度${semester}）。\n${message}`
    ).catch(() => {});
    return NextResponse.json(
      { error: `シラバスの取得に失敗しました: ${message}` },
      { status: 502 }
    );
  }
}
