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
  starter_name?: string
  members: { student_id: string; student: { full_name: string } | null }[]
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

export default function StudentTriviaLobbyPage() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [myGroup, setMyGroup] = useState<Group | null>(null)
  const [myPersistentSquad, setMyPersistentSquad] = useState<any | null>(null)
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

  useEffect(() => {
    // Correctly load all dependencies for the lobby
    if (sessionId && student?.id) { loadAll() }
  }, [sessionId, student?.id])

  const loadAll = async () => {
    // Ensure we are truly in a loading state for UI feedback
    setLoading(true)
    try {
      const [sRes, mRes, subRes, psRes] = await Promise.all([
        supabase.from('trivia_sessions').select('*, subject:subjects(name)').eq('id', sessionId).single(),
        supabase.from('trivia_group_members')
          .select(`group_id, group:trivia_groups(id, name, created_by, session_id, avatar_url, attempt_started_at, attempt_started_by, members:trivia_group_members(student_id, student:students(full_name)))`)
          .eq('student_id', student!.id),
        supabase.from('trivia_submissions').select('id, group_id').eq('session_id', sessionId),
        supabase.from('squad_members')
          .select('squad:squads(*, members:squad_members(student_id, student:students(full_name)))')
          .eq('student_id', student!.id)
          .maybeSingle()
      ])

      if (sRes.error) { toast.error('Trivia not found'); router.push('/student/trivia'); return }
      setSession(sRes.data)

      const mySquad = psRes.data?.squad
      setMyPersistentSquad(mySquad)

      // Find the group for THIS session - Ensure we only look for groups tied to THIS sessionId
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
        const { data: squads } = await supabase.from('squads')
          .select('*, members:squad_members(student_id, student:students(full_name))')
          .eq('class_id', student!.class_id)
        setAvailableSquads(squads ?? [])

        // ── Tuition center filtering: only show classmates from same center ──
        let classmateQuery = supabase
          .from('students')
          .select('id, full_name')
          .eq('class_id', student!.class_id)
          .neq('id', student!.id)

        if (student!.tuition_center_id) {
          classmateQuery = classmateQuery.eq('tuition_center_id', student!.tuition_center_id)
        }

        const { data: classmates } = await classmateQuery
        setAvailableClassmates(classmates ?? [])
      }
    } catch (e) {
      console.error('Failed to load lobby data', e)
    } finally {
      // Always end loading state
      setLoading(false)
    }
  }

  // ── Group Management ─────────────────────────────────────────

  const handleRemoveMember = async (memberId: string) => {
    if (!myGroup || myGroup.created_by !== student?.id) return
    if (myGroup.attempt_started_at) { toast.error('Cannot remove members once started!'); return }
    setLoading(true)
    const { error } = await supabase
      .from('trivia_group_members')
      .delete()
      .eq('group_id', myGroup.id)
      .eq('student_id', memberId)
    if (error) { toast.error('Failed to remove member'); setLoading(false) }
    else { toast.success('Member removed'); await loadAll() }
  }

  const handleDisbandGroup = async () => {
    if (!myGroup || myGroup.created_by !== student?.id) return
    if (myGroup.attempt_started_at) { toast.error('Cannot disband once started!'); return }
    if (!confirm('Disband this squad? All members will be removed.')) return
    setLoading(true)
    // Delete the group itself, cascade will handle the members
    const { error } = await supabase.from('trivia_groups').delete().eq('id', myGroup.id)
    if (error) { toast.error('Failed to disband squad'); setLoading(false) }
    else { toast.success('Squad disbanded'); setMyGroup(null); await loadAll() }
  }

  const handleLeaveGroup = async () => {
    if (!myGroup) return
    if (myGroup.attempt_started_at) { toast.error('Cannot leave once mission has started!'); return }
    setLoading(true)
    
    const isLeader = myGroup.created_by === student?.id
    
    // If the leader leaves, or it's the last person, we delete the group entirely
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

  const handleLeavePersistentSquad = async () => {
    if (!myPersistentSquad) return
    if (confirm('Leave this persistent squad?')) {
      setLoading(true)
      const { error } = await supabase.from('squad_members').delete().eq('squad_id', myPersistentSquad.id).eq('student_id', student!.id)
      if (error) { toast.error('Failed to leave squad'); setLoading(false) }
      else { toast.success('You have left the squad'); setMyPersistentSquad(null); await loadAll() }
    }
  }

  const handleJoinGroup = async (groupId: string) => {
    setLoading(true)
    const { error } = await supabase.from('trivia_group_members').insert({ group_id: groupId, student_id: student!.id })
    if (error) { toast.error(error.message || 'Failed to join'); setLoading(false) }
    else { toast.success('Joined squad!'); await loadAll() }
  }

  // ── Squad / Group Creation ────────────────────────────────────

  const handleCreateSquad = async () => {
    if (!groupName.trim()) { toast.error('Enter a squad name'); return }
    if (selectedMemberIds.length === 0) { toast.error('Recruit at least one teammate'); return }
    if (selectedMemberIds.length > 2) { toast.error('Max 3 members per squad'); return }
    if (myPersistentSquad) { toast.error('You are already a member of an Academy Squad.'); setCreatingGroup(false); return }

    setLoading(true)
    setLoading(true)
    try {
      const { data: existingName } = await supabase.from('squads').select('id').eq('class_id', student!.class_id).eq('name', groupName.trim()).maybeSingle()
      if (existingName) { 
        toast.error('Squad name is already taken. Please choose a unique name.')
        setLoading(false)
        return 
      }

      // ── CRITICAL: Check if any invited teammate is already in a squad ──
      const allCandidateIds = Array.from(new Set([student!.id, ...selectedMemberIds]))
      const { data: currentMemberships } = await supabase
        .from('squad_members')
        .select('student_id, squad:squads(name)')
        .in('student_id', allCandidateIds)

      if (currentMemberships && currentMemberships.length > 0) {
        const firstConflict = currentMemberships[0]
        const { data: conflictedStudent } = await supabase.from('students').select('full_name').eq('id', firstConflict.student_id).single()
        toast.error(`${conflictedStudent?.full_name || 'A teammate'} is already in another squad (${(firstConflict as any).squad?.name}). They must leave their current squad before joining a new one.`)
        setLoading(false)
        return
      }

      const { data: squad, error: sErr } = await supabase.from('squads').insert({
        class_id: student!.class_id,
        name: groupName.trim(),
        created_by: student!.id,
        avatar_url: selectedAvatar
      }).select().single()

      if (sErr) throw sErr

      const teammates = selectedMemberIds
        .filter(sid => sid !== student!.id)
        .map(sid => ({ squad_id: squad.id, student_id: sid }))

      if (teammates.length > 0) {
        const { error: mErr } = await supabase.from('squad_members').insert(teammates)
        if (mErr) toast.error('Squad formed, but some partners could not be invited.')
      }

      toast.success('Academy Squad Formed!')
      await handleJoinTriviaWithSquad(squad.id, squad.name, squad.avatar_url, [student!.id, ...selectedMemberIds])
    } catch (e: any) {
      console.error('Squad formation failure:', e)
      toast.error('Failed to form squad. Please ensure all members are available and try again.')
      setLoading(false)
      await loadAll()
    }
  }

  const handleJoinTriviaWithSquad = async (squadId: string, name: string, avatarUrl: string | null, memberIds: string[]) => {
    setLoading(true)
    try {
      // ── CRITICAL: Before joining with squad, exit any current session-specific group ──
      // This prevents the "already in session" error if they had formed a temporary group
      const { data: currentSessionGroups } = await supabase.from('trivia_groups').select('id').eq('session_id', sessionId)
      if (currentSessionGroups?.length) {
        const groupIds = currentSessionGroups.map(g => g.id)
        await supabase.from('trivia_group_members').delete().eq('student_id', student!.id).in('group_id', groupIds)
      }

      const { data: existingGroup } = await supabase.from('trivia_groups')
        .select('id').eq('session_id', sessionId).eq('squad_id', squadId).maybeSingle()

      let groupId = existingGroup?.id

      if (!groupId) {
        const { data: group, error: gErr } = await supabase.from('trivia_groups').insert({
          session_id: sessionId,
          class_id: student!.class_id,
          name,
          created_by: student!.id,
          avatar_url: avatarUrl,
          squad_id: squadId
        }).select().single()

        if (gErr) {
          if (gErr.code === '23505') {
            const { data: recheck } = await supabase.from('trivia_groups').select('id').eq('session_id', sessionId).eq('squad_id', squadId).maybeSingle()
            if (recheck) groupId = recheck.id
            else throw gErr
          } else throw gErr
        } else {
          groupId = group.id
        }
      }

      // ── Add all members via SECURITY DEFINER RPC ──────────────────────────
      // Direct upsert violated RLS WITH CHECK on the UPDATE path for non-self
      // members. The add_trivia_group_members RPC runs as postgres (SECURITY
      // DEFINER), bypassing RLS while enforcing creator-only permission checks.
      const uniqueMemberIds = Array.from(new Set([student!.id, ...memberIds]))
      const { error: mErr } = await supabase.rpc('add_trivia_group_members', {
        p_group_id: groupId,
        p_member_ids: uniqueMemberIds
      })
      if (mErr) throw mErr

      toast.success('Academy Entrance Granted! 🏆')
      await loadAll()
    } catch (e: any) {
      console.error('Join Arena Failure:', e)
      toast.error(e?.message || 'Failed to join trivia with squad. Please try again.')
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (isPersistentMode) { handleCreateSquad(); return }
    if (!groupName.trim()) { toast.error('Enter a group name'); return }
    if (selectedMemberIds.length > 2) { toast.error('Max 3 members per group'); return }

    setLoading(true)
    const { data: group, error: gErr } = await supabase.from('trivia_groups').insert({
      session_id: sessionId,
      class_id: student!.class_id,
      name: groupName.trim(),
      created_by: student!.id,
      avatar_url: selectedAvatar
    }).select().single()

    if (gErr) {
      if (gErr.code === '23505') toast.error('Group name already taken')
      else toast.error('Failed to create group')
      setLoading(false)
      return
    }

    if (group) {
      const allMembers = [student!.id, ...selectedMemberIds]
      const members = allMembers.map(sid => ({ group_id: (group as any).id, student_id: sid }))
      const { error: mErr } = await supabase.from('trivia_group_members').insert(members)
      if (mErr) { 
        console.error('Member recruitment error:', mErr)
        toast.error('Squad formed, but some teammates could not be synchronized.')
      }
    }

    toast.success('Group created! Good luck!')
    // Explicitly wait before refreshing to prevent '1/3 members' glitch
    setTimeout(() => {
      loadAll()
    }, 500)
  }

  const filteredClassmates = availableClassmates.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  const isLeader = myGroup?.created_by === student?.id

  if (loading && !session) return <div className="p-6">Loading trivia details...</div>
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
          {/* ── No Group: Lobby ──────────────────────────────── */}
          {!myGroup ? (
            <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {!creatingGroup ? (
                <div className="space-y-8">
                  {/* Persistent Squad Card */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Your Academy Identity</label>
                    {myPersistentSquad ? (
                      <Card className="p-6 md:p-8 border-2 border-primary/20 shadow-2xl relative overflow-hidden group" style={{ background: 'var(--card)' }}>
                        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-[2rem] bg-[var(--input)] border-2 border-primary/30 p-2 flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-3 transition-transform">
                              {myPersistentSquad.avatar_url
                                ? <img src={myPersistentSquad.avatar_url} alt="Squad Crest" className="w-full h-full object-contain" />
                                : <Award className="text-primary" size={40} />}
                            </div>
                            <div className="text-center sm:text-left">
                              <h2 className="text-2xl font-black uppercase italic leading-tight" style={{ color: 'var(--text)' }}>{myPersistentSquad.name}</h2>
                              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-3">Verified Academy Squad</p>
                              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                {myPersistentSquad.members.map((m: any) => (
                                  <div key={m.student_id} className="px-3 py-1 rounded-full bg-[var(--input)] border border-[var(--card-border)] text-[10px] font-black text-[var(--text-muted)] uppercase">
                                    {m.student?.full_name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto shrink-0">
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500/10" onClick={handleLeavePersistentSquad}>Leave</Button>
                            <Button className="w-full sm:w-auto h-12 px-6 font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700 shadow-xl shadow-cyan-500/20 text-white"
                              onClick={() => handleJoinTriviaWithSquad(myPersistentSquad.id, myPersistentSquad.name, myPersistentSquad.avatar_url, myPersistentSquad.members.map((m: any) => m.student_id))}>
                              <Zap size={18} className="fill-current" /> Enter Arena
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-10 border-2 border-dashed border-[var(--card-border)] bg-[var(--card)]/50 text-center flex flex-col items-center gap-4 group hover:border-primary/30 transition-all">
                        <div className="w-16 h-16 rounded-3xl bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-primary transition-colors"><Users size={32} /></div>
                        <div>
                          <h3 className="text-lg font-black uppercase italic" style={{ color: 'var(--text)' }}>No Squad Detected</h3>
                          <p className="text-xs font-bold text-[var(--text-muted)] mt-1 max-w-xs uppercase tracking-tighter leading-tight">Register an official squad to enter the arena and build your collective legacy.</p>
                        </div>
                        <Button className="h-12 px-8 font-black uppercase tracking-widest bg-primary hover:bg-primary-hover mt-2 text-white"
                          onClick={() => { setIsPersistentMode(true); setCreatingGroup(true) }}>
                          <Star size={18} className="mr-2 fill-current" /> Register Academy Squad
                        </Button>
                      </Card>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--card-border)]" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.5em] text-[var(--text-muted)]"><span className="bg-[var(--bg)] px-6">Academy Partnerships</span></div>
                  </div>

                  {/* Available Squads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableSquads.filter(s => s.id !== myPersistentSquad?.id).map(g => (
                      <Card key={g.id} className="p-4 flex items-center justify-between group hover:border-primary/30 transition-all bg-[var(--card)]/50 border border-[var(--card-border)]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] p-2 shrink-0">
                            <img src={g.avatar_url || UNISEX_AVATARS[0].url} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-black truncate uppercase italic tracking-tighter" style={{ color: 'var(--text)' }}>{g.name}</div>
                            <div className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1 uppercase">
                              <Users size={10} /> {g.members?.length || 0}/3 Members
                            </div>
                          </div>
                        </div>
                        <Button size="sm"
                          onClick={() => handleJoinTriviaWithSquad(
                            g.id,
                            g.name,
                            g.avatar_url,
                            g.members?.map((m: any) => m.student_id) ?? []
                          )}
                          className="h-10 px-4 font-black bg-[var(--input)] text-[var(--text-muted)] hover:bg-primary hover:text-white"
                          disabled={g.members?.length >= 3 || loading}>
                          {g.members?.length >= 3 ? 'FULL' : loading ? '...' : 'JOIN'}
                        </Button>
                      </Card>
                    ))}
                    {availableSquads.length === 0 && (
                      <div className="col-span-full py-10 text-center text-[10px] text-[var(--text-muted)] uppercase font-black opacity-40">Academy hall is quiet. No squads currently active.</div>
                    )}
                  </div>
                </div>

              ) : (
                // ── Create Group Form ────────────────────────────
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                  <Card className="p-6 md:p-10 space-y-8 border-2 border-primary/20 shadow-2xl relative overflow-hidden" style={{ background: 'var(--card)' }}>
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-[60px] rounded-full" />

                    {/* Preview + Title */}
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-3xl bg-[var(--bg)] border-2 border-primary/30 flex items-center justify-center p-2">
                          <img src={selectedAvatar} alt="Crest" className="w-full h-full object-contain" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-xl border-4" style={{ borderColor: 'var(--bg)' }}><Star size={14} className="fill-current" /></div>
                      </div>
                      <div>
                        <h3 className="font-black text-2xl uppercase italic leading-none" style={{ color: 'var(--text)' }}>Register Your Squad</h3>
                        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary mt-2">Excellence • Unity • Achievement</p>
                      </div>
                    </div>

                    {/* ── Avatar Picker with Category Tabs ────── */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Choose Your Crest</label>

                      {/* Tabs */}
                      <div className="flex gap-2 p-1 bg-[var(--input)] rounded-2xl">
                        {AVATAR_TABS.map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setAvatarTab(tab.key as any)}
                            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${avatarTab === tab.key ? 'bg-[var(--bg)] text-primary shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Avatar Grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-1">
                        {AVATAR_TABS.find(t => t.key === avatarTab)?.avatars.map((av, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedAvatar(av.url)}
                            title={av.label}
                            className={`w-full aspect-square rounded-2xl p-2 border-2 transition-all hover:scale-105 ${selectedAvatar === av.url ? 'border-primary bg-primary/10 scale-105 shadow-lg shadow-primary/20' : 'border-[var(--card-border)] bg-[var(--bg)] hover:border-primary/30'}`}
                          >
                            <img src={av.url} alt={av.label} className="w-full h-full object-contain" crossOrigin="anonymous" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Squad Name + Member Selection */}
                    <div className="space-y-6">
                      <Input
                        label="Squad Designation"
                        placeholder="e.g. Scholars of the Void"
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        className="h-14 font-black bg-[var(--input)] border-2 border-[var(--card-border)] focus:border-primary uppercase italic"
                      />
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                          Recruit Teammates from your Tuition Center ({availableClassmates.length} available)
                        </label>
                        <Input
                          placeholder="Search class roster..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="h-12 text-xs bg-[var(--input)] border-[var(--card-border)] text-[var(--text)] font-bold mb-3"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-2xl bg-[var(--bg)] border border-[var(--card-border)]">
                          {filteredClassmates.length === 0 && (
                            <p className="py-6 text-center text-[10px] text-[var(--text-muted)] uppercase font-black opacity-50">No classmates found at your tuition center</p>
                          )}
                          {filteredClassmates.map(c => {
                            const isSelected = selectedMemberIds.includes(c.id)
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  if (isSelected) setSelectedMemberIds(prev => prev.filter(id => id !== c.id))
                                  else if (selectedMemberIds.length < 2) setSelectedMemberIds(prev => [...prev, c.id])
                                  else toast.error('Max 3 members (including you)')
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-black transition-all ${isSelected ? 'bg-primary text-white' : 'hover:bg-[var(--input)] text-[var(--text-muted)]'}`}
                              >
                                <span className="flex items-center gap-3">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] ${isSelected ? 'bg-white/20' : 'bg-primary/10'}`}>{c.full_name[0]}</div>
                                  {c.full_name}
                                </span>
                                {isSelected ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button variant="secondary" className="flex-1 h-14 font-black uppercase" onClick={() => setCreatingGroup(false)}>Cancel</Button>
                      <Button className="flex-1 h-14 font-black uppercase bg-primary text-white shadow-xl shadow-primary/20"
                        onClick={handleCreateGroup} disabled={!groupName.trim() || loading}>
                        Confirm <ArrowRight size={20} className="ml-2" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>

          ) : (
            // ── Has Group: Squad Hub ──────────────────────────────
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
                        {/* Non-leaders can leave; leaders can disband */}
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
                              onClick={() => handleRemoveMember(m.student_id)}
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
                  /* ── Post-Submission Analytics Button ─────── */
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
