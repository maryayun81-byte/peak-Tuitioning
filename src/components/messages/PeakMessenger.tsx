'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, Bell, BookOpen, Bot, CheckCheck, ChevronRight,
  ClipboardCheck, Edit3, GraduationCap, Heart, Loader2, MessageCircle, Mic,
  MoreHorizontal, Paperclip, Pin, Reply, Search, Send, ShieldCheck,
  Smile, Sparkles, Square, Trash2, Users, Volume2, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  deletePeakMessage,
  editPeakMessage,
  generatePeakReply,
  generatePeakConversationSummary,
  getPeakConversationSummary,
  getMessagingBootstrap,
  getPeakMessages,
  markPeakConversationRead,
  setPeakConversationPaused,
  sendPeakMessage,
  sendPeakLearningCard,
  sendPeakVoiceNote,
  savePeakPushSubscription,
  deletePeakPushSubscription,
  startPeakConversation,
  startTeacherPeakConversation,
  startPeerPeakConversation,
  getPeerPeakMessages,
  sendPeerPeakMessage,
  togglePeakReaction,
  togglePeakMessagePin,
} from '@/app/actions/messages'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'

type Role = 'student' | 'teacher'
type PeakMessengerProps = { role: Role }

const EMOJI_GROUPS = {
  Recent: ['😀', '😂', '😊', '🥳', '👍', '👏', '❤️', '🔥', '🎯', '💡', '✅', '🎉'],
  Feelings: ['😄', '😁', '🤣', '🙂', '😉', '😍', '🤩', '😎', '🤗', '🤔', '😮', '😅', '😢', '😭', '😤', '😴', '🥺', '😇'],
  Reactions: ['👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '👌', '✌️', '🤞', '👀', '💯', '🫶', '👋', '🤟', '☝️', '💬', '🧠'],
  Learning: ['📚', '📖', '✍️', '📝', '📌', '📐', '📏', '🧮', '🔬', '🧪', '🌍', '💻', '🎓', '🏆', '💡', '🎯', '✅', '❓'],
  Celebrate: ['🎉', '🥳', '🎊', '🏅', '🥇', '⭐', '🌟', '✨', '🔥', '🚀', '💫', '🎁', '🎈', '👏', '🙌', '💯', '🏆', '❤️'],
  Everyday: ['❤️', '💙', '💚', '💛', '🧡', '💜', '☀️', '🌙', '☕', '🍎', '⚽', '🎵', '📅', '⏰', '🔔', '📣', '📎', '🔒'],
} as const
const EMOJIS = Object.values(EMOJI_GROUPS).flat()
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
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatMessageTime(value?: string) {
  return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
}

function dateKey(value?: string) {
  return value ? new Date(value).toDateString() : ''
}

function formatDateDivider(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function contactFor(conversation: any, role: Role) {
  return role === 'student' ? conversation.teacher : conversation.student
}

export function PeakMessenger({ role }: PeakMessengerProps) {
  const { profile, student, teacher } = useAuthStore()
  const actorUserId = profile?.id || (student as any)?.user_id || (teacher as any)?.user_id
  const [bootstrap, setBootstrap] = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [openingStudentId, setOpeningStudentId] = useState<string | null>(null)
  const [showDirectory, setShowDirectory] = useState(role === 'student')
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null)
  const [peerMessages, setPeerMessages] = useState<any[]>([])
  const [loadingPeer, setLoadingPeer] = useState(false)

  const loadBootstrap = async () => {
    try {
      const result = await getMessagingBootstrap(actorUserId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const data = result.bootstrap
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
    if (actorUserId) loadBootstrap()
  }, [actorUserId])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    let active = true
    setLoadingMessages(true)
    getPeakMessages(selectedId, actorUserId)
      .then((result) => {
        if (!result.ok) toast.error(result.error)
        if (active) setMessages(result.messages)
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingMessages(false))
    markPeakConversationRead(selectedId, actorUserId).catch(() => null)

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`peak-chat-${selectedId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'peak_messages',
        filter: `conversation_id=eq.${selectedId}`,
      }, () => {
        getPeakMessages(selectedId, actorUserId).then((result) => active && setMessages(result.messages)).catch(() => null)
        loadBootstrap()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'peak_message_reactions',
      }, () => {
        getPeakMessages(selectedId, actorUserId).then((result) => active && setMessages(result.messages)).catch(() => null)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'peak_conversations',
        filter: `id=eq.${selectedId}`,
      }, () => {
        getPeakMessages(selectedId, actorUserId).then((result) => active && setMessages(result.messages)).catch(() => null)
      })
      .subscribe()

    // Polling fallback for when Realtime is unavailable
    const pollInterval = setInterval(() => {
      getPeakMessages(selectedId, actorUserId).then((result) => active && setMessages(result.messages)).catch(() => null)
      loadBootstrap()
    }, 8000)

    return () => {
      active = false
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [selectedId])

  const selectedRaw = conversations.find((item) => item.id === selectedId)
  const selected = selectedRaw && role === 'teacher'
    ? {
        ...selectedRaw,
        student: {
          ...selectedRaw.student,
          profile: bootstrap.contacts?.find((student: any) => student.id === selectedRaw.student_id)?.profile || null,
        },
      }
    : selectedRaw
  const filteredConversations = conversations.filter((conversation) => {
    const contact = contactFor(conversation, role)
    const haystack = `${contact?.full_name || ''} ${contact?.class?.name || ''} ${conversation.subject?.name || ''}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  const startConversation = async (teacherId: string) => {
    try {
      const conversation = await startPeakConversation(teacherId, actorUserId)
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
    if (openingStudentId) return
    setOpeningStudentId(studentId)
    try {
      const result = await startTeacherPeakConversation(studentId, actorUserId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const conversation = result.conversation
      setConversations((previous) => {
        const found = previous.some((item) => item.id === conversation.id)
        return found ? previous.map((item) => item.id === conversation.id ? conversation : item) : [conversation, ...previous]
      })
      setSelectedId(conversation.id)
      setShowDirectory(false)
    } catch (error: any) {
      toast.error(error.message || 'Could not start this conversation')
    } finally {
      setOpeningStudentId(null)
    }
  }

  const startPeerConversation = async (classmateStudentId: string) => {
    if (openingStudentId) return
    setOpeningStudentId(classmateStudentId)
    try {
      const result = await startPeerPeakConversation(classmateStudentId, actorUserId)
      if (!result.ok) { toast.error(result.error); return }
      setSelectedPeerId(result.conversation.id)
      setSelectedId(null)
      const msgResult = await getPeerPeakMessages(result.conversation.id, actorUserId)
      if (msgResult.ok) setPeerMessages(msgResult.messages)
    } catch (error: any) {
      toast.error(error.message || 'Could not open chat')
    } finally {
      setOpeningStudentId(null)
    }
  }

  const closePeerConversation = () => {
    setSelectedPeerId(null)
    setPeerMessages([])
  }

  if (!bootstrap) return <MessengerSkeleton />

  return (
    <div className="min-h-[calc(100dvh-73px)] p-2 sm:p-3 md:p-6 lg:p-8 pb-20 md:pb-6 bg-[var(--bg)]">
      <div className="mx-auto max-w-[1600px] h-[calc(100dvh-158px)] sm:h-[calc(100dvh-150px)] md:h-[calc(100dvh-120px)] min-h-[480px] md:min-h-[620px] rounded-[22px] sm:rounded-[28px] md:rounded-[36px] overflow-hidden border border-[var(--card-border)] bg-[var(--card)] shadow-2xl shadow-black/10 flex">
        <ConversationRail
          role={role}
          bootstrap={bootstrap}
          conversations={filteredConversations}
          selectedId={selectedId}
          search={search}
          setSearch={setSearch}
          onSelect={(id: string) => {
            setSelectedId(id)
            setSelectedPeerId(null)
            setShowDirectory(false)
          }}
          onStart={startConversation}
          onStartStudent={startStudentConversation}
          onStartPeer={startPeerConversation}
          openingStudentId={openingStudentId}
          showDirectory={showDirectory}
          setShowDirectory={setShowDirectory}
        />

        <section className={`${selected || selectedPeerId || (role === 'teacher' && showDirectory) ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col relative overflow-hidden`}>
          {role === 'teacher' && showDirectory ? (
            <StudentDiscoveryCanvas
              students={bootstrap.contacts}
              conversations={conversations}
              onSelect={(id: string) => {
                setSelectedId(id)
                setShowDirectory(false)
              }}
              onStart={startStudentConversation}
              openingStudentId={openingStudentId}
              onBack={() => setShowDirectory(false)}
            />
          ) : selectedPeerId ? (
            <PeerConversationPanel
              conversationId={selectedPeerId}
              messages={peerMessages}
              loading={loadingPeer}
              actorUserId={bootstrap.currentUserId}
              currentStudentId={bootstrap.currentProfile?.id}
              classmates={bootstrap.classmates}
              onBack={closePeerConversation}
              onMessageSent={(msg: any) => {
                if (!msg) return
                setPeerMessages((prev) => [...prev, msg])
              }}
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
              onRefresh={() => getPeakMessages(selected.id, actorUserId).then((result) => setMessages(result.messages))}
              onMessageSaved={(message: any) => {
                if (!message) return
                setMessages((previous) => {
                  const exists = previous.some((item) => item.id === message.id)
                  return exists
                    ? previous.map((item) => item.id === message.id ? { ...item, ...message } : item)
                    : [...previous, { ...message, reactions: [] }]
                })
              }}
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
  const { role, bootstrap, conversations, selectedId, search, setSearch, onSelect, onStart, onStartStudent, onStartPeer, openingStudentId, showDirectory, setShowDirectory } = props
  return (
    <aside className={`${selectedId || (role === 'teacher' && showDirectory) ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] xl:w-[410px] shrink-0 border-r border-[var(--card-border)] flex-col bg-[var(--card)]`}>
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
          <PushNotificationButton />
        </div>

        {role === 'student' && (
          <TeacherStories contacts={bootstrap.contacts} conversations={conversations} onStart={onStart} />
        )}
        {role === 'student' && bootstrap.classmates?.length > 0 && (
          <ClassmatesStrip classmates={bootstrap.classmates} conversations={conversations} onStartPeer={onStartPeer} />
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
            openingStudentId={openingStudentId}
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

function ClassmatesStrip({ classmates, conversations, onStartPeer, openingStudentId }: any) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Users size={14} className="text-emerald-500" />
        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Your Classmates</span>
        <span className="text-[9px] text-[var(--text-muted)]">({classmates.length})</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {classmates.map((cm: any) => {
          const conversation = conversations.find((c: any) => c.student_id === cm.id)
          const isLoading = openingStudentId === cm.id
          return (
            <button
              key={cm.id}
              onClick={() => onStartPeer?.(cm.id)}
              disabled={!!openingStudentId}
              className="w-[56px] shrink-0 text-center group cursor-pointer disabled:opacity-50"
            >
              <div className={`mx-auto transition-transform group-hover:scale-105 group-active:scale-95 ${conversation ? 'ring-2 ring-emerald-400 rounded-2xl p-[2px]' : ''}`}>
                <Avatar
                  url={cm.profile?.avatar_url}
                  metadata={cm.profile?.avatar_metadata}
                  name={cm.full_name}
                  size="sm"
                  className="!w-12 !h-12 !rounded-2xl mx-auto"
                />
              </div>
              <p className="mt-1.5 text-[8px] font-bold truncate text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
                {isLoading ? 'Opening...' : cm.full_name?.split(' ')[0]}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PeerConversationPanel({ conversationId, messages, loading, actorUserId, currentStudentId, classmates, onBack, onMessageSent }: any) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`peer-messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'peak_peer_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as any
        if (msg.sender_id !== currentStudentId) {
          onMessageSent(msg)
        }
      })
      .subscribe()
    const pollInterval = setInterval(async () => {
      const result = await getPeerPeakMessages(conversationId, actorUserId)
      if (result.ok && result.messages.length > messages.length) {
        result.messages.slice(messages.length).forEach((msg: any) => onMessageSent(msg))
      }
    }, 8000)
    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentStudentId, onMessageSent, messages.length])

  const handleSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      const result = await sendPeerPeakMessage(conversationId, trimmed, actorUserId)
      if (result.ok) {
        onMessageSent(result.message)
        setBody('')
      } else {
        toast.error(result.error || 'Could not send message')
      }
    } catch {
      toast.error('Could not send message')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-[68px] md:h-[78px] px-3 md:px-6 border-b border-[var(--card-border)] flex items-center gap-3 shrink-0 bg-[var(--card)]/95 backdrop-blur-xl z-10">
        <button onClick={onBack} aria-label="Back" className="md:hidden w-9 h-9 rounded-xl bg-[var(--input)] flex items-center justify-center"><ArrowLeft size={17} /></button>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 font-black text-primary">
          <Users size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-[var(--text)] truncate">Classmate Chat</h2>
          <p className="text-[10px] text-[var(--text-muted)]">Peer learning conversation</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {loading && <div className="text-center py-8"><Loader2 size={20} className="mx-auto animate-spin text-[var(--text-muted)]" /></div>}
        {!loading && messages.length === 0 && (
          <div className="py-16 text-center">
            <MessageCircle size={34} className="mx-auto text-[var(--text-muted)] opacity-30" />
            <p className="mt-3 text-sm font-bold text-[var(--text)]">Send a message to your classmate</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Discuss assignments, share study tips, or collaborate.</p>
          </div>
        )}
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === currentStudentId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-primary text-white rounded-br-md' : 'bg-[var(--input)] text-[var(--text)] rounded-bl-md'}`}>
                <p>{msg.body}</p>
                <p className={`text-[9px] mt-1 ${isMe ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-3 md:p-4 border-t border-[var(--card-border)] shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            maxLength={4000}
            className="flex-1 h-12 px-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white disabled:opacity-40"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
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

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)))
}

function PushNotificationButton() {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistration('/')
      .then((registration) => registration?.pushManager.getSubscription())
      .then(async (subscription) => {
        if (!subscription) {
          setEnabled(false)
          return
        }

        const json = subscription.toJSON()
        const result = await savePeakPushSubscription({
          endpoint: subscription.endpoint,
          keys: { p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' },
          userAgent: navigator.userAgent,
        })
        setEnabled(result.ok)
      })
      .catch(() => null)
  }, [])

  const toggle = async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return toast.error('Push notifications are not supported on this device.')
    }
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.register('/peak-push-sw.js', { scope: '/' })
      const current = await registration.pushManager.getSubscription()
      if (current) {
        await deletePeakPushSubscription(current.endpoint)
        await current.unsubscribe()
        setEnabled(false)
        toast.success('Message push notifications turned off')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return toast.error('Notification permission was not granted.')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const json = subscription.toJSON()
      const result = await savePeakPushSubscription({
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' },
        userAgent: navigator.userAgent,
      })
      if (!result.ok) throw new Error(result.error)
      setEnabled(true)
      toast.success('Message push notifications enabled')
    } catch (error: any) {
      toast.error(error.message || 'Push notifications could not be enabled.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button onClick={toggle} disabled={busy} aria-label={enabled ? 'Disable message push notifications' : 'Enable message push notifications'} title={enabled ? 'Push notifications enabled' : 'Enable push notifications'} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
      <Bell size={20} fill={enabled ? 'currentColor' : 'none'} />
    </button>
  )
}

function StudentDiscovery({ students, conversations, onSelect, onStart, openingStudentId }: any) {
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
              disabled={openingStudentId === student.id}
              className="p-2 rounded-xl bg-[var(--card)] border border-[var(--card-border)] hover:border-primary/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 transition-all text-center"
            >
              <Avatar url={student.profile?.avatar_url} metadata={student.profile?.avatar_metadata} name={student.full_name} size="sm" className="mx-auto !rounded-xl" />
              <p className="mt-1.5 text-[9px] font-black truncate text-[var(--text)]">{student.full_name?.split(' ')[0]}</p>
              {openingStudentId === student.id && <p className="mt-0.5 text-[7px] font-black uppercase tracking-wider text-primary">Opening...</p>}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-center text-[8px] font-bold text-[var(--text-muted)]">Open the full discovery canvas to search every class.</p>
    </div>
  )
}

function StudentDiscoveryCanvas({ students, conversations, onSelect, onStart, openingStudentId, onBack }: any) {
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
            <div className="flex items-center gap-3">
              <button onClick={onBack} aria-label="Back to conversations" className="md:hidden w-10 h-10 shrink-0 rounded-xl bg-[var(--input)] flex items-center justify-center text-[var(--text)]"><ArrowLeft size={18} /></button>
              <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.18em] sm:tracking-[0.24em]"><Sparkles size={14} /> Peak learner universe</div>
            </div>
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
                const hasCustomAvatar = Boolean(student.profile?.avatar_url || student.profile?.avatar_metadata)
                return (
                  <motion.button
                    key={student.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.025, 0.3) }}
                    onClick={() => conversation ? onSelect(conversation.id) : onStart(student.id)}
                    disabled={openingStudentId === student.id}
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
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${conversation ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                              {conversation ? 'Continue' : openingStudentId === student.id ? 'Opening...' : 'Say hello'}
                            </span>
                            {!hasCustomAvatar && (
                              <span className="px-2 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-widest">
                                Starter avatar
                              </span>
                            )}
                          </div>
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

function ConversationWorkspace({ role, currentUserId, conversation, messages, loading, safety, onBack, onRefresh, onMessageSaved }: any) {
  const contact = contactFor(conversation, role)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [replyHighlightId, setReplyHighlightId] = useState<string | null>(null)
  const [editing, setEditing] = useState<any>(null)
  const [otherTyping, setOtherTyping] = useState(false)
  const [showSafetyNotice, setShowSafetyNotice] = useState(true)
  const [showConversationMenu, setShowConversationMenu] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showIntelligence, setShowIntelligence] = useState(true)
  const [paused, setPaused] = useState(role === 'student' ? conversation.is_archived_by_student : conversation.is_archived_by_teacher)
  const scrollRef = useRef<HTMLDivElement>(null)
  const otherTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pinnedMessages = messages.filter((message: any) => message.pins?.length)

  useEffect(() => {
    setShowSafetyNotice(true)
    setPaused(role === 'student' ? conversation.is_archived_by_student : conversation.is_archived_by_teacher)
    setReplyTo(null)
    setReplyHighlightId(null)
  }, [conversation.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    setOtherTyping(false)
    const channel = supabase
      .channel(`peak-typing-${conversation.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === currentUserId) return
        setOtherTyping(Boolean(payload.isTyping))
        if (otherTypingTimer.current) clearTimeout(otherTypingTimer.current)
        if (payload.isTyping) {
          otherTypingTimer.current = setTimeout(() => setOtherTyping(false), 4500)
        }
      })
      .subscribe()
    return () => {
      if (otherTypingTimer.current) clearTimeout(otherTypingTimer.current)
      setOtherTyping(false)
      supabase.removeChannel(channel)
    }
  }, [conversation.id, currentUserId])

  return (
    <>
      <header className="h-[68px] md:h-[78px] px-3 md:px-6 border-b border-[var(--card-border)] flex items-center gap-3 md:gap-4 shrink-0 bg-[var(--card)]/95 backdrop-blur-xl z-10">
        <button onClick={onBack} aria-label="Back to conversations" className="md:hidden w-9 h-9 rounded-xl bg-[var(--input)] flex items-center justify-center"><ArrowLeft size={17} /></button>
        <Avatar url={contact?.avatar_url || contact?.profile?.avatar_url} metadata={contact?.profile?.avatar_metadata} name={contact?.full_name} size="sm" className="!w-10 !h-10 md:!w-11 md:!h-11 !rounded-2xl shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-[var(--text)] truncate">{contact?.full_name}</h2>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
            {otherTyping ? (
              <>
                <span className="flex items-center gap-0.5" aria-hidden="true">
                  {[0, 1, 2].map((dot) => <span key={dot} className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${dot * 120}ms` }} />)}
                </span>
                <span className="font-bold text-primary">Typing...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {role === 'student' ? conversation.subject?.name || 'Peak educator' : `${contact?.class?.name || 'Assigned class'} student`}
              </>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
          <ShieldCheck size={14} /> Safeguarded
        </div>
        {role === 'teacher' && (
          <button
            onClick={() => setShowIntelligence((v) => !v)}
            aria-label={showIntelligence ? 'Hide Peak Intelligence' : 'Show Peak Intelligence'}
            className={`hidden xl:flex w-10 h-10 rounded-xl items-center justify-center transition-colors ${showIntelligence ? 'bg-primary/10 text-primary' : 'bg-[var(--input)] text-[var(--text-muted)]'}`}
          >
            <Bot size={17} />
          </button>
        )}
        <div className="relative">
          <button onClick={() => setShowConversationMenu((value) => !value)} aria-label="Conversation options" className="w-10 h-10 rounded-xl hover:bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)]"><MoreHorizontal size={19} /></button>
          {showConversationMenu && (
            <div className="absolute right-0 top-full mt-2 z-30 w-56 p-2 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-2xl">
              {role === 'teacher' && (
                <button
                  onClick={() => {
                    setShowSummary(true)
                    setShowConversationMenu(false)
                  }}
                  className="w-full p-3 rounded-xl hover:bg-[var(--input)] text-left"
                >
                  <p className="text-xs font-black text-[var(--text)]">AI learning summary</p>
                  <p className="mt-1 text-[9px] leading-relaxed text-[var(--text-muted)]">Capture context and next actions.</p>
                </button>
              )}
              <button
                onClick={async () => {
                  const result = await setPeakConversationPaused(conversation.id, !paused, currentUserId)
                  if (!result.ok) return toast.error(result.error)
                  setPaused(result.paused)
                  setShowConversationMenu(false)
                  toast.success(result.paused ? 'Conversation paused' : 'Conversation resumed')
                }}
                className="w-full p-3 rounded-xl hover:bg-[var(--input)] text-left"
              >
                <p className="text-xs font-black text-[var(--text)]">{paused ? 'Resume conversation' : 'Pause conversation'}</p>
                <p className="mt-1 text-[9px] leading-relaxed text-[var(--text-muted)]">{paused ? 'Allow new messages again.' : 'Stop new messages while preserving the safeguarding record.'}</p>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.06),transparent_35%)]">
          {showSafetyNotice && (
            <div className="mx-3 mt-2 md:mx-6 md:mt-3 min-h-9 px-3 py-2 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/15 flex items-center gap-2 shrink-0">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
              <p className="min-w-0 flex-1 text-[10px] md:text-xs text-[var(--text-muted)] truncate">
                <span className="font-black text-[var(--text)]">Safeguarded learning chat.</span> Keep personal details private.
              </p>
              <button onClick={() => setShowSafetyNotice(false)} aria-label="Dismiss safety notice" className="w-6 h-6 rounded-lg hover:bg-emerald-500/10 flex items-center justify-center text-[var(--text-muted)] shrink-0"><X size={13} /></button>
            </div>
          )}
          {pinnedMessages.length > 0 && (
            <div className="mx-3 mt-2 md:mx-6 px-3 py-2 rounded-xl bg-amber-500/[0.07] border border-amber-500/15 flex items-center gap-2 shrink-0">
              <Pin size={13} className="text-amber-600 shrink-0" />
              <p className="min-w-0 flex-1 truncate text-[10px] text-[var(--text-muted)]">
                <span className="font-black text-[var(--text)]">{pinnedMessages.length} pinned:</span> {pinnedMessages[pinnedMessages.length - 1].body}
              </p>
            </div>
          )}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-8 py-3 md:py-5 space-y-3">
            <div className="hidden">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><GraduationCap size={23} /></div>
              <p className="mt-3 text-sm font-black text-[var(--text)]">A focused space for learning</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">Keep personal details private and conversations respectful. Peak’s safety layer supports both of you.</p>
            </div>
            {loading ? <MessageLoading /> : messages.map((message: any, index: number) => {
              const own = message.sender_id === currentUserId
              const showDivider = index === 0 || dateKey(messages[index - 1]?.created_at) !== dateKey(message.created_at)
              const isReplyTarget = replyHighlightId === message.id
              // Resolve the replied-to message locally from the messages array (like WhatsApp)
              let resolvedReply = message.reply
              if (!resolvedReply && message.reply_to_id) {
                const original = messages.find((m: any) => m.id === message.reply_to_id)
                if (original) {
                  resolvedReply = { id: original.id, body: original.body, sender_id: original.sender_id }
                }
              }
              return (
                <div key={message.id} id={`msg-${message.id}`}>
                  {showDivider && <div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-[var(--card-border)]" /><span className="px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--card-border)] text-[9px] font-black text-[var(--text-muted)]">{formatDateDivider(message.created_at)}</span><span className="h-px flex-1 bg-[var(--card-border)]" /></div>}
                  <MessageBubble
                    message={{ ...message, reply: resolvedReply }}
                    own={own}
                    currentUserId={currentUserId}
                    otherParticipantName={contact?.full_name || (role === 'teacher' ? 'Student' : 'Teacher')}
                    isReplyTarget={isReplyTarget}
                    senderName={own ? 'You' : contact?.full_name || (role === 'teacher' ? 'Student' : 'Teacher')}
                    senderAvatar={own ? null : contact}
                    onReply={() => {
                      setReplyTo(message)
                      setReplyHighlightId(message.id)
                      setTimeout(() => {
                        document.getElementById(`msg-${message.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }, 100)
                    }}
                    onReplyPreviewClick={(replyId: string) => {
                      setReplyHighlightId(replyId)
                      setTimeout(() => {
                        document.getElementById(`msg-${replyId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }, 100)
                    }}
                    onEdit={() => setEditing(message)}
                    onDelete={async () => {
                      await deletePeakMessage(message.id)
                      onRefresh()
                    }}
                    onReact={async (emoji: string) => {
                      await togglePeakReaction(message.id, emoji)
                      onRefresh()
                    }}
                    onPin={async () => {
                      const result = await togglePeakMessagePin(message.id)
                      if (!result.ok) return toast.error(result.error)
                      toast.success(result.pinned ? 'Message pinned' : 'Message unpinned')
                      onRefresh()
                    }}
                  />
                </div>
              )
            })}
          </div>
          <MessageComposer
            role={role}
            currentUserId={currentUserId}
            expectedUserId={currentUserId}
            conversationId={conversation.id}
            contactName={contact?.full_name || 'User'}
            replyTo={replyTo}
            editing={editing}
            paused={paused}
            onClearReply={() => setReplyTo(null)}
            onClearEdit={() => setEditing(null)}
            onSent={(message: any) => {
              onMessageSaved(message)
              onRefresh()
              setReplyTo(null)
              setReplyHighlightId(null)
            }}
          />
        </div>
        {role === 'teacher' && showIntelligence && <TeacherIntelligencePanel safety={safety} messages={messages} conversationId={conversation.id} />}
      </div>
      <AnimatePresence>
        {showSummary && <ConversationSummaryDialog conversationId={conversation.id} onClose={() => setShowSummary(false)} />}
      </AnimatePresence>
    </>
  )
}

function MessageBubble({ message, own, currentUserId, otherParticipantName, isReplyTarget, senderName, senderAvatar, onReply, onEdit, onDelete, onReact, onPin, onReplyPreviewClick }: any) {
  const [menu, setMenu] = useState(false)
  const [reactions, setReactions] = useState(false)
  const deleted = Boolean(message.deleted_at)
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'} gap-2 group ${isReplyTarget ? 'bg-primary/5 -mx-2 px-2 rounded-2xl ring-1 ring-primary/20' : ''}`}>
      {!own && <Avatar url={senderAvatar?.avatar_url || senderAvatar?.profile?.avatar_url} metadata={senderAvatar?.profile?.avatar_metadata} name={senderName} size="sm" className="!w-7 !h-7 !rounded-xl mt-5 shrink-0" />}
      <div className={`max-w-[85%] md:max-w-[68%] ${own ? 'items-end' : 'items-start'} flex flex-col`}>
        <span className={`mb-1 px-1 text-[9px] font-black uppercase tracking-wider ${own ? 'text-primary' : 'text-[var(--text-muted)]'}`}>{senderName}</span>
        {message.reply?.body && (
          <div
            className="mb-1.5 px-3 py-2 rounded-xl bg-[var(--card)]/60 border-l-[3px] border-primary/60 min-w-0 max-w-full cursor-pointer hover:bg-[var(--card)] transition-colors"
            onClick={() => onReplyPreviewClick?.(message.reply.id)}
          >
            <p className="text-[8px] font-black uppercase tracking-wider text-primary/70 mb-0.5">
              {message.reply.sender_id === currentUserId ? 'You' : otherParticipantName || 'Reply'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
              {message.reply.body}
            </p>
          </div>
        )}
        <div className="relative flex items-end gap-2">
          {!own && (
            <button onClick={() => setMenu(!menu)} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)]"><MoreHorizontal size={14} /></button>
          )}
          <div className={`px-4 py-3 rounded-[20px] shadow-sm ${own ? 'bg-gradient-to-br from-primary to-primary/80 text-white rounded-br-md shadow-primary/10' : 'bg-[var(--card)] text-[var(--text)] border border-[var(--card-border)] rounded-bl-md'} ${deleted ? 'italic opacity-60' : ''}`}>
            {message.message_type === 'voice' ? (
              <VoiceNoteBubble message={message} own={own} />
            ) : message.message_type === 'learning_card' ? (
              <LearningCardBubble message={message} own={own} />
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
            )}
            <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[8px] ${own ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
              {message.pins?.length > 0 && <Pin size={10} />}
              {message.edited_at && <span>edited</span>}
              <span>{formatMessageTime(message.created_at)}</span>
              {own && <><CheckCheck size={11} /><span>{message.delivery_status === 'seen' ? 'Seen' : 'Delivered'}</span></>}
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
                <BubbleAction icon={<Pin size={13} />} onClick={() => { onPin(); setMenu(false) }} />
                {own && !deleted && <BubbleAction icon={<Edit3 size={13} />} onClick={() => { onEdit(); setMenu(false) }} />}
                {own && !deleted && <BubbleAction icon={<Trash2 size={13} />} danger onClick={() => { onDelete(); setMenu(false) }} />}
              </motion.div>
            )}
          </AnimatePresence>
          {reactions && (
            <div className="absolute bottom-full mb-12 left-0 z-30 flex gap-1 p-2 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-xl">
              {EMOJIS.slice(0, 8).map((emoji) => <button key={emoji} onClick={() => { onReact(emoji); setReactions(false); setMenu(false) }} className="w-8 h-8 rounded-lg hover:bg-[var(--input)]">{emoji}</button>)}
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

function VoiceNoteBubble({ message, own }: any) {
  return (
    <div className="min-w-[210px] max-w-[280px]">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${own ? 'bg-white/15' : 'bg-primary/10 text-primary'}`}><Volume2 size={15} /></div>
        <div>
          <p className="text-xs font-black">Voice note</p>
          <p className={`text-[9px] ${own ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>{Math.max(1, Number(message.metadata?.duration_seconds || 0))} sec</p>
        </div>
      </div>
      {message.voice_url ? (
        <audio controls preload="metadata" src={message.voice_url} className="h-9 w-full max-w-[260px]" />
      ) : (
        <p className="text-[10px] opacity-70">Audio link is refreshing...</p>
      )}
    </div>
  )
}

function LearningCardBubble({ message, own }: any) {
  const metadata = message.metadata || {}
  const labels: Record<string, string> = { task: 'Learning task', resource: 'Resource', quiz: 'Quiz', reminder: 'Reminder' }
  return (
    <div className="min-w-[220px] max-w-[320px]">
      <div className={`text-[9px] font-black uppercase tracking-widest ${own ? 'text-white/65' : 'text-primary'}`}>{labels[metadata.card_type] || 'Learning card'}</div>
      <p className="mt-1 text-sm font-black">{metadata.title || message.body}</p>
      {metadata.description && <p className={`mt-1.5 text-xs leading-relaxed ${own ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>{metadata.description}</p>}
      {metadata.due_at && <p className={`mt-2 text-[9px] font-bold ${own ? 'text-white/65' : 'text-amber-600'}`}>Due {new Date(metadata.due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
      {metadata.href && <a href={metadata.href} className={`mt-3 inline-flex px-3 py-2 rounded-xl text-[10px] font-black ${own ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary'}`}>Open learning item</a>}
    </div>
  )
}

const ACADEMIC_STICKERS = [
  { emoji: '📚', label: 'Books' }, { emoji: '📖', label: 'Reading' }, { emoji: '✏️', label: 'Writing' },
  { emoji: '📝', label: 'Notes' }, { emoji: '🎓', label: 'Graduate' }, { emoji: '🏆', label: 'Achievement' },
  { emoji: '⭐', label: 'Star' }, { emoji: '💡', label: 'Idea' }, { emoji: '🔬', label: 'Science' },
  { emoji: '🧪', label: 'Chemistry' }, { emoji: '📐', label: 'Math' }, { emoji: '🌍', label: 'Geography' },
  { emoji: '🧠', label: 'Brain' }, { emoji: '💪', label: 'Strength' }, { emoji: '🎯', label: 'Goal' },
  { emoji: '🔥', label: 'Fire' }, { emoji: '💯', label: 'Perfect' }, { emoji: '✅', label: 'Done' },
  { emoji: '❌', label: 'Wrong' }, { emoji: '🔄', label: 'Retry' }, { emoji: '📌', label: 'Pin' },
  { emoji: '📊', label: 'Progress' }, { emoji: '📈', label: 'Growth' }, { emoji: '🏅', label: 'Medal' },
  { emoji: '🎉', label: 'Celebrate' }, { emoji: '👏', label: 'Clap' }, { emoji: '🙌', label: 'Hooray' },
  { emoji: '💫', label: 'Magic' }, { emoji: '✨', label: 'Sparkle' }, { emoji: '🌟', label: 'Glow' },
]

function MessageComposer({ role, currentUserId, expectedUserId, conversationId, contactName = 'User', replyTo, editing, paused, onClearReply, onClearEdit, onSent }: any) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [emojiGroup, setEmojiGroup] = useState<keyof typeof EMOJI_GROUPS>('Recent')
  const [warning, setWarning] = useState<any>(null)
  const [pendingBody, setPendingBody] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [sendingVoice, setSendingVoice] = useState(false)
  const [showLearningCard, setShowLearningCard] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingChannel = useRef<any>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const voiceChunks = useRef<Blob[]>([])
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (editing) {
      setBody(editing.body)
      inputRef.current?.focus()
    }
  }, [editing])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase.channel(`peak-typing-${conversationId}`).subscribe()
    typingChannel.current = channel
    return () => {
      typingChannel.current = null
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const updateTyping = async (isTyping: boolean) => {
    typingChannel.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, isTyping },
    }).catch(() => null)
  }

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      if (recordingTimer.current) clearInterval(recordingTimer.current)
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      updateTyping(false).catch(() => null)
    }
  }, [conversationId])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferredType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType: preferredType })
      recorderRef.current = recorder
      voiceChunks.current = []
      setRecordingSeconds(0)
      recorder.ondataavailable = (event) => {
        if (event.data.size) voiceChunks.current.push(event.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        if (recordingTimer.current) clearInterval(recordingTimer.current)
        const blob = new Blob(voiceChunks.current, { type: recorder.mimeType.split(';')[0] })
        if (!blob.size) return
        setSendingVoice(true)
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          const result = await sendPeakVoiceNote({
            conversationId,
            base64,
            mimeType: blob.type || 'audio/webm',
            durationSeconds: recordingSeconds,
          })
          if (!result.ok) return toast.error(result.error)
          onSent(result.message)
        } finally {
          setSendingVoice(false)
          setRecordingSeconds(0)
        }
      }
      recorder.start(250)
      setRecording(true)
      recordingTimer.current = setInterval(() => setRecordingSeconds((value) => {
        if (value >= 119) recorder.stop()
        return value + 1
      }), 1000)
    } catch {
      toast.error('Microphone access is required for voice notes.')
    }
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    setRecording(false)
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
        : await sendPeakMessage({ conversationId, body: text, replyToId: replyTo?.id, confirmed, expectedUserId })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
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
      onSent((result as any).message)
    } catch (error: any) {
      toast.error(error.message || 'Message could not be sent')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative p-2.5 sm:p-3 md:p-5 border-t border-[var(--card-border)] bg-[var(--card)]">
      {paused && (
        <div className="mb-2 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-xs font-black text-amber-700 dark:text-amber-300">Conversation paused</p>
          <p className="mt-0.5 text-[9px] text-[var(--text-muted)]">Resume it from conversation options to send new messages.</p>
        </div>
      )}
      {role === 'student' && !body && !editing && (
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
          {STUDENT_PROMPTS.map((prompt) => <button key={prompt} onClick={() => setBody(prompt)} className="shrink-0 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary hover:bg-primary/10">{prompt}</button>)}
        </div>
      )}
      {(replyTo || editing) && (
        <div className="mb-2 px-3 py-3 rounded-2xl bg-[var(--input)] border-l-4 border-primary flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            {replyTo && (
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-black">
                {replyTo.sender_id === currentUserId ? 'You' : (contactName?.[0] || '?')}
              </div>
            )}
            {editing && (
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Edit3 size={14} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                {editing ? 'Editing' : `Replying to ${replyTo.sender_id === currentUserId ? 'yourself' : (contactName?.split(' ')[0] || 'message')}`}
              </p>
              <p className="text-xs mt-0.5 truncate text-[var(--text-muted)]">
                {(editing || replyTo).body}
              </p>
            </div>
          </div>
          <button
            onClick={editing ? onClearEdit : onClearReply}
            className="w-7 h-7 rounded-lg hover:bg-[var(--card-border)] flex items-center justify-center shrink-0 text-[var(--text-muted)]"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <form onSubmit={submit} className="flex items-end gap-2 md:gap-2.5">
        <div className="flex-1 min-w-0 rounded-[24px] bg-[var(--input)] border-2 border-[var(--card-border)] focus-within:border-primary/40 transition-colors flex items-end px-1.5 py-1 shadow-sm">
          <textarea
            ref={inputRef}
            value={body}
            onChange={(event) => handleBodyChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            disabled={paused}
            rows={1}
            placeholder={paused ? 'Conversation paused' : role === 'student' ? 'Ask your teacher...' : 'Write a thoughtful response...'}
            className="min-h-[44px] max-h-32 flex-1 resize-none bg-transparent outline-none py-3 px-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed"
          />
          <div className="flex items-center gap-0.5">
            <button type="button" disabled={paused} aria-label="Add sticker" onClick={() => { setShowStickers(!showStickers); setShowEmoji(false) }} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-primary hover:bg-primary/5 disabled:opacity-30 transition-all">
              <span className="text-lg leading-none">🎯</span>
            </button>
            <button type="button" disabled={paused} aria-label="Choose emoji" onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false) }} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-primary hover:bg-primary/5 disabled:opacity-30 transition-all">
              <Smile size={19} />
            </button>
            {role === 'teacher' && (
              <button type="button" disabled={paused} onClick={() => setShowLearningCard(true)} aria-label="Create learning card" className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-primary hover:bg-primary/5 disabled:opacity-30 transition-all">
                <ClipboardCheck size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={paused || sendingVoice}
            onClick={recording ? stopRecording : startRecording}
            aria-label={recording ? 'Stop voice note' : 'Record voice note'}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all disabled:opacity-40 ${recording ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110' : 'bg-[var(--input)] text-[var(--text-muted)] hover:text-primary hover:bg-primary/5'}`}
          >
            {recording ? <Square size={15} fill="currentColor" /> : <Mic size={18} />}
          </button>
          <button
            type="submit"
            aria-label={sending ? 'Sending message' : 'Send message'}
            disabled={paused || !body.trim() || sending}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-primary/30 disabled:opacity-40 disabled:shadow-none hover:scale-105 active:scale-95 transition-transform"
          >
            {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>
      </form>
      {(recording || sendingVoice) && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-black text-red-500">
            {sendingVoice ? 'Sending voice note...' : `Recording ${recordingSeconds}s / 120s`}
          </span>
        </motion.div>
      )}
      <p className="mt-2 text-center text-[8px] text-[var(--text-muted)]">Peak Safeguarding checks context and communication patterns before delivery.</p>

      <AnimatePresence>
        {showLearningCard && (
          <LearningCardDialog
            conversationId={conversationId}
            onClose={() => setShowLearningCard(false)}
            onSent={(message: any) => {
              setShowLearningCard(false)
              onSent(message)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmoji && (
          <>
            <motion.button
              type="button"
              aria-label="Close emoji picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmoji(false)}
              className="fixed inset-0 z-40 bg-black/20 md:absolute md:bg-transparent"
            />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="fixed z-50 left-3 right-3 bottom-[82px] p-3 rounded-[24px] bg-[var(--card)] border border-[var(--card-border)] shadow-2xl md:absolute md:left-auto md:right-14 md:bottom-[76px] md:w-[330px]"
            >
              <div className="mb-2 px-1 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Express yourself</p>
                  <p className="text-[9px] text-[var(--text-muted)]">Tap several emojis, then send.</p>
                </div>
                <button type="button" onClick={() => setShowEmoji(false)} aria-label="Close emoji picker" className="w-8 h-8 rounded-xl bg-[var(--input)] flex items-center justify-center"><X size={14} /></button>
              </div>
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {(Object.keys(EMOJI_GROUPS) as Array<keyof typeof EMOJI_GROUPS>).map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setEmojiGroup(group)}
                    className={`shrink-0 px-3 h-8 rounded-xl text-[9px] font-black transition-colors ${emojiGroup === group ? 'bg-primary text-white' : 'bg-[var(--input)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                  >
                    {group}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-1.5 max-h-[248px] overflow-y-auto pr-1">
                {EMOJI_GROUPS[emojiGroup].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`Add ${emoji}`}
                    onClick={() => {
                      handleBodyChange(body + emoji)
                      inputRef.current?.focus()
                    }}
                    className="aspect-square min-h-10 rounded-xl text-xl hover:bg-primary/10 active:scale-90 transition-all"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStickers && (
          <>
            <motion.button
              type="button"
              aria-label="Close sticker picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStickers(false)}
              className="fixed inset-0 z-40 bg-black/20 md:absolute md:bg-transparent"
            />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="fixed z-50 left-3 right-3 bottom-[82px] p-3 rounded-[24px] bg-[var(--card)] border border-[var(--card-border)] shadow-2xl md:absolute md:left-auto md:right-14 md:bottom-[76px] md:w-[330px]"
            >
              <div className="mb-2 px-1 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#a855f7]">Study stickers</p>
                  <p className="text-[9px] text-[var(--text-muted)]">Express your learning journey.</p>
                </div>
                <button type="button" onClick={() => setShowStickers(false)} aria-label="Close sticker picker" className="w-8 h-8 rounded-xl bg-[var(--input)] flex items-center justify-center"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-5 gap-2 max-h-[260px] overflow-y-auto pr-1">
                {ACADEMIC_STICKERS.map((sticker) => (
                  <button
                    key={sticker.emoji}
                    type="button"
                    aria-label={`Add ${sticker.label} sticker`}
                    onClick={() => {
                      handleBodyChange(body + sticker.emoji)
                      inputRef.current?.focus()
                    }}
                    className="aspect-square min-h-[52px] rounded-2xl text-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
                    title={sticker.label}
                  >
                    {sticker.emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {warning && (
          <SafetyDialog warning={warning} onClose={() => setWarning(null)} onRewrite={(text: string) => { setBody(text); setWarning(null) }} onConfirm={warning.blocked ? undefined : () => submit(undefined, true)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function LearningCardDialog({ conversationId, onClose, onSent }: any) {
  const [cardType, setCardType] = useState<'task' | 'resource' | 'quiz' | 'reminder'>('task')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [href, setHref] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const result = await sendPeakLearningCard({ conversationId, title, description, cardType, href, dueAt })
      if (!result.ok) return toast.error(result.error)
      onSent(result.message)
      toast.success('Learning card sent')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ y: 30, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] bg-[var(--card)] border border-[var(--card-border)] p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div><p className="text-[9px] font-black uppercase tracking-widest text-primary">Peak learning card</p><h3 className="mt-1 text-xl font-black text-[var(--text)]">Send the next step</h3></div>
          <button onClick={onClose} aria-label="Close learning card" className="w-9 h-9 rounded-xl bg-[var(--input)] flex items-center justify-center"><X size={15} /></button>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {(['task', 'resource', 'quiz', 'reminder'] as const).map((type) => <button key={type} onClick={() => setCardType(type)} className={`shrink-0 px-4 h-10 rounded-xl text-[10px] font-black capitalize ${cardType === type ? 'bg-primary text-white' : 'bg-[var(--input)] text-[var(--text-muted)]'}`}>{type}</button>)}
        </div>
        <div className="mt-4 space-y-3">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Card title" className="w-full h-12 px-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] outline-none text-sm text-[var(--text)]" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Instructions or context" rows={3} className="w-full p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] outline-none resize-none text-sm text-[var(--text)]" />
          <input value={href} onChange={(event) => setHref(event.target.value)} placeholder="Optional link" className="w-full h-12 px-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] outline-none text-sm text-[var(--text)]" />
          <label className="block"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Optional due date</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-1 w-full h-12 px-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] outline-none text-sm text-[var(--text)]" /></label>
        </div>
        <button onClick={save} disabled={!title.trim() || saving} className="mt-5 w-full h-12 rounded-2xl bg-primary text-white font-black text-xs disabled:opacity-40">{saving ? 'Sending...' : 'Send learning card'}</button>
      </motion.div>
    </motion.div>
  )
}

function ConversationSummaryDialog({ conversationId, onClose }: any) {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPeakConversationSummary(conversationId)
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [conversationId])

  const generate = async () => {
    setLoading(true)
    const result = await generatePeakConversationSummary(conversationId)
    if (result.ok) setSummary(result.summary)
    else toast.error(result.error)
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ y: 30, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="w-full sm:max-w-xl rounded-t-[28px] sm:rounded-[28px] bg-[var(--card)] border border-[var(--card-border)] p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div><p className="text-[9px] font-black uppercase tracking-widest text-primary">Peak Intelligence</p><h3 className="mt-1 text-xl font-black text-[var(--text)]">Conversation summary</h3></div>
          <button onClick={onClose} aria-label="Close summary" className="w-9 h-9 rounded-xl bg-[var(--input)] flex items-center justify-center"><X size={15} /></button>
        </div>
        {loading ? <div className="mt-6 h-36 rounded-2xl bg-[var(--input)] animate-pulse" /> : summary ? (
          <div className="mt-6">
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 text-sm leading-relaxed text-[var(--text)]">{summary.summary}</div>
            {summary.action_items?.length > 0 && <div className="mt-4 space-y-2">{summary.action_items.map((item: string, index: number) => <div key={`${item}-${index}`} className="p-3 rounded-xl bg-[var(--input)] flex items-start gap-3 text-xs text-[var(--text)]"><CheckCheck size={15} className="text-primary shrink-0" />{item}</div>)}</div>}
            <button onClick={generate} className="mt-5 w-full h-11 rounded-2xl bg-[var(--input)] text-[var(--text)] font-black text-xs">Refresh summary</button>
          </div>
        ) : (
          <div className="mt-6 text-center"><Bot size={32} className="mx-auto text-primary" /><p className="mt-3 text-sm text-[var(--text-muted)]">Generate a concise learning recap and clear action items.</p><button onClick={generate} className="mt-5 px-6 h-12 rounded-2xl bg-primary text-white font-black text-xs">Generate summary</button></div>
        )}
      </motion.div>
    </motion.div>
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
  return <div className="min-h-[calc(100dvh-73px)] p-2 md:p-6 pb-20 md:pb-6 bg-[var(--bg)]"><div className="mx-auto max-w-[1600px] h-[calc(100dvh-158px)] md:h-[calc(100dvh-120px)] min-h-[480px] rounded-[22px] md:rounded-[36px] bg-[var(--card)] border border-[var(--card-border)] animate-pulse" /></div>
}

function MessageLoading() {
  return <div className="space-y-4"><div className="w-2/3 h-16 rounded-2xl bg-[var(--input)] animate-pulse" /><div className="ml-auto w-1/2 h-20 rounded-2xl bg-primary/10 animate-pulse" /><div className="w-3/5 h-14 rounded-2xl bg-[var(--input)] animate-pulse" /></div>
}
