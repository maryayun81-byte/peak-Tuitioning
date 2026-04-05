'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, AlertCircle, ChevronRight, Rocket } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { ExamEvent } from '@/types/database'

// Module-level cache so navigating between pages doesn't re-fetch
let examEventsCache: { data: ExamEvent[]; ts: number; profileId: string } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function ExamEventBanner() {
  const supabase = getSupabaseBrowserClient()
  const { profile, student } = useAuthStore()
  const [events, setEvents] = useState<ExamEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Adaptive countdown timer:
  // - 1 second when any event has an active countdown (upcoming status)
  // - 60 seconds when events are active/running (no second-level countdown displayed)
  // - 60 seconds when no events loaded yet
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    const hasCountdownEvent = events.some(e => e.status === 'upcoming')
    const tickRate = hasCountdownEvent ? 1000 : 60_000
    intervalRef.current = setInterval(() => setNow(new Date()), tickRate)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [events])

  // Only re-fetch when profile ID actually changes (not on every render)
  useEffect(() => {
    if (!profile?.id) return
    fetchEvents(profile.id)
  }, [profile?.id])

  const fetchEvents = async (profileId: string) => {
    // Serve from cache if fresh for same user
    if (examEventsCache && examEventsCache.profileId === profileId && Date.now() - examEventsCache.ts < CACHE_TTL) {
      setEvents(examEventsCache.data)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('exam_events')
        .select('*, curriculum:curriculums(name)')
        .gte('end_date', todayStr)
        .order('start_date', { ascending: true })

      if (error) throw error

      const filtered = (data as any[] || []).filter(event => {
        if (event.status === 'cancelled' || event.status === 'generated' || event.status === 'closed') return false
        if (event.curriculum_id && profile?.role === 'student' && student && student.curriculum_id !== event.curriculum_id) return false
        if (event.target_class_ids && event.target_class_ids.length > 0 && profile?.role === 'student' && student && !event.target_class_ids.includes(student.class_id)) return false
        return true
      }).map(event => {
        if (event.status !== 'postponed' && event.status !== 'cancelled' && event.status !== 'generated') {
           if (todayStr < event.start_date) event.status = 'upcoming'
           else if (todayStr >= event.start_date && todayStr <= event.end_date) event.status = 'active'
           else event.status = 'closed'
        }
        return event
      }).filter(e => e.status !== 'closed' && e.status !== 'generated')

      const result = filtered as ExamEvent[]
      examEventsCache = { data: result, ts: Date.now(), profileId }
      setEvents(result)
    } catch (err) {
      console.error('[ExamEventBanner] Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

  const getCountdown = (startDate: string) => {
    const target = new Date(startDate)
    const diff = target.getTime() - now.getTime()
    if (diff <= 0) return 'Starting now...'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const secs = Math.floor((diff % (1000 * 60)) / 1000)

    if (days > 0) return `${days}d ${hours}h ${mins}m`
    return `${hours}h ${mins}m ${secs}s`
  }

  if (loading || events.length === 0) return null

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {events.map((event) => {
          const isUpcoming = event.status === 'upcoming'
          const isBannerActive = event.status === 'active'

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="relative overflow-hidden rounded-2xl border"
              style={{
                background: isBannerActive 
                  ? 'linear-gradient(135deg, rgba(79,140,255,0.1), rgba(34,211,238,0.05))' 
                  : 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.05))',
                borderColor: isBannerActive ? 'rgba(79,140,255,0.2)' : 'rgba(245,158,11,0.2)',
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4 p-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isBannerActive ? 'rgba(79,140,255,0.15)' : 'rgba(245,158,11,0.15)' }}
                >
                  {isBannerActive ? (
                    <Rocket size={20} className="text-primary animate-bounce" />
                  ) : (
                    <Clock size={20} className="text-amber-500 animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isBannerActive ? 'var(--primary)' : '#F59E0B' }}>
                      {isBannerActive ? 'EXAM SESSION ACTIVE' : 'UPCOMING EXAM EVENT'}
                    </span>
                    {(event as any).curriculum && <Badge variant="muted">{(event as any).curriculum.name}</Badge>}
                  </div>
                  <h3 className="font-black text-base truncate" style={{ color: 'var(--text)' }}>
                    {event.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {isBannerActive 
                      ? `Ends on ${formatDate(event.end_date)}`
                      : `Starts on ${formatDate(event.start_date)}`
                    }
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {isUpcoming && event.start_date && (
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] font-bold text-muted uppercase tracking-tighter">Counting Down</div>
                      <div className="text-sm font-black font-mono text-amber-500">{getCountdown(event.start_date)}</div>
                    </div>
                  )}
                  
                  <Link href={profile?.role === 'student' ? '/student/transcripts' : '/admin/exam-events'}>
                    <button 
                      className="px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-105 flex items-center gap-2"
                      style={{ 
                        background: isBannerActive ? 'var(--primary)' : '#F59E0B',
                        color: 'white',
                        boxShadow: isBannerActive ? '0 4px 12px rgba(79,140,255,0.3)' : '0 4px 12px rgba(245,158,11,0.3)'
                      }}
                    >
                      {isBannerActive ? 'View Details' : 'Set Reminder'}
                      <ChevronRight size={14} />
                    </button>
                  </Link>
                </div>
              </div>
              
              {isBannerActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/20">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="h-full bg-primary"
                  />
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
