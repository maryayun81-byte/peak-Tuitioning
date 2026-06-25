'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import toast from 'react-hot-toast'
import { playGeneratedSound, type SoundProfile } from '@/lib/sounds'
import { getStudentNotificationFeed } from '@/app/actions/student'

export function useRealtimeNotifications() {
  const supabase = getSupabaseBrowserClient()
  const { profile, student, teacher, parent } = useAuthStore()
  const { addNotification, setNotifications, markRead, deleteNotification, unreadCount } = useNotificationStore()

  useEffect(() => {
    const baseTitle = 'Peak Performance Tutoring'
    document.title = unreadCount > 0 ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${baseTitle}` : baseTitle

    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') || document.createElement('link')
    icon.rel = 'icon'
    icon.href = unreadCount > 0
      ? `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#2563eb"/><path d="M17 44V20h18c8 0 13 4 13 11s-5 11-13 11H27v2H17zm10-11h8c2 0 3-1 3-2s-1-2-3-2h-8v4z" fill="white"/><circle cx="51" cy="13" r="11" fill="#ef4444"/><text x="51" y="17" font-size="12" text-anchor="middle" fill="white" font-family="Arial" font-weight="700">${unreadCount > 9 ? '9+' : unreadCount}</text></svg>`)}`
      : '/logo.png'
    if (!icon.parentNode) document.head.appendChild(icon)

    return () => {
      document.title = baseTitle
      icon.href = '/logo.png'
    }
  }, [unreadCount])

  useEffect(() => {
    const actorUserId = profile?.id || (student as any)?.user_id || (teacher as any)?.user_id || (parent as any)?.user_id
    if (!actorUserId) return

    // 1. Fetch initial notifications
    const fetchInitial = async () => {
      let data: any[] | null = null
      let error: any = null

      try {
        data = await getStudentNotificationFeed(actorUserId)
      } catch {
        const result = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', actorUserId)
          .order('created_at', { ascending: false })
          .limit(50)
        data = result.data
        error = result.error
      }
      
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
      .channel(`user-updates-${actorUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${actorUserId}`
        },
        (payload) => {
          const newNotif = payload.new as any
          
          // Add to local store
          addNotification({
            id: newNotif.id,
            user_id: actorUserId,
            title: newNotif.title,
            body: newNotif.body,
            type: newNotif.type,
            read: false,
            created_at: newNotif.created_at,
            data: newNotif.data,
          })

          // Trigger priority modal if it's an admin broadcast
          const adminTypes = ['broadcast', 'alert', 'info', 'warning']
          if (adminTypes.includes(newNotif.type)) {
             useNotificationStore.getState().setActivePriorityNotification({
                id: newNotif.id,
                user_id: actorUserId,
                title: newNotif.title,
                body: newNotif.body,
                type: newNotif.type,
                read: false,
                created_at: newNotif.created_at
             })
          }

          // Show browser-style toast
          const isAcademic = newNotif.data?.source === 'academic_profile'
          const toastIcon = isAcademic ? '🧠' : '🔔'
          toast.success(newNotif.title, {
            icon: toastIcon,
            position: 'top-right',
            duration: 5000,
            style: {
               background: 'var(--card)',
               color: 'var(--text)',
               borderRadius: '16px',
               border: isAcademic ? '1px solid rgba(251,191,36,0.2)' : '1px solid var(--card-border)',
               boxShadow: isAcademic ? '0 20px 25px -5px rgba(251,191,36,0.08)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }
          })

          if ('Notification' in window && Notification.permission === 'granted') {
            const tag = newNotif.type === 'message'
              ? `peak-message-${newNotif.data?.conversation_id || newNotif.id}`
              : `peak-${newNotif.type}-${newNotif.id}`
            const bn = new Notification(newNotif.title, {
              body: newNotif.body,
              icon: '/logo.png',
              badge: '/logo.png',
              tag,
            })
            bn.onclick = () => {
              window.focus()
              if (newNotif.data?.href) window.location.href = newNotif.data.href
              bn.close()
            }
          }

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
          filter: `user_id=eq.${actorUserId}`
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
          filter: `user_id=eq.${actorUserId}`
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
          filter: `user_id=eq.${actorUserId}`
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
  }, [profile?.id, (student as any)?.user_id, (teacher as any)?.user_id, (parent as any)?.user_id, supabase, addNotification, setNotifications, markRead])
}
