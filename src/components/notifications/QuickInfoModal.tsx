'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { useNotificationStore } from '@/stores/notificationStore'
import { Button } from '@/components/ui/Button'
import {
  Bell, AlertTriangle, ShieldAlert, ArrowRight,
  FileText, Target, Rocket, CalendarDays, CheckCircle2, Inbox, ChevronDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { SpotlightKind } from '@/lib/spotlight'
import { isSpotlight } from '@/lib/spotlight'

interface KindMeta {
  kicker: string
  cta: string
  Icon: typeof Bell
  gradient: string
  ring: string
}

const KIND_META: Record<SpotlightKind, KindMeta> = {
  assignment_published: { kicker: 'New assignment', cta: 'Open Assignment', Icon: FileText, gradient: 'linear-gradient(135deg, #4F8CFF, #6366F1)', ring: 'rgba(79,140,255,0.12)' },
  quiz_published: { kicker: 'New quiz', cta: 'Open Quizzes', Icon: Target, gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)', ring: 'rgba(168,85,247,0.12)' },
  mission_published: { kicker: "Today's mission", cta: 'Begin Mission', Icon: Rocket, gradient: 'linear-gradient(135deg, #10B981, #14B8A6)', ring: 'rgba(16,185,129,0.12)' },
  timetable_published: { kicker: 'Timetable update', cta: 'View Schedule', Icon: CalendarDays, gradient: 'linear-gradient(135deg, #F59E0B, #F97316)', ring: 'rgba(245,158,11,0.12)' },
  assignment_returned: { kicker: 'Marked work back', cta: 'View Results', Icon: CheckCircle2, gradient: 'linear-gradient(135deg, #10B981, #059669)', ring: 'rgba(16,185,129,0.12)' },
  submission_received: { kicker: 'New submission', cta: 'Mark Now', Icon: Inbox, gradient: 'linear-gradient(135deg, #0EA5E9, #2563EB)', ring: 'rgba(14,165,233,0.12)' },
  scripts_ready: { kicker: 'Scripts to mark', cta: 'Open Marking', Icon: Inbox, gradient: 'linear-gradient(135deg, #7C3AED, #4F8CFF)', ring: 'rgba(124,58,237,0.12)' },
}

// Row order + labels per kind. Producers send display-ready strings.
const KIND_ROWS: Record<SpotlightKind, Array<{ key: string; label: string }>> = {
  assignment_published: [
    { key: 'subject', label: 'Subject' },
    { key: 'due', label: 'Due' },
    { key: 'marks', label: 'Marks' },
    { key: 'format', label: 'Format' },
  ],
  quiz_published: [
    { key: 'subject', label: 'Subject' },
    { key: 'questions', label: 'Questions' },
    { key: 'due', label: 'Due' },
  ],
  mission_published: [
    { key: 'subject', label: 'Subject' },
    { key: 'objectives', label: 'Objectives' },
    { key: 'teacher', label: 'Teacher' },
  ],
  timetable_published: [
    { key: 'day', label: 'Day' },
    { key: 'time', label: 'Time' },
    { key: 'subject', label: 'Subject' },
    { key: 'teacher', label: 'Teacher' },
  ],
  assignment_returned: [
    { key: 'subject', label: 'Subject' },
    { key: 'xp', label: 'XP earned' },
  ],
  submission_received: [
    { key: 'student', label: 'Student' },
    { key: 'assignment', label: 'Assignment' },
    { key: 'submitted', label: 'Submitted' },
  ],
  scripts_ready: [
    { key: 'exam', label: 'Exam' },
    { key: 'subject', label: 'Subject' },
    { key: 'scripts', label: 'Scripts' },
  ],
}

function ScoreRing({ score, total, pct }: { score: number; total: number; pct: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="relative w-[72px] h-[72px] shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--card-border)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={circ - (Math.min(pct, 100) / 100) * circ}
          strokeLinecap="round" transform="rotate(-90 36 36)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-black" style={{ color: 'var(--text)' }}>{score}</span>
        <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>/{total}</span>
      </div>
    </div>
  )
}

export function QuickInfoModal() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { activePriorityNotification, setActivePriorityNotification, markRead } = useNotificationStore()
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (!activePriorityNotification) return null

  const n = activePriorityNotification
  const spot = isSpotlight((n as any).data) ? (n as any).data : null
  const meta = spot ? KIND_META[spot.kind as SpotlightKind] : null
  const snap: Record<string, any> = spot?.snapshot || {}
  const rows = spot ? (KIND_ROWS[spot.kind as SpotlightKind] || []).filter((r) => snap[r.key] != null && snap[r.key] !== '') : []

  const roleBase =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher') ? '/teacher' : '/student'
  const href = (spot?.href as string) || `${roleBase}/notifications`

  const getIcon = () => {
    switch (n.type) {
      case 'alert': return <ShieldAlert size={32} className="text-rose-500" />
      case 'warning': return <AlertTriangle size={32} className="text-amber-500" />
      default: return <Bell size={32} className="text-primary" />
    }
  }

  const handleClose = async () => {
    // Mark as read immediately in DB and store so it doesn't pop up again on refresh
    await supabase.from('notifications').update({ read: true }).eq('id', n.id)
    markRead(n.id)
    setActivePriorityNotification(null)
    setDetailsOpen(false)
  }

  const handleCta = async () => {
    await supabase.from('notifications').update({ read: true }).eq('id', n.id)
    markRead(n.id)
    setActivePriorityNotification(null)
    setDetailsOpen(false)
    router.push(href)
  }

  const returnedScore =
    spot?.kind === 'assignment_returned' && snap.score != null && snap.total
      ? { score: Number(snap.score), total: Number(snap.total), pct: Number(snap.pct ?? 0) }
      : null

  return (
    <Modal
      isOpen={!!activePriorityNotification}
      onClose={handleClose}
      title={meta ? meta.kicker : 'Intel Broadcast'}
      size="md"
    >
      <div className="space-y-5 py-2">
        {meta ? (
          <>
            {/* Snapshot hero */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-xl"
                style={{ background: meta.gradient }}
              >
                <meta.Icon size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{meta.kicker}</p>
                <h3 className="text-xl font-black leading-tight mt-0.5" style={{ color: 'var(--text)' }}>
                  {snap.title || n.title}
                </h3>
              </div>
              {returnedScore && (
                <ScoreRing score={returnedScore.score} total={returnedScore.total} pct={returnedScore.pct} />
              )}
            </div>

            {/* Snapshot rows */}
            {rows.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
                {rows.map((r, i) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                    style={{
                      background: i % 2 === 0 ? 'var(--card)' : 'var(--input)',
                      borderTop: i === 0 ? 'none' : '1px solid var(--card-border)',
                    }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {r.label}
                    </span>
                    <span className="text-xs font-bold text-right" style={{ color: 'var(--text)' }}>
                      {String(snap[r.key])}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Feedback / note — collapsed to keep the card compact */}
            {(snap.feedback || n.body) && spot?.kind === 'assignment_returned' ? (
              <div className="rounded-2xl border" style={{ borderColor: 'var(--card-border)', background: 'var(--input)' }}>
                <button
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Teacher feedback
                  </span>
                  <ChevronDown size={14} style={{ transform: detailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
                </button>
                {detailsOpen && (
                  <p className="px-4 pb-3 text-sm italic leading-relaxed" style={{ color: 'var(--text)' }}>
                    &ldquo;{snap.feedback || n.body}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--card-border)', background: 'var(--input)' }}>
                <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
                  {n.body}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start gap-5">
               <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shrink-0 shadow-xl ${
                 n.type === 'alert' ? 'bg-rose-500/10' :
                 n.type === 'warning' ? 'bg-amber-500/10' :
                 'bg-primary/10'
               }`}>
                 {getIcon()}
               </div>
               <div className="space-y-2 flex-1">
                 <h3 className="text-xl font-black leading-tight" style={{ color: 'var(--text)' }}>{n.title}</h3>
                 <div className="flex items-center gap-2">
                   <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--input)] text-[var(--text-muted)] border border-[var(--card-border)]">
                     {n.type} broadcast
                   </span>
                 </div>
               </div>
            </div>

            <div className="p-5 rounded-3xl border border-[var(--card-border)] bg-[var(--input)] shadow-inner">
               <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                 {n.body}
               </p>
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
           <Button
             variant="secondary"
             className="flex-1 rounded-2xl h-14 font-black uppercase text-xs tracking-widest"
             onClick={handleClose}
           >
             Dismiss
           </Button>
           <Button
             className="flex-1 rounded-2xl h-14 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
             onClick={handleCta}
           >
             {meta ? meta.cta : 'Read Full Log'} <ArrowRight size={14} className="ml-2" />
           </Button>
        </div>
      </div>
    </Modal>
  )
}
