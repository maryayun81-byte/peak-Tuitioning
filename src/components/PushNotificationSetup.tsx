'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function PushNotificationSetup() {
  const { profile } = useAuthStore()

  useEffect(() => {
    if (!profile?.id) return
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) return

    let cancelled = false

    const setup = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/peak-push-sw.js', { scope: '/' })
        const existing = await registration.pushManager.getSubscription()
        if (existing) return

        const permission = await Notification.requestPermission()
        if (permission !== 'granted' || cancelled) return

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })

        const json = subscription.toJSON()
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: { p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' },
            userAgent: navigator.userAgent,
          }),
        })
      } catch {
        // Push setup failed silently — user can enable from Messages
      }
    }

    const timer = setTimeout(setup, 3000)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [profile?.id])

  return null
}
