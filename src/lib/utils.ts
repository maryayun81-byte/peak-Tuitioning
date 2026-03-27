import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' | 'relative' = 'short') {
  const d = new Date(date)
  
  if (format === 'relative') {
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
  }

  if (format === 'long') {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (format === 'time') {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function generateAdmissionNumber(count: number, year?: number): string {
  const yr = year ?? new Date().getFullYear()
  const padded = String(count).padStart(5, '0')
  return `PPT-${yr}-${padded}`
}

export function generateParentCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000)
  return `PR-${num}`
}

export function generateReceiptNumber(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RCP-${ts}-${rand}`
}

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 10; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function getWorkingDaysBetween(start: Date, end: Date, activeDays: string[]): Date[] {
  const days: Date[] = []
  const current = new Date(start)
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  
  while (current <= end) {
    const dayName = dayNames[current.getDay()]
    if (activeDays.includes(dayName)) {
      days.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function calculateAttendancePercentage(
  present: number,
  totalSessions: number
): number {
  if (totalSessions === 0) return 0
  return Math.round((present / totalSessions) * 100)
}

export function truncate(str: string, maxLen: number) {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function formatCurrency(amount: number, currency = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export interface EventWeek {
  weekNumber: number
  startDate: Date   // Monday of the week
  endDate: Date     // Friday of the week
  activeDates: string[] // ISO date strings (Mon-Fri, minus holidays)
  hasHolidays: boolean
  holidayNames: string[]
  label: string // e.g. "Week 1 (Mar 17 – Mar 21)"
}

/**
 * Given a tuition event and a list of holiday date strings (ISO),
 * returns an array of weeks (Mon–Fri) that fall within the event's date range.
 * Each week excludes holidays and shows how many active days it has.
 */
export function getEventWeeks(
  startDate: string,
  endDate: string,
  activeDays: string[],
  holidayDates: string[] = []
): EventWeek[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const holidaySet = new Set(holidayDates)
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

  // Find the Monday on or before start date
  const firstMonday = new Date(start)
  const dayOfWeek = firstMonday.getDay()
  if (dayOfWeek !== 1) {
    // Move to previous Monday
    firstMonday.setDate(firstMonday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  }

  const weeks: EventWeek[] = []
  let weekStart = new Date(firstMonday)
  let weekNum = 1

  while (weekStart <= end) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 4) // Friday

    const activeDates: string[] = []
    const holidayNamesInWeek: string[] = []

    for (let i = 0; i < 5; i++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + i)
      if (day > end) break
      if (day < start) continue
      const iso = day.toISOString().split('T')[0]
      const dayName = dayNames[day.getDay()]
      if ((activeDays || []).includes(dayName)) {
        if (holidaySet.has(iso)) {
          holidayNamesInWeek.push(iso)
        } else {
          activeDates.push(iso)
        }
      }
    }

    if (activeDates.length > 0 || holidayNamesInWeek.length > 0) {
      const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      const effectiveEnd = weekEnd > end ? end : weekEnd
      weeks.push({
        weekNumber: weekNum,
        startDate: new Date(weekStart),
        endDate: effectiveEnd,
        activeDates,
        hasHolidays: holidayNamesInWeek.length > 0,
        holidayNames: holidayNamesInWeek,
        label: `Week ${weekNum} (${fmt(weekStart)} – ${fmt(effectiveEnd)})${holidayNamesInWeek.length > 0 ? ' 🎉' : ''}`,
      })
      weekNum++
    }

    // Move to next Monday
    weekStart.setDate(weekStart.getDate() + 7)
  }

  return weeks
}

/**
 * Returns the current week number for a tuition event based on today's date.
 * Returns 1 if today is before the event start.
 */
export function getCurrentWeekNumber(
  startDate: string,
  endDate: string,
  activeDays: string[],
  holidayDates: string[] = []
): number {
  const weeks = getEventWeeks(startDate, endDate, activeDays, holidayDates)
  const today = new Date().toISOString().split('T')[0]
  for (const w of weeks) {
    const wEnd = w.endDate.toISOString().split('T')[0]
    const wStart = w.startDate.toISOString().split('T')[0]
    if (today >= wStart && today <= wEnd) return w.weekNumber
  }
  // If today is after event, return last week
  if (weeks.length > 0) {
    const last = weeks[weeks.length - 1]
    const today2 = new Date()
    if (today2 > last.endDate) return last.weekNumber
  }
  return 1
}
