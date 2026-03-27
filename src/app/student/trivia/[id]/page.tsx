'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, ChevronLeft, Users, Clock, BookOpen,
  UserPlus, Play, Info, CheckCircle2, XCircle,
  AlertCircle, ShieldCheck, User, Zap, Medal,
  LogOut, Plus, RotateCcw
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
  const { student, profile } = useAuthStore()
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
         // Load classmates and check if they are in existing persistent squads for this class
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

    setLoading(true)
    try {
      const { data: squad, error: sErr } = await supabase.from('squads').insert({
        class_id: student!.class_id,
        name: groupName.trim(),
        created_by: student!.id,
        avatar_url: selectedAvatar
      }).select().single()

      if (sErr) throw sErr

      // Add members
      const members = [
        { squad_id: squad.id, student_id: student!.id },
        ...selectedMemberIds.map(sid => ({ squad_id: squad.id, student_id: sid }))
      ]
      const { error: mErr } = await supabase.from('squad_members').insert(members)
      if (mErr) throw mErr

      toast.success('Persistent Squad Formed!')
      await handleJoinTriviaWithSquad(squad.id, squad.name, squad.avatar_url, [student!.id, ...selectedMemberIds])
    } catch (e: any) {
      console.error(e)
      if (e.code === '23505') {
        if (e.message?.includes('squad_members_student_id_key') || e.message?.includes('student_id')) {
           toast.error('You or a teammate is already in a squad!')
        } else {
           toast.error('Squad name already taken in your class')
        }
      } else {
         toast.error('Failed to form squad')
      }
      setLoading(false)
    }
  }

  const handleJoinTriviaWithSquad = async (squadId: string, name: string, avatarUrl: string | null, memberIds: string[]) => {
    setLoading(true)
    try {
      // Create session-specific group
      const { data: group, error: gErr } = await supabase.from('trivia_groups').insert({
        session_id: sessionId,
        class_id: student!.class_id,
        name: name,
        created_by: student!.id,
        avatar_url: avatarUrl,
        squad_id: squadId
      }).select().single()

      if (gErr) throw gErr

      // Add all members to session group
      const members = memberIds.map(sid => ({
        group_id: group.id,
        student_id: sid
      }))
      const { error: mErr } = await supabase.from('trivia_group_members').insert(members)
      if (mErr) throw mErr

      toast.success('Joined trivia with your squad!')
      loadAll()
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to join trivia with squad')
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (isPersistentMode) {
       handleCreateSquad()
       return
    }
    // Legacy one-off group logic
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
        if (gErr.code === '23505') toast.error('Group name already taken for this trivia')
        else toast.error('Failed to create group')
        setLoading(false)
        return
    }

    // Add teammates
    if (selectedMemberIds.length > 0 && group) {
       const members = selectedMemberIds.map(sid => ({
         group_id: (group as any).id,
         student_id: sid
       }))
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
     const { error } = await supabase.from('trivia_group_members')
        .delete()
        .eq('group_id', myGroup.id)
        .eq('student_id', student!.id)
     
     if (error) { toast.error('Failed to leave squad'); setLoading(false) }
     else { toast.success('Left the squad'); loadAll() }
  }

  const handleLeavePersistentSquad = async () => {
     if (!myPersistentSquad) return
     if (confirm('Are you sure you want to leave this persistent squad?')) {
        setLoading(true)
        const { error } = await supabase.from('squad_members')
           .delete()
           .eq('squad_id', myPersistentSquad.id)
           .eq('student_id', student!.id)
        
        if (error) { toast.error('Failed to leave squad'); setLoading(false) }
        else { 
           toast.success('You have left the squad')
           setMyPersistentSquad(null)
           loadAll() 
        }
     }
  }

  const handleJoinGroup = async (groupId: string) => {
     setLoading(true)
     const { error } = await supabase.from('trivia_group_members').insert({
        group_id: groupId,
        student_id: student!.id
     })

     if (error) {
        toast.error(error.message || 'Failed to join squad')
        setLoading(false)
     } else {
        toast.success('Joined squad!')
        loadAll()
     }
  }

  const filteredClassmates = availableClassmates.filter(c =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && !session) return <div className="p-6">Loading trivia details...</div>
  if (!session) return null

  return (
    <div className="p-4 md:p-6 pb-20 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/student/trivia')}>
          <ChevronLeft size={18} />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-black" style={{ color: 'var(--text)' }}>{session.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>
             {session.subject && <span className="flex items-center gap-1"><BookOpen size={12} /> {session.subject.name}</span>}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!myGroup ? (
          /* ── No Group State ── */
          <motion.div key="no-group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Persistent Squad Option */}
            {!creatingGroup && (
              <div className="space-y-6">
                {myPersistentSquad ? (
                  <Card className="p-6 border-2 border-primary bg-primary/5 shadow-xl shadow-primary/10">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-20 h-20 rounded-3xl bg-white p-2 shrink-0 shadow-lg border-2 border-primary/20">
                        <img src={myPersistentSquad.avatar_url || TEAM_AVATARS[0]} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-2xl font-black text-primary uppercase italic tracking-tighter">{myPersistentSquad.name}</h3>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                          {myPersistentSquad.members?.map((m: any, i: number) => (
                             <span key={i} className="text-[10px] font-black px-3 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-widest border border-primary/10">
                               {m.student?.full_name?.split(' ')[0]}
                             </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 px-4" onClick={handleLeavePersistentSquad}>Leave Squad</Button>
                        <Button className="w-full sm:w-auto h-12 px-6 font-black uppercase tracking-widest" onClick={() => handleJoinTriviaWithSquad(myPersistentSquad.id, myPersistentSquad.name, myPersistentSquad.avatar_url, myPersistentSquad.members.map((m: any) => m.student_id))}>
                          <Zap size={18} className="fill-current" /> Enter Arena
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-8 text-center space-y-5 border-2 border-dashed border-primary/30 bg-primary/5 transition-all hover:bg-primary/10 cursor-pointer"
                    onClick={() => { setCreatingGroup(true); setIsPersistentMode(true) }}>
                    <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto shadow-inner">
                      <Users size={40} className="text-primary" />
                    </div>
                    <div>
                      <h2 className="font-black text-xl tracking-tight" style={{ color: 'var(--text)' }}>No Persistent Squad</h2>
                      <p className="text-sm max-w-xs mx-auto text-[var(--text-muted)] mt-2 leading-relaxed">
                        Form a permanent team with your classmates to build your legend across all trivias!
                      </p>
                    </div>
                    <Button className="w-full h-14 text-base font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                      <Plus size={20} className="mr-2" /> Forge Official Squad
                    </Button>
                  </Card>
                )}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--card-border)]" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em]"><span className="bg-[var(--bg)] px-6" style={{ color: 'var(--text-muted)' }}>Class Alliances</span></div>
                </div>

                {/* Available Squads in Class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableSquads.filter(s => s.id !== myPersistentSquad?.id).map(g => (
                    <Card key={g.id} className="p-4 flex items-center justify-between group hover:border-primary/50 transition-all bg-[var(--card)]/50">
                       <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] p-2 shrink-0">
                             <img src={g.avatar_url || TEAM_AVATARS[0]} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                             <div className="text-sm font-black truncate uppercase italic tracking-tighter" style={{ color: 'var(--text)' }}>{g.name}</div>
                             <div className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1">
                                <Users size={10} /> {g.members?.length || 0}/3 Comrades
                             </div>
                          </div>
                       </div>
                       <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleJoinGroup(g.id)}
                          className="h-10 px-4 font-black text-xs hover:bg-primary hover:text-white border-0 shadow-sm transition-all"
                          disabled={g.members?.length >= 3}
                       >
                          {g.members?.length >= 3 ? 'FULL' : 'JOIN'}
                       </Button>
                    </Card>
                  ))}
                  {availableSquads.length === 0 && (
                    <div className="col-span-full py-10 text-center text-xs text-[var(--text-muted)] italic opacity-50">
                       The class arena is quiet... No other squads present.
                    </div>
                  )}
                </div>
              </div>
            )}

            {creatingGroup && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <Card className="p-6 space-y-6 border-2 border-primary/20 shadow-2xl overflow-hidden relative">
                   <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
                   
                   <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative group">
                         <div className="w-24 h-24 rounded-3xl bg-[var(--input)] border-2 border-primary/30 flex items-center justify-center p-2 transition-transform group-hover:scale-105 duration-300">
                             <img src={selectedAvatar} alt="Team Avatar" className="w-full h-full object-contain" />
                         </div>
                         <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-xl shadow-lg">
                            <Zap size={14} className="fill-current" />
                         </div>
                      </div>
                      <div>
                         <h3 className="font-black text-xl tracking-tight uppercase italic" style={{ color: 'var(--text)' }}>Forge Your Alliance</h3>
                         <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary">Identity • Unity • Victory</p>
                      </div>
                   </div>

                   {/* Avatar Picker */}
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Choose Group Sigil</label>
                      </div>
                      <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-6 gap-2 custom-scrollbar">
                         {TEAM_AVATARS.map((url, i) => (
                            <button
                               key={i}
                               onClick={() => setSelectedAvatar(url)}
                               className={`w-full aspect-square rounded-xl p-1.5 border-2 transition-all hover:scale-105 ${selectedAvatar === url ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' : 'border-[var(--card-border)] bg-[var(--input)] hover:border-primary/50'}`}
                            >
                               <img src={url} alt={`Avatar option ${i}`} className="w-full h-full object-contain" />
                            </button>
                         ))}
                      </div>
                   </div>

                   <Input
                     label="Squad Name"
                     placeholder="e.g. Gamma Ray Legends"
                     value={groupName}
                     onChange={e => setGroupName(e.target.value)}
                     className="h-14 text-base font-black bg-[var(--input)] border-2 border-transparent focus:border-primary transition-all uppercase tracking-tighter italic"
                   />

                   <div className="space-y-3">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Recruit Comrades</label>
                        <span className={`text-[10px] font-black ${selectedMemberIds.length === 2 ? 'text-amber-500' : 'text-primary'}`}>
                           {selectedMemberIds.length}/2 RECRUITED
                        </span>
                     </div>
                     <Input
                       placeholder="Search class roster..."
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                       className="h-12 text-xs bg-[var(--input)] font-bold"
                     />
                     <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] shadow-inner">
                       {filteredClassmates.map(c => {
                         const isSelected = selectedMemberIds.includes(c.id)
                         return (
                           <button
                             key={c.id}
                             onClick={() => {
                               if (isSelected) setSelectedMemberIds(prev => prev.filter(id => id !== c.id))
                               else if (selectedMemberIds.length < 2) setSelectedMemberIds(prev => [...prev, c.id])
                               else toast.error('Squad full! Rank is limited to 3.')
                             }}
                             className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-black transition-all ${isSelected ? 'bg-primary text-white shadow-lg' : 'hover:bg-[var(--card-border)] text-[var(--text-muted)]'}`}
                           >
                             <span className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] ${isSelected ? 'bg-white/20' : 'bg-primary/10'}`}>
                                   {c.full_name[0]}
                                </div>
                                {c.full_name}
                             </span>
                             {isSelected ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
                           </button>
                         )
                       })}
                       {filteredClassmates.length === 0 && (
                         <div className="p-8 text-center text-xs text-[var(--text-muted)] italic flex flex-col items-center gap-2">
                           <Users size={24} className="opacity-20" />
                           No comrades found in the roster
                         </div>
                       )}
                     </div>
                   </div>

                   <div className="flex gap-4 pt-4">
                     <Button variant="secondary" className="flex-1 h-14 font-black uppercase tracking-widest" onClick={() => setCreatingGroup(false)}>Retreat</Button>
                     <Button className="flex-1 h-14 font-black uppercase tracking-widest shadow-xl shadow-primary/25" onClick={handleCreateGroup} disabled={!groupName.trim() || loading}>
                        FORGE SQUAD <Zap size={20} className="ml-2 fill-current" />
                     </Button>
                   </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        ) : (
          /* ── Group formed state ── */
          <motion.div key="has-group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <Card className="p-6 relative overflow-hidden shadow-2xl">
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -mr-16 -mt-16 rounded-full" />
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-8 relative z-10 text-center sm:text-left">
                   <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative">
                         <div className="w-20 h-20 rounded-3xl bg-[var(--input)] border border-primary/20 p-2 shadow-inner">
                            {myGroup.avatar_url ? (
                               <img src={myGroup.avatar_url} alt="Squad Sigil" className="w-full h-full object-contain" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center bg-primary text-white font-black text-3xl rounded-2xl">
                                  {myGroup.name[0]}
                               </div>
                            )}
                         </div>
                         <motion.div 
                            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg border-2 border-white dark:border-slate-800"
                         >
                            <Trophy size={16} className="fill-current" />
                         </motion.div>
                      </div>
                      <div>
                         <h2 className="font-black text-2xl tracking-tighter uppercase italic text-primary">{myGroup.name}</h2>
                         <div className="text-[10px] font-black text-primary tracking-[0.2em] uppercase flex items-center justify-center sm:justify-start gap-1 mt-1">
                            <Users size={12} /> Live Squad • {myGroup.members.length}/3 members
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
                     {hasSubmitted ? (
                        <span className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Mission Complete</span>
                     ) : (
                        <div className="flex flex-col items-center sm:items-end gap-2">
                           {!myGroup.attempt_started_at && (
                              <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 onClick={handleLeaveGroup}
                                 className="h-8 px-3 text-rose-500 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                              >
                                 <LogOut size={14} /> Abandon
                              </Button>
                           )}
                           <span className={`px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-lg ${myGroup.attempt_started_at ? 'bg-amber-500 shadow-amber-500/20 animate-pulse' : 'bg-primary shadow-primary/20'}`}>
                              {myGroup.attempt_started_at ? 'Battle Active' : 'Battle Ready'}
                           </span>
                        </div>
                     )}
                   </div>
                </div>

                <div className="space-y-4 relative z-10">
                   <div className="text-[10px] font-black uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2" style={{ color: 'var(--text-muted)' }}>
                      <Medal size={14} className="text-primary" /> Active Duty Roster
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {myGroup.members.map(m => {
                         const isCaptain = m.student_id === myGroup.created_by
                         return (
                            <motion.div 
                               key={m.student_id} 
                               whileHover={{ y: -2 }}
                               className={`flex items-center gap-3 p-4 rounded-3xl border transition-all ${isCaptain ? 'bg-primary/10 border-primary/20 shadow-lg shadow-primary/5' : 'bg-[var(--input)] border-[var(--card-border)]'}`}
                            >
                               <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shadow-sm ${isCaptain ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-slate-700 text-primary'}`}>
                                  {m.student?.full_name[0]}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="text-xs font-black truncate uppercase tracking-tighter" style={{ color: 'var(--text)' }}>{m.student?.full_name}</div>
                                  <div className="text-[9px] font-black text-primary uppercase tracking-widest opacity-80">
                                     {isCaptain ? 'Squad Captain' : 'Vanguard Elite'}
                                  </div>
                               </div>
                               {isCaptain && <ShieldCheck size={16} className="text-primary" />}
                            </motion.div>
                         )
                      })}
                   </div>
                </div>

                {!hasSubmitted && (
                   <div className="mt-8 space-y-4">
                      {myGroup.attempt_started_by && myGroup.attempt_started_by !== student?.id ? (
                         <Card className="p-4 bg-orange-500/10 border-2 border-orange-500/20 flex items-start gap-4">
                            <ShieldCheck size={24} className="text-orange-500 shrink-0" />
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                               <span className="font-black text-orange-600 uppercase tracking-widest block mb-1">Active Attempt Blocked</span>
                               Your squadmate **{myGroup.starter_name || 'someone'}** is handling the trivia. 
                               Join them at their screen to compete!
                            </p>
                         </Card>
                      ) : (
                         <div className="space-y-4">
                            <Card className="p-4 bg-amber-500/5 border-2 border-amber-500/10 flex items-start gap-4">
                               <Info size={24} className="text-amber-500 shrink-0" />
                               <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                  <span className="font-black text-amber-600 uppercase tracking-widest block mb-1">Mission Briefing</span>
                                  Use **only one phone** for this attempt. Once you enter, the mission is live for the entire squad.
                               </p>
                            </Card>
                            <Button 
                               onClick={async () => {
                                  if (!myGroup) return
                                  const { error } = await supabase.from('trivia_groups')
                                     .update({ 
                                        attempt_started_at: new Date().toISOString(),
                                        attempt_started_by: student?.id 
                                     })
                                     .eq('id', myGroup.id)
                                     .is('attempt_started_by', null)
                                  
                                  if (error) {
                                     toast.error('Could not claim session. Is someone else already in?')
                                     loadAll()
                                  } else {
                                     router.push(`/student/trivia/${sessionId}/attempt`)
                                  }
                               }} 
                               className="w-full h-16 text-lg font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
                            >
                               <Play size={20} className="mr-3 fill-current" /> Enter Arena
                            </Button>
                         </div>
                      )}
                   </div>
                )}

                {hasSubmitted && (
                   <div className="mt-8 space-y-4">
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 flex items-start gap-4">
                         <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                         <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            <span className="font-black text-emerald-600 uppercase tracking-widest block mb-1">Mission Finalized</span>
                            Your squad has successfully logged their answers. Review your performance in the results deck.
                         </p>
                      </div>
                      <Button onClick={() => router.push(`/student/trivia/${sessionId}/results`)} className="w-full h-14 text-base font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 border-0 shadow-lg shadow-emerald-500/20">
                         <Trophy size={20} className="mr-2" /> View Results
                      </Button>
                   </div>
                )}
             </Card>

             {/* Description Card */}
             {session.description && (
                <Card className="p-6 bg-[var(--card)]/50">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 text-primary">Mission Briefing</h3>
                   <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{session.description}</p>
                </Card>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
