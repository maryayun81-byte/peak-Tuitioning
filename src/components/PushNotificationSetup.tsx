'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Bell, X } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function PushNotificationSetup() {
  const { profile } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'granted' | 'denied' | 'prompt'>('loading')
  const [dismissed, setDismissed] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('denied')
      return
    }

    navigator.serviceWorker.register('/peak-push-sw.js', { scope: '/' }).then(registration => {
      registration.pushManager.getSubscription().then(existing => {
        if (existing) {
          setStatus('granted')
        } else if (Notification.permission === 'granted') {
          subscribe(registration)
        } else if (Notification.permission === 'denied') {
          setStatus('denied')
        } else {
          setStatus('prompt')
        }
      })
    }).catch(() => {
      setStatus('denied')
    })
  }, [profile?.id])

  const subscribe = useCallback(async (registration?: ServiceWorkerRegistration) => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey || !registration) return
    setRegistering(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); setRegistering(false); return }

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
      setStatus('granted')
    } catch {
      setStatus('denied')
    } finally {
      setRegistering(false)
    }
  }, [])

  const handleEnable = useCallback(async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) return
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/peak-push-sw.js')
      if (registration) {
        await subscribe(registration)
      } else {
        navigator.serviceWorker.register('/peak-push-sw.js', { scope: '/' }).then(subscribe)
      }
    }
  }, [subscribe])

  if (status !== 'prompt' || dismissed) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-2xl shadow-2xl border p-4 backdrop-blur-xl"
        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--input)] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0" style={{ color: 'var(--primary)' }}>
            <Bell size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Stay informed</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Get notified when teachers send messages, return assignments, post quizzes, and more — even when you&apos;re not on Peak.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={registering}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'white' }}
              >
                {registering ? 'Enabling...' : 'Enable notifications'}
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all hover:scale-105"
                style={{ color: 'var(--text-muted)' }}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
