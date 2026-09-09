'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, GraduationCap, CalendarDays, CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  enrollmentId?: string
  studentName?: string
  onHomeClick?: () => void
}

export default function HomeschoolAdminNav({ enrollmentId, studentName, onHomeClick }: Props) {
  const pathname = usePathname()

  const base = '/admin/homeschooling'
  const links = [
    {
      label: 'Hub',
      href: base,
      Icon: LayoutDashboard,
      active: pathname === base,
    },
  ]

  if (enrollmentId) {
    const programHref = `${base}/${enrollmentId}`
    links.push(
      {
        label: 'Program',
        href: programHref,
        Icon: GraduationCap,
        active: pathname === programHref,
      },
      {
        label: 'Timetable',
        href: `${programHref}/timetable`,
        Icon: CalendarDays,
        active: pathname === `${programHref}/timetable`,
      },
      {
        label: 'Weeks',
        href: `${programHref}/weeks`,
        Icon: CalendarRange,
        active: pathname.startsWith(`${programHref}/weeks`),
      }
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {studentName && (
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-50">
          Homeschooling · {studentName}
        </p>
      )}
      <nav aria-label="Homeschooling section" className="flex gap-1.5 overflow-x-auto pb-1">
        {links.map(({ label, href, Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            onClick={(e) => {
              if (active) {
                // Already on this page — don't do a full reload (which
                // feels like "nothing happens"). Either run the caller's
                // reset handler (e.g. clear selected enrollment on the Hub)
                // or just scroll back to top.
                e.preventDefault()
                if (label === 'Hub' && onHomeClick) {
                  onHomeClick()
                }
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all',
              active && 'text-white shadow-md'
            )}
            style={
              active
                ? { background: 'var(--primary)' }
                : { background: 'var(--input)', color: 'var(--text-muted)' }
            }
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
