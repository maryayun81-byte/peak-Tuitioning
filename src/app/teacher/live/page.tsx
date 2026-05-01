'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Zap, Plus, Calendar, Clock, Target, 
  ChevronRight, Play, CheckCircle2,
  Activity, ArrowUpRight, Loader2,
  Search, Trash2, Filter
} from 'lucide-react'
import Link from 'next/link'
import LiveSessionManager from '@/components/teacher/LiveSessionManager'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'react-hot-toast'
import { startLiveSession } from '@/app/actions/live-sessions'

export default function TeacherLivePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { teacher, profile, isLoading } = useAuthStore()

  const [pageData, setPageData] = useState<{
    subjects: any[]
    assignments: any[]
    centers: any[]
    sessions: any[]
  } | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // All hooks must be declared before any conditional returns (Rules of Hooks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'live' | 'completed'>('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const refetchSessions = useCallback(async () => {
    if (!teacher?.id) return
    try {
      const { data } = await supabase
        .from('live_sessions')
        .select(`*, subject:subjects(name), class:classes(name), outcomes:live_session_outcomes(*)`)
        .eq('teacher_id', teacher.id)
        .order('scheduled_at', { ascending: true })
      setPageData(prev => prev ? { ...prev, sessions: data || [] } : prev)
    } catch (err) {
      console.error('[TeacherLivePage] Session refetch error:', err)
    }
  }, [teacher?.id])

  useEffect(() => {
    if (isLoading) return
    if (!profile) {
      router.push('/auth/login?role=teacher')
      return
    }
    if (!teacher?.id) return

    const fetchData = async () => {
      setIsLoadingData(true)
      try {
        const [centersRes, subjectsRes, assignmentsRes, sessionsRes] = await Promise.all([
          supabase.from('tuition_centers').select('id, name'),
          supabase.from('subjects').select('id, name'),
          supabase
            .from('teacher_assignments')
            .select(`
              *,
              class:classes(id, name),
              subject:subjects(id, name),
              tuition_center:tuition_centers(id, name)
            `)
            .eq('teacher_id', teacher.id),
          supabase
            .from('live_sessions')
            .select(`*, subject:subjects(name), class:classes(name), outcomes:live_session_outcomes(*)`)
            .eq('teacher_id', teacher.id)
            .order('scheduled_at', { ascending: true })
        ])

        setPageData({
          centers: centersRes.data || [],
          subjects: subjectsRes.data || [],
          assignments: assignmentsRes.data || [],
          sessions: sessionsRes.data || [],
        })
      } catch (err) {
        console.error('[TeacherLivePage] Data fetch error:', err)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [teacher?.id, isLoading, profile])

  // Check for errors in URL (e.g. from studio redirect)
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error')
    if (error) {
      if (error === 'token_failed') toast.error("Failed to generate session token. Please try again.")
      if (error === 'connection_failed') toast.error("Connection error while launching studio.")
      // Clear the error from URL
      router.replace('/teacher/live')
    }
  }, [router])

  // Loading state
  if (isLoading || isLoadingData || !pageData) {
    return (
      <div className="min-h-screen bg-[#05070A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Loader2 size={32} className="text-emerald-500 animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">
            Initializing Studio...
          </p>
        </div>
      </div>
    )
  }

  const { subjects, assignments, centers, sessions } = pageData
  const scheduledCount = sessions.filter(s => s.status === 'scheduled').length

  const filteredSessions = sessions
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .filter(s => !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.subject?.name?.toLowerCase().includes(search.toLowerCase()))

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE))
  const pagedSessions = filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#05070A] text-white p-6 md:p-12 space-y-16"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
              <Zap size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Peak Campus Live</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">
            Intelligent <br /><span className="text-slate-500">Session Hub</span>
          </h1>
        </div>
        
        <LiveSessionManager 
          subjects={subjects}
          assignments={assignments}
          centers={centers}
          sessions={sessions}
          onSessionCreated={refetchSessions}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Live Now" value="0" icon={<Activity />} active />
        <StatCard label="Scheduled" value={scheduledCount.toString()} icon={<Calendar />} />
        <StatCard label="Total Sessions" value={sessions.length.toString()} icon={<Target />} />
        <StatCard label="Completion" value="98%" icon={<CheckCircle2 />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Session Pipeline */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tight">Session Pipeline</h3>
            <div className="h-px flex-1 mx-8 bg-white/5" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{filteredSessions.length} sessions</span>
          </div>

          {/* Search + Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search sessions or subjects..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.03] border border-white/5 text-white placeholder:text-slate-600 text-[11px] outline-none focus:border-emerald-500/40"
              />
            </div>
            <div className="flex gap-2">
              {(['all','scheduled','live','completed'] as const).map(s => (
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

          {/* Session Cards */}
          <div className="space-y-4">
            {pagedSessions.length === 0 ? (
              <div className="p-20 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-700">
                  <Zap size={32} />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  {search || statusFilter !== 'all' ? 'No sessions match your filters.' : 'No sessions yet. Schedule your first live session above.'}
                </p>
              </div>
            ) : (
              pagedSessions.map(session => (
                <SessionListItem key={session.id} session={session} onRefetch={refetchSessions} />
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
          <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-black shadow-xl">
                <Target size={24} />
              </div>
              <h4 className="font-black uppercase tracking-tight leading-none">Clarity <br />Strategy</h4>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed uppercase tracking-widest">
              Every Peak Live session is optimized for clarity. Ensure your &quot;Key Outcomes&quot; are measurable and exam-focused for maximum impact.
            </p>
          </div>

          <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Upcoming Timeline</h4>
            <div className="space-y-6">
              {sessions.filter(s => s.status === 'scheduled').slice(0, 3).map(s => (
                <div key={s.id} className="flex gap-4">
                  <div className="w-1 h-8 rounded-full bg-emerald-500/20" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-tight text-white">{s.title}</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {sessions.filter(s => s.status === 'scheduled').length === 0 && (
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No upcoming sessions</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, icon, active = false }: { label: string, value: string, icon: React.ReactNode, active?: boolean }) {
  return (
    <div className={`p-8 rounded-[2rem] border transition-all ${active ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/[0.02] border-white/5 text-white'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className={`${active ? 'text-black/40' : 'text-slate-600'}`}>{icon}</div>
        <ArrowUpRight size={16} className={`${active ? 'text-black/40' : 'text-slate-700'}`} />
      </div>
      <div className="text-3xl font-black uppercase tracking-tighter mb-1">{value}</div>
      <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${active ? 'text-black/60' : 'text-slate-500'}`}>{label}</div>
    </div>
  )
}

function SessionListItem({ session, onRefetch }: { session: any, onRefetch?: () => void }) {
  const isLive = session.status === 'live'
  const isScheduled = session.status === 'scheduled'
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: session.title,
    scheduled_at: session.scheduled_at?.slice(0, 16) ?? '',
    duration_mins: session.duration_mins ?? 60,
    goal: session.goal ?? '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const handleStart = async () => {
    setIsStarting(true)
    try {
      await startLiveSession(session.id)
      toast.success('Session is now LIVE! 🚀')
      onRefetch?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to start session')
    } finally {
      setIsStarting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.from('live_sessions').delete().eq('id', session.id)
      if (error) throw error
      toast.success('Session deleted')
      setConfirmDelete(false)
      onRefetch?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete session')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase
        .from('live_sessions')
        .update({
          title: editData.title,
          // Convert datetime-local (local time) → UTC ISO string for correct DB storage
          scheduled_at: new Date(editData.scheduled_at).toISOString(),
          duration_mins: editData.duration_mins,
          goal: editData.goal,
        })
        .eq('id', session.id)
      
      if (error) throw error
      toast.success('Session updated!')
      setIsEditing(false)
      onRefetch?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update session')
    } finally {
      setIsSaving(false)
    }
  }

  // Format time without timezone confusion — display the stored value directly
  const formatScheduledTime = (isoString: string) => {
    if (!isoString) return 'Time not set'
    // Parse the UTC timestamp and format in local time
    const d = new Date(isoString)
    return d.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  return (
    <>
      <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
        {/* Card body — stacks on mobile, row on md+ */}
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          
          {/* Left side: Icon + Session Info */}
          <div className="flex items-start gap-4 md:gap-5 min-w-0 flex-1">
            {/* Icon */}
            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${isLive ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 animate-pulse' : 'bg-white/5 text-slate-500'}`}>
              {isLive ? <Play size={20} /> : <Calendar size={20} />}
            </div>
            
            {/* Text Details */}
            <div className="min-w-0 flex-1 space-y-1.5 md:space-y-2">
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2">
                {session.subject?.name && (
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">{session.subject.name}</span>
                )}
                {session.session_type === 'class' && (
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">Entire Class</span>
                )}
                {session.class?.name && (
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">{session.class.name}</span>
                )}
              </div>
              
              {/* Title */}
              <h4 className="text-base md:text-xl font-black uppercase tracking-tight text-white truncate block">
                {session.title}
              </h4>
              
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} />
                  <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
                    {formatScheduledTime(session.scheduled_at)}
                  </span>
                </div>
                {session.duration_mins && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">{session.duration_mins} min</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Target size={11} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">{session.outcomes?.length ?? 0} outcomes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-1 md:flex-none">
              {isLive ? (
                <Link
                  href={`/teacher/live/${session.id}/studio`}
                  className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[9px] text-center hover:bg-emerald-500 hover:text-white transition-all shadow-xl whitespace-nowrap"
                >
                  Enter Studio
                </Link>
              ) : (
                <div className="flex items-center gap-2 flex-1 md:flex-none">
                  {/* Start Session — makes it go live */}
                  {isScheduled && (
                    <button
                      onClick={handleStart}
                      disabled={isStarting}
                      className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[9px] hover:bg-white transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap disabled:opacity-60"
                    >
                      {isStarting ? '⚡ ...' : '⚡ Start'}
                    </button>
                  )}
                  {/* Manage / Edit */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] hover:bg-white hover:text-black transition-all whitespace-nowrap"
                  >
                    Manage
                  </button>
                </div>
              )}
            </div>

            {/* Delete & Chevron Group */}
            <div className="flex items-center gap-2">
              {!isLive && (
                confirmDelete ? (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-widest whitespace-nowrap">Del?</span>
                    <button onClick={handleDelete} disabled={isDeleting} className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-white transition-colors">Yes</button>
                    <button onClick={() => setConfirmDelete(false)} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                    title="Delete session"
                  >
                    <Trash2 size={15} />
                  </button>
                )
              )}
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-700 group-hover:text-white transition-colors shrink-0">
                <ChevronRight size={18} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0A0C10] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight">Edit Session</h3>
              <button onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                ✕
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Session Title</label>
                <input
                  value={editData.title}
                  onChange={e => setEditData({...editData, title: e.target.value})}
                  className="w-full h-12 px-5 rounded-xl bg-white/[0.03] border border-white/10 text-white outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Scheduled Time</label>
                  <input
                    type="datetime-local"
                    value={editData.scheduled_at}
                    onChange={e => setEditData({...editData, scheduled_at: e.target.value})}
                    className="w-full h-12 px-5 rounded-xl bg-white/[0.03] border border-white/10 text-white outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Duration</label>
                  <select
                    value={editData.duration_mins}
                    onChange={e => setEditData({...editData, duration_mins: parseInt(e.target.value)})}
                    className="w-full h-12 px-5 rounded-xl outline-none focus:border-emerald-500/50"
                    style={{ backgroundColor: '#0A0C10', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes</option>
                    <option value={90}>90 Minutes</option>
                    <option value={120}>120 Minutes</option>
                    <option value={180}>180 Minutes</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Session Goal</label>
                <textarea
                  value={editData.goal}
                  onChange={e => setEditData({...editData, goal: e.target.value})}
                  rows={3}
                  className="w-full p-5 rounded-xl bg-white/[0.03] border border-white/10 text-white outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
            </div>
            <div className="px-8 py-6 border-t border-white/5 flex justify-end gap-4">
              <button onClick={() => setIsEditing(false)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
