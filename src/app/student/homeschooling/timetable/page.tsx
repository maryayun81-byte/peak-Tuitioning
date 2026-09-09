'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarDays, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { getHomeschoolDashboardData, getHomeschoolWeeks } from '@/app/actions/homeschooling'
import { getCurrentWeekIndex } from '@/lib/homeschooling/constants'
import { HomeschoolWeekSelector } from '@/components/homeschooling/HomeschoolWeekSelector'
import HomeschoolTimetableGrid from '@/components/homeschooling/HomeschoolTimetableGrid'
import type { HomeschoolWeek, LearningSession } from '@/types/homeschooling'

type LoadState = 'loading' | 'ready' | 'no-enrollment' | 'no-weeks' | 'error'

export default function StudentTimetablePage() {
  const router = useRouter()
  const { student } = useAuthStore()
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<HomeschoolWeek[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [allSessions, setAllSessions] = useState<LearningSession[]>([])

  useEffect(() => {
    if (student?.id) loadData()
  }, [student?.id])

  useEffect(() => {
    if (weeks.length > 0) {
      const week = weeks[selectedWeekIndex]
      setAllSessions((week?.sessions || []).filter((s: LearningSession) => s.status !== 'CANCELLED'))
    }
  }, [selectedWeekIndex, weeks])

  const loadData = async () => {
    if (!student?.id) return
    setState('loading')
    setError(null)
    try {
      const dashResult = await getHomeschoolDashboardData(student.id)
      if (!dashResult.success) {
        setError(dashResult.error || 'Failed to load your homeschooling program.')
        setState('error')
        return
      }
      if (!dashResult.data?.enrollment) {
        setState('no-enrollment')
        return
      }

      const enrollmentId = dashResult.data.enrollment.id
      const weeksResult = await getHomeschoolWeeks(enrollmentId)
      if (!weeksResult.success) {
        setError(weeksResult.error || 'Failed to load your timetable.')
        setState('error')
        return
      }

      // Students only ever see published weeks — drafts stay invisible.
      const published = [...(weeksResult.data || [])]
        .filter((w: any) => w.status === 'PUBLISHED')
        .sort((a: any, b: any) => a.week_number - b.week_number)

      if (published.length === 0) {
        setWeeks([])
        setState('no-weeks')
        return
      }

      setWeeks(published)
      setSelectedWeekIndex(getCurrentWeekIndex(published))
      setState('ready')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong loading your timetable.')
      setState('error')
    }
  }

  const handleSessionClick = useCallback((session: LearningSession) => {
    router.push(`/student/homeschooling/session/${session.id}`)
  }, [router])

  if (state === 'loading') return <SkeletonDashboard />

  if (state === 'error') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="p-12 text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>Couldn&apos;t load your timetable</h2>
          <p className="text-sm opacity-60 font-medium mb-4">
            {error || 'Something went wrong. Your timetable and assignments are still safe.'}
          </p>
          <Button size="sm" onClick={loadData}><RefreshCw size={14} /> Try Again</Button>
        </Card>
      </div>
    )
  }

  if (state === 'no-enrollment') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="p-12 text-center max-w-md">
          <CalendarDays size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>Homeschooling Not Active</h2>
          <p className="text-sm opacity-60 font-medium mb-4">
            The homeschooling program isn&apos;t enabled for your account right now.
            Contact Peak Performance Tutoring to learn more.
          </p>
          <Button size="sm" variant="secondary" onClick={() => router.push('/student/homeschooling')}>
            Go to Homeschooling
          </Button>
        </Card>
      </div>
    )
  }

  if (state === 'no-weeks') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="p-12 text-center max-w-md">
          <CalendarDays size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No Timetable Available</h2>
          <p className="text-sm opacity-60 font-medium mb-4">
            No homeschooling weeks have been published yet. Your teacher is still preparing
            your learning plan — check back soon.
          </p>
          <Button size="sm" variant="secondary" onClick={loadData}><RefreshCw size={14} /> Refresh</Button>
        </Card>
      </div>
    )
  }

  const currentWeek = weeks[selectedWeekIndex]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-gradient-to-r from-[var(--card)] to-transparent p-6 rounded-3xl border border-[var(--card-border)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.12)' }}>
              <CalendarDays size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                My Timetable
              </h1>
              <p className="text-xs font-bold opacity-50 mt-0.5">
                {currentWeek.title || `Week ${currentWeek.week_number}`}
              </p>
            </div>
          </div>

          <HomeschoolWeekSelector
            weeks={weeks}
            selectedIndex={selectedWeekIndex}
            onChange={setSelectedWeekIndex}
          />
        </div>
      </motion.div>

      <Card className="p-4 overflow-hidden">
        <HomeschoolTimetableGrid
          sessions={allSessions}
          days={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']}
          onSessionClick={handleSessionClick}
          viewMode="student"
          showTeacher
        />
      </Card>
    </div>
  )
}
