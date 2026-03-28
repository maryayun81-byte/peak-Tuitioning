'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, BookOpen, Clock, Users, ChevronLeft, ArrowRight,
  Plus, CheckCircle2, Zap, Save, UserPlus, LogOut, Medal, Star, Award, ShieldCheck, Play, Info, RotateCcw
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

const TEAM_AVATARS = [
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Squad1',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Squad2',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Titan',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Knight',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ninja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Guardian',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Maya',
  'https://api.dicebear.com/7.x/big-smile/svg?seed=Joy'
]

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
  const [selectedAvatar, setSelectedAvatar] = useState(TEAM_AVATARS[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [availableClassmates, setAvailableClassmates] = useState<{ id: string; full_name: string }[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [availableSquads, setAvailableSquads] = useState<any[]>([])

  useEffect(() => { if (sessionId && student?.id) loadAll() }, [sessionId, student?.id])

  const loadAll = async () => {
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

      // Find the group for THIS session
      const membership = (mRes.data ?? []).find((m: any) => m.group?.session_id === sessionId)
      let sessionGroup = membership?.group as any

      if (sessionGroup && sessionGroup.attempt_started_by) {
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

         const { data: classmates } = await supabase.from('students')
            .select('id, full_name')
            .eq('class_id', student!.class_id)
            .neq('id', student!.id)
         setAvailableClassmates(classmates ?? [])
      }
    } catch (e) {
      console.error('Failed to load lobby data', e)
    }
    setLoading(false)
  }

  const handleCreateSquad = async () => {
    if (!groupName.trim()) { toast.error('Enter a squad name'); return }
    if (selectedMemberIds.length === 0) { toast.error('Recruit at least one teammate'); return }
    if (selectedMemberIds.length > 2) { toast.error('Max 3 members per squad'); return }

    // Safety check: Is the user already in a squad?
    if (myPersistentSquad) {
      toast.error('You are already a member of an Academy Squad.')
      setCreatingGroup(false)
      return
    }

    setLoading(true)
    try {
      // 1. Proactive check for name uniqueness
      const { data: existing } = await supabase.from('squads').select('id').eq('class_id', student!.class_id).eq('name', groupName.trim()).maybeSingle()
      if (existing) {
         toast.error('Squad name is already taken in your class. Please choose a unique name.')
         setLoading(false)
         return
      }

      // 2. Create the squad
      // TRIGGER trg_squad_auto_join will automatically add the creator to squad_members
      const { data: squad, error: sErr } = await supabase.from('squads').insert({
        class_id: student!.class_id,
        name: groupName.trim(),
        created_by: student!.id,
        avatar_url: selectedAvatar
      }).select().single()

      if (sErr) throw sErr

      // 3. Add ONLY the invited teammates (Trigger handles the creator)
      if (selectedMemberIds.length > 0) {
        const teammates = selectedMemberIds
          .filter(sid => sid !== student!.id) // Double-check safety
          .map(sid => ({ squad_id: squad.id, student_id: sid }))
        
        if (teammates.length > 0) {
          const { error: mErr } = await supabase.from('squad_members').insert(teammates)
          if (mErr) {
             console.error('Member insert error:', mErr)
             // Even if adding teammates fails, the squad was created and the user is in it via trigger
             toast.error('Squad formed, but some partners could not be invited. You can add them later.')
          }
        }
      }

      toast.success('Academy Squad Formed!')
      
      // 4. Join the specific trivia session with this squad
      await handleJoinTriviaWithSquad(squad.id, squad.name, squad.avatar_url, [student!.id, ...selectedMemberIds])
      
      // Ensure UI is fully synced
      await loadAll()
    } catch (e: any) {
      console.error('Squad formation catch block:', e)
      if (e.code === '23505') {
          if (e.message?.includes('squad_members_student_id_key')) {
             toast.error('Verification failed: You are already registered in a squad.')
          } else {
             toast.error('Squad name taken. Please try a different name.')
          }
      } else {
         toast.error('Failed to form squad. Please refresh and try again.')
      }
      setLoading(false)
      loadAll() // Refresh to show if it actually worked partially
    }
  }

  const handleJoinTriviaWithSquad = async (squadId: string, name: string, avatarUrl: string | null, memberIds: string[]) => {
    setLoading(true)
    try {
      // 1. Check if a group for this squad already exists in this session
      const { data: existingGroup } = await supabase.from('trivia_groups')
        .select('id')
        .eq('session_id', sessionId)
        .eq('squad_id', squadId)
        .maybeSingle()
      
      let groupId = existingGroup?.id

      if (!groupId) {
        // 2. Create the group if it doesn't exist
        const { data: group, error: gErr } = await supabase.from('trivia_groups').insert({
          session_id: sessionId,
          class_id: student!.class_id,
          name: name,
          created_by: student!.id,
          avatar_url: avatarUrl,
          squad_id: squadId
        }).select().single()

        if (gErr) {
           // If another teammate created it at the exact same time, try to fetch it
           if (gErr.code === '23505') {
              const { data: recheck } = await supabase.from('trivia_groups')
                 .select('id')
                 .eq('session_id', sessionId)
                 .eq('squad_id', squadId)
                 .maybeSingle()
              if (recheck) groupId = recheck.id
              else throw gErr
           } else {
              throw gErr
           }
        } else {
           groupId = group.id
        }
      }

      // 3. Ensure the student is a member of the trivia group
      const { data: membership } = await supabase.from('trivia_group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('student_id', student!.id)
        .maybeSingle()

      if (!membership) {
        // Only insert missing members
        // To be safe and avoid multi-student conflicts, we only insert the current student
        // The teammate who created the group likely added themselves or trigger will handle it
        const { error: mErr } = await supabase.from('trivia_group_members').insert({
          group_id: groupId,
          student_id: student!.id
        })
        // Ignore unique violation (someone else added us)
        if (mErr && mErr.code !== '23505') throw mErr
      }

      toast.success('Academy Entrance Granted!')
      await loadAll()
    } catch (e: any) {
      console.error('Join Arena Failure:', e)
      toast.error('Failed to join trivia with squad. Please try again.')
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

    if (selectedMemberIds.length > 0 && group) {
       const members = selectedMemberIds.map(sid => ({ group_id: (group as any).id, student_id: sid }))
       const { error: mErr } = await supabase.from('trivia_group_members').insert(members)
       if (mErr) { toast.error('Failed to recruit teammates'); setLoading(false); return }
    }

    toast.success('Group created! Good luck!')
    loadAll()
  }

  const handleLeaveGroup = async () => {
     if (!myGroup) return
     if (myGroup.attempt_started_at) { toast.error('Cannot leave once mission has started!'); return }
     setLoading(true)
     const { error } = await supabase.from('trivia_group_members').delete().eq('group_id', myGroup.id).eq('student_id', student!.id)
     if (error) { toast.error('Failed to leave squad'); setLoading(false) }
     else { toast.success('Left the squad'); loadAll() }
  }

  const handleLeavePersistentSquad = async () => {
     if (!myPersistentSquad) return
     if (confirm('Leave this persistent squad?')) {
        setLoading(true)
        const { error } = await supabase.from('squad_members').delete().eq('squad_id', myPersistentSquad.id).eq('student_id', student!.id)
        if (error) { toast.error('Failed to leave squad'); setLoading(false) }
        else { toast.success('You have left the squad'); setMyPersistentSquad(null); loadAll() }
     }
  }

  const handleJoinGroup = async (groupId: string) => {
     setLoading(true)
     const { error } = await supabase.from('trivia_group_members').insert({ group_id: groupId, student_id: student!.id })
     if (error) { toast.error(error.message || 'Failed to join'); setLoading(false) }
     else { toast.success('Joined squad!'); loadAll() }
  }

  const filteredClassmates = availableClassmates.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading && !session) return <div className="p-6">Loading trivia details...</div>
  if (!session) return null

  return (
    <div className="relative min-h-screen pb-20 overflow-x-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Academy Background Arena */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, var(--bg) 0%, rgba(0,0,0,0) 100%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full opacity-50" />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-2xl mx-auto space-y-8">
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
            <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {!creatingGroup ? (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Your Academy Identity</label>
                    {myPersistentSquad ? (
                      <Card className="p-6 md:p-8 border-2 border-primary/20 shadow-2xl relative overflow-hidden group" style={{ background: 'var(--card)' }}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                           <Award size={120} />
                        </div>
                        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-[2rem] bg-[var(--input)] border-2 border-primary/30 p-2 flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-3 transition-transform">
                              {myPersistentSquad.avatar_url ? (
                                <img src={myPersistentSquad.avatar_url} alt="Squad Crest" className="w-full h-full object-contain" />
                              ) : (
                                <Award className="text-primary" size={40} />
                              )}
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
                            <Button className="w-full sm:w-auto h-12 px-6 font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700 shadow-xl shadow-cyan-500/20 text-white" onClick={() => handleJoinTriviaWithSquad(myPersistentSquad.id, myPersistentSquad.name, myPersistentSquad.avatar_url, myPersistentSquad.members.map((m: any) => m.student_id))}>
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
                         <Button className="h-12 px-8 font-black uppercase tracking-widest bg-primary hover:bg-primary-hover mt-2 text-white" onClick={() => { setIsPersistentMode(true); setCreatingGroup(true); }}>
                            <Star size={18} className="mr-2 fill-current" /> Register Academy Squad
                         </Button>
                      </Card>
                    )}
                  </div>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--card-border)]" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.5em] text-[var(--text-muted)]"><span className="bg-[var(--bg)] px-6">Academy Partnerships</span></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableSquads.filter(s => s.id !== myPersistentSquad?.id).map(g => (
                      <Card key={g.id} className="p-4 flex items-center justify-between group hover:border-primary/30 transition-all bg-[var(--card)]/50 border border-[var(--card-border)]">
                         <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] p-2 shrink-0">
                               <img src={g.avatar_url || TEAM_AVATARS[0]} alt="" className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0">
                               <div className="text-sm font-black truncate uppercase italic tracking-tighter" style={{ color: 'var(--text)' }}>{g.name}</div>
                               <div className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1 uppercase">
                                  <Users size={10} /> {g.members?.length || 0}/3 Members
                               </div>
                            </div>
                         </div>
                         <Button size="sm" onClick={() => handleJoinGroup(g.id)} className="h-10 px-4 font-black bg-[var(--input)] text-[var(--text-muted)] hover:bg-primary hover:text-white" disabled={g.members?.length >= 3}>
                            {g.members?.length >= 3 ? 'FULL' : 'JOIN'}
                         </Button>
                      </Card>
                    ))}
                    {availableSquads.length === 0 && (
                      <div className="col-span-full py-10 text-center text-[10px] text-[var(--text-muted)] uppercase font-black opacity-40">Academy hall is quiet. No squads currently active.</div>
                    )}
                  </div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                   <Card className="p-6 md:p-10 space-y-8 border-2 border-primary/20 shadow-2xl relative overflow-hidden" style={{ background: 'var(--card)' }}>
                     <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-[60px] rounded-full" />
                     <div className="flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                           <div className="w-24 h-24 rounded-3xl bg-[var(--bg)] border-2 border-primary/30 flex items-center justify-center p-2"><img src={selectedAvatar} alt="Crest" className="w-full h-full object-contain" /></div>
                           <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-xl border-4" style={{ borderColor: 'var(--bg)' }}><Star size={14} className="fill-current" /></div>
                        </div>
                        <div>
                           <h3 className="font-black text-2xl uppercase italic leading-none" style={{ color: 'var(--text)' }}>Register Your Squad</h3>
                           <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary mt-2">Excellence • Unity • Achievement</p>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Academic Crest</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                           {TEAM_AVATARS.map((url, i) => (
                              <button key={i} onClick={() => setSelectedAvatar(url)} className={`w-full aspect-square rounded-2xl p-2 border-2 transition-all ${selectedAvatar === url ? 'border-primary bg-primary/10' : 'border-[var(--card-border)] bg-[var(--bg)]'}`}>
                                 <img src={url} alt="Option" className="w-full h-full object-contain" />
                              </button>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-6">
                       <Input label="Squad Designation" placeholder="e.g. Scholars of the Void" value={groupName} onChange={e => setGroupName(e.target.value)} className="h-14 font-black bg-[var(--input)] border-2 border-[var(--card-border)] focus:border-primary uppercase italic" />
                       <Input placeholder="Search class roster..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-12 text-xs bg-[var(--input)] border-[var(--card-border)] text-[var(--text)] font-bold" />
                       <div className="space-y-3">
                          <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-2xl bg-[var(--bg)] border border-[var(--card-border)]">
                           {filteredClassmates.map(c => {
                             const isSelected = selectedMemberIds.includes(c.id)
                             return (
                               <button key={c.id} onClick={() => { if (isSelected) setSelectedMemberIds(prev => prev.filter(id => id !== c.id)); else if (selectedMemberIds.length < 2) setSelectedMemberIds(prev => [...prev, c.id]); else toast.error('Limit: 3') }} className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-black transition-all ${isSelected ? 'bg-primary text-white' : 'hover:bg-[var(--input)] text-[var(--text-muted)]'}`}>
                                 <span className="flex items-center gap-3"><div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] ${isSelected ? 'bg-white/20' : 'bg-primary/10'}`}>{c.full_name[0]}</div>{c.full_name}</span>
                                 {isSelected ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
                               </button>
                             )
                           })}
                         </div>
                       </div>
                     </div>
                     <div className="flex gap-4 pt-4">
                        <Button variant="secondary" className="flex-1 h-14 font-black uppercase bg-[var(--input)] text-[var(--text-muted)] border-[var(--card-border)]" onClick={() => setCreatingGroup(false)}>Cancel</Button>
                        <Button className="flex-1 h-14 font-black uppercase bg-primary hover:bg-primary-hover text-white shadow-xl shadow-primary/20" onClick={handleCreateGroup} disabled={!groupName.trim() || loading}>Confirm <ArrowRight size={20} className="ml-2" /></Button>
                     </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
               <Card className="p-6 md:p-10 border-2 border-primary/20 relative overflow-hidden shadow-2xl" style={{ background: 'var(--card)' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -mr-16 -mt-16" />
                  <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-10 relative z-10">
                     <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative">
                           <div className="w-24 h-24 rounded-[2rem] bg-[var(--bg)] border border-primary/30 p-2 shadow-inner">
                              {myGroup.avatar_url ? <img src={myGroup.avatar_url} alt="Crest" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center bg-primary text-white font-black text-3xl rounded-3xl">{myGroup.name[0]}</div>}
                           </div>
                           <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white border-4" style={{ borderColor: 'var(--bg)' }}><Award size={20} className="fill-current" /></motion.div>
                        </div>
                        <div className="text-center sm:text-left">
                           <h2 className="font-black text-3xl uppercase italic leading-tight" style={{ color: 'var(--text)' }}>{myGroup.name}</h2>
                           <div className="text-[10px] font-black text-primary tracking-[0.3em] uppercase flex items-center justify-center sm:justify-start gap-2 mt-2"><Users size={14} /> Assignment Squad • {myGroup.members.length}/3 Members</div>
                        </div>
                     </div>
                     <div className="flex flex-col items-center sm:items-end gap-3 shrink-0">
                       {hasSubmitted ? (
                          <div className="px-6 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-xl flex items-center gap-2"><CheckCircle2 size={16} /> Assignment Complete</div>
                       ) : (
                          <div className="flex flex-col items-center sm:items-end gap-3">
                             {!myGroup.attempt_started_at && <Button variant="ghost" size="sm" onClick={handleLeaveGroup} className="h-9 px-4 text-rose-500 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 rounded-xl transition-all"><LogOut size={16} /> Exit Squad</Button>}
                             <div className={`px-6 py-2 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl flex items-center gap-2 ${myGroup.attempt_started_at ? 'bg-amber-500 animate-pulse' : 'bg-primary shadow-primary/20'}`}>{myGroup.attempt_started_at ? <><Play size={14} className="fill-current" /> Assignment In Progress</> : <><ShieldCheck size={14} /> Assignment Ready</>}</div>
                          </div>
                       )}
                     </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                     <div className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--text-muted)] flex items-center justify-center sm:justify-start gap-3"><Medal size={16} className="text-primary" /> Authorized Academy Roster</div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {myGroup.members.map(m => {
                           const isCaptain = m.student_id === myGroup.created_by
                           return (
                              <motion.div key={m.student_id} whileHover={{ y: -2 }} className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${isCaptain ? 'bg-primary/10 border-primary/30' : 'bg-[var(--bg)]/50 border-[var(--card-border)]'}`}>
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black ${isCaptain ? 'bg-primary text-white shadow-xl' : 'bg-[var(--input)] text-primary'}`}>{m.student?.full_name[0]}</div>
                                 <div className="flex-1 min-w-0">
                                    <div className="text-sm font-black truncate uppercase tracking-tight" style={{ color: 'var(--text)' }}>{m.student?.full_name}</div>
                                    <div className="text-[9px] font-black text-primary uppercase tracking-widest opacity-80 mt-1">{isCaptain ? 'Assignment Lead' : 'Partner Scholar'}</div>
                                 </div>
                              </motion.div>
                           )
                        })}
                     </div>
                  </div>

                  {!hasSubmitted && (
                     <div className="mt-8 pt-8 border-t border-[var(--card-border)] flex flex-col items-center gap-6 relative z-10">
                        {myGroup.attempt_started_at ? (
                           <div className="text-center space-y-4">
                              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none">Ongoing assignment detected</p>
                              <p className="text-[10px] uppercase font-black text-amber-500 tracking-tighter leading-none">Started by: {myGroup.starter_name || 'Teammate'}</p>
                              <Button className="h-16 px-12 text-lg font-black uppercase tracking-[0.3em] bg-amber-500 hover:bg-amber-600 shadow-2xl shadow-amber-500/30 text-white rounded-3xl" onClick={() => router.push(`/student/trivia/${sessionId}/attempt`)}>
                                 Resume Challenge <ArrowRight size={24} className="ml-2" />
                              </Button>
                           </div>
                        ) : (
                           <div className="text-center space-y-4">
                              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.5em]">Synchronizing Excellence</p>
                              <Button className="h-16 px-12 text-xl font-black uppercase tracking-[0.4em] bg-primary hover:bg-primary-hover text-white rounded-[2.5rem] shadow-xl shadow-primary/20" onClick={async () => {
                                 const { error } = await supabase.from('trivia_groups').update({ attempt_started_at: new Date().toISOString(), attempt_started_by: student?.id }).eq('id', myGroup.id).is('attempt_started_by', null)
                                 if (error) { toast.error('Check teammate status'); loadAll() } else router.push(`/student/trivia/${sessionId}/attempt`)
                              }}>Enter Arena <RotateCcw size={24} className="ml-2" /></Button>
                           </div>
                        )}
                     </div>
                  )}
               </Card>

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
