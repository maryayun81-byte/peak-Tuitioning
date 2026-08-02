'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Check, CheckCheck, X,
  Sparkles, Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { isStudentFullyOnboarded } from '@/lib/onboarding'
import { getPendingSubjectUpdates, registerStudentSubjects } from '@/app/actions/student'
import type { PendingSubjectSource } from '@/lib/pendingSubjects'
import { getSubjectVisual } from '@/lib/subjectVisuals'
import toast from 'react-hot-toast'

// ── Persistence keys ────────────────────────────────────────────────────────
// Dismissed = permanent (localStorage, per student). The student explicitly
// chose to dismiss these subjects, so they are never re-offered.
const dismissKey = (studentId: string) => `peak_pending_subjects_dismissed_${studentId}`
// Snoozed = this browser session only. "Not Now" keeps subjects pending but
// stops nagging until the session ends or new subjects are added.
const snoozeKey = (studentId: string) => `peak_pending_subjects_snoozed_${studentId}`

const SUBJECTS_UPDATED_EVENT = 'peak:subjects-updated'
// The admin subjects page writes this localStorage key after creating,
// updating or deleting a subject so open student/teacher tabs re-check
// immediately instead of waiting for the next poll.
export const SUBJECTS_CHANGED_KEY = 'peak:subjects-changed'

function readStoredIds(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key) ?? '[]'
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeStoredIds(key: string, ids: Iterable<string>) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(key, JSON.stringify(Array.from(ids)))
}

function writeDismissedIds(key: string, ids: Iterable<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(Array.from(ids)))
}

// ── Component ────────────────────────────────────────────────────────────────
export function NewSubjectsManager() {
  const router = useRouter()
  const { student, profile, isInitialRevalidationComplete } = useAuthStore()

  const studentId = student?.id
  const expectedUserId = profile?.id || (student as any)?.user_id
  const isOnboarded = isStudentFullyOnboarded(student, profile)

  const [subjects, setSubjects] = useState<PendingSubjectSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [view, setView] = useState<'select' | 'success'>('select')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMeta, setSuccessMeta] = useState<{ count: number; names: string[] }>({ count: 0, names: [] })
  const [pillVisible, setPillVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  const snoozedRef = useRef<Set<string>>(new Set())
  const dismissedRef = useRef<Set<string>>(new Set())
  const isModalOpenRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const viewRef = useRef<'select' | 'success'>('select')
  const selectedRef = useRef<Set<string>>(new Set())
  const loadRef = useRef<(args?: { manual?: boolean }) => Promise<PendingSubjectSource[]>>(() => Promise.resolve([]))
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    setMounted(true)
    snoozedRef.current = readStoredIds(snoozeKey(studentId ?? ''))
    dismissedRef.current = readStoredIds(dismissKey(studentId ?? ''))
  }, [studentId])

  useEffect(() => { isModalOpenRef.current = isModalOpen }, [isModalOpen])
  useEffect(() => { isSubmittingRef.current = isSubmitting }, [isSubmitting])
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => { selectedRef.current = selected }, [selected])

  const pruneStorage = useCallback((eligibleIds: Set<string>) => {
    if (!studentId) return
    const nextSnooze = new Set(Array.from(snoozedRef.current).filter((id) => eligibleIds.has(id)))
    snoozedRef.current = nextSnooze
    writeStoredIds(snoozeKey(studentId), nextSnooze)
    const nextDismissed = new Set(Array.from(dismissedRef.current).filter((id) => eligibleIds.has(id)))
    dismissedRef.current = nextDismissed
    writeDismissedIds(dismissKey(studentId), nextDismissed)
  }, [studentId])

  const load = useCallback(async (args?: { manual?: boolean }): Promise<PendingSubjectSource[]> => {
    if (!studentId || !expectedUserId) return []
    let eligible: PendingSubjectSource[] = []
    try {
      const res = await getPendingSubjectUpdates(studentId, expectedUserId)
      eligible = res.subjects || []
    } catch (e: any) {
      console.warn('[NewSubjects] Could not load pending subjects:', e?.message || e)
      return []
    }

    const visible = eligible.filter((s) => !dismissedRef.current.has(s.id))
    const eligibleIds = new Set(visible.map((s) => s.id))
    setSubjects(visible)
    pruneStorage(eligibleIds)

    if (visible.length === 0) {
      setIsModalOpen(false)
      setPillVisible(false)
      return visible
    }

    // Never hijack a running registration or success confirmation.
    if (!isModalOpenRef.current && !isSubmittingRef.current && viewRef.current === 'select') {
      const fresh = visible.filter((s) => !snoozedRef.current.has(s.id))
      if (fresh.length > 0) {
        setPillVisible(false)
        setView('select')
        setSelected(new Set())
        setIsModalOpen(true)
      } else if (args?.manual) {
        setPillVisible(true)
      }
    }
    return visible
  }, [studentId, expectedUserId, pruneStorage])

  useEffect(() => { loadRef.current = load }, [load])

  // Initial load + periodic re-check (catches subjects added while logged in).
  useEffect(() => {
    if (!isInitialRevalidationComplete || !studentId || !isOnboarded) return
    setIsLoading(true)
    load().finally(() => setIsLoading(false))

    const onFocus = () => { loadRef.current() }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadRef.current()
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === SUBJECTS_CHANGED_KEY) loadRef.current()
    }
    const interval = window.setInterval(() => { loadRef.current() }, 60000)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('storage', onStorage)
      window.clearInterval(interval)
    }
  }, [isInitialRevalidationComplete, studentId, isOnboarded, load])

  const announceSubjectsUpdated = useCallback(() => {
    try {
      window.dispatchEvent(new Event(SUBJECTS_UPDATED_EVENT))
    } catch { /* ignore */ }
  }, [])

  const register = async (ids: string[]) => {
    if (!studentId || !expectedUserId || ids.length === 0) return
    setIsSubmitting(true)
    try {
      const res = await registerStudentSubjects(studentId, ids, expectedUserId)
      if (!res.success) throw new Error(res.error || 'Registration failed')

      const names = ids
        .map((id) => subjects.find((s) => s.id === id)?.name)
        .filter(Boolean) as string[]

      setSelected(new Set())
      setSuccessMeta({ count: res.registeredCount, names })
      setView('success')
      announceSubjectsUpdated()
      router.refresh()
    } catch (e: any) {
      console.error('[NewSubjects] Registration error:', e)
      toast.error(e?.message || 'Could not add subjects. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterSelected = () => {
    if (selectedRef.current.size === 0) return
    register(Array.from(selectedRef.current))
  }

  const handleAddAll = () => {
    if (subjects.length === 0) return
    setSelected(new Set(subjects.map((s) => s.id)))
    register(subjects.map((s) => s.id))
  }

  // "Not Now" — snooze for this session only. Subjects stay pending.
  const handleNotNow = () => {
    const ids = subjects.map((s) => s.id)
    const next = new Set([...snoozedRef.current, ...ids])
    snoozedRef.current = next
    if (studentId) writeStoredIds(snoozeKey(studentId), next)
    setIsModalOpen(false)
    setPillVisible(true)
  }

  // Snoozing from the dashboard pill also hides the pill itself; it returns
  // (or new subjects appear) on a later visit.
  const handleSnoozeFromPill = () => {
    const ids = subjects.map((s) => s.id)
    const next = new Set([...snoozedRef.current, ...ids])
    snoozedRef.current = next
    if (studentId) writeStoredIds(snoozeKey(studentId), next)
    setPillVisible(false)
  }

  // Explicit permanent dismissal (localStorage, per student).
  const handleDismiss = () => {
    if (!studentId) return
    const ids = subjects.map((s) => s.id)
    const next = new Set([...dismissedRef.current, ...ids])
    dismissedRef.current = next
    writeDismissedIds(dismissKey(studentId), next)
    snoozedRef.current = new Set()
    writeStoredIds(snoozeKey(studentId), [])
    setIsModalOpen(false)
    setPillVisible(false)
    setSubjects([])
  }

  // After the success confirmation, re-check what remains.
  const handleContinueAfterSuccess = async () => {
    setView('select')
    const remaining = await load({ manual: true })
    if (remaining.length === 0) {
      setIsModalOpen(false)
      setPillVisible(false)
      return
    }
    const fresh = remaining.filter((s) => !snoozedRef.current.has(s.id))
    if (fresh.length === 0) {
      setIsModalOpen(false)
      setPillVisible(true)
    }
    // else: keep the modal open in select view so remaining subjects can be
    // registered right away.
  }

  const openModalFromPill = () => {
    setView('select')
    setSelected(new Set())
    setPillVisible(false)
    setIsModalOpen(true)
  }

  const toggleSubject = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const showPill = mounted && pillVisible && subjects.length > 0 && !isModalOpen

  if (!isOnboarded) return null

  return (
    <>
      {mounted && isModalOpen && (
        <NewSubjectsDialog
          subjects={subjects}
          selected={selected}
          isSubmitting={isSubmitting}
          view={view}
          successMeta={successMeta}
          isLoading={isLoading}
          onToggle={toggleSubject}
          onRegisterSelected={handleRegisterSelected}
          onAddAll={handleAddAll}
          onNotNow={handleNotNow}
          onDismiss={handleDismiss}
          onContinue={handleContinueAfterSuccess}
          onClose={handleNotNow}
        />
      )}

      {mounted && showPill && (
        <PendingSubjectsPill count={subjects.length} onReview={openModalFromPill} onSnooze={handleSnoozeFromPill} />
      )}
    </>
  )
}

// ── Dialog ───────────────────────────────────────────────────────────────────
interface NewSubjectsDialogProps {
  subjects: PendingSubjectSource[]
  selected: Set<string>
  isSubmitting: boolean
  view: 'select' | 'success'
  successMeta: { count: number; names: string[] }
  isLoading: boolean
  onToggle: (id: string) => void
  onRegisterSelected: () => void
  onAddAll: () => void
  onNotNow: () => void
  onDismiss: () => void
  onContinue: () => void
  onClose: () => void
}

function NewSubjectsDialog(props: NewSubjectsDialogProps) {
  const {
    subjects, selected, isSubmitting, view, successMeta, isLoading,
    onToggle, onRegisterSelected, onAddAll, onNotNow, onDismiss, onContinue, onClose,
  } = props

  const dialogRef = useRef<HTMLDivElement>(null)

  // Lock body scroll + focus the dialog + Escape = "Not Now".
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Simple focus trap.
  const handleTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        />

        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="peak-new-subjects-title"
          tabIndex={-1}
          onKeyDown={handleTab}
          initial={{ scale: 0.92, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="relative w-full max-w-lg outline-none max-h-[92vh] flex flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl shadow-black/40"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        >
          {view === 'select' ? (
            <SelectView
              subjects={subjects}
              selected={selected}
              isSubmitting={isSubmitting}
              isLoading={isLoading}
              onToggle={onToggle}
              onRegisterSelected={onRegisterSelected}
              onAddAll={onAddAll}
              onNotNow={onNotNow}
              onDismiss={onDismiss}
            />
          ) : (
            <SuccessView successMeta={successMeta} onContinue={onContinue} isSubmitting={isSubmitting} />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// ── Select view ──────────────────────────────────────────────────────────────
function SelectView({
  subjects, selected, isSubmitting, isLoading, onToggle, onRegisterSelected, onAddAll, onNotNow, onDismiss,
}: {
  subjects: PendingSubjectSource[]
  selected: Set<string>
  isSubmitting: boolean
  isLoading: boolean
  onToggle: (id: string) => void
  onRegisterSelected: () => void
  onAddAll: () => void
  onNotNow: () => void
  onDismiss: () => void
}) {
  const selectedCount = selected.size

  return (
    <>
      {/* Gradient header band */}
      <div className="relative shrink-0 overflow-hidden px-6 pt-6 pb-5">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-20" style={{ background: 'var(--primary)' }} />
        <div className="pointer-events-none absolute -left-10 -bottom-16 h-36 w-36 rounded-full opacity-10" style={{ background: 'var(--accent)' }} />
        <div className="relative flex items-start gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.08 }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
          >
            <GraduationCap size={26} />
          </motion.div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--primary)' }}>Curriculum update</p>
            <h2 id="peak-new-subjects-title" className="mt-0.5 text-xl font-black leading-tight" style={{ color: 'var(--text)' }}>
              New Subjects Added to Your Curriculum 🎓
            </h2>
          </div>
        </div>
        <p className="relative mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Your curriculum has been updated with new subjects. You can add the subjects you would like to study to your learning profile.
        </p>
      </div>

      {/* Subject list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {isLoading && subjects.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 rounded-2xl border border-[var(--card-border)] p-4">
                <div className="h-11 w-11 rounded-xl" style={{ background: 'var(--input)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/5 rounded-full" style={{ background: 'var(--input)' }} />
                  <div className="h-2.5 w-1/4 rounded-full" style={{ background: 'var(--input)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {subjects.map((subject, index) => {
                const isSelected = selected.has(subject.id)
                const visual = getSubjectVisual(subject.name, subject.category, index)
                const Icon = visual.Icon
                return (
                  <motion.li
                    key={subject.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 220, damping: 24 }}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={() => onToggle(subject.id)}
                      className={`group w-full flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all duration-200 active:scale-[0.99] ${
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-lg shadow-[var(--primary)]/10'
                          : 'border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--primary)]/40 hover:bg-[var(--input)]'
                      }`}
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${visual.gradient} text-white shadow-md transition-transform duration-200 group-hover:scale-105`}>
                        <Icon size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold" style={{ color: 'var(--text)' }}>{subject.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {subject.code && <span className="rounded-md px-1.5 py-0.5 font-mono text-[10px]" style={{ background: 'var(--input)', color: 'var(--text)' }}>{subject.code}</span>}
                          {subject.category && <span className="truncate capitalize">{subject.category}</span>}
                        </p>
                      </div>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                          isSelected ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--card-border)] bg-[var(--card)] text-transparent group-hover:border-[var(--primary)]/50'
                        }`}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 border-t px-5 py-4" style={{ borderColor: 'var(--card-border)', background: 'rgba(var(--card-rgb), 0.6)' }}>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isSubmitting || selectedCount === 0}
            onClick={onRegisterSelected}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
            {isSubmitting ? 'Adding subjects…' : selectedCount > 0 ? `Register Selected Subject${selectedCount > 1 ? 's' : ''} (${selectedCount})` : 'Register Selected Subjects'}
          </button>

          {subjects.length > 1 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onAddAll}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
            >
              <Sparkles size={15} /> Add All Subjects
            </button>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onNotNow}
              className="rounded-xl px-3 py-1.5 text-xs font-bold transition-colors hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              Not Now
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onDismiss}
              className="rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors hover:opacity-70"
              style={{ color: 'var(--text-muted)', opacity: 0.7 }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Success view ─────────────────────────────────────────────────────────────
function SuccessView({ successMeta, onContinue, isSubmitting }: { successMeta: { count: number; names: string[] }; onContinue: () => void; isSubmitting: boolean }) {
  return (
    <div className="px-6 py-8 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.05 }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-xl shadow-emerald-500/30"
      >
        <CheckCheck size={30} />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-5 text-2xl font-black" style={{ color: 'var(--text)' }}
        aria-live="polite"
      >
        Subjects Added Successfully!
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}
      >
        Your selected subjects have been added to your learning profile. You can now access their lessons, assignments, assessments, and learning resources.
      </motion.p>

      {successMeta.names.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-4 flex flex-wrap justify-center gap-2"
        >
          {successMeta.names.slice(0, 4).map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <Check size={12} strokeWidth={3} /> {name}
            </span>
          ))}
          {successMeta.names.length > 4 && (
            <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              +{successMeta.names.length - 4} more
            </span>
          )}
        </motion.div>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={onContinue}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
      >
        Continue
      </button>
    </div>
  )
}

// ── Subtle dashboard notification ────────────────────────────────────────────
function PendingSubjectsPill({ count, onReview, onSnooze }: { count: number; onReview: () => void; onSnooze: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="fixed bottom-20 left-1/2 z-[110] -translate-x-1/2 md:bottom-6"
    >
      <div
        className="flex items-center gap-2 rounded-2xl py-2 pl-3 pr-2 shadow-2xl shadow-black/20"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', backdropFilter: 'blur(12px)' }}
      >
        <span className="text-lg">🎓</span>
        <button
          type="button"
          onClick={onReview}
          className="rounded-xl px-2 py-1.5 text-xs font-black transition-colors hover:opacity-80"
          style={{ color: 'var(--text)' }}
        >
          {count} new subject{count > 1 ? 's' : ''} available
        </button>
        <button
          type="button"
          onClick={onSnooze}
          aria-label="Snooze new subjects reminder"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  )
}
