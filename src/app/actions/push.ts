'use server'

import webPush from 'web-push'
import { createAdminClient } from '@/lib/supabase/server'

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webPush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@peakcampus.co.ke', publicKey, privateKey)
  return true
}

export async function sendPushNotification(
  userIds: string[],
  payload: { title: string; body: string; href?: string; icon?: string; badge?: string; tag?: string }
): Promise<{ attempted: number; sent: number; failed: number; reason?: string }> {
  const empty = (reason: string) => ({ attempted: 0, sent: 0, failed: 0, reason });
  if (!userIds || userIds.length === 0) return empty('no-recipients');
  if (!configureWebPush()) {
    console.warn('[Peak Push] Missing VAPID keys, push notifications disabled.')
    return empty('missing-vapid-keys');
  }

  const adminClient = await createAdminClient()

  // Fetch all subscriptions for the given users
  const { data: subscriptions, error } = await adminClient
    .from('peak_push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (error || !subscriptions || subscriptions.length === 0) {
    // QC: this used to fail SILENTLY, so "push not working" was undebuggable
    // (no subscriptions = user never enabled notifications on any device).
    // Vercel logs now say exactly that, naming the affected users.
    console.warn(`[Peak Push] No subscriptions for user(s): ${userIds.join(',')}${error ? ` (lookup: ${error.message})` : ''}`)
    return empty(error ? 'lookup-failed' : 'no-subscriptions');
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    href: payload.href || '/',
    tag: payload.tag || 'peak-update',
  })

  let sent = 0
  let failed = 0
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          notificationPayload
        )
        sent += 1
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          // Subscription expired or invalid, remove it
          await adminClient.from('peak_push_subscriptions').delete().eq('id', subscription.id)
          failed += 1
        } else {
          console.warn('[Peak Push] Delivery failed', error)
          failed += 1
        }
      }
    })
  )
  return { attempted: subscriptions.length, sent, failed }
}
