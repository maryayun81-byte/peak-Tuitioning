'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, CheckCircle2, Clock3, Headphones, Loader2, MessageCircle, Send, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'

type Handoff = {
  id: string
  conversation_id: string | null
  name: string | null
  phone: string | null
  email: string | null
  message: string
  status: string
  source_path: string | null
  created_at: string
}

type ThreadMessage = {
  id: string
  conversation_id: string
  author_role: 'visitor' | 'apex' | 'admin' | 'system'
  author_name: string | null
  body: string
  created_at: string
}

function prettyDate(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminApexMessagesPage() {
  const supabase = getSupabaseBrowserClient()
  const [handoffs, setHandoffs] = useState<Handoff[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({})

  const selected = useMemo(() => handoffs.find((item) => item.id === selectedId) || handoffs[0], [handoffs, selectedId])

  const loadHandoffs = async () => {
    const [handoffRes, unreadRes] = await Promise.all([
      supabase
        .from('public_support_handoffs')
        .select('id, conversation_id, name, phone, email, message, status, source_path, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('public_support_thread_messages')
        .select('conversation_id')
        .eq('author_role', 'visitor')
        .eq('is_read_by_admin', false),
    ])

    if (handoffRes.error) {
      toast.error('Could not load APEX handoffs')
      setLoading(false)
      return
    }

    const unreadMap: Record<string, number> = {}
    ;(unreadRes.data || []).forEach((item: any) => {
      const conversationId = String(item.conversation_id || '')
      if (!conversationId) return
      unreadMap[conversationId] = (unreadMap[conversationId] || 0) + 1
    })

    setUnreadByConversation(unreadMap)
    setHandoffs((handoffRes.data || []) as Handoff[])
    if (!selectedId && handoffRes.data?.[0]?.id) setSelectedId(handoffRes.data[0].id)
    setLoading(false)
  }

  const loadMessages = async (conversationId?: string | null) => {
    if (!conversationId) {
      setMessages([])
      return
    }
    const { data, error } = await supabase
      .from('public_support_thread_messages')
      .select('id, conversation_id, author_role, author_name, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Could not load thread messages')
      return
    }
    setMessages((data || []) as ThreadMessage[])
    await supabase
      .from('public_support_thread_messages')
      .update({ is_read_by_admin: true })
      .eq('conversation_id', conversationId)
      .eq('author_role', 'visitor')
    setUnreadByConversation((previous) => ({ ...previous, [conversationId]: 0 }))
  }

  useEffect(() => {
    void loadHandoffs()
    const timer = window.setInterval(loadHandoffs, 12000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    void loadMessages(selected?.conversation_id)
    if (!selected?.conversation_id) return
    const timer = window.setInterval(() => loadMessages(selected.conversation_id), 6000)
    return () => window.clearInterval(timer)
  }, [selected?.conversation_id])

  const sendReply = async () => {
    const body = reply.trim()
    if (!body || !selected?.conversation_id) return
    setSending(true)
    try {
      const { error } = await supabase.from('public_support_thread_messages').insert({
        conversation_id: selected.conversation_id,
        handoff_id: selected.id,
        author_role: 'admin',
        author_name: 'Peak Admin',
        body,
        is_read_by_admin: true,
      })
      if (error) throw error
      setReply('')
      await supabase.from('public_support_handoffs').update({ status: 'contacted' }).eq('id', selected.id)
      await loadMessages(selected.conversation_id)
      toast.success('Reply sent to APEX chat')
    } catch (error: any) {
      toast.error(error?.message || 'Could not send reply')
    } finally {
      setSending(false)
    }
  }
  const totalUnread = Object.values(unreadByConversation).reduce((sum, count) => sum + count, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            <Bot size={14} /> APEX command desk
          </div>
          <h1 className="mt-3 text-2xl font-black" style={{ color: 'var(--text)' }}>APEX Messages</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Take over public APEX chats after a human handoff request.
          </p>
        </div>
        <Card className="px-4 py-3">
          <div className="text-2xl font-black text-primary">{handoffs.filter((item) => item.status === 'new').length}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted">new handoffs</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-2xl font-black text-amber-500">{totalUnread}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted">unread messages</div>
        </Card>
      </div>

      <div className="grid min-h-[640px] gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--card-border)] p-4">
            <h2 className="font-black" style={{ color: 'var(--text)' }}>Visitor handoffs</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Newest requests first</p>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-muted"><Loader2 className="animate-spin" size={16} /> Loading...</div>
            ) : handoffs.length ? handoffs.map((handoff) => (
              <button
                key={handoff.id}
                type="button"
                onClick={() => setSelectedId(handoff.id)}
                className={`block w-full border-b border-[var(--card-border)] p-4 text-left transition hover:bg-primary/5 ${selected?.id === handoff.id ? 'bg-primary/10' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-black" style={{ color: 'var(--text)' }}>{handoff.name || 'Website visitor'}</div>
                      {!!(handoff.conversation_id && unreadByConversation[handoff.conversation_id] > 0) && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                          {unreadByConversation[handoff.conversation_id]}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs" style={{ color: 'var(--text-muted)' }}>{handoff.phone || handoff.email || 'No contact yet'}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${handoff.status === 'new' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
                    {handoff.status}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{handoff.message}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold opacity-50">
                  <Clock3 size={11} /> {prettyDate(handoff.created_at)}
                </div>
              </button>
            )) : (
              <div className="p-8 text-center text-sm text-muted">No APEX handoffs yet.</div>
            )}
          </div>
        </Card>

        <Card className="flex min-h-[640px] flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="border-b border-[var(--card-border)] bg-primary/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-black" style={{ color: 'var(--text)' }}>
                      <Headphones size={18} className="text-primary" />
                      {selected.name || 'Website visitor'}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {selected.phone || selected.email || 'No contact provided'} · {selected.source_path || 'public site'}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-primary shadow-sm">
                    <CheckCircle2 size={14} /> Live APEX thread
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--bg)] p-4">
                {messages.length ? messages.map((message) => {
                  const isAdmin = message.author_role === 'admin'
                  return (
                    <div key={message.id} className={`flex gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      {!isAdmin && (
                        <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          {message.author_role === 'visitor' ? <UserRound size={15} /> : <Bot size={15} />}
                        </span>
                      )}
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${isAdmin ? 'bg-primary text-white' : 'bg-[var(--card)] text-[var(--text)]'}`}>
                        <div className="mb-1 text-[10px] font-black uppercase tracking-widest opacity-60">{message.author_name || message.author_role}</div>
                        <div>{message.body}</div>
                        <div className="mt-2 text-[9px] font-bold opacity-45">{prettyDate(message.created_at)}</div>
                      </div>
                      {isAdmin && (
                        <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-white">
                          <MessageCircle size={15} />
                        </span>
                      )}
                    </div>
                  )
                }) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-muted">
                    <MessageCircle size={34} className="mb-3 opacity-40" />
                    <p className="text-sm font-bold">No thread messages yet.</p>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--card-border)] bg-[var(--card)] p-4">
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={2}
                    placeholder="Reply as Peak Admin. The visitor will see this inside APEX chat..."
                    className="min-w-0 flex-1 resize-none rounded-2xl border border-[var(--card-border)] bg-[var(--input)] px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="grid w-12 place-items-center rounded-2xl bg-primary text-white transition hover:scale-105 disabled:opacity-50"
                    aria-label="Send APEX reply"
                  >
                    {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-muted">
              <Headphones size={38} className="mb-3 opacity-35" />
              <p className="font-bold">Select an APEX handoff to begin.</p>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  )
}
