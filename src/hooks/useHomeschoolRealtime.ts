'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function useHomeschoolRealtime(
  table: 'learning_sessions' | 'learning_objectives' | 'learning_resources' | 'learning_missions' | 'homeschool_enrollments',
  filter: string,
  onChange: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled || !filter) return
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`hs-${table}-${filter.replace(/[^a-zA-Z0-9-_]/g, '')}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        () => onChange()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, enabled])
}
