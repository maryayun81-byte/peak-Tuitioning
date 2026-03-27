'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClipboardCheck, Search, Check, AlertCircle, Save, 
  ChevronLeft, ChevronRight, Eye, AlertTriangle,
  CheckCircle2, XCircle, Clock, CalendarDays,
  BarChart3, UserCheck, UserMinus, UserX, 
  Download, History, TrendingUp, Info
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area
} from 'recharts'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select, Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { getEventWeeks, getCurrentWeekNumber, formatDate, calculateAttendancePercentage, type EventWeek } from '@/lib/utils'
import type { TuitionEvent } from '@/types/database'

const PAGE_SIZE = 15

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
interface StudentRecord {
  id: string
  full_name: string
  admission_number: string
}
interface AttendanceEntry {
  status: AttendanceStatus
  notes: string
}

export default function TeacherAttendance() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { teacher, profile, isLoading: authLoading } = useAuthStore()

  // Access Control: Only class teachers can access this page
  useEffect(() => {
    if (!authLoading && teacher && !teacher.is_class_teacher) {
      toast.error('Only Class Teachers can access the register.')
      router.push('/teacher')
    }
  }, [teacher, authLoading, router])

  // Data
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tuitionEvents, setTuitionEvents] = useState<TuitionEvent[]>([])
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([])
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [holidays, setHolidays] = useState<string[]>([]) // ISO dates

  // Filters  
  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedWeekNum, setSelectedWeekNum] = useState(1)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [search, setSearch] = useState('')

  // Attendance state
  const [attendance, setAttendance] = useState<Record<string, AttendanceEntry>>({})
  const [alreadyMarked, setAlreadyMarked] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)

  // UI
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'mark' | 'analytics'>('mark')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  
  // Analytics data
  const [allAttendance, setAllAttendance] = useState<any[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Derived
  const selectedEvent = tuitionEvents.find(e => e.id === selectedEventId) ?? null
  const weeks = useMemo(() => {
    if (!selectedEvent) return []
    return getEventWeeks(selectedEvent.start_date, selectedEvent.end_date, selectedEvent.active_days || [], holidays)
  }, [selectedEvent, holidays])
  const selectedWeek = weeks.find(w => w.weekNumber === selectedWeekNum) ?? null

  // Load initial data — wait for teacher to be hydrated from auth store
  useEffect(() => {
    if (teacher?.id) loadBaseData()
  }, [teacher?.id])

  // Load all attendance for analytics when event/class changes
  useEffect(() => {
    if (selectedEventId && selectedClassId && activeTab === 'analytics') {
      loadAllAttendance()
    }
  }, [selectedEventId, selectedClassId, activeTab])

  // Attendance reminder (separate effect, runs once)
  useEffect(() => {
    const hours = new Date().getHours()
    if (hours >= 8 && hours <= 17) {
      const timer = setTimeout(() => setReminderOpen(true), 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  const loadBaseData = async () => {
    setLoading(true)
    try {
      // Load events + teacher assignments concurrently
      const [evRes, assignRes] = await Promise.all([
        supabase.from('tuition_events').select('*').order('created_at', { ascending: false }),
        supabase
          .from('teacher_assignments')
          .select('class_id, class:classes(id, name)')
          .eq('teacher_id', teacher?.id ?? '')
          .eq('is_class_teacher', true),
      ])

      const events = evRes.data ?? []
      setTuitionEvents(events)

      // Unique classes from assignments
      const classes = (assignRes.data ?? [])
        .map((a: any) => a.class)
        .filter(Boolean)
        .filter((c: any, i: number, arr: any[]) => arr.findIndex(x => x.id === c.id) === i)
      setMyClasses(classes)

      // Auto-select active event
      const activeEvent = events.find(e => e.is_active)
      if (activeEvent) {
        setSelectedEventId(activeEvent.id)
        
        // Parallelize holiday loading and week selection
        const holidayPromise = supabase
          .from('holidays')
          .select('date')
          .gte('date', activeEvent.start_date)
          .lte('date', activeEvent.end_date)

        const { data: hols } = await holidayPromise
        const holidayDates = (hols ?? []).map(h => h.date)
        setHolidays(holidayDates)

        // Auto-select current week
        const safeActiveDays = activeEvent.active_days || []
        const currentWeek = getCurrentWeekNumber(activeEvent.start_date, activeEvent.end_date, safeActiveDays, holidayDates)
        setSelectedWeekNum(currentWeek)
      }
    } finally {
      setLoading(false)
    }
  }

  // Optimize holiday loading when event changes
  useEffect(() => {
    if (!selectedEvent) return
    let active = true
    const loadHols = async () => {
      const { data } = await supabase
        .from('holidays')
        .select('date')
        .gte('date', selectedEvent.start_date)
        .lte('date', selectedEvent.end_date)
      if (active) setHolidays((data ?? []).map(h => h.date))
    }
    loadHols()
    return () => { active = false }
  }, [selectedEventId])

  // Update selected date when week changes
  useEffect(() => {
    if (!selectedWeek) return
    const today = new Date().toISOString().split('T')[0]
    if (selectedWeek.activeDates.includes(today)) {
      setSelectedDate(today)
    } else if (selectedWeek.activeDates.length > 0) {
      setSelectedDate(selectedWeek.activeDates[0])
    }
  }, [selectedWeekNum, weeks])

  // Load students when class/event/date changes
  useEffect(() => {
    if (selectedClassId && selectedEventId && selectedDate) {
      loadStudents()
    } else {
      setStudents([])
      setAttendance({})
      setAlreadyMarked(false)
    }
  }, [selectedClassId, selectedEventId, selectedDate])

  const loadStudents = async () => {
    setStudentsLoading(true)
    setPage(1)

    const [studRes, attRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, full_name, admission_number')
        .eq('class_id', selectedClassId)
        .order('full_name'),
      supabase
        .from('attendance')
        .select('student_id, status, notes')
        .eq('tuition_event_id', selectedEventId)
        .eq('class_id', selectedClassId)
        .eq('date', selectedDate),
    ])

    const studentList = studRes.data ?? []
    const existing = attRes.data ?? []
    setStudents(studentList)
    setAlreadyMarked(existing.length > 0)

    const map = studentList.reduce((acc, s) => {
      const found = existing.find(e => e.student_id === s.id)
      acc[s.id] = { status: (found?.status as AttendanceStatus) ?? 'present', notes: found?.notes ?? '' }
      return acc
    }, {} as Record<string, AttendanceEntry>)
    setAttendance(map)
    setStudentsLoading(false)
  }

  const confirmSubmit = async () => {
    setSaving(true)
    setPreviewOpen(false)
    const items = Object.entries(attendance).map(([studentId, data]) => ({
      student_id: studentId,
      tuition_event_id: selectedEventId,
      class_id: selectedClassId,
      date: selectedDate,
      week_number: selectedWeekNum,
      status: data.status,
      notes: data.notes,
    }))

    const { error } = await supabase.from('attendance').upsert(items, {
      onConflict: 'student_id,tuition_event_id,date,class_id',
    })

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('✅ Attendance saved successfully!')
      setAlreadyMarked(true)
    }
    setSaving(false)
    loadAllAttendance() // Refresh analytics
  }

  const loadAllAttendance = async () => {
    if (!selectedEventId || !selectedClassId) return
    setAnalyticsLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('tuition_event_id', selectedEventId)
      .eq('class_id', selectedClassId)
    setAllAttendance(data ?? [])
    setAnalyticsLoading(false)
  }

  const exportToCSV = (type: 'student' | 'class', duration: 'week' | 'full', studentId?: string) => {
    const targetStudents = type === 'student' ? students.filter(s => s.id === studentId) : students
    const targetDates = duration === 'week' ? (selectedWeek?.activeDates || []) : (weeks.flatMap(w => w.activeDates))
    
    let csv = 'Student,Admission No.,' + targetDates.map(d => formatDate(d, 'short')).join(',') + ',Avg %\n'
    
    targetStudents.forEach(s => {
      const row = [s.full_name, s.admission_number]
      let attended = 0
      targetDates.forEach(d => {
        const entry = allAttendance.find(a => a.student_id === s.id && a.date === d)
        row.push(entry?.status || 'N/A')
        if (entry?.status === 'present') attended++
      })
      const avg = calculateAttendancePercentage(attended, targetDates.length)
      row.push(`${avg}%`)
      csv += row.join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${type}_${duration}_${formatDate(new Date(), 'short')}.csv`
    a.click()
  }

  // Pagination
  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE)
  const paginatedStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => {
    const vals = Object.values(attendance)
    return {
      present: vals.filter(v => v.status === 'present').length,
      absent: vals.filter(v => v.status === 'absent').length,
      late: vals.filter(v => v.status === 'late').length,
      excused: vals.filter(v => v.status === 'excused').length,
    }
  }, [attendance])

  const analyticsStats = useMemo(() => {
    if (allAttendance.length === 0) return { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
    
    // For progress-aware: only count days up to today
    const today = new Date().toISOString().split('T')[0]
    const relevantAttendance = allAttendance.filter(a => a.date <= today)
    
    return {
      present: relevantAttendance.filter(a => a.status === 'present').length,
      absent: relevantAttendance.filter(a => a.status === 'absent').length,
      late: relevantAttendance.filter(a => a.status === 'late').length,
      excused: relevantAttendance.filter(a => a.status === 'excused').length,
      total: relevantAttendance.length
    }
  }, [allAttendance])

  const chartData = useMemo(() => {
    if (!selectedWeek) return []
    return selectedWeek.activeDates.map(date => {
      const dayEntries = allAttendance.filter(a => a.date === date)
      const present = dayEntries.filter(a => a.status === 'present').length
      return {
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        date,
        present,
        total: students.length
      }
    })
  }, [allAttendance, selectedWeek, students])

  if (authLoading || (loading && !teacher)) return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 rounded-xl animate-pulse" style={{ background: 'var(--input)' }} />
      <SkeletonList count={8} />
    </div>
  )

  if (!teacher) return (
    <div className="p-6 py-24 text-center" style={{ color: 'var(--text-muted)' }}>
      <p className="text-sm">Unable to load teacher profile. Please refresh the page.</p>
    </div>
  )

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 rounded-xl animate-pulse" style={{ background: 'var(--input)' }} />
      <SkeletonList count={8} />
    </div>
  )

  // Block rendering if not authorized
  if (teacher && !teacher.is_class_teacher) {
    return null
  }

  return (
    <div className="p-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <ClipboardCheck size={24} className="text-primary" /> Attendance Center
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {selectedEvent
              ? `${selectedEvent.name} · ${activeTab === 'mark' ? `Week ${selectedWeekNum} · ${formatDate(selectedDate, 'long')}` : 'Performance Insights'}`
              : 'Select a tuition event to begin'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'mark' && selectedClassId && students.length > 0 && (
            <Button onClick={() => setPreviewOpen(true)} isLoading={saving} className="hidden md:flex">
              <Eye size={16} /> Preview & Submit
            </Button>
          )}
          {activeTab === 'analytics' && (
            <Button variant="secondary" onClick={() => exportToCSV('class', 'full')}>
              <Download size={16} /> Export All
            </Button>
          )}
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex p-1 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] w-fit">
        <button 
          onClick={() => setActiveTab('mark')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'mark' ? 'bg-[var(--card)] text-primary shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
        >
          <ClipboardCheck size={18} /> Mark Register
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'analytics' ? 'bg-[var(--card)] text-primary shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
        >
          <BarChart3 size={18} /> Analytics {analyticsLoading && <Clock size={12} className="animate-spin" />}
        </button>
      </div>

      {/* Already marked banner */}
      <AnimatePresence>
        {alreadyMarked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <div>
              <div className="font-bold text-sm text-emerald-600">Attendance already submitted</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                You can still edit and re-submit to make corrections.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Holiday warning for selected date */}
      {holidays.includes(selectedDate) && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <AlertTriangle size={20} style={{ color: '#F59E0B' }} className="shrink-0" />
          <div className="text-sm font-semibold" style={{ color: '#F59E0B' }}>
            ⚠️ This date is a public or custom holiday. Are you sure you want to mark attendance?
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <Select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            label="Tuition Event"
          >
            <option value="">Select Event</option>
            {tuitionEvents.map(e => (
              <option key={e.id} value={e.id}>{e.name} {e.is_active ? '● Active' : ''}</option>
            ))}
          </Select>

          <Select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            label="My Class"
          >
            <option value="">Select Class</option>
            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <Select
            value={selectedWeekNum.toString()}
            onChange={e => setSelectedWeekNum(parseInt(e.target.value))}
            label="Week"
            disabled={weeks.length === 0}
          >
            {weeks.map(w => (
              <option key={w.weekNumber} value={w.weekNumber}>{w.label}</option>
            ))}
            {weeks.length === 0 && <option>No weeks available</option>}
          </Select>

          <Select
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            label="Date"
            disabled={!selectedWeek}
          >
            {selectedWeek?.activeDates.map(d => (
              <option key={d} value={d}>
                {new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </option>
            ))}
          </Select>

          <Input
            label="Search"
            placeholder="Name or Admission No."
            leftIcon={<Search size={14} />}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        {selectedWeek?.hasHolidays && (
          <div className="mt-3 flex items-center gap-2 text-xs px-1" style={{ color: '#F59E0B' }}>
            <AlertTriangle size={12} />
            This week has holidays — {5 - selectedWeek.activeDates.length} day(s) removed
          </div>
        )}
      </Card>

      {/* Empty state: no class selected */}
      {!selectedClassId && (
        <div className="py-24 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--input)' }}>
            <ClipboardCheck size={36} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text)' }}>
            {myClasses.length === 0 ? 'No Classes Assigned' : 'Select your class to begin'}
          </h3>
          <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
            {myClasses.length === 0 
              ? 'You have not been assigned as a class teacher to any classes yet.' 
              : 'Select a class from the dropdown menu above to mark attendance.'}
          </p>
        </div>
      )}

      {/* No event selected */}
      {selectedClassId && !selectedEventId && (
        <div className="py-16 text-center">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Please select a tuition event to continue.</p>
        </div>
      )}

      {/* Student list */}
      {selectedClassId && selectedEventId && (
        <>
      {/* Tab Content */}
      {activeTab === 'mark' ? (
        selectedEvent && selectedEvent.start_date > new Date().toISOString().split('T')[0] ? (
          <div className="py-20 text-center space-y-3">
             <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
                <Clock size={32} />
             </div>
             <h4 className="font-black text-amber-600">Event Hasn't Started</h4>
             <p className="text-sm max-w-sm mx-auto text-[var(--text-muted)]">
               You cannot mark attendance for a tuition event that begins in the future ({new Date(selectedEvent.start_date).toLocaleDateString()}).
             </p>
          </div>
        ) : (
        <>
          {/* Live Stats */}
          {students.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Present', count: stats.present, color: '#10B981', icon: <CheckCircle2 size={16} /> },
                { label: 'Absent', count: stats.absent, color: '#EF4444', icon: <XCircle size={16} /> },
                { label: 'Late', count: stats.late, color: '#F59E0B', icon: <Clock size={16} /> },
                { label: 'Excused', count: stats.excused, color: '#6366F1', icon: <AlertCircle size={16} /> },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + '20', color: s.color }}>
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-xl font-black" style={{ color: s.color }}>{s.count}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--input)', borderBottom: '1px solid var(--card-border)' }}>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {studentsLoading ? 'Loading...' : `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''}`}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => {
                  const bulk = Object.fromEntries(students.map(s => [s.id, { status: 'present' as AttendanceStatus, notes: '' }]))
                  setAttendance(bulk)
                }} className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm shadow-emerald-500/20 flex-1 sm:flex-none min-w-[120px]">
                  <CheckCircle2 size={14} className="mr-1" /> All Present
                </Button>
                <Button size="sm" onClick={() => {
                  const bulk = Object.fromEntries(students.map(s => [s.id, { status: 'absent' as AttendanceStatus, notes: '' }]))
                  setAttendance(bulk)
                }} className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm shadow-red-500/20 flex-1 sm:flex-none min-w-[120px]">
                  <XCircle size={14} className="mr-1" /> All Absent
                </Button>
              </div>
            </div>

            {studentsLoading ? (
              <div className="p-4"><SkeletonList count={8} /></div>
            ) : paginatedStudents.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                {students.length === 0 ? 'No students in this class.' : 'No students match your search.'}
              </div>
            ) : (
              <div className="divide-y divide-[var(--card-border)]">
                {paginatedStudents.map((s, i) => {
                  const entry = attendance[s.id] ?? { status: 'present', notes: '' }
                  const statusColors: Record<string, string> = {
                    present: '#10B981', absent: '#EF4444', late: '#F59E0B', excused: '#6366F1'
                  }
                  const color = statusColors[entry.status]

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ background: color + '20', color, border: `2px solid ${color}40` }}
                        >
                          {s.full_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{s.full_name}</div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.admission_number}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(status => (
                          <button
                            key={status}
                            onClick={() => setAttendance(prev => ({ ...prev, [s.id]: { ...prev[s.id], status } }))}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border"
                            style={{
                              background: entry.status === status ? statusColors[status] : 'transparent',
                              color: entry.status === status ? 'white' : 'var(--text-muted)',
                              borderColor: entry.status === status ? 'transparent' : 'var(--card-border)',
                            }}
                          >
                            {status}
                          </button>
                        ))}
                        <input
                          className="border rounded-lg px-2 py-1.5 text-xs w-28"
                          placeholder="Note..."
                          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                          value={entry.notes}
                          onChange={e => setAttendance(prev => ({ ...prev, [s.id]: { ...prev[s.id], notes: e.target.value } }))}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--card-border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={14} />
                  </Button>
                  <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {students.length > 0 && (
            <div className="md:hidden sticky bottom-20 px-4">
              <Button className="w-full py-4 shadow-2xl" onClick={() => setPreviewOpen(true)} isLoading={saving}>
                <Eye size={18} /> Preview & Submit
              </Button>
            </div>
          )}
        </>
        )
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsCard label="Overall Average" value={`${calculateAttendancePercentage(analyticsStats.present, analyticsStats.total)}%`} icon={<TrendingUp size={20} />} trend="+2.4%" color="var(--primary)" />
            <AnalyticsCard label="Present Days" value={analyticsStats.present} icon={<UserCheck size={20} />} subValue={`${analyticsStats.total} total sessions`} color="#10B981" />
            <AnalyticsCard label="Missed Sessions" value={analyticsStats.absent} icon={<UserX size={20} />} subValue="Action needed" color="#EF4444" />
            <AnalyticsCard label="Excused Absences" value={analyticsStats.excused} icon={<Info size={20} />} subValue="Documented" color="#6366F1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}><History size={18} /> Weekly Attendance Trend</h3>
                  <Badge variant="muted">Current Week</Badge>
               </div>
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                        <defs>
                           <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'var(--card)', color: 'var(--text)' }} />
                        <Area type="monotone" dataKey="present" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </Card>

            <Card className="p-6">
               <h3 className="font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}><Info size={18} /> Distribution</h3>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={[
                          { name: 'Present', value: analyticsStats.present, color: '#10B981' },
                          { name: 'Absent', value: analyticsStats.absent, color: '#EF4444' },
                          { name: 'Late', value: analyticsStats.late, color: '#F59E0B' },
                          { name: 'Excused', value: analyticsStats.excused, color: '#6366F1' },
                        ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                           { [0,1,2,3].map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={['#10B981', '#EF4444', '#F59E0B', '#6366F1'][index]} />
                           ))}
                        </Pie>
                        <Tooltip />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="grid grid-cols-2 gap-2 mt-4">
                  {['Present', 'Absent', 'Late', 'Excused'].map((l, i) => (
                    <div key={l} className="flex items-center gap-2 text-[10px] font-bold tracking-tighter uppercase" style={{ color: 'var(--text-muted)' }}>
                       <div className="w-2 h-2 rounded-full" style={{ background: ['#10B981', '#EF4444', '#F59E0B', '#6366F1'][i] }} /> {l}
                    </div>
                  ))}
               </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
             <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
                <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Student Specific Analytics</h3>
                <div className="flex gap-2">
                   <Input className="w-48" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                   <thead style={{ background: 'var(--input)' }}>
                      <tr>
                         <th className="px-4 py-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Student</th>
                         <th className="px-4 py-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Attendance Rate</th>
                         <th className="px-4 py-3 font-black uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Brief (Sessions)</th>
                         <th className="px-4 py-3 font-black uppercase text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[var(--card-border)]">
                      {filteredStudents.map(s => {
                         const sAtt = allAttendance.filter(a => a.student_id === s.id)
                         const rate = calculateAttendancePercentage(sAtt.filter(a => a.status === 'present').length, sAtt.length || 1)
                         return (
                            <tr key={s.id} className="hover:bg-[var(--input)] transition-colors cursor-pointer group" onClick={() => setSelectedStudentId(s.id)}>
                               <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                     <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] bg-primary/10 text-primary">
                                        {s.full_name[0]}
                                     </div>
                                     <span className="font-bold" style={{ color: 'var(--text)' }}>{s.full_name}</span>
                                  </div>
                               </td>
                               <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                     <div className="flex-1 h-1.5 rounded-full bg-[var(--input)] overflow-hidden w-20">
                                        <div className="h-full bg-primary" style={{ width: `${rate}%` }} />
                                     </div>
                                     <span className="font-black text-primary">{rate}%</span>
                                  </div>
                               </td>
                               <td className="px-4 py-4">
                                  <div className="flex gap-1.5">
                                     <Badge variant="success" className="text-[9px] py-0 px-1">{sAtt.filter(a => a.status === 'present').length}P</Badge>
                                     <Badge variant="warning" className="text-[9px] py-0 px-1">{sAtt.filter(a => a.status === 'absent').length}A</Badge>
                                     <Badge variant="muted" className="text-[9px] py-0 px-1">{sAtt.filter(a => a.status === 'excused').length}E</Badge>
                                  </div>
                               </td>
                               <td className="px-4 py-4 text-right">
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><TrendingUp size={14} /></Button>
                                </td>
                            </tr>
                         )
                      })}
                   </tbody>
                </table>
             </div>
          </Card>
        </div>
      )}
        </>
      )}

      {/* Preview Modal */}
      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview Attendance" size="lg">
        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--input)' }}>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div><div className="text-2xl font-black text-emerald-500">{stats.present}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>Present</div></div>
              <div><div className="text-2xl font-black text-red-400">{stats.absent}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>Absent</div></div>
              <div><div className="text-2xl font-black text-amber-400">{stats.late}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>Late</div></div>
              <div><div className="text-2xl font-black text-indigo-400">{stats.excused}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>Excused</div></div>
            </div>
            <div className="text-center text-xs mt-3 font-semibold" style={{ color: 'var(--text-muted)' }}>
              {formatDate(selectedDate, 'long')} · {selectedEvent?.name} · Week {selectedWeekNum}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--card-border)] rounded-xl" style={{ border: '1px solid var(--card-border)' }}>
            {students.map(s => {
              const entry = attendance[s.id] ?? { status: 'present', notes: '' }
              const icon = entry.status === 'present' ? '✅' : entry.status === 'absent' ? '❌' : entry.status === 'late' ? '🕐' : 'ℹ️'
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{s.full_name}</div>
                    {entry.notes && <div className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>{entry.notes}</div>}
                  </div>
                  <span className="text-sm">{icon} <span className="capitalize text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{entry.status}</span></span>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPreviewOpen(false)}>
              ← Go Back & Edit
            </Button>
            <Button className="flex-1" onClick={confirmSubmit} isLoading={saving}>
              <Save size={16} /> Confirm & Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reminder Modal */}
      <Modal isOpen={reminderOpen} onClose={() => setReminderOpen(false)} title="Attendance Reminder" size="sm">
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <ClipboardCheck size={32} className="text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Don&apos;t forget attendance!</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Please mark attendance for your class to keep records up to date.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setReminderOpen(false)}>Later</Button>
            <Button className="flex-1" onClick={() => { setReminderOpen(false); if (myClasses.length > 0) setSelectedClassId(myClasses[0].id) }}>
              Start Now
            </Button>
          </div>
        </div>
      </Modal>

      <StudentAnalyticsModal 
         studentId={selectedStudentId} 
         onClose={() => setSelectedStudentId(null)}
         allAttendance={allAttendance}
         weeks={weeks}
         studentName={students.find(s => s.id === selectedStudentId)?.full_name || ''}
      />
    </div>
  )
}

function AnalyticsCard({ label, value, icon, subValue, trend, color }: any) {
  return (
    <Card className="p-5 flex flex-col gap-1 border-b-4" style={{ borderBottomColor: color }}>
       <div className="flex items-center justify-between">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: color + '15', color }}>
             {icon}
          </div>
          {trend && <span className="text-[10px] font-black text-emerald-500">{trend}</span>}
       </div>
       <div className="text-2xl font-black mt-2" style={{ color: 'var(--text)' }}>{value}</div>
       <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
       {subValue && <div className="text-[10px] italic mt-1" style={{ color: 'var(--text-muted)' }}>{subValue}</div>}
    </Card>
  )
}

function StudentAnalyticsModal({ studentId, onClose, allAttendance, weeks, studentName }: any) {
  const [selectedWeekNum, setSelectedWeekNum] = useState(1)
  const currentWeekNum = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return weeks.find((w: any) => {
        const wStart = w.startDate instanceof Date ? w.startDate.toISOString().split('T')[0] : w.startDate
        const wEnd = w.endDate instanceof Date ? w.endDate.toISOString().split('T')[0] : w.endDate
        return today >= wStart && today <= wEnd
    })?.weekNumber || 1
  }, [weeks])

  useEffect(() => { if (studentId) setSelectedWeekNum(currentWeekNum) }, [studentId, currentWeekNum])

  const selectedWeek = weeks.find((w: any) => w.weekNumber === selectedWeekNum)
  const weekAttendance = allAttendance.filter((a: any) => a.student_id === studentId && (selectedWeek?.activeDates || []).includes(a.date))
  
  const isFuture = selectedWeekNum > currentWeekNum

  const stats = useMemo(() => {
    const attended = weekAttendance.filter((a: any) => a.status === 'present').length
    const missed = weekAttendance.filter((a: any) => a.status === 'absent').length
    const excused = weekAttendance.filter((a: any) => a.status === 'excused').length
    return { attended, missed, excused, avg: calculateAttendancePercentage(attended, weekAttendance.length || 0) }
  }, [weekAttendance])

  return (
    <Modal isOpen={!!studentId} onClose={onClose} title="Student Performance Deep-Dive" size="xl">
       <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-3xl bg-[var(--input)] border border-[var(--card-border)]">
             <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 shrink-0">
                   {studentName ? studentName[0] : '?'}
                </div>
                <div className="min-w-0">
                   <h3 className="font-black text-base truncate" style={{ color: 'var(--text)' }}>{studentName}</h3>
                   <div className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Viewing Analytics</div>
                </div>
             </div>
             <Select value={selectedWeekNum.toString()} onChange={e => setSelectedWeekNum(parseInt(e.target.value))} className="w-full sm:w-44">
                {weeks.map((w: any) => <option key={w.weekNumber} value={w.weekNumber}>{w.label}</option>)}
             </Select>
          </div>

          {isFuture ? (
             <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500 animate-pulse">
                   <Clock size={32} />
                </div>
                <h4 className="font-black text-amber-600">Future Week Selected</h4>
                <p className="text-sm max-w-xs mx-auto text-[var(--text-muted)]">Data for this week hasn&apos;t been generated yet. Please check back once the week begins.</p>
             </div>
          ) : (
             <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <div className="text-2xl font-black text-emerald-600">{stats.attended}</div>
                      <div className="text-[10px] font-bold uppercase text-emerald-700/60">Attended</div>
                   </div>
                   <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                      <div className="text-2xl font-black text-rose-600">{stats.missed}</div>
                      <div className="text-[10px] font-bold uppercase text-rose-700/60">Missed</div>
                   </div>
                   <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                      <div className="text-2xl font-black text-indigo-600">{stats.excused}</div>
                      <div className="text-[10px] font-bold uppercase text-indigo-700/60">Excused</div>
                   </div>
                   <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center">
                      <div className="text-2xl font-black text-primary">{stats.avg}%</div>
                      <div className="text-[10px] font-bold uppercase text-primary/60">Average</div>
                   </div>
                </div>

                <Card className="p-0 overflow-hidden border border-[var(--card-border)] bg-[var(--input)]/30">
                   <div className="px-4 py-3 font-black text-[10px] uppercase tracking-widest border-b border-[var(--card-border)]" style={{ color: 'var(--text-muted)' }}>
                      Weekly Status Timeline
                   </div>
                   <div className="p-4 flex flex-wrap gap-3">
                      {(selectedWeek?.activeDates || []).map((date: string) => {
                         const entry = weekAttendance.find((a: any) => a.date === date)
                         const status = entry?.status || 'unmarked'
                         const colors: any = { present: '#10B981', absent: '#EF4444', excused: '#6366F1', late: '#F59E0B', unmarked: 'var(--card-border)' }
                         return (
                            <div key={date} className="flex-1 min-w-[100px] p-3 rounded-2xl border bg-[var(--card)] flex flex-col items-center gap-2" style={{ borderColor: status === 'unmarked' ? 'var(--card-border)' : colors[status] + '40' }}>
                               <div className="text-[10px] font-black uppercase text-[var(--text-muted)]">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                               <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm" style={{ background: colors[status], color: 'white' }}>
                                  {status === 'present' ? <Check size={16} /> : status === 'absent' ? <UserX size={16} /> : status === 'unmarked' ? <Clock size={16} className="text-muted" /> : <Info size={16} />}
                               </div>
                               <div className="text-[10px] font-bold capitalize" style={{ color: colors[status] === 'var(--card-border)' ? 'var(--text-muted)' : colors[status] }}>{status}</div>
                            </div>
                         )
                      })}
                   </div>
                </Card>
             </>
          )}

          <div className="flex gap-3 pt-4">
             <Button variant="secondary" className="flex-1 rounded-2xl font-black uppercase text-[10px]" onClick={onClose}>Close Intelligence</Button>
             <Button className="flex-1 rounded-2xl font-black uppercase text-[10px]">Generate Full PDF Report</Button>
          </div>
       </div>
    </Modal>
    )
}
