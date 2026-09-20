'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Check, Loader2, Trash2, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { intakeExamScripts } from '@/app/actions/exam-scripts'
import toast from 'react-hot-toast'

interface ExamLike {
  id: string
  name: string
  target_class_ids?: string[] | null
  enrollment_id?: string | null
  scope?: string | null
}

/**
 * Admin script intake: photograph physical exam scripts (per student, bulk
 * multi-select) and hand them to a teacher as a workbook assignment linked
 * to the exam event. The teacher marks remotely; marks flow into exam_marks
 * on save/return via the marking bridge.
 */
export function ExamScriptIntakeModal({
  exam,
  isOpen,
  onClose,
  onDone,
}: {
  exam: ExamLike | null
  isOpen: boolean
  onClose: () => void
  onDone?: () => void
}) {
  const supabase = getSupabaseBrowserClient()
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [totalMarks, setTotalMarks] = useState('100')
  const [photos, setPhotos] = useState<Record<string, string[]>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Load reference data once per open.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const load = async () => {
      const [cRes, sRes, tRes] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('id, name, class_id').order('name'),
        supabase.from('teachers').select('id, full_name, email').order('full_name'),
      ])
      if (cancelled) return
      setClasses(cRes.data ?? [])
      setSubjects(sRes.data ?? [])
      setTeachers(tRes.data ?? [])
      const targets = exam?.target_class_ids?.length ? exam.target_class_ids : []
      setClassId(targets[0] || '')
      setPhotos({})
    }
    load()
    return () => { cancelled = true }
  }, [isOpen, exam, supabase])

  // Students of the chosen class — or the single homeschool learner when
  // the exam event carries an enrollment_id (e.g. CAT 1 for one child).
  useEffect(() => {
    if (!isOpen) { setStudents([]); return }
    let cancelled = false
    const run = async () => {
      if (exam?.enrollment_id) {
        const { data: enr } = await supabase
          .from('homeschool_enrollments')
          .select('student_id, student:students(id, full_name, admission_number)')
          .eq('id', exam.enrollment_id)
          .maybeSingle()
        const s: any = (enr as any)?.student
        const list = s ? [Array.isArray(s) ? s[0] : s] : []
        if (!cancelled) {
          setStudents(list)
          const sid = list[0]?.id
          if (sid) {
            const { data: hs } = await supabase.from('homeschool_subjects').select('subject_id').eq('enrollment_id', exam.enrollment_id)
            if (hs && hs.length > 0) {
              const { data: subs } = await supabase.from('subjects').select('id, name').in('id', hs.map((h: any) => h.subject_id))
              setSubjects(subs ?? [])
            }
          }
        }
        return
      }
      if (!classId) { setStudents([]); return }
      supabase
        .from('students')
        .select('id, full_name, admission_number')
        .eq('class_id', classId)
        .order('full_name')
        .then(({ data }) => { if (!cancelled) setStudents(data ?? []) })
    }
    run()
    return () => { cancelled = true }
  }, [isOpen, classId, exam, supabase])

  const classSubjects = subjects.filter((s: any) => !s.class_id || s.class_id === classId)
  const withPhotos = Object.entries(photos).filter(([, urls]) => urls.length > 0)

  const uploadForStudent = async (studentId: string, files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    setUploading((p) => ({ ...p, [studentId]: true }))
    try {
      const urls: string[] = []
      for (const file of images) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `exam-scripts/${exam?.id}/${studentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('assignment-uploads').upload(path, file, {
          contentType: file.type,
          upsert: false,
        })
        if (error) throw error
        const { data } = supabase.storage.from('assignment-uploads').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
      setPhotos((p) => ({ ...p, [studentId]: [...(p[studentId] || []), ...urls] }))
      toast.success(`${urls.length} photo${urls.length === 1 ? '' : 's'} added`)
    } catch (e: any) {
      toast.error('Photo upload failed: ' + (e.message || 'please try again'))
    } finally {
      setUploading((p) => ({ ...p, [studentId]: false }))
    }
  }

  const removePhoto = (studentId: string, url: string) => {
    setPhotos((p) => ({ ...p, [studentId]: (p[studentId] || []).filter((u) => u !== url) }))
  }

  const handleSubmit = async () => {
    if (!exam) return
    // Homeschool single-learner events carry enrollment_id instead of a class.
    let effectiveClassId = classId
    if (!effectiveClassId && exam.enrollment_id && students.length > 0) {
      const { data: st } = await supabase.from('students').select('class_id').eq('id', students[0].id).maybeSingle()
      effectiveClassId = (st as any)?.class_id || ''
    }
    if ((!effectiveClassId && !exam.enrollment_id) || !subjectId || !teacherId) {
      toast.error('Pick a class, subject and marking teacher first.')
      return
    }
    if (withPhotos.length === 0) {
      toast.error('Upload at least one photo for at least one student.')
      return
    }
    setSubmitting(true)
    try {
      if (!effectiveClassId) {
        toast.error('This learner has no class/grade linked — link one first.')
        setSubmitting(false)
        return
      }
      const res = await intakeExamScripts({
        examEventId: exam.id,
        classId: effectiveClassId,
        subjectId,
        teacherId,
        totalMarks: Number(totalMarks) || 100,
        scripts: withPhotos.map(([studentId, photoUrls]) => ({ studentId, photoUrls })),
      })
      if (!res.success) throw new Error(res.error)
      toast.success(`Handed ${(res.data as any).scripts} script(s) to the teacher for marking!`)
      onClose()
      onDone?.()
    } catch (e: any) {
      toast.error(e.message || 'Intake failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Script intake — ${exam?.name || ''}`} size="lg">
      <div className="space-y-4 py-2" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Photograph each student&apos;s physical script. This creates one workbook assignment linked to the exam —
          the teacher marks the photos remotely, and marks flow into the exam record on save.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Class *" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Subject *" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Select subject</option>
            {classSubjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Marking teacher *" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Select teacher</option>
            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </Select>
          <Input label="Paper total *" type="number" min={1} value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} placeholder="e.g. 100" />
        </div>

        {classId && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              <Users size={12} /> Students ({students.length}) · {withPhotos.length} with photos
            </div>
            {students.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>No students in this class.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {students.map((st: any) => {
                  const urls = photos[st.id] || []
                  const busy = !!uploading[st.id]
                  return (
                    <div key={st.id} className="p-3 rounded-2xl border" style={{ background: 'var(--input)', borderColor: urls.length > 0 ? 'var(--primary)' : 'var(--card-border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate" style={{ color: 'var(--text)' }}>{st.full_name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {st.admission_number || ''}{urls.length > 0 ? ` · ${urls.length} photo${urls.length === 1 ? '' : 's'}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => fileRefs.current[st.id]?.click()}
                          disabled={busy}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black text-white shrink-0 disabled:opacity-50"
                          style={{ background: 'var(--primary)' }}
                        >
                          {busy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                          {busy ? 'Uploading…' : urls.length > 0 ? 'Add more' : 'Add photos'}
                        </button>
                        <input
                          ref={(el) => { fileRefs.current[st.id] = el }}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || [])
                            e.target.value = ''
                            await uploadForStudent(st.id, files)
                          }}
                        />
                      </div>
                      {urls.length > 0 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                          {urls.map((url) => (
                            <div key={url} className="relative shrink-0 w-14 h-[72px] rounded-lg overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
                              <img src={url} alt="Script page" className="w-full h-full object-cover" loading="lazy" />
                              <button
                                onClick={() => removePhoto(st.id, url)}
                                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                                style={{ background: '#EF4444' }}
                                aria-label="Remove photo"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button className="flex-[2]" onClick={handleSubmit} isLoading={submitting} disabled={withPhotos.length === 0}>
            <Check size={15} className="mr-2" /> Hand {withPhotos.length} script{withPhotos.length === 1 ? '' : 's'} to teacher
          </Button>
        </div>
        <AnimatePresence>
          {withPhotos.length === 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Tip: tap “Add photos” on a student and select several pages at once.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}
