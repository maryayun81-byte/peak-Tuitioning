'use client'

import { GraduationCap } from 'lucide-react'

interface HomeschoolBadgeProps {
  isHomeschoolStudent: boolean
}

export function HomeschoolBadge({ isHomeschoolStudent }: HomeschoolBadgeProps) {
  if (!isHomeschoolStudent) return null

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{
        background: 'rgba(79,140,255,0.12)',
        color: 'var(--primary)',
        border: '1px solid rgba(79,140,255,0.25)',
      }}
    >
      <GraduationCap size={13} />
      Homeschooling
    </span>
  )
}
