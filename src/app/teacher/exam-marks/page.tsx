'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Save, Award, AlertCircle, FileText, CheckCircle2, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { SkeletonList } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

interface TuitionEvent {
  id: string
  name: string
  is_active: boolean
}

interface ExamEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  tuition_event_id: string
  status: string
}

interface ClassSubjectOption {
  class_id: string
  subject_id: string
  class_name: string
  subject_name: string
}

interface Student {
  id: string
  full_name: string
  admission_number: string
}

const PAGE_SIZE = 15

export default function TeacherExamMarks() {
  const supabase = getSupabaseBrowserClient()
  const { teacher, profile, isLoading: authLoading } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)

  // Data
  const [activeTuitionEvent, setActiveTuitionEvent] = useState<TuitionEvent | null>(null)
  const [examEvents, setExamEvents] = useState<ExamEvent[]>([])
  const [classSubjectOptions, setClassSubjectOptions] = useState<ClassSubjectOption[]>([])

  // Selections
  const [selectedExamEventId, setSelectedExamEventId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')

  // Students & marks
  const [students, setStudents] = useState<Student[]>([])
  const [marksData, setMarksData] = useState<Record<string, { marks: string; remarks: string; id?: string }>>({})

  // Pagination & search
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  // Load base data once teacher is available
  useEffect(() => {
    if (!teacher?.id) return
    loadBaseData()
  }, [teacher?.id])

  // Load students & marks when exam event + class + subject are all selected
  useEffect(() => {
    if (selectedExamEventId && selectedClassId && selectedSubjectId) {
      loadStudentsAndMarks()
    } else {
      setStudents([])
      setMarksData({})
    }
  }, [selectedExamEventId, selectedClassId, selectedSubjectId])

  const loadBaseData = async () => {
    setLoading(true)
    try {
      // 1. Get active tuition event
      const { data: tuitionData } = await supabase
        .from('tuition_events')
        .select('id, name, is_active')
        .eq('is_active', true)
        .maybeSingle()

      setActiveTuitionEvent(tuitionData ?? null)

      if (!tuitionData) {
        setLoading(false)
        return
      }

      // 2. Get exam events for this tuition event that are finalized (open for marking)
      const { data: eventsData } = await supabase
        .from('exam_events')
        .select('id, name, start_date, end_date, tuition_event_id, status')
        .eq('tuition_event_id', tuitionData.id)
        .in('status', ['finalized'])
        .order('start_date', { ascending: false })

      setExamEvents(eventsData ?? [])

      // Auto-select if only one exam event
      if (eventsData && eventsData.length === 1) {
        setSelectedExamEventId(eventsData[0].id)
      }

      // 3. Get teacher's class+subject assignments (no tuition_event_id filter — we use the exam's target classes)
      const { data: assignmentsData } = await supabase
        .from('teacher_assignments')
        .select(`
          class_id,
          subject_id,
          class:classes(id, name),
          subject:subjects(id, name)
        `)
        .eq('teacher_id', teacher!.id)

      if (assignmentsData) {
        const options: ClassSubjectOption[] = assignmentsData
          .filter((a: any) => a.class && a.subject)
          .map((a: any) => ({
            class_id: a.class_id,
            subject_id: a.subject_id,
            class_name: a.class?.name ?? 'Unknown',
            subject_name: a.subject?.name ?? 'Unknown',
          }))
          // Deduplicate
          .filter((o, i, arr) =>
            arr.findIndex(x => x.class_id === o.class_id && x.subject_id === o.subject_id) === i
          )
        setClassSubjectOptions(options)
      }
    } catch (e) {
      console.error('Failed to load base data', e)
      toast.error('Failed to load exam events and assignments.')
    } finally {
      setLoading(false)
    }
  }

  // Computed: classes for the selected exam event
  // We filter by whether the class is in the exam event's target_class_ids (if set),
  // otherwise show all teacher assignments.
  const selectedExamEvent = examEvents.find(e => e.id === selectedExamEventId) ?? null

  // Get unique classes for the assignment dropdown
  const availableClasses = useMemo(() => {
    const seen = new Set<string>()
    return classSubjectOptions.filter(o => {
      if (seen.has(o.class_id)) return false
      seen.add(o.class_id)
      return true
    })
  }, [classSubjectOptions])

  // Get subjects for the selected class
  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return []
    return classSubjectOptions.filter(o => o.class_id === selectedClassId)
  }, [classSubjectOptions, selectedClassId])

  // When class changes, reset subject
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    setSelectedSubjectId('')
  }

  // When exam event changes, reset class and subject
  const handleExamEventChange = (examId: string) => {
    setSelectedExamEventId(examId)
    setSelectedClassId('')
    setSelectedSubjectId('')
  }

  const loadStudentsAndMarks = async () => {
    setStudentsLoading(true)
    setPage(1)
    try {
      const [studentsRes, marksRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, full_name, admission_number')
          .eq('class_id', selectedClassId)
          .order('full_name'),
        supabase
          .from('exam_marks')
          .select('id, student_id, marks, teacher_remark')
          .eq('exam_event_id', selectedExamEventId)
          .eq('subject_id', selectedSubjectId)
          .eq('class_id', selectedClassId),
      ])

      setStudents(studentsRes.data ?? [])

      const map: Record<string, { marks: string; remarks: string; id?: string }> = {}
      ;(marksRes.data ?? []).forEach((m: any) => {
        map[m.student_id] = {
          marks: m.marks != null ? String(m.marks) : '',
          remarks: m.teacher_remark ?? '',
          id: m.id,
        }
      })
      setMarksData(map)
    } catch (e) {
      console.error('Failed to load students/marks', e)
      toast.error('Failed to load students.')
    } finally {
      setStudentsLoading(false)
    }
  }

  const handleMarkChange = (studentId: string, field: 'marks' | 'remarks', value: string) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }))
  }

  const handleSaveMarks = async () => {
    setSaving(true)
    try {
      const upserts = students
        .map(s => {
          const data = marksData[s.id]
          if (!data?.marks || data.marks.trim() === '') return null
          return {
            ...(data.id ? { id: data.id } : {}),
            student_id: s.id,
            subject_id: selectedSubjectId,
            class_id: selectedClassId,
            exam_event_id: selectedExamEventId,
            teacher_id: teacher!.id,
            marks: parseFloat(data.marks),
            teacher_remark: data.remarks || null,
          }
        })
        .filter(Boolean)

      if (upserts.length === 0) {
        toast.error('No valid marks to save.')
        return
      }

      const { error } = await supabase
        .from('exam_marks')
        .upsert(upserts, { onConflict: 'student_id,subject_id,exam_event_id' })

      if (error) throw error
      toast.success(`✅ Marks saved for ${upserts.length} student(s)!`)
      loadStudentsAndMarks()
    } catch (e: any) {
      console.error('Save failed', e)
      toast.error(e.message || 'Failed to save marks.')
    } finally {
      setSaving(false)
    }
  }

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(search.toLowerCase())
  )
  const paginatedStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE)
  const gradedStudents = Object.values(marksData).filter(m => m.marks && m.marks.trim() !== '').length

  // Auth guard
  if (authLoading || (loading && !teacher)) return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 rounded-xl animate-pulse" style={{ background: 'var(--input)' }} />
      <SkeletonList count={6} />
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <ClipboardList size={24} className="text-primary" /> Exam Marks Entry
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Record marks for your assigned classes and subjects
        </p>
      </div>

      {/* Active tuition event banner */}
      {activeTuitionEvent ? (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <span className="text-sm font-bold text-emerald-500">Active Tuition Event: </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{activeTuitionEvent.name}</span>
            {examEvents.length === 0 && (
              <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>— No finalized exam events yet</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm font-semibold text-red-400">No active tuition event found. Please ask the admin to activate one.</p>
        </div>
      )}

      {/* Exam Event + Class + Subject selectors */}
      {activeTuitionEvent && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Select Exam Event &amp; Assignment</h3>

          {loading ? (
            <SkeletonList count={2} />
          ) : examEvents.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No finalized exam events in <strong>{activeTuitionEvent.name}</strong>.</p>
              <p className="text-xs mt-1">The admin needs to set an exam event status to <strong>Finalized</strong> before you can enter marks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Exam Event */}
              <Select
                label="Exam Event"
                value={selectedExamEventId}
                onChange={e => handleExamEventChange(e.target.value)}
              >
                <option value="">Choose exam event...</option>
                {examEvents.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </Select>

              {/* Class */}
              <Select
                label="My Class"
                value={selectedClassId}
                onChange={e => handleClassChange(e.target.value)}
                disabled={!selectedExamEventId}
              >
                <option value="">Choose class...</option>
                {availableClasses.map(o => (
                  <option key={o.class_id} value={o.class_id}>{o.class_name}</option>
                ))}
              </Select>

              {/* Subject */}
              <Select
                label="Subject"
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassId}
              >
                <option value="">Choose subject...</option>
                {availableSubjects.map(o => (
                  <option key={o.subject_id} value={o.subject_id}>{o.subject_name}</option>
                ))}
              </Select>
            </div>
          )}
        </Card>
      )}

      {/* Stats + marks table */}
      {selectedExamEventId && selectedClassId && selectedSubjectId && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Students" value={students.length} icon={<FileText size={20} />} />
            <StatCard title="Marked" value={gradedStudents} icon={<CheckCircle2 size={20} />} />
            <StatCard title="Pending" value={students.length - gradedStudents} icon={<AlertCircle size={20} />} />
            <StatCard title="Completion" value={`${students.length > 0 ? Math.round((gradedStudents / students.length) * 100) : 0}%`} icon={<Award size={20} />} />
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <Input
              placeholder="Search student by name or admission no."
              leftIcon={<Search size={14} />}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full md:w-80"
            />
            <Button onClick={handleSaveMarks} isLoading={saving}>
              <Save size={16} className="mr-1.5" /> Save Marks
            </Button>
          </div>

          {studentsLoading ? (
            <SkeletonList count={6} />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--input)', borderBottom: '1px solid var(--card-border)' }}>
                      {['Student', 'Admission No.', 'Marks', 'Remarks (optional)'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((s, i) => {
                      const data = marksData[s.id] ?? { marks: '', remarks: '' }
                      const hasMarks = data.marks && data.marks.trim() !== ''
                      return (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          style={{ borderBottom: '1px solid var(--card-border)', background: hasMarks ? 'rgba(16,185,129,0.04)' : undefined }}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ background: hasMarks ? 'rgba(16,185,129,0.15)' : 'var(--input)', color: hasMarks ? '#10B981' : 'var(--text-muted)' }}
                              >
                                {s.full_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                              </div>
                              <span className="font-semibold" style={{ color: 'var(--text)' }}>{s.full_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{s.admission_number}</td>
                          <td className="px-5 py-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="—"
                              className="h-9 w-24 text-center font-bold"
                              value={data.marks}
                              onChange={e => handleMarkChange(s.id, 'marks', e.target.value)}
                            />
                          </td>
                          <td className="px-5 py-3">
                            <Input
                              type="text"
                              placeholder="Teacher remark..."
                              className="h-9"
                              value={data.remarks}
                              onChange={e => handleMarkChange(s.id, 'remarks', e.target.value)}
                            />
                          </td>
                        </motion.tr>
                      )
                    })}
                    {paginatedStudents.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-14" style={{ color: 'var(--text-muted)' }}>No students found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Page {page} of {totalPages} · {filteredStudents.length} students
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft size={14} />
                    </Button>
                    <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Sticky save button on mobile */}
          {students.length > 0 && (
            <div className="md:hidden sticky bottom-20 px-4">
              <Button className="w-full py-4 shadow-2xl" onClick={handleSaveMarks} isLoading={saving}>
                <Save size={18} /> Save Marks
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
