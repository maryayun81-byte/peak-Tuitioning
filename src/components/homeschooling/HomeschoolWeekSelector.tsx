'use client'

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Card'
import type { HomeschoolWeek } from '@/types/homeschooling'

interface Props {
  weeks: HomeschoolWeek[]
  selectedIndex: number
  onChange: (index: number) => void
}

const WEEK_STATUS_BADGES: Record<string, { variant: 'success' | 'warning' | 'muted' | 'info'; label: string }> = {
  DRAFT: { variant: 'muted', label: 'Draft' },
  PUBLISHED: { variant: 'success', label: 'Active' },
  ARCHIVED: { variant: 'info', label: 'Archived' },
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const fmt = (d: Date) => d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
  return `${fmt(s)} – ${fmt(e)}`
}

export function HomeschoolWeekSelector({ weeks, selectedIndex, onChange }: Props) {
  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex < weeks.length - 1
  const current = weeks[selectedIndex]

  if (!current) return null

  const badgeInfo = WEEK_STATUS_BADGES[current.status] || WEEK_STATUS_BADGES.DRAFT

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        disabled={!hasPrev}
        onClick={() => onChange(selectedIndex - 1)}
        className="rounded-xl"
      >
        <ChevronLeft size={18} />
      </Button>

      <div className="flex items-center gap-2.5 min-w-[180px] justify-center">
        <CalendarDays size={14} style={{ color: 'var(--primary)' }} />
        <div className="text-center">
          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>
            Week {current.week_number}
          </div>
          <div className="text-[10px] font-bold opacity-50">
            {formatDateRange(current.start_date, current.end_date)}
          </div>
        </div>
        <Badge variant={badgeInfo.variant} className="text-[9px] uppercase">
          {badgeInfo.label}
        </Badge>
      </div>

      <Button
        variant="ghost"
        size="icon"
        disabled={!hasNext}
        onClick={() => onChange(selectedIndex + 1)}
        className="rounded-xl"
      >
        <ChevronRight size={18} />
      </Button>
    </div>
  )
}
