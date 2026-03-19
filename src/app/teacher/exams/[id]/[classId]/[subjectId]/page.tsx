'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Search, Save, Send, 
  MessageSquare, User, CheckCircle2, AlertCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function SubjectMarkingPage() {
  const params = useParams()
  const router = useRouter()
  const { id: examId, classId, subjectId } = params as Record<string, string>
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exam, setExam] = useState<any>(null)
  const [cls, setCls] = useState<any>(null)
  const [subject, setSubject] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [marks, setMarks] = useState<Record<string, { marks: number | string; remark: string }>>({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (examId && classId && subjectId && teacher) loadData()
  }, [examId, classId, subjectId, teacher])

  const loadData = async () => {
    setLoading(true)
    try {
      const [exRes, clRes, sbRes, stRes, mkRes] = await Promise.all([
        supabase.from('exam_events').select('*').eq('id', examId).single(),
        supabase.from('classes').select('*').eq('id', classId).single(),
        supabase.from('subjects').select('*').eq('id', subjectId).single(),
        // Get students in this class
        supabase.from('students').select('id, full_name, admission_number').eq('class_id', classId).order('full_name'),
        // Get existing marks
        supabase.from('exam_marks')
          .select('*')
          .eq('exam_event_id', examId)
          .eq('subject_id', subjectId)
          .eq('class_id', classId)
      ])

      setExam(exRes.data)
      setCls(clRes.data)
      setSubject(sbRes.data)
      setStudents(stRes.data || [])

      // Map marks to state
      const marksMap: Record<string, { marks: number | string; remark: string }> = {}
      mkRes.data?.forEach(m => {
        marksMap[m.student_id] = { marks: m.marks, remark: m.teacher_remark || '' }
      })
      setMarks(marksMap)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!teacher) return
    setSaving(true)
    try {
      const toUpsert = Object.entries(marks).map(([studentId, data]) => ({
        student_id: studentId,
        exam_event_id: examId,
        subject_id: subjectId,
        class_id: classId,
        teacher_id: teacher.id,
        marks: Number(data.marks),
        teacher_remark: data.remark,
      }))

      const { error } = await supabase.from('exam_marks').upsert(toUpsert, { onConflict: 'student_id,subject_id,exam_event_id' })
      if (error) throw error
      toast.success('Marks saved successfully!')
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = students.filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="p-6"><SkeletonList count={10} /></div>

  const isReadOnly = exam?.status !== 'active'

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/teacher/exams/${examId}`}>
            <button className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-[var(--input)] transition-colors" style={{ border: '1px solid var(--card-border)' }}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-black">{subject?.name}</h1>
            <p className="text-sm text-gray-500">{cls?.name} · {exam?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
           {!isReadOnly && (
             <Button onClick={handleSave} isLoading={saving} className="w-full md:w-auto">
               <Save size={16} className="mr-2" /> Save Marks
             </Button>
           )}
           {isReadOnly && <Badge variant="muted">Exam Period Closed</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
           <Card className="overflow-hidden">
             <div className="p-4 border-b border-[var(--card-border)] bg-[var(--input)]">
                <Input 
                  placeholder="Search students..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  leftIcon={<Search size={16} />} 
                  className="bg-white"
                />
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm">
                   <thead>
                      <tr className="text-left border-b border-[var(--card-border)] bg-[var(--bg)]">
                         <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted">Student</th>
                         <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted w-32">Mark (Max 100)</th>
                         <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted">Teacher Remarks (For Transcript)</th>
                      </tr>
                   </thead>
                   <tbody>
                      {filtered.map((student) => (
                        <tr key={student.id} className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--input)] transition-colors">
                           <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                                   {student.full_name[0]}
                                 </div>
                                 <div>
                                    <div className="font-bold">{student.full_name}</div>
                                    <div className="text-[10px] text-muted">{student.admission_number}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={isReadOnly}
                                value={marks[student.id]?.marks ?? ''}
                                onChange={e => setMarks(prev => ({ ...prev, [student.id]: { ...prev[student.id], marks: e.target.value } }))}
                                className="w-full text-center font-bold py-2 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow"
                                style={{ background: 'var(--bg)', border: '1px solid var(--card-border)' }}
                                placeholder="0"
                              />
                           </td>
                           <td className="px-6 py-4">
                              <textarea
                                rows={1}
                                disabled={isReadOnly}
                                value={marks[student.id]?.remark ?? ''}
                                onChange={e => setMarks(prev => ({ ...prev, [student.id]: { ...prev[student.id], remark: e.target.value } }))}
                                className="w-full py-2 px-3 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-shadow text-xs"
                                style={{ background: 'var(--bg)', border: '1px solid var(--card-border)', resize: 'none' }}
                                placeholder="Excellent performance..."
                              />
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           </Card>
        </div>

        <div className="space-y-6">
           <Card className="p-5">
              <h3 className="font-bold mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-success" /> Marking Stats</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-muted">Completion</span>
                    <span className="font-bold text-sm">
                       {Object.keys(marks).length} / {students.length}
                    </span>
                 </div>
                 <div className="w-full bg-[var(--input)] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-500" 
                      style={{ width: `${(Object.keys(marks).length / (students.length || 1)) * 100}%` }} 
                    />
                 </div>
                 <div className="p-3 rounded-xl bg-[var(--input)] border border-[var(--card-border)]">
                    <p className="text-[10px] text-muted leading-relaxed">
                       Subject remarks entered here will appear directly on the student&apos;s final academic transcript.
                    </p>
                 </div>
              </div>
           </Card>

           {!isReadOnly && (
             <Card className="p-5 bg-primary text-white">
                <h3 className="font-bold mb-2">Ready to save?</h3>
                <p className="text-xs opacity-90 mb-4">Don&apos;t forget to save your progress. You can come back and edit anytime while the exam phase is ACTIVE.</p>
                <Button onClick={handleSave} isLoading={saving} className="w-full bg-white text-primary hover:bg-white/90 border-none font-black">
                   SAVE ALL MARKS
                </Button>
             </Card>
           )}
        </div>
      </div>
    </div>
  )
}
