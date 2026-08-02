'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Search, User, Calendar, CheckCircle, Loader2,
  X, Receipt, RefreshCw, AlertCircle, Plus,
  Banknote, Smartphone, Building2, CreditCard, Filter,
  ArrowRight, Check, Clock, TrendingUp, Send,
  Eye, Bell, Phone, CalendarClock, StickyNote, Zap, Star, ChevronRight, AlertTriangle, Circle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, getEventWeeks, getArrearsStatus } from '@/lib/utils'
import { computeCoverage, nextUncoveredDates } from '@/lib/payment-coverage'
import { defaultDailyRateFor } from '@/lib/billing-rates'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { Modal } from '@/components/ui/Modal'
import { Receipt as ReceiptViewer } from '@/components/Receipt'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Registration {
  id: string
  student_name: string
  tuition_event_id: string
  class_id: string | null
  tuition_center_id: string | null
  class_level?: string | null
  curriculum_label?: string | null
  status?: string | null
  parent_phone?: string | null
  parent_name?: string | null
  class?: { id: string; name: string; curriculum_id: string }
  center?: { name: string }
  student?: { id: string }
}

interface TuitionEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  active_days: string[]
  is_active: boolean
  status?: string
  daily_rate: number
}

interface ClassSlot {
  class_id: string
  curriculum_id: string
  charge_amount: number | null
  charge_currency: string | null
  charge_frequency: string | null
  charge_unit_label: string | null
}

/** per-day allocation status */
export type DayStatus = 'paid' | 'part-paid' | 'unpaid' | 'credit'

export interface DayAllocation {
  date: string
  status: DayStatus
  /** amount allocated to this day (0 for unpaid) */
  allocated: number
}

interface DBPayment {
  id: string
  amount: number
  expected_amount: number | null
  balance_amount: number | null
  class_charge_per_day: number | null
  allocated_days: DayAllocation[] | null
  payment_date: string
  paid_dates: string | null
  method: string
  receipt_number: string
  student_id: string | null
  student_name: string
  week_number: number | null
  is_published?: boolean
  follow_up_date?: string | null
  follow_up_note?: string | null
}

interface OverdueFollowUp {
  id: string
  student_name: string
  balance_amount: number
  follow_up_date: string
  follow_up_note: string | null
  receipt_number: string
  parent_phone: string | null
  parent_name: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METHODS = [
  { value: 'Cash', icon: <Banknote size={16} />, color: '#10B981' },
  { value: 'M-Pesa', icon: <Smartphone size={16} />, color: '#00B900' },
  { value: 'Bank Transfer', icon: <Building2 size={16} />, color: '#3B82F6' },
  { value: 'Cheque', icon: <CreditCard size={16} />, color: '#8B5CF6' },
]

function generateReceiptNumber() {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RCP-${ts}-${rand}`
}

// ─── Core allocation algorithm ─────────────────────────────────────────────
/**
 * Allocates a paid amount across unpaid dates, oldest-first.
 * Supports: paid, part-paid, credit (excess).
 */
function allocatePaymentToDays(
  paidAmount: number,
  unpaidDates: string[],   // sorted oldest first
  dailyRate: number
): { allocations: DayAllocation[]; credit: number } {
  if (dailyRate <= 0 || unpaidDates.length === 0) {
    return { allocations: [], credit: paidAmount }
  }

  let remaining = paidAmount
  const allocations: DayAllocation[] = []

  for (const date of unpaidDates) {
    if (remaining <= 0) break
    if (remaining >= dailyRate) {
      allocations.push({ date, status: 'paid', allocated: dailyRate })
      remaining -= dailyRate
    } else {
      allocations.push({ date, status: 'part-paid', allocated: remaining })
      remaining = 0
    }
  }

  return { allocations, credit: Math.max(0, remaining) }
}

/** Derive daily rate from a class slot's charge data and active days in week */
function deriveClassDailyRate(slot: ClassSlot | null, activeDaysCount: number, fallbackDailyRate: number): number {
  if (!slot?.charge_amount || Number(slot.charge_amount) <= 0) return fallbackDailyRate
  const amount = Number(slot.charge_amount)
  const freq = (slot.charge_frequency || '').toLowerCase()
  if (freq.includes('day') || freq === 'daily') return amount
  if (freq.includes('week') || freq === 'weekly') return activeDaysCount > 0 ? amount / activeDaysCount : amount / 5
  // default: treat as weekly
  return activeDaysCount > 0 ? amount / activeDaysCount : amount / 5
}

function deriveWeeklyRate(slot: ClassSlot | null, activeDaysCount: number, fallbackDailyRate: number): number {
  const daily = deriveClassDailyRate(slot, activeDaysCount, fallbackDailyRate)
  return daily * (activeDaysCount || 5)
}

function dayStatusColor(status: DayStatus) {
  switch (status) {
    case 'paid': return 'bg-emerald-500'
    case 'part-paid': return 'bg-amber-500'
    case 'credit': return 'bg-blue-500'
    default: return 'bg-slate-300'
  }
}

function dayStatusLabel(status: DayStatus) {
  switch (status) {
    case 'paid': return 'Paid'
    case 'part-paid': return 'Part-paid'
    case 'credit': return 'Credit'
    default: return 'Unpaid'
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentManagement() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()

  // Core state
  const [events, setEvents] = useState<TuitionEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<TuitionEvent | null>(null)
  const [weeks, setWeeks] = useState<any[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)

  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([])
  const [curriculums, setCurriculums] = useState<{ id: string; name: string }[]>([])
  const [classes, setClasses] = useState<{ id: string; name: string; curriculum_id: string }[]>([])
  const [eventSlots, setEventSlots] = useState<ClassSlot[]>([])

  const [selectedCenterId, setSelectedCenterId] = useState('')
  const [selectedCurriculum, setSelectedCurriculum] = useState('')
  const [selectedClass, setSelectedClass] = useState('')

  const [studentSearch, setStudentSearch] = useState('')
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null)

  const [studentPayments, setStudentPayments] = useState<DBPayment[]>([])
  // Attendance rows for the selected student (any status — used for the trust
  // indicator) plus the finance-owned day marks (manual "used day" overrides).
  const [attendanceRows, setAttendanceRows] = useState<{ date: string; status: string | null }[]>([])
  const [dayMarks, setDayMarks] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [loadRef, setLoadRef] = useState(0)

  // Class charge state
  const [classSlot, setClassSlot] = useState<ClassSlot | null>(null)

  // Payment form
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('Cash')
  const [submitting, setSubmitting] = useState(false)
  const [receiptNumber, setReceiptNumber] = useState(generateReceiptNumber())
  const [paymentNote, setPaymentNote] = useState('')

  // Follow-up state (set after recording partial payment)
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null)
  const [showFollowUpPanel, setShowFollowUpPanel] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const [savingFollowUp, setSavingFollowUp] = useState(false)

  // Overdue follow-ups reminder
  const [overdueFollowUps, setOverdueFollowUps] = useState<OverdueFollowUp[]>([])
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  // Receipt viewer
  const [viewingReceipt, setViewingReceipt] = useState<DBPayment | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)

  // ─── Initialization ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      supabase.from('tuition_events').select('*').order('start_date', { ascending: false }).limit(10),
      supabase.from('tuition_centers').select('id, name').order('name'),
      supabase.from('curriculums').select('id, name'),
      supabase.from('classes').select('id, name, curriculum_id'),
    ]).then(([evRes, centerRes, currRes, classRes]) => {
      const evList = ((evRes.data ?? []) as TuitionEvent[]).sort((a, b) => {
        const aA = a.is_active || a.status === 'active'
        const bA = b.is_active || b.status === 'active'
        if (aA !== bA) return aA ? -1 : 1
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      })
      setEvents(evList)
      setSelectedEvent(evList.find(e => e.is_active || e.status === 'active') ?? evList[0] ?? null)
      setCenters(centerRes.data ?? [])
      setCurriculums(currRes.data ?? [])
      setClasses(classRes.data ?? [])
    })
  }, [supabase])

  // Check overdue follow-ups once on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('payments')
      .select('id, student_name, balance_amount, follow_up_date, follow_up_note, receipt_number')
      .lte('follow_up_date', today)
      .gt('balance_amount', 0)
      .then(async ({ data: payRows }) => {
        if (!payRows || payRows.length === 0) return
        // Enrich with parent phone from event_registrations
        const names = [...new Set(payRows.map((p: any) => p.student_name as string))]
        const { data: regs } = await supabase
          .from('event_registrations')
          .select('student_name, parent_phone, parent_name')
          .in('student_name', names)
        const regMap: Record<string, { parent_phone: string | null; parent_name: string | null }> = {}
        regs?.forEach((r: any) => { regMap[r.student_name] = { parent_phone: r.parent_phone, parent_name: r.parent_name } })

        const enriched: OverdueFollowUp[] = payRows.map((p: any) => ({
          id: p.id,
          student_name: p.student_name,
          balance_amount: Number(p.balance_amount),
          follow_up_date: p.follow_up_date,
          follow_up_note: p.follow_up_note,
          receipt_number: p.receipt_number,
          parent_phone: regMap[p.student_name]?.parent_phone ?? null,
          parent_name: regMap[p.student_name]?.parent_name ?? null,
        }))
        setOverdueFollowUps(enriched)
        if (enriched.length > 0) setShowReminderModal(true)
      })
  }, [supabase])

  // Load event slots + registrations when event changes
  useEffect(() => {
    if (!selectedEvent) return
    const evWeeks = getEventWeeks(selectedEvent.start_date, selectedEvent.end_date, selectedEvent.active_days)
    setWeeks(evWeeks)
    setSelectedWeekIndex(0)
    setSelectedReg(null)
    setStudentSearch('')
    setStudentPayments([])
    setClassSlot(null)

    setLoading(true)
    Promise.all([
      supabase
        .from('event_registrations')
        .select('*, class:classes(id, name, curriculum_id), center:tuition_centers(name), student:students(id)')
        .eq('tuition_event_id', selectedEvent.id),
      supabase
        .from('tuition_event_class_slots')
        .select('class_id, curriculum_id, charge_amount, charge_currency, charge_frequency, charge_unit_label')
        .eq('event_id', selectedEvent.id),
    ]).then(([regRes, slotRes]) => {
      setRegistrations((regRes.data as any) ?? [])
      setEventSlots((slotRes.data as ClassSlot[]) ?? [])
      setLoading(false)
    })
  }, [selectedEvent, supabase])

  // When a registration is selected, resolve class slot and load payments
  useEffect(() => {
    if (!selectedReg) { setClassSlot(null); return }
    const classId = selectedReg.class?.id || selectedReg.class_id
    const curriculumId = selectedReg.class?.curriculum_id
    const slot = eventSlots.find(s =>
      (classId && s.class_id === classId) ||
      (curriculumId && s.curriculum_id === curriculumId && !s.class_id)
    ) ?? null
    setClassSlot(slot)
  }, [selectedReg, eventSlots])

  useEffect(() => {
    setSelectedReg(null)
    setStudentSearch('')
    setStudentPayments([])
  }, [selectedCenterId, selectedCurriculum, selectedClass])

  // ─── Derived values ────────────────────────────────────────────────────────
  const selectedWeek = weeks[selectedWeekIndex]

  const filteredStudents = useMemo(() => {
    const selectedClassRow = selectedClass ? classes.find(c => c.id === selectedClass) : null
    const selectedCurriculumRow = selectedCurriculum ? curriculums.find(c => c.id === selectedCurriculum) : null
    return registrations.filter(r => {
      if (r.status && !['active', 'confirmed', 'registered'].includes(String(r.status).toLowerCase())) return false
      if (selectedCenterId === 'none' && r.tuition_center_id) return false
      if (selectedCenterId && selectedCenterId !== 'none' && r.tuition_center_id && r.tuition_center_id !== selectedCenterId) return false
      if (selectedCurriculum) {
        const classCurriculumMatch = r.class?.curriculum_id === selectedCurriculum
        const labelMatch = selectedCurriculumRow?.name && String(r.curriculum_label || '').toLowerCase() === selectedCurriculumRow.name.toLowerCase()
        if (!classCurriculumMatch && !labelMatch) return false
      }
      if (selectedClass) {
        const classIdMatch = r.class_id === selectedClass
        const classNameMatch = selectedClassRow?.name && String(r.class_level || '').toLowerCase() === selectedClassRow.name.toLowerCase()
        if (!classIdMatch && !classNameMatch) return false
      }
      if (studentSearch && !r.student_name.toLowerCase().includes(studentSearch.toLowerCase())) return false
      return true
    }).slice(0, 20)
  }, [registrations, selectedCenterId, selectedCurriculum, selectedClass, studentSearch, classes, curriculums])

  const activeDaysInWeek = selectedWeek?.activeDates?.length ?? 5
  // Default rate is curriculum/class-aware (CBC KES 200/day, senior/844 KES
  // 250/day) rather than a single event-wide default, so a short holiday week
  // doesn't change what one "day" costs. A class slot still wins if present.
  const fallbackDailyRate = useMemo(() => {
    if (!selectedReg) return selectedEvent?.daily_rate ?? 500
    const curriculumName = selectedReg.class?.curriculum_id
      ? curriculums.find(c => c.id === selectedReg.class?.curriculum_id)?.name
      : selectedReg.curriculum_label
    return defaultDailyRateFor({
      curriculumName,
      className: selectedReg.class?.name ?? null,
      classLevel: selectedReg.class_level ?? null,
    })
  }, [selectedReg, curriculums, selectedEvent])
  const dailyRate = deriveClassDailyRate(classSlot, activeDaysInWeek, fallbackDailyRate)
  const weeklyRate = dailyRate * activeDaysInWeek

  // Build a per-date status map from ALL student payments
  const allAllocatedDays = useMemo<Record<string, DayAllocation>>(() => {
    const map: Record<string, DayAllocation> = {}
    studentPayments.forEach(p => {
      if (p.allocated_days) {
        p.allocated_days.forEach(d => {
          // If a date appears in multiple payments, keep the best status
          const existing = map[d.date]
          if (!existing || d.status === 'paid') map[d.date] = d
        })
      } else if (p.paid_dates) {
        // Legacy: treat paid_dates as fully paid days
        p.paid_dates.split(',').map(s => s.trim()).forEach(date => {
          map[date] = { date, status: 'paid', allocated: dailyRate }
        })
      }
    })
    return map
  }, [studentPayments, dailyRate])

  const weeklyStats = useMemo(() => {
    if (!selectedWeek) return null
    const activeDates: string[] = selectedWeek.activeDates
    let totalPaid = 0
    let paidDates: string[] = []
    let unpaidDates: string[] = []
    let partPaidDates: string[] = []

    activeDates.forEach(date => {
      const alloc = allAllocatedDays[date]
      if (!alloc || alloc.status === 'unpaid') {
        unpaidDates.push(date)
      } else if (alloc.status === 'paid') {
        paidDates.push(date)
        totalPaid += dailyRate
      } else if (alloc.status === 'part-paid') {
        partPaidDates.push(date)
        totalPaid += alloc.allocated
      }
    })

    const totalDue = activeDates.length * dailyRate
    const arrears = Math.max(0, totalDue - totalPaid)
    return { totalDue, totalPaid, arrears, paidDates, unpaidDates, partPaidDates, isFullyPaid: arrears <= 0 }
  }, [selectedWeek, allAllocatedDays, dailyRate])

  // All teaching dates across every week of the event (ascending). Used so a
  // payment can roll across the week boundary into the next week's days.
  const allActiveDates = useMemo(
    () => [...new Set(weeks.flatMap((w: any) => w.activeDates ?? []))].sort(),
    [weeks]
  )

  // Coverage: how many teaching-day credits the student has purchased, how
  // many have been consumed by actual attendance, and the furthest upcoming
  // date the remaining credit reaches ("paid until"). Skipped days don't waste
  // money — only attended days consume credit.
  const totalPaid = useMemo(
    () => studentPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [studentPayments]
  )
  // Days the student actually attended: teacher attendance (present/late)
  // plus finance-marked days. Skipped days (recorded absent / excused / not
  // yet recorded) do NOT consume credit — they roll forward.
  const consumedDates = useMemo(() => {
    const set = new Set<string>()
    attendanceRows.forEach(r => {
      const status = (r.status || '').toLowerCase()
      if (status === 'present' || status === 'late') set.add(r.date)
    })
    Object.entries(dayMarks).forEach(([date, used]) => { if (used) set.add(date) })
    return [...set]
  }, [attendanceRows, dayMarks])
  // Any day with a record at all (any attendance status or a day mark) counts
  // as "recorded" for the trust indicator.
  const recordedDates = useMemo(() => {
    const set = new Set<string>()
    attendanceRows.forEach(r => set.add(r.date))
    Object.keys(dayMarks).forEach(date => set.add(date))
    return [...set]
  }, [attendanceRows, dayMarks])
  const coverage = useMemo(
    () => computeCoverage({
      activeDates: allActiveDates,
      totalPaid,
      attendedDates: consumedDates,
      dailyRate,
      today: new Date().toISOString().split('T')[0],
    }),
    [allActiveDates, totalPaid, consumedDates, dailyRate]
  )
  // Trust indicator: coverage assumes attended == consumed. When the teacher
  // hasn't recorded most of the elapsed sessions yet, coverage can undercount
  // consumption (look "paid until" further out than reality).
  const coverageTrust = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const elapsed = allActiveDates.filter(d => d <= today).length
    const recorded = allActiveDates.filter(d => recordedDates.includes(d)).length
    if (elapsed === 0) return { elapsed, recorded, ratio: 1 }
    return { elapsed, recorded, ratio: recorded / elapsed }
  }, [allActiveDates, recordedDates])

  // Load student payments
  const loadStudentData = useCallback(async () => {
    if (!selectedReg || !selectedEvent) return
    const { data } = await supabase.from('payments')
      .select('*')
      .eq('tuition_event_id', selectedEvent.id)
      .ilike('student_name', selectedReg.student_name)
    setStudentPayments((data as any) ?? [])

    // Attendance is keyed by registration_id (falls back to student_id). The
    // teacher flow records a `status` ('present'/'absent'/'late'/'excused');
    // `present` (boolean) is a legacy column. Attended = present or late. This
    // tells us which teaching days the student actually attended, so unused
    // paid days (skipped sessions) roll forward instead of being wasted.
    const attRes = await supabase.from('attendance')
      .select('date, status')
      .eq('tuition_event_id', selectedEvent.id)
      .eq(selectedReg.id ? 'registration_id' : 'student_id', selectedReg.id || selectedReg.student?.id || '')
    setAttendanceRows(((attRes.data as any[]) ?? []).map(a => ({ date: a.date, status: a.status })))

    // Finance-owned day marks: staff can consume a paid day immediately (mark
    // it "used") when the student attended but the teacher hasn't logged it.
    const marksRes = await supabase.from('payment_day_marks')
      .select('date')
      .eq('registration_id', selectedReg.id)
      .eq('used', true)
    const marks: Record<string, boolean> = {}
    ;((marksRes.data as any[]) ?? []).forEach(m => { marks[m.date] = true })
    setDayMarks(marks)
  }, [selectedReg, selectedEvent, supabase])

  useEffect(() => { loadStudentData() }, [loadStudentData, loadRef])

  // Auto-compute what to collect for the current selection
  const previewAllocation = useMemo(() => {
    if (!selectedWeek || dailyRate <= 0) return null
    const unpaid = weeklyStats?.unpaidDates ?? []
    const partPaid = weeklyStats?.partPaidDates ?? []
    // Remaining for part-paid days
    const partPaidRemaining = partPaid.reduce((sum, date) => {
      const alloc = allAllocatedDays[date]
      return sum + (dailyRate - (alloc?.allocated ?? 0))
    }, 0)
    return { unpaidDates: unpaid, partPaidDates: partPaid, partPaidRemaining }
  }, [selectedWeek, weeklyStats, allAllocatedDays, dailyRate])

  // When week or student changes, reset + auto-set amount to full week due
  useEffect(() => {
    if (!weeklyStats) return
    const due = weeklyStats.arrears
    setAmount(due > 0 ? due : 0)
    setSelectedDates(weeklyStats.unpaidDates)
    setShowFollowUpPanel(false)
    setPendingPaymentId(null)
    setFollowUpDate('')
    setFollowUpNote('')
  }, [selectedWeekIndex, selectedReg])

  // Carry the amount into the next week: when the entered amount exceeds the
  // full cost of the current week (the week's arrears), automatically extend
  // the selection with the next uncovered teaching dates — e.g. paying for 5
  // days on Thursday picks up Thursday + Friday, then Monday–Wednesday of next
  // week. The surplus is computed against the whole week, so a partial day's
  // remainder is settled first and only genuine overpayment rolls over.
  const lastAutoExtendRef = useRef('')
  useEffect(() => {
    if (amount <= 0) return
    const weekRemaining = weeklyStats?.arrears ?? 0
    if (amount <= weekRemaining) return
    const extraDays = Math.ceil((amount - weekRemaining) / dailyRate)
    if (extraDays <= 0) return
    const weekDates = selectedWeek?.activeDates ?? []
    const from = weekDates.length > 0 ? weekDates[weekDates.length - 1] : new Date().toISOString().split('T')[0]
    const extra = nextUncoveredDates({
      count: extraDays,
      activeDates: allActiveDates,
      alreadyCovered: Object.keys(allAllocatedDays),
      from,
    })
    if (extra.length === 0) return
    const key = `${amount}|${weekRemaining}`
    if (lastAutoExtendRef.current === key) return
    lastAutoExtendRef.current = key
    setSelectedDates(prev => [...new Set([...prev, ...extra])].sort())
  }, [amount, weeklyStats, dailyRate, allActiveDates, allAllocatedDays, selectedWeek])

  // Preview what allocation would look like for current amount
  const liveAllocation = useMemo(() => {
    if (!selectedDates.length || dailyRate <= 0 || amount <= 0) return null
    return allocatePaymentToDays(amount, selectedDates, dailyRate)
  }, [amount, selectedDates, dailyRate])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleDateToggle = (date: string) => {
    const alloc = allAllocatedDays[date]
    if (alloc?.status === 'paid') return // fully paid, can't re-select
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date].sort()
    )
  }

  // Manually consume a paid teaching day: marks the date as attended so it
  // counts against credit immediately, without waiting on the teacher. Useful
  // when the student attended today but attendance isn't logged yet.
  const toggleDayMark = async (date: string) => {
    if (!selectedReg || !selectedEvent) return
    const currentlyMarked = !!dayMarks[date]
    setDayMarks(prev => ({ ...prev, [date]: !currentlyMarked }))
    try {
      if (currentlyMarked) {
        const { error } = await supabase
          .from('payment_day_marks')
          .delete()
          .eq('registration_id', selectedReg.id)
          .eq('date', date)
        if (error) throw error
        toast.success('Day unmarked — credit restored')
      } else {
        const { error } = await supabase
          .from('payment_day_marks')
          .upsert({
            registration_id: selectedReg.id,
            tuition_event_id: selectedEvent.id,
            date,
            used: true,
            created_by: profile?.id,
          }, { onConflict: 'registration_id,date' })
        if (error) throw error
        toast.success('Day marked as used')
      }
      setLoadRef(p => p + 1)
    } catch (err: any) {
      setDayMarks(prev => ({ ...prev, [date]: currentlyMarked }))
      toast.error(err?.message ?? 'Failed to update day mark')
    }
  }

  const recordPayment = async () => {
    if (!selectedReg || !selectedEvent) {
      toast.error('Please select a student')
      return
    }
    if (selectedDates.length === 0) {
      toast.error('Please select at least one date')
      return
    }
    if (amount <= 0) {
      toast.error('Enter a valid payment amount')
      return
    }

    setSubmitting(true)
    try {
      const studentId = selectedReg.student?.id || null
      const paymentCenterId = selectedReg.tuition_center_id || (selectedCenterId && selectedCenterId !== 'none' ? selectedCenterId : null)
      const expectedForDates = selectedDates.length * dailyRate
      const { allocations, credit } = allocatePaymentToDays(amount, selectedDates, dailyRate)
      const balance = Math.max(0, expectedForDates - amount)
      const fullyPaidDates = allocations.filter(a => a.status === 'paid').map(a => a.date)
      const anyAllocatedDates = allocations.map(a => a.date)

      const { data: inserted, error } = await supabase.from('payments').insert({
        tuition_event_id: selectedEvent.id,
        student_name: selectedReg.student_name,
        student_id: studentId,
        amount,
        expected_amount: expectedForDates,
        balance_amount: balance,
        class_charge_per_day: dailyRate,
        allocated_days: allocations,
        paid_dates: fullyPaidDates.join(',') || anyAllocatedDates.join(','),
        week_number: selectedWeek.weekNumber,
        method,
        receipt_number: receiptNumber,
        payment_date: new Date().toISOString().split('T')[0],
        tuition_center_id: paymentCenterId,
        created_by: profile?.id,
        is_published: false,
        notes: paymentNote || null,
      }).select('id').single()

      if (error) throw error

      toast.success(credit > 0
        ? `Payment recorded! Credit of ${formatCurrency(credit)} noted.`
        : balance > 0
          ? `Partial payment recorded. Balance: ${formatCurrency(balance)}`
          : 'Full payment recorded successfully!'
      )

      setPendingPaymentId(inserted?.id ?? null)
      if (balance > 0) {
        setShowFollowUpPanel(true)
        // Pre-fill follow-up note
        setFollowUpNote(`Balance of ${formatCurrency(balance)} remaining for Week ${selectedWeek.weekNumber}.`)
      } else {
        setShowFollowUpPanel(false)
      }

      setReceiptNumber(generateReceiptNumber())
      setPaymentNote('')
      setLoadRef(prev => prev + 1)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const saveFollowUp = async () => {
    if (!pendingPaymentId) return
    setSavingFollowUp(true)
    try {
      const { error } = await supabase.from('payments').update({
        follow_up_date: followUpDate || null,
        follow_up_note: followUpNote || null,
      }).eq('id', pendingPaymentId)
      if (error) throw error
      toast.success('Follow-up date saved!')
      setShowFollowUpPanel(false)
      setFollowUpDate('')
      setFollowUpNote('')
      setPendingPaymentId(null)
      setLoadRef(p => p + 1)
    } catch {
      toast.error('Failed to save follow-up')
    } finally {
      setSavingFollowUp(false)
    }
  }

  const markFollowUpResolved = async (paymentId: string) => {
    setResolvingId(paymentId)
    try {
      await supabase.from('payments').update({
        balance_amount: 0,
        follow_up_date: null,
        follow_up_note: null,
      }).eq('id', paymentId)
      setOverdueFollowUps(prev => prev.filter(f => f.id !== paymentId))
      toast.success('Marked as resolved!')
    } catch {
      toast.error('Failed to mark resolved')
    } finally {
      setResolvingId(null)
    }
  }

  const publishReceipt = async (paymentId: string) => {
    setPublishing(paymentId)
    try {
      const { error } = await supabase.from('payments').update({ is_published: true }).eq('id', paymentId)
      if (error) throw error
      const payment = studentPayments.find(p => p.id === paymentId)
      if (payment?.student_id) {
        await supabase.from('notifications').insert({
          user_id: payment.student_id,
          title: 'Official Receipt Published',
          message: `Receipt ${payment.receipt_number} for ${formatCurrency(payment.amount)} has been published.`,
          type: 'billing',
        })
      }
      toast.success('Receipt published!')
      setLoadRef(p => p + 1)
    } catch {
      toast.error('Failed to publish receipt')
    } finally {
      setPublishing(null)
    }
  }

  const publishAll = async () => {
    const unpublished = studentPayments.filter(p => !p.is_published)
    if (unpublished.length === 0) { toast.success('All receipts already published!'); return }
    setPublishing('all')
    try {
      for (const p of unpublished) {
        await supabase.from('payments').update({ is_published: true }).eq('id', p.id)
        if (p.student_id) {
          await supabase.from('notifications').insert({
            user_id: p.student_id,
            title: 'Official Receipt Published',
            message: `Receipt ${p.receipt_number} has been published.`,
            type: 'billing',
          })
        }
      }
      toast.success(`Published ${unpublished.length} receipts!`)
      setLoadRef(p => p + 1)
    } catch {
      toast.error('Failed to publish all')
    } finally {
      setPublishing(null)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Overdue Follow-up Reminder Modal ── */}
      <AnimatePresence>
        {showReminderModal && overdueFollowUps.length > 0 && (
          <Modal isOpen={showReminderModal} onClose={() => setShowReminderModal(false)} title="" size="xl">
            <div className="space-y-0">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/30">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>
                    {overdueFollowUps.length} Overdue Payment{overdueFollowUps.length > 1 ? 's' : ''}
                  </h2>
                  <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                    The following students have outstanding balances that were due for follow-up today or earlier.
                  </p>
                </div>
              </div>

              {/* Follow-up list */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {overdueFollowUps.map(item => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-red-200/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    style={{ background: 'rgba(239,68,68,0.04)' }}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-lg shadow-md">
                        {item.student_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate" style={{ color: 'var(--text)' }}>{item.student_name}</p>
                        <p className="text-xs font-bold text-red-500 mt-0.5">
                          Balance: {formatCurrency(item.balance_amount)} · Due: {formatDate(item.follow_up_date)}
                        </p>
                        {item.parent_name && (
                          <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
                            Parent: {item.parent_name}
                          </p>
                        )}
                        {item.follow_up_note && (
                          <p className="text-xs italic mt-1 opacity-60 truncate">&quot;{item.follow_up_note}&quot;</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {item.parent_phone && (
                        <a
                          href={`tel:${item.parent_phone}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-black hover:bg-emerald-500/20 transition-colors"
                        >
                          <Phone size={14} /> {item.parent_phone}
                        </a>
                      )}
                      <Button
                        size="sm"
                        disabled={resolvingId === item.id}
                        onClick={() => markFollowUpResolved(item.id)}
                        className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        {resolvingId === item.id ? <Loader2 size={14} className="animate-spin" /> : 'Mark Resolved'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowReminderModal(false)} className="rounded-xl font-bold">
                  Dismiss All
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Payment Hub
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
            Smart Billing · Per-Day Allocation · Arrears Tracking
          </p>
        </div>

        {/* Reminder bell badge */}
        {overdueFollowUps.length > 0 && (
          <button
            onClick={() => setShowReminderModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-black hover:bg-red-500/15 transition-colors"
          >
            <Bell size={16} className="animate-pulse" />
            {overdueFollowUps.length} Overdue Balance{overdueFollowUps.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card)] p-3 shadow-xl shadow-black/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Badge variant="info" className="px-3 py-1 text-xs bg-blue-500/10 border-blue-500/20 text-blue-500">
            <RefreshCw size={12} className="mr-1.5" /> Live Sync
          </Badge>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {filteredStudents.length} registered learners
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Event', icon: <Calendar size={12} />,
              content: (
                <select value={selectedEvent?.id ?? ''} onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value) ?? null)}
                  className="w-full bg-transparent text-sm font-black outline-none text-[var(--text)]">
                  {events.map(e => <option key={e.id} value={e.id} style={{ color: '#000' }}>{e.name}</option>)}
                </select>
              )
            },
            {
              label: 'Center', icon: <Building2 size={12} />,
              content: (
                <select value={selectedCenterId} onChange={e => setSelectedCenterId(e.target.value)}
                  className="w-full bg-transparent text-sm font-black outline-none text-[var(--text)]">
                  <option value="" style={{ color: '#000' }}>All Centers</option>
                  <option value="none" style={{ color: '#000' }}>Unassigned</option>
                  {centers.map(c => <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name}</option>)}
                </select>
              )
            },
            {
              label: 'Curriculum', icon: <Filter size={12} />,
              content: (
                <select value={selectedCurriculum} onChange={e => { setSelectedCurriculum(e.target.value); setSelectedClass('') }}
                  className="w-full bg-transparent text-sm font-black outline-none text-[var(--text)]">
                  <option value="" style={{ color: '#000' }}>All Curriculums</option>
                  {curriculums.map(c => <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name}</option>)}
                </select>
              )
            },
            {
              label: 'Class', icon: <User size={12} />,
              content: (
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                  className="w-full bg-transparent text-sm font-black outline-none text-[var(--text)]">
                  <option value="" style={{ color: '#000' }}>All Classes</option>
                  {classes.filter(c => !selectedCurriculum || c.curriculum_id === selectedCurriculum)
                    .map(c => <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name}</option>)}
                </select>
              )
            }
          ].map(({ label, icon, content }) => (
            <label key={label} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--input)] px-3 py-2.5 transition hover:border-primary/30">
              <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                {icon} {label}
              </span>
              {content}
            </label>
          ))}
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ── Left Column ── */}
        <div className="xl:col-span-4 space-y-5">

          {/* Week picker */}
          <Card className="p-5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-2xl" />
            <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={16} /> Billing Week
            </h3>
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 scrollbar-hide">
              {weeks.map((w, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWeekIndex(idx)}
                  className={`w-full p-3.5 rounded-2xl text-left transition-all ${selectedWeekIndex === idx ? 'ring-2 ring-primary' : 'border border-[var(--card-border)] hover:bg-white/5'}`}
                  style={{ background: selectedWeekIndex === idx ? 'var(--primary-subtle, rgba(245,158,11,0.08))' : 'var(--card)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-black ${selectedWeekIndex === idx ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>{w.label}</p>
                      <p className="text-[10px] font-bold opacity-40 mt-0.5">{w.activeDates.length} active days</p>
                    </div>
                    {selectedWeekIndex === idx && <Check size={16} className="text-[var(--primary)]" />}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Student picker */}
          <Card className="p-5">
            <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <User size={16} /> Student Lookup
            </h3>

            <AnimatePresence mode="wait">
              {!selectedReg ? (
                <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="relative mb-3">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                    <input
                      type="text"
                      placeholder="Search registered students..."
                      className="w-full pl-9 pr-4 py-3 rounded-2xl border-none outline-none text-sm font-bold shadow-inner"
                      style={{ background: 'var(--input)', color: 'var(--text)' }}
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 overflow-y-auto max-h-[380px] pr-1 scrollbar-hide">
                    {loading ? (
                      <div className="p-8 text-center"><Loader2 size={22} className="animate-spin mx-auto opacity-20" /></div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                        <User size={28} className="mb-2 opacity-20" />
                        <p className="text-xs font-bold text-center" style={{ color: 'var(--text-muted)' }}>
                          No students found for this event
                        </p>
                      </div>
                    ) : (
                      filteredStudents.map(reg => (
                        <button
                          key={reg.id}
                          onClick={() => { setSelectedReg(reg); setStudentSearch(reg.student_name) }}
                          className="w-full p-3.5 flex items-center gap-3 text-left rounded-2xl transition-all border border-[var(--card-border)] hover:bg-white/5"
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shrink-0">
                            {reg.student_name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{reg.student_name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-tight opacity-40 mt-0.5 truncate">
                              {reg.class?.name || reg.class_level || 'Class TBC'} · {reg.center?.name ?? 'No center'}
                            </p>
                          </div>
                          <ChevronRight size={14} className="ml-auto opacity-20 shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="selected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div
                    className="p-4 rounded-2xl flex items-center justify-between"
                    style={{ background: 'var(--primary-subtle, rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white font-black text-sm bg-gradient-to-br from-indigo-500 to-purple-600">
                        {selectedReg.student_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{selectedReg.student_name}</p>
                        <p className="text-[10px] font-bold opacity-40 uppercase truncate">
                          {selectedReg.class?.name || selectedReg.class_level || 'Class TBC'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedReg(null); setStudentSearch('') }} className="p-2 hover:bg-black/5 rounded-xl transition-colors shrink-0">
                      <X size={15} />
                    </button>
                  </div>

                  {/* Class charge info */}
                  {classSlot && Number(classSlot.charge_amount) > 0 && (
                    <div className="mt-3 p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--input)' }}>
                      <Zap size={14} className="text-[var(--primary)] shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider opacity-40">Class charge loaded</p>
                        <p className="text-xs font-black mt-0.5" style={{ color: 'var(--text)' }}>
                          KES {Number(classSlot.charge_amount).toLocaleString()} {classSlot.charge_unit_label || classSlot.charge_frequency?.replace(/_/g, ' ')}
                          <span className="ml-2 font-semibold opacity-50">· KES {dailyRate.toLocaleString()}/day</span>
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* ── Right Column ── */}
        <div className="xl:col-span-8 space-y-5">
          {!selectedReg ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 rounded-[2rem] border-2 border-dashed border-[var(--card-border)] bg-black/5">
              <div className="w-16 h-16 rounded-full bg-[var(--card)] flex items-center justify-center mb-4 shadow-sm">
                <Receipt size={32} className="opacity-10" />
              </div>
              <h4 className="text-lg font-black mb-1" style={{ color: 'var(--text-muted)' }}>Financial Terminal Standby</h4>
              <p className="text-sm opacity-40 max-w-xs">Select a student from the left to begin real-time arrears tracking and billing.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

              {/* ── Coverage / Paid-until Banner ── */}
              <Card className="p-5 relative overflow-hidden" style={{ borderColor: coverage.coverageEndDate ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)' }}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg ${coverage.coverageEndDate ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                      {coverage.coverageEndDate ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-40">Coverage Status · carry-over aware</p>
                      <p className="text-xl font-black leading-tight truncate" style={{ color: coverage.coverageEndDate ? '#10B981' : '#EF4444' }}>
                        {coverage.coverageEndDate
                          ? `Paid until ${new Date(coverage.coverageEndDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
                          : 'No upcoming coverage'}
                      </p>
                      <p className="text-xs font-bold mt-0.5 opacity-50">
                        {coverage.coverageEndDate
                          ? `${coverage.remainingDays.toFixed(1)} teaching day(s) in credit · ${coverage.coveredDates.length} upcoming day(s) covered`
                          : totalPaid > 0
                            ? `Credit used up — ${formatCurrency(dailyRate)} needed for the next session`
                            : 'No payments recorded for this event yet'}
                      </p>
                    </div>
                  </div>
                  {coverage.coverageEndDate && (
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-40">Consumed by attendance</p>
                      <p className="text-lg font-black" style={{ color: 'var(--text)' }}>
                        {coverage.consumedDays} / {coverage.purchasedDays.toFixed(1)} days
                      </p>
                      <p className="text-[10px] font-bold mt-0.5 opacity-40">skipped days roll forward automatically</p>
                    </div>
                  )}
                </div>
                {/* Trust indicator: warn when most elapsed sessions have no
                    attendance record yet, so "paid until" may look optimistic. */}
                {coverageTrust.elapsed >= 2 && coverageTrust.ratio < 0.7 && (
                  <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.35)' }}>
                    <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-amber-700 leading-snug">
                      Attendance logged for only {coverageTrust.recorded} of {coverageTrust.elapsed} elapsed sessions — coverage may look further ahead than reality.
                      Ask the teacher to sync attendance, or mark attended days as used below.
                    </p>
                  </div>
                )}
              </Card>

              {/* ── Arrears Summary ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Weekly Rate',
                    value: formatCurrency(weeklyRate),
                    sub: `${activeDaysInWeek} days × KES ${dailyRate.toLocaleString()}`,
                    color: 'border-l-blue-500',
                    icon: <Star size={14} className="text-blue-500" />
                  },
                  {
                    label: 'Collected',
                    value: formatCurrency(weeklyStats?.totalPaid ?? 0),
                    sub: `${(weeklyStats?.paidDates.length ?? 0)} full days`,
                    color: 'border-l-emerald-500',
                    icon: <CheckCircle size={14} className="text-emerald-500" />
                  },
                  {
                    label: 'Balance',
                    value: formatCurrency(weeklyStats?.arrears ?? 0),
                    sub: `${(weeklyStats?.unpaidDates.length ?? 0) + (weeklyStats?.partPaidDates.length ?? 0)} day(s) pending`,
                    color: (weeklyStats?.arrears ?? 0) > 0 ? 'border-l-orange-500' : 'border-l-emerald-500',
                    icon: <AlertCircle size={14} className={(weeklyStats?.arrears ?? 0) > 0 ? 'text-orange-500' : 'text-emerald-500'} />
                  },
                  {
                    label: 'Rate / Day',
                    value: formatCurrency(dailyRate),
                    sub: classSlot ? 'From class slot' : 'Event default',
                    color: 'border-l-purple-500',
                    icon: <TrendingUp size={14} className="text-purple-500" />
                  }
                ].map(stat => (
                  <Card key={stat.label} className={`p-4 border-l-4 ${stat.color}`}>
                    <div className="flex items-center gap-1.5 mb-2">{stat.icon} <p className="text-[9px] font-black uppercase tracking-wider opacity-40">{stat.label}</p></div>
                    <p className="text-xl font-black leading-none">{stat.value}</p>
                    <p className="text-[10px] font-bold mt-1 opacity-40">{stat.sub}</p>
                  </Card>
                ))}
              </div>

              {/* ── Day Picker with Per-Day Allocation View ── */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-black flex items-center gap-2">
                    <Clock size={18} className="text-[var(--primary)]" />
                    Day Allocation — Week {selectedWeek?.weekNumber}
                  </h4>
                  <button
                    onClick={() => setSelectedDates(weeklyStats?.unpaidDates ?? [])}
                    className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Select All Unpaid
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(selectedWeek?.activeDates ?? []).map((date: string) => {
                    const existingAlloc = allAllocatedDays[date]
                    const isPaid = existingAlloc?.status === 'paid'
                    const isPartPaid = existingAlloc?.status === 'part-paid'
                    const isSelected = selectedDates.includes(date)
                    const isToday = date === new Date().toISOString().split('T')[0]
                    // Covered by carry-over credit (paid days rolled from a previous
                    // week or an unused/skipped session), not by an allocation row.
                    const coveredByCredit = !isPaid && !isPartPaid && coverage.coveredDates.includes(date)

                    return (
                      <button
                        key={date}
                        disabled={isPaid}
                        onClick={() => handleDateToggle(date)}
                        className={`relative p-3.5 rounded-2xl text-left transition-all overflow-hidden
                          ${isPaid ? 'opacity-60 cursor-not-allowed' : isSelected ? 'ring-2 ring-primary scale-[1.02]' : coveredByCredit ? 'ring-2 ring-blue-500/60' : 'border border-[var(--card-border)] hover:border-primary/30 hover:scale-[1.01]'}
                          ${isPartPaid && !isSelected ? 'border-amber-400/50' : ''}`}
                        style={{
                          background: isPaid
                            ? 'rgba(16,185,129,0.08)'
                            : isPartPaid && !isSelected
                              ? 'rgba(245,158,11,0.06)'
                              : isSelected
                                ? 'var(--primary-subtle, rgba(245,158,11,0.1))'
                                : coveredByCredit
                                  ? 'rgba(59,130,246,0.08)'
                                  : 'var(--card)'
                        }}
                      >
                        {/* Status dot */}
                        {existingAlloc && (
                          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${dayStatusColor(existingAlloc.status)}`} />
                        )}
                        {!existingAlloc && coveredByCredit && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                        )}
                        {isToday && !existingAlloc && !coveredByCredit && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                        {isSelected && !existingAlloc && (
                          <Check size={10} className="absolute top-2 right-2 text-[var(--primary)]" />
                        )}

                        <p className={`text-[9px] font-black uppercase tracking-tight ${isPaid ? 'text-emerald-600' : isPartPaid ? 'text-amber-500' : coveredByCredit ? 'text-blue-600' : isSelected ? 'text-[var(--primary)]' : 'opacity-30'}`}>
                          {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}
                        </p>
                        <p className="text-base font-black leading-tight mt-0.5">
                          {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className={`text-[9px] font-bold mt-1 ${isPaid ? 'text-emerald-500' : isPartPaid ? 'text-amber-500' : coveredByCredit ? 'text-blue-500' : 'opacity-25'}`}>
                          {isPaid ? '✓ KES ' + dailyRate.toLocaleString()
                            : isPartPaid ? `${formatCurrency(existingAlloc!.allocated)} / ${dailyRate.toLocaleString()}`
                              : coveredByCredit ? 'credit · covered'
                                : `KES ${dailyRate.toLocaleString()}`}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {/* Manual attendance override: consume a paid day immediately
                    when the student attended but the teacher hasn't logged it. */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0]
                  const markable = (selectedWeek?.activeDates ?? []).filter((date: string) =>
                    date <= today && (!attendanceRows.some(r => r.date === date) || dayMarks[date])
                  )
                  if (markable.length === 0) return null
                  return (
                    <div className="mt-4 p-4 rounded-2xl" style={{ background: 'rgba(139,92,246,0.05)', border: '1px dashed rgba(139,92,246,0.3)' }}>
                      <p className="text-[10px] font-black uppercase tracking-wider text-violet-500 mb-2">
                        Mark day as used · attendance not logged yet
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {markable.map((date: string) => {
                          const marked = !!dayMarks[date]
                          return (
                            <button
                              key={date}
                              onClick={() => toggleDayMark(date)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-all ${marked ? 'bg-violet-500 text-white border-violet-500' : 'bg-white/60 border-violet-400/40 text-violet-600 hover:bg-violet-500 hover:text-white'}`}
                            >
                              {marked ? <Check size={10} /> : <Circle size={8} />}
                              {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {marked ? ' · used' : ''}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Cross-week carry-over indicator */}
                {(() => {
                  const weekDates = new Set(selectedWeek?.activeDates ?? [])
                  const spill = (selectedDates ?? []).filter(d => !weekDates.has(d))
                  if (spill.length === 0) return null
                  const spillWeekNum = weeks.findIndex(w => w.activeDates?.includes(spill[0]))
                  return (
                    <div className="mt-4 p-4 rounded-2xl flex flex-wrap items-center gap-2" style={{ background: 'rgba(59,130,246,0.06)', border: '1px dashed rgba(59,130,246,0.3)' }}>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600">
                        <RefreshCw size={12} /> Carries into Week {spillWeekNum >= 0 ? spillWeekNum + 1 : ''} · {spill.length} day(s)
                      </span>
                      {spill.map(d => (
                        <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border bg-blue-500/10 border-blue-500/30 text-blue-600">
                          {new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      ))}
                    </div>
                  )
                })()}

                {/* Live allocation preview */}
                {liveAllocation && liveAllocation.allocations.length > 0 && (
                  <div className="mt-4 p-4 rounded-2xl space-y-2" style={{ background: 'var(--input)' }}>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                      Live Allocation Preview
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {liveAllocation.allocations.map(a => (
                        <span
                          key={a.date}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border
                            ${a.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-600'}`}
                        >
                          {new Date(a.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          &nbsp;·&nbsp;
                          {dayStatusLabel(a.status)}
                          {a.status === 'part-paid' && <span className="ml-0.5 opacity-70">(KES {a.allocated.toLocaleString()})</span>}
                        </span>
                      ))}
                      {liveAllocation.credit > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/10 border border-blue-500/30 text-blue-600">
                          <Star size={10} /> Credit: KES {liveAllocation.credit.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              {/* ── Payment Form ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="p-5 space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-wider opacity-40 flex items-center gap-2">
                    <ArrowRight size={16} /> Transaction Details
                  </h4>

                  {/* Payment method */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {METHODS.map(m => (
                        <button
                          key={m.value}
                          onClick={() => setMethod(m.value)}
                          className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${method === m.value ? 'ring-1 ring-primary' : 'border border-[var(--card-border)] opacity-60 hover:opacity-100'}`}
                          style={{ background: method === m.value ? m.color + '15' : 'var(--card)', color: method === m.value ? m.color : 'inherit' }}
                        >
                          {m.icon} {m.value}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5">
                      Amount Received (KES)
                      {weeklyStats && weeklyStats.arrears > 0 && (
                        <button
                          type="button"
                          onClick={() => setAmount(weeklyStats.arrears)}
                          className="ml-2 normal-case text-[var(--primary)] hover:underline"
                        >
                          Use balance ({formatCurrency(weeklyStats.arrears)})
                        </button>
                      )}
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      className="w-full bg-[var(--input)] border-none rounded-xl py-3 px-4 text-lg font-black outline-none"
                      style={{ color: 'var(--primary)' }}
                    />
                  </div>

                  {/* Balance warning */}
                  {amount > 0 && selectedDates.length > 0 && amount < selectedDates.length * dailyRate && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-amber-600">Partial payment</p>
                        <p className="text-[10px] font-bold text-amber-600/70 mt-0.5">
                          Balance of {formatCurrency(selectedDates.length * dailyRate - amount)} will be tracked
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5">Note (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. M-Pesa ref: QR123456"
                      value={paymentNote}
                      onChange={e => setPaymentNote(e.target.value)}
                      className="w-full bg-[var(--input)] border-none rounded-xl py-3 px-4 text-sm font-bold outline-none"
                      style={{ color: 'var(--text)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5">Receipt Reference</label>
                    <input
                      type="text" readOnly value={receiptNumber}
                      className="w-full bg-[var(--input)] opacity-50 border-none rounded-xl py-3 px-4 text-sm font-mono font-bold outline-none cursor-not-allowed"
                    />
                  </div>
                </Card>

                {/* Confirm card */}
                <Card className="p-5 flex flex-col justify-between border-t-4 border-t-[var(--primary)]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white shadow-xl">
                        <TrendingUp size={22} />
                      </div>
                      <div>
                        <h4 className="text-base font-black">Execution Summary</h4>
                        <p className="text-xs font-bold opacity-40">Review before committing</p>
                      </div>
                    </div>

                    <div className="space-y-2 py-4 border-y border-[var(--card-border)] border-dashed text-sm">
                      <div className="flex justify-between">
                        <span className="opacity-50 font-semibold">Student</span>
                        <span className="font-black truncate max-w-[55%] text-right">{selectedReg.student_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-50 font-semibold">Class</span>
                        <span className="font-black">{selectedReg.class?.name || selectedReg.class_level || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-50 font-semibold">Days Selected</span>
                        <span className="font-black">{selectedDates.length} day(s)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-50 font-semibold">Expected</span>
                        <span className="font-black">{formatCurrency(selectedDates.length * dailyRate)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-black mt-2 pt-2 border-t border-[var(--card-border)] border-dashed">
                        <span>Collecting:</span>
                        <span style={{ color: 'var(--primary)' }}>{formatCurrency(amount)}</span>
                      </div>
                      {amount < selectedDates.length * dailyRate && amount > 0 && (
                        <div className="flex justify-between text-sm font-bold text-amber-500">
                          <span>Outstanding:</span>
                          <span>{formatCurrency(selectedDates.length * dailyRate - amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full mt-4 h-14 rounded-2xl font-black text-base shadow-xl active:scale-95"
                    disabled={submitting || selectedDates.length === 0 || amount <= 0}
                    onClick={recordPayment}
                  >
                    {submitting ? <Loader2 className="animate-spin" /> : <><Plus size={20} className="mr-2" /> Confirm Record</>}
                  </Button>
                </Card>
              </div>

              {/* ── Follow-up Panel ── */}
              <AnimatePresence>
                {showFollowUpPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <Card className="p-5 border-2 border-amber-400/30" style={{ background: 'rgba(245,158,11,0.04)' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                          <CalendarClock size={18} />
                        </div>
                        <div>
                          <h4 className="font-black text-amber-700">Set Follow-up Reminder</h4>
                          <p className="text-xs font-medium text-amber-600/70 mt-0.5">
                            Partial payment recorded. Set a date when you expect the balance to be cleared.
                          </p>
                        </div>
                        <button onClick={() => setShowFollowUpPanel(false)} className="ml-auto p-2 hover:bg-black/5 rounded-xl transition-colors">
                          <X size={15} className="text-amber-600" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600/60 mb-1.5">
                            <CalendarClock size={10} className="inline mr-1" /> Follow-up Date *
                          </label>
                          <input
                            type="date"
                            value={followUpDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setFollowUpDate(e.target.value)}
                            className="w-full bg-white/60 border border-amber-300/60 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                            style={{ color: 'var(--text)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600/60 mb-1.5">
                            <StickyNote size={10} className="inline mr-1" /> Note
                          </label>
                          <input
                            type="text"
                            value={followUpNote}
                            onChange={e => setFollowUpNote(e.target.value)}
                            placeholder="e.g. Student will bring balance tomorrow"
                            className="w-full bg-white/60 border border-amber-300/60 rounded-xl py-3 px-4 text-sm font-bold outline-none"
                            style={{ color: 'var(--text)' }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <Button
                          onClick={saveFollowUp}
                          disabled={savingFollowUp || !followUpDate}
                          className="rounded-xl font-black bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                        >
                          {savingFollowUp ? <Loader2 size={16} className="animate-spin mr-2" /> : <CalendarClock size={16} className="mr-2" />}
                          Save Follow-up
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowFollowUpPanel(false)}
                          className="rounded-xl font-bold border-amber-300/50 text-amber-700"
                        >
                          Skip for Now
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </div>
      </div>

      {/* ── Ledger Table ── */}
      <div className="pb-12">
        <Card className="p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                <Receipt size={20} className="text-emerald-500" />
                Student Collection Ledger
              </h3>
              <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Real-time audit of financier entries</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={publishAll}
              disabled={publishing === 'all' || studentPayments.filter(p => !p.is_published).length === 0}
              className="border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold"
            >
              {publishing === 'all' ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send size={16} className="mr-2" />}
              Publish All
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-[10px] font-black uppercase tracking-widest opacity-40">
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Days Allocated</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Follow-up</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {studentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-xs font-bold opacity-30 uppercase tracking-widest">
                      No transactions recorded for this student
                    </td>
                  </tr>
                ) : (
                  studentPayments.sort((a, b) => b.id.localeCompare(a.id)).map(p => {
                    const balance = Number(p.balance_amount ?? 0)
                    const hasPendingFollowUp = p.follow_up_date && balance > 0
                    const overdueFollowUp = hasPendingFollowUp && p.follow_up_date! <= new Date().toISOString().split('T')[0]

                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 font-mono font-bold text-xs opacity-50">{p.receipt_number}</td>
                        <td className="px-4 py-4 font-black">{p.student_name}</td>
                        <td className="px-4 py-4">
                          <Badge variant="muted">Week {p.week_number}</Badge>
                        </td>
                        <td className="px-4 py-4 max-w-[200px]">
                          {p.allocated_days ? (
                            <div className="flex flex-wrap gap-1">
                              {p.allocated_days.map(d => (
                                <span
                                  key={d.date}
                                  className={`text-[9px] font-black px-1.5 py-0.5 rounded border
                                    ${d.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                      : d.status === 'part-paid' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                        : 'bg-blue-500/10 border-blue-500/20 text-blue-600'}`}
                                >
                                  {new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  {d.status !== 'paid' && <span className="ml-0.5 opacity-70">({d.status})</span>}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {p.paid_dates?.split(',').map(d => (
                                <span key={d} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                  {new Date(d.trim() + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-black text-emerald-500">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-4 text-right font-black">
                          {balance > 0 ? (
                            <span className="text-amber-500">{formatCurrency(balance)}</span>
                          ) : (
                            <span className="opacity-30">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {p.is_published ? (
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none"><CheckCircle size={11} className="mr-1" /> Published</Badge>
                          ) : (
                            <Badge variant="warning" className="bg-orange-500/10 text-orange-500 border-none">Draft</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {hasPendingFollowUp ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${overdueFollowUp ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              <CalendarClock size={10} />
                              {formatDate(p.follow_up_date!)}
                              {overdueFollowUp && ' (overdue)'}
                            </span>
                          ) : (
                            <span className="opacity-20 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewingReceipt(p)} className="hover:bg-white/10">
                            <Eye size={15} />
                          </Button>
                          {!p.is_published && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={publishing === p.id}
                              onClick={() => publishReceipt(p.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              {publishing === p.id ? <Loader2 size={14} className="animate-spin" /> : 'Publish'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Receipt viewer modal */}
      <Modal isOpen={!!viewingReceipt} onClose={() => setViewingReceipt(null)} title="Official Receipt Preview" size="xl">
        {viewingReceipt && (
          <ReceiptViewer
            payment={viewingReceipt}
            eventName={selectedEvent?.name}
            centerName={centers.find(c => c.id === selectedReg?.tuition_center_id)?.name}
          />
        )}
      </Modal>
    </div>
  )
}
