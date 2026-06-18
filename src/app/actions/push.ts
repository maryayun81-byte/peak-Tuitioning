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
) {
  if (!userIds || userIds.length === 0) return
  if (!configureWebPush()) {
    console.warn('[Peak Push] Missing VAPID keys, push notifications disabled.')
    return
  }

  const adminClient = await createAdminClient()

  // Fetch all subscriptions for the given users
  const { data: subscriptions, error } = await adminClient
    .from('peak_push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (error || !subscriptions || subscriptions.length === 0) {
    return
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    href: payload.href || '/',
    tag: payload.tag || 'peak-update',
  })

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
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          // Subscription expired or invalid, remove it
          await adminClient.from('peak_push_subscriptions').delete().eq('id', subscription.id)
        } else {
          console.warn('[Peak Push] Delivery failed', error)
        }
      }
    })
  )
}
