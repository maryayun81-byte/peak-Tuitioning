'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BookOpen, Calendar, Search, ExternalLink,
  GraduationCap, Clock, AlertTriangle, ChevronRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import HomeschoolEnrollmentWizard from '@/components/admin/HomeschoolEnrollmentWizard'
import HomeschoolEnrollmentManager from '@/components/admin/HomeschoolEnrollmentManager'
import HomeschoolAdminNav from '@/components/admin/HomeschoolAdminNav'
import { getHomeschoolEnrollments } from '@/app/actions/homeschooling'
import toast from 'react-hot-toast'
import type { HomeschoolEnrollment } from '@/types/homeschooling'

const STATUS_FILTERS = ['All', 'ACTIVE', 'PENDING', 'PAUSED'] as const

const STATUS_STYLES: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  PENDING: { label: 'Pending', variant: 'warning' },
  PAUSED: { label: 'Paused', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'info' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  EXPIRED: { label: 'Expired', variant: 'muted' },
}

export default function AdminHomeschooling() {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [enrollments, setEnrollments] = useState<HomeschoolEnrollment[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [selectedEnrollment, setSelectedEnrollment] = useState<HomeschoolEnrollment | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStudent, setWizardStudent] = useState<any>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [enrollRes, studentsRes, subjectsRes, teachersRes, classesRes] = await Promise.all([
        getHomeschoolEnrollments(),
        supabase.from('students').select('id, full_name, admission_number, class:classes(name)').order('full_name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('teachers').select('id, full_name').order('full_name'),
        supabase.from('classes').select('id, name').order('name'),
      ])

      if (enrollRes.success) setEnrollments(enrollRes.data || [])
      setStudents(studentsRes.data || [])
      setSubjects(subjectsRes.data || [])
      setTeachers(teachersRes.data || [])
      setClasses(classesRes.data || [])
    } catch (err) {
      console.error('Failed to load homeschooling data:', err)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredEnrollments = enrollments.filter(e => {
    const matchesStatus = statusFilter === 'All' || e.status?.toUpperCase() === statusFilter
    const studentName = (e.student as any)?.full_name || ''
    const matchesSearch = !search || studentName.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const activeCount = enrollments.filter(e => e.status?.toUpperCase() === 'ACTIVE').length
  const pendingCount = enrollments.filter(e => e.status?.toUpperCase() === 'PENDING').length
  const pausedCount = enrollments.filter(e => e.status?.toUpperCase() === 'PAUSED').length
  const totalSubjects = enrollments.reduce((sum, e) => sum + ((e.subjects as any[])?.length || 0), 0)

  const openWizardForStudent = (student: any) => {
    setWizardStudent(student)
    setWizardOpen(true)
  }

  const handleEnrollmentSelect = (enrollment: HomeschoolEnrollment) => {
    setSelectedEnrollment(enrollment)
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Homeschooling</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {enrollments.length} total enrollments · {activeCount} active
          </p>
        </div>
      </div>

      <HomeschoolAdminNav
        enrollmentId={selectedEnrollment?.id}
        studentName={(selectedEnrollment?.student as any)?.full_name}
        onHomeClick={() => setSelectedEnrollment(null)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Students"
          value={activeCount}
          icon={<GraduationCap size={18} />}
          gradient="linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))"
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          icon={<Clock size={18} />}
          gradient="linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))"
        />
        <StatCard
          title="Paused"
          value={pausedCount}
          icon={<AlertTriangle size={18} />}
          gradient="linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))"
        />
        <StatCard
          title="Total Subjects"
          value={totalSubjects}
          icon={<BookOpen size={18} />}
          gradient="linear-gradient(135deg, rgba(79,140,255,0.08), rgba(79,140,255,0.02))"
        />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search by student name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-none outline-none font-medium"
            style={{ background: 'var(--input)', color: 'var(--text)' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: statusFilter === s ? 'var(--primary)' : 'var(--input)',
                color: statusFilter === s ? '#fff' : 'var(--text-muted)',
                border: statusFilter === s ? '1px solid var(--primary)' : '1px solid var(--card-border)',
              }}
            >
              {s === 'All' ? 'All' : STATUS_STYLES[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment List */}
        <div className={`${selectedEnrollment ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-3`}>
          {filteredEnrollments.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--input)' }}>
                  <BookOpen size={22} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                  No enrollments found
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {enrollments.length === 0
                    ? 'Create a new homeschooling enrollment from a student\'s profile.'
                    : 'Try adjusting your search or filter criteria.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className={`space-y-3 ${!selectedEnrollment ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3' : ''}`}>
              {filteredEnrollments.map((enrollment, i) => {
                const status = STATUS_STYLES[enrollment.status?.toUpperCase()] || STATUS_STYLES.PENDING
                const studentName = (enrollment.student as any)?.full_name || 'Unknown'
                const subjectsCount = (enrollment.subjects as any[])?.length || 0
                const isSelected = selectedEnrollment?.id === enrollment.id

                return (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card
                      className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 ${
                        isSelected ? 'ring-2 ring-[var(--primary)]' : ''
                      }`}
                      onClick={() => handleEnrollmentSelect(enrollment)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/15 shrink-0">
                          {studentName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                              {studentName}
                            </span>
                            <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            <span>Grade {enrollment.grade_level}</span>
                            <span>·</span>
                            <span>{subjectsCount} subject{subjectsCount !== 1 ? 's' : ''}</span>
                            <span>·</span>
                            <span>{enrollment.start_date}</span>
                          </div>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedEnrollment && (
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Enrollment Details
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEnrollment(null)}>
                Close
              </Button>
            </div>

            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/15">
                  {((selectedEnrollment.student as any)?.full_name || '?')[0]}
                </div>
                <div className="flex-1 min-w-[140px]">
                  <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>
                    {(selectedEnrollment.student as any)?.full_name || 'Unknown'}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {(selectedEnrollment.student as any)?.admission_number || '—'} · Grade {selectedEnrollment.grade_level}
                  </p>
                </div>
                <Link href={`/admin/homeschooling/${selectedEnrollment.id}`}>
                  <Button size="sm">
                    Open Program <ExternalLink size={13} />
                  </Button>
                </Link>
              </div>

              {/* Quick navigation to sub-pages — visible on all screen sizes */}
              <div className="flex gap-2 flex-wrap">
                <Link href={`/admin/homeschooling/${selectedEnrollment.id}`}>
                  <Button variant="outline" size="sm">
                    <GraduationCap size={13} /> Program
                  </Button>
                </Link>
                <Link href={`/admin/homeschooling/${selectedEnrollment.id}/timetable`}>
                  <Button variant="outline" size="sm">
                    <Calendar size={13} /> Timetable
                  </Button>
                </Link>
                <Link href={`/admin/homeschooling/${selectedEnrollment.id}/weeks`}>
                  <Button variant="outline" size="sm">
                    <BookOpen size={13} /> Weeks
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</p>
                  <Badge variant={STATUS_STYLES[selectedEnrollment.status?.toUpperCase()]?.variant || 'muted'} className="mt-1">
                    {STATUS_STYLES[selectedEnrollment.status?.toUpperCase()]?.label || selectedEnrollment.status}
                  </Badge>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Academic Year</p>
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--text)' }}>{selectedEnrollment.academic_year}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Start Date</p>
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--text)' }}>{selectedEnrollment.start_date}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>End Date</p>
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--text)' }}>{selectedEnrollment.end_date || '—'}</p>
                </div>
              </div>

              {selectedEnrollment.notes && (
                <div className="p-3 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Notes</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text)' }}>{selectedEnrollment.notes}</p>
                </div>
              )}

              <HomeschoolEnrollmentManager
                enrollment={selectedEnrollment}
                studentId={selectedEnrollment.student_id}
                onUpdate={() => { load(); }}
              />
            </Card>
          </div>
        )}
      </div>

      {wizardStudent && (
        <HomeschoolEnrollmentWizard
          isOpen={wizardOpen}
          onClose={() => { setWizardOpen(false); setWizardStudent(null); }}
          onSuccess={load}
          student={wizardStudent}
          subjects={subjects}
          teachers={teachers}
          classes={classes}
        />
      )}
    </div>
  )
}
