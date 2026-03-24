'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, ChevronRight, Rocket, AlertTriangle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { TuitionEvent } from '@/types/database'

export function TuitionEventBanner() {
  const supabase = getSupabaseBrowserClient()
  const { profile, student } = useAuthStore()
  const [events, setEvents] = useState<TuitionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [profile])

  const fetchEvents = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('tuition_events')
        .select('*, curriculum:curriculums(name)')
        .gte('end_date', todayStr)
        .order('start_date', { ascending: true })

      if (error) throw error

      const filtered = (data as any[] || []).filter(event => {
        if (event.status === 'cancelled') return false
        if (event.curriculum_id && profile.role === 'student' && student) {
          if (student.curriculum_id !== event.curriculum_id) return false
        }
        return true
      }).map(event => {
        if (event.status !== 'postponed' && event.status !== 'cancelled') {
           if (todayStr < event.start_date) event.status = 'upcoming'
           else if (todayStr >= event.start_date && todayStr <= event.end_date) event.status = 'active'
           else event.status = 'closed'
        }
        return event
      }).filter(e => e.status !== 'closed')

      setEvents(filtered)
    } catch (err) {
      console.error('[TuitionEventBanner] Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

  const getCountdown = (targetDate: string) => {
    const target = new Date(targetDate)
    const diff = target.getTime() - now.getTime()
    if (diff <= 0) return 'Starting soon...'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const secs = Math.floor((diff % (1000 * 60)) / 1000)

    if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`
    return `${mins}m ${secs}s`
  }

  if (loading || events.length === 0) return null

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {events.map((event) => {
          const isUpcoming = event.status === 'upcoming'
          const isBannerActive = event.status === 'active'
          const isPostponed = event.status === 'postponed'
          
          // Determine target date for countdown
          const targetDateStr = isPostponed && event.postponed_to ? event.postponed_to : event.start_date

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="relative overflow-hidden rounded-2xl border"
              style={{
                background: isBannerActive 
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(52,211,153,0.05))' 
                  : isPostponed
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(248,113,113,0.05))'
                  : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(129,140,248,0.05))',
                borderColor: isBannerActive ? 'rgba(16,185,129,0.2)' : isPostponed ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)',
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4 p-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isBannerActive ? 'rgba(16,185,129,0.15)' : isPostponed ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)' }}
                >
                  {isBannerActive ? (
                    <Rocket size={20} className="text-emerald-500 animate-bounce" />
                  ) : isPostponed ? (
                    <AlertTriangle size={20} className="text-red-500 animate-pulse" />
                  ) : (
                    <Clock size={20} className="text-indigo-500 animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isBannerActive ? '#10B981' : isPostponed ? '#EF4444' : '#6366F1' }}>
                      {isBannerActive ? 'CURRENT TUITION EVENT' : isPostponed ? 'TUITION POSTPONED' : 'UPCOMING TUITION EVENT'}
                    </span>
                    {(event as any).curriculum && <Badge variant="muted">{(event as any).curriculum.name}</Badge>}
                  </div>
                  <h3 className="font-black text-base truncate" style={{ color: 'var(--text)' }}>
                    {event.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {isBannerActive 
                      ? `Ends on ${formatDate(event.end_date)}`
                      : isPostponed && event.postponed_to
                      ? `New Start Date: ${formatDate(event.postponed_to)}`
                      : `Starts on ${formatDate(event.start_date)}`
                    }
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {(isUpcoming || isPostponed) && targetDateStr && (
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: 'var(--text-muted)' }}>Countdown</div>
                      <div className="text-base font-black font-mono tabular-nums" style={{ color: isPostponed ? '#EF4444' : '#6366F1' }}>
                        {getCountdown(targetDateStr)}
                      </div>
                    </div>
                  )}
                  
                  <Link href={profile?.role === 'admin' ? '/admin/tuition-events' : `/${profile?.role}/schedule`}>
                    <button 
                      className="px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-105 flex items-center gap-2"
                      style={{ 
                        background: isBannerActive ? '#10B981' : isPostponed ? '#EF4444' : '#6366F1',
                        color: 'white',
                        boxShadow: isBannerActive ? '0 4px 12px rgba(16,185,129,0.3)' : isPostponed ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(99,102,241,0.3)'
                      }}
                    >
                      {isBannerActive ? 'View Schedule' : 'View Details'}
                      <ChevronRight size={14} />
                    </button>
                  </Link>
                </div>
              </div>
              
              {isBannerActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/20">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="h-full bg-emerald-500"
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
