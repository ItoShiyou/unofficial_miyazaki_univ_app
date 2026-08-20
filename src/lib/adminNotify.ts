/**
 * 運営（開発者本人）への通知。メール送信基盤を新規に構築するコストを避けるため、
 * Discord（または互換のSlack incoming webhook）のWebhook URLを1本設定するだけで
 * 使える最小構成にする。DISCORD_ADMIN_WEBHOOK_URL未設定の環境では何もしない
 * （運用開始前・開発環境ではエラーにせず黙って無視する）。
 *
 * 失敗しても本来の処理（通報の記録・非表示化）をブロックしないよう、
 * 呼び出し側は結果を待たずfire-and-forgetで使うこと。
 */
export async function notifyAdmin(message: string): Promise<void> {
  const url = process.env.DISCORD_ADMIN_WEBHOOK_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  }).catch(() => {});
}
