/**
 * Attendance PDF Export
 * Generates a well-designed, branded PDF report for attendance data.
 * Uses jsPDF for PDF generation.
 */

import { calculateAttendancePercentage } from '@/lib/utils'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface AttendanceRecord {
  student_id: string
  class_id: string
  date: string
  week_number: number
  status: AttendanceStatus
  notes?: string
}

interface StudentRecord {
  id: string
  full_name: string
  admission_number: string
  class_id: string
}

interface EventWeek {
  weekNumber: number
  label: string
  activeDates: string[]
  hasHolidays?: boolean
}

interface ClassRecord {
  id: string
  name: string
  curriculum_id?: string
}

interface ExportOptions {
  type: 'class' | 'student' | 'overview'
  viewMode: 'week' | 'event'
  eventName: string
  curriculumName?: string
  weekLabel?: string
  threshold: number
  // Class export
  cls?: ClassRecord
  classes?: ClassRecord[]       // for overview
  students?: StudentRecord[]
  attendance?: AttendanceRecord[]
  allAttendance?: AttendanceRecord[]
  weeks?: EventWeek[]
  selectedWeek?: EventWeek | null
  // Student export
  student?: StudentRecord
}

const BRAND = {
  primary: [124, 58, 237] as [number, number, number],   // Purple
  success: [16, 185, 129] as [number, number, number],   // Green
  danger: [239, 68, 68] as [number, number, number],     // Red
  warning: [245, 158, 11] as [number, number, number],   // Amber
  info: [99, 102, 241] as [number, number, number],      // Indigo
  dark: [15, 23, 42] as [number, number, number],        // Dark navy
  muted: [100, 116, 139] as [number, number, number],    // Slate-500
  light: [241, 245, 249] as [number, number, number],    // Slate-100
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],   // Slate-200
}

function rgb(c: [number, number, number], alpha = 1): string {
  return `rgb(${c.join(',')})`
}

function getStatusColor(status: string): [number, number, number] {
  switch (status) {
    case 'present': return BRAND.success
    case 'absent': return BRAND.danger
    case 'late': return BRAND.warning
    case 'excused': return BRAND.info
    default: return BRAND.muted
  }
}

function getStatusSymbol(status: string): string {
  switch (status) {
    case 'present': return 'P'
    case 'absent': return 'A'
    case 'late': return 'L'
    case 'excused': return 'E'
    default: return '-'
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmtDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function getBreakdown(records: AttendanceRecord[]) {
  return {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    excused: records.filter(r => r.status === 'excused').length,
    total: records.length,
  }
}

export async function exportAttendancePdf(opts: ExportOptions): Promise<void> {
  const jsPDFModule = await import('jspdf')
  const jsPDF = jsPDFModule.default

  const isLandscape = opts.type === 'class' || opts.type === 'overview'
  const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()   // Landscape: 297, Portrait: 210
  const H = doc.internal.pageSize.getHeight()  // Landscape: 210, Portrait: 297
  const L = 14   // left margin
  const R = W - L  // right margin

  let y = 0

  // ── Header stripe ──────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 0, W, 28, 'F')

  // Logo circle
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...BRAND.primary)
  doc.circle(L + 7, 14, 7, 'F')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('PPT', L + 7, 16, { align: 'center' })

  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('Peak Performance Tutoring', L + 18, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Attendance Report', L + 18, 18)

  // Date printed
  doc.setFontSize(7)
  doc.text(`Generated: ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`, R, 18, { align: 'right' })

  y = 34

  // ── Event / scope banner ────────────────────────────────────────────────────
  doc.setFillColor(...BRAND.light)
  doc.roundedRect(L, y, W - 28, 14, 3, 3, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.dark)
  doc.text(`Tuition Event: ${opts.eventName}`, L + 4, y + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.muted)
  const scopeLine = opts.viewMode === 'week'
    ? `Scope: ${opts.weekLabel || 'Current Week'} (Daily Detail)`
    : 'Scope: Full Tuition Event (Summary)'
  const curLine = opts.curriculumName ? `Curriculum: ${opts.curriculumName}` : ''
  const clsLine = opts.cls ? `Class: ${opts.cls.name}` : ''
  doc.text([scopeLine, curLine, clsLine].filter(Boolean).join('   |   '), L + 4, y + 11)
  y += 20

  if (opts.type === 'overview' || opts.type === 'class') {
    await _renderClassReport(doc, opts, W, H, L, R, y)
  } else if (opts.type === 'student') {
    await _renderStudentReport(doc, opts, W, H, L, R, y)
  }

  // ── Footer on all pages ─────────────────────────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFillColor(...BRAND.primary)
    doc.rect(0, H - 10, W, 10, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 255, 255)
    doc.text('Peak Performance Tutoring - Confidential Attendance Record', L, H - 4)
    doc.text(`Page ${p} of ${pageCount}`, R, H - 4, { align: 'right' })
  }

  const filename = opts.type === 'student'
    ? `${opts.student?.admission_number}_${opts.eventName.replace(/\s+/g, '_')}.pdf`
    : `Attendance_${opts.cls?.name || 'Overview'}_${opts.eventName.replace(/\s+/g, '_')}.pdf`

  doc.save(filename)
}

// ── Class / Overview report ─────────────────────────────────────────────────
async function _renderClassReport(
  doc: any, opts: ExportOptions, W: number, H: number, L: number, R: number, startY: number
) {
  let y = startY
  const threshold = opts.threshold

  const dates = opts.viewMode === 'week'
    ? (opts.selectedWeek?.activeDates ?? [])
    : (opts.weeks ?? []).flatMap(w => w.activeDates)

  const students = opts.students ?? []
  const attendance = opts.attendance ?? []

  // ── Section title ──
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.primary)
  doc.text(opts.cls ? `${opts.cls.name} — Student Register` : 'All Classes Overview', L, y)
  y += 8

  // ── Summary stat boxes ──────────────────────────────────────────────────────
  const bd = getBreakdown(attendance)
  const rate = calculateAttendancePercentage(bd.present, bd.total)
  const statsBoxes = [
    { label: 'Attendance Rate', value: `${rate}%`, col: BRAND.primary },
    { label: 'Present', value: bd.present, col: BRAND.success },
    { label: 'Absent', value: bd.absent, col: BRAND.danger },
    { label: 'Late / Excused', value: bd.late + bd.excused, col: BRAND.warning },
  ]
  const bw = (W - 28 - 9) / 4
  statsBoxes.forEach((s, i) => {
    const bx = L + i * (bw + 3)
    doc.setFillColor(...s.col)
    doc.roundedRect(bx, y, bw, 16, 2, 2, 'F')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(String(s.value), bx + bw / 2, y + 8, { align: 'center' })
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(s.label.toUpperCase(), bx + bw / 2, y + 13.5, { align: 'center' })
  })
  y += 22

  if (students.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(...BRAND.muted)
    doc.text('No student data available.', L, y + 10)
    return
  }

  // Layout parameters
  const tableW = W - 28
  const headerH = 10
  const rowH = 9
  const nameColW = 65 // Significantly wider to prevent overlapping
  const rateColW = 18

  // If week mode -> show daily grid. If event mode -> show event summary stats per student.
  const isDailyGrid = opts.viewMode === 'week'

  // Table header
  doc.setFillColor(...BRAND.dark)
  doc.roundedRect(L, y, tableW, headerH, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('STUDENT', L + 3, y + 6.5)

  if (isDailyGrid) {
    const dateColW = Math.min(18, Math.max(10, (tableW - nameColW - rateColW) / Math.max(dates.length, 1)))
    let dateX = L + nameColW
    const maxDates = Math.floor((tableW - nameColW - rateColW) / dateColW)
    const displayDates = dates.slice(0, maxDates)

    displayDates.forEach(d => {
      doc.text(fmtDate(d), dateX + dateColW / 2, y + 4, { align: 'center' })
      const dn = new Date(d).toLocaleDateString('en-US', { weekday: 'short' })
      doc.text(dn, dateX + dateColW / 2, y + 8.5, { align: 'center' })
      dateX += dateColW
    })

    if (dates.length > maxDates) {
      doc.text(`+${dates.length - maxDates} more`, dateX + 4, y + 6.5, { align: 'center' })
    }
  } else {
    // Event summary headers
    const statW = (tableW - nameColW - rateColW) / 5
    const statHeaders = ['SESSIONS', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED']
    let statX = L + nameColW
    statHeaders.forEach(sh => {
      doc.text(sh, statX + statW / 2, y + 6.5, { align: 'center' })
      statX += statW
    })
  }

  doc.text('RATE', R - rateColW / 2, y + 6.5, { align: 'center' })
  y += headerH

  // Prevent breaking too close to bottom margin
  const PAGE_BREAK_Y = H - 20

  // Table rows
  students.forEach((student, si) => {
    // Page break
    if (y + rowH > PAGE_BREAK_Y) {
      doc.addPage()
      y = 15
      // Repeat mini-header
      doc.setFillColor(...BRAND.dark)
      doc.rect(L, y, tableW, 7, 'F')
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('STUDENT (cont.)', L + 3, y + 5)
      doc.text('RATE', R - rateColW / 2, y + 5, { align: 'center' })
      y += 7
    }

    const sAtt = attendance.filter(a => a.student_id === student.id)
    const sBd = getBreakdown(sAtt)
    
    // Using explicit target (dates) for calculation if week grid, 
    // or scoped total if full event summary to ensure empty days don't hyperinflate rate
    const sRate = isDailyGrid 
      ? calculateAttendancePercentage(sBd.present, dates.length || 1)
      : calculateAttendancePercentage(sBd.present, Math.max(sBd.total, 1))

    const flagged = sRate < threshold && sAtt.length > 0

    // Zebra row
    if (si % 2 === 0) {
      doc.setFillColor(...BRAND.light)
      doc.rect(L, y, tableW, rowH, 'F')
    }

    // Flag bad attendance
    if (flagged) {
      doc.setFillColor(254, 226, 226) // red-100
      doc.rect(L, y, tableW, rowH, 'F')
    }

    // Name truncation with elipsis calculation based on ~0.35 * fontsize ratio approximately
    doc.setFontSize(8)
    doc.setFont('helvetica', flagged ? 'bold' : 'normal')
    doc.setTextColor(...BRAND.dark)
    
    const maxChars = 34 // Tuned for 65mm width
    const nameTrunc = student.full_name.length > maxChars ? student.full_name.slice(0, maxChars - 1) + '…' : student.full_name
    doc.text(nameTrunc, L + 3, y + rowH / 2 + 1)

    // Admission number (tiny below)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.muted)
    doc.text(student.admission_number, L + 3, y + rowH - 1.5)

    if (isDailyGrid) {
      // Date cells
      const dateColW = Math.min(18, Math.max(10, (tableW - nameColW - rateColW) / Math.max(dates.length, 1)))
      const displayDates = dates.slice(0, Math.floor((tableW - nameColW - rateColW) / dateColW))
      
      let dx = L + nameColW
      displayDates.forEach(d => {
        const entry = sAtt.find(a => a.date === d)
        const status = entry?.status ?? 'unmarked'
        const sc = getStatusColor(status)
        const sym = getStatusSymbol(status)

        doc.setFillColor(...sc)
        doc.roundedRect(dx + 1.5, y + 1.5, dateColW - 3, rowH - 3, 1.5, 1.5, 'F')

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(sym, dx + dateColW / 2, y + rowH / 2 + 2.5, { align: 'center' })

        dx += dateColW
      })
    } else {
      // Event Summary stats
      const statW = (tableW - nameColW - rateColW) / 5
      let statX = L + nameColW
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      
      // Total Sessions
      doc.setTextColor(...BRAND.dark)
      doc.text(String(sBd.total), statX + statW / 2, y + rowH / 2 + 2.5, { align: 'center' })
      statX += statW
      
      // Present
      doc.setTextColor(...BRAND.success)
      doc.text(String(sBd.present), statX + statW / 2, y + rowH / 2 + 2.5, { align: 'center' })
      statX += statW

      // Absent
      doc.setTextColor(...BRAND.danger)
      doc.text(String(sBd.absent), statX + statW / 2, y + rowH / 2 + 2.5, { align: 'center' })
      statX += statW

      // Late
      doc.setTextColor(...BRAND.warning)
      doc.text(String(sBd.late), statX + statW / 2, y + rowH / 2 + 2.5, { align: 'center' })
      statX += statW

      // Excused
      doc.setTextColor(...BRAND.info)
      doc.text(String(sBd.excused), statX + statW / 2, y + rowH / 2 + 2.5, { align: 'center' })
    }

    // Rate pill
    const rateColor = sRate >= threshold ? BRAND.success : BRAND.danger
    doc.setFillColor(...rateColor)
    doc.roundedRect(R - rateColW + 2, y + 1.5, rateColW - 2, rowH - 3, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`${sRate}%`, R - rateColW / 2 + 1, y + rowH / 2 + 2.5, { align: 'center' })

    y += rowH
  })

  y += 6

  // ── Legend ──────────────────────────────────────────────────────────────────
  if (y + 14 < PAGE_BREAK_Y) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.muted)
    doc.text('LEGEND:', L, y + 5)

    const legend = [
      { sym: 'P', label: 'Present', col: BRAND.success },
      { sym: 'A', label: 'Absent', col: BRAND.danger },
      { sym: 'L', label: 'Late', col: BRAND.warning },
      { sym: 'E', label: 'Excused', col: BRAND.info },
      { sym: '-', label: 'Unmarked', col: BRAND.muted },
    ]
    let lx = L + 20
    legend.forEach(item => {
      doc.setFillColor(...item.col)
      doc.roundedRect(lx, y + 1.5, 6, 5.5, 1, 1, 'F')
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(item.sym, lx + 3, y + 5.5, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...BRAND.muted)
      doc.text(item.label, lx + 8, y + 5.5)
      lx += 28
    })

    y += 14

    // Threshold note
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.setFillColor(254, 226, 226)
    doc.roundedRect(L, y, 95, 8, 2, 2, 'F')
    doc.setTextColor(...BRAND.danger)
    doc.text(`! Highlighted rows = below ${threshold}% attendance threshold`, L + 3, y + 5.5)
  }
}

// ── Student Detail report ───────────────────────────────────────────────────
async function _renderStudentReport(
  doc: any, opts: ExportOptions, W: number, H: number, L: number, R: number, startY: number
) {
  let y = startY
  const student = opts.student!
  const attendance = (opts.allAttendance ?? []).filter(a => a.student_id === student.id)
  const weeks = opts.weeks ?? []
  const threshold = opts.threshold

  // Full event stats
  const bd = getBreakdown(attendance)
  const totalTargetDays = weeks.flatMap(w => w.activeDates).length
  const overallRate = calculateAttendancePercentage(bd.present, totalTargetDays || 1)
  const flagged = overallRate < threshold && bd.total > 0

  // ── Student identity card ───────────────────────────────────────────────────
  const initials = student.full_name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
  doc.setFillColor(...(flagged ? BRAND.danger : BRAND.primary))
  doc.circle(L + 10, y + 10, 10, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(initials, L + 10, y + 13, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.dark)
  const stName = student.full_name.length > 35 ? student.full_name.slice(0, 35) + '...' : student.full_name
  doc.text(stName, L + 24, y + 8)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRAND.muted)
  doc.text(`Admission: ${student.admission_number} | Class: ${opts.cls?.name ?? student.class_id}`, L + 24, y + 15)

  // Overall rate badge
  doc.setFillColor(...(flagged ? BRAND.danger : BRAND.success))
  doc.roundedRect(R - 28, y, 28, 20, 3, 3, 'F')
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(`${overallRate}%`, R - 14, y + 12, { align: 'center' })
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text('OVERALL RATE', R - 14, y + 18, { align: 'center' })
  y += 26

  // ── Summary stat boxes ──────────────────────────────────────────────────────
  const statsBoxes = [
    { label: 'Attended', value: bd.present, col: BRAND.success },
    { label: 'Absent', value: bd.absent, col: BRAND.danger },
    { label: 'Late', value: bd.late, col: BRAND.warning },
    { label: 'Excused', value: bd.excused, col: BRAND.info },
  ]
  const bw = (W - 28 - 9) / 4
  statsBoxes.forEach((s, i) => {
    const bx = L + i * (bw + 3)
    doc.setFillColor(...s.col)
    doc.roundedRect(bx, y, bw, 14, 2, 2, 'F')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(String(s.value), bx + bw / 2, y + 7.5, { align: 'center' })
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(s.label.toUpperCase(), bx + bw / 2, y + 12.5, { align: 'center' })
  })
  y += 20

  // ── Week-by-week breakdown ──────────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.primary)
  doc.text('Week-by-Week Attendance Detail', L, y)
  y += 8

  const PAGE_BREAK_Y = H - 20

  weeks.forEach(week => {
    if (y + 24 > PAGE_BREAK_Y) { doc.addPage(); y = 15 }

    const wAtt = attendance.filter(a => week.activeDates.includes(a.date))
    const wBd = getBreakdown(wAtt)
    const wRate = calculateAttendancePercentage(wBd.present, week.activeDates.length || 1)
    const wFlagged = wRate < threshold && wAtt.length > 0

    // Week header bar
    doc.setFillColor(...(wFlagged ? [253, 237, 237] as [number, number, number] : BRAND.light))
    doc.roundedRect(L, y, W - 28, 8, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(wFlagged ? BRAND.danger : BRAND.dark))
    doc.text(week.label, L + 3, y + 5.5)

    // Rate pill in week header
    doc.setFillColor(...(wRate >= threshold ? BRAND.success : BRAND.danger))
    doc.roundedRect(R - 22, y + 1, 22, 6, 2, 2, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`${wBd.present}/${week.activeDates.length} | ${wRate}%`, R - 11, y + 5.5, { align: 'center' })
    y += 10

    // Day tiles
    const tileW = Math.min(22, (W - 28) / Math.max(week.activeDates.length, 1))
    week.activeDates.forEach((date, di) => {
      const entry = wAtt.find(a => a.date === date)
      const status = entry?.status ?? 'unmarked'
      const sc = getStatusColor(status)
      const tx = L + di * (tileW + 2)

      doc.setFillColor(...sc)
      doc.roundedRect(tx, y, tileW, 12, 2, 2, 'F')

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(getStatusSymbol(status), tx + tileW / 2, y + 6, { align: 'center' })

      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      doc.text(fmtDate(date), tx + tileW / 2, y + 10.5, { align: 'center' })
    })
    y += 14

    // Notes (if any)
    const notes = wAtt.filter(a => a.notes).map(a => `${fmtDate(a.date)}: ${a.notes}`)
    if (notes.length > 0) {
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(...BRAND.muted)
      
      const noteStr = `Notes: ${notes.join(' | ')}`
      // Truncate note if too long so it doesn't wrap off string
      const noteTrunc = noteStr.length > 150 ? noteStr.slice(0, 147) + '...' : noteStr
      doc.text(noteTrunc, L, y)
      y += 5
    }
    y += 4
  })

  // ── Threshold warning ───────────────────────────────────────────────────────
  if (flagged && y + 12 < PAGE_BREAK_Y) {
    doc.setFillColor(254, 226, 226)
    doc.roundedRect(L, y, W - 28, 10, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.danger)
    doc.text(`!  Attendance (${overallRate}%) is below the required ${threshold}% threshold. Parental follow-up advised.`, L + 4, y + 6.5)
  }
}
