'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import toast from 'react-hot-toast'
import { playGeneratedSound, type SoundProfile } from '@/lib/sounds'

export function useRealtimeNotifications() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const { addNotification, setNotifications, markRead, deleteNotification } = useNotificationStore()

  useEffect(() => {
    if (!profile?.id) return

    // 1. Fetch initial notifications
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50) // Initial load limit
      
      if (!error && data) {
        setNotifications(data)

        // Check for unread priority notification on initial load (Login/Refresh)
        const priorityTypes = ['broadcast', 'alert', 'info', 'warning']
        const latestUnreadPriority = data.find(n => !n.read && priorityTypes.includes(n.type))
        if (latestUnreadPriority) {
           useNotificationStore.getState().setActivePriorityNotification(latestUnreadPriority)
        }
      }
    }

    fetchInitial()

    // 2. Subscribe to the notifications table for this user
    const channel = supabase
      .channel(`user-updates-${profile.id}`)
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

          // Trigger priority modal if it's an admin broadcast
          const adminTypes = ['broadcast', 'alert', 'info', 'warning']
          if (adminTypes.includes(newNotif.type)) {
             useNotificationStore.getState().setActivePriorityNotification({
                id: newNotif.id,
                user_id: profile.id,
                title: newNotif.title,
                body: newNotif.body,
                type: newNotif.type,
                read: false,
                created_at: newNotif.created_at
             })
          }

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
          const { preferences } = useNotificationStore.getState()
          if (preferences.soundEnabled) {
             // Map notification type to sound profile
             let profile: SoundProfile = 'default'
             if (newNotif.type === 'achievement' || newNotif.type === 'award') profile = 'achievement'
             else if (newNotif.type === 'assignment') profile = 'assignment'
             else if (newNotif.type === 'intel' || newNotif.type === 'info') profile = 'intel'
             else if (newNotif.type === 'system') profile = 'news'

             // Check if specific ping is enabled
             const categoryMap: Record<string, keyof typeof preferences> = {
                achievement: 'levelUp',
                award: 'levelUp',
                assignment: 'questReminders',
                intel: 'teacherIntel',
                info: 'teacherIntel',
                system: 'globalNews'
             }

             const category = categoryMap[newNotif.type]
             if (!category || preferences[category]) {
                playGeneratedSound(profile, preferences.soundVariant)
             }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
           // Sync update (e.g. if marked as read elsewhere)
           if (payload.new.read) {
             markRead(payload.new.id)
           }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
           // Sync deletion
           deleteNotification(payload.old.id)
        }
      )
      // Listen for student profile updates (XP, streaks, etc.)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          const { setStudent } = useAuthStore.getState()
          setStudent(payload.new as any)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, supabase, addNotification, setNotifications, markRead])
}
