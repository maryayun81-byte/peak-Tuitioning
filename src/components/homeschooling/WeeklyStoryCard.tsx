'use client'

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { generateWeeklyStory } from '@/app/actions/homeschool-learning'

// §106 — A learning narrative grounded ONLY in database facts,
// instead of a bare percentage.
export default function WeeklyStoryCard({
  enrollmentId,
  weekId,
  weekTitle,
}: {
  enrollmentId: string
  weekId: string
  weekTitle?: string
}) {
  const [story, setStory] = useState<string | null>(null)

  useEffect(() => {
    setStory(null)
    generateWeeklyStory(enrollmentId, weekId).then((res) => {
      if (res.success) setStory((res.data as any).story)
    })
  }, [enrollmentId, weekId])

  if (!story) return null

  return (
    <Card className="p-5 hs-report-card" style={{ borderLeft: '3px solid var(--primary)' }}>
      <h2 className="text-sm font-black uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <BookOpen size={14} style={{ color: 'var(--primary)' }} /> This week&apos;s story
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
        {story}
      </p>
      {weekTitle && (
        <p className="text-[11px] mt-2 font-semibold" style={{ color: 'var(--text-muted)' }}>
          {weekTitle} · generated from recorded learning evidence
        </p>
      )}
    </Card>
  )
}
