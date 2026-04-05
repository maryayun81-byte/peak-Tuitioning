'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Plus, Clock, Users, BookOpen, ChevronRight,
  BarChart3, CheckCircle2, Lock, FileEdit, Zap, Eye, Trash2, ChevronLeft
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface TriviaSession {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'closed'
  class_ids: string[]
  duration_minutes: number | null
  created_at: string
  updated_at: string
  subject?: { name: string } | null
  _questionCount?: number
  _groupCount?: number
  _submissionCount?: number
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: '#94A3B8', bg: 'rgba(148,163,184,0.1)',  icon: <FileEdit size={12} /> },
  published: { label: 'Live',      color: '#10B981', bg: 'rgba(16,185,129,0.1)',   icon: <Zap size={12} /> },
  closed:    { label: 'Closed',    color: '#6366F1', bg: 'rgba(99,102,241,0.1)',   icon: <Lock size={12} /> },
}

const PAGE_SIZE = 10

export default function TeacherTriviaPage() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  const router = useRouter()

  const [sessions, setSessions] = useState<TriviaSession[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => {
        setLoading(false)
        console.warn('TeacherTrivia timeout triggered')
      }, 8000)
      return () => clearTimeout(t)
    }
  }, [loading])

  useEffect(() => {
    if (teacher?.id) loadSessions()
  }, [teacher?.id, page])

  const loadSessions = async () => {
    if (!teacher?.id) return
    setLoading(true)

    // Get count and data
    const { data, error, count } = await supabase
      .from('trivia_sessions')
      .select(`
        *,
        subject:subjects(name)
      `, { count: 'exact' })
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) { toast.error('Failed to load trivia sessions'); setLoading(false); return }

    setTotalCount(count ?? 0)

    try {
      // Load counts in parallel
      const enriched = await Promise.all((data ?? []).map(async s => {
        const [qRes, gRes, subRes] = await Promise.all([
          supabase.from('trivia_questions').select('id', { count: 'exact', head: true }).eq('session_id', s.id),
          supabase.from('trivia_groups').select('id', { count: 'exact', head: true }).eq('session_id', s.id),
          supabase.from('trivia_submissions').select('id', { count: 'exact', head: true }).eq('session_id', s.id),
        ])
        return {
          ...s,
          _questionCount: qRes.count ?? 0,
          _groupCount: gRes.count ?? 0,
          _submissionCount: subRes.count ?? 0,
        }
      }))
      setSessions(enriched)
    } catch (e: any) {
      console.error('Trivia sessions enriching failed:', e)
      toast.error('Failed to load trivia counts')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) return
    
    const { error } = await supabase.from('trivia_sessions').delete().eq('id', id)
    if (error) { toast.error('Failed to delete trivia'); return }
    
    toast.success('Trivia deleted.')
    if (sessions.length === 1 && page > 0) setPage(p => p - 1)
    else loadSessions()
  }

  const handleClearAll = async () => {
    if (!sessions.length) return
    if (!confirm(`DANGER: Are you sure you want to delete ALL your trivias? Current page and all other pages will be wiped.`)) return
    if (!confirm(`Final Warning: This will delete ${totalCount} sessions including all their questions and results. Continue?`)) return

    const { error } = await supabase.from('trivia_sessions').delete().eq('teacher_id', teacher!.id)
    if (error) { toast.error('Failed to clear sessions'); return }

    toast.success('All trivias cleared.')
    setPage(0)
    loadSessions()
  }

  const updateStatus = async (id: string, status: 'published' | 'closed') => {
    const { error } = await supabase.from('trivia_sessions').update({ status }).eq('id', id)
    if (error) { toast.error('Failed to update status'); return }
    toast.success(status === 'published' ? '🚀 Trivia is now live!' : 'Trivia closed.')
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const stats = useMemo(() => ({
    total: totalCount,
    live: sessions.filter(s => s.status === 'published').length, // This is just on current page
    closed: sessions.filter(s => s.status === 'closed').length,
    totalGroupsOnPage: sessions.reduce((a, s) => a + (s._groupCount ?? 0), 0),
  }), [sessions, totalCount])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Trophy size={24} className="text-amber-500" /> Trivia Hub
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage and monitor your class trivia sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
           {totalCount > 0 && (
             <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-red-500 hover:bg-red-500/10">
               <Trash2 size={16} /> Clear All
             </Button>
           )}
          <Button onClick={() => router.push('/teacher/trivia/create')} className="flex items-center gap-2">
            <Plus size={16} /> Create Trivia
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trivia', value: totalCount, color: '#7C3AED', icon: <Trophy size={16} /> },
          { label: 'Sessions Page', value: sessions.length, color: '#10B981', icon: <ChevronRight size={16} /> },
          { label: 'Page Groups', value: stats.totalGroupsOnPage, color: '#F59E0B', icon: <Users size={16} /> },
          { label: 'Classes Involved', value: [...new Set(sessions.flatMap(s => s.class_ids))].length, color: '#6366F1', icon: <BookOpen size={16} /> },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 border-2 border-[var(--card-border)]">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.color + '20', color: s.color }}>{s.icon}</div>
              </div>
              <div className="text-2xl font-black italic tracking-tighter" style={{ color: 'var(--text)' }}>{s.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text)' }}>{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar / Pagination Top */}
      <div className="flex items-center justify-between">
         <div className="text-xs font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--text)' }}>
            Active Sessions
         </div>
         {totalPages > 1 && (
           <div className="flex items-center gap-2">
             <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
               <ChevronLeft size={14} />
             </Button>
             <span className="text-[10px] font-black">{page + 1} / {totalPages}</span>
             <Button size="sm" variant="ghost" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
               <ChevronRight size={14} />
             </Button>
           </div>
         )}
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--input)' }} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-28 text-center bg-[var(--input)]/20 rounded-[3rem] border-2 border-dashed border-[var(--card-border)]">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--input)' }}>
            <Trophy size={36} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="font-black text-lg mb-2 uppercase italic tracking-widest" style={{ color: 'var(--text)' }}>No Trivia Found</h3>
          <p className="text-sm mb-6 max-w-xs mx-auto opacity-60" style={{ color: 'var(--text)' }}>Create your first high-performance trivia to engage your students.</p>
          <Button onClick={() => router.push('/teacher/trivia/create')}>
            <Plus size={16} /> Create First Trivia
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {sessions.map((s, i) => {
              const cfg = STATUS_CONFIG[s.status]
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="p-5 border-2 hover:border-primary/50 transition-all group">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform" style={{ background: 'var(--input)' }}>
                        <Trophy size={22} className="text-amber-500 filter drop-shadow-sm" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-black text-base italic uppercase tracking-tighter" style={{ color: 'var(--text)' }}>{s.title}</h3>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color + '30' }}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-xs truncate mb-2 opacity-60" style={{ color: 'var(--text)' }}>{s.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {[
                            { icon: <BookOpen size={12} />, text: s.subject?.name ?? 'General' },
                            { icon: <BarChart3 size={12} />, text: `${s._questionCount} Qs` },
                            { icon: <Users size={12} />, text: `${s._groupCount} squads` },
                            { icon: <CheckCircle2 size={12} />, text: `${s._submissionCount} done` },
                            ...(s.duration_minutes ? [{ icon: <Clock size={12} />, text: `${s.duration_minutes}m` }] : []),
                          ].map((m, mi) => (
                            <span key={mi} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--text)' }}>
                              {m.icon} {m.text}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0">
                        <Button size="sm" variant="secondary" onClick={() => router.push(`/teacher/trivia/${s.id}`)} className="h-10 px-4">
                          <Eye size={14} />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => router.push(`/teacher/trivia/${s.id}/edit`)} className="h-10 px-4">
                          <FileEdit size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id, s.title)} className="h-10 px-4 text-red-400 hover:text-red-500 hover:bg-red-500/10">
                          <Trash2 size={14} />
                        </Button>
                        
                        <div className="w-px h-10 bg-[var(--card-border)] hidden sm:block mx-1" />
                        
                        {s.status === 'draft' && (
                          <Button size="sm" onClick={() => updateStatus(s.id, 'published')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 h-10 px-5 font-black uppercase text-[10px] tracking-widest">
                            <Zap size={14} className="mr-2" /> Live
                          </Button>
                        )}
                        {s.status === 'published' && (
                          <Button size="sm" onClick={() => updateStatus(s.id, 'closed')}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 h-10 px-5 font-black uppercase text-[10px] tracking-widest">
                            <Lock size={14} className="mr-2" /> Stop
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <Button variant="secondary" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft size={16} /> Prev
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${page === i ? 'bg-primary text-white scale-110' : 'bg-[var(--input)] text-[var(--text-muted)] hover:bg-primary/20'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
            Next <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  )
}
