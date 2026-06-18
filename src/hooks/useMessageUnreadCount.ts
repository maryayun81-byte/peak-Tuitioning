'use client'

import { useCallback, useEffect, useState } from 'react'
import { getPeakUnreadCount } from '@/app/actions/messages'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export function useMessageUnreadCount() {
  const { profile, student, teacher } = useAuthStore()
  const actorUserId = profile?.id || (student as any)?.user_id || (teacher as any)?.user_id
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!actorUserId) {
      setCount(0)
      return
    }
    try {
      setCount(await getPeakUnreadCount(actorUserId))
    } catch {
      setCount(0)
    }
  }, [actorUserId])

  useEffect(() => {
    refresh()
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel('peak-message-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peak_messages' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'peak_conversations' }, refresh)
      .subscribe()
    const interval = setInterval(refresh, 30000)
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [refresh])

  return { count, refresh }
}
