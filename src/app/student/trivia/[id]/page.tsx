'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, BookOpen, Clock, Users, ChevronLeft, ArrowRight,
  Plus, CheckCircle2, Zap, Save, UserPlus, LogOut, Medal, Star, Award, ShieldCheck,
  Play, Info, RotateCcw, Trash2, UserMinus, BarChart3, Crown, X
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface Session {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'closed'
  duration_minutes: number | null
  subject?: { name: string } | null
}

interface Group {
  id: string
  name: string
  created_by: string
  avatar_url: string | null
  attempt_started_at: string | null
  attempt_started_by: string | null
  session_id: string
  starter_name?: string
  members: { student_id: string; student: { full_name: string } | null }[]
}

interface JoinRequest {
  id: string
  group_id: string
  student_id: string
  status: 'pending' | 'approved' | 'rejected'
  student?: { full_name: string } | null
  group?: { name: string } | null
}

// ── Avatar Library ─────────────────────────────────────────────
// Categorised for a diverse, inclusive experience

const MASCULINE_AVATARS = [
  { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Titan', label: 'Titan' },
  { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Knight', label: 'Knight' },
  { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Ninja', label: 'Ninja' },
  { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Storm', label: 'Storm' },
  { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Blade', label: 'Blade' },
  { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Rex', label: 'Rex' },
  { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Ace', label: 'Ace' },
  { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Fox', label: 'Fox' },
  { url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&facialHair[]&hairColor=2c1b18', label: 'Felix' },
  { url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Max&facialHair[]', label: 'Max' },
  { url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Leo&facialHair[]', label: 'Leo' },
  { url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex', label: 'Alex' },
]

const FEMININE_AVATARS = [
  { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Luna', label: 'Luna' },
  { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Maya', label: 'Maya' },
  { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Sofia', label: 'Sofia' },
  { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Emma', label: 'Emma' },
  { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Aria', label: 'Aria' },
  { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zara', label: 'Zara' },
  { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Nova', label: 'Nova' },
  { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Cleo', label: 'Cleo' },
  { url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Lily&top=longHair-straight', label: 'Lily' },
  { url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rose&top=longHair-bun', label: 'Rose' },
  { url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Amy&top=longHair-curly', label: 'Amy' },
  { url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Grace&top=longHair-straight2', label: 'Grace' },
]

const UNISEX_AVATARS = [
  { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Guardian', label: 'Guardian' },
  { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Spark', label: 'Spark' },
  { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Core', label: 'Core' },
  { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Byte', label: 'Byte' },
  { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Vector', label: 'Vector' },
  { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Pixel', label: 'Pixel' },
  { url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Scholar', label: 'Scholar' },
  { url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Champion', label: 'Champ' },
  { url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Genius', label: 'Genius' },
  { url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Blaze', label: 'Blaze' },
  { url: 'https://api.dicebear.com/9.x/open-peeps/svg?seed=Squad1', label: 'Squad' },
  { url: 'https://api.dicebear.com/9.x/big-smile/svg?seed=Joy', label: 'Joy' },
]

const AVATAR_TABS = [
  { key: 'unisex', label: '🤖 Team', avatars: UNISEX_AVATARS },
  { key: 'feminine', label: '🦸‍♀️ Girls', avatars: FEMININE_AVATARS },
  { key: 'masculine', label: '🦸 Boys', avatars: MASCULINE_AVATARS },
]

const ALL_AVATARS = [...UNISEX_AVATARS, ...FEMININE_AVATARS, ...MASCULINE_AVATARS]

const LEADERSHIP_TIPS = [
  "Listen first, lead second. Great leaders empower their squad.",
  "Clear communication is the bridge between goals and achievement.",
  "Mistakes are just data for the next win. Stay positive!",
  "A leader is one who knows the way, goes the way, and shows the way.",
  "Focus on your squad's strengths and support their growth.",
  "Encourage collaboration over competition within your team.",
  "Resilience is the hallmark of a champion squad leader.",
  "Celebrate the small wins to build momentum for the big ones."
]

export default function StudentTriviaLobbyPage() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [myGroup, setMyGroup] = useState<Group | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Group creation state
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [isPersistentMode, setIsPersistentMode] = useState(true)
  const [groupName, setGroupName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(ALL_AVATARS[0].url)
  const [avatarTab, setAvatarTab] = useState<'unisex' | 'feminine' | 'masculine'>('unisex')
  const [searchQuery, setSearchQuery] = useState('')
  const [availableClassmates, setAvailableClassmates] = useState<{ id: string; full_name: string }[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [availableSquads, setAvailableSquads] = useState<any[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [myRequests, setMyRequests] = useState<JoinRequest[]>([])
  const [incomingRequests, setIncomingRequests] = useState<JoinRequest[]>([])

  useEffect(() => {
    // Correctly load all dependencies for the lobby
    if (sessionId && student?.id) { loadAll() }
  }, [sessionId, student?.id])

  const loadAll = async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    if (!isSilent) setLoadError(false)
    try {
      const [sRes, mRes, subRes] = await Promise.all([
        supabase.from('trivia_sessions').select('id, title, description, status, duration_minutes, questions_count, max_participants, subject:subjects(name)').eq('id', sessionId).single(),
        supabase.from('trivia_group_members')
          .select(`group_id, group:trivia_groups(id, name, created_by, session_id, avatar_url, attempt_started_at, attempt_started_by, members:trivia_group_members(student_id, student:students(full_name)))`)
          .eq('student_id', student!.id),
        supabase.from('trivia_submissions').select('id, group_id').eq('session_id', sessionId)
      ])

      if (sRes.error) { toast.error('Trivia not found'); router.push('/student/trivia'); return }
      // Supabase returns joined relations as arrays; normalise subject to object
      const rawSession = sRes.data as any
      setSession({
        ...rawSession,
        subject: Array.isArray(rawSession.subject) ? rawSession.subject[0] : rawSession.subject,
      })

      const membership = (mRes.data ?? []).find((m: any) => m.group?.session_id === sessionId)
      let sessionGroup = membership?.group as any

      if (sessionGroup?.attempt_started_by) {
        const { data: starter } = await supabase.from('students').select('full_name').eq('id', sessionGroup.attempt_started_by).single()
        sessionGroup.starter_name = starter?.full_name
      }

      setMyGroup(sessionGroup as any)

      if (sessionGroup) {
        const submission = (subRes.data ?? []).find((s: any) => s.group_id === sessionGroup.id)
        setHasSubmitted(!!submission)
      } else {
        // Safety Guard: If no group found for this session, redirect back with a helpful toast
        toast.error('Mission Locked: You must join or form a squad to enter this lobby!')
        router.replace('/student/trivia')
        return
      }
    } catch (e) {
      console.error('Failed to load lobby data', e)
      if (!isSilent) setLoadError(true)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    // Real-time synchronization for the lobby
    const channel = supabase.channel(`trivia-lobby-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivia_group_members' }, () => {
        console.log('Membership shift detected. Synchronizing...')
        loadAll(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivia_groups' }, () => {
         console.log('Squad structure update. Synchronizing...')
         loadAll(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trivia_join_requests' }, (payload: any) => {
         console.log('Recruitment request shift. Synchronizing...')
         loadAll(true)
         
         // If a request was approved for ME, toast it
         if (payload.new?.student_id === student?.id && payload.new?.status === 'approved' && payload.old?.status !== 'approved') {
            toast.success('Your squad application has been APPROVED! 🚀', { duration: 5000, icon: '🔥' })
         }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, student?.id])

  // ── Group Management ─────────────────────────────────────────

  // ── Recruitment & Join Logic ─────────────────────────────────

  const handleDisbandGroup = async () => {
    if (!myGroup || myGroup.created_by !== student?.id) return
    if (myGroup.attempt_started_at) { toast.error('Cannot disband once started!'); return }
    if (!confirm('Disband this squad? All members will be removed.')) return
    setLoading(true)
    const { error } = await supabase.from('trivia_groups').delete().eq('id', myGroup.id)
    if (error) { toast.error('Failed to disband squad'); setLoading(false) }
    else { toast.success('Squad disbanded'); setMyGroup(null); await loadAll() }
  }

  const handleLeaveGroup = async () => {
    if (!myGroup) return
    if (myGroup.attempt_started_at) { toast.error('Cannot leave once mission has started!'); return }
    setLoading(true)
    const isLeader = myGroup.created_by === student?.id
    if (isLeader || myGroup.members.length <= 1) {
      const { error } = await supabase.from('trivia_groups').delete().eq('id', myGroup.id)
      if (error) { toast.error('Failed to exit group'); setLoading(false) }
      else { toast.success('Squad disbanded'); setMyGroup(null); await loadAll() }
      return
    }
    const { error } = await supabase.from('trivia_group_members').delete().eq('group_id', myGroup.id).eq('student_id', student!.id)
    if (error) { toast.error('Failed to leave squad'); setLoading(false) }
    else { toast.success('Left the squad'); await loadAll() }
  }

  const handleKickMember = async (memberId: string) => {
    if (!myGroup || myGroup.created_by !== student?.id) return
    if (myGroup.attempt_started_at) { toast.error('Cannot remove members once mission has started!'); return }
    setLoading(true)
    const { error } = await supabase.from('trivia_group_members').delete().eq('group_id', myGroup.id).eq('student_id', memberId)
    if (error) { toast.error('Failed to remove member'); setLoading(false) }
    else { toast.success('Member removed'); await loadAll() }
  }

  const filteredClassmates = availableClassmates.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  const isLeader = myGroup?.created_by === student?.id

  if (loading && !session) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--primary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading Arena…</p>
      </div>
    </div>
  )

  if (loadError && !session) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center mx-auto">
          <Trophy size={32} className="text-rose-500" />
        </div>
        <h2 className="text-xl font-black uppercase italic" style={{ color: 'var(--text)' }}>Couldn&apos;t Load Arena</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>There was a problem loading this trivia session. Please check your connection.</p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="secondary" onClick={() => router.push('/student/trivia')}><ChevronLeft size={16} /> Back</Button>
          <Button onClick={() => loadAll()}>Try Again</Button>
        </div>
      </div>
    </div>
  )

  if (!session) return null

  return (
    <div className="relative min-h-screen pb-20 overflow-x-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full opacity-50" />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/student/trivia')} className="text-[var(--text-muted)] hover:text-primary">
            <ChevronLeft size={24} />
          </Button>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Academy Status</div>
            <div className="flex items-center justify-end gap-2 text-emerald-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-tighter">Arena Active</span>
            </div>
          </div>
        </div>

        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none" style={{ color: 'var(--text)' }}>Trivia Arena</h1>
          <p className="text-[10px] md:text-xs font-black tracking-[0.4em] text-primary uppercase mt-2">Knowledge • Strategy • Achievement</p>
        </div>

        <AnimatePresence mode="wait">
          {!myGroup ? (
            <motion.div key="no-group" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <Card className="p-12 border-2 border-dashed border-[var(--card-border)] bg-[var(--card)]/50 text-center flex flex-col items-center gap-6 group hover:border-primary/30 transition-all">
                <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-primary transition-colors shadow-inner">
                  <ShieldCheck size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase italic" style={{ color: 'var(--text)' }}>Squad Participation Required</h3>
                  <p className="text-xs font-bold text-[var(--text-muted)] max-w-sm mx-auto uppercase tracking-tighter leading-tight">You must be part of an authorized Academy Squad or Arena Team to launch this mission.</p>
                </div>
                <Button className="h-14 px-10 font-black uppercase tracking-widest bg-primary hover:bg-primary-hover text-white shadow-xl shadow-primary/20 flex items-center gap-3"
                  onClick={() => router.push('/student/trivia')}>
                  <ChevronLeft size={20} /> Report to Command HQ
                </Button>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] italic">Centralized recruitment & squad formation is managed at HQ</p>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <Card className="p-6 md:p-10 border-2 border-primary/20 relative overflow-hidden shadow-2xl" style={{ background: 'var(--card)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -mr-16 -mt-16" />

                {/* Squad header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-10 relative z-10">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-[2rem] bg-[var(--bg)] border border-primary/30 p-2 shadow-inner">
                        {myGroup.avatar_url
                          ? <img src={myGroup.avatar_url} alt="Crest" className="w-full h-full object-contain" />
                          : <div className="w-full h-full flex items-center justify-center bg-primary text-white font-black text-3xl rounded-3xl">{myGroup.name[0]}</div>}
                      </div>
                      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}
                        className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white border-4"
                        style={{ borderColor: 'var(--bg)' }}>
                        <Award size={20} className="fill-current" />
                      </motion.div>
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="font-black text-3xl uppercase italic leading-tight" style={{ color: 'var(--text)' }}>{myGroup.name}</h2>
                      <div className="text-[10px] font-black text-primary tracking-[0.3em] uppercase flex items-center justify-center sm:justify-start gap-2 mt-2">
                        <Users size={14} /> Squad • {myGroup.members.length}/3 Members
                      </div>
                    </div>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex flex-col items-center sm:items-end gap-3 shrink-0">
                    {hasSubmitted ? (
                      <div className="px-6 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                        <CheckCircle2 size={16} /> Assignment Complete
                      </div>
                    ) : (
                      <div className="flex flex-col items-center sm:items-end gap-3">
                        {!myGroup.attempt_started_at && (
                          <>
                            {isLeader ? (
                              <Button variant="ghost" size="sm" onClick={handleDisbandGroup}
                                className="h-9 px-4 text-rose-500 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 rounded-xl">
                                <Trash2 size={16} /> Disband Squad
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={handleLeaveGroup}
                                className="h-9 px-4 text-rose-500 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 rounded-xl">
                                <LogOut size={16} /> Exit Squad
                              </Button>
                            )}
                          </>
                        )}
                        <div className={`px-6 py-2 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl flex items-center gap-2 ${myGroup.attempt_started_at ? 'bg-amber-500 animate-pulse' : 'bg-primary shadow-primary/20'}`}>
                          {myGroup.attempt_started_at ? <><Play size={14} className="fill-current" /> In Progress</> : <><ShieldCheck size={14} /> Ready</>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Leader Management Hub */}
                {isLeader && !hasSubmitted && !myGroup.attempt_started_at && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-6 mb-10 pt-6 border-t border-[var(--card-border)] relative z-10">
                    
                    {incomingRequests.filter(r => r.status === 'pending').length > 0 && (
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">New Recruits Awaiting Your Command</label>
                         <div className="grid grid-cols-1 gap-2">
                            {incomingRequests.filter(r => r.status === 'pending').map(req => (
                              <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                    {req.student?.full_name[0]}
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-tighter" style={{ color: 'var(--text)' }}>{req.student?.full_name}</span>
                                </div>
                                <div className="flex items-center gap-2" />
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Members Roster */}
                <div className="space-y-6 relative z-10">
                  <div className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--text-muted)] flex items-center gap-3">
                    <Medal size={16} className="text-primary" /> Authorized Academy Roster
                    {isLeader && !hasSubmitted && !myGroup.attempt_started_at && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[8px]">Tap ✕ to remove</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {myGroup.members.map(m => {
                      const isCaptain = m.student_id === myGroup.created_by
                      const isMe = m.student_id === student?.id
                      const canRemove = isLeader && !isCaptain && !hasSubmitted && !myGroup.attempt_started_at
                      return (
                        <motion.div
                          key={m.student_id}
                          whileHover={{ y: -2 }}
                          className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all relative ${isCaptain ? 'bg-primary/10 border-primary/30' : 'bg-[var(--bg)]/50 border-[var(--card-border)]'}`}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black ${isCaptain ? 'bg-primary text-white shadow-xl' : 'bg-[var(--input)] text-primary'}`}>
                            {m.student?.full_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-black truncate uppercase tracking-tight" style={{ color: 'var(--text)' }}>{m.student?.full_name}</div>
                            <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mt-1 flex items-center gap-1" style={{ color: isCaptain ? 'var(--primary)' : 'var(--text-muted)' }}>
                              {isCaptain && <Crown size={10} />}
                              {isCaptain ? 'Squad Leader' : isMe ? 'You' : 'Partner Scholar'}
                            </div>
                          </div>
                          {canRemove && (
                            <button
                              onClick={() => handleKickMember(m.student_id)}
                              className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shrink-0"
                              title="Remove member"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Action Footer */}
                {!hasSubmitted ? (
                  <div className="mt-8 pt-8 border-t border-[var(--card-border)] flex flex-col items-center gap-6 relative z-10">
                    {myGroup.attempt_started_at ? (
                      <div className="text-center space-y-4">
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none">Ongoing assignment detected</p>
                        <p className="text-[10px] uppercase font-black text-amber-500 tracking-tighter leading-none">Started by: {myGroup.starter_name || 'Teammate'}</p>
                        <Button className="h-16 px-12 text-lg font-black uppercase tracking-[0.3em] bg-amber-500 hover:bg-amber-600 shadow-2xl shadow-amber-500/30 text-white rounded-3xl"
                          onClick={() => router.push(`/student/trivia/${sessionId}/attempt`)}>
                          Resume Challenge <ArrowRight size={24} className="ml-2" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.5em]">Synchronizing Excellence</p>
                        <Button
                          className="h-16 px-12 text-xl font-black uppercase tracking-[0.4em] bg-primary hover:bg-primary-hover text-white rounded-[2.5rem] shadow-xl shadow-primary/20"
                          onClick={async () => {
                            const { error } = await supabase
                              .from('trivia_groups')
                              .update({ attempt_started_at: new Date().toISOString(), attempt_started_by: student?.id })
                              .eq('id', myGroup.id)
                              .is('attempt_started_by', null)
                            if (error) { toast.error('Check teammate status'); loadAll() }
                            else router.push(`/student/trivia/${sessionId}/attempt`)
                          }}>
                          Enter Arena <Zap size={24} className="ml-2 fill-current" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-8 pt-8 border-t border-[var(--card-border)] flex flex-col items-center gap-4 relative z-10">
                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] flex items-center gap-2">
                      <CheckCircle2 size={14} /> Assignment Submitted
                    </div>
                    <Button
                      className="h-14 px-10 font-black uppercase tracking-widest bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-2xl shadow-emerald-500/20 rounded-3xl hover:shadow-emerald-500/40 transition-shadow"
                      onClick={() => router.push(`/student/trivia/${sessionId}/results`)}
                    >
                      <BarChart3 size={20} className="mr-3" /> View Full Analytics
                    </Button>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest opacity-60">Leaderboards • Badges • Score Breakdown</p>
                  </div>
                )}
              </Card>

              {/* Info Card */}
              <Card className="p-6 text-center" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">
                  <Info size={14} /> Assignment Intelligence
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)] font-bold max-w-sm mx-auto uppercase tracking-tighter">Coordinate strategies. Teammates share all badges and XP earned in this session.</p>
              </Card>

              {session.description && (
                <Card className="p-6" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 text-primary">Assignment Briefing</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">{session.description}</p>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
