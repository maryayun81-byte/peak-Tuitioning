'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, BookOpen, GraduationCap, Users, CheckCircle2,
  ChevronRight, ChevronLeft, AlertCircle, XCircle, Play
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Card'
import {
  createHomeschoolEnrollment, getHomeschoolEnrollments,
  activateHomeschoolEnrollment, cancelHomeschoolEnrollment,
} from '@/app/actions/homeschooling'
import toast from 'react-hot-toast'
import type { Student, Subject, Teacher } from '@/types/database'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  student: Student
  subjects: Subject[]
  teachers: Teacher[]
  classes?: Array<{ id: string; name: string }>
}

const programSchema = z.object({
  grade_level: z.string().min(1, 'Grade level is required'),
  academic_year: z.string().min(1, 'Academic year is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  notes: z.string().optional(),
})
type ProgramForm = z.infer<typeof programSchema>

const STEPS = [
  { key: 'confirm', label: 'Student', icon: User },
  { key: 'program', label: 'Program', icon: GraduationCap },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'teachers', label: 'Teachers', icon: Users },
  { key: 'review', label: 'Review', icon: CheckCircle2 },
]

const FALLBACK_GRADES = [
  'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4',
]

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
}

export default function HomeschoolEnrollmentWizard({
  isOpen, onClose, onSuccess, student, subjects, teachers, classes = [],
}: Props) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [existingEnroll, setExistingEnroll] = useState<any>(null)
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [resolving, setResolving] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProgramForm>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      grade_level: student?.class ? (student.class as any)?.name || '' : '',
      academic_year: new Date().getFullYear().toString(),
      start_date: new Date().toISOString().split('T')[0],
    },
  })

  const formData = watch()

  useEffect(() => {
    if (!isOpen || !student?.id) return
    setExistingEnroll(null)
    setCheckingExisting(true)
    getHomeschoolEnrollments(student.id)
      .then((res) => {
        if (res.success && res.data) {
          const found = (res.data as any[]).find((e) =>
            ['PENDING', 'PAUSED', 'ACTIVE'].includes(e.status?.toUpperCase())
          )
          setExistingEnroll(found || null)
        }
      })
      .finally(() => setCheckingExisting(false))
  }, [isOpen, student?.id])

  const handleActivateExisting = async () => {
    if (!existingEnroll) return
    setResolving(true)
    try {
      const res = await activateHomeschoolEnrollment(existingEnroll.id)
      if (!res.success) throw new Error(res.error)
      toast.success('Existing enrollment activated!')
      resetWizard()
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate')
    } finally {
      setResolving(false)
    }
  }

  const handleCancelExisting = async () => {
    if (!existingEnroll) return
    setResolving(true)
    try {
      const res = await cancelHomeschoolEnrollment(existingEnroll.id)
      if (!res.success) throw new Error(res.error)
      toast.success('Old enrollment cancelled — you can now create a fresh one.')
      setExistingEnroll(null)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel')
    } finally {
      setResolving(false)
    }
  }

  const goNext = () => {
    if (step === 0 && existingEnroll) {
      toast.error('Resolve the existing enrollment above first')
      return
    }    if (step === 1) {
      if (!formData.grade_level || !formData.academic_year || !formData.start_date) {
        toast.error('Please fill all required program fields')
        return
      }
    }
    if (step === 2 && selectedSubjects.length === 0) {
      toast.error('Select at least one subject')
      return
    }
    setDirection(1)
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setDirection(-1)
    setStep(s => Math.max(s - 1, 0))
  }

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const assignTeacher = (subjectId: string, teacherId: string) => {
    setTeacherMap(prev => ({ ...prev, [subjectId]: teacherId }))
  }

  const onSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = {
        student_id: student.id,
        grade_level: formData.grade_level,
        academic_year: formData.academic_year,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        notes: formData.notes || undefined,
        subjects: selectedSubjects.map(sid => ({
          subject_id: sid,
          teacher_id: teacherMap[sid] || undefined,
          assignment_type: 'primary' as const,
        })),
      }
      const result = await createHomeschoolEnrollment(payload)
      if (!result.success) throw new Error(result.error)
      toast.success('Homeschooling enrollment created!')
      resetWizard()
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create enrollment')
    } finally {
      setSubmitting(false)
    }
  }

  const resetWizard = () => {
    setStep(0)
    setSelectedSubjects([])
    setTeacherMap({})
    setExistingEnroll(null)
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  const selectedSubjectsData = subjects.filter(s => selectedSubjects.includes(s.id))
  const gradeOptions = classes.length > 0 ? classes.map(c => c.name) : FALLBACK_GRADES

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Homeschooling Enrollment" size="lg">
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300"
                    style={{
                      background: isDone
                        ? 'var(--primary)'
                        : isActive
                          ? 'rgba(79,140,255,0.2)'
                          : 'var(--input)',
                      color: isDone ? '#fff' : isActive ? 'var(--primary)' : 'var(--text-muted)',
                      border: isActive ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                    }}
                  >
                    {isDone ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                  </div>
                  <span
                    className="text-[9px] font-bold mt-1.5 tracking-wider uppercase"
                    style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="h-0.5 flex-1 mx-1 rounded-full mt-[-14px]"
                    style={{
                      background: i < step ? 'var(--primary)' : 'var(--card-border)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="relative min-h-[320px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div className="text-center mb-2">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-black bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                      {student.full_name?.[0] || '?'}
                    </div>
                    <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>{student.full_name}</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      Admission: {student.admission_number || '—'}
                    </p>
                  </div>

                  {checkingExisting ? (
                    <div className="p-4 rounded-xl text-center animate-pulse" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Checking existing programs…</p>
                    </div>
                  ) : existingEnroll ? (
                    <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.35)' }}>
                      <div className="flex items-start gap-3">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
                        <div>
                          <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                            Existing {existingEnroll.status?.toLowerCase()} enrollment found ({existingEnroll.academic_year})
                          </p>
                          <p className="text-[11px] font-medium opacity-60 mt-0.5">
                            Grade {existingEnroll.grade_level} · Started {existingEnroll.start_date}. Activate it instead of creating a duplicate, or cancel it to start fresh.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {existingEnroll.status?.toUpperCase() === 'PENDING' && (
                          <Button size="sm" variant="success" className="flex-1" onClick={handleActivateExisting} isLoading={resolving}>
                            <Play size={13} /> Activate Existing
                          </Button>
                        )}
                        <Button size="sm" variant="danger" className="flex-1" onClick={handleCancelExisting} isLoading={resolving}>
                          <XCircle size={13} /> Cancel It
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                      <div className="flex items-start gap-3">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          This will enroll <strong style={{ color: 'var(--text)' }}>{student.full_name}</strong> in the homeschooling program.
                          No new account will be created. The student will use their existing credentials.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <Select label="Grade / Class *" error={errors.grade_level?.message} {...register('grade_level')}>
                    <option value="">Select class</option>
                    {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </Select>
                  <Input label="Academic Year *" placeholder="e.g. 2026" error={errors.academic_year?.message} {...register('academic_year')} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Start Date *" type="date" error={errors.start_date?.message} {...register('start_date')} />
                    <Input label="End Date" type="date" {...register('end_date')} />
                  </div>
                  <Textarea label="Notes" placeholder="Optional notes about the enrollment..." rows={3} {...register('notes')} />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Select subjects for this enrollment
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {subjects.map(sub => {
                      const isSelected = selectedSubjects.includes(sub.id)
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleSubject(sub.id)}
                          className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                          style={{
                            background: isSelected ? 'rgba(79,140,255,0.1)' : 'var(--input)',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                            color: 'var(--text)',
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: isSelected ? 'var(--primary)' : 'var(--card-border)',
                            }}
                          >
                            {isSelected && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{sub.name}</div>
                            {sub.code && <div className="text-[10px] opacity-50">{sub.code}</div>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {subjects.length === 0 && (
                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No subjects found for this student&apos;s class. Add subjects for the class first.
                    </div>
                  )}
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Assign a teacher to each subject (optional)
                  </p>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedSubjectsData.map(sub => (
                      <div key={sub.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{sub.name}</div>
                          {sub.code && <div className="text-[10px] opacity-50">{sub.code}</div>}
                        </div>
                        <select
                          className="px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                          style={{
                            background: 'var(--card)',
                            color: 'var(--text)',
                            border: '1px solid var(--card-border)',
                            minWidth: 180,
                          }}
                          value={teacherMap[sub.id] || ''}
                          onChange={e => assignTeacher(sub.id, e.target.value)}
                        >
                          <option value="">No teacher</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.full_name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {teachers.length === 0 && (
                    <div className="p-4 rounded-xl text-center" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        No teachers available. You can assign them later.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                    <h4 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Program Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Grade</span>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{formData.grade_level}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Year</span>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{formData.academic_year}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Start</span>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{formData.start_date}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>End</span>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{formData.end_date || '—'}</p>
                      </div>
                    </div>
                    {formData.notes && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Notes</span>
                        <p className="text-xs mt-1" style={{ color: 'var(--text)' }}>{formData.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                    <h4 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Subjects ({selectedSubjectsData.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubjectsData.map(sub => {
                        const tId = teacherMap[sub.id]
                        const teacher = tId ? teachers.find(t => t.id === tId) : null
                        return (
                          <div key={sub.id} className="flex items-center gap-2">
                            <Badge variant="info">{sub.name}</Badge>
                            {teacher && (
                              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                                → {teacher.full_name}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <Button
            variant="secondary"
            onClick={step === 0 ? handleClose : goBack}
          >
            {step === 0 ? 'Cancel' : (
              <>
                <ChevronLeft size={14} /> Back
              </>
            )}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={goNext}>
              Next <ChevronRight size={14} />
            </Button>
          ) : (
            <Button onClick={onSubmit} isLoading={submitting}>
              <CheckCircle2 size={14} /> Activate Enrollment
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
