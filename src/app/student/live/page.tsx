'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Zap, Calendar, Clock, Target, 
  ChevronRight, Play, Lock, BookOpen, Users, Search, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

const PAGE_SIZE = 10

export default function StudentLivePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { student, profile, isLoading } = useAuthStore()

  const [sessions, setSessions] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Search, filter, pagination
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'scheduled' | 'completed'>('all')
  const [page, setPage] = useState(1)

  const fetchSessions = useCallback(async () => {
    if (!student?.class_id) return
    try {
      const { data } = await supabase
        .from('live_sessions')
        .select(`*, subject:subjects(name), class:classes(name), teacher:teachers(full_name)`)
        .eq('class_id', student.class_id)
        .order('scheduled_at', { ascending: true })
      setSessions(data || [])
    } catch (err) {
      console.error('[StudentLivePage] Fetch error:', err)
    } finally {
      setIsLoadingData(false)
    }
  }, [student?.class_id])

  useEffect(() => {
    if (isLoading) return
    if (!profile) { router.push('/auth/login'); return }
    if (!student?.class_id) return
    
    fetchSessions()
    
    // Auto-refresh every 30 seconds to catch new sessions/status changes
    const interval = setInterval(fetchSessions, 30000)
    return () => clearInterval(interval)
  }, [isLoading, profile, student?.class_id, fetchSessions])

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-[#05070A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Loader2 size={32} className="text-emerald-500 animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Loading Sessions...</p>
        </div>
      </div>
    )
  }

  const filteredSessions = sessions
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .filter(s => !search || 
      s.title?.toLowerCase().includes(search.toLowerCase()) || 
      s.subject?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.teacher?.full_name?.toLowerCase().includes(search.toLowerCase())
    )

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE))
  const pagedSessions = filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const liveCount = sessions.filter(s => s.status === 'live').length
  const scheduledCount = sessions.filter(s => s.status === 'scheduled').length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#05070A] text-white p-6 md:p-12 space-y-16"
    >
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <Zap size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Peak Campus Live</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">Scholar <br /><span className="text-slate-500">Session Hub</span></h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-[1.5rem] bg-emerald-500 text-black border border-emerald-500">
          <div className="text-2xl font-black mb-1">{liveCount}</div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-black/60">Live Now</div>
        </div>
        <div className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5">
          <div className="text-2xl font-black mb-1">{scheduledCount}</div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Upcoming</div>
        </div>
        <div className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5">
          <div className="text-2xl font-black mb-1">{sessions.length}</div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Total</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sessions List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black uppercase tracking-tight text-white/40">Sessions</h3>
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{filteredSessions.length} found</span>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by title, subject or teacher..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.03] border border-white/5 text-white placeholder:text-slate-600 text-[11px] outline-none focus:border-emerald-500/40"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'live', 'scheduled', 'completed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    statusFilter === s
                      ? s === 'live' ? 'bg-emerald-500 text-black' : 'bg-white text-black'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            {pagedSessions.length === 0 ? (
              <div className="p-20 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-700">
                  <BookOpen size={32} />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  {search || statusFilter !== 'all' ? 'No sessions match your filters.' : 'No sessions scheduled for your class yet.'}
                </p>
              </div>
            ) : (
              pagedSessions.map(session => (
                <StudentSessionCard key={session.id} session={session} />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
              >Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-[9px] font-black transition-all ${
                    page === p ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >{p}</button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
              >Next</button>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-4 space-y-8">
          <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-500">
                <Target size={24} />
              </div>
              <h4 className="font-black uppercase tracking-tight leading-none text-white">Clarity <br />Commitment</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-widest">
              In every Peak Live session, you will see a clear goal and outcomes. Your goal is to move those bars to 100% by the end of the session.
            </p>
          </div>

          <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10 space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Join Instructions</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-[10px] font-black shrink-0">1</div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Join 5 minutes before the scheduled time.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-[10px] font-black shrink-0">2</div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ensure your audio/video are tested.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-[10px] font-black shrink-0">3</div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Have your notes and questions ready.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StudentSessionCard({ session }: { session: any }) {
  const isLive = session.status === 'live'

  const formatScheduledTime = (isoString: string) => {
    if (!isoString) return 'Time not set'
    return new Date(isoString).toLocaleString([], {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className={`p-6 md:p-8 rounded-[2rem] border transition-all group ${
      isLive 
        ? 'bg-emerald-500/5 border-emerald-500/20 shadow-2xl shadow-emerald-500/5' 
        : 'bg-white/[0.02] border-white/5'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left: info */}
        <div className="flex items-start gap-5 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isLive ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 animate-pulse' : 'bg-white/5 text-slate-500'
          }`}>
            {isLive ? <Play size={18} /> : <Clock size={18} />}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {session.subject?.name && (
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">{session.subject.name}</span>
              )}
              {session.session_type === 'class' && (
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">Entire Class</span>
              )}
              {isLive && (
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap">● Live</span>
              )}
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">{session.class?.name || 'Live Campus'}</span>
            </div>
            <h4 className="text-base md:text-lg font-black uppercase tracking-tight text-white truncate">{session.title}</h4>
            <div className="flex flex-wrap items-center gap-3 text-slate-500">
              <div className="flex items-center gap-1.5">
                <Users size={11} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{session.teacher?.full_name || 'Staff'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={11} />
                <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">{formatScheduledTime(session.scheduled_at)}</span>
              </div>
              {session.duration_mins && (
                <div className="flex items-center gap-1.5">
                  <Clock size={11} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">{session.duration_mins} min</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: action */}
        <div className="flex items-center gap-3 shrink-0">
          {isLive ? (
            <Link
              href={`/student/live/${session.id}`}
              className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[9px] text-center hover:bg-white transition-all shadow-xl shadow-emerald-500/20 whitespace-nowrap"
            >
              Join Now
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-slate-600 px-3">
              <Lock size={13} />
              <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Not Live Yet</span>
            </div>
          )}
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-700 group-hover:text-white transition-colors shrink-0">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </div>
  )
}
