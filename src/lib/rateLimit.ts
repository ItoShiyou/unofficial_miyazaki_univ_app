/**
 * 簡易なメモリ内レート制限。ユーザー認証がないアプリのため、IPアドレスを
 * キーにして「短時間の連投・総当たり」を抑止する目的で使う。
 *
 * サーバーレス環境ではインスタンスごとにメモリが分かれるため完全な制限には
 * ならないが、単純な連打・スクリプトによる大量アクセスへの抑止力にはなる。
 * 本格的な対策が必要になった場合はRedis等の共有ストアに置き換えること。
 */

const buckets = new Map<string, number[]>();

// 呼び出しのたびに古いバケットを間引く（メモリリーク防止）
function prune(now: number) {
  for (const [key, timestamps] of buckets) {
    const fresh = timestamps.filter((t) => now - t < 24 * 60 * 60 * 1000);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}

let lastPrune = 0;

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  if (now - lastPrune > 60_000) {
    prune(now);
    lastPrune = now;
  }

  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - timestamps[0]);
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
