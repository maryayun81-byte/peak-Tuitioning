'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Plus, Clock, Users, BookOpen, ChevronRight,
  BarChart3, CheckCircle2, Lock, FileEdit, Zap, Eye
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

export default function TeacherTriviaPage() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  const router = useRouter()

  const [sessions, setSessions] = useState<TriviaSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (teacher?.id) loadSessions()
  }, [teacher?.id])

  const loadSessions = async () => {
    if (!teacher?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('trivia_sessions')
      .select(`
        *,
        subject:subjects(name)
      `)
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false })

    if (error) { toast.error('Failed to load trivia sessions'); setLoading(false); return }

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
    setLoading(false)
  }

  const updateStatus = async (id: string, status: 'published' | 'closed') => {
    const { error } = await supabase.from('trivia_sessions').update({ status }).eq('id', id)
    if (error) { toast.error('Failed to update status'); return }
    toast.success(status === 'published' ? '🚀 Trivia is now live!' : 'Trivia closed.')
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const stats = useMemo(() => ({
    total: sessions.length,
    live: sessions.filter(s => s.status === 'published').length,
    closed: sessions.filter(s => s.status === 'closed').length,
    totalGroups: sessions.reduce((a, s) => a + (s._groupCount ?? 0), 0),
  }), [sessions])

  return (
    <div className="p-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Trophy size={24} className="text-amber-500" /> Trivia Hub
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Create competitive group-based trivia for your classes
          </p>
        </div>
        <Button onClick={() => router.push('/teacher/trivia/create')} className="flex items-center gap-2">
          <Plus size={16} /> Create Trivia
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Trivia', value: stats.total, color: '#7C3AED', icon: <Trophy size={16} /> },
          { label: 'Live Now', value: stats.live, color: '#10B981', icon: <Zap size={16} /> },
          { label: 'Completed', value: stats.closed, color: '#6366F1', icon: <CheckCircle2 size={16} /> },
          { label: 'Total Groups', value: stats.totalGroups, color: '#F59E0B', icon: <Users size={16} /> },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.color + '20', color: s.color }}>{s.icon}</div>
              </div>
              <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>{s.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--input)' }} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-28 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--input)' }}>
            <Trophy size={36} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="font-black text-lg mb-2" style={{ color: 'var(--text)' }}>No Trivia Yet</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Create your first competitive trivia session for your students.</p>
          <Button onClick={() => router.push('/teacher/trivia/create')}>
            <Plus size={16} /> Create First Trivia
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sessions.map((s, i) => {
              const cfg = STATUS_CONFIG[s.status]
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--input)' }}>
                        <Trophy size={22} className="text-amber-500" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-black text-base" style={{ color: 'var(--text)' }}>{s.title}</h3>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-xs truncate mb-2" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3">
                          {[
                            { icon: <BookOpen size={12} />, text: s.subject?.name ?? 'No subject' },
                            { icon: <BarChart3 size={12} />, text: `${s._questionCount} Qs` },
                            { icon: <Users size={12} />, text: `${s._groupCount} groups` },
                            { icon: <CheckCircle2 size={12} />, text: `${s._submissionCount} submitted` },
                            ...(s.duration_minutes ? [{ icon: <Clock size={12} />, text: `${s.duration_minutes}min` }] : []),
                            { icon: <Users size={12} />, text: `${s.class_ids.length} class${s.class_ids.length !== 1 ? 'es' : ''}` },
                          ].map((m, mi) => (
                            <span key={mi} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {m.icon} {m.text}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button size="sm" variant="secondary" onClick={() => router.push(`/teacher/trivia/${s.id}`)}>
                          <Eye size={14} /> View
                        </Button>
                        {s.status === 'draft' && (
                          <Button size="sm" onClick={() => updateStatus(s.id, 'published')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                            <Zap size={14} /> Publish
                          </Button>
                        )}
                        {s.status === 'published' && (
                          <Button size="sm" onClick={() => updateStatus(s.id, 'closed')}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white border-0">
                            <Lock size={14} /> Close
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/teacher/trivia/${s.id}/edit`)}>
                          <FileEdit size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
