'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, FileSearch, Headphones, Loader2, MessageCircle, Sparkles, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'

type SupportSignal = {
  id: string
  kind: string
  message: string
  reply: string | null
  intent: string | null
  urgency: string
  needsHuman: boolean
  createdAt: string
  sourcePath: string | null
  attachmentName: string | null
}

export default function AdminSupportIntelligencePage() {
  const supabase = getSupabaseBrowserClient()
  const [signals, setSignals] = useState<SupportSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'human' | 'results' | 'chat'>('all')

  const loadSignals = async () => {
    setLoading(true)
    const [interactionsRes, handoffsRes] = await Promise.all([
      supabase
        .from('public_support_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('public_support_handoffs')
        .select('id, name, phone, message, source_path, created_at, status')
        .order('created_at', { ascending: false })
        .limit(40),
    ])

    if (interactionsRes.error || handoffsRes.error) {
      toast.error('Could not load support intelligence')
      setLoading(false)
      return
    }

    const combined: SupportSignal[] = [
      ...(interactionsRes.data || []).map((item: any) => ({
        id: item.id,
        kind: item.kind,
        message: item.visitor_message,
        reply: item.assistant_reply,
        intent: item.intent,
        urgency: item.urgency,
        needsHuman: item.needs_human,
        createdAt: item.created_at,
        sourcePath: item.source_path,
        attachmentName: item.attachment_name,
      })),
      ...(handoffsRes.data || []).map((item: any) => ({
        id: item.id,
        kind: 'handoff',
        message: item.message,
        reply: `${item.name || 'Visitor'} ${item.phone ? `- ${item.phone}` : ''}`,
        intent: 'human-handoff',
        urgency: 'high',
        needsHuman: true,
        createdAt: item.created_at,
        sourcePath: item.source_path,
        attachmentName: null,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setSignals(combined)
    setLoading(false)
  }

  useEffect(() => {
    void loadSignals()
    const timer = window.setInterval(loadSignals, 15000)
    return () => window.clearInterval(timer)
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'human') return signals.filter((item) => item.needsHuman)
    if (filter === 'results') return signals.filter((item) => item.kind === 'result_slip')
    if (filter === 'chat') return signals.filter((item) => item.kind === 'chat')
    return signals
  }, [signals, filter])

  const counts = {
    all: signals.length,
    human: signals.filter((item) => item.needsHuman).length,
    results: signals.filter((item) => item.kind === 'result_slip').length,
    chat: signals.filter((item) => item.kind === 'chat').length,
  }

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-6">
      <div className="overflow-hidden rounded-[1.6rem] bg-[#071a2d] p-6 text-white shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#7ed957]">
              <Bot size={14} /> APEX intelligence
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Public support intelligence</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Website questions, result-slip analyses, handoff intent and admission signals from parents and learners.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-2xl font-black">{counts.all}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/45">Signals</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-2xl font-black">{counts.human}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/45">Need human</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-2xl font-black">{counts.results}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/45">Results</div>
            </div>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'All', counts.all],
              ['human', 'Needs human', counts.human],
              ['results', 'Result slips', counts.results],
              ['chat', 'Chats', counts.chat],
            ].map(([value, label, count]) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => setFilter(value as any)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${filter === value ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/15'}`}
              >
                {label} {Number(count) > 0 ? `(${count})` : ''}
              </button>
            ))}
          </div>
          <Badge variant="info">auto-refresh</Badge>
        </div>
      </Card>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 p-10 text-muted">
          <Loader2 className="animate-spin" size={18} /> Loading support intelligence...
        </Card>
      ) : filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((signal) => {
            const Icon = signal.kind === 'result_slip' ? FileSearch : signal.kind === 'handoff' ? Headphones : MessageCircle
            return (
              <Card key={`${signal.kind}-${signal.id}`} className="overflow-hidden p-0">
                <div className="flex gap-4 p-5">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${signal.needsHuman ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                    <Icon size={21} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{signal.intent || signal.kind}</span>
                      {signal.urgency === 'high' && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-500">urgent</span>}
                      {signal.needsHuman && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-500">follow up</span>}
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm font-bold leading-6" style={{ color: 'var(--text)' }}>{signal.message}</p>
                    {signal.reply && <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{signal.reply}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                      <span>{formatDate(signal.createdAt)}</span>
                      {signal.sourcePath && <span>{signal.sourcePath}</span>}
                      {signal.attachmentName && <span>{signal.attachmentName}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-10 text-center">
          <Sparkles className="mx-auto mb-3 text-primary" size={32} />
          <p className="font-black" style={{ color: 'var(--text)' }}>No support intelligence yet.</p>
          <p className="mt-1 text-sm text-muted">APEX visitor activity will appear here automatically.</p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <TrendingUp size={19} />
          </span>
          <div>
            <h2 className="font-black" style={{ color: 'var(--text)' }}>How to use this page</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Treat repeated questions as marketing and operations signals. If parents keep asking about Grade 9 pricing, event slots or location, make those details more visible on the landing and registration pages.
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
