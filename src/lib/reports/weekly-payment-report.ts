import fs from 'fs'
import path from 'path'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getEventWeeks } from '@/lib/utils'
import {
  toISODate, parseISODate, weekKey, paymentsFor, expectedFeeFor,
  cumulativeBalanceFor, computeFlag,
} from '@/lib/weekly-payments'
import type { PaymentEntry, RosterStudent, Flag } from '@/lib/weekly-payments'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

const CURRENCY = 'KSh'
const RESEND_API_URL = 'https://api.resend.com/emails'

// ---------------------------------------------------------------------
// Brand palette (sampled from public/logo.png)
// ---------------------------------------------------------------------
type RGB = [number, number, number]
const BRAND_NAVY: RGB = [27, 67, 119]
const BRAND_NAVY_DARK: RGB = [11, 15, 26]
const BRAND_GOLD: RGB = [245, 158, 11]
const BRAND_GREEN: RGB = [22, 163, 74]
const BRAND_RED: RGB = [220, 38, 38]
const BRAND_BLUE: RGB = [59, 130, 246]
const INK: RGB = [30, 41, 59]
const MUTED: RGB = [100, 116, 139]
const CARD_BG: RGB = [248, 250, 252]

let cachedLogoBase64: string | null | undefined

function getLogoBase64(): string | null {
  if (cachedLogoBase64 !== undefined) return cachedLogoBase64
  try {
    const file = path.join(process.cwd(), 'public', 'logo.png')
    if (!fs.existsSync(file)) {
      cachedLogoBase64 = null
      return null
    }
    cachedLogoBase64 = fs.readFileSync(file).toString('base64')
  } catch {
    cachedLogoBase64 = null
  }
  return cachedLogoBase64
}

// ---------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------
export interface WeeklyReportRow {
  studentId: string
  name: string
  className: string
  weeklyFee: number
  expected: number
  paid: number
  balance: number
  carryIn: number
  promisedDate: string | null
  flag: Flag
}

export interface WeeklyReportSummary {
  eventName: string
  eventId: string | null
  weekLabel: string
  weekStart: string
  weekEnd: string
  weekNumber: number
  totalStudents: number
  expected: number
  collected: number
  outstanding: number
  credit: number
  collectionRate: number
  flaggedCount: number
  perClass: {
    name: string
    students: number
    expected: number
    collected: number
    outstanding: number
    credit: number
  }[]
  rows: WeeklyReportRow[]
}

// ---------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------
export async function loadEventAndWeek(
  supabase: any,
  opts: { eventId?: string | null; weekStart?: string | null; today?: Date } = {}
): Promise<{
  event: any
  eventWeeks: any[]
  weekStart: string
  weekEnd: string
  weekNumber: number
  weekLabel: string
}> {
  const today = opts.today || new Date()
  const todayIso = toISODate(today)

  let eventQuery = supabase
    .from('tuition_events')
    .select('id, name, start_date, end_date, active_days, is_active, status')
    .order('start_date', { ascending: false })

  if (opts.eventId) eventQuery = eventQuery.eq('id', opts.eventId)
  else eventQuery = eventQuery.eq('is_active', true)

  let { data: events, error } = await eventQuery.limit(10)
  if (error) throw error

  let event: any = null
  if (!opts.eventId && events && events.length > 0) {
    event = events[0]
  } else if (events && events.length > 0) {
    event = events[0]
  }

  if (!event) {
    const { data: fallback } = await supabase
      .from('tuition_events')
      .select('id, name, start_date, end_date, active_days, is_active, status')
      .order('start_date', { ascending: false })
      .limit(1)
    event = fallback?.[0] ?? null
  }

  if (!event) {
    const monday = parseISODate(toISODate(today))
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1))
    const weekStart = toISODate(monday)
    const weekEnd = toISODate(addDaysDate(monday, 4))
    return {
      event: null,
      eventWeeks: [],
      weekStart,
      weekEnd,
      weekNumber: 1,
      weekLabel: `${formatRange(weekStart, weekEnd)}`,
    }
  }

  const { data: holidays } = await supabase.from('holidays').select('date')
  const holidayDates = (holidays || []).map((h: any) => h.date as string)

  const weeks = getEventWeeks(event.start_date, event.end_date, event.active_days || [], holidayDates)

  let weekStart: string
  let weekEnd: string
  let weekNumber: number
  let weekLabel: string

  if (opts.weekStart) {
    const target = weeks.find((w) => toISODate(w.startDate) === opts.weekStart)
    if (target) {
      weekStart = opts.weekStart
      weekEnd = toISODate(target.endDate)
      weekNumber = target.weekNumber
      weekLabel = target.label
    } else {
      weekStart = opts.weekStart
      const monday = parseISODate(opts.weekStart)
      weekEnd = toISODate(addDaysDate(monday, 4))
      weekNumber = 0
      weekLabel = formatRange(weekStart, weekEnd)
    }
  } else {
    let found = weeks.find((w) => todayIso >= toISODate(w.startDate) && todayIso <= toISODate(w.endDate))
    if (!found && weeks.length > 0) {
      found = todayIso > toISODate(weeks[weeks.length - 1].endDate) ? weeks[weeks.length - 1] : weeks[0]
    }
    if (found) {
      weekStart = toISODate(found.startDate)
      weekEnd = toISODate(found.endDate)
      weekNumber = found.weekNumber
      weekLabel = found.label
    } else {
      const monday = parseISODate(toISODate(today))
      monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1))
      weekStart = toISODate(monday)
      weekEnd = toISODate(addDaysDate(monday, 4))
      weekNumber = 0
      weekLabel = formatRange(weekStart, weekEnd)
    }
  }

  return { event, eventWeeks: weeks, weekStart, weekEnd, weekNumber, weekLabel }
}

export async function loadAllWeeklyData(supabase: any): Promise<{
  classes: Record<string, string>
  students: RosterStudent[]
  studentClassMap: Record<string, string>
  payments: PaymentEntry[]
  feeOverrides: Record<string, number>
  promises: Record<string, string>
}> {
  const [classRes, studentRes, payRes, overrideRes, promiseRes] = await Promise.all([
    supabase.from('classes').select('id, name'),
    supabase.from('students').select('id, full_name, class_id, weekly_fee').eq('weekly_roster_archived', false),
    supabase.from('student_weekly_payments').select('id, student_id, week_start, paid_date, amount, method, note'),
    supabase.from('student_weekly_overrides').select('student_id, week_start, amount'),
    supabase.from('student_weekly_promises').select('student_id, week_start, promised_date'),
  ])

  if (classRes.error) throw classRes.error
  if (studentRes.error) throw studentRes.error
  if (payRes.error) throw payRes.error
  if (overrideRes.error) throw overrideRes.error
  if (promiseRes.error) throw promiseRes.error

  const classes: Record<string, string> = {}
  for (const c of classRes.data ?? []) classes[c.id] = c.name

  const studentClassMap: Record<string, string> = {}
  const students: RosterStudent[] = (studentRes.data ?? []).map((s: any) => {
    studentClassMap[s.id] = s.class_id
    return {
      id: s.id,
      name: s.full_name,
      fee: Number(s.weekly_fee) || 1250,
    }
  })

  const payments: PaymentEntry[] = (payRes.data ?? []).map((p: any) => ({
    id: p.id,
    studentId: p.student_id,
    weekStart: p.week_start,
    date: p.paid_date,
    amount: Number(p.amount) || 0,
    method: p.method || 'Cash',
    note: p.note || undefined,
  }))

  const feeOverrides: Record<string, number> = {}
  for (const o of overrideRes.data ?? []) feeOverrides[weekKey(o.student_id, o.week_start)] = Number(o.amount) || 0

  const promises: Record<string, string> = {}
  for (const p of promiseRes.data ?? []) promises[weekKey(p.student_id, p.week_start)] = p.promised_date

  return { classes, students, studentClassMap, payments, feeOverrides, promises }
}

export function computeSummary(
  data: Awaited<ReturnType<typeof loadAllWeeklyData>>,
  week: { weekStart: string; weekEnd: string },
  today: Date = new Date()
): WeeklyReportSummary {
  const rows: WeeklyReportRow[] = []
  const perClassMap = new Map<string, { students: number; expected: number; collected: number; outstanding: number; credit: number }>()

  for (const student of data.students) {
    const expected = expectedFeeFor(student, week.weekStart, data.feeOverrides)
    const entries = paymentsFor(data.payments, student.id, week.weekStart)
    const paid = entries.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const balance = cumulativeBalanceFor(student, week.weekStart, data.payments, data.promises, data.feeOverrides)
    const carryIn = balance - (expected - paid)
    const promisedDate = data.promises[weekKey(student.id, week.weekStart)] || null
    const flag = computeFlag({ balance, promisedDate: promisedDate || '', weekStart: week.weekStart }, today)

    const className = data.classes[data.studentClassMap[student.id]] || 'Unassigned'

    rows.push({
      studentId: student.id,
      name: student.name,
      className,
      weeklyFee: student.fee,
      expected,
      paid,
      balance,
      carryIn,
      promisedDate,
      flag,
    })

    const cur = perClassMap.get(className) ?? { students: 0, expected: 0, collected: 0, outstanding: 0, credit: 0 }
    cur.students += 1
    cur.expected += expected
    cur.collected += paid
    cur.outstanding += Math.max(0, balance)
    cur.credit += Math.max(0, -balance)
    perClassMap.set(className, cur)
  }

  const perClass = [...perClassMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const expected = rows.reduce((s, r) => s + r.expected, 0)
  const collected = rows.reduce((s, r) => s + r.paid, 0)
  const outstanding = rows.reduce((s, r) => s + Math.max(0, r.balance), 0)
  const credit = rows.reduce((s, r) => s + Math.max(0, -r.balance), 0)
  const flaggedCount = rows.filter((r) => r.balance > 0).length

  return {
    eventName: '',
    eventId: null,
    weekLabel: '',
    weekNumber: 0,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    totalStudents: rows.length,
    expected,
    collected,
    outstanding,
    credit,
    collectionRate: expected > 0 ? Math.round((collected / expected) * 100) : 100,
    flaggedCount,
    perClass,
    rows,
  }
}

// ---------------------------------------------------------------------
// PDF builders
// ---------------------------------------------------------------------
export function buildWeeklyReportPdf(
  summary: WeeklyReportSummary,
  opts: { title?: string; subtitle?: string } = {}
): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const title = opts.title || 'Weekly Payments Report'
  const subtitle = opts.subtitle || `${summary.eventName ? summary.eventName + ' · ' : ''}${summary.weekLabel}`
  const generatedAt = formatGeneratedAt(new Date())

  drawHeader(doc, title, subtitle, generatedAt)

  // KPI cards
  drawKpiRow(doc, [
    { label: 'Expected', value: money(summary.expected), accent: BRAND_NAVY },
    { label: 'Collected', value: money(summary.collected), accent: BRAND_GREEN },
    { label: 'Outstanding', value: money(summary.outstanding), accent: BRAND_RED },
    { label: 'Collection rate', value: `${summary.collectionRate}%`, accent: BRAND_GOLD },
  ])

  // Charts row: donut (collection split) + per-class bar chart
  drawChartsRow(doc, summary)

  // Per-class summary table
  drawSectionTitle(doc, 'Collection by class', getChartsBottom() + 6)
  autoTable(doc, {
    startY: getChartsBottom() + 11,
    head: [['Class', 'Students', 'Expected', 'Collected', 'Outstanding', 'Credit']],
    body: summary.perClass.map((c) => [
      c.name,
      String(c.students),
      money(c.expected),
      money(c.collected),
      money(c.outstanding),
      money(c.credit),
    ]),
    theme: 'grid',
    headStyles: { fillColor: BRAND_NAVY, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3, textColor: INK },
    alternateRowStyles: { fillColor: CARD_BG },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold', textColor: BRAND_GREEN },
      4: { halign: 'right', textColor: BRAND_RED },
      5: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  })

  // Detail table — paginated with repeated headers.
  // Balance is never shown as a negative number: an overpayment is displayed as
  // a positive "Credit", and "Carried In" is the amount that rolls into the next
  // billing period (the net credit/debt on the account).
  const detailRows = summary.rows.map((r) => [
    r.className,
    r.name,
    money(r.expected),
    money(r.paid),
    r.balance, // signed; rendered below as Credit (green) or blank
    r.balance, // signed; rendered below as Carried In |balance|
    r.flag.label,
    r.promisedDate || '',
  ])
  drawSectionTitle(doc, `Student detail (${summary.rows.length} students)`, (doc as any).lastAutoTable.finalY + 8)
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 13,
    head: [['Class', 'Student', 'Expected', 'Paid', 'Credit', 'Carried In', 'Status', 'Promised']],
    body: detailRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_NAVY, textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: INK },
    alternateRowStyles: { fillColor: CARD_BG },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 24, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 4) {
        const b = Number(data.row.raw[4])
        data.cell.text = [b < 0 ? money(-b) : '']
        if (b < 0) data.cell.styles.textColor = BRAND_GREEN
      }
      if (data.section === 'body' && data.column.index === 5) {
        const b = Number(data.row.raw[5])
        data.cell.text = [money(Math.abs(b))]
        data.cell.styles.textColor = b < 0 ? BRAND_GREEN : b > 0 ? BRAND_RED : INK
      }
      if (data.section === 'body' && data.column.index === 6) {
        const tone = toneColor(data.cell.raw as string)
        if (tone) data.cell.styles.textColor = tone
      }
    },
  })

  stampFooters(doc)
  return Buffer.from(doc.output('arraybuffer'))
}

export function buildOutstandingBalancesPdf(
  summary: WeeklyReportSummary,
  opts: { title?: string; subtitle?: string } = {}
): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const title = opts.title || 'Students with Outstanding Balances'
  const subtitle = opts.subtitle || `${summary.eventName ? summary.eventName + ' · ' : ''}${summary.weekLabel}`
  const generatedAt = formatGeneratedAt(new Date())

  drawHeader(doc, title, subtitle, generatedAt)

  const owing = summary.rows
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance)
  const totalOwing = owing.reduce((s, r) => s + r.balance, 0)
  const avgOwing = owing.length ? Math.round(totalOwing / owing.length) : 0

  drawKpiRow(doc, [
    { label: 'Students owing', value: String(owing.length), accent: BRAND_RED },
    { label: 'Total outstanding', value: money(totalOwing), accent: BRAND_RED },
    { label: 'Average balance', value: money(avgOwing), accent: BRAND_GOLD },
    { label: 'Promised payments', value: String(owing.filter((r) => r.promisedDate).length), accent: BRAND_BLUE },
  ])

  // Status distribution donut
  drawSectionTitle(doc, 'Debt by status', 71)
  drawDebtDonut(doc, summary)

  drawSectionTitle(doc, 'Outstanding balance detail', getChartsBottom() + 6)
  autoTable(doc, {
    startY: getChartsBottom() + 11,
    head: [['#', 'Class', 'Student', 'Expected', 'Paid', 'Outstanding', 'Carried In', 'Status', 'Promised']],
    body: owing.map((r, i) => [
      String(i + 1),
      r.className,
      r.name,
      money(r.expected),
      money(r.paid),
      money(r.balance),
      money(r.carryIn),
      r.flag.label,
      r.promisedDate || '',
    ]),
    theme: 'striped',
    headStyles: { fillColor: BRAND_RED, textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: INK },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold', textColor: BRAND_RED },
      6: { halign: 'right' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 24, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 7) {
        const tone = toneColor(data.cell.raw as string)
        if (tone) data.cell.styles.textColor = tone
      }
    },
  })

  stampFooters(doc)
  return Buffer.from(doc.output('arraybuffer'))
}

// ---------------------------------------------------------------------
// Premium drawing helpers
// ---------------------------------------------------------------------
function drawHeader(doc: jsPDF, title: string, subtitle: string, rightText?: string) {
  const logo = getLogoBase64()

  doc.setFillColor(BRAND_NAVY_DARK[0], BRAND_NAVY_DARK[1], BRAND_NAVY_DARK[2])
  doc.rect(0, 0, 210, 40, 'F')

  // subtle diagonal accent panel
  doc.setFillColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2])
  doc.triangle(210, 0, 210, 40, 150, 0, 'F')

  doc.setFillColor(BRAND_GOLD[0], BRAND_GOLD[1], BRAND_GOLD[2])
  doc.rect(0, 40, 210, 1.4, 'F')

  // Logo
  if (logo) {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(14, 8, 26, 26, 2.5, 2.5, 'F')
    doc.addImage(logo, 'PNG', 16, 10, 22, 22)
  } else {
    doc.setFillColor(BRAND_GOLD[0], BRAND_GOLD[1], BRAND_GOLD[2])
    doc.roundedRect(14, 8, 26, 26, 2.5, 2.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text('P', 27, 25, { align: 'center' })
  }

  // Title block
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, 46, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(200, 210, 225)
  doc.text(subtitle, 46, 27)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(BRAND_GOLD[0], BRAND_GOLD[1], BRAND_GOLD[2])
  doc.text(rightText || '', 196, 12, { align: 'right' })

  // Brand wordmark under right badge
  doc.setFontSize(8)
  doc.setTextColor(170, 180, 200)
  doc.text('PEAK PERFORMANCE TUTORING', 196, 18, { align: 'right' })
}

function drawKpiRow(doc: jsPDF, cards: { label: string; value: string; accent: RGB }[]) {
  const left = 14
  const top = 46
  const gap = 4
  const width = (210 - 14 * 2 - gap * 3) / 4
  const height = 20

  cards.forEach((card, i) => {
    const x = left + i * (width + gap)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, top, width, height, 2.5, 2.5, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(x, top, width, height, 2.5, 2.5, 'S')
    doc.setFillColor(card.accent[0], card.accent[1], card.accent[2])
    doc.rect(x, top, width, 2.2, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text(card.label.toUpperCase(), x + width / 2, top + 8, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(INK[0], INK[1], INK[2])
    doc.text(card.value, x + width / 2, top + 16.5, { align: 'center' })
  })
}

let chartsBottomY = 0
function getChartsBottom() {
  return chartsBottomY || 90
}

function drawChartsRow(doc: jsPDF, summary: WeeklyReportSummary) {
  // Left: collection split donut
  const donutCX = 52
  const donutCY = 96
  const donutR = 24
  const holeR = 13

  drawChartPanel(doc, 14, 70, 92, 62, 'Fee collection split')
  const split: { value: number; color: RGB }[] = [
    { value: Math.max(0, summary.collected), color: BRAND_GREEN },
    { value: Math.max(0, summary.outstanding), color: BRAND_RED },
    { value: Math.max(0, summary.credit), color: BRAND_BLUE },
  ]
  const totalSplit = split.reduce((s, x) => s + x.value, 0)
  if (totalSplit > 0) {
    drawDonut(doc, donutCX, donutCY, donutR, holeR, split)
  } else {
    doc.setFillColor(226, 232, 240)
    doc.circle(donutCX, donutCY, donutR, 'F')
    doc.setFillColor(255, 255, 255)
    doc.circle(donutCX, donutCY, holeR, 'F')
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(`${summary.collectionRate}%`, donutCX, donutCY - 1, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  doc.text('COLLECTED', donutCX, donutCY + 4, { align: 'center' })

  // Legend
  drawLegendItem(doc, 16, 136, 'Collected', money(summary.collected), BRAND_GREEN)
  drawLegendItem(doc, 16, 143, 'Outstanding', money(summary.outstanding), BRAND_RED)
  drawLegendItem(doc, 16, 150, 'Credit', money(summary.credit), BRAND_BLUE)

  // Right: per-class bar chart
  drawChartPanel(doc, 112, 70, 84, 62, 'Collected by class')
  const classData = [...summary.perClass]
    .sort((a, b) => b.collected - a.collected)
    .slice(0, 6)
  drawBarChart(doc, 118, 86, 72, 40, classData)

  chartsBottomY = 158
}

function drawDebtDonut(doc: jsPDF, summary: WeeklyReportSummary) {
  const buckets = new Map<string, number>()
  for (const row of summary.rows) {
    if (row.balance <= 0) continue
    const key = row.flag.label
    buckets.set(key, (buckets.get(key) || 0) + row.balance)
  }
  const segDefs: { label: string; color: RGB }[] = [
    { label: 'Overdue', color: BRAND_RED },
    { label: 'Imminent', color: [249, 115, 22] },
    { label: 'Promised', color: BRAND_BLUE },
    { label: 'Not yet due', color: [148, 163, 184] },
  ]
  const segments = segDefs
    .map((s) => ({ ...s, value: buckets.get(s.label) || 0 }))
    .filter((s) => s.value > 0)

  const cx = 42
  const cy = 100
  const donutR = 22
  const holeR = 12
  const total = segments.reduce((s, x) => s + x.value, 0)

  drawChartPanel(doc, 14, 76, 92, 56, 'Outstanding balances by status')

  if (total > 0) {
    drawDonut(doc, cx, cy, donutR, holeR, segments)
  } else {
    doc.setFillColor(226, 232, 240)
    doc.circle(cx, cy, donutR, 'F')
    doc.setFillColor(255, 255, 255)
    doc.circle(cx, cy, holeR, 'F')
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(money(summary.outstanding), cx, cy - 1, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  doc.text('TOTAL OWING', cx, cy + 4, { align: 'center' })

  let ly = 90
  for (const s of segments) {
    doc.setFillColor(s.color[0], s.color[1], s.color[2])
    doc.roundedRect(74, ly - 1.6, 2.6, 2.6, 0.6, 0.6, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text(s.label, 79, ly)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(INK[0], INK[1], INK[2])
    doc.text(money(s.value), 100, ly, { align: 'right' })
    ly += 6.5
  }

  chartsBottomY = 134
}

function drawChartPanel(doc: jsPDF, x: number, y: number, w: number, h: number, caption: string) {
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(caption, x + 4, y + 6)
}

function drawLegendItem(doc: jsPDF, x: number, y: number, label: string, value: string, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2])
  doc.roundedRect(x, y - 2, 2.6, 2.6, 0.6, 0.6, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  doc.text(label, x + 4.5, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(value, 94, y)
}

// Draws a donut from a list of numeric segments (angle sweep proportional to value).
function drawDonut(doc: jsPDF, cx: number, cy: number, r: number, holeR: number, segments: { value: number; color: RGB }[]) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return

  let start = -Math.PI / 2
  const steps = 48

  for (const seg of segments) {
    const sweep = (seg.value / total) * Math.PI * 2
    const end = start + sweep
    const slice: string[] = []
    for (let i = 0; i <= steps; i++) {
      const a = start + (i / steps) * sweep
      const px = cx + r * Math.cos(a)
      const py = cy + r * Math.sin(a)
      slice.push(i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`)
    }
    // close the slice back to center
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2])
    ;(doc as any).path(`${slice.join(' ')} L ${cx} ${cy} Z`, 'F')
    start = end
  }

  // punch the hole
  doc.setFillColor(255, 255, 255)
  doc.circle(cx, cy, holeR, 'F')
}

function drawBarChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: WeeklyReportSummary['perClass']) {
  const maxCollected = Math.max(1, ...data.map((d) => d.collected))
  const chartH = h - 12
  const barW = 7
  const gap = data.length > 1 ? Math.min(8, (w - data.length * barW) / (data.length - 1)) : 0
  const totalW = data.length * barW + (data.length - 1) * gap
  let bx = x + (w - totalW) / 2

  for (const d of data) {
    const bh = (d.collected / maxCollected) * chartH
    doc.setFillColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2])
    doc.roundedRect(bx, y + chartH - bh, barW, bh, 1.2, 1.2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(INK[0], INK[1], INK[2])
    const short = d.name.length > 8 ? d.name.slice(0, 7) + '…' : d.name
    doc.text(short, bx + barW / 2, y + chartH + 3.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text(money(d.collected), bx + barW / 2, y + chartH - bh - 1.5, { align: 'center' })
    bx += barW + gap
  }

  // baseline
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.3)
  doc.line(x, y + chartH, x + w, y + chartH)
}

function drawSectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2])
  doc.text(text, 14, y)
  doc.setFillColor(BRAND_GOLD[0], BRAND_GOLD[1], BRAND_GOLD[2])
  doc.rect(14, y + 1.2, 18, 1, 'F')
}

function toneColor(label: string): RGB | null {
  switch (label) {
    case 'Paid':
    case 'Credit':
      return BRAND_GREEN
    case 'Overdue':
      return BRAND_RED
    case 'Imminent':
      return [249, 115, 22]
    case 'Promised':
      return BRAND_BLUE
    default:
      return MUTED
  }
}

function stampFooters(doc: jsPDF) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(14, 288, 196, 288)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text('Peak Performance Tutoring · Weekly Payments', 14, 293)
    doc.text(`Page ${i} of ${pages}`, 196, 293, { align: 'right' })
  }
}

function formatGeneratedAt(date: Date) {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------
// Resend email
// ---------------------------------------------------------------------
export interface EmailAttachment {
  filename: string
  content: string // base64
}

export async function sendWeeklyReportEmail(opts: {
  to: string[]
  subject: string
  html: string
  attachments: EmailAttachment[]
}): Promise<{ id: string } | null> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'Peak Performance <onboarding@resend.dev>'
  if (!apiKey) return null

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend email failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data ?? null
}

// ---------------------------------------------------------------------
// Orchestrator (used by cron + admin routes)
// ---------------------------------------------------------------------
export async function runWeeklyPaymentReport(opts: {
  supabase: any
  eventId?: string | null
  weekStart?: string | null
  today?: Date
}): Promise<{ summary: WeeklyReportSummary; emailed: boolean; recipients: string[]; pdf1: string; pdf2: string }> {
  const { event, weekStart, weekEnd, weekNumber, weekLabel } = await loadEventAndWeek(opts.supabase, {
    eventId: opts.eventId,
    weekStart: opts.weekStart,
    today: opts.today,
  })

  const data = await loadAllWeeklyData(opts.supabase)
  const summary = computeSummary(data, { weekStart, weekEnd }, opts.today || new Date())
  summary.eventName = event?.name || ''
  summary.eventId = event?.id || null
  summary.weekLabel = weekLabel
  summary.weekNumber = weekNumber

  const subtitle = `${event?.name ? event.name + ' · ' : ''}${weekLabel}`
  const pdf1 = buildWeeklyReportPdf(summary, {
    title: 'Weekly Payments Report',
    subtitle,
  })
  const pdf2 = buildOutstandingBalancesPdf(summary, {
    title: 'Students with Outstanding Balances',
    subtitle,
  })

  const to: string[] = []
  const envRecipients = (process.env.WEEKLY_REPORT_RECIPIENTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  to.push(...envRecipients)

  if (to.length === 0) {
    const { data: admins } = await opts.supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
    for (const a of admins ?? []) if (a.email) to.push(a.email)
  }

  const uniqueTo = [...new Set(to)]
  let emailed = false

  if (uniqueTo.length > 0) {
    try {
      await sendWeeklyReportEmail({
        to: uniqueTo,
        subject: `Weekly Payments Report — ${weekLabel}`,
        html: `<h2 style="margin:0 0 8px;color:#1B3A5C">Weekly Payments Report</h2>
<p style="margin:0 0 16px;color:#374151"><strong>${event?.name || 'Tuition'}</strong> · ${weekLabel}</p>
<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;margin-bottom:16px">
<tr><td style="border:1px solid #E2E6EA;background:#F5F7F9"><strong>Expected</strong><br>${CURRENCY} ${money(summary.expected)}</td>
<td style="border:1px solid #E2E6EA;background:#F5F7F9"><strong>Collected</strong><br>${CURRENCY} ${money(summary.collected)}</td>
<td style="border:1px solid #E2E6EA;background:#F5F7F9"><strong>Outstanding</strong><br>${CURRENCY} ${money(summary.outstanding)}</td>
<td style="border:1px solid #E2E6EA;background:#F5F7F9"><strong>Collection rate</strong><br>${summary.collectionRate}%</td></tr>
</table>
<p style="color:#6B7280;font-size:13px">Attached: full weekly report (PDF) and the list of students with outstanding balances (PDF).</p>
<p style="color:#9CA3AF;font-size:12px;margin-top:24px">Generated by Peak Coach AI · ${new Date().toLocaleString()}</p>`,
        attachments: [
          { filename: `weekly-payments-report-${weekStart}.pdf`, content: pdf1.toString('base64') },
          { filename: `weekly-payments-outstanding-${weekStart}.pdf`, content: pdf2.toString('base64') },
        ],
      })
      emailed = true
    } catch (e: any) {
      console.error('Weekly report email failed:', e)
    }
  }

  return {
    summary,
    emailed,
    recipients: uniqueTo,
    pdf1: pdf1.toString('base64'),
    pdf2: pdf2.toString('base64'),
  }
}

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------
function money(n: number): string {
  const val = Number(n) || 0
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function addDaysDate(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function formatRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) => parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(startIso)} – ${fmt(endIso)}`
}
