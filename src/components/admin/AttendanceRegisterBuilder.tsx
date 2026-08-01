'use client'

import React, { Fragment, forwardRef, useMemo, useRef, useState, useEffect } from 'react'
import { X, Download, FileText, ChevronLeft, ChevronRight, Calendar, Loader2, School,
  Users, PrinterCheck, Save, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Select, Input } from '@/components/ui/Input'
import { getEventWeeks } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface TuitionEvent {
  id: string; name: string; start_date: string; end_date: string
  is_active: boolean; active_days: string[]
}
interface Curriculum { id: string; name: string }
interface ClassRecord { id: string; name: string; curriculum_id: string }

interface Props {
  events: TuitionEvent[]
  curriculums: Curriculum[]
  classes: ClassRecord[]
  onClose: () => void
}

const PAGE_W = 1123
const PAGE_H = 794
const ROWS_PER_PAGE = 20
const LOGO_URI = '/icon.png'

function chunkArr<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function fmtDateShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function fmtDayName(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
}
function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function th(align = 'left', width?: number): React.CSSProperties {
  return {
    textAlign: align as any, border: '1px solid #C9D2DA',
    background: '#1B3A5C', color: '#ffffff',
    padding: '5px 6px', fontSize: 10, fontWeight: 700,
    ...(width ? { width } : {}),
  }
}
function thSub(): React.CSSProperties {
  return {
    textAlign: 'center', border: '1px solid #C9D2DA',
    background: '#EBF0E5', color: '#3F4B39',
    padding: '3px 4px', fontSize: 8.5, fontWeight: 600,
  }
}
function td(align = 'left'): React.CSSProperties {
  return { textAlign: align as any, border: '1px solid #E2E6EA', padding: '4px 6px', height: 24 }
}

interface PageProps {
  schoolName: string; teacherName: string; weekLabel: string
  activeDates: string[]; classLabel: string; eventName: string
  numRows: number; pageNumber: number; totalPages: number; startRow: number
  names: string[]   // plain text — captured correctly by html2canvas
}

const RegisterPage = forwardRef<HTMLDivElement, PageProps>(function RegisterPage(
  { schoolName, teacherName, weekLabel, activeDates, classLabel, eventName, numRows, pageNumber, totalPages, startRow, names }, ref
) {
  const rows = Array.from({ length: numRows }, (_, i) => i)   // 0-based index within this page
  const cols = activeDates.length > 0 ? activeDates : ['', '', '', '', '']

  return (
    <div ref={ref} style={{
      width: PAGE_W, height: PAGE_H, position: 'relative', background: '#ffffff',
      fontFamily: 'Arial, Helvetica, sans-serif', color: '#1F2937',
      overflow: 'hidden', border: '1px solid #E2E6EA', boxSizing: 'border-box', flexShrink: 0,
    }}>
      {/* Watermark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_URI} alt="" aria-hidden style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', width: 380, height: 380,
        objectFit: 'contain', opacity: 0.055, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '22px 32px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #1B3A5C', paddingBottom: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URI} alt="Logo" style={{ width: 46, height: 46, objectFit: 'contain', borderRadius: '50%', border: '1px solid #E2E6EA' }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1B3A5C', letterSpacing: '-0.02em' }}>
                {schoolName || 'Peak Performance Tutoring'}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                Weekly Attendance Register — {classLabel || '________'} &nbsp;·&nbsp; {eventName}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#374151', lineHeight: 1.7 }}>
            <div><strong>Teacher:</strong> {teacherName || '____________________'}</div>
            <div><strong>Week:</strong> {weekLabel}</div>
            <div><strong>Page:</strong> {pageNumber} of {totalPages}</div>
          </div>
        </div>

        {/* Table — widths computed to fill PAGE_W exactly */}
        {(() => {
          const PAD = 64        // 32px left + 32px right
          const tableW = PAGE_W - PAD  // 1059
          const COL_NUM  = 32
          const COL_NAME = 240
          const signTotal = tableW - COL_NUM - COL_NAME   // 787
          const COL_SIGN  = Math.floor(signTotal / (cols.length * 2))  // per sign cell
          // Absorb any rounding remainder into the name column
          const COL_NAME_ADJ = tableW - COL_NUM - COL_SIGN * cols.length * 2

          return (
            <table style={{ width: tableW, borderCollapse: 'collapse', fontSize: 11, flex: 1, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: COL_NUM }} />
                <col style={{ width: COL_NAME_ADJ }} />
                {cols.map((_, i) => (
                  <Fragment key={i}>
                    <col style={{ width: COL_SIGN }} />
                    <col style={{ width: COL_SIGN }} />
                  </Fragment>
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th style={th('center')}>#</th>
                  <th style={th('left')}>Student Name</th>
                  {cols.map((date, i) => (
                    <Fragment key={i}>
                      <th colSpan={2} style={{
                        ...th('center'),
                        lineHeight: 1.35,
                        verticalAlign: 'middle',
                        padding: '4px 4px',
                      }}>
                        {date
                          ? <>{fmtDayName(date)}<br /><span style={{ fontSize: 8, opacity: 0.85, fontWeight: 500 }}>{fmtDateShort(date)}</span></>
                          : ['Mon','Tue','Wed','Thu','Fri'][i]
                        }
                      </th>
                    </Fragment>
                  ))}
                </tr>
                <tr>
                  <th style={thSub()} /><th style={thSub()} />
                  {cols.map((_, i) => (
                    <Fragment key={i}>
                      <th style={thSub()}>In</th>
                      <th style={thSub()}>Out</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#F9FAFB' : '#ffffff' }}>
                    <td style={td('center')}>{startRow + ri}</td>
                    <td style={{ ...td('left'), color: names[ri] ? '#111827' : '#C4C9D4', fontStyle: names[ri] ? 'normal' : 'italic', fontSize: 12, fontWeight: names[ri] ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{names[ri] || ''}</td>
                    {cols.map((_, i) => (
                      <Fragment key={i}>
                        <td style={td('center')} /><td style={td('center')} />
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        })()}

        {/* Footer */}
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9CA3AF' }}>
          <span>Peak Performance Tutoring · Attendance Register · {classLabel}</span>
          <span>Students sign in on arrival and sign out on departure each day</span>
        </div>
      </div>
    </div>
  )
})

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = (classId: string) => `reg_template:${classId}`
interface SavedTemplate {
  teacherName: string
  schoolName: string
  names: string[]
  numRows: number
  savedAt: number          // Date.now()
  dbNames: string[]        // snapshot of DB names at save time (for diff)
}
function loadTemplate(classId: string): SavedTemplate | null {
  try { return JSON.parse(localStorage.getItem(LS_KEY(classId)) ?? 'null') } catch { return null }
}
function saveTemplate(classId: string, t: SavedTemplate) {
  localStorage.setItem(LS_KEY(classId), JSON.stringify(t))
}
function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// Draft — auto-saved on every change, cleared on explicit save
const DRAFT_KEY = (classId: string) => `reg_draft:${classId}`
interface DraftData {
  teacherName: string; schoolName: string
  names: string[]; numRows: number; savedAt: number
}
function loadDraft(classId: string): DraftData | null {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY(classId)) ?? 'null') } catch { return null }
}
function saveDraft(classId: string, d: DraftData) {
  localStorage.setItem(DRAFT_KEY(classId), JSON.stringify(d))
}
function clearDraft(classId: string) {
  localStorage.removeItem(DRAFT_KEY(classId))
}

export default function AttendanceRegisterBuilder({ events, curriculums, classes, onClose }: Props) {
  const supabase = getSupabaseBrowserClient()
  const activeEvent = events.find(e => e.is_active) ?? events[0] ?? null

  // ── Core form state ──
  const [selectedEventId, setSelectedEventId] = useState(activeEvent?.id ?? '')
  const [selectedWeekNum, setSelectedWeekNum] = useState(1)
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [schoolName, setSchoolName] = useState('Peak Performance Tutoring')
  const [numRows, setNumRows] = useState(20)
  const [generated, setGenerated] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [holidays, setHolidays] = useState<string[]>([])
  const [names, setNames] = useState<string[]>(() => Array(20).fill(''))

  // ── Persistence state ──
  const [savedTemplate, setSavedTemplate] = useState<SavedTemplate | null>(null)
  const [savedNames, setSavedNames] = useState<string[]>([])   // names at last save (dirty check)
  const [draft, setDraft] = useState<DraftData | null>(null)   // unsaved draft detected on class load
  const isApplyingRestore = useRef(false)                       // skip auto-save during restore

  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId) ?? null, [events, selectedEventId])

  // ── Holidays ──
  useEffect(() => {
    if (!selectedEvent) return
    let alive = true;
    (async () => {
      const { data } = await supabase.from('holidays').select('date')
        .gte('date', selectedEvent.start_date).lte('date', selectedEvent.end_date)
      if (alive) setHolidays((data ?? []).map((h: any) => h.date))
    })()
    return () => { alive = false }
  }, [selectedEventId])

  const weeks = useMemo(() => {
    if (!selectedEvent) return []
    return getEventWeeks(selectedEvent.start_date, selectedEvent.end_date, selectedEvent.active_days || [], holidays)
  }, [selectedEvent, holidays])

  // Auto-pick current week
  useEffect(() => {
    if (weeks.length === 0) return
    const today = new Date().toISOString().split('T')[0]
    const cur = weeks.find(w => {
      const ws = (w.startDate instanceof Date ? w.startDate : new Date(w.startDate)).toISOString().split('T')[0]
      const we = (w.endDate instanceof Date ? w.endDate : new Date(w.endDate)).toISOString().split('T')[0]
      return today >= ws && today <= we
    })
    setSelectedWeekNum(cur?.weekNumber ?? weeks[weeks.length - 1]?.weekNumber ?? 1)
    setGenerated(false)
  }, [weeks.length, selectedEventId])

  // ── When class changes: check localStorage + draft ──
  useEffect(() => {
    if (!selectedClassId) { setSavedTemplate(null); setDraft(null); return }
    setSavedTemplate(loadTemplate(selectedClassId))
    const d = loadDraft(selectedClassId)
    // Only surface the draft if it has meaningful content
    setDraft(d && d.names.some(n => n.trim()) ? d : null)
  }, [selectedClassId])

  // ── Auto-save draft (debounced 1.5 s) ──
  useEffect(() => {
    if (!selectedClassId) return
    if (isApplyingRestore.current) return  // don't clobber during a restore
    const hasContent = names.some(n => n.trim()) || teacherName.trim()
    if (!hasContent) return                // nothing worth saving yet
    const timer = setTimeout(() => {
      saveDraft(selectedClassId, { teacherName, schoolName, names, numRows, savedAt: Date.now() })
    }, 1500)
    return () => clearTimeout(timer)
  }, [names, teacherName, schoolName, numRows, selectedClassId])

  const selectedWeek = useMemo(() => weeks.find(w => w.weekNumber === selectedWeekNum) ?? null, [weeks, selectedWeekNum])
  const activeDates  = selectedWeek?.activeDates ?? []

  const filteredClasses = useMemo(() => {
    if (!selectedCurriculumId) return classes
    return classes.filter(c => c.curriculum_id === selectedCurriculumId)
  }, [classes, selectedCurriculumId])

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId) ?? null, [classes, selectedClassId])

  const totalRows = Math.max(1, Math.min(500, Number(numRows) || 20))
  const rowChunks  = useMemo(() => chunkArr(Array.from({ length: totalRows }, (_, i) => i + 1), ROWS_PER_PAGE), [totalRows, generated])

  // Grow/shrink names array when row count changes
  useEffect(() => {
    setNames(prev => {
      if (prev.length === totalRows) return prev
      const next = Array(totalRows).fill('')
      for (let i = 0; i < Math.min(prev.length, totalRows); i++) next[i] = prev[i]
      return next
    })
  }, [totalRows])

  function updateName(index: number, value: string) {
    setNames(prev => { const next = [...prev]; next[index] = value; return next })
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  // Restore saved template
  function handleRestoreTemplate() {
    if (!savedTemplate) return
    isApplyingRestore.current = true
    setTeacherName(savedTemplate.teacherName)
    setSchoolName(savedTemplate.schoolName)
    const n = savedTemplate.numRows
    setNumRows(n)
    const padded = [...savedTemplate.names, ...Array(Math.max(0, n - savedTemplate.names.length)).fill('')]
    setNames(padded)
    setSavedNames(savedTemplate.names)
    setTimeout(() => { isApplyingRestore.current = false }, 100)
    toast.success('Register restored!')
  }

  // Restore auto-draft
  function handleRestoreDraft() {
    if (!draft || !selectedClassId) return
    isApplyingRestore.current = true
    setTeacherName(draft.teacherName)
    setSchoolName(draft.schoolName)
    setNumRows(draft.numRows)
    setNames(draft.names)
    setDraft(null)
    setTimeout(() => { isApplyingRestore.current = false }, 100)
    toast.success(`Draft restored — ${draft.names.filter(Boolean).length} students back`)
  }

  function handleDiscardDraft() {
    if (!selectedClassId) return
    clearDraft(selectedClassId)
    setDraft(null)
    toast('Draft discarded', { icon: '🗑️' })
  }

  // Save template to localStorage + clear draft
  function handleSave() {
    if (!selectedClassId) return
    const tmpl: SavedTemplate = {
      teacherName, schoolName, names, numRows,
      savedAt: Date.now(), dbNames: [],
    }
    saveTemplate(selectedClassId, tmpl)
    clearDraft(selectedClassId)   // draft no longer needed
    setSavedTemplate(tmpl)
    setSavedNames([...names])
    setDraft(null)
    toast.success('Register saved — will auto-restore next time')
  }

  const isDirty = useMemo(
    () => JSON.stringify(names) !== JSON.stringify(savedNames),
    [names, savedNames]
  )

  const weekRangeLabel = useMemo(() => {
    if (!activeDates.length) return selectedWeek?.label ?? ''
    const first = fmtDate(activeDates[0])
    const last  = fmtDate(activeDates[activeDates.length - 1])
    return activeDates.length === 1 ? first : `${first} – ${last}`
  }, [activeDates, selectedWeek])

  const canGenerate = !!selectedEventId && !!selectedWeekNum && !!selectedClassId

  async function handleDownload() {
    if (!generated || pageRefs.current.length === 0) return
    setExporting(true)
    toast.loading('Generating PDF…', { id: 'reg-pdf' })
    try {
      const { jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PAGE_W, PAGE_H], compress: true })
      for (let i = 0; i < pageRefs.current.length; i++) {
        const node = pageRefs.current[i]
        if (!node) continue
        const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (i > 0) doc.addPage([PAGE_W, PAGE_H], 'landscape')
        doc.addImage(imgData, 'JPEG', 0, 0, PAGE_W, PAGE_H)
      }
      const fileClass = (selectedClass?.name || 'register').replace(/\s+/g, '-')
      const fileWeek  = selectedWeek?.label ? `_${selectedWeek.label.replace(/\s+/g, '-')}` : ''
      doc.save(`Attendance-Register_${fileClass}${fileWeek}.pdf`)
      toast.success('PDF downloaded!', { id: 'reg-pdf' })
    } catch (err) {
      console.error(err)
      toast.error('PDF failed.', { id: 'reg-pdf' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Top Bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b"
        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1B3A5C,#2563EB)' }}>
            <PrinterCheck size={17} className="text-white" />
          </div>
          <div>
            <div className="font-black text-sm" style={{ color: 'var(--text)' }}>Attendance Register Builder</div>
            <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Build a print-ready sign-in / sign-out sheet with real weekly dates
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--input)]"
          style={{ color: 'var(--text-muted)' }}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-5 space-y-5">

          {/* Setup card */}
          <div className="rounded-2xl p-5 border" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#1B3A5C,#2563EB)' }} />
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Register Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Event */}
              <div>
                <Select label="Tuition Event" value={selectedEventId}
                  onChange={e => { setSelectedEventId(e.target.value); setGenerated(false) }}>
                  <option value="">Select event…</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}{ev.is_active ? ' ● Active' : ''}</option>
                  ))}
                </Select>
              </div>

              {/* Week picker */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Week</label>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setSelectedWeekNum(n => Math.max(1, n - 1)); setGenerated(false) }}
                    disabled={selectedWeekNum <= 1 || weeks.length === 0}
                    className="p-2 rounded-lg disabled:opacity-30 transition-colors"
                    style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <select value={selectedWeekNum}
                    onChange={e => { setSelectedWeekNum(parseInt(e.target.value)); setGenerated(false) }}
                    disabled={weeks.length === 0}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none disabled:opacity-40"
                    style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}>
                    {weeks.length === 0
                      ? <option>No weeks — select event first</option>
                      : weeks.map(w => <option key={w.weekNumber} value={w.weekNumber}>{w.label}</option>)
                    }
                  </select>
                  <button onClick={() => { setSelectedWeekNum(n => Math.min(weeks.length, n + 1)); setGenerated(false) }}
                    disabled={selectedWeekNum >= weeks.length || weeks.length === 0}
                    className="p-2 rounded-lg disabled:opacity-30 transition-colors"
                    style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
                {activeDates.length > 0 && (
                  <p className="mt-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    📅 {activeDates.length} school day{activeDates.length !== 1 ? 's' : ''} · {weekRangeLabel}
                  </p>
                )}
              </div>

              {/* Curriculum */}
              <div>
                <Select label="Curriculum" value={selectedCurriculumId}
                  onChange={e => { setSelectedCurriculumId(e.target.value); setSelectedClassId(''); setGenerated(false) }}>
                  <option value="">All Curricula</option>
                  {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>

                          {/* Class */}
              <div>
                <Select label="Class" value={selectedClassId}
                  onChange={e => { setSelectedClassId(e.target.value); setGenerated(false) }}>
                  <option value="">Select class…</option>
                  {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>

              {/* Teacher */}
              <div>
                <Input label="Teacher Name" value={teacherName}
                  onChange={e => setTeacherName(e.target.value)} placeholder="e.g. Ms. Wanjiru" />
              </div>

              {/* School */}
              <div>
                <Input label="School / Centre Name" value={schoolName}
                  onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Peak Performance Tutoring" />
              </div>

              {/* Rows */}
              <div>
                <Input label="Student rows" type="number" value={numRows}
                  onChange={e => { setNumRows(Number(e.target.value)); setGenerated(false) }} placeholder="20" />
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Students sign manually — names optional</p>
              </div>
            </div>

            {/* ── Persistence action bar ── */}
            {selectedClassId && (
              <div className="mt-4 space-y-3">

                {/* ⚠️ Unsaved draft banner — shown first, most urgent */}
                <AnimatePresence>
                  {draft && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="rounded-xl p-3"
                      style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)' }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span style={{ fontSize: 16, lineHeight: 1 }}>⚠️</span>
                          <div>
                            <div className="text-xs font-black" style={{ color: '#D97706' }}>Unsaved draft found</div>
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {draft.names.filter(Boolean).length} student names · last edited {timeAgo(draft.savedAt)}
                              &nbsp;· page refresh may have interrupted your work
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={handleDiscardDraft}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-[var(--input)]"
                            style={{ borderColor: 'rgba(245,158,11,0.4)', color: 'var(--text-muted)' }}
                          >Discard</button>
                          <button
                            onClick={handleRestoreDraft}
                            className="text-xs font-black px-3 py-1.5 rounded-lg transition-all hover:scale-[1.03]"
                            style={{ background: '#D97706', color: '#fff' }}
                          >Restore draft</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 🟣 Saved register banner */}
                <AnimatePresence>
                  {savedTemplate && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <RotateCcw size={14} style={{ color: '#7C3AED' }} />
                        <div>
                          <span className="text-xs font-black" style={{ color: '#7C3AED' }}>Saved register found</span>
                          <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>
                            {savedTemplate.names.filter(Boolean).length} students · saved {timeAgo(savedTemplate.savedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleRestoreTemplate}
                        className="text-xs font-black px-3 py-1.5 rounded-lg transition-all hover:scale-[1.03]"
                        style={{ background: '#7C3AED', color: '#fff' }}
                      >
                        Restore
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!isDirty && !!savedTemplate}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all hover:scale-[1.02] disabled:opacity-40"
                    style={{ background: isDirty ? '#1B3A5C' : 'var(--input)', borderColor: isDirty ? '#1B3A5C' : 'var(--card-border)', color: isDirty ? '#fff' : 'var(--text-muted)' }}
                  >
                    <Save size={12} />
                    {isDirty ? 'Save register' : 'Saved ✓'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Button onClick={() => setGenerated(true)} disabled={!canGenerate} className="shadow-lg shadow-primary/20">
                <FileText size={15} /> Preview Register
              </Button>
              {!canGenerate && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Select an event, week, and class to continue</span>
              )}
            </div>
          </div>

          {/* Preview */}
          <AnimatePresence>
            {generated && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="space-y-5">

                {/* ── Optional name entry ── */}
                <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#7C3AED,#A78BFA)' }} />
                      <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Student Names <span className="normal-case font-medium">(optional — leave blank to fill by hand)</span></span>
                    </div>
                    <button
                      onClick={() => setNames(Array(totalRows).fill(''))}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors hover:bg-[var(--input)]"
                      style={{ color: 'var(--text-muted)' }}
                    >Clear all</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                    {Array.from({ length: totalRows }, (_, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black w-5 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                        <input
                          value={names[i] ?? ''}
                          onChange={e => updateName(i, e.target.value)}
                          placeholder="Student name…"
                          className="flex-1 min-w-0 text-xs rounded-lg border px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Register pages + download ── */}
                <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#10B981,#7C9A4E)' }} />
                        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                          Preview · {rowChunks.length} page{rowChunks.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { icon: <School size={11} />, label: selectedClass?.name ?? '' },
                          { icon: <Calendar size={11} />, label: selectedWeek?.label ?? '' },
                          { icon: <Users size={11} />, label: `${names.filter(n => n.trim()).length} named · ${names.filter(n => !n.trim()).length} blank` },
                        ].map(({ icon, label }) => (
                          <span key={label} className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                            {icon} {label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleDownload}
                      disabled={exporting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-100"
                      style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
                    >
                      {exporting
                        ? <><Loader2 size={15} className="animate-spin" /> Preparing PDF…</>
                        : <><Download size={15} /> Download PDF</>
                      }
                    </button>
                  </div>

                  <div className="overflow-x-auto space-y-6">
                    {rowChunks.map((chunk, pageIndex) => (
                      <div key={pageIndex} className="shadow-xl rounded-sm ring-1 ring-black/5">
                        <RegisterPage
                          ref={el => { pageRefs.current[pageIndex] = el }}
                          schoolName={schoolName}
                          teacherName={teacherName}
                          weekLabel={weekRangeLabel}
                          activeDates={activeDates}
                          classLabel={selectedClass?.name ?? ''}
                          eventName={selectedEvent?.name ?? ''}
                          numRows={chunk.length}
                          startRow={pageIndex * ROWS_PER_PAGE + 1}
                          pageNumber={pageIndex + 1}
                          totalPages={rowChunks.length}
                          names={names.slice(pageIndex * ROWS_PER_PAGE, pageIndex * ROWS_PER_PAGE + chunk.length)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  )
}
