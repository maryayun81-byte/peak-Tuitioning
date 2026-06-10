'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, BookOpen, Bot, CheckCheck, ChevronRight,
  Edit3, GraduationCap, Heart, MessageCircle, MoreHorizontal, Paperclip,
  Reply, Search, Send, ShieldCheck, Smile, Sparkles, Trash2, Users, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  deletePeakMessage,
  editPeakMessage,
  generatePeakReply,
  getMessagingBootstrap,
  getPeakMessages,
  markPeakConversationRead,
  sendPeakMessage,
  startPeakConversation,
  startTeacherPeakConversation,
  togglePeakReaction,
} from '@/app/actions/messages'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'

type Role = 'student' | 'teacher'
type PeakMessengerProps = { role: Role }

const EMOJIS = ['👍', '❤️', '👏', '🎯', '💡', '😂', '🙏', '🔥']
const STUDENT_PROMPTS = [
  'I am stuck on this topic.',
  'Could you explain that another way?',
  'Please check my work when you have time.',
  'What should I revise next?',
]

function initials(name?: string) {
  return (name || 'Peak').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function formatTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function contactFor(conversation: any, role: Role) {
  return role === 'student' ? conversation.teacher : conversation.student
}

export function PeakMessenger({ role }: PeakMessengerProps) {
  const [bootstrap, setBootstrap] = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showDirectory, setShowDirectory] = useState(role === 'student')

  const loadBootstrap = async () => {
    try {
      const data = await getMessagingBootstrap()
      setBootstrap(data)
      setConversations(data.conversations || [])
      const fromUrl = new URLSearchParams(window.location.search).get('conversation')
      const initial = fromUrl && data.conversations?.some((item: any) => item.id === fromUrl)
        ? fromUrl
        : data.conversations?.[0]?.id
      if (initial) setSelectedId(initial)
    } catch (error: any) {
      toast.error(error.message || 'Messaging is temporarily unavailable')
    }
  }

  useEffect(() => {
    loadBootstrap()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    let active = true
    setLoadingMessages(true)
    getPeakMessages(selectedId)
      .then((data) => {
        if (active) setMessages(data)
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingMessages(false))
    markPeakConversationRead(selectedId).catch(() => null)

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`peak-chat-${selectedId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'peak_messages',
        filter: `conversation_id=eq.${selectedId}`,
      }, () => {
        getPeakMessages(selectedId).then((data) => active && setMessages(data)).catch(() => null)
        loadBootstrap()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'peak_message_reactions',
      }, () => {
        getPeakMessages(selectedId).then((data) => active && setMessages(data)).catch(() => null)
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [selectedId])

  const selected = conversations.find((item) => item.id === selectedId)
  const filteredConversations = conversations.filter((conversation) => {
    const contact = contactFor(conversation, role)
    const haystack = `${contact?.full_name || ''} ${contact?.class?.name || ''} ${conversation.subject?.name || ''}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  const startConversation = async (teacherId: string) => {
    try {
      const conversation = await startPeakConversation(teacherId)
      setConversations((previous) => {
        const found = previous.some((item) => item.id === conversation.id)
        return found ? previous.map((item) => item.id === conversation.id ? conversation : item) : [conversation, ...previous]
      })
      setSelectedId(conversation.id)
      setShowDirectory(false)
    } catch (error: any) {
      toast.error(error.message || 'Could not start this conversation')
    }
  }

  const startStudentConversation = async (studentId: string) => {
    try {
      const conversation = await startTeacherPeakConversation(studentId)
      setConversations((previous) => {
        const found = previous.some((item) => item.id === conversation.id)
        return found ? previous.map((item) => item.id === conversation.id ? conversation : item) : [conversation, ...previous]
      })
      setSelectedId(conversation.id)
      setShowDirectory(false)
    } catch (error: any) {
      toast.error(error.message || 'Could not start this conversation')
    }
  }

  if (!bootstrap) return <MessengerSkeleton />

  return (
    <div className="min-h-[calc(100vh-73px)] p-3 md:p-6 lg:p-8 bg-[var(--bg)]">
      <div className="mx-auto max-w-[1600px] h-[calc(100vh-105px)] md:h-[calc(100vh-120px)] min-h-[620px] rounded-[28px] md:rounded-[36px] overflow-hidden border border-[var(--card-border)] bg-[var(--card)] shadow-2xl shadow-black/10 flex">
        <ConversationRail
          role={role}
          bootstrap={bootstrap}
          conversations={filteredConversations}
          selectedId={selectedId}
          search={search}
          setSearch={setSearch}
          onSelect={(id: string) => {
            setSelectedId(id)
            setShowDirectory(false)
          }}
          onStart={startConversation}
          onStartStudent={startStudentConversation}
          showDirectory={showDirectory}
          setShowDirectory={setShowDirectory}
        />

        <section className={`${selected || (role === 'teacher' && showDirectory) ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col relative overflow-hidden`}>
          {role === 'teacher' && showDirectory ? (
            <StudentDiscoveryCanvas
              students={bootstrap.contacts}
              conversations={conversations}
              onSelect={(id: string) => {
                setSelectedId(id)
                setShowDirectory(false)
              }}
              onStart={startStudentConversation}
            />
          ) : selected ? (
            <ConversationWorkspace
              role={role}
              currentUserId={bootstrap.currentUserId}
              conversation={selected}
              messages={messages}
              loading={loadingMessages}
              safety={(bootstrap.safety || []).filter((item: any) => item.conversation_id === selected.id)}
              onBack={() => setSelectedId(null)}
              onRefresh={() => getPeakMessages(selected.id).then(setMessages)}
            />
          ) : (
            <EmptyConversation role={role} />
          )}
        </section>
      </div>
    </div>
  )
}

function ConversationRail(props: any) {
  const { role, bootstrap, conversations, selectedId, search, setSearch, onSelect, onStart, onStartStudent, showDirectory, setShowDirectory } = props
  return (
    <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] xl:w-[410px] shrink-0 border-r border-[var(--card-border)] flex-col bg-[var(--card)]`}>
      <div className="p-5 md:p-6 border-b border-[var(--card-border)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.22em]">
              <Sparkles size={13} /> Peak Connect
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--text)] mt-2">
              {role === 'student' ? 'Your teacher circle' : 'Learning conversations'}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {role === 'student' ? 'Ask, learn, and keep moving forward.' : 'Support students without losing learning context.'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <MessageCircle size={21} />
          </div>
        </div>

        {role === 'student' && (
          <TeacherStories contacts={bootstrap.contacts} conversations={conversations} onStart={onStart} />
        )}

        <div className="mt-5 flex gap-2">
          <div className="flex-1 h-11 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] flex items-center gap-3 px-4">
            <Search size={16} className="text-[var(--text-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="w-full bg-transparent outline-none text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]" />
          </div>
          {role === 'teacher' && (
            <button aria-label="Show assigned students" onClick={() => setShowDirectory(!showDirectory)} className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center">
              <Users size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {showDirectory && role === 'teacher' && (
          <StudentDiscovery
            students={bootstrap.contacts}
            conversations={conversations}
            onSelect={onSelect}
            onStart={onStartStudent}
          />
        )}
        {conversations.map((conversation: any) => (
          <ConversationRow key={conversation.id} role={role} conversation={conversation} active={conversation.id === selectedId} onClick={() => onSelect(conversation.id)} />
        ))}
        {conversations.length === 0 && (
          <div className="py-16 text-center px-8">
            <MessageCircle size={34} className="mx-auto text-[var(--text-muted)] opacity-30" />
            <p className="mt-4 text-sm font-bold text-[var(--text)]">No conversations yet</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {role === 'student' ? 'Choose a teacher above to begin.' : 'Student conversations will appear here.'}
            </p>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-[var(--card-border)] flex items-center gap-3">
        <ShieldCheck size={16} className="text-emerald-500" />
        <p className="text-[9px] leading-relaxed text-[var(--text-muted)]">Peak Safeguarding monitors communication patterns and keeps human review in control.</p>
      </div>
    </aside>
  )
}

function TeacherStories({ contacts, conversations, onStart }: any) {
  return (
    <div className="mt-5 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {contacts.map((teacher: any) => {
        const conversation = conversations.find((item: any) => item.teacher_id === teacher.id)
        return (
          <button key={teacher.id} onClick={() => conversation ? onStart(teacher.id) : onStart(teacher.id)} className="w-[72px] shrink-0 text-center group">
            <div className="w-16 h-16 mx-auto p-[3px] rounded-[22px] bg-gradient-to-br from-primary via-sky-400 to-emerald-400 shadow-lg shadow-primary/10 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-[19px] bg-[var(--card)] flex items-center justify-center overflow-hidden">
                {teacher.avatar_url ? <img src={teacher.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="font-black text-primary">{initials(teacher.full_name)}</span>}
              </div>
            </div>
            <p className="mt-2 text-[10px] font-black truncate text-[var(--text)]">{teacher.full_name?.split(' ')[0]}</p>
            <p className="text-[8px] text-[var(--text-muted)] truncate">{teacher.subjects?.[0] || 'Teacher'}</p>
          </button>
        )
      })}
    </div>
  )
}

function StudentDiscovery({ students, conversations, onSelect, onStart }: any) {
  const recent = students.slice(0, 6)
  return (
    <div className="mb-3 p-3 rounded-2xl bg-gradient-to-br from-primary/8 to-sky-500/5 border border-primary/10">
      <div className="flex items-center justify-between px-2 mb-3">
        <div>
          <p className="text-[9px] uppercase tracking-widest font-black text-primary">Student universe</p>
          <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{students.length} assigned learners</p>
        </div>
        <Sparkles size={15} className="text-primary" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {recent.map((student: any) => {
          const conversation = conversations.find((item: any) => item.student_id === student.id)
          return (
            <button
              key={student.id}
              onClick={() => conversation ? onSelect(conversation.id) : onStart(student.id)}
              className="p-2 rounded-xl bg-[var(--card)] border border-[var(--card-border)] hover:border-primary/30 hover:-translate-y-0.5 transition-all text-center"
            >
              <Avatar url={student.profile?.avatar_url} metadata={student.profile?.avatar_metadata} name={student.full_name} size="sm" className="mx-auto !rounded-xl" />
              <p className="mt-1.5 text-[9px] font-black truncate text-[var(--text)]">{student.full_name?.split(' ')[0]}</p>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-center text-[8px] font-bold text-[var(--text-muted)]">Open the full discovery canvas to search every class.</p>
    </div>
  )
}

function StudentDiscoveryCanvas({ students, conversations, onSelect, onStart }: any) {
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const classes = useMemo(() => {
    const map = new Map<string, string>()
    students.forEach((student: any) => {
      if (student.class?.id) map.set(student.class.id, student.class.name)
    })
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [students])
  const filtered = students.filter((student: any) => {
    const matchesQuery = `${student.full_name} ${student.class?.name || ''}`.toLowerCase().includes(query.toLowerCase())
    const matchesClass = classFilter === 'all' || student.class?.id === classFilter
    return matchesQuery && matchesClass
  })
  const grouped = filtered.reduce((map: Map<string, any[]>, student: any) => {
    const className = student.class?.name || 'Unassigned class'
    map.set(className, [...(map.get(className) || []), student])
    return map
  }, new Map<string, any[]>())

  return (
    <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_30%)]">
      <div className="sticky top-0 z-10 p-5 md:p-8 border-b border-[var(--card-border)] bg-[var(--card)]/90 backdrop-blur-2xl">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.24em]"><Sparkles size={14} /> Peak learner universe</div>
            <h2 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-[var(--text)]">Who needs your support?</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)] max-w-2xl">Every learner you teach, organized by class and brought to life with the identity they created at Peak.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-primary/10 text-primary">
              <span className="text-2xl font-black">{students.length}</span>
              <span className="ml-2 text-[9px] font-black uppercase tracking-widest">Learners</span>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
              <span className="text-2xl font-black">{conversations.length}</span>
              <span className="ml-2 text-[9px] font-black uppercase tracking-widest">Connected</span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <div className="h-12 flex-1 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] px-4 flex items-center gap-3">
            <Search size={17} className="text-[var(--text-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by student or class..." className="w-full bg-transparent outline-none text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <button onClick={() => setClassFilter('all')} className={`shrink-0 px-4 h-12 rounded-2xl text-xs font-black ${classFilter === 'all' ? 'bg-primary text-white' : 'bg-[var(--input)] text-[var(--text-muted)]'}`}>All classes</button>
            {classes.map((item) => <button key={item.id} onClick={() => setClassFilter(item.id)} className={`shrink-0 px-4 h-12 rounded-2xl text-xs font-black ${classFilter === item.id ? 'bg-primary text-white' : 'bg-[var(--input)] text-[var(--text-muted)]'}`}>{item.name}</button>)}
          </div>
        </div>
      </div>

      <div className="p-5 md:p-8 space-y-10">
        {[...grouped.entries()].map(([className, classStudents]) => (
          <section key={className}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><GraduationCap size={17} /></div>
              <div>
                <h3 className="font-black text-[var(--text)]">{className}</h3>
                <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">{classStudents.length} learners</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {classStudents.map((student: any, index: number) => {
                const conversation = conversations.find((item: any) => item.student_id === student.id)
                return (
                  <motion.button
                    key={student.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.025, 0.3) }}
                    onClick={() => conversation ? onSelect(conversation.id) : onStart(student.id)}
                    className="group relative overflow-hidden p-5 rounded-[26px] bg-[var(--card)] border border-[var(--card-border)] hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all text-left"
                  >
                    <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-primary/5 group-hover:scale-150 transition-transform duration-500" />
                    <div className="relative flex items-start gap-4">
                      <Avatar url={student.profile?.avatar_url} metadata={student.profile?.avatar_metadata} name={student.full_name} size="lg" animate className="!rounded-[22px] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-black text-[var(--text)] truncate">{student.full_name}</h4>
                            <p className="mt-1 text-[10px] font-bold text-[var(--text-muted)]">{className}</p>
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full mt-1 ${conversation ? 'bg-emerald-500' : 'bg-sky-400'}`} />
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${conversation ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                            {conversation ? 'Continue' : 'Say hello'}
                          </span>
                          <MessageCircle size={17} className="text-[var(--text-muted)] group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <div className="py-24 text-center">
            <Search size={36} className="mx-auto text-[var(--text-muted)] opacity-30" />
            <h3 className="mt-4 text-lg font-black text-[var(--text)]">No learners match that search</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Try another name or class.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationRow({ role, conversation, active, onClick }: any) {
  const contact = contactFor(conversation, role)
  return (
    <button onClick={onClick} className={`w-full p-4 rounded-2xl flex gap-3 text-left transition-all mb-1 ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-[var(--input)] text-[var(--text)]'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black ${active ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary'}`}>
        {initials(contact?.full_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-black text-sm truncate">{contact?.full_name}</p>
          <span className={`text-[9px] ${active ? 'text-white/65' : 'text-[var(--text-muted)]'}`}>{formatTime(conversation.last_message_at)}</span>
        </div>
        <p className={`text-[10px] mt-1 truncate ${active ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
          {role === 'teacher' ? contact?.class?.name : conversation.subject?.name || 'Class teacher'}
        </p>
        <p className={`text-xs mt-1.5 truncate ${active ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
          {conversation.last_message_preview || 'Start a learning conversation'}
        </p>
      </div>
    </button>
  )
}

function ConversationWorkspace({ role, currentUserId, conversation, messages, loading, safety, onBack, onRefresh }: any) {
  const contact = contactFor(conversation, role)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [editing, setEditing] = useState<any>(null)
  const [otherTyping, setOtherTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const refreshTyping = async () => {
      const { data } = await supabase
        .from('peak_typing_presence')
        .select('user_id, is_typing, updated_at')
        .eq('conversation_id', conversation.id)
        .neq('user_id', currentUserId)
      const active = (data || []).some((item: any) =>
        item.is_typing && Date.now() - new Date(item.updated_at).getTime() < 5000
      )
      setOtherTyping(active)
    }
    refreshTyping()
    const channel = supabase
      .channel(`peak-typing-${conversation.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'peak_typing_presence',
        filter: `conversation_id=eq.${conversation.id}`,
      }, refreshTyping)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation.id, currentUserId])

  return (
    <>
      <header className="h-[78px] px-4 md:px-6 border-b border-[var(--card-border)] flex items-center gap-4 shrink-0 bg-[var(--card)]/95 backdrop-blur-xl z-10">
        <button onClick={onBack} className="md:hidden w-10 h-10 rounded-xl bg-[var(--input)] flex items-center justify-center"><ArrowLeft size={18} /></button>
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-sky-400 text-white flex items-center justify-center font-black shadow-lg shadow-primary/20">{initials(contact?.full_name)}</div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-[var(--text)] truncate">{contact?.full_name}</h2>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {otherTyping ? 'Typing...' : role === 'student' ? conversation.subject?.name || 'Peak educator' : `${contact?.class?.name || 'Assigned class'} student`}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
          <ShieldCheck size={14} /> Safeguarded
        </div>
        <button aria-label="Conversation options" className="w-10 h-10 rounded-xl hover:bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)]"><MoreHorizontal size={19} /></button>
      </header>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.06),transparent_35%)]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-3">
            <div className="max-w-lg mx-auto mb-8 p-5 rounded-3xl bg-primary/5 border border-primary/10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><GraduationCap size={23} /></div>
              <p className="mt-3 text-sm font-black text-[var(--text)]">A focused space for learning</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">Keep personal details private and conversations respectful. Peak’s safety layer supports both of you.</p>
            </div>
            {loading ? <MessageLoading /> : messages.map((message: any) => (
              <MessageBubble
                key={message.id}
                message={message}
                own={message.sender_id === currentUserId}
                onReply={() => setReplyTo(message)}
                onEdit={() => setEditing(message)}
                onDelete={async () => {
                  await deletePeakMessage(message.id)
                  onRefresh()
                }}
                onReact={async (emoji: string) => {
                  await togglePeakReaction(message.id, emoji)
                  onRefresh()
                }}
              />
            ))}
          </div>
          <MessageComposer
            role={role}
            currentUserId={currentUserId}
            conversationId={conversation.id}
            replyTo={replyTo}
            editing={editing}
            onClearReply={() => setReplyTo(null)}
            onClearEdit={() => setEditing(null)}
            onSent={onRefresh}
          />
        </div>
        {role === 'teacher' && <TeacherIntelligencePanel safety={safety} messages={messages} conversationId={conversation.id} />}
      </div>
    </>
  )
}

function MessageBubble({ message, own, onReply, onEdit, onDelete, onReact }: any) {
  const [menu, setMenu] = useState(false)
  const [reactions, setReactions] = useState(false)
  const deleted = Boolean(message.deleted_at)
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[85%] md:max-w-[68%] ${own ? 'items-end' : 'items-start'} flex flex-col`}>
        {message.reply && (
          <div className="mb-1 px-3 py-2 rounded-xl bg-[var(--input)] border-l-2 border-primary text-[10px] text-[var(--text-muted)] max-w-full truncate">
            {message.reply.body}
          </div>
        )}
        <div className="relative flex items-end gap-2">
          {!own && (
            <button onClick={() => setMenu(!menu)} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)]"><MoreHorizontal size={14} /></button>
          )}
          <div className={`px-4 py-3 rounded-[20px] shadow-sm ${own ? 'bg-primary text-white rounded-br-md' : 'bg-[var(--input)] text-[var(--text)] border border-[var(--card-border)] rounded-bl-md'} ${deleted ? 'italic opacity-60' : ''}`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
            <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[8px] ${own ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
              {message.edited_at && <span>edited</span>}
              <span>{formatTime(message.created_at)}</span>
              {own && <CheckCheck size={11} />}
            </div>
          </div>
          {own && (
            <button onClick={() => setMenu(!menu)} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)]"><MoreHorizontal size={14} /></button>
          )}
          <AnimatePresence>
            {menu && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`absolute bottom-full mb-2 ${own ? 'right-0' : 'left-0'} z-20 p-1.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] shadow-xl flex gap-1`}>
                <BubbleAction icon={<Reply size={13} />} onClick={() => { onReply(); setMenu(false) }} />
                <BubbleAction icon={<Smile size={13} />} onClick={() => setReactions(!reactions)} />
                {own && !deleted && <BubbleAction icon={<Edit3 size={13} />} onClick={() => { onEdit(); setMenu(false) }} />}
                {own && !deleted && <BubbleAction icon={<Trash2 size={13} />} danger onClick={() => { onDelete(); setMenu(false) }} />}
              </motion.div>
            )}
          </AnimatePresence>
          {reactions && (
            <div className="absolute bottom-full mb-12 left-0 z-30 flex gap-1 p-2 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-xl">
              {EMOJIS.slice(0, 5).map((emoji) => <button key={emoji} onClick={() => { onReact(emoji); setReactions(false); setMenu(false) }} className="w-8 h-8 rounded-lg hover:bg-[var(--input)]">{emoji}</button>)}
            </div>
          )}
        </div>
        {message.reactions?.length > 0 && (
          <div className="mt-1 flex gap-1 flex-wrap">
            {Object.entries(message.reactions.reduce((acc: any, item: any) => ({ ...acc, [item.emoji]: (acc[item.emoji] || 0) + 1 }), {})).map(([emoji, count]) => (
              <button key={emoji} onClick={() => onReact(emoji)} className="px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--card-border)] text-[10px]">{emoji} {String(count)}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BubbleAction({ icon, onClick, danger }: any) {
  return <button onClick={onClick} className={`w-8 h-8 rounded-lg flex items-center justify-center ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-[var(--text-muted)] hover:bg-[var(--input)]'}`}>{icon}</button>
}

function MessageComposer({ role, currentUserId, conversationId, replyTo, editing, onClearReply, onClearEdit, onSent }: any) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [warning, setWarning] = useState<any>(null)
  const [pendingBody, setPendingBody] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editing) {
      setBody(editing.body)
      inputRef.current?.focus()
    }
  }, [editing])

  const updateTyping = async (isTyping: boolean) => {
    await getSupabaseBrowserClient().from('peak_typing_presence').upsert({
      conversation_id: conversationId,
      user_id: currentUserId,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'conversation_id,user_id' })
  }

  const handleBodyChange = (value: string) => {
    setBody(value)
    updateTyping(Boolean(value.trim())).catch(() => null)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => updateTyping(false).catch(() => null), 3000)
  }

  const submit = async (event?: FormEvent, confirmed = false) => {
    event?.preventDefault()
    const text = confirmed ? pendingBody : body.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const result = editing
        ? await editPeakMessage(editing.id, text, confirmed)
        : await sendPeakMessage({ conversationId, body: text, replyToId: replyTo?.id, confirmed })
      if ((result as any).blocked) {
        setWarning({ ...(result as any).safety, blocked: true })
        return
      }
      if ((result as any).requiresConfirmation) {
        setPendingBody(text)
        setWarning((result as any).safety)
        return
      }
      setBody('')
      updateTyping(false).catch(() => null)
      setPendingBody('')
      setWarning(null)
      onClearReply()
      onClearEdit()
      onSent()
    } catch (error: any) {
      toast.error(error.message || 'Message could not be sent')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-3 md:p-5 border-t border-[var(--card-border)] bg-[var(--card)]">
      {role === 'student' && !body && !editing && (
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
          {STUDENT_PROMPTS.map((prompt) => <button key={prompt} onClick={() => setBody(prompt)} className="shrink-0 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary hover:bg-primary/10">{prompt}</button>)}
        </div>
      )}
      {(replyTo || editing) && (
        <div className="mb-2 px-4 py-2 rounded-xl bg-[var(--input)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary">{editing ? 'Editing message' : 'Replying to'}</p>
            <p className="text-xs truncate text-[var(--text-muted)]">{(editing || replyTo).body}</p>
          </div>
          <button onClick={editing ? onClearEdit : onClearReply}><X size={15} /></button>
        </div>
      )}
      <form onSubmit={submit} className="flex items-end gap-2 md:gap-3">
        <button type="button" disabled aria-label="Attachments require storage activation" title="Attachments activate after the messaging storage migration" className="hidden sm:flex w-11 h-11 rounded-2xl bg-[var(--input)] items-center justify-center text-[var(--text-muted)] opacity-40"><Paperclip size={18} /></button>
        <div className="flex-1 min-w-0 rounded-[22px] bg-[var(--input)] border border-[var(--card-border)] flex items-end px-3">
          <textarea ref={inputRef} value={body} onChange={(event) => handleBodyChange(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }} rows={1} placeholder={role === 'student' ? 'Ask your teacher...' : 'Write a thoughtful response...'} className="min-h-11 max-h-32 flex-1 resize-none bg-transparent outline-none py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]" />
          <div className="relative">
            <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="w-9 h-11 flex items-center justify-center text-[var(--text-muted)] hover:text-primary"><Smile size={18} /></button>
            {showEmoji && (
              <div className="absolute bottom-full right-0 mb-3 p-2 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-xl grid grid-cols-4 gap-1 z-30">
                {EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => { setBody((value) => value + emoji); setShowEmoji(false) }} className="w-9 h-9 rounded-lg hover:bg-[var(--input)]">{emoji}</button>)}
              </div>
            )}
          </div>
        </div>
        <button disabled={!body.trim() || sending} className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25 disabled:opacity-40 disabled:shadow-none hover:scale-105 transition-transform">
          <Send size={17} />
        </button>
      </form>
      <p className="mt-2 text-center text-[8px] text-[var(--text-muted)]">Peak Safeguarding checks context and communication patterns before delivery.</p>

      <AnimatePresence>
        {warning && (
          <SafetyDialog warning={warning} onClose={() => setWarning(null)} onRewrite={(text: string) => { setBody(text); setWarning(null) }} onConfirm={warning.blocked ? undefined : () => submit(undefined, true)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function SafetyDialog({ warning, onClose, onRewrite, onConfirm }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} className="w-full max-w-md rounded-[28px] bg-[var(--card)] border border-[var(--card-border)] p-6 shadow-2xl">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${warning.blocked ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
          <AlertTriangle size={25} />
        </div>
        <h3 className="mt-5 text-xl font-black text-[var(--text)]">{warning.blocked ? 'This message cannot be sent' : 'Pause before sending'}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{warning.explanation}</p>
        {warning.categories?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{warning.categories.map((category: string) => <span key={category} className="px-2 py-1 rounded-lg bg-[var(--input)] text-[9px] font-black uppercase text-[var(--text-muted)]">{category}</span>)}</div>}
        <div className="mt-6 space-y-2">
          {warning.suggestedRewrite && <button onClick={() => onRewrite(warning.suggestedRewrite)} className="w-full h-12 rounded-2xl bg-primary text-white font-black text-xs flex items-center justify-center gap-2"><Sparkles size={15} /> Use respectful rewrite</button>}
          {onConfirm && <button onClick={onConfirm} className="w-full h-12 rounded-2xl bg-amber-500 text-black font-black text-xs">Send after warning</button>}
          <button onClick={onClose} className="w-full h-12 rounded-2xl bg-[var(--input)] text-[var(--text)] font-black text-xs">Go back and edit</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function TeacherIntelligencePanel({ safety, messages, conversationId }: any) {
  const [drafting, setDrafting] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const risk = safety?.[0]
  const studentMessages = messages.filter((item: any) => !item.deleted_at)
  const askAI = async () => {
    setDrafting(true)
    try {
      const result = await generatePeakReply(conversationId)
      setSuggestion(result.reply)
      await navigator.clipboard?.writeText(result.reply)
      toast.success('Suggested reply copied')
    } finally {
      setDrafting(false)
    }
  }
  return (
    <aside className="hidden xl:flex w-[310px] shrink-0 border-l border-[var(--card-border)] bg-[var(--card)] flex-col p-5 overflow-y-auto">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary"><Bot size={15} /> Peak Intelligence</div>
      <div className="mt-5 p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <p className="text-[9px] uppercase tracking-widest font-black text-primary">Conversation pulse</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <InsightMetric label="Messages" value={studentMessages.length} />
          <InsightMetric label="Flags" value={safety.length} />
        </div>
      </div>
      <div className={`mt-4 p-4 rounded-2xl border ${risk ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
        <div className="flex items-center gap-2">
          {risk ? <AlertTriangle size={16} className="text-amber-500" /> : <ShieldCheck size={16} className="text-emerald-500" />}
          <p className="text-xs font-black text-[var(--text)]">{risk ? `${risk.risk_level} attention` : 'Healthy communication'}</p>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-muted)]">{risk?.explanation || 'No concerning pattern has been detected. Human judgment remains primary.'}</p>
      </div>
      <button onClick={askAI} disabled={drafting} className="mt-4 w-full p-4 rounded-2xl bg-gradient-to-br from-primary to-sky-500 text-white text-left shadow-lg shadow-primary/15 disabled:opacity-50">
        <div className="flex items-center justify-between"><Sparkles size={17} /><ChevronRight size={16} /></div>
        <p className="mt-3 text-xs font-black">Coach my response</p>
        <p className="mt-1 text-[9px] text-white/70">Generate a warm, professional learning-focused reply.</p>
      </button>
      {suggestion && <div className="mt-3 p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] text-xs leading-relaxed text-[var(--text)]">{suggestion}</div>}
      <div className="mt-6">
        <p className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)]">Teacher tools</p>
        <div className="mt-3 space-y-2">
          <ToolRow icon={<BookOpen size={15} />} label="Turn into learning task" />
          <ToolRow icon={<Heart size={15} />} label="Record student support note" />
          <ToolRow icon={<AlertTriangle size={15} />} label="Escalate for human review" />
        </div>
      </div>
    </aside>
  )
}

function InsightMetric({ label, value }: any) {
  return <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)]"><p className="text-lg font-black text-[var(--text)]">{value}</p><p className="text-[8px] uppercase tracking-widest text-[var(--text-muted)]">{label}</p></div>
}

function ToolRow({ icon, label }: any) {
  return <button className="w-full p-3 rounded-xl hover:bg-[var(--input)] flex items-center gap-3 text-left text-xs font-bold text-[var(--text)]"><span className="text-primary">{icon}</span>{label}</button>
}

function EmptyConversation({ role }: { role: Role }) {
  return <div className="h-full flex items-center justify-center p-8 text-center"><div><div className="w-20 h-20 mx-auto rounded-[28px] bg-primary/10 text-primary flex items-center justify-center"><MessageCircle size={34} /></div><h2 className="mt-6 text-2xl font-black text-[var(--text)]">{role === 'student' ? 'Choose your teacher' : 'Select a student conversation'}</h2><p className="mt-2 text-sm text-[var(--text-muted)] max-w-sm">{role === 'student' ? 'Your assigned teachers are ready in the circle. Start with a question, challenge, or idea.' : 'Open a conversation to see class context, safety intelligence, and response tools.'}</p></div></div>
}

function MessengerSkeleton() {
  return <div className="min-h-[calc(100vh-73px)] p-6 bg-[var(--bg)]"><div className="mx-auto max-w-[1600px] h-[calc(100vh-120px)] rounded-[36px] bg-[var(--card)] border border-[var(--card-border)] animate-pulse" /></div>
}

function MessageLoading() {
  return <div className="space-y-4"><div className="w-2/3 h-16 rounded-2xl bg-[var(--input)] animate-pulse" /><div className="ml-auto w-1/2 h-20 rounded-2xl bg-primary/10 animate-pulse" /><div className="w-3/5 h-14 rounded-2xl bg-[var(--input)] animate-pulse" /></div>
}
