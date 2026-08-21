import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    "mailto:miyadai-fukoushiki@example.com",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

export function pushNotificationsEnabled(): boolean {
  return ensureConfigured();
}

/**
 * 指定したユーザーたち全員の全端末へプッシュ通知を送る。
 * 送信に失敗した購読（410 Gone等、端末側で購読解除済み）は自動的にDBから削除し、
 * 無効な購読へ通知を送り続けないようにする。1件の失敗が他の送信を止めないよう、
 * 個別にcatchして継続する。
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!ensureConfigured() || userIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
