'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'

interface TuitionEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
  posterUrl?: string
  description?: string
}

export function UpcomingEvents() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [events, setEvents] = useState<TuitionEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { getPublicTuitionEvents } = await import('@/app/actions/event-registration')
        const result = await getPublicTuitionEvents()
        if (result.success) {
          setEvents(result.events)
        }
      } catch (err) {
        console.error('Failed to fetch events:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'upcoming': return 'bg-blue-100 text-blue-700'
      case 'postponed': return 'bg-amber-100 text-amber-700'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  return (
    <section id="events" ref={ref} className="relative py-12 md:py-16 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-slate-50 opacity-30" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="text-center mb-8 md:mb-10"
        >
          <span className="peak-label peak-label-green mb-4 block">UPCOMING EVENTS</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            What&apos;s
            <br />
            Happening
          </h2>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-slate-200 rounded-2xl mb-4" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No upcoming events</h3>
            <p className="text-slate-500 text-sm">Check back soon for new programmes and intakes.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="group bg-white border border-slate-200/50 rounded-2xl overflow-hidden hover:border-peak-green/30 hover:shadow-lg transition-all duration-300"
              >
                {event.posterUrl && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={event.posterUrl}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {formatDate(event.start_date)}
                      {event.end_date !== event.start_date && ` - ${formatDate(event.end_date)}`}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{event.name}</h3>
                  {event.description && (
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4">{event.description}</p>
                  )}
                  <Link
                    href={`/events/register?eventId=${event.id}`}
                    className="inline-flex items-center gap-2 text-peak-green font-bold text-sm hover:gap-3 transition-all"
                  >
                    Register Now
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}