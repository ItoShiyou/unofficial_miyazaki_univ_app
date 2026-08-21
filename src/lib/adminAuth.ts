import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * 管理APIのADMIN_SECRETによるBearer認証。
 * 実データレビューで、各ルートに重複していた `===` による単純な文字列比較は、
 * タイミング攻撃（比較にかかる時間の差から文字列を推測する攻撃）に理論上わずかに
 * 脆弱と指摘されたため、timingSafeEqualによる比較に統一した。
 */
export function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  // 長さが違うとtimingSafeEqualが例外を投げるため、先に長さを揃える。
  if (headerBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(headerBuf, expectedBuf);
}
