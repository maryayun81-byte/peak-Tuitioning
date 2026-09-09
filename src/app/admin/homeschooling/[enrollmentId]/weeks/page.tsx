'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ChevronLeft, Plus, Calendar, Clock, CheckCircle2, Archive,
  ChevronRight, Edit3, Trash2
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import {
  getHomeschoolWeeks, createHomeschoolWeek
} from '@/app/actions/homeschooling'
import { PublishWarningsModal, usePublishWeek } from '@/components/homeschooling/SessionLifecycleModals'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import HomeschoolAdminNav from '@/components/admin/HomeschoolAdminNav'
import toast from 'react-hot-toast'
import type { HomeschoolWeek } from '@/types/homeschooling'

const WEEK_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; icon: any }> = {
  DRAFT: { label: 'Draft', variant: 'muted', icon: Edit3 },
  PUBLISHED: { label: 'Published', variant: 'success', icon: CheckCircle2 },
  ARCHIVED: { label: 'Archived', variant: 'info', icon: Archive },
  upcoming: { label: 'Upcoming', variant: 'warning', icon: Clock },
  in_progress: { label: 'In Progress', variant: 'success', icon: Clock },
  completed: { label: 'Completed', variant: 'info', icon: CheckCircle2 },
}

export default function WeeksPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const resolvedParams = use(params)
  const enrollmentId = resolvedParams.enrollmentId
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState<HomeschoolWeek[]>([])
  const [enrollment, setEnrollment] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ week_number: 1, title: '', start_date: '', end_date: '' })

  useEffect(() => { load() }, [enrollmentId])

  const load = async () => {
    setLoading(true)
    try {
      const [weeksRes, enrollRes] = await Promise.all([
        getHomeschoolWeeks(enrollmentId),
        supabase.from('homeschool_enrollments')
          .select('id, student:students(full_name), grade_level, academic_year')
          .eq('id', enrollmentId)
          .maybeSingle(),
      ])
      if (weeksRes.success) setWeeks(weeksRes.data || [])
      if (enrollRes.data) setEnrollment(enrollRes.data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load weeks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.title || !form.start_date || !form.end_date) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const res = await createHomeschoolWeek(enrollmentId, form)
      if (!res.success) throw new Error(res.error)
      toast.success('Week created')
      setModalOpen(false)
      setForm({ week_number: weeks.length + 1, title: '', start_date: '', end_date: '' })
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create week')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (weekId: string) => {
    publishWeek.publish(weekId)
  }

  const publishWeek = usePublishWeek(load)

  const handleUnpublish = async (weekId: string) => {
    try {
      const { error } = await supabase.from('homeschool_weeks')
        .update({ status: 'DRAFT' })
        .eq('id', weekId)
        .eq('status', 'PUBLISHED')
      if (error) throw error
      toast.success('Week unpublished')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to unpublish')
    }
  }

  const studentName = (enrollment?.student as any)?.full_name || 'Student'

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/homeschooling/${enrollmentId}`)}>
          <ChevronLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>
            Week Management
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {studentName} · Grade {enrollment?.grade_level} · {weeks.length} week{weeks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => {
          setForm({ week_number: weeks.length + 1, title: '', start_date: '', end_date: '' })
          setModalOpen(true)
        }}>
          <Plus size={14} /> New Week
        </Button>
      </div>

      <HomeschoolAdminNav enrollmentId={enrollmentId} studentName={studentName} />

      {weeks.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--input)' }}>
              <Calendar size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No weeks yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Create your first week to start organizing learning sessions
              </p>
            </div>
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Create First Week
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {weeks.map((week, i) => {
            const ws = WEEK_STATUS[week.status] || WEEK_STATUS.DRAFT
            const sessionCount = (week.sessions as any[])?.length || 0
            const Icon = ws.icon
            return (
              <motion.div
                key={week.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className="p-5 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
                  onClick={() => router.push(`/admin/homeschooling/${enrollmentId}/weeks/${week.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                      style={{
                        background: week.status?.toUpperCase() === 'PUBLISHED'
                          ? 'rgba(16,185,129,0.1)' : 'var(--input)',
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      <span className="text-lg font-black" style={{ color: 'var(--primary)' }}>
                        {week.week_number}
                      </span>
                      <span className="text-[8px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                        Week
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                          {week.title}
                        </h3>
                        <Badge variant={ws.variant}>{ws.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {week.start_date} → {week.end_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {week.status?.toUpperCase() === 'DRAFT' && (
                        <Button variant="success" size="xs" onClick={() => handlePublish(week.id)}>
                          <CheckCircle2 size={12} /> Publish
                        </Button>
                      )}
                      {week.status?.toUpperCase() === 'PUBLISHED' && (
                        <Button variant="outline" size="xs" onClick={() => handleUnpublish(week.id)}>
                          Unpublish
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/admin/homeschooling/${enrollmentId}/weeks/${week.id}`)}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Week" size="md">
        <div className="space-y-4">
          <Input
            label="Week Number *"
            type="number"
            value={form.week_number}
            onChange={e => setForm(f => ({ ...f, week_number: parseInt(e.target.value) || 1 }))}
          />
          <Input
            label="Title *"
            placeholder="e.g. Week 1 - Foundations"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="date"
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            />
            <Input
              label="End Date *"
              type="date"
              value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={saving}>Create Week</Button>
          </div>
        </div>
      </Modal>

      <PublishWarningsModal
        warnings={publishWeek.warnings}
        onClose={publishWeek.closeWarnings}
        onConfirm={publishWeek.confirmForce}
        saving={publishWeek.saving}
      />
    </div>
  )
}
