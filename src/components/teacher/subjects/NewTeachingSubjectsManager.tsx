'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, CheckCheck, X, Sparkles, Loader2, BookOpen, Layers
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import type { TeacherPendingSubject, TeacherClassSource } from '@/lib/teacherPendingSubjects'
import { getSubjectVisual } from '@/lib/subjectVisuals'
import toast from 'react-hot-toast'

// ── Persistence keys ────────────────────────────────────────────────────────
// Dismissed = permanent (localStorage, per teacher). The teacher explicitly
// chose to dismiss these subjects, so they are never re-offered.
const dismissKey = (teacherId: string) => `peak_teacher_subjects_dismissed_${teacherId}`
// Snoozed = this browser session only. "Not Now" keeps subjects pending but
// stops nagging until the session ends or new subjects are added.
const snoozeKey = (teacherId: string) => `peak_teacher_subjects_snoozed_${teacherId}`

const SUBJECTS_UPDATED_EVENT = 'peak:teaching-subjects-updated'
const MANAGE_OPEN_EVENT = 'peak:teaching-subjects-open'
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

async function fetchPendingSubjects(): Promise<TeacherPendingSubject[]> {
  const res = await fetch('/api/teachers/me/pending-subjects', { cache: 'no-store' })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.message || data?.error || 'Could not load subjects')
  }
  const data = await res.json()
  return data?.subjects || []
}

async function registerTeachingSubjects(selections: Array<{ subjectId: string; classId: string }>) {
  const res = await fetch('/api/teachers/me/teaching-subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selections }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.success === false) {
    throw new Error(data?.error || data?.message || 'Could not update teaching profile')
  }
  return data as { success: boolean; registeredCount: number }
}

type Selections = Record<string, string[]>

function allClassIds(subject: TeacherPendingSubject): string[] {
  return subject.applicableClasses.map((c) => c.id)
}

function selectedClasses(selections: Selections, subjectId: string): string[] {
  return selections[subjectId] || []
}

function isSubjectFullySelected(selections: Selections, subject: TeacherPendingSubject): boolean {
  const ids = allClassIds(subject)
  if (ids.length === 0) return false
  const sel = selectedClasses(selections, subject.subject.id)
  return ids.every((id) => sel.includes(id))
}

function selectedSubjectCount(selections: Selections, subjects: TeacherPendingSubject[]): number {
  return subjects.filter((s) => selectedClasses(selections, s.subject.id).length > 0).length
}

function selectedClassCount(selections: Selections, subjects: TeacherPendingSubject[]): number {
  return subjects.reduce((sum, s) => sum + selectedClasses(selections, s.subject.id).length, 0)
}

function flattenSelections(selections: Selections, subjects: TeacherPendingSubject[]): Array<{ subjectId: string; classId: string }> {
  const out: Array<{ subjectId: string; classId: string }> = []
  for (const s of subjects) {
    for (const classId of selectedClasses(selections, s.subject.id)) {
      out.push({ subjectId: s.subject.id, classId })
    }
  }
  return out
}

// ── Component ────────────────────────────────────────────────────────────────
export function NewTeachingSubjectsManager() {
  const { teacher, profile, isInitialRevalidationComplete } = useAuthStore()

  const teacherId = teacher?.id

  const [subjects, setSubjects] = useState<TeacherPendingSubject[]>([])
  const [selections, setSelections] = useState<Selections>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [view, setView] = useState<'select' | 'success'>('select')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMeta, setSuccessMeta] = useState<{ count: number; names: string[] }>({ count: 0, names: [] })
  const [pillVisible, setPillVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  const snoozedRef = useRef<Set<string>>(new Set())
  const dismissedRef = useRef<Set<string>>(new Set())
  const isModalOpenRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const viewRef = useRef<'select' | 'success'>('select')
  const selectionsRef = useRef<Selections>({})
  const subjectsRef = useRef<TeacherPendingSubject[]>([])
  const loadRef = useRef<(args?: { manual?: boolean }) => Promise<TeacherPendingSubject[]>>(() => Promise.resolve([]))
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    setMounted(true)
    snoozedRef.current = readStoredIds(snoozeKey(teacherId ?? ''))
    dismissedRef.current = readStoredIds(dismissKey(teacherId ?? ''))
  }, [teacherId])

  useEffect(() => { isModalOpenRef.current = isModalOpen }, [isModalOpen])
  useEffect(() => { isSubmittingRef.current = isSubmitting }, [isSubmitting])
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => { selectionsRef.current = selections }, [selections])
  useEffect(() => { subjectsRef.current = subjects }, [subjects])

  const pruneStorage = useCallback((eligibleIds: Set<string>) => {
    if (!teacherId) return
    const nextSnooze = new Set(Array.from(snoozedRef.current).filter((id) => eligibleIds.has(id)))
    snoozedRef.current = nextSnooze
    writeStoredIds(snoozeKey(teacherId), nextSnooze)
    const nextDismissed = new Set(Array.from(dismissedRef.current).filter((id) => eligibleIds.has(id)))
    dismissedRef.current = nextDismissed
    writeDismissedIds(dismissKey(teacherId), nextDismissed)
  }, [teacherId])

  const load = useCallback(async (args?: { manual?: boolean }): Promise<TeacherPendingSubject[]> => {
    if (!teacherId) return []
    let eligible: TeacherPendingSubject[] = []
    try {
      eligible = await fetchPendingSubjects()
    } catch (e: any) {
      console.warn('[NewTeachingSubjects] Could not load pending subjects:', e?.message || e)
      return []
    }

    const visible = eligible.filter((s) => !dismissedRef.current.has(s.subject.id))
    const eligibleIds = new Set(visible.map((s) => s.subject.id))
    setSubjects(visible)
    pruneStorage(eligibleIds)

    if (visible.length === 0) {
      setIsModalOpen(false)
      setPillVisible(false)
      return visible
    }

    if (!isModalOpenRef.current && !isSubmittingRef.current && viewRef.current === 'select') {
      const fresh = visible.filter((s) => !snoozedRef.current.has(s.subject.id))
      if (fresh.length > 0) {
        setPillVisible(false)
        setView('select')
        setIsModalOpen(true)
      } else if (args?.manual) {
        setPillVisible(true)
      }
    }
    return visible
  }, [teacherId, pruneStorage])

  useEffect(() => { loadRef.current = load }, [load])

  // Initial load + periodic re-check (catches subjects added while logged in).
  useEffect(() => {
    if (!isInitialRevalidationComplete || !teacherId) return
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
  }, [isInitialRevalidationComplete, teacherId, load])

  // "Manage Teaching Subjects" (dashboard) opens the dialog on demand.
  useEffect(() => {
    const onOpen = () => {
      loadRef.current().then((visible) => {
        setView('select')
        setIsModalOpen(true)
        setPillVisible(false)
        if (visible.length > 0) setSelections({})
      })
    }
    window.addEventListener(MANAGE_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(MANAGE_OPEN_EVENT, onOpen)
  }, [])

  const announceSubjectsUpdated = useCallback(() => {
    try {
      window.dispatchEvent(new Event(SUBJECTS_UPDATED_EVENT))
    } catch { /* ignore */ }
  }, [])

  const register = async (items: Array<{ subjectId: string; classId: string }>) => {
    if (!teacherId || items.length === 0) return
    setIsSubmitting(true)
    try {
      const res = await registerTeachingSubjects(items)
      const subjectIds = Array.from(new Set(items.map((i) => i.subjectId)))
      const names = subjectIds
        .map((id) => subjectsRef.current.find((s) => s.subject.id === id)?.subject.name)
        .filter(Boolean) as string[]

      setSelections({})
      setSuccessMeta({ count: res.registeredCount, names })
      setView('success')
      announceSubjectsUpdated()
    } catch (e: any) {
      console.error('[NewTeachingSubjects] Registration error:', e)
      toast.error(e?.message || 'Could not update your teaching profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterSelected = () => {
    const items = flattenSelections(selectionsRef.current, subjectsRef.current)
    if (items.length === 0) return
    register(items)
  }

  const toggleSubject = (subject: TeacherPendingSubject) => {
    const ids = allClassIds(subject)
    if (ids.length === 0) return
    setSelections((prev) => {
      const next = { ...prev }
      if (isSubjectFullySelected(prev, subject)) {
        delete next[subject.subject.id]
      } else {
        next[subject.subject.id] = ids
      }
      return next
    })
  }

  const toggleClass = (subjectId: string, classId: string) => {
    setSelections((prev) => {
      const current = prev[subjectId] || []
      const next = current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId]
      return { ...prev, [subjectId]: next }
    })
  }

  const handleSelectAll = () => {
    const next: Selections = {}
    for (const s of subjectsRef.current) {
      next[s.subject.id] = allClassIds(s)
    }
    setSelections(next)
  }

  const handleClearSelection = () => setSelections({})

  // "Not Now" — snooze for this session only. Subjects stay pending.
  const handleNotNow = () => {
    const ids = subjectsRef.current.map((s) => s.subject.id)
    const next = new Set([...snoozedRef.current, ...ids])
    snoozedRef.current = next
    if (teacherId) writeStoredIds(snoozeKey(teacherId), next)
    setIsModalOpen(false)
    setPillVisible(true)
  }

  const handleSnoozeFromPill = () => {
    const ids = subjectsRef.current.map((s) => s.subject.id)
    const next = new Set([...snoozedRef.current, ...ids])
    snoozedRef.current = next
    if (teacherId) writeStoredIds(snoozeKey(teacherId), next)
    setPillVisible(false)
  }

  // Explicit permanent dismissal (localStorage, per teacher).
  const handleDismiss = () => {
    if (!teacherId) return
    const ids = subjectsRef.current.map((s) => s.subject.id)
    const next = new Set([...dismissedRef.current, ...ids])
    dismissedRef.current = next
    writeDismissedIds(dismissKey(teacherId), next)
    snoozedRef.current = new Set()
    writeStoredIds(snoozeKey(teacherId), [])
    setIsModalOpen(false)
    setPillVisible(false)
    setSubjects([])
  }

  const handleContinueAfterSuccess = async () => {
    setView('select')
    const remaining = await load({ manual: true })
    if (remaining.length === 0) {
      setIsModalOpen(false)
      setPillVisible(false)
      return
    }
    const fresh = remaining.filter((s) => !snoozedRef.current.has(s.subject.id))
    if (fresh.length === 0) {
      setIsModalOpen(false)
      setPillVisible(true)
    }
  }

  const openModalFromPill = () => {
    setView('select')
    setPillVisible(false)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    if (isSubmittingRef.current) return
    handleNotNow()
  }

  const showPill = mounted && pillVisible && subjects.length > 0 && !isModalOpen

  return (
    <>
      {mounted && isModalOpen && (
        <TeachingSubjectsDialog
          subjects={subjects}
          selections={selections}
          isSubmitting={isSubmitting}
          view={view}
          successMeta={successMeta}
          isLoading={isLoading}
          onToggleSubject={toggleSubject}
          onToggleClass={toggleClass}
          onRegisterSelected={handleRegisterSelected}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onNotNow={handleNotNow}
          onDismiss={handleDismiss}
          onContinue={handleContinueAfterSuccess}
          onClose={handleClose}
        />
      )}

      {mounted && showPill && (
        <PendingTeachingSubjectsPill count={subjects.length} onReview={openModalFromPill} onSnooze={handleSnoozeFromPill} />
      )}
    </>
  )
}

// ── Dialog ───────────────────────────────────────────────────────────────────
interface TeachingSubjectsDialogProps {
  subjects: TeacherPendingSubject[]
  selections: Selections
  isSubmitting: boolean
  view: 'select' | 'success'
  successMeta: { count: number; names: string[] }
  isLoading: boolean
  onToggleSubject: (subject: TeacherPendingSubject) => void
  onToggleClass: (subjectId: string, classId: string) => void
  onRegisterSelected: () => void
  onSelectAll: () => void
  onClearSelection: () => void
  onNotNow: () => void
  onDismiss: () => void
  onContinue: () => void
  onClose: () => void
}

function TeachingSubjectsDialog(props: TeachingSubjectsDialogProps) {
  const {
    subjects, selections, isSubmitting, view, successMeta, isLoading,
    onToggleSubject, onToggleClass, onRegisterSelected, onSelectAll,
    onClearSelection, onNotNow, onDismiss, onContinue, onClose,
  } = props

  const dialogRef = useRef<HTMLDivElement>(null)

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
          aria-labelledby="peak-teaching-subjects-title"
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
            <TeachingSelectView
              subjects={subjects}
              selections={selections}
              isSubmitting={isSubmitting}
              isLoading={isLoading}
              onToggleSubject={onToggleSubject}
              onToggleClass={onToggleClass}
              onRegisterSelected={onRegisterSelected}
              onSelectAll={onSelectAll}
              onClearSelection={onClearSelection}
              onNotNow={onNotNow}
              onDismiss={onDismiss}
            />
          ) : (
            <TeachingSuccessView successMeta={successMeta} onContinue={onContinue} isSubmitting={isSubmitting} />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// ── Select view ──────────────────────────────────────────────────────────────
function TeachingSelectView({
  subjects, selections, isSubmitting, isLoading,
  onToggleSubject, onToggleClass, onRegisterSelected,
  onSelectAll, onClearSelection, onNotNow, onDismiss,
}: {
  subjects: TeacherPendingSubject[]
  selections: Selections
  isSubmitting: boolean
  isLoading: boolean
  onToggleSubject: (subject: TeacherPendingSubject) => void
  onToggleClass: (subjectId: string, classId: string) => void
  onRegisterSelected: () => void
  onSelectAll: () => void
  onClearSelection: () => void
  onNotNow: () => void
  onDismiss: () => void
}) {
  const codes = Array.from(new Set(subjects.map((s) => s.curriculumCode)))
  const subjectsSelected = selectedSubjectCount(selections, subjects)
  const classesSelected = selectedClassCount(selections, subjects)
  const hasSelection = classesSelected > 0
  const allSelected = subjects.length > 0 && subjects.every((s) => isSubjectFullySelected(selections, s))

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
            <BookOpen size={26} />
          </motion.div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--primary)' }}>Curriculum update</p>
              {codes.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                  style={{ background: 'rgba(14,165,233,0.12)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.3)' }}
                >
                  <Layers size={9} /> {code === '844' ? '8-4-4' : 'CBC'}
                </span>
              ))}
            </div>
            <h2 id="peak-teaching-subjects-title" className="mt-0.5 text-xl font-black leading-tight" style={{ color: 'var(--text)' }}>
              New Subjects Available
            </h2>
          </div>
        </div>
        <p className="relative mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          New subjects were added to your curriculum. Pick the subjects and classes you&apos;d like to teach to update your teaching profile.
        </p>
      </div>

      {/* Subject list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {isLoading && subjects.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 rounded-2xl border border-[var(--card-border)] p-4">
                <div className="h-11 w-11 rounded-xl" style={{ background: 'var(--input)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/5 rounded-full" style={{ background: 'var(--input)' }} />
                  <div className="h-2.5 w-1/4 rounded-full" style={{ background: 'var(--input)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--input)' }}>
              <CheckCheck size={24} style={{ color: '#10B981' }} />
            </div>
            <p className="mt-4 text-sm font-bold" style={{ color: 'var(--text)' }}>You&apos;re all caught up</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              No new subjects are pending for your classes right now.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {subjects.map((entry, index) => {
                const subject = entry.subject
                const visual = getSubjectVisual(subject.name, subject.category, index)
                const Icon = visual.Icon
                const fullySelected = isSubjectFullySelected(selections, entry)
                return (
                  <motion.li
                    key={subject.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 220, damping: 24 }}
                    className={`overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
                      fullySelected ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--card-border)] bg-[var(--card)]'
                    }`}
                  >
                    {/* Subject row */}
                    <div className="flex items-center gap-3 p-3.5">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${visual.gradient} text-white shadow-md`}>
                        <Icon size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold" style={{ color: 'var(--text)' }}>{subject.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {subject.code && <span className="rounded-md px-1.5 py-0.5 font-mono text-[10px]" style={{ background: 'var(--input)', color: 'var(--text)' }}>{subject.code}</span>}
                          {subject.category && <span className="truncate capitalize">{subject.category}</span>}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={fullySelected}
                        onClick={() => onToggleSubject(entry)}
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition-all"
                        style={{
                          background: fullySelected ? 'var(--primary)' : 'var(--input)',
                          color: fullySelected ? 'white' : 'var(--text-muted)',
                        }}
                      >
                        {fullySelected ? <Check size={11} strokeWidth={3} /> : <X size={11} />}
                        {entry.applicableClasses.length} class{entry.applicableClasses.length > 1 ? 'es' : ''}
                      </button>
                    </div>

                    {/* Class chips */}
                    {entry.applicableClasses.length > 1 && (
                      <div className="flex flex-wrap gap-2 px-3.5 pb-3.5">
                        {entry.applicableClasses.map((cls: TeacherClassSource) => {
                          const active = selectedClasses(selections, subject.id).includes(cls.id)
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              role="checkbox"
                              aria-checked={active}
                              onClick={() => onToggleClass(subject.id, cls.id)}
                              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-150 active:scale-[0.97] ${
                                active ? 'text-white shadow-sm' : ''
                              }`}
                              style={{
                                background: active ? 'var(--primary)' : 'var(--input)',
                                color: active ? 'white' : 'var(--text-muted)',
                                border: `1px solid ${active ? 'transparent' : 'var(--card-border)'}`,
                              }}
                            >
                              {active && <Check size={11} strokeWidth={3} />}
                              {cls.name || 'Class'}
                            </button>
                          )
                        })}
                      </div>
                    )}
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
            disabled={isSubmitting || !hasSelection}
            onClick={onRegisterSelected}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
            {isSubmitting
              ? 'Updating teaching profile…'
              : subjectsSelected > 0
                ? `Register ${subjectsSelected} Subject${subjectsSelected > 1 ? 's' : ''}`
                : 'Register Subjects'}
          </button>

          {subjects.length > 0 && hasSelection && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClearSelection}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
            >
              Clear Selection
            </button>
          )}

          {subjects.length > 0 && !allSelected && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onSelectAll}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
            >
              <Sparkles size={15} /> Select All Subjects
            </button>
          )}

          {hasSelection && subjects.length > 0 && (
            <p className="text-center text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
              {subjectsSelected} subject{subjectsSelected > 1 ? 's' : ''} · {classesSelected} class{classesSelected > 1 ? 'es' : ''} selected
            </p>
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
function TeachingSuccessView({ successMeta, onContinue, isSubmitting }: { successMeta: { count: number; names: string[] }; onContinue: () => void; isSubmitting: boolean }) {
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
        Teaching Profile Updated! 🎓
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}
      >
        {successMeta.count > 0
          ? 'Your selected subjects and classes have been added to your teaching profile. They will now appear in your dashboard.'
          : 'Your teaching profile is up to date.'}
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
function PendingTeachingSubjectsPill({ count, onReview, onSnooze }: { count: number; onReview: () => void; onSnooze: () => void }) {
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
        <span className="text-lg">📚</span>
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
