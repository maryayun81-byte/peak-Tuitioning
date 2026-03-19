'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import toast from 'react-hot-toast'

export function useRealtimeNotifications() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    if (!profile?.id) return

    // Subscribe to the notifications table for this user
    const channel = supabase
      .channel(`user-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          const newNotif = payload.new as any
          
          // Add to local store
          addNotification({
            id: newNotif.id,
            user_id: profile.id,
            title: newNotif.title,
            body: newNotif.body,
            type: newNotif.type,
            read: false,
            created_at: newNotif.created_at
          })

          // Show browser-style toast
          toast.success(newNotif.title, {
            icon: '🔔',
            position: 'top-right',
            duration: 5000,
            style: {
               background: 'var(--card)',
               color: 'var(--text)',
               borderRadius: '16px',
               border: '1px solid var(--card-border)',
               boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }
          })

          // Play subtle notification sound if enabled
          const audio = new Audio('/sounds/notification.mp3')
          audio.play().catch(() => {}) // Handle browsers blocking autoplay
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, supabase, addNotification])
}
