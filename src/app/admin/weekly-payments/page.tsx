'use client'

/**
 * WeeklyPayments — admin weekly fee tracker.
 *
 * Roster (classes + students) and every piece of weekly transactional data
 * (payments, fee overrides, promised dates, archived roster entries) are
 * persisted in Supabase, so the page and the automated Friday report read
 * from the same source of truth.
 *
 * Carrying balances: a credit from overpaying one week rolls into the next
 * touched week, and so does unpaid debt — as long as each week in between had
 * activity (payment, promise, or fee override). An untouched week is a clean
 * break so history from before the roster was in use never invents debt.
 */
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { generateAdmissionNumber, getEventWeeks } from '@/lib/utils'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  DEFAULT_WEEKLY_FEE, DEFAULT_DAILY_FEE, DAYS_PER_WEEK, toISODate, parseISODate, getMondayOf, addDays,
  weekKey, paymentsFor, paidTotalFor, expectedFeeFor, cumulativeBalanceFor, computeFlag,
} from '@/lib/weekly-payments'
import type { PaymentEntry, RosterStudent, Flag, PaymentPlan, ActiveDaysForWeek } from '@/lib/weekly-payments'
import { buildCoachBrief, buildStudentBehaviors, computeAging } from '@/lib/weekly-insights'
import type { CoachInput } from '@/lib/weekly-insights'
import type { CoachCommentary } from '@/lib/coach-ai'
import { generateCoachCommentary } from '@/app/actions/coach'
import { PeakCoachPanel } from '@/components/admin/PeakCoachPanel'

// ---------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------
const CURRENCY = 'KSh'

const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Bank transfer', 'Other']
const METHOD_COLORS: Record<string, string> = {
  Cash: '#10B981',
  'M-Pesa': '#2D8CFF',
  'Bank transfer': '#8B5CF6',
  Other: '#6B7280',
}

// ---------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------
function formatDateLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function formatMoney(n: number): string {
  const val = Number(n) || 0
  return `${CURRENCY} ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------
interface DbClass { id: string; name: string; curriculum_id: string; level?: number | null }
interface DbStudent {
  id: string
  full_name: string
  class_id: string
  admission_number: string
  weekly_fee?: number | null
  weekly_roster_archived?: boolean | null
  payment_plan?: string | null
  daily_fee?: number | null
}
interface DbTuitionEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  active_days: string[]
  is_active: boolean
}
interface RosterClass { id: string; name: string; curriculum_id: string; students: RosterStudent[] }

// ---------------------------------------------------------------------
// Self-contained styling
// ---------------------------------------------------------------------
const STYLES = `
.wp-root{--navy:#1B3A5C;--navy-dark:#16304C;--green:#7C9A4E;--green-dark:#6E8A45;
  --green-light:#EAF0E4;--bg:#F5F7F9;--border:#E2E6EA;--border-soft:#DDE3E8;
  --gray:#6B7280;--gray-soft:#9CA3AF;--text:#1F2937;--text-soft:#374151;
  --red:#B3261E;--red-bg:#FBEAEA;--red-border:#F2C6C4;
  --amber:#8A5A00;--amber-bg:#FCF3DC;--amber-border:#F1DDA6;
  --blue:#2A4D8F;--blue-bg:#E9EEF6;--blue-border:#C3D2EA;
  --green-text:#2F6B32;--green-bg2:#EAF5E6;--green-border2:#BFE0B8;
  --gray-bg:#F1F2F4;--gray-border:#DDE1E6;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  background:transparent;min-height:0;padding:8px 4px 24px;color:var(--text);box-sizing:border-box;}
.wp-root *{box-sizing:border-box;}
.wp-container{max-width:1180px;margin:0 auto;}
.wp-header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px;}
.wp-title{font-size:24px;font-weight:700;color:var(--navy);letter-spacing:-0.01em;margin:0;}
.wp-subtitle{font-size:14px;color:var(--gray);margin:4px 0 0;}
.wp-week{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--border);
  border-radius:12px;padding:8px 12px;box-shadow:0 1px 2px rgba(0,0,0,0.04);}
.wp-week-btn{height:32px;width:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;
  color:var(--navy);background:transparent;border:none;cursor:pointer;font-size:16px;}
.wp-week-btn:hover{background:#F0F3F6;}
.wp-week-btn:disabled{opacity:0.35;cursor:not-allowed;}
.wp-week-label{text-align:center;min-width:170px;font-size:14px;}
.wp-week-caption{font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:var(--gray-soft);font-weight:600;}
.wp-week-value{font-weight:600;color:var(--text);}
.wp-week-range{font-size:12px;color:var(--gray);margin-top:2px;}
.wp-week-now{height:30px;padding:0 10px;border:1px solid var(--border-soft);border-radius:8px;background:#fff;
  color:var(--navy);font-size:12px;font-weight:600;cursor:pointer;}
.wp-week-now:hover{background:#F0F3F6;}
.wp-event-select{border:1px solid var(--border-soft);border-radius:8px;padding:7px 10px;font-size:13px;
  font-weight:600;color:var(--navy);background:#fff;font-family:inherit;max-width:260px;}
.wp-event-select:focus{outline:none;box-shadow:0 0 0 2px rgba(124,154,78,0.35);border-color:var(--green);}
.wp-summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:12px;}
@media(min-width:640px){.wp-summary-grid{grid-template-columns:repeat(4,1fr);}}
@media(min-width:900px){.wp-summary-grid{grid-template-columns:repeat(6,1fr);}}
.wp-summary-card{background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,0.04);padding:12px 16px;}
.wp-summary-label{font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:var(--gray-soft);font-weight:600;margin-bottom:4px;}
.wp-summary-value{font-size:20px;font-weight:700;}
.wp-summary-sub{font-size:11px;color:var(--gray-soft);margin-top:2px;}
.wp-summary-value.navy{color:var(--navy);}
.wp-summary-value.green{color:var(--green-text);}
.wp-summary-value.amber{color:var(--amber);}
.wp-summary-value.red{color:var(--red);}
.wp-summary-value.blue{color:var(--blue);}
.wp-analytics-note{font-size:12px;color:var(--gray-soft);margin:0 0 20px;}
.wp-tabs{display:flex;align-items:center;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;}
.wp-tab{flex-shrink:0;display:flex;align-items:center;gap:8px;border-radius:999px;padding:8px 16px;
  font-size:14px;font-weight:600;border:1px solid var(--border);background:#fff;color:var(--text-soft);
  cursor:pointer;transition:border-color .15s ease;white-space:nowrap;}
.wp-tab:hover{border-color:rgba(27,58,92,0.4);}
.wp-tab.active{background:var(--navy);color:#fff;border-color:var(--navy);}
.wp-tab-badge{font-size:11px;border-radius:999px;padding:1px 6px;background:var(--gray-bg);}
.wp-tab.active .wp-tab-badge{background:rgba(255,255,255,0.2);}
.wp-tab-flag{font-size:11px;border-radius:999px;padding:1px 6px;background:var(--red-bg);color:var(--red);}
.wp-tab.active .wp-tab-flag{background:rgba(179,38,30,0.75);color:#fff;}
.wp-add-class{flex-shrink:0;border-radius:999px;padding:8px 16px;font-size:14px;font-weight:600;
  border:1px dashed var(--gray-soft);color:var(--gray);background:transparent;cursor:pointer;white-space:nowrap;}
.wp-add-class:hover{border-color:var(--navy);color:var(--navy);}
.wp-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}
.wp-toolbar-left{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.wp-search{font-size:14px;border:1px solid var(--border-soft);border-radius:8px;padding:8px 12px;width:224px;font-family:inherit;}
.wp-search:focus,.wp-input:focus,.wp-select:focus,.wp-date:focus{outline:none;box-shadow:0 0 0 2px rgba(124,154,78,0.35);border-color:var(--green);}
.wp-checkbox-label{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--text-soft);user-select:none;}
.wp-btn-primary{border:none;border-radius:8px;background:var(--navy);color:#fff;font-size:14px;font-weight:600;
  padding:9px 16px;cursor:pointer;white-space:nowrap;}
.wp-btn-primary:hover{background:var(--navy-dark);}
.wp-btn-primary:disabled{opacity:0.55;cursor:not-allowed;}
.wp-btn-green{border:none;border-radius:6px;background:var(--green);color:#fff;font-size:12px;font-weight:600;
  padding:6px 12px;cursor:pointer;white-space:nowrap;}
.wp-btn-green:hover{background:var(--green-dark);}
.wp-btn-quick{border:1px solid var(--border-soft);border-radius:999px;background:#fff;color:var(--navy);
  font-size:12px;font-weight:600;padding:6px 12px;cursor:pointer;white-space:nowrap;}
.wp-btn-quick:hover{border-color:var(--navy);background:#F0F3F6;}
.wp-btn-quick:disabled{opacity:0.45;cursor:not-allowed;}
.wp-quick-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}
.wp-card{background:#fff;border:1px solid var(--border);border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,0.04);overflow:hidden;}
.wp-table-wrap{overflow-x:auto;}
.wp-table{width:100%;font-size:14px;border-collapse:collapse;min-width:720px;}
.wp-table thead tr{background:var(--navy);color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:0.03em;}
.wp-table th{text-align:left;font-weight:600;padding:10px 12px;}
.wp-table td{padding:8px 12px;vertical-align:top;}
.wp-row{cursor:pointer;background:#fff;}
.wp-row.alt{background:#F8FAFB;}
.wp-row.expanded{background:#EFF3EE;}
.wp-row-detail{background:#EFF3EE;}
.wp-chevron{display:inline-block;color:var(--gray-soft);transition:transform .15s ease;}
.wp-chevron.open{transform:rotate(90deg);}
.wp-name-input{width:100%;background:transparent;border:none;font-weight:600;color:var(--text);
  border-radius:4px;padding:2px 4px;font-size:14px;font-family:inherit;}
.wp-name-input:focus{outline:none;background:#F0F3F6;}
.wp-carry-note{font-size:10px;margin-top:2px;}
.wp-carry-note.owe{color:var(--red);}
.wp-carry-note.credit{color:var(--blue);}
.wp-num-plain{width:100%;background:transparent;border:none;text-align:right;font-family:inherit;font-size:14px;}
.wp-num-plain:focus{outline:none;background:#F0F3F6;border-radius:4px;}
.wp-balance{font-weight:700;text-align:right;}
.wp-balance.owe{color:var(--red);}
.wp-balance.credit{color:var(--blue);}
.wp-balance.clear{color:var(--green-text);}
.wp-remove-btn{background:none;border:none;color:var(--gray-soft);cursor:pointer;font-size:14px;}
.wp-remove-btn:hover{color:var(--red);}
.wp-pill{display:inline-flex;align-items:center;border-radius:999px;border:1px solid;padding:2px 10px;
  font-size:12px;font-weight:600;white-space:nowrap;}
.wp-pill.green{background:var(--green-bg2);color:var(--green-text);border-color:var(--green-border2);}
.wp-pill.blue{background:var(--blue-bg);color:var(--blue);border-color:var(--blue-border);}
.wp-pill.amber{background:var(--amber-bg);color:var(--amber);border-color:var(--amber-border);}
.wp-pill.red{background:var(--red-bg);color:var(--red);border-color:var(--red-border);}
.wp-pill.gray{background:var(--gray-bg);color:#5B6472;border-color:var(--gray-border);}
.wp-footnote{font-size:12px;color:var(--gray-soft);margin-top:16px;}
.wp-detail-grid{display:grid;grid-template-columns:1fr;gap:24px;padding:16px;}
@media(min-width:1024px){.wp-detail-grid{grid-template-columns:1fr 1fr;}}
.wp-detail-heading{font-size:12px;text-transform:uppercase;letter-spacing:0.03em;color:#5B6472;font-weight:600;margin-bottom:8px;}
.wp-ledger-list{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:6px;}
.wp-ledger-item{display:flex;align-items:center;justify-content:space-between;background:#fff;
  border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:14px;}
.wp-ledger-amount{font-weight:700;color:var(--text);}
.wp-ledger-meta{color:var(--gray);}
.wp-ledger-note{font-size:11px;color:var(--gray-soft);}
.wp-empty-note{font-size:14px;color:var(--gray-soft);margin-bottom:12px;}
.wp-payment-form{background:#fff;border:1px solid var(--border);border-radius:8px;padding:12px;
  display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;}
.wp-field-label{display:block;font-size:10px;color:var(--gray-soft);margin-bottom:4px;}
.wp-input,.wp-select,.wp-date{border:1px solid var(--border-soft);border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;}
.wp-input.amount{width:96px;text-align:right;}
.wp-input.grow{width:100%;}
.wp-field-grow{flex:1;min-width:120px;}
.wp-info-text{font-size:11px;color:var(--gray-soft);margin-top:4px;}
.wp-rate-row{display:flex;align-items:center;gap:8px;margin-top:8px;}
.wp-rate-label{font-size:12px;color:var(--gray);}
.wp-input.small{width:96px;text-align:right;}
.wp-standard-rate{font-size:12px;color:var(--gray-soft);}
.wp-fee-row{display:flex;align-items:center;gap:8px;}
.wp-empty-row td{padding:32px 12px;text-align:center;color:var(--gray-soft);font-size:14px;}
tfoot tr{background:var(--green-light);color:var(--navy);font-weight:600;}
tfoot td{padding:10px 12px;}
.wp-toolbar-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.wp-btn-export{border:1px solid var(--border-soft);border-radius:8px;background:#fff;color:var(--navy);
  font-size:13px;font-weight:600;padding:8px 12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;}
.wp-btn-export:hover{border-color:var(--navy);background:#F0F3F6;}
.wp-btn-export:disabled{opacity:0.55;cursor:not-allowed;}
.wp-analytics-grid{display:grid;grid-template-columns:1fr;gap:16px;margin-top:20px;}
@media(min-width:1024px){.wp-analytics-grid{grid-template-columns:2fr 1fr;}}
.wp-chart-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 16px 8px;box-shadow:0 1px 2px rgba(0,0,0,0.04);}
.wp-chart-title{font-size:13px;font-weight:700;color:var(--text);margin:0 0 4px;}
.wp-chart-sub{font-size:11px;color:var(--gray-soft);margin:0 0 12px;}
.wp-method-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.wp-method-label{width:92px;font-size:12px;font-weight:600;color:var(--text-soft);flex-shrink:0;}
.wp-method-bar{flex:1;height:10px;border-radius:999px;background:var(--gray-bg);overflow:hidden;}
.wp-method-fill{height:100%;border-radius:999px;}
.wp-method-val{width:110px;font-size:12px;color:var(--gray);text-align:right;flex-shrink:0;}
.wp-empty-state{padding:48px 16px;text-align:center;}
.wp-empty-state .wp-title{font-size:16px;margin-bottom:8px;}
.wp-skeleton{padding:16px;background:#fff;border:1px solid var(--border);border-radius:16px;}
.wp-skeleton-line{height:14px;border-radius:6px;background:var(--gray-bg);margin-bottom:10px;animation:pulse 1.4s ease-in-out infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.wp-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.45);backdrop-filter:blur(2px);
  display:flex;align-items:center;justify-content:center;padding:16px;z-index:60;}
.wp-modal{background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.18);width:100%;max-width:440px;padding:24px;}
.wp-modal-title{font-size:17px;font-weight:700;color:var(--text);margin:0 0 4px;}
.wp-modal-sub{font-size:12px;color:var(--gray-soft);margin:0 0 18px;}
.wp-modal-field{margin-bottom:14px;}
.wp-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px;}
.wp-btn-cancel{border:1px solid var(--border);border-radius:8px;background:#fff;color:var(--text-soft);
  font-size:14px;font-weight:600;padding:8px 16px;cursor:pointer;}
.wp-btn-cancel:hover{background:#F0F3F6;}
`;

function FlagPill({ label, tone }: Flag) {
  return <span className={`wp-pill ${tone}`}>{label}</span>
}

// ---------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------
export default function WeeklyPayments() {
  const supabase = getSupabaseBrowserClient()

  // ---- Database-loaded state ----
  const [dbClasses, setDbClasses] = useState<DbClass[]>([])
  const [dbStudents, setDbStudents] = useState<DbStudent[]>([])
  const [curriculums, setCurriculums] = useState<{ id: string; name: string }[]>([])
  const [tuitionEvents, setTuitionEvents] = useState<DbTuitionEvent[]>([])
  const [holidayDates, setHolidayDates] = useState<string[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [eventWeekIndex, setEventWeekIndex] = useState(0)
  const [weekTicker, setWeekTicker] = useState(0)
  const [loading, setLoading] = useState(true)

  // ---- Per-week transactional data (Supabase-backed) ----
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [feeOverrides, setFeeOverrides] = useState<Record<string, number>>({})
  const [promises, setPromises] = useState<Record<string, string>>({})

  const [activeClassId, setActiveClassId] = useState('')
  const [search, setSearch] = useState('')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [addClassOpen, setAddClassOpen] = useState(false)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [classForm, setClassForm] = useState({ name: '', curriculum_id: '' })
  const [studentForm, setStudentForm] = useState({ name: '', fee: String(DEFAULT_WEEKLY_FEE), plan: 'weekly' as PaymentPlan, dailyFee: String(DEFAULT_DAILY_FEE) })
  const [saving, setSaving] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const initEventRef = useRef(false)

  const loadData = useCallback(async () => {
    const [cRes, sRes, curRes, eRes, hRes, payRes, overRes, promRes] = await Promise.all([
      supabase.from('classes').select('id, name, curriculum_id, level').order('name'),
      supabase.from('students').select('*').order('full_name'),
      supabase.from('curriculums').select('id, name').order('name'),
      supabase.from('tuition_events').select('id, name, start_date, end_date, active_days, is_active').order('start_date', { ascending: false }).limit(20),
      supabase.from('holidays').select('date'),
      supabase.from('student_weekly_payments').select('*'),
      supabase.from('student_weekly_overrides').select('*'),
      supabase.from('student_weekly_promises').select('*'),
    ])
    if (cRes.error) console.error('[WeeklyPayments] classes:', cRes.error)
    if (sRes.error) console.error('[WeeklyPayments] students:', sRes.error)
    if (eRes.error) console.error('[WeeklyPayments] events:', eRes.error)
    if (hRes.error) console.error('[WeeklyPayments] holidays:', hRes.error)
    if (payRes.error) console.error('[WeeklyPayments] payments:', payRes.error)
    if (overRes.error) console.error('[WeeklyPayments] overrides:', overRes.error)
    if (promRes.error) console.error('[WeeklyPayments] promises:', promRes.error)

    setDbClasses((cRes.data ?? []) as DbClass[])
    setDbStudents((sRes.data ?? []) as DbStudent[])
    if (curRes.data) setCurriculums(curRes.data as { id: string; name: string }[])
    setHolidayDates((hRes.data ?? []).map((h: any) => h.date))

    const events = (eRes.data ?? []) as DbTuitionEvent[]
    setTuitionEvents(events)
    if (!initEventRef.current) {
      const active = events.find((e) => e.is_active)
      setSelectedEventId(active?.id ?? events[0]?.id ?? '')
      initEventRef.current = true
    }

    const overrideMap: Record<string, number> = {}
    for (const o of (overRes.data ?? []) as any[]) overrideMap[weekKey(o.student_id, o.week_start)] = Number(o.amount) || 0
    const promiseMap: Record<string, string> = {}
    for (const p of (promRes.data ?? []) as any[]) promiseMap[weekKey(p.student_id, p.week_start)] = p.promised_date

    setPayments(
      ((payRes.data ?? []) as any[]).map((p) => ({
        id: p.id,
        studentId: p.student_id,
        weekStart: p.week_start,
        date: p.paid_date,
        amount: Number(p.amount) || 0,
        method: p.method || 'Cash',
        note: p.note || undefined,
      }))
    )
    setFeeOverrides(overrideMap)
    setPromises(promiseMap)

    setActiveClassId((prev) => {
      if (prev && (cRes.data ?? []).some((c) => c.id === prev)) return prev
      return (cRes.data ?? [])[0]?.id ?? ''
    })
  }, [supabase])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      setLoading(true)
      await loadData()
      if (mounted) setLoading(false)
    }
    void init()
    return () => {
      mounted = false
    }
  }, [loadData])

  // Selected tuition event + its teaching weeks
  const selectedEvent = tuitionEvents.find((e) => e.id === selectedEventId) || null
  const eventWeeks = useMemo(() => {
    if (!selectedEvent) return []
    return getEventWeeks(selectedEvent.start_date, selectedEvent.end_date, selectedEvent.active_days || [], holidayDates)
  }, [selectedEvent, holidayDates])

  // Resolves how many teaching days a given week has (drives the 'daily' plan's
  // expected fee). Falls back to the full 5-day week outside a tuition event.
  const activeDaysForWeek = useMemo<ActiveDaysForWeek>(() => {
    if (eventWeeks.length === 0) return () => DAYS_PER_WEEK
    const byWeek = new Map(
      eventWeeks.map((w) => [toISODate(w.startDate), (w as any).activeDates?.length ?? DAYS_PER_WEEK])
    )
    return (week: string) => byWeek.get(week) ?? DAYS_PER_WEEK
  }, [eventWeeks])

  // When the event (or its weeks) change, jump to the current event week.
  useEffect(() => {
    if (eventWeeks.length === 0) return
    const todayIso = toISODate(new Date())
    let idx = eventWeeks.findIndex(
      (w) => todayIso >= toISODate(w.startDate) && todayIso <= toISODate(w.endDate)
    )
    if (idx === -1) {
      const last = eventWeeks[eventWeeks.length - 1]
      idx = todayIso > toISODate(last.endDate) ? eventWeeks.length - 1 : 0
    }
    setEventWeekIndex(idx)
    setExpandedId(null)
  }, [eventWeeks])

  // The week being viewed. Inside an event this is an event teaching week
  // (tracked automatically); outside one we fall back to plain Mondays.
  const fallbackWeekRef = useRef(toISODate(getMondayOf(new Date())))
  const weekStart = useMemo(() => {
    if (eventWeeks.length > 0) {
      const w = eventWeeks[Math.min(eventWeekIndex, eventWeeks.length - 1)]
      return toISODate(w.startDate)
    }
    return fallbackWeekRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventWeeks, eventWeekIndex, weekTicker])

  const weekRangeLabel = useMemo(() => {
    if (eventWeeks.length > 0) {
      const w = eventWeeks[Math.min(eventWeekIndex, eventWeeks.length - 1)]
      return `${formatShort(w.startDate)} – ${formatShort(w.endDate)}`
    }
    return ''
  }, [eventWeeks, eventWeekIndex])

  // Roster grouped by class, minus archived students.
  const rosterClasses = useMemo<RosterClass[]>(
    () =>
      dbClasses.map((c) => ({
        id: c.id,
        name: c.name,
        curriculum_id: c.curriculum_id,
        students: dbStudents
          .filter((s) => s.class_id === c.id && !s.weekly_roster_archived)
          .map((s) => ({
            id: s.id,
            name: s.full_name,
            fee: Number(s.weekly_fee) || DEFAULT_WEEKLY_FEE,
            plan: s.payment_plan === 'daily' ? ('daily' as const) : ('weekly' as const),
            dailyFee: Number(s.daily_fee) || 0,
          })),
      })),
    [dbClasses, dbStudents]
  )

  const activeClass = rosterClasses.find((c) => c.id === activeClassId) || rosterClasses[0]

  // ---- Balance computation core (pure helpers from lib/weekly-payments) ----
  function paidTotalForStudent(studentId: string, week: string): number {
    return paidTotalFor(payments, studentId, week)
  }
  function expectedFeeForStudent(student: RosterStudent, week: string): number {
    return expectedFeeFor(student, week, feeOverrides, activeDaysForWeek)
  }
  function balanceForStudent(student: RosterStudent, week: string): number {
    return cumulativeBalanceFor(student, week, payments, promises, feeOverrides, activeDaysForWeek)
  }

  interface BalanceRow {
    className: string
    student: RosterStudent
    expected: number
    entries: PaymentEntry[]
    paid: number
    balance: number
    carryIn: number
    promisedDate: string
    flag: Flag
  }
  function buildRow(c: RosterClass, student: RosterStudent): BalanceRow {
    const expected = expectedFeeForStudent(student, weekStart)
    const entries = paymentsFor(payments, student.id, weekStart)
    const paid = entries.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const balance = balanceForStudent(student, weekStart)
    const carryIn = balance - (expected - paid)
    const promisedDate = promises[weekKey(student.id, weekStart)] || ''
    const flag = computeFlag({ balance, promisedDate, weekStart })
    return { className: c.name, student, expected, entries, paid, balance, carryIn, promisedDate, flag }
  }

  // ---- Mutations (write-through to Supabase) ----
  async function addPayment(studentId: string, entry: { date: string; amount: number; method: string; note?: string }) {
    const { data, error } = await supabase
      .from('student_weekly_payments')
      .insert({
        student_id: studentId,
        week_start: weekStart,
        paid_date: entry.date,
        amount: Number(entry.amount) || 0,
        method: entry.method,
        note: entry.note || null,
      })
      .select('id')
      .single()
    if (error) {
      toast.error('Could not save payment: ' + error.message)
      return
    }
    setPayments((prev) => [
      ...prev,
      { id: data.id, studentId, weekStart, date: entry.date, amount: Number(entry.amount) || 0, method: entry.method, note: entry.note },
    ])
  }
  async function removePayment(paymentId: string) {
    const { error } = await supabase.from('student_weekly_payments').delete().eq('id', paymentId)
    if (error) {
      toast.error('Could not remove payment: ' + error.message)
      return
    }
    setPayments((prev) => prev.filter((p) => p.id !== paymentId))
  }
  async function setFeeOverride(studentId: string, value: string) {
    const key = weekKey(studentId, weekStart)
    if (value === '' || value === null) {
      const { error } = await supabase
        .from('student_weekly_overrides')
        .delete()
        .eq('student_id', studentId)
        .eq('week_start', weekStart)
      if (error) {
        toast.error('Could not clear override: ' + error.message)
        return
      }
      setFeeOverrides((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      return
    }
    const { error } = await supabase
      .from('student_weekly_overrides')
      .upsert(
        { student_id: studentId, week_start: weekStart, amount: Number(value) },
        { onConflict: 'student_id,week_start' }
      )
    if (error) {
      toast.error('Could not save override: ' + error.message)
      return
    }
    setFeeOverrides((prev) => ({ ...prev, [key]: Number(value) }))
  }
  async function setPromise(studentId: string, date: string) {
    const key = weekKey(studentId, weekStart)
    if (!date) {
      const { error } = await supabase
        .from('student_weekly_promises')
        .delete()
        .eq('student_id', studentId)
        .eq('week_start', weekStart)
      if (error) {
        toast.error('Could not clear promise: ' + error.message)
        return
      }
      setPromises((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      return
    }
    const { error } = await supabase
      .from('student_weekly_promises')
      .upsert(
        { student_id: studentId, week_start: weekStart, promised_date: date },
        { onConflict: 'student_id,week_start' }
      )
    if (error) {
      toast.error('Could not save promise: ' + error.message)
      return
    }
    setPromises((prev) => ({ ...prev, [key]: date }))
  }

  // Roster edits write straight to the database.
  function renameStudentLocal(studentId: string, name: string) {
    setDbStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, full_name: name } : s)))
  }
  async function commitRename(studentId: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const { error } = await supabase.from('students').update({ full_name: trimmed }).eq('id', studentId)
    if (error) {
      toast.error('Could not save name: ' + error.message)
      void loadData()
    }
  }
  function updateFeeLocal(studentId: string, fee: number) {
    setDbStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, weekly_fee: Number(fee) || 0 } : s)))
  }
  async function commitFee(studentId: string, fee: number) {
    const { error } = await supabase.from('students').update({ weekly_fee: Number(fee) || 0 }).eq('id', studentId)
    if (error) {
      toast.error('Could not save rate: ' + error.message)
      void loadData()
    }
  }
  async function setPlan(studentId: string, plan: PaymentPlan) {
    const { error } = await supabase.from('students').update({ payment_plan: plan }).eq('id', studentId)
    if (error) {
      toast.error('Could not save plan: ' + error.message)
      void loadData()
      return
    }
    setDbStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, payment_plan: plan } : s)))
  }
  function updateDailyFeeLocal(studentId: string, fee: number) {
    setDbStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, daily_fee: Number(fee) || 0 } : s)))
  }
  async function commitDailyFee(studentId: string, fee: number) {
    const { error } = await supabase.from('students').update({ daily_fee: Number(fee) || 0 }).eq('id', studentId)
    if (error) {
      toast.error('Could not save daily rate: ' + error.message)
      void loadData()
    }
  }
  async function removeStudent(studentId: string) {
    if (!window.confirm('Remove this student from the roster? Their past payment history is kept but hidden.')) return
    const { error } = await supabase.from('students').update({ weekly_roster_archived: true }).eq('id', studentId)
    if (error) {
      toast.error('Could not remove student: ' + error.message)
      return
    }
    setDbStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, weekly_roster_archived: true } : s)))
    setExpandedId(null)
    toast.success('Removed from roster (history kept)')
  }
  async function addStudent() {
    if (!activeClass) return
    const name = studentForm.name.trim()
    if (!name) {
      toast.error('Student name is required')
      return
    }
    setSaving(true)
    try {
      const existing = new Set(dbStudents.map((s) => s.admission_number))
      for (let i = 0; i < 50; i++) {
        const admissionNumber = generateAdmissionNumber(dbStudents.length + 1 + i)
        if (existing.has(admissionNumber)) continue
        const { error } = await supabase.from('students').insert({
          full_name: name,
          admission_number: admissionNumber,
          class_id: activeClass.id,
          curriculum_id: activeClass.curriculum_id,
          weekly_fee: Number(studentForm.fee) || DEFAULT_WEEKLY_FEE,
          payment_plan: studentForm.plan,
          daily_fee: studentForm.plan === 'daily' ? Number(studentForm.dailyFee) || DEFAULT_DAILY_FEE : null,
          onboarded: false,
          created_by_admin: true,
        })
        if (!error) {
          toast.success(`${name} added to ${activeClass.name}`)
          setStudentForm({ name: '', fee: String(DEFAULT_WEEKLY_FEE), plan: 'weekly', dailyFee: String(DEFAULT_DAILY_FEE) })
          setAddStudentOpen(false)
          await loadData()
          return
        }
        if (error.code === '23505' && /admission_number/i.test(error.message || '')) continue
        toast.error(error.message)
        return
      }
      toast.error('Could not generate a unique admission number')
    } finally {
      setSaving(false)
    }
  }
  async function addClass() {
    const name = classForm.name.trim()
    if (!name || !classForm.curriculum_id) {
      toast.error('Class name and curriculum are required')
      return
    }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({ name, curriculum_id: classForm.curriculum_id, level: 1 })
        .select('id')
        .single()
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success(`${name} created`)
      setClassForm({ name: '', curriculum_id: '' })
      setAddClassOpen(false)
      await loadData()
      if (data?.id) setActiveClassId(data.id)
    } finally {
      setSaving(false)
    }
  }

  function shiftWeek(deltaWeeks: number) {
    if (eventWeeks.length > 0) {
      setEventWeekIndex((prev) =>
        Math.min(eventWeeks.length - 1, Math.max(0, prev + deltaWeeks))
      )
    } else {
      fallbackWeekRef.current = toISODate(addDays(parseISODate(fallbackWeekRef.current), deltaWeeks * 7))
      setWeekTicker((t) => t + 1)
    }
    setExpandedId(null)
  }

  function jumpToCurrentWeek() {
    if (eventWeeks.length === 0) return
    const todayIso = toISODate(new Date())
    let idx = eventWeeks.findIndex(
      (w) => todayIso >= toISODate(w.startDate) && todayIso <= toISODate(w.endDate)
    )
    if (idx === -1) {
      const last = eventWeeks[eventWeeks.length - 1]
      idx = todayIso > toISODate(last.endDate) ? eventWeeks.length - 1 : 0
    }
    setEventWeekIndex(idx)
    setExpandedId(null)
  }

  // ---- Derived rows & totals ----

  const rows = useMemo(() => {
    if (!activeClass) return []
    return activeClass.students
      .map((student) => buildRow(activeClass, student))
      .filter((r) => r.student.name.toLowerCase().includes(search.trim().toLowerCase()))
      .filter((r) => (flaggedOnly ? r.balance > 0 : true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClass, payments, feeOverrides, promises, weekStart, search, flaggedOnly])

  const classTotals = useMemo(() => {
    const expected = rows.reduce((s, r) => s + r.expected, 0)
    const collected = rows.reduce((s, r) => s + r.paid, 0)
    const outstanding = rows.reduce((s, r) => s + Math.max(0, r.balance), 0)
    const credit = rows.reduce((s, r) => s + Math.max(0, -r.balance), 0)
    const flaggedCount = rows.filter((r) => r.balance > 0).length
    return { expected, collected, outstanding, credit, flaggedCount }
  }, [rows])

  const grandTotals = useMemo(() => {
    let expected = 0, collected = 0, outstanding = 0, credit = 0, flaggedCount = 0
    for (const c of rosterClasses) {
      for (const s of c.students) {
        const r = buildRow(c, s)
        expected += r.expected
        collected += r.paid
        outstanding += Math.max(0, r.balance)
        credit += Math.max(0, -r.balance)
        if (r.balance > 0) flaggedCount += 1
      }
    }
    const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 100
    return { expected, collected, outstanding, credit, flaggedCount, collectionRate }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterClasses, payments, feeOverrides, promises, weekStart])

  // ---- Analytics: trend follows the tuition event's own weeks ----
  const trendData = useMemo(() => {
    if (eventWeeks.length > 0) {
      return eventWeeks.map((w) => {
        const wk = toISODate(w.startDate)
        let expected = 0
        let collected = 0
        for (const c of rosterClasses) {
          for (const s of c.students) {
            expected += expectedFeeForStudent(s, wk)
            collected += paidTotalForStudent(s.id, wk)
          }
        }
        return {
          week: `Wk ${w.weekNumber}`,
          range: `${formatShort(w.startDate)} – ${formatShort(w.endDate)}`,
          expected,
          collected,
        }
      })
    }
    const out: { week: string; range: string; expected: number; collected: number }[] = []
    const base = parseISODate(weekStart)
    for (let i = 7; i >= 0; i--) {
      const wk = toISODate(addDays(base, -i * 7))
      let expected = 0
      let collected = 0
      for (const c of rosterClasses) {
        for (const s of c.students) {
          expected += expectedFeeForStudent(s, wk)
          collected += paidTotalForStudent(s.id, wk)
        }
      }
      out.push({ week: formatShort(parseISODate(wk)), range: '', expected, collected })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventWeeks, rosterClasses, payments, feeOverrides, weekStart])

  const methodBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>()
    for (const p of payments) {
      const m = p.method || 'Other'
      const cur = map.get(m) ?? { count: 0, amount: 0 }
      cur.count += 1
      cur.amount += Number(p.amount) || 0
      map.set(m, cur)
    }
    const totalAmount = [...map.values()].reduce((s, v) => s + v.amount, 0)
    return [...map.entries()]
      .map(([method, v]) => ({
        method,
        count: v.count,
        amount: v.amount,
        pct: totalAmount ? Math.round((v.amount / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [payments])

  // ---- Peak Coach: analysis across every class in the roster ----
  // Per-student multi-week history feeds the payment-behavior engine and the
  // AI commentary; the current week's coachBrief stays fully deterministic.
  const studentHistories = useMemo(() => {
    const weeks = Array.from(new Set(payments.map((p) => p.weekStart)))
    if (!weeks.includes(weekStart)) weeks.push(weekStart)
    const sorted = [...weeks].sort()
    return rosterClasses.flatMap((c) =>
      c.students.map((student) => ({
        name: student.name,
        className: c.name,
        weeks: sorted.map((wk) => {
          const expected = expectedFeeForStudent(student, wk)
          const entries = paymentsFor(payments, student.id, wk)
          const paid = entries.reduce((s, p) => s + (Number(p.amount) || 0), 0)
          const balance = cumulativeBalanceFor(student, wk, payments, promises, feeOverrides, activeDaysForWeek)
          return {
            weekLabel: wk,
            expected,
            paid,
            balance,
            carryIn: balance - (expected - paid),
            promisedDate: promises[weekKey(student.id, wk)] || undefined,
            paymentCount: entries.length,
          }
        }),
      }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterClasses, payments, promises, feeOverrides, weekStart])

  const studentBehaviors = useMemo(
    () => buildStudentBehaviors(studentHistories),
    [studentHistories]
  )

  // Debt aging: how many weeks each outstanding balance has been carried.
  const aging = useMemo(() => computeAging(studentHistories), [studentHistories])

  const coachInput = useMemo<CoachInput>(
    () => ({
      rows: rosterClasses.flatMap((c) =>
        c.students.map((s) => {
          const r = buildRow(c, s)
          return {
            name: r.student.name,
            className: r.className,
            expected: r.expected,
            paid: r.paid,
            balance: r.balance,
            carryIn: r.carryIn,
            promisedDate: r.promisedDate,
            flagLabel: r.flag.label,
            flagTone: r.flag.tone,
            paymentCount: r.entries.length,
          }
        })
      ),
      totals: grandTotals,
      trend: trendData.map((t) => ({ label: t.week, expected: t.expected, collected: t.collected })),
      methods: methodBreakdown.map((m) => ({ method: m.method, count: m.count, amount: m.amount })),
      weekLabel: weekRangeLabel || formatDateLabel(parseISODate(weekStart)),
      behaviors: studentBehaviors,
      aging,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rosterClasses, payments, feeOverrides, promises, weekStart, grandTotals, trendData, methodBreakdown, weekRangeLabel, studentBehaviors, aging]
  )

  const coachBrief = useMemo(() => buildCoachBrief(coachInput), [coachInput])

  // AI commentary: fire-and-forget after a short debounce so every logged
  // payment doesn't hammer the provider chain. The deterministic brief above
  // always drives the panel; the AI only adds a labelled commentary paragraph
  // and returns null on any failure.
  const [aiCommentary, setAiCommentary] = useState<CoachCommentary | null>(null)
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const coachInputKey = useMemo(() => JSON.stringify(coachInput), [coachInput])

  useEffect(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    const t = setTimeout(async () => {
      try {
        const res = await generateCoachCommentary(coachInput)
        setAiCommentary(res)
      } catch {
        setAiCommentary(null)
      }
    }, 1200)
    aiTimerRef.current = t
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachInputKey])

  // Clicking a flag/insight jumps to the student's class and opens its detail.
  const handleCoachNavigate = useCallback((studentName: string) => {
    setFlaggedOnly(false)
    for (const c of rosterClasses) {
      const student = c.students.find((s) => s.name === studentName)
      if (student) {
        setActiveClassId(c.id)
        setExpandedId(student.id)
        setSearch(student.name)
        return
      }
    }
    setSearch(studentName)
  }, [rosterClasses])

  // ---- CSV export ----
  function exportBalances(scope: 'class' | 'all') {
    const allRows = scope === 'class' && activeClass
      ? activeClass.students.map((s) => buildRow(activeClass, s))
      : rosterClasses.flatMap((c) => c.students.map((s) => buildRow(c, s)))
    const withBalance = allRows.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance)
    if (withBalance.length === 0) {
      toast('No accounts carry a balance for this week')
      return
    }
    const header = ['Class', 'Student name', 'Standard rate', 'Expected this week', 'Paid this week', 'Carried-in balance', 'Total balance owed', 'Status flag', 'Promised date']
    const lines = withBalance.map((r) => [
      r.className,
      r.student.name,
      r.student.fee,
      r.expected,
      r.paid,
      r.carryIn,
      r.balance,
      r.flag.label,
      r.promisedDate || '',
    ])
    const csv = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-payments-balances-${weekStart}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${withBalance.length} account${withBalance.length === 1 ? '' : 's'}`)
  }

  // ---- Peak Coach weekly report (manual trigger) ----
  async function sendWeeklyReport() {
    setSendingReport(true)
    try {
      const res = await fetch('/api/admin/weekly-payment-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId || null,
          weekStart: weekStart || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to generate report')

      for (const pdf of (data.pdfs || []) as { name: string; data: string }[]) {
        const bytes = atob(pdf.data)
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
        const blob = new Blob([arr], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = pdf.name
        a.click()
        URL.revokeObjectURL(url)
      }

      if (data.emailed) {
        toast.success(`Report emailed to ${data.recipients.length} recipient${data.recipients.length === 1 ? '' : 's'}`)
      } else {
        toast('Report generated — email not sent (SMTP not configured or the send failed; see server logs)')
      }
    } catch (error: any) {
      toast.error(error.message || 'Could not generate report')
    } finally {
      setSendingReport(false)
    }
  }

  if (loading) {
    return (
      <div className="wp-root">
        <style>{STYLES}</style>
        <div className="wp-container">
          <div className="wp-skeleton">
            <div className="wp-skeleton-line" style={{ width: '40%' }} />
            <div className="wp-skeleton-line" style={{ width: '70%' }} />
            <div className="wp-skeleton-line" style={{ width: '55%' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wp-root">
      <style>{STYLES}</style>
      <div className="wp-container">
        <div className="wp-header">
          <div>
            <h1 className="wp-title">Weekly Payments</h1>
            <p className="wp-subtitle">Log every payment as it comes in — partial, full, or in installments — and follow up before balances go overdue.</p>
          </div>
          <div className="wp-week">
            <select
              value={selectedEventId}
              onChange={(e) => { setSelectedEventId(e.target.value); setExpandedId(null) }}
              className="wp-event-select"
              title="Filter weeks by tuition event"
            >
              {tuitionEvents.length === 0 && <option value="">No tuition events</option>}
              {tuitionEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.is_active ? '● ' : ''}{ev.name}
                </option>
              ))}
            </select>
            <button onClick={() => shiftWeek(-1)} className="wp-week-btn" aria-label="Previous week" disabled={eventWeeks.length > 0 && eventWeekIndex <= 0}>‹</button>
            <div className="wp-week-label">
              <div className="wp-week-caption">
                {eventWeeks.length > 0
                  ? `Week ${eventWeeks[Math.min(eventWeekIndex, eventWeeks.length - 1)].weekNumber} of ${eventWeeks.length}`
                  : 'Week of (Monday)'}
              </div>
              <div className="wp-week-value">{formatDateLabel(parseISODate(weekStart))}</div>
              {weekRangeLabel && <div className="wp-week-range">{weekRangeLabel}</div>}
            </div>
            <button onClick={() => shiftWeek(1)} className="wp-week-btn" aria-label="Next week" disabled={eventWeeks.length > 0 && eventWeekIndex >= eventWeeks.length - 1}>›</button>
            {eventWeeks.length > 0 && (
              <button onClick={() => jumpToCurrentWeek()} className="wp-week-now" title="Back to the current week">
                Today
              </button>
            )}
          </div>
        </div>

        <PeakCoachPanel brief={coachBrief} aging={aging} aiCommentary={aiCommentary} onNavigate={handleCoachNavigate} />

        <div className="wp-summary-grid">
          <SummaryCard label="Expected this week" value={formatMoney(grandTotals.expected)} />
          <SummaryCard label="Collected so far" value={formatMoney(grandTotals.collected)} tone="green" />
          <SummaryCard
            label="Collection rate"
            value={`${grandTotals.collectionRate}%`}
            tone={grandTotals.collectionRate >= 90 ? 'green' : grandTotals.collectionRate >= 60 ? 'amber' : 'red'}
          />
          <SummaryCard
            label="Total owed"
            value={formatMoney(grandTotals.outstanding)}
            tone={grandTotals.outstanding > 0 ? 'amber' : 'green'}
            sub="includes carried-over debt"
          />
          <SummaryCard
            label="Credit on account"
            value={formatMoney(grandTotals.credit)}
            tone={grandTotals.credit > 0 ? 'blue' : 'navy'}
            sub="overpayments waiting to apply"
          />
          <SummaryCard label="Accounts to follow up" value={String(grandTotals.flaggedCount)} tone={grandTotals.flaggedCount > 0 ? 'red' : 'green'} />
        </div>
        <p className="wp-analytics-note">
          "Total owed" and "Credit on account" already account for every prior week — a student who overpays now will show that credit here until it's used up.
        </p>

        <div className="wp-tabs">
          {rosterClasses.map((c) => {
            const flaggedInClass = c.students.filter((s) => balanceForStudent(s, weekStart) > 0).length
            const active = c.id === activeClassId
            return (
              <button
                key={c.id}
                onClick={() => { setActiveClassId(c.id); setExpandedId(null) }}
                className={`wp-tab${active ? ' active' : ''}`}
              >
                {c.name}
                <span className="wp-tab-badge">{c.students.length}</span>
                {flaggedInClass > 0 && <span className="wp-tab-flag">{flaggedInClass}</span>}
              </button>
            )
          })}
          <button onClick={() => setAddClassOpen(true)} className="wp-add-class">+ Add class</button>
        </div>

        <div className="wp-toolbar">
          <div className="wp-toolbar-left">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student…"
              className="wp-search"
            />
            <label className="wp-checkbox-label">
              <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
              Show only balances owing
            </label>
          </div>
          <div className="wp-toolbar-right">
            <button onClick={sendWeeklyReport} disabled={sendingReport} className="wp-btn-export" title="Generate + email the Peak Coach weekly report">
              {sendingReport ? 'Generating…' : '✦ Send weekly report'}
            </button>
            <button onClick={() => exportBalances('class')} className="wp-btn-export" title="Download CSV of students owing in this class">⬇ Export class</button>
            <button onClick={() => exportBalances('all')} className="wp-btn-export" title="Download CSV of every student owing this week">⬇ Export all</button>
            <button onClick={() => setAddStudentOpen(true)} disabled={!activeClass} className="wp-btn-primary">
              + Add student {activeClass ? `to ${activeClass.name}` : ''}
            </button>
          </div>
        </div>

        {rosterClasses.length === 0 ? (
          <div className="wp-card">
            <div className="wp-empty-state">
              <div className="wp-title">No classes yet</div>
              <p className="wp-analytics-note">Create your first class to start tracking weekly fees.</p>
              <button onClick={() => setAddClassOpen(true)} className="wp-btn-primary">+ Add class</button>
            </div>
          </div>
        ) : (
          <div className="wp-card">
            <div className="wp-table-wrap">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th style={{ width: 24 }}></th>
                    <th style={{ width: 40 }}>#</th>
                    <th style={{ minWidth: 170 }}>Student</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Expected</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Paid</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Balance</th>
                    <th style={{ width: 112 }}>Status</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <RosterRow
                      key={row.student.id}
                      row={row}
                      index={i}
                      expanded={expandedId === row.student.id}
                      onToggle={() => setExpandedId(expandedId === row.student.id ? null : row.student.id)}
                      onRename={(name) => renameStudentLocal(row.student.id, name)}
                      onRenameCommit={() => commitRename(row.student.id, row.student.name)}
                      onFeeOverride={(v) => setFeeOverride(row.student.id, v)}
                      onDefaultFee={(v) => updateFeeLocal(row.student.id, Number(v) || 0)}
                      onFeeCommit={() => commitFee(row.student.id, row.student.fee)}
                      onPlanChange={(plan) => setPlan(row.student.id, plan)}
                      onDailyFee={(v) => updateDailyFeeLocal(row.student.id, Number(v) || 0)}
                      onDailyFeeCommit={() => commitDailyFee(row.student.id, row.student.dailyFee || DEFAULT_DAILY_FEE)}
                      onAddPayment={(entry) => addPayment(row.student.id, entry)}
                      onRemovePayment={removePayment}
                      onPromiseChange={(date) => setPromise(row.student.id, date)}
                      onRemoveStudent={() => removeStudent(row.student.id)}
                    />
                  ))}
                  {rows.length === 0 && (
                    <tr className="wp-empty-row">
                      <td colSpan={8}>{search || flaggedOnly ? 'No students match this view.' : `No students in ${activeClass?.name ?? 'this class'} yet — add one above.`}</td>
                    </tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Totals for {activeClass?.name}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(classTotals.expected)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(classTotals.collected)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--red)' }}>{formatMoney(classTotals.outstanding)}</td>
                      <td colSpan={2} style={{ fontSize: 12, fontWeight: 500 }}>
                        {classTotals.flaggedCount} account{classTotals.flaggedCount !== 1 ? 's' : ''} with a balance
                        {classTotals.credit > 0 ? ` · ${formatMoney(classTotals.credit)} in credit on other accounts` : ''}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        <div className="wp-analytics-grid">
          <div className="wp-chart-card">
            <h3 className="wp-chart-title">Collection trend</h3>
            <p className="wp-chart-sub">
              {eventWeeks.length > 0
                ? `Expected vs. collected across every teaching week of ${selectedEvent?.name ?? 'this event'}`
                : 'Expected vs. collected per week (last 8 weeks)'}
            </p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip
                  formatter={(v: number | string, name: string) => [formatMoney(Number(v)), name]}
                  labelFormatter={(label: string, payload: any[]) => payload?.[0]?.payload?.range || label}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name="Expected" dataKey="expected" fill="#1B3A5C" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar name="Collected" dataKey="collected" fill="#7C9A4E" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="wp-chart-card">
            <h3 className="wp-chart-title">Payment methods</h3>
            <p className="wp-chart-sub">All recorded payments, by amount</p>
            {methodBreakdown.length === 0 ? (
              <p className="wp-empty-note" style={{ padding: '24px 0' }}>No payments recorded yet.</p>
            ) : (
              <div style={{ marginTop: 8 }}>
                {methodBreakdown.map((m) => (
                  <div key={m.method} className="wp-method-row">
                    <span className="wp-method-label">{m.method}</span>
                    <div className="wp-method-bar">
                      <div className="wp-method-fill" style={{ width: `${Math.max(4, m.pct)}%`, background: METHOD_COLORS[m.method] ?? '#6B7280' }} />
                    </div>
                    <span className="wp-method-val">{formatMoney(m.amount)} · {m.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="wp-footnote">
          Every payment, fee override and promised date is saved to the database, and the week view follows the selected tuition
          event's own teaching weeks automatically. Click any row to open its payment history — add each payment as it's received
          (any number of times per week), record a promised date if the balance isn't cleared, and everything saves automatically.
          Overpay one week and the extra automatically covers the next. "Send weekly report" generates the Peak Coach PDF report
          (expected, collected, outstanding) plus a list of students with outstanding balances and emails both to the admin —
          the same report is emailed automatically every Friday at 11:30 am.
        </p>
      </div>

      {/* Add class modal */}
      {addClassOpen && (
        <div className="wp-modal-overlay" onClick={() => setAddClassOpen(false)}>
          <div className="wp-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wp-modal-title">Add class</h3>
            <p className="wp-modal-sub">Creates a new roster page in the classes table.</p>
            <div className="wp-modal-field">
              <label className="wp-field-label">Class name</label>
              <input className="wp-input grow" value={classForm.name} onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Form 2" autoFocus />
            </div>
            <div className="wp-modal-field">
              <label className="wp-field-label">Curriculum</label>
              <select className="wp-select" style={{ width: '100%' }} value={classForm.curriculum_id} onChange={(e) => setClassForm((f) => ({ ...f, curriculum_id: e.target.value }))}>
                <option value="">Select curriculum…</option>
                {curriculums.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="wp-modal-actions">
              <button className="wp-btn-cancel" onClick={() => setAddClassOpen(false)}>Cancel</button>
              <button className="wp-btn-primary" onClick={addClass} disabled={saving || !classForm.name.trim() || !classForm.curriculum_id}>
                {saving ? 'Creating…' : 'Create class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add student modal */}
      {addStudentOpen && activeClass && (
        <div className="wp-modal-overlay" onClick={() => setAddStudentOpen(false)}>
          <div className="wp-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wp-modal-title">Add student to {activeClass.name}</h3>
            <p className="wp-modal-sub">A new student record is created with a generated admission number.</p>
            <div className="wp-modal-field">
              <label className="wp-field-label">Full name</label>
              <input className="wp-input grow" value={studentForm.name} onChange={(e) => setStudentForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Amina Hassan" autoFocus />
            </div>
            <div className="wp-modal-field">
              <label className="wp-field-label">Payment plan</label>
              <select className="wp-select" style={{ width: '100%' }} value={studentForm.plan} onChange={(e) => setStudentForm((f) => ({ ...f, plan: e.target.value as PaymentPlan }))}>
                <option value="weekly">Weekly — flat fee per teaching week</option>
                <option value="daily">Daily — fee per teaching day</option>
              </select>
            </div>
            {studentForm.plan === 'daily' ? (
              <div className="wp-modal-field">
                <label className="wp-field-label">Daily fee (KSh)</label>
                <input type="number" className="wp-input amount" value={studentForm.dailyFee} onChange={(e) => setStudentForm((f) => ({ ...f, dailyFee: e.target.value }))} />
              </div>
            ) : (
              <div className="wp-modal-field">
                <label className="wp-field-label">Weekly fee (KSh)</label>
                <input type="number" className="wp-input amount" value={studentForm.fee} onChange={(e) => setStudentForm((f) => ({ ...f, fee: e.target.value }))} />
              </div>
            )}
            <div className="wp-modal-actions">
              <button className="wp-btn-cancel" onClick={() => setAddStudentOpen(false)}>Cancel</button>
              <button className="wp-btn-primary" onClick={addStudent} disabled={saving || !studentForm.name.trim()}>
                {saving ? 'Adding…' : 'Add student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// Roster row (collapsible payment detail)
// ---------------------------------------------------------------------
interface RosterRowProps {
  row: any
  index: number
  expanded: boolean
  onToggle: () => void
  onRename: (name: string) => void
  onRenameCommit: () => void
  onFeeOverride: (value: string) => void
  onDefaultFee: (value: string) => void
  onFeeCommit: () => void
  onPlanChange: (plan: PaymentPlan) => void
  onDailyFee: (value: string) => void
  onDailyFeeCommit: () => void
  onAddPayment: (entry: { date: string; amount: number; method: string; note?: string }) => void
  onRemovePayment: (id: string) => void
  onPromiseChange: (date: string) => void
  onRemoveStudent: () => void
}

function RosterRow({
  row, index, expanded, onToggle, onRename, onRenameCommit, onFeeOverride, onDefaultFee, onFeeCommit,
  onPlanChange, onDailyFee, onDailyFeeCommit,
  onAddPayment, onRemovePayment, onPromiseChange, onRemoveStudent,
}: RosterRowProps) {
  const { student, expected, entries, paid, balance, carryIn, promisedDate, flag } = row
  const plan: PaymentPlan = student.plan === 'daily' ? 'daily' : 'weekly'
  const dailyRate = plan === 'daily'
    ? (Number(student.dailyFee) || DEFAULT_DAILY_FEE)
    : Math.round((student.fee || DEFAULT_WEEKLY_FEE) / DAYS_PER_WEEK)

  const [form, setForm] = useState({ date: toISODate(new Date()), days: 'custom', amount: '', method: 'Cash', note: '' })

  function handleDaysChange(days: string) {
    if (days === 'custom') setForm((f) => ({ ...f, days }))
    else setForm((f) => ({ ...f, days, amount: String(dailyRate * Number(days)) }))
  }
  function submitPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return
    onAddPayment({ date: form.date, amount: Number(form.amount), method: form.method, note: form.note })
    setForm({ date: toISODate(new Date()), days: 'custom', amount: '', method: 'Cash', note: '' })
  }
  function quickPay(amount: number, note: string) {
    if (amount <= 0) return
    onAddPayment({ date: toISODate(new Date()), amount, method: 'Cash', note })
  }

  const balanceClass = balance > 0 ? 'owe' : balance < 0 ? 'credit' : 'clear'

  return (
    <>
      <tr className={`wp-row${index % 2 ? ' alt' : ''}${expanded ? ' expanded' : ''}`} onClick={onToggle}>
        <td><span className={`wp-chevron${expanded ? ' open' : ''}`}>›</span></td>
        <td style={{ color: 'var(--gray-soft)' }}>{index + 1}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <input value={student.name} onChange={(e) => onRename(e.target.value)} onBlur={onRenameCommit} className="wp-name-input" />
          {carryIn > 0 && <div className="wp-carry-note owe">+ {formatMoney(carryIn)} owed from before</div>}
          {carryIn < 0 && <div className="wp-carry-note credit">− {formatMoney(-carryIn)} credit applied</div>}
        </td>
        <td style={{ textAlign: 'right', color: 'var(--text-soft)' }}>{formatMoney(expected)}</td>
        <td style={{ textAlign: 'right', color: 'var(--text-soft)' }}>{formatMoney(paid)}</td>
        <td className={`wp-balance ${balanceClass}`}>{balance < 0 ? `+${formatMoney(-balance)}` : formatMoney(balance)}</td>
        <td><FlagPill label={flag.label} tone={flag.tone} /></td>
        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
          <button onClick={onRemoveStudent} title="Remove from roster" className="wp-remove-btn">✕</button>
        </td>
      </tr>

      {expanded && (
        <tr className="wp-row-detail">
          <td></td>
          <td colSpan={7}>
            <div className="wp-detail-grid">
              <div>
                <div className="wp-detail-heading">Payments this week ({entries.length})</div>
                {entries.length === 0 ? (
                  <p className="wp-empty-note">No payments recorded yet for this week.</p>
                ) : (
                  <ul className="wp-ledger-list">
                    {entries.map((p: PaymentEntry) => (
                      <li key={p.id} className="wp-ledger-item">
                        <div>
                          <span className="wp-ledger-amount">{formatMoney(p.amount)}</span>{' '}
                          <span className="wp-ledger-meta">· {formatShort(parseISODate(p.date))}</span>{' '}
                          {p.method && <span className="wp-ledger-meta">· {p.method}</span>}
                          {p.note && <div className="wp-ledger-note">{p.note}</div>}
                        </div>
                        <button onClick={() => onRemovePayment(p.id)} className="wp-remove-btn" style={{ fontSize: 12 }}>Remove</button>
                      </li>
                    ))}
                  </ul>
                )}

                {balance > 0 && (
                  <div className="wp-quick-row">
                    <button type="button" className="wp-btn-quick" onClick={() => quickPay(expected, "Quick pay: this week's fee")}>
                      Pay this week ({formatMoney(expected)})
                    </button>
                    <button type="button" className="wp-btn-quick" onClick={() => quickPay(balance, 'Quick pay: clear full balance')}>
                      Clear everything owed ({formatMoney(balance)})
                    </button>
                  </div>
                )}

                <form onSubmit={submitPayment} className="wp-payment-form">
                  <div>
                    <label className="wp-field-label">Date paid</label>
                    <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="wp-date" />
                  </div>
                  <div>
                    <label className="wp-field-label">Days covered</label>
                    <select value={form.days} onChange={(e) => handleDaysChange(e.target.value)} className="wp-select">
                      <option value="custom">Custom</option>
                      {[1, 2, 3, 4, 5].map((d) => (
                        <option key={d} value={d}>{d} day{d > 1 ? 's' : ''} (~{formatMoney(dailyRate * d)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="wp-field-label">Amount</label>
                    <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value, days: 'custom' }))}
                      placeholder="0" className="wp-input amount" />
                  </div>
                  <div>
                    <label className="wp-field-label">Method</label>
                    <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} className="wp-select">
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="wp-field-grow">
                    <label className="wp-field-label">Note (optional)</label>
                    <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="e.g. 2nd installment" className="wp-input grow" />
                  </div>
                  <button type="submit" className="wp-btn-green">+ Add payment</button>
                </form>
                {balance < 0 && (
                  <p className="wp-info-text">
                    This account is {formatMoney(-balance)} in credit — that amount will automatically reduce what shows as owed next week, no action needed.
                  </p>
                )}
              </div>

              <div>
                <div className="wp-detail-heading">Expected this week</div>
                <div className="wp-fee-row">
                  <input type="number" value={expected} onChange={(e) => onFeeOverride(e.target.value)} className="wp-input small" />
                  <span className="wp-standard-rate">
                    {plan === 'daily'
                      ? `standard rate: ${formatMoney(Number(student.dailyFee) || DEFAULT_DAILY_FEE)}/day`
                      : `standard rate: ${formatMoney(student.fee)}/week`}
                  </span>
                </div>
                <p className="wp-info-text">
                  Only change this if the arrangement for THIS week is different (e.g. attending fewer days). To
                  change their normal rate going forward, edit it below instead.
                </p>
                <div className="wp-rate-row">
                  <label className="wp-rate-label">Payment plan:</label>
                  <select value={plan} onChange={(e) => onPlanChange(e.target.value as PaymentPlan)} className="wp-select">
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
                {plan === 'daily' ? (
                  <div className="wp-rate-row">
                    <label className="wp-rate-label">Standard daily rate:</label>
                    <input type="number" value={Number(student.dailyFee) || DEFAULT_DAILY_FEE} onChange={(e) => onDailyFee(e.target.value)} onBlur={onDailyFeeCommit} className="wp-input small" />
                  </div>
                ) : (
                  <div className="wp-rate-row">
                    <label className="wp-rate-label">Standard weekly rate:</label>
                    <input type="number" value={student.fee} onChange={(e) => onDefaultFee(e.target.value)} onBlur={onFeeCommit} className="wp-input small" />
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <div className="wp-detail-heading">Promised payment date</div>
                  <input
                    type="date"
                    value={promisedDate}
                    onChange={(e) => onPromiseChange(e.target.value)}
                    disabled={balance <= 0}
                    className="wp-date"
                  />
                  <p className="wp-info-text">
                    Set this when the student/parent says they'll pay later. The status flag updates automatically
                    as that date gets close or passes.
                  </p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function SummaryCard({ label, value, tone = 'navy', sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="wp-summary-card">
      <div className="wp-summary-label">{label}</div>
      <div className={`wp-summary-value ${tone}`}>{value}</div>
      {sub && <div className="wp-summary-sub">{sub}</div>}
    </div>
  )
}
