'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Download, Plus, Calendar, Clock,
  CheckCircle, Loader2, TrendingUp, TrendingDown, BarChart2,
  ChevronDown
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface FinancialReport {
  id: string
  title: string
  report_type: string
  period_start: string
  period_end: string
  total_revenue: number
  total_expenses: number
  net_profit: number
  pdf_url: string | null
  created_at: string
}

interface TuitionEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
}

/** A generated Mon–Fri teaching week derived from a tuition event */
interface EventWeek {
  index: number          // 1-based week number within the event
  from: string           // ISO date of first teaching day
  to: string             // ISO date of last teaching day (Fri or event end)
  label: string          // human label e.g. "Week 1 · Mon 7 Apr – Fri 11 Apr"
  days: { day: string; date: string }[] // Mon-Fri schedule
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Generates Mon–Fri weeks for a tuition event.
 * Correctly handles events that start mid-week (e.g. starting on Tuesday):
 * - Week 1 spans from the actual start day to the following Friday
 * - Subsequent weeks are always Mon–Fri
 * - The last week is capped at the event end_date
 */
function generateEventWeeks(event: TuitionEvent): EventWeek[] {
  const weeks: EventWeek[] = []

  const start = new Date(event.start_date + 'T00:00:00')
  const end = new Date(event.end_date + 'T00:00:00')

  // Find the Friday of the week containing start (or start itself if it's Friday)
  const startDow = start.getDay() // 0=Sun, 1=Mon … 6=Sat
  // How many days until the next Friday (or today if already Fri)
  const daysToFriday = startDow <= 5 ? 5 - startDow : 0  // Sun would give 6 days, cap
  const firstWeekEnd = new Date(start)
  firstWeekEnd.setDate(start.getDate() + (startDow === 6 ? 6 : daysToFriday)) // skip Sat

  // If start is Saturday, nudge to Monday
  const effectiveStart = new Date(start)
  if (startDow === 6) effectiveStart.setDate(start.getDate() + 2)

  let weekStart = new Date(effectiveStart)
  let weekIndex = 1

  while (weekStart <= end) {
    // End of this week: Friday of the current week
    const weekDow = weekStart.getDay()
    const daysToFri = weekDow <= 5 ? 5 - weekDow : 6 - weekDow
    const rawWeekEnd = new Date(weekStart)
    rawWeekEnd.setDate(weekStart.getDate() + daysToFri)

    // Cap at event end
    const weekEnd = rawWeekEnd > end ? end : rawWeekEnd

    // Build daily schedule (only Mon–Fri days within the window)
    const days: { day: string; date: string }[] = []
    const cur = new Date(weekStart)
    while (cur <= weekEnd) {
      const dow = cur.getDay()
      if (dow >= 1 && dow <= 5) { // Mon–Fri only
        days.push({
          day: SHORT_DAYS[dow],
          date: cur.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        })
      }
      cur.setDate(cur.getDate() + 1)
    }

    if (days.length > 0) {
      const fromStr = weekStart.toISOString().split('T')[0]
      const toStr = weekEnd.toISOString().split('T')[0]

      const fromLabel = weekStart.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      const toLabel = weekEnd.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

      weeks.push({
        index: weekIndex,
        from: fromStr,
        to: toStr,
        label: `Week ${weekIndex} · ${fromLabel} – ${toLabel}`,
        days,
      })
      weekIndex++
    }

    // Advance to next Monday
    const nextMonday = new Date(weekEnd)
    nextMonday.setDate(weekEnd.getDate() + 1)
    // Skip to Monday if weekend
    while (nextMonday.getDay() !== 1) nextMonday.setDate(nextMonday.getDate() + 1)
    weekStart = nextMonday
  }

  return weeks
}

export default function WeeklyReports() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Tuition event selector
  const [events, setEvents] = useState<TuitionEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<TuitionEvent | null>(null)
  const [eventWeeks, setEventWeeks] = useState<EventWeek[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0) // index into eventWeeks[]

  // Compute weeks when event changes
  useEffect(() => {
    if (!selectedEvent) { setEventWeeks([]); return }
    const weeks = generateEventWeeks(selectedEvent)
    setEventWeeks(weeks)
    setSelectedWeekIndex(0)
  }, [selectedEvent])

  // Load events
  useEffect(() => {
    supabase
      .from('tuition_events')
      .select('id, name, start_date, end_date, is_active')
      .order('start_date', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setEvents(data ?? [])
        const active = (data ?? []).find((e: TuitionEvent) => e.is_active)
        setSelectedEvent(active ?? (data?.[0] ?? null))
      })
  }, [supabase])

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('financial_reports')
        .select('*')
        .eq('report_type', 'weekly')
        .order('created_at', { ascending: false })
        .limit(20)
      setReports(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadReports() }, [loadReports])

  const selectedWeek = eventWeeks[selectedWeekIndex] ?? null

  const generateReport = async () => {
    if (!selectedWeek) { toast.error('Please select a tuition event and week'); return }
    setGenerating(true)
    const week = selectedWeek
    try {
      // Fetch all data for the week
      const [paymentsRes, expensesRes, centersRes, catRes] = await Promise.all([
        supabase.from('payments')
          .select('amount, currency, payment_date, method, receipt_number, tuition_center_id, center:tuition_centers(name), student:students(full_name), tuition_event:tuition_events(name)')
          .gte('payment_date', week.from).lte('payment_date', week.to),
        supabase.from('expenses')
          .select('amount, description, expense_date, tuition_center_id, category:expense_categories(name, color), center:tuition_centers(name)')
          .gte('expense_date', week.from).lte('expense_date', week.to),
        supabase.from('tuition_centers').select('id, name').order('name'),
        supabase.from('expense_categories').select('name, color'),
      ])

      const payments = paymentsRes.data ?? []
      const expenses = expensesRes.data ?? []
      const centers = centersRes.data ?? []

      const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
      const netProfit = totalRevenue - totalExpenses

      // Build the PDF
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      // ===========================
      // PAGE 1: COVER
      // ===========================
      doc.setFillColor(11, 15, 26)
      doc.rect(0, 0, 210, 297, 'F')

      // Accent bar
      doc.setFillColor(245, 158, 11)
      doc.rect(0, 0, 8, 297, 'F')

      // Logo
      try {
        const imgRes = await fetch('/logo.png')
        const imgBlob = await imgRes.blob()
        const reader = new FileReader()
        await new Promise<void>(resolve => {
          reader.onload = () => {
            try { doc.addImage(reader.result as string, 'PNG', 80, 30, 50, 45) } catch {}
            resolve()
          }
          reader.readAsDataURL(imgBlob)
        })
      } catch {}

      doc.setTextColor(245, 158, 11)
      doc.setFontSize(28)
      doc.setFont('helvetica', 'bold')
      doc.text('PEAK PERFORMANCE', 105, 100, { align: 'center' })
      doc.text('TUTORING', 105, 112, { align: 'center' })

      doc.setTextColor(180, 180, 180)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'normal')
      doc.text('WEEKLY FINANCIAL REPORT', 105, 128, { align: 'center' })

      // Decorative line
      doc.setDrawColor(245, 158, 11)
      doc.setLineWidth(0.5)
      doc.line(40, 135, 170, 135)

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(week.label, 105, 148, { align: 'center' })

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text(`Report Period: ${week.from} to ${week.to}`, 105, 158, { align: 'center' })
      doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 105, 165, { align: 'center' })

      // Summary boxes on cover
      const summaryBoxes = [
        { label: 'TOTAL REVENUE', value: formatCurrency(totalRevenue), color: [16, 185, 129] as [number, number, number] },
        { label: 'TOTAL EXPENSES', value: formatCurrency(totalExpenses), color: [239, 68, 68] as [number, number, number] },
        { label: 'NET PROFIT', value: formatCurrency(netProfit), color: netProfit >= 0 ? [245, 158, 11] as [number, number, number] : [239, 68, 68] as [number, number, number] },
      ]

      summaryBoxes.forEach((box, i) => {
        const x = 20 + i * 60
        doc.setFillColor(...box.color)
        doc.roundedRect(x, 190, 52, 30, 4, 4, 'F')
        doc.setFillColor(0, 0, 0, 60)
        doc.roundedRect(x, 190, 52, 30, 4, 4, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text(box.label, x + 26, 199, { align: 'center' })
        doc.setFontSize(10)
        doc.text(box.value, x + 26, 210, { align: 'center' })
        const txns = i === 0 ? `${payments.length} payments` : i === 1 ? `${expenses.length} expenses` : `${((netProfit / (totalRevenue || 1)) * 100).toFixed(1)}% margin`
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(200, 200, 200)
        doc.text(txns, x + 26, 216, { align: 'center' })
      })

      doc.setFontSize(7)
      doc.setTextColor(80, 80, 80)
      doc.text('CONFIDENTIAL — FOR INTERNAL USE ONLY', 105, 285, { align: 'center' })

      // ===========================
      // PAGE 2: REVENUE BY CENTER
      // ===========================
      doc.addPage()
      doc.setFillColor(245, 249, 252)
      doc.rect(0, 0, 210, 297, 'F')
      doc.setFillColor(11, 15, 26)
      doc.rect(0, 0, 210, 20, 'F')
      doc.setTextColor(245, 158, 11)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('PEAK PERFORMANCE TUTORING', 15, 12)
      doc.setTextColor(160, 160, 160)
      doc.setFontSize(8)
      doc.text(`Weekly Report — ${week.from} to ${week.to}`, 130, 12)

      doc.setTextColor(11, 15, 26)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('REVENUE BREAKDOWN', 15, 35)
      doc.setLineWidth(0.3)
      doc.setDrawColor(245, 158, 11)
      doc.line(15, 38, 195, 38)

      // Revenue by center table
      const centerRevMap = new Map<string, number>()
      payments.forEach((p: any) => {
        const name = p.center?.name ?? 'Unassigned'
        centerRevMap.set(name, (centerRevMap.get(name) ?? 0) + Number(p.amount))
      })

      autoTable(doc, {
        startY: 45,
        head: [['Tuition Center', 'Payments', 'Revenue (KES)', '% Share']],
        body: [
          ...Array.from(centerRevMap.entries()).map(([name, rev]) => {
            const count = payments.filter((p: any) => (p.center?.name ?? 'Unassigned') === name).length
            return [name, count.toString(), rev.toLocaleString('en-KE'), `${((rev / totalRevenue) * 100).toFixed(1)}%`]
          }),
          [
            { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [245, 158, 11] } },
            { content: payments.length.toString(), styles: { fontStyle: 'bold', fillColor: [245, 158, 11] } },
            { content: totalRevenue.toLocaleString('en-KE'), styles: { fontStyle: 'bold', fillColor: [245, 158, 11] } },
            { content: '100%', styles: { fontStyle: 'bold', fillColor: [245, 158, 11] } },
          ],
        ],
        headStyles: { fillColor: [11, 15, 26], textColor: [245, 158, 11], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' } },
        margin: { left: 15, right: 15 },
      })

      let y2 = (doc as any).lastAutoTable.finalY + 15

      // Individual payments list
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(11, 15, 26)
      doc.text('PAYMENT TRANSACTIONS', 15, y2)
      doc.setLineWidth(0.3)
      doc.setDrawColor(16, 185, 129)
      doc.line(15, y2 + 3, 195, y2 + 3)

      autoTable(doc, {
        startY: y2 + 8,
        head: [['Date', 'Student', 'Center', 'Event', 'Method', 'Amount (KES)']],
        body: payments.map((p: any) => [
          p.payment_date,
          (p.student?.full_name ?? 'Unknown').substring(0, 20),
          (p.center?.name ?? 'N/A').substring(0, 15),
          (p.tuition_event?.name ?? 'General').substring(0, 15),
          p.method,
          Number(p.amount).toLocaleString('en-KE'),
        ]),
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 255, 252] },
        columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 15, right: 15 },
      })

      // ===========================
      // PAGE 3: EXPENSES BREAKDOWN
      // ===========================
      doc.addPage()
      doc.setFillColor(245, 249, 252)
      doc.rect(0, 0, 210, 297, 'F')
      doc.setFillColor(11, 15, 26)
      doc.rect(0, 0, 210, 20, 'F')
      doc.setTextColor(245, 158, 11)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('PEAK PERFORMANCE TUTORING', 15, 12)
      doc.setTextColor(160, 160, 160)
      doc.setFontSize(8)
      doc.text(`Weekly Report — ${week.from} to ${week.to}`, 130, 12)

      doc.setTextColor(11, 15, 26)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('EXPENSES BREAKDOWN', 15, 35)
      doc.setLineWidth(0.3)
      doc.setDrawColor(239, 68, 68)
      doc.line(15, 38, 195, 38)

      const catMap = new Map<string, number>()
      expenses.forEach((e: any) => {
        const cat = e.category?.name ?? 'Other'
        catMap.set(cat, (catMap.get(cat) ?? 0) + Number(e.amount))
      })

      autoTable(doc, {
        startY: 45,
        head: [['Category', 'Amount (KES)', '% of Expenses']],
        body: [
          ...Array.from(catMap.entries()).map(([cat, amt]) => [
            cat, amt.toLocaleString('en-KE'), `${((amt / (totalExpenses || 1)) * 100).toFixed(1)}%`
          ]),
          [
            { content: 'TOTAL', styles: { fontStyle: 'bold' } },
            { content: totalExpenses.toLocaleString('en-KE'), styles: { fontStyle: 'bold' } },
            { content: '100%', styles: { fontStyle: 'bold' } },
          ],
        ],
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [255, 248, 248] },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
        margin: { left: 15, right: 15 },
      })

      const y3 = (doc as any).lastAutoTable.finalY + 15
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('EXPENSE TRANSACTIONS', 15, y3)
      doc.setDrawColor(239, 68, 68)
      doc.line(15, y3 + 3, 195, y3 + 3)

      autoTable(doc, {
        startY: y3 + 8,
        head: [['Date', 'Description', 'Center', 'Category', 'Amount (KES)']],
        body: expenses.map((e: any) => [
          e.expense_date,
          (e.description ?? '').substring(0, 25),
          (e.center?.name ?? 'N/A').substring(0, 15),
          (e.category?.name ?? 'Other'),
          Number(e.amount).toLocaleString('en-KE'),
        ]),
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [255, 248, 248] },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 15, right: 15 },
      })

      // ===========================
      // PAGE 4: SUMMARY & SIGNATURE
      // ===========================
      doc.addPage()
      doc.setFillColor(11, 15, 26)
      doc.rect(0, 0, 210, 297, 'F')
      doc.setFillColor(245, 158, 11)
      doc.rect(0, 0, 8, 297, 'F')

      // Payment method breakdown
      const methodMap = new Map<string, number>()
      payments.forEach((p: any) => {
        methodMap.set(p.method ?? 'Other', (methodMap.get(p.method ?? 'Other') ?? 0) + Number(p.amount))
      })

      doc.setTextColor(245, 158, 11)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('WEEKLY SUMMARY', 105, 25, { align: 'center' })
      doc.setDrawColor(245, 158, 11)
      doc.setLineWidth(0.5)
      doc.line(40, 29, 170, 29)

      // Big numbers
      const summaryData = [
        { label: 'Total Revenue', val: formatCurrency(totalRevenue), color: [16, 185, 129] as [number, number, number] },
        { label: 'Total Expenses', val: formatCurrency(totalExpenses), color: [239, 68, 68] as [number, number, number] },
        { label: 'Net Profit / Loss', val: formatCurrency(Math.abs(netProfit)), color: netProfit >= 0 ? [245, 158, 11] as [number, number, number] : [239, 68, 68] as [number, number, number] },
        { label: 'Total Transactions', val: payments.length.toString(), color: [139, 92, 246] as [number, number, number] },
        { label: 'Profit Margin', val: `${((netProfit / (totalRevenue || 1)) * 100).toFixed(1)}%`, color: [14, 165, 233] as [number, number, number] },
      ]

      summaryData.forEach((item, i) => {
        const y = 40 + i * 22
        doc.setFillColor(...item.color)
        doc.roundedRect(20, y, 170, 16, 3, 3, 'F')
        doc.setFillColor(0, 0, 0, 50)
        doc.roundedRect(20, y, 170, 16, 3, 3, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(item.label, 28, y + 8)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(item.val, 182, y + 10, { align: 'right' })
      })

      // Payment method breakdown
      const y4 = 160
      doc.setTextColor(245, 158, 11)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('PAYMENT METHODS', 105, y4, { align: 'center' })

      autoTable(doc, {
        startY: y4 + 5,
        head: [['Method', 'Count', 'Total (KES)', '% Share']],
        body: Array.from(methodMap.entries()).map(([method, amt]) => [
          method,
          payments.filter((p: any) => (p.method ?? 'Other') === method).length.toString(),
          amt.toLocaleString('en-KE'),
          `${((amt / (totalRevenue || 1)) * 100).toFixed(1)}%`,
        ]),
        headStyles: { fillColor: [50, 55, 70], textColor: [245, 158, 11], fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [220, 220, 220], fillColor: [25, 30, 45] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' } },
        margin: { left: 20, right: 20 },
      })

      // Signature area
      const ySig = (doc as any).lastAutoTable.finalY + 25
      doc.setDrawColor(100, 100, 100)
      doc.setLineWidth(0.3)
      doc.line(20, ySig + 15, 85, ySig + 15)
      doc.line(125, ySig + 15, 190, ySig + 15)
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(8)
      doc.text('Prepared by (Finance)', 20, ySig + 20)
      doc.text('Approved by (Director)', 125, ySig + 20)
      doc.setFontSize(7)
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, ySig + 26)
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 125, ySig + 26)

      doc.setFontSize(7)
      doc.setTextColor(60, 60, 60)
      doc.text('Peak Performance Tutoring — Weekly Financial Report — CONFIDENTIAL', 105, 285, { align: 'center' })

      // Add page numbers to all pages
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(80, 80, 80)
        if (i > 1) doc.text(`Page ${i} of ${pageCount}`, 195, 292, { align: 'right' })
      }

      // Save PDF locally
      const fileName = `weekly_report_${week.from}.pdf`
      doc.save(fileName)

      // Save record to DB
      await supabase.from('financial_reports').insert({
        title: `Weekly Report — ${week.label}`,
        report_type: 'weekly',
        period_start: week.from,
        period_end: week.to,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        pdf_url: null, // Would require Supabase storage upload
        generated_by: profile?.id,
      })

      toast.success('Weekly report generated & downloaded!', { duration: 5000 })
      loadReports()
    } catch (err) {
      console.error('Report generation error:', err)
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text)' }}>Weekly Reports</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Generate comprehensive weekly financial PDFs with full branding
          </p>
        </div>
      </div>

      {/* Generate New Report */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)' }} />
          <h2 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <FileText size={20} style={{ color: '#F59E0B' }} />
            Generate New Weekly Report
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            Creates a 4-page branded PDF containing: cover page, revenue by center, expense breakdown, payment methods, and signature page.
          </p>

          {/* Tuition Event Selector */}
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              Tuition Event
            </label>
            <div className="relative">
              <select
                value={selectedEvent?.id ?? ''}
                onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value) ?? null)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
                style={{ background: 'var(--input)', border: '1px solid var(--card-border)', color: 'var(--text)', paddingRight: 36 }}
              >
                <option value="">Select event…</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} {ev.is_active ? '(Active)' : ''} · {ev.start_date} – {ev.end_date}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Generated Weeks Grid */}
          {eventWeeks.length > 0 && (
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Select Teaching Week
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {eventWeeks.map((w, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedWeekIndex(idx)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: selectedWeekIndex === idx ? 'rgba(245,158,11,0.12)' : 'var(--input)',
                      border: `1px solid ${selectedWeekIndex === idx ? '#F59E0B' : 'var(--card-border)'}`,
                    }}
                  >
                    <p className="text-sm font-bold" style={{ color: selectedWeekIndex === idx ? '#F59E0B' : 'var(--text)' }}>
                      Week {w.index}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {w.from} – {w.to}
                    </p>
                    {/* Day pills */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {w.days.map((d, di) => (
                        <span key={di} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: selectedWeekIndex === idx ? 'rgba(245,158,11,0.15)' : 'var(--card)', color: 'var(--text-muted)' }}>
                          {d.day} {d.date}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedEvent && eventWeeks.length === 0 && (
            <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              No teaching weeks found for this event.
            </div>
          )}

          {!selectedEvent && (
            <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
              Please select a tuition event to view available weeks.
            </div>
          )}

          {/* Features list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 mt-2">
            {[
              'Branded cover page with logo',
              'Revenue breakdown by center',
              'Full payment transaction list',
              'Expense breakdown by category',
              'Payment method distribution',
              'Signature & approval area',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <CheckCircle size={14} style={{ color: '#10B981' }} />
                {f}
              </div>
            ))}
          </div>

          <Button
            onClick={generateReport}
            disabled={generating || !selectedWeek}
            size="lg"
            className="w-full sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <Plus size={16} />
                Generate & Download Report
              </>
            )}
          </Button>
        </Card>
      </motion.div>

      {/* Past Reports */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Report History</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--card)' }} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <Card className="p-10 text-center">
            <FileText size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>No reports generated yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Generate your first weekly report above</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report, i) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(245,158,11,0.1)' }}>
                        <FileText size={20} style={{ color: '#F59E0B' }} />
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: 'var(--text)' }}>{report.title}</p>
                        <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                          <Calendar size={12} />
                          {formatDate(report.period_start)} → {formatDate(report.period_end)}
                          <Clock size={12} />
                          {formatDate(report.created_at, 'relative')}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
                            <TrendingUp size={12} /> {formatCurrency(Number(report.total_revenue))}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
                            <TrendingDown size={12} /> {formatCurrency(Number(report.total_expenses))}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: Number(report.net_profit) >= 0 ? '#F59E0B' : '#EF4444' }}>
                            <BarChart2 size={12} /> Net: {formatCurrency(Number(report.net_profit))}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                        Generated
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
