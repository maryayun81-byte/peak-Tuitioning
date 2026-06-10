'use client'

import { useCallback, useEffect, useState } from 'react'
import { getPeakUnreadCount } from '@/app/actions/messages'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function useMessageUnreadCount() {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      setCount(await getPeakUnreadCount())
    } catch {
      setCount(0)
    }
  }, [])

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
