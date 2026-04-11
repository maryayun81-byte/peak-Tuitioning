'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Clock, Users, BookOpen, ChevronRight,
  CheckCircle2, Lock, Zap, Medal, BarChart3, Star,
  Crown, Info, UserPlus, Plus, X, Search, Award, LogOut, ArrowRight, Play, Trash2, ArrowUpRight, ShieldCheck
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'

import { usePageData } from '@/hooks/usePageData'
import { PageStates } from '@/components/ui/PageStates'
import { ShimmerSkeleton, TriviaSkeletonLoader } from '@/components/ui/ShimmerSkeleton'

interface Group {
  id: string
  name: string
  created_by: string
  avatar_url: string | null
  attempt_started_at: string | null
  session_id: string
  members: { student_id: string; student: { full_name: string } | null }[]
  session?: { title: string }
}

interface JoinRequest {
  id: string
  group_id: string
  student_id: string
  status: 'pending' | 'approved' | 'rejected'
  student?: { full_name: string } | null
  group?: { name: string; created_by: string; session_id: string } | null
}

interface TriviaItem {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'closed'
  duration_minutes: number | null
  subject?: { name: string } | null
  _questionCount?: number
  _myGroup?: { id: string; name: string; avatar_url: string | null } | null
  _mySubmission?: { score: number; total_questions: number; rank?: number } | null
  _myRank?: number | null
  _totalGroups?: number
  _isHydrating?: boolean
}

const LEADERSHIP_TIPS = [
  "Listen first, lead second. Great leaders empower their squad.",
  "Clear communication is the bridge between goals and achievement.",
  "Mistakes are just data for the next win. Stay positive!",
  "A leader is one who knows the way, goes the way, and shows the way.",
  "Celebrate the small wins to build momentum for the big ones."
]

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/9.x/bottts/svg?seed=Phoenix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Infinity&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Zenith&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Apex&backgroundColor=ffdfbf',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Titan&backgroundColor=ffd5dc',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Shadow&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Ignis&backgroundColor=ffdfbf',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Aqua&backgroundColor=b6e3f4',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Terra&backgroundColor=d1f4d1',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Aero&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Pulse&backgroundColor=ffd5dc',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Nova&backgroundColor=ffdfbf',
]

function LeadershipMarquee() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setIdx(v => (v + 1) % LEADERSHIP_TIPS.length), 6000)
    return () => clearInterval(interval)
  }, [])
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 overflow-hidden relative group">
      <div className="flex items-center gap-3">
        <Crown size={18} className="text-primary animate-pulse shrink-0" />
        <AnimatePresence mode="wait">
          <motion.p key={idx} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
            className="text-[10px] font-black uppercase tracking-widest text-primary italic leading-tight">
            Leader Tip: {LEADERSHIP_TIPS[idx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function StudentTriviaPage() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const router = useRouter()
  
  // 1. Mission-First Loading (Resilient & Fast)
  const { data: baseSessions, status, refetch } = usePageData<any[]>({
    cacheKey: ['trivia-missions', student?.id || 'anon'],
    fetcher: async () => {
       return supabase
        .from('trivia_sessions')
        .select('*, subject:subjects(name)')
        .eq('status', 'published')
        .contains('class_ids', [student!.class_id])
        .or(`tuition_center_id.eq.${student!.tuition_center_id},tuition_center_id.is.null`)
        .order('created_at', { ascending: false })
    },
    enabled: !!student?.id,
  })

  // 2. Local State for Enrichment
  const [enrichedData, setEnrichedData] = useState<TriviaItem[]>([])
  const [isHydrating, setIsHydrating] = useState(false)

  // ── Global Squad State ──
  const [myPersistentSquad, setMyPersistentSquad] = useState<any | null>(null)
  const [allArenaGroups, setAllArenaGroups] = useState<Group[]>([])
  const [mySentRequests, setMySentRequests] = useState<JoinRequest[]>([])
  const [incomingApprovals, setIncomingApprovals] = useState<JoinRequest[]>([])
  const [loadingSquads, setLoadingSquads] = useState(false)

  useEffect(() => {
    if (student?.id) { loadSquadArchitecture() }
  }, [student?.id, baseSessions])

  const loadSquadArchitecture = async (isSilent = false) => {
    if (!isSilent) setLoadingSquads(true)
    try {
      const activeSessionIds = (baseSessions ?? []).map(s => s.id)
      
      const [psRes, gRes, rRes, cRes] = await Promise.all([
        supabase.from('squad_members').select('squad:squads(*, members:squad_members(student_id, student:students(full_name)))').eq('student_id', student!.id).maybeSingle(),
        supabase.from('trivia_groups')
          .select('*, members:trivia_group_members(student_id, student:students(full_name)), session:trivia_sessions(title)')
          .in('session_id', activeSessionIds)
          .is('attempt_started_at', null), // Only recruiting if not started
        supabase.from('trivia_join_requests').select('*, student:students(full_name), group:trivia_groups(name, created_by, session_id)').in('session_id', activeSessionIds),
        supabase.from('students').select('id, full_name').eq('class_id', student!.class_id).neq('id', student!.id).eq('tuition_center_id', student!.tuition_center_id)
      ])

      setMyPersistentSquad(psRes.data?.squad)
      setAllArenaGroups(gRes.data as Group[] ?? [])
      setAvailableClassmates(cRes.data ?? [])

      const allReqs = rRes.data ?? []
      setMySentRequests(allReqs.filter((r: any) => r.student_id === student!.id))
      setIncomingApprovals(allReqs.filter((r: any) => r.group?.created_by === student!.id))
    } catch (e) {
      console.warn('[Squad Architecture] Load failed', e)
    } finally {
      setLoadingSquads(false)
    }
  }

  useEffect(() => {
    const channel = supabase.channel('global-squad-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivia_group_members' }, () => loadSquadArchitecture(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivia_groups' }, () => loadSquadArchitecture(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivia_join_requests' }, (payload: any) => {
        loadSquadArchitecture(true)
        if (payload.new?.student_id === student?.id && payload.new?.status === 'approved' && payload.old?.status !== 'approved') {
          toast.success('Academy Recruit: Your squad application was APPROVED! 🚀', { duration: 5000, icon: '🔥' })
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'squad_members' }, () => loadSquadArchitecture(true))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [student?.id, baseSessions])

  // ── Squad Operations ──
  const handleRequestJoin = async (groupId: string, sessionId: string) => {
    setLoadingSquads(true)
    const { error } = await supabase.from('trivia_join_requests').insert({ session_id: sessionId, group_id: groupId, student_id: student!.id })
    if (error) { toast.error('Request failed'); setLoadingSquads(false) }
    else { toast.success('Application sent! Notify the Leader.'); loadSquadArchitecture(true) }
  }

  const handleApproveRequest = async (request: JoinRequest) => {
    setLoadingSquads(true)
    try {
      const { error: mErr } = await supabase.rpc('add_trivia_group_members', { p_group_id: request.group_id, p_member_ids: [request.student_id] })
      if (mErr) throw mErr
      await supabase.from('trivia_join_requests').update({ status: 'approved' }).eq('id', request.id)
      toast.success('New recruit approved for the squad!')
      loadSquadArchitecture(true)
    } catch (e: any) { toast.error(e.message || 'Approval failed'); setLoadingSquads(false) }
  }

  const handleRejectRequest = async (requestId: string) => {
    setLoadingSquads(true)
    const { error } = await supabase.from('trivia_join_requests').update({ status: 'rejected' }).eq('id', requestId)
    if (error) { toast.error('Action failed'); setLoadingSquads(false) }
    else { toast.success('Request declined'); loadSquadArchitecture(true) }
  }

  const handleCreateAcademySquad = async () => {
    if (!newSquadName.trim()) { toast.error('Enter a squad name'); return }
    if (selectedMemberIds.length === 0) { toast.error('Recruit at least one teammate'); return }
    if (myPersistentSquad) { toast.error('You are already in a squad'); return }

    setLoadingSquads(true)
    try {
      const { data: squad, error: sErr } = await supabase.from('squads').insert({
        class_id: student!.class_id,
        name: newSquadName.trim(),
        created_by: student!.id,
        avatar_url: selectedAvatar
      }).select().single()

      if (sErr) throw sErr

      const teammates = selectedMemberIds.map(sid => ({ squad_id: squad.id, student_id: sid }))
      await supabase.from('squad_members').insert([{ squad_id: squad.id, student_id: student!.id }, ...teammates])

      toast.success('Academy Squad Formed! 🏆')
      setShowSquadCreator(false)
      loadSquadArchitecture(true)
    } catch (e: any) {
      toast.error(e.message || 'Squad formation failed')
      setLoadingSquads(false)
    }
  }

  const handleDisbandAcademySquad = async () => {
    if (!myPersistentSquad || myPersistentSquad.created_by !== student?.id) return
    if (!confirm('Disband your Academy Squad? This will remove all members.')) return
    setLoadingSquads(true)
    const { error } = await supabase.from('squads').delete().eq('id', myPersistentSquad.id)
    if (error) { toast.error('Failed to disband'); setLoadingSquads(false) }
    else { toast.success('Squad disbanded'); loadSquadArchitecture(true) }
  }

  const handleJoinTriviaWithSquad = async (sessionId: string) => {
    if (!myPersistentSquad) return
    setLoadingSquads(true)
    try {
      const { data: group, error: gErr } = await supabase.from('trivia_groups').insert({
        session_id: sessionId,
        class_id: student!.class_id,
        name: myPersistentSquad.name,
        created_by: student!.id,
        avatar_url: myPersistentSquad.avatar_url,
        squad_id: myPersistentSquad.id
      }).select().single()

      if (gErr) throw gErr

      const memberIds = myPersistentSquad.members.map((m: any) => m.student_id)
      await supabase.rpc('add_trivia_group_members', { p_group_id: group.id, p_member_ids: memberIds })
      
      toast.success('Squad registered for mission! 🏁')
      router.push(`/student/trivia/${sessionId}`)
    } catch (e: any) {
      toast.error(e.message || 'Registration failed')
      setLoadingSquads(false)
    }
  }

  // Squad Creation UI State
  const [showSquadCreator, setShowSquadCreator] = useState(false)
  const [newSquadName, setNewSquadName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0])
  const [availableClassmates, setAvailableClassmates] = useState<{id: string, full_name: string}[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Sync basic data immediately
  useEffect(() => {
    if (baseSessions) {
      setEnrichedData(baseSessions.map(s => ({ ...s, _isHydrating: true })))
      hydrateSquadStats(baseSessions)
    }
  }, [baseSessions])

  const hydrateSquadStats = async (sessions: any[]) => {
    if (!sessions.length || !student?.id) return
    setIsHydrating(true)
    
    try {
      const sessionIds = sessions.map(s => s.id)
      
      const [subsRes, membersRes, allSubsRes, qCountsRes] = await Promise.all([
        supabase.from('trivia_submissions').select('*, group:trivia_groups(id, name, avatar_url, session_id)').in('session_id', sessionIds),
        supabase.from('trivia_group_members').select('group_id, group:trivia_groups(id, name, avatar_url, session_id)').eq('student_id', student.id),
        supabase.from('trivia_submissions').select('group_id, session_id, score, time_taken_seconds, total_questions').in('session_id', sessionIds),
        supabase.from('trivia_questions').select('session_id').in('session_id', sessionIds)
      ])

      const mySubs = subsRes.data ?? []
      const myMemberships = membersRes.data ?? []
      const allSubs = allSubsRes.data ?? []
      const qCounts = qCountsRes.data ?? []

      const qCountMap = qCounts.reduce((acc: any, q) => {
        acc[q.session_id] = (acc[q.session_id] || 0) + 1
        return acc
      }, {})

      const fullyEnriched = sessions.map(s => {
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
          _isHydrating: false
        }
      })

      setEnrichedData(fullyEnriched)
    } catch (e) {
      console.warn('[Trivia Hydration] Enriched stats failed, showing core info only.', e)
    } finally {
      setIsHydrating(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="p-4 md:p-8 space-y-8 bg-[var(--bg)] min-h-screen">
         <header className="flex flex-col gap-4">
            <ShimmerSkeleton className="w-64 h-10" />
            <ShimmerSkeleton className="w-48 h-4" variant="text" />
         </header>
         <TriviaSkeletonLoader />
      </div>
    )
  }

  if (status === 'error' || status === 'timeout') {
    return <PageStates status={status} onRetry={refetch} />
  }

  if (status === 'empty') {
    return (
      <div className="p-4 md:p-8 space-y-8 bg-[var(--bg)] min-h-screen">
         <div className="py-28 text-center flex flex-col items-center">
            <Trophy size={48} className="text-muted opacity-20 mb-4" />
            <h3 className="font-black text-xl italic" style={{ color: 'var(--text)' }}>Battlefield Empty</h3>
            <p className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: 'var(--text-muted)' }}>Missions will appear when authorized by Command.</p>
         </div>
      </div>
    )
  }


  return (
    <div className="p-4 md:p-8 pb-20 space-y-12 bg-[var(--bg)] min-h-screen relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter flex items-center gap-4" style={{ color: 'var(--text)' }}>
            <div className="w-14 h-14 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 rotate-3 animate-pulse">
               <Trophy size={32} className="text-white" />
            </div>
            Trivia Command
          </h1>
          <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-primary/60 mt-3">Strategic HQ • Academic Warfare</p>
        </div>
        <div className="hidden md:flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Global Arena Status</span>
              <span className="text-xs font-black text-emerald-500 uppercase tracking-tighter">Command Online</span>
           </div>
        </div>
      </header>

      {/* ── SQUAD COMMAND CENTER ── */}
      <div className="relative z-20 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Academy Squad - Left/Center */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary" /> Academy Squad Headquarters
            </label>
            
            {!myPersistentSquad ? (
              <Card className="p-8 border-2 border-dashed border-[var(--card-border)] bg-[var(--card)]/50 text-center flex flex-col items-center gap-5 group hover:border-primary/30 transition-all">
                <div className="w-16 h-16 rounded-3xl bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-primary transition-colors">
                  <Plus size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase italic" style={{ color: 'var(--text)' }}>No Active Squad</h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] mt-2 uppercase tracking-tight max-w-sm mx-auto">Build your legacy. Form a persistent Academy Squad to compete for the highest ranks in the Arena.</p>
                </div>
                <Button className="h-12 px-8 font-black uppercase tracking-widest bg-primary hover:bg-primary-hover text-white shadow-xl shadow-primary/20"
                  onClick={() => setShowSquadCreator(true)}>
                  Form Academy Squad
                </Button>
              </Card>
            ) : (
              <Card className="p-6 md:p-8 border-2 border-primary/20 bg-[var(--card)] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
                
                <div className="relative flex flex-col sm:flex-row items-center gap-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-[2rem] bg-[var(--input)] border-2 border-primary/20 p-2 flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-3 transition-transform">
                      {myPersistentSquad.avatar_url 
                        ? <img src={myPersistentSquad.avatar_url} alt="" className="w-full h-full object-contain" />
                        : <Users className="text-primary" size={40} />}
                    </div>
                    <div className="absolute -top-3 -right-3 bg-amber-500 text-white p-2 rounded-xl border-4" style={{ borderColor: 'var(--bg)' }}>
                       <Crown size={14} className="fill-current" />
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter" style={{ color: 'var(--text)' }}>{myPersistentSquad.name}</h2>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                      {myPersistentSquad.members.map((m: any) => (
                        <div key={m.student_id} className="px-3 py-1.5 rounded-xl bg-[var(--input)] border border-[var(--card-border)] text-[9px] font-black text-[var(--text-muted)] uppercase flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500" /> {m.student?.full_name}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full sm:w-auto shrink-0">
                    <LeadershipMarquee />
                    {myPersistentSquad.created_by === student?.id && (
                      <Button variant="ghost" size="sm" onClick={handleDisbandAcademySquad}
                        className="text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500/10 h-8 tracking-widest">
                        <Trash2 size={12} className="mr-2" /> Disband Squad
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Recruitment Board - Right */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
               <Zap size={14} className="fill-current" /> Arena Recruitment Board
             </label>
             <Card className="h-[210px] border-2 border-[var(--card-border)] bg-[var(--card)]/80 backdrop-blur-md overflow-hidden flex flex-col">
               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {allArenaGroups.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale p-6">
                       <Search size={32} className="mb-2" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Radar clear. No active recruiters found.</p>
                    </div>
                  )}
                  {allArenaGroups.map(g => {
                    const sent = mySentRequests.find(r => r.group_id === g.id)
                    const isFull = g.members?.length >= 3
                    const isInGroup = g.members.some(m => m.student_id === student?.id)
                    
                    if (isInGroup) return null

                    return (
                      <div key={g.id} className="p-3 rounded-2xl bg-[var(--input)]/50 border border-[var(--card-border)] flex items-center justify-between group/item hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-[var(--bg)] p-1.5 shrink-0 border border-[var(--card-border)]">
                              <img src={g.avatar_url || ''} alt="" className="w-full h-full object-contain" />
                           </div>
                           <div className="min-w-0">
                              <div className="text-[11px] font-black uppercase italic tracking-tighter truncate" style={{ color: 'var(--text)' }}>{g.name}</div>
                              <div className="flex items-center gap-3 mt-0.5">
                                 <div className="text-[8px] font-black text-primary uppercase flex items-center gap-1">
                                    <Plus size={8} /> Mission: {g.session?.title}
                                 </div>
                                 <div className="text-[8px] font-black text-[var(--text-muted)] uppercase flex items-center gap-1">
                                    <Users size={8} /> {g.members?.length || 0}/3 Members
                                 </div>
                              </div>
                           </div>
                        </div>
                        {sent ? (
                           <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${sent.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : sent.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                              {sent.status}
                           </div>
                        ) : (
                          <Button size="sm" onClick={() => handleRequestJoin(g.id, g.session_id)}
                            className="h-8 px-4 text-[9px] font-black bg-[var(--bg)] text-[var(--text-muted)] hover:bg-primary hover:text-white rounded-xl shadow-sm"
                            disabled={isFull || loadingSquads}>
                            {isFull ? 'FULL' : 'APPLY'}
                          </Button>
                        )}
                      </div>
                    )
                  })}
               </div>
               
               {/* Leaders Global Approvals */}
               {incomingApprovals.filter(r => r.status === 'pending').length > 0 && (
                 <div className="bg-primary/10 border-t border-primary/20 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Crown size={14} className="text-primary" />
                       <span className="text-[9px] font-black text-primary uppercase tracking-widest">{incomingApprovals.filter(r => r.status === 'pending').length} Recruits Pending Approval</span>
                    </div>
                    <Button size="sm" onClick={() => { /* Quick modal for approvals */ }} className="h-7 px-3 bg-primary text-white text-[8px] font-black uppercase">Review</Button>
                 </div>
               )}
             </Card>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2 ml-1">
          <Play size={14} className="text-primary" /> Current Active Arena Missions
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrichedData.map((t, i) => {
            const hasSubmitted = !!t._mySubmission
            const isTop = t._myRank === 1
            const hasGroup = !!t._myGroup
            const isHydratingItem = t._isHydrating

            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.02 }}>
                <Card 
                  className={`p-6 cursor-pointer relative overflow-hidden transition-all duration-300 border-2 group shadow-lg ${isTop ? 'border-amber-400 bg-amber-400/5' : hasSubmitted ? 'border-emerald-500/20 bg-emerald-500/5 opacity-80' : 'border-[var(--card-border)] hover:border-primary/50 shadow-xl bg-[var(--card)]'}`}
                  onClick={() => router.push(`/student/trivia/${t.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--input)] flex items-center justify-center shrink-0 border border-[var(--card-border)] relative">
                       {isHydratingItem ? <ShimmerSkeleton className="w-full h-full rounded-xl" /> : 
                        hasSubmitted ? <img src={t._myGroup?.avatar_url || ''} className="w-full h-full object-contain" /> : <Trophy size={28} className={hasGroup ? 'text-primary' : 'text-[var(--text-muted)] opacity-20'} />}
                       {hasSubmitted && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-lg flex items-center justify-center border-2 border-white"><CheckCircle2 size={10} className="text-white" /></div>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-sm uppercase italic tracking-tighter truncate" style={{ color: 'var(--text)' }}>{t.title}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        {t.subject && <span className="text-[9px] font-black text-primary uppercase">{t.subject.name}</span>}
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">• {t._questionCount} Qs</span>
                      </div>
                      
                      {hasGroup && !hasSubmitted ? (
                         <div className="mt-4 flex items-center justify-between">
                            <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1"><Users size={12} /> Squad Assigned</span>
                            <Button size="sm" className="h-8 px-4 bg-primary text-white text-[9px] font-black uppercase">Launch</Button>
                         </div>
                      ) : !hasSubmitted && myPersistentSquad ? (
                         <Button onClick={(e) => { e.stopPropagation(); handleJoinTriviaWithSquad(t.id) }} 
                          className="mt-4 w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest">
                           Register Squad
                         </Button>
                      ) : !hasSubmitted && (
                         <div className="mt-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest text-center py-2 bg-[var(--input)] rounded-lg">
                            Find a Squad Above ☝️
                         </div>
                      )}
                    </div>
                  </div>

                  {hasSubmitted && (
                    <div className="mt-4 pt-4 border-t border-[var(--card-border)] flex items-center justify-between">
                       <span className="text-[9px] font-black text-[var(--text-muted)] uppercase italic">Your Squad Result:</span>
                       <span className="text-xl font-black text-emerald-500 italic">{t._mySubmission?.score}</span>
                    </div>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Squad Creator Modal Overlay ── */}
      <AnimatePresence>
        {showSquadCreator && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--bg)]/90 backdrop-blur-md">
             <Card className="w-full max-w-lg p-8 relative space-y-8 border-2 border-primary/20 shadow-2xl">
                <button onClick={() => setShowSquadCreator(false)} className="absolute top-6 right-6 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"><X size={24} /></button>
                
                <div className="text-center space-y-2">
                   <div className="w-20 h-20 rounded-3xl bg-primary/10 border-2 border-primary/30 mx-auto flex items-center justify-center mb-4 relative overflow-hidden group/avatar shadow-inner">
                      <AnimatePresence mode="wait">
                         <motion.img 
                           key={selectedAvatar}
                           initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                           animate={{ scale: 1, opacity: 1, rotate: 0 }}
                           exit={{ scale: 1.5, opacity: 0, rotate: 15 }}
                           src={selectedAvatar} 
                           alt="Crest" 
                           className="w-14 h-14 object-contain relative z-10" 
                         />
                      </AnimatePresence>
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                   </div>
                   <h2 className="text-2xl font-black uppercase italic" style={{ color: 'var(--text)' }}>Academy Registration</h2>
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Unity • Glory • Legacy</p>
                </div>

                <div className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-3 block text-center">Select Squad Crest</label>
                      <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x no-scrollbar">
                         {AVATAR_OPTIONS.map((url, i) => (
                           <button
                             key={url}
                             onClick={() => setSelectedAvatar(url)}
                             className={`w-14 h-14 rounded-2xl shrink-0 border-2 transition-all snap-center flex items-center justify-center p-2 bg-[var(--input)] ${selectedAvatar === url ? 'border-primary ring-4 ring-primary/10 scale-105 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                           >
                             <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-contain" />
                           </button>
                         ))}
                      </div>
                   </div>

                   <Input label="Squad Designation" value={newSquadName} onChange={e => setNewSquadName(e.target.value)} placeholder="Enter unique squad name..." className="h-14 font-black uppercase italic" />
                   
                   <div>
                      <label className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-2 block">Recruit Your Roster (Max 3)</label>
                      <div className="relative mb-3">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                         <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search tuition center..." className="h-11 pl-10 text-xs bg-[var(--input)] border-transparent" />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-2xl bg-[var(--input)]/50">
                         {availableClassmates.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => {
                           const isSelected = selectedMemberIds.includes(c.id)
                           return (
                             <button key={c.id} onClick={() => isSelected ? setSelectedMemberIds(v => v.filter(id => id !== c.id)) : selectedMemberIds.length < 2 ? setSelectedMemberIds(v => [...v, c.id]) : toast.error('Max 3 members')}
                               className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-black ${isSelected ? 'bg-primary text-white' : 'hover:bg-primary/5 text-[var(--text-muted)]'}`}>
                               {c.full_name}
                               {isSelected ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
                             </button>
                           )
                         })}
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <Button variant="secondary" className="flex-1 h-14 font-black uppercase" onClick={() => setShowSquadCreator(false)}>Cancel</Button>
                   <Button className="flex-1 h-14 font-black uppercase bg-primary text-white shadow-xl shadow-primary/20" onClick={handleCreateAcademySquad} disabled={!newSquadName.trim() || loadingSquads}>
                      Confirm Roster <ArrowRight size={20} className="ml-2" />
                   </Button>
                </div>
             </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
