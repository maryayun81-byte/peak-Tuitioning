'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck, ChevronLeft, ChevronRight, BarChart3,
  Users, TrendingUp, UserCheck, UserX, AlertCircle, Info,
  Download, Search, Calendar, ChevronDown, Filter,
  CheckCircle2, XCircle, Clock, Award, Activity, Eye,
  ArrowRight, Layers, BookOpen, School, Zap
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, Legend
} from 'recharts'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select, Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList, SkeletonCard } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'
import {
  getEventWeeks, getCurrentWeekNumber, formatDate,
  calculateAttendancePercentage, type EventWeek
} from '@/lib/utils'
import { exportAttendancePdf } from '@/lib/export/attendance-pdf'

// ─── Types ──────────────────────────────────────────────────────────────────
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface TuitionEvent {
  id: string; name: string; start_date: string; end_date: string
  is_active: boolean; status: string; active_days: string[]
  attendance_threshold: number
}
interface Curriculum { id: string; name: string; description?: string }
interface ClassRecord { id: string; name: string; curriculum_id: string }
interface StudentRecord { id: string; full_name: string; admission_number: string; class_id: string }
interface AttendanceRecord {
  id: string; student_id: string; class_id: string; date: string
  week_number: number; status: AttendanceStatus; notes: string; tuition_event_id: string
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  present: '#10B981', absent: '#EF4444', late: '#F59E0B', excused: '#6366F1', unmarked: '#6B7280'
}
const STATUS_ICONS: Record<string, React.ReactNode> = {
  present: <CheckCircle2 size={14} />, absent: <XCircle size={14} />,
  late: <Clock size={14} />, excused: <AlertCircle size={14} />
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function getStatusBreakdown(records: AttendanceRecord[]) {
  return {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    excused: records.filter(r => r.status === 'excused').length,
    total: records.length,
  }
}

function getRate(records: AttendanceRecord[]) {
  if (!records.length) return 0
  return calculateAttendancePercentage(records.filter(r => r.status === 'present').length, records.length)
}

// ─── Sub-Components ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5 flex flex-col gap-2" style={{ borderBottom: `3px solid ${color}` }}>
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18', color }}>{icon}</div>
        </div>
        <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
        {sub && <div className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
      </Card>
    </motion.div>
  )
}

// ─── Student PDF Button ───────────────────────────────────────────────────────
function StudentPdfButton({ student, allAttendance, weeks, eventName, threshold, className }: {
  student: StudentRecord; allAttendance: AttendanceRecord[]; weeks: EventWeek[]
  eventName: string; threshold: number; className?: string
}) {
  const [loading, setLoading] = useState(false)
  const handleExport = async () => {
    setLoading(true)
    toast.loading('Generating PDF...', { id: 'student-pdf' })
    try {
      await exportAttendancePdf({
        type: 'student',
        viewMode: 'event',
        eventName,
        threshold,
        student,
        allAttendance,
        weeks,
        cls: className ? { id: student.class_id, name: className } : undefined,
      })
      toast.success('PDF downloaded!', { id: 'student-pdf' })
    } catch (e) {
      toast.error('Failed to generate PDF', { id: 'student-pdf' })
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button className="flex-1" onClick={handleExport} isLoading={loading}>
      <Download size={14} /> Export PDF
    </Button>
  )
}

// ─── Student Analytics Modal (full in-app drill-down) ─────────────────────────
function StudentDetailModal({
  student, onClose, allAttendance, weeks, eventName, threshold, className
}: {
  student: StudentRecord | null; onClose: () => void
  allAttendance: AttendanceRecord[]; weeks: EventWeek[]
  eventName: string; threshold: number; className?: string
}) {

  const [tab, setTab] = useState<'week' | 'event'>('week')
  const [selectedWeekNum, setSelectedWeekNum] = useState(1)

  const currentWeekNum = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return weeks.find(w => {
      const ws = (w.startDate instanceof Date ? w.startDate : new Date(w.startDate)).toISOString().split('T')[0]
      const we = (w.endDate instanceof Date ? w.endDate : new Date(w.endDate)).toISOString().split('T')[0]
      return today >= ws && today <= we
    })?.weekNumber || weeks[weeks.length - 1]?.weekNumber || 1
  }, [weeks])

  useEffect(() => { if (student) setSelectedWeekNum(currentWeekNum) }, [student, currentWeekNum])

  const studentAtt = useMemo(() =>
    allAttendance.filter(a => a.student_id === student?.id), [allAttendance, student])

  const selectedWeek = weeks.find(w => w.weekNumber === selectedWeekNum)
  const weekAtt = useMemo(() =>
    studentAtt.filter(a => (selectedWeek?.activeDates || []).includes(a.date)), [studentAtt, selectedWeek])

  const isFutureWeek = selectedWeekNum > currentWeekNum

  const displayAtt = tab === 'week' ? weekAtt : studentAtt
  const stats = useMemo(() => getStatusBreakdown(displayAtt), [displayAtt])
  const rate = calculateAttendancePercentage(stats.present, stats.total)

  // Per-week chart data for "full event" view
  const weekChartData = useMemo(() => weeks.map(w => {
    const wAtt = studentAtt.filter(a => w.activeDates.includes(a.date))
    return {
      name: `W${w.weekNumber}`,
      present: wAtt.filter(a => a.status === 'present').length,
      absent: wAtt.filter(a => a.status === 'absent').length,
      late: wAtt.filter(a => a.status === 'late').length,
      target: w.activeDates.length,
    }
  }), [studentAtt, weeks])

  if (!student) return null
  const initials = student.full_name.split(' ').slice(0, 2).map(n => n[0]).join('')
  const belowThreshold = rate < threshold

  return (
    <Modal isOpen={!!student} onClose={onClose} title="Student Attendance Deep-Dive" size="xl">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg"
              style={{ background: belowThreshold ? 'linear-gradient(135deg,#EF4444,#F87171)' : 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
              {initials}
            </div>
            <div>
              <div className="font-black text-base" style={{ color: 'var(--text)' }}>{student.full_name}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{student.admission_number} · {eventName}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 rounded-xl" style={{ background: (belowThreshold ? '#EF4444' : '#10B981') + '15' }}>
              <div className="text-2xl font-black" style={{ color: belowThreshold ? '#EF4444' : '#10B981' }}>{rate}%</div>
              <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Overall Rate</div>
            </div>
            {belowThreshold && (
              <Badge variant="danger" className="text-[9px] px-2 py-1">⚠ Below {threshold}%</Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--input)' }}>
          {(['week', 'event'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all"
              style={{
                background: tab === t ? 'var(--card)' : 'transparent',
                color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              }}>
              {t === 'week' ? '📅 Week View' : '📊 Full Event'}
            </button>
          ))}
        </div>

        {/* Week selector (week tab only) */}
        {tab === 'week' && (
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedWeekNum(n => Math.max(1, n - 1))} disabled={selectedWeekNum <= 1}
              className="p-2 rounded-xl transition-colors" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ChevronLeft size={16} />
            </button>
            <Select value={selectedWeekNum.toString()} onChange={e => setSelectedWeekNum(parseInt(e.target.value))} className="flex-1">
              {weeks.map(w => <option key={w.weekNumber} value={w.weekNumber}>{w.label}</option>)}
            </Select>
            <button onClick={() => setSelectedWeekNum(n => Math.min(weeks.length, n + 1))} disabled={selectedWeekNum >= weeks.length}
              className="p-2 rounded-xl transition-colors" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Stats grid */}
        {tab === 'week' && isFutureWeek ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500 animate-pulse">
              <Clock size={28} />
            </div>
            <p className="font-bold text-amber-600">Future Week</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data yet for this week.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Attended', value: stats.present, color: '#10B981' },
                { label: 'Missed', value: stats.absent, color: '#EF4444' },
                { label: 'Late', value: stats.late, color: '#F59E0B' },
                { label: 'Excused', value: stats.excused, color: '#6366F1' },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-2xl text-center" style={{ background: s.color + '10', border: `1px solid ${s.color}30` }}>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wide mt-1" style={{ color: s.color + 'AA' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Week timeline (week tab) */}
            {tab === 'week' && selectedWeek && (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
                <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                  Daily Timeline — {selectedWeek.label}
                </div>
                <div className="p-4 flex flex-wrap gap-3">
                  {selectedWeek.activeDates.map(date => {
                    const entry = weekAtt.find(a => a.date === date)
                    const status = entry?.status || 'unmarked'
                    const color = STATUS_COLORS[status]
                    return (
                      <div key={date} className="flex-1 min-w-[90px] p-3 rounded-2xl flex flex-col items-center gap-1.5"
                        style={{ background: 'var(--card)', border: `2px solid ${status === 'unmarked' ? 'var(--card-border)' : color + '50'}` }}>
                        <div className="text-[9px] font-black uppercase" style={{ color: 'var(--text-muted)' }}>
                          {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: color, color: 'white' }}>
                          {STATUS_ICONS[status] || <Clock size={14} />}
                        </div>
                        <div className="text-[9px] font-bold capitalize" style={{ color }}>{status}</div>
                        {entry?.notes && <div className="text-[8px] text-center italic" style={{ color: 'var(--text-muted)' }}>{entry.notes}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Full event weekly bar chart */}
            {tab === 'event' && (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
                <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                  Week-by-Week Attendance
                </div>
                <div className="p-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekChartData} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: 'var(--card)', color: 'var(--text)' }} />
                      <Bar dataKey="present" fill="#10B981" radius={[4, 4, 0, 0]} name="Present" />
                      <Bar dataKey="absent" fill="#EF4444" radius={[4, 4, 0, 0]} name="Absent" />
                      <Bar dataKey="late" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Late" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <StudentPdfButton student={student} allAttendance={allAttendance} weeks={weeks} eventName={eventName} threshold={threshold} className={className} />
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminAttendancePage() {
  const supabase = getSupabaseBrowserClient()

  // Data
  const [loading, setLoading] = useState(true)
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [events, setEvents] = useState<TuitionEvent[]>([])
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([])
  const [holidays, setHolidays] = useState<string[]>([])
  const [attLoading, setAttLoading] = useState(false)

  // Filters
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('all')
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'week' | 'event'>('week')
  const [selectedWeekNum, setSelectedWeekNum] = useState(1)
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'rate'>('rate')

  // UI  
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null)
  const [expandedClass, setExpandedClass] = useState<string | null>(null)

  // Derived: selected event
  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId) ?? null, [events, selectedEventId])

  // Derived: weeks
  const weeks = useMemo(() => {
    if (!selectedEvent) return []
    return getEventWeeks(selectedEvent.start_date, selectedEvent.end_date, selectedEvent.active_days || [], holidays)
  }, [selectedEvent, holidays])

  const selectedWeek = useMemo(() => weeks.find(w => w.weekNumber === selectedWeekNum) ?? null, [weeks, selectedWeekNum])

  // Derived: classes in selected curriculum
  const filteredClasses = useMemo(() => {
    if (selectedCurriculumId === 'all') return classes
    return classes.filter(c => c.curriculum_id === selectedCurriculumId)
  }, [classes, selectedCurriculumId])

  // Derived: attendance scope (week or full event)
  const scopedAttendance = useMemo(() => {
    if (viewMode === 'week' && selectedWeek) {
      return allAttendance.filter(a => selectedWeek.activeDates.includes(a.date))
    }
    return allAttendance
  }, [allAttendance, viewMode, selectedWeek])

  // Derived: attendance for selected class (or all)
  const classFilteredAttendance = useMemo(() => {
    if (selectedClassId === 'all') return scopedAttendance
    return scopedAttendance.filter(a => a.class_id === selectedClassId)
  }, [scopedAttendance, selectedClassId])

  // ── Data loading ──
  const loadBase = useCallback(async () => {
    setLoading(true)
    try {
      const [currRes, evRes, classRes, studRes] = await Promise.all([
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('tuition_events').select('*').order('start_date', { ascending: false }),
        supabase.from('classes').select('id, name, curriculum_id').order('name'),
        supabase.from('students').select('id, full_name, admission_number, class_id').order('full_name'),
      ])
      setCurriculums(currRes.data ?? [])
      setEvents(evRes.data ?? [])
      setClasses(classRes.data ?? [])
      setStudents(studRes.data ?? [])

      const evts = evRes.data ?? []
      const active = evts.find(e => e.is_active)
      const defaultEvent = active ?? evts[0]
      if (defaultEvent) {
        setSelectedEventId(defaultEvent.id)
        const { data: hols } = await supabase
          .from('holidays').select('date')
          .gte('date', defaultEvent.start_date)
          .lte('date', defaultEvent.end_date)
        const holDates = (hols ?? []).map((h: any) => h.date)
        setHolidays(holDates)
        const wks = getEventWeeks(defaultEvent.start_date, defaultEvent.end_date, defaultEvent.active_days || [], holDates)
        const curWeek = getCurrentWeekNumber(defaultEvent.start_date, defaultEvent.end_date, defaultEvent.active_days || [], holDates)
        setSelectedWeekNum(curWeek)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const loadAttendance = useCallback(async (eventId: string) => {
    if (!eventId) return
    setAttLoading(true)
    const { data } = await supabase.from('attendance').select('*').eq('tuition_event_id', eventId)
    setAllAttendance(data ?? [])
    setAttLoading(false)
  }, [supabase])

  useEffect(() => { loadBase() }, [loadBase])

  // Load attendance when event changes
  useEffect(() => {
    if (selectedEventId) loadAttendance(selectedEventId)
  }, [selectedEventId, loadAttendance])

  // Load holidays when event changes
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

  // Auto reset week when event/weeks change
  useEffect(() => {
    if (weeks.length > 0 && selectedEvent) {
      const curWeek = getCurrentWeekNumber(selectedEvent.start_date, selectedEvent.end_date, selectedEvent.active_days || [], holidays)
      setSelectedWeekNum(curWeek)
    }
  }, [selectedEventId, weeks.length])

  // ── Overall stats ──
  const overallStats = useMemo(() => {
    const s = getStatusBreakdown(classFilteredAttendance)
    return { ...s, rate: calculateAttendancePercentage(s.present, s.total) }
  }, [classFilteredAttendance])

  // ── Daily trend chart ──
  const trendData = useMemo(() => {
    const dates = viewMode === 'week'
      ? (selectedWeek?.activeDates ?? [])
      : weeks.flatMap(w => w.activeDates)
    return dates.map(date => {
      const dayAtt = classFilteredAttendance.filter(a => a.date === date)
      const totalStudents = selectedClassId === 'all'
        ? [...new Set(dayAtt.map(a => a.student_id))].length
        : students.filter(s => s.class_id === selectedClassId).length
      return {
        name: viewMode === 'week'
          ? new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
          : new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        present: dayAtt.filter(a => a.status === 'present').length,
        absent: dayAtt.filter(a => a.status === 'absent').length,
        late: dayAtt.filter(a => a.status === 'late').length,
        total: totalStudents,
      }
    })
  }, [classFilteredAttendance, viewMode, selectedWeek, weeks, selectedClassId, students])

  // ── Per-class stats ──
  const classStats = useMemo(() => {
    return filteredClasses.map(cls => {
      const clsAtt = scopedAttendance.filter(a => a.class_id === cls.id)
      const s = getStatusBreakdown(clsAtt)
      const rate = calculateAttendancePercentage(s.present, s.total)
      const threshold = selectedEvent?.attendance_threshold ?? 80
      return { ...cls, ...s, rate, belowThreshold: rate < threshold && s.total > 0 }
    }).sort((a, b) => sortBy === 'rate' ? b.rate - a.rate : a.name.localeCompare(b.name))
  }, [filteredClasses, scopedAttendance, sortBy, selectedEvent])

  // ── Pie chart data ──
  const pieData = useMemo(() => [
    { name: 'Present', value: overallStats.present, color: '#10B981' },
    { name: 'Absent', value: overallStats.absent, color: '#EF4444' },
    { name: 'Late', value: overallStats.late, color: '#F59E0B' },
    { name: 'Excused', value: overallStats.excused, color: '#6366F1' },
  ].filter(d => d.value > 0), [overallStats])

  // ── Students in selected class ──
  const classStudents = useMemo(() => {
    if (selectedClassId === 'all' && !expandedClass) return []
    const clsId = expandedClass || selectedClassId
    return students
      .filter(s => s.class_id === clsId && s.full_name.toLowerCase().includes(search.toLowerCase()))
  }, [students, selectedClassId, expandedClass, search])

  // ── PDF Export ──
  const [exporting, setExporting] = useState(false)

  const exportPdf = async () => {
    if (!selectedEvent) return
    setExporting(true)
    toast.loading('Generating PDF…', { id: 'pdf-export' })
    try {
      const targetStudents = selectedClassId !== 'all'
        ? students.filter(s => s.class_id === selectedClassId)
        : students.filter(s => filteredClasses.some(c => c.id === s.class_id))
      const curriculumName = selectedCurriculumId !== 'all'
        ? curriculums.find(c => c.id === selectedCurriculumId)?.name
        : undefined
      const cls = selectedClassId !== 'all'
        ? filteredClasses.find(c => c.id === selectedClassId)
        : undefined

      await exportAttendancePdf({
        type: cls ? 'class' : 'overview',
        viewMode,
        eventName: selectedEvent.name,
        curriculumName,
        weekLabel: selectedWeek?.label,
        threshold: selectedEvent.attendance_threshold ?? 80,
        cls,
        students: targetStudents,
        attendance: classFilteredAttendance,
        allAttendance,
        weeks,
        selectedWeek,
      })
      toast.success('PDF downloaded!', { id: 'pdf-export' })
    } catch (e) {
      toast.error('Failed to generate PDF', { id: 'pdf-export' })
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  // ──────────────── RENDER ────────────────
  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="h-9 w-64 rounded-xl animate-pulse" style={{ background: 'var(--input)' }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      <SkeletonList count={6} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5" style={{ color: 'var(--text)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)' }}>
              <ClipboardCheck size={18} className="text-white" />
            </div>
            Attendance Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {selectedEvent
              ? `${selectedEvent.name} · ${viewMode === 'week' ? `Week ${selectedWeekNum}` : 'Full Event'}`
              : 'Select a tuition event to begin'}
            {attLoading && <span className="ml-2 animate-pulse">⏳</span>}
          </p>
        </div>
        <Button variant="secondary" onClick={exportPdf} isLoading={exporting} className="self-start">
          <Download size={15} /> Export PDF
        </Button>
      </div>

      {/* ── Filters ── */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Curriculum */}
          <Select label="Curriculum" value={selectedCurriculumId} onChange={e => { setSelectedCurriculumId(e.target.value); setSelectedClassId('all'); setExpandedClass(null) }}>
            <option value="all">All Curricula</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          {/* Tuition Event */}
          <Select label="Tuition Event" value={selectedEventId} onChange={e => { setSelectedEventId(e.target.value); setSelectedClassId('all'); setExpandedClass(null) }}>
            <option value="">Select Event</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.name} {e.is_active ? '● Active' : ''}</option>
            ))}
          </Select>

          {/* Class */}
          <Select label="Class" value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setExpandedClass(null) }}>
            <option value="all">All Classes</option>
            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          {/* View Mode */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>View Mode</label>
            <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--input)' }}>
              {(['week', 'event'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all"
                  style={{
                    background: viewMode === mode ? 'var(--card)' : 'transparent',
                    color: viewMode === mode ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}>
                  {mode === 'week' ? '📅 Week' : '📊 Full Event'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Week navigator (shown only in week mode) */}
        <AnimatePresence>
          {viewMode === 'week' && weeks.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-center gap-2">
              <button onClick={() => setSelectedWeekNum(n => Math.max(1, n - 1))} disabled={selectedWeekNum <= 1}
                className="p-2 rounded-xl disabled:opacity-40 transition-colors" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                <ChevronLeft size={15} />
              </button>
              <Select value={selectedWeekNum.toString()} onChange={e => setSelectedWeekNum(parseInt(e.target.value))} className="flex-1 max-w-xs">
                {weeks.map(w => <option key={w.weekNumber} value={w.weekNumber}>{w.label}</option>)}
              </Select>
              <button onClick={() => setSelectedWeekNum(n => Math.min(weeks.length, n + 1))} disabled={selectedWeekNum >= weeks.length}
                className="p-2 rounded-xl disabled:opacity-40 transition-colors" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                <ChevronRight size={15} />
              </button>
              {selectedWeek?.hasHolidays && (
                <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>🎉 Holiday week</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ── Empty: no event ── */}
      {!selectedEventId && (
        <div className="py-24 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'var(--input)' }}>
            <Calendar size={32} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="font-bold" style={{ color: 'var(--text)' }}>No Tuition Event Selected</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a tuition event above to view analytics.</p>
        </div>
      )}

      {selectedEventId && (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Attendance Rate" value={`${overallStats.rate}%`} icon={<TrendingUp size={18} />} color="var(--primary)" sub={`${overallStats.total} sessions`} />
            <StatCard label="Present Sessions" value={overallStats.present} icon={<UserCheck size={18} />} color="#10B981" sub="Recorded present" />
            <StatCard label="Absent Sessions" value={overallStats.absent} icon={<UserX size={18} />} color="#EF4444" sub="Action needed" />
            <StatCard label="Late / Excused" value={overallStats.late + overallStats.excused} icon={<AlertCircle size={18} />} color="#F59E0B" sub={`${overallStats.late}L · ${overallStats.excused}E`} />
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Area Trend Chart */}
            <Card className="lg:col-span-2 p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Activity size={16} className="text-primary" />
                  {viewMode === 'week' ? `Week ${selectedWeekNum} Daily Trend` : 'Full Event Daily Trend'}
                </h3>
                <Badge variant="muted" className="text-[9px]">
                  {viewMode === 'week' ? selectedWeek?.activeDates.length + ' days' : weeks.flatMap(w => w.activeDates).length + ' total days'}
                </Badge>
              </div>
              <div className="h-56">
                {trendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', background: 'var(--card)', color: 'var(--text)' }} />
                      <Area type="monotone" dataKey="present" stroke="#10B981" strokeWidth={2.5} fill="url(#gPresent)" name="Present" />
                      <Area type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={2} fill="url(#gAbsent)" name="Absent" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Pie Chart */}
            <Card className="p-5">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4" style={{ color: 'var(--text)' }}>
                <BarChart3 size={16} className="text-primary" /> Distribution
              </h3>
              {overallStats.total === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>No data</div>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px', background: 'var(--card)', border: 'none', color: 'var(--text)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {[
                      { label: 'Present', color: '#10B981', val: overallStats.present },
                      { label: 'Absent', color: '#EF4444', val: overallStats.absent },
                      { label: 'Late', color: '#F59E0B', val: overallStats.late },
                      { label: 'Excused', color: '#6366F1', val: overallStats.excused },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        {item.label} <span className="font-black" style={{ color: item.color }}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── Per-Week Stacked Bar (Full Event only) ── */}
          {viewMode === 'event' && weeks.length > 0 && (
            <Card className="p-5 overflow-hidden">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4" style={{ color: 'var(--text)' }}>
                <BarChart3 size={16} className="text-primary" /> Week-by-Week Class Attendance Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeks.map(w => {
                    const wAtt = classFilteredAttendance.filter(a => w.activeDates.includes(a.date))
                    return {
                      name: `W${w.weekNumber}`,
                      Present: wAtt.filter(a => a.status === 'present').length,
                      Absent: wAtt.filter(a => a.status === 'absent').length,
                      Late: wAtt.filter(a => a.status === 'late').length,
                      Excused: wAtt.filter(a => a.status === 'excused').length,
                    }
                  })} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: 'var(--card)', color: 'var(--text)' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Present" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Absent" stackId="a" fill="#EF4444" />
                    <Bar dataKey="Late" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="Excused" stackId="a" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ── Class Leaderboard ── */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--input)', borderBottom: '1px solid var(--card-border)' }}>
              <h3 className="font-black text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <School size={15} className="text-primary" /> Class Breakdown
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Sort:</span>
                <button onClick={() => setSortBy(s => s === 'rate' ? 'name' : 'rate')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'var(--card)', color: 'var(--primary)' }}>
                  {sortBy === 'rate' ? '⬇ Rate' : 'A–Z Name'}
                </button>
              </div>
            </div>

            {classStats.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No classes in this curriculum.</div>
            ) : (
              <div className="divide-y divide-[var(--card-border)]">
                {classStats.map((cls, i) => {
                  const isExpanded = expandedClass === cls.id
                  const clsStudents = students.filter(s => s.class_id === cls.id && s.full_name.toLowerCase().includes(search.toLowerCase()))
                  const clsAtt = scopedAttendance.filter(a => a.class_id === cls.id)

                  return (
                    <div key={cls.id}>
                      {/* Class Row */}
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        onClick={() => { setExpandedClass(isExpanded ? null : cls.id); setSearch('') }}
                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[var(--input)] transition-colors group">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs"
                          style={{ background: cls.belowThreshold ? '#EF444415' : '#10B98115', color: cls.belowThreshold ? '#EF4444' : '#10B981' }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{cls.name}</span>
                            {cls.belowThreshold && <Badge variant="danger" className="text-[8px] py-0 px-1.5">⚠ Below Threshold</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 rounded-full max-w-[120px]" style={{ background: 'var(--input)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${cls.rate}%`, background: cls.rate >= (selectedEvent?.attendance_threshold ?? 80) ? '#10B981' : '#EF4444' }} />
                            </div>
                            <span className="text-xs font-black" style={{ color: cls.belowThreshold ? '#EF4444' : '#10B981' }}>{cls.rate}%</span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold">
                          <span className="px-2 py-0.5 rounded-lg" style={{ background: '#10B98115', color: '#10B981' }}>{cls.present}P</span>
                          <span className="px-2 py-0.5 rounded-lg" style={{ background: '#EF444415', color: '#EF4444' }}>{cls.absent}A</span>
                          <span className="px-2 py-0.5 rounded-lg" style={{ background: '#F59E0B15', color: '#F59E0B' }}>{cls.late}L</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{students.filter(s => s.class_id === cls.id).length} students</span>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                          </motion.div>
                        </div>
                      </motion.div>

                      {/* Expanded Student List */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                            style={{ borderTop: '1px solid var(--card-border)', background: 'var(--input)' }}
                          >
                            <div className="p-3 space-y-3">
                              {/* Search within class */}
                              <Input
                                placeholder={`Search students in ${cls.name}...`}
                                leftIcon={<Search size={13} />}
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="text-sm"
                              />

                              {/* Student rows */}
                              {clsStudents.length === 0 ? (
                                <div className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {students.filter(s => s.class_id === cls.id).length === 0 ? 'No students in this class.' : 'No students match your search.'}
                                </div>
                              ) : (
                                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
                                  {clsStudents.map((student, si) => {
                                    const sAtt = clsAtt.filter(a => a.student_id === student.id)
                                    const rate = getRate(sAtt)
                                    const threshold = selectedEvent?.attendance_threshold ?? 80
                                    const flagged = rate < threshold && sAtt.length > 0

                                    return (
                                      <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: si * 0.02 }}
                                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[var(--card)] transition-colors group"
                                        style={{ borderBottom: si < clsStudents.length - 1 ? '1px solid var(--card-border)' : 'none' }}
                                        onClick={() => setSelectedStudent(student)}
                                      >
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                                          style={{ background: flagged ? '#EF444420' : '#7C3AED20', color: flagged ? '#EF4444' : '#7C3AED', border: `2px solid ${flagged ? '#EF444440' : '#7C3AED40'}` }}>
                                          {student.full_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{student.full_name}</span>
                                            {flagged && <Badge variant="danger" className="text-[8px] py-0 px-1 shrink-0">⚠ {rate}%</Badge>}
                                          </div>
                                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{student.admission_number}</div>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-2 text-[10px]">
                                          {[
                                            { s: 'present', c: '#10B981' }, { s: 'absent', c: '#EF4444' },
                                            { s: 'late', c: '#F59E0B' }, { s: 'excused', c: '#6366F1' }
                                          ].map(({ s, c }) => (
                                            <span key={s} className="px-1.5 py-0.5 rounded font-bold"
                                              style={{ background: c + '15', color: c }}>
                                              {sAtt.filter(a => a.status === s).length}
                                              {s[0].toUpperCase()}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="text-right">
                                            <div className="font-black text-sm" style={{ color: flagged ? '#EF4444' : '#10B981' }}>{rate}%</div>
                                            <div className="w-12 h-1 rounded-full mt-0.5" style={{ background: 'var(--card-border)' }}>
                                              <div className="h-full rounded-full" style={{ width: `${rate}%`, background: flagged ? '#EF4444' : '#10B981' }} />
                                            </div>
                                          </div>
                                          <div className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'var(--card)', color: 'var(--primary)' }}>
                                            <Eye size={13} />
                                          </div>
                                        </div>
                                      </motion.div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* ── Alert: classes below threshold ── */}
          {classStats.filter(c => c.belowThreshold).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl flex items-start gap-3"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-red-500 mb-1">
                  {classStats.filter(c => c.belowThreshold).length} class{classStats.filter(c => c.belowThreshold).length !== 1 ? 'es' : ''} below attendance threshold ({selectedEvent?.attendance_threshold ?? 80}%)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {classStats.filter(c => c.belowThreshold).map(c => (
                    <span key={c.id} className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                      {c.name} ({c.rate}%)
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ── Student Detail Modal ── */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        allAttendance={allAttendance}
        weeks={weeks}
        eventName={selectedEvent?.name ?? ''}
        threshold={selectedEvent?.attendance_threshold ?? 80}
        className={classes.find(c => c.id === selectedStudent?.class_id)?.name}
      />
    </div>
  )
}
