'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Trophy, Clock, Users, BookOpen, ChevronRight,
  CheckCircle2, Lock, Zap, Medal, BarChart3, Star
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'

interface TriviaItem {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'closed'
  duration_minutes: number | null
  subject?: { name: string } | null
  _questionCount: number
  _myGroup: { id: string; name: string; avatar_url: string | null } | null
  _mySubmission: { score: number; total_questions: number; rank?: number } | null
  _myRank: number | null
  _totalGroups: number
}

export default function StudentTriviaPage() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const router = useRouter()
  const [trivias, setTrivias] = useState<TriviaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (student?.id) load() }, [student?.id])

  const load = async () => {
    setLoading(true)
    try {
      const { data: sessions, error: sErr } = await supabase
        .from('trivia_sessions')
        .select('*, subject:subjects(name)')
        .eq('status', 'published')
        .contains('class_ids', [student!.class_id])
        .or(`tuition_center_id.eq.${student!.tuition_center_id},tuition_center_id.is.null`)
        .order('created_at', { ascending: false })

      if (sErr) throw sErr
      if (!sessions?.length) { setTrivias([]); return }

      const sessionIds = sessions.map(s => s.id)
      
      const [subsRes, membersRes, allSubsRes, qCountsRes] = await Promise.all([
        supabase.from('trivia_submissions').select('*, group:trivia_groups(id, name, avatar_url, session_id)').in('session_id', sessionIds),
        supabase.from('trivia_group_members').select('group_id, group:trivia_groups(id, name, avatar_url, session_id)').eq('student_id', student!.id),
        supabase.from('trivia_submissions').select('group_id, session_id, score, time_taken_seconds').in('session_id', sessionIds),
        supabase.from('trivia_questions').select('session_id').in('session_id', sessionIds)
      ])

      const mySubs = subsRes.data ?? []
      const myMemberships = membersRes.data ?? []
      const allSubs = allSubsRes.data ?? []
      const qCounts = qCountsRes.data ?? []

      // Create maps for O(1) lookup to prevent O(N^2) hangs
      const qCountMap = qCounts.reduce((acc: any, q) => {
        acc[q.session_id] = (acc[q.session_id] || 0) + 1
        return acc
      }, {})

      const enriched = sessions.map(s => {
        const qCount = qCountMap[s.id] || 0
        const membership = myMemberships.find((m: any) => m.group?.session_id === s.id)
        const groupData = membership?.group as any
        const myGroup = groupData ? { id: groupData.id, name: groupData.name, avatar_url: groupData.avatar_url } : null

        const mySub = myGroup ? mySubs.find((sub: any) => sub.group_id === myGroup.id) : null

        const sessionSubs = allSubs.filter((sub: any) => sub.session_id === s.id)
        const sorted = [...sessionSubs].sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score
          return (a.time_taken_seconds ?? 99999) - (b.time_taken_seconds ?? 99999)
        })
        const myRank = myGroup ? sorted.findIndex((sub: any) => sub.group_id === myGroup.id) + 1 : null

        return {
          ...s,
          _questionCount: qCount,
          _myGroup: myGroup,
          _mySubmission: mySub ? { score: mySub.score, total_questions: mySub.total_questions } : null,
          _myRank: (myRank !== null && myRank > 0) ? myRank : null,
          _totalGroups: sessionSubs.length,
        }
      })

      setTrivias(enriched)
    } catch (e) {
      console.error('Lobby load error:', e)
      toast.error('Arena synchronization stalled. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 pb-20 space-y-8 bg-[var(--bg)] min-h-screen relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3" style={{ color: 'var(--text)' }}>
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 rotate-3 animate-pulse">
               <Trophy size={28} className="text-white" />
            </div>
            Trivia Arena
          </h1>
          <p className="text-xs font-black uppercase tracking-[0.4em] text-primary/60 mt-2">Squad Warfare • Academic Excellence</p>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Global Status</span>
              <span className="text-xs font-black text-emerald-500 uppercase tracking-tighter">Arena Online</span>
           </div>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4 relative z-10">
          {[1,2,3].map(i => (
             <div key={i} className="h-32 rounded-[2rem] animate-pulse border-2 border-[var(--card-border)] bg-[var(--card)]/50" />
          ))}
        </div>
      ) : trivias.length === 0 ? (
        <div className="py-28 text-center relative z-10">
          <div className="w-24 h-24 rounded-[2.5rem] bg-[var(--input)] flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Trophy size={48} style={{ color: 'var(--text-muted)' }} className="opacity-20" />
          </div>
          <h3 className="font-black text-xl uppercase italic italic leading-none" style={{ color: 'var(--text)' }}>Battlefield Empty</h3>
          <p className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: 'var(--text-muted)' }}>Missions will appear when authorized by Command.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {trivias.map((t, i) => {
            const hasSubmitted = !!t._mySubmission
            const isTop = t._myRank === 1
            const hasGroup = !!t._myGroup

            return (
              <motion.div 
                key={t.id} 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card 
                  className={`p-6 cursor-pointer relative overflow-hidden transition-all duration-300 border-2 group ${isTop ? 'border-amber-400 ring-8 ring-amber-400/5 bg-amber-400/5 shadow-2xl' : hasSubmitted ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--card-border)] hover:border-primary/50 shadow-xl bg-[var(--card)]/80 backdrop-blur-sm'}`}
                  onClick={() => router.push(`/student/trivia/${t.id}`)}
                >
                  {isTop && (
                     <div className="absolute top-0 right-0 p-3">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}>
                           <Star size={24} className="text-amber-500 fill-current opacity-20" />
                        </motion.div>
                     </div>
                  )}

                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-inner p-2 bg-[var(--input)] relative">
                       {hasSubmitted ? (
                          <img src={t._myGroup?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=Winner'} alt="" className="w-full h-full object-contain" />
                       ) : (
                          <Trophy size={32} className={`${hasGroup ? 'text-primary' : 'text-[var(--text-muted)] opacity-30'}`} />
                       )}
                       {hasSubmitted && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-lg">
                             <CheckCircle2 size={12} className="text-white" />
                          </div>
                       )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-black text-lg uppercase italic tracking-tighter leading-tight group-hover:text-primary transition-colors" style={{ color: 'var(--text)' }}>{t.title}</h3>
                        {hasSubmitted && t._myRank && (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic flex items-center gap-1 ${isTop ? 'bg-amber-400 text-black shadow-lg' : 'bg-primary/20 text-primary'}`}>
                             #{t._myRank} OVERALL
                          </span>
                        )}
                      </div>
                      
                      {t.description && <p className="text-[10px] uppercase font-bold tracking-wider mb-4 line-clamp-1 opacity-60" style={{ color: 'var(--text-muted)' }}>{t.description}</p>}
                      
                      <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-[0.2em]">
                        {t.subject && <span className="flex items-center gap-1.5 text-primary"><BookOpen size={13} /> {t.subject.name}</span>}
                        <span className="flex items-center gap-1.5 text-[var(--text-muted)]"><BarChart3 size={13} /> {t._questionCount} Quest</span>
                        {hasGroup && !hasSubmitted && <span className="flex items-center gap-1.5 text-amber-500 animate-pulse"><Users size={13} /> Squad Ready</span>}
                      </div>

                      {hasGroup && (
                         <div className="mt-4 flex items-center gap-2 border-t border-[var(--card-border)] pt-4">
                            <span className="text-[9px] font-black text-primary uppercase">Assigned Squad:</span>
                            <span className="text-[10px] font-bold text-[var(--text)] italic uppercase tracking-tighter">{t._myGroup?.name}</span>
                         </div>
                      )}
                    </div>

                    <div className="shrink-0 group-hover:translate-x-1 transition-transform">
                      <ChevronRight size={24} className="text-primary opacity-30" />
                    </div>
                  </div>

                  {hasSubmitted && (
                     <div className="absolute bottom-6 right-6 text-right">
                        <div className="text-3xl font-black italic tracking-tighter text-emerald-500 leading-none">{t._mySubmission!.score}</div>
                        <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Combat Points</div>
                     </div>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
