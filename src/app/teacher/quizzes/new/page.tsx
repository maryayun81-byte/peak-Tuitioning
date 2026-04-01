'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Trash2, Save, Send, Eye, X, 
  HelpCircle, CheckCircle2, List, Clock,
  Trophy, AlertCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import type { Class, Subject } from '@/types/database'

type QuestionType = 'multiple_choice' | 'multiple_answer' | 'true_false' | 'short_answer'
type GradingMethod = 'exact' | 'keyword' | 'similarity'

interface Question {
  id: string
  text: string
  type: QuestionType
  options: string[]
  correct_answer: string
  correct_answers: string[]
  keywords: string[]
  grading_method: GradingMethod
  marks: number
  explanation?: string
}

export default function QuizCreator() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { profile, teacher } = useAuthStore()

  const [allAssignments, setAllAssignments] = useState<any[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    tuition_center_id: '',
    time_limit: 15,
    passing_score: 70,
    max_attempts: 1,
    retake_delay_minutes: 0,
    audience: 'class' as 'all_classes' | 'class' | 'class_subject',
    instructions: '',
    publish_at: '',
  })

  const [questions, setQuestions] = useState<Question[]>([
    { 
      id: crypto.randomUUID(), 
      text: '', 
      type: 'multiple_choice', 
      options: ['', '', '', ''], 
      correct_answer: '',
      correct_answers: [],
      keywords: [],
      grading_method: 'exact',
      marks: 1
    }
  ])

  useEffect(() => {
    if (profile) loadSelectors()
  }, [profile, teacher])

  const loadSelectors = async () => {
    if (!profile?.id) return

    let currentTeacherId = teacher?.id
    if (!currentTeacherId) {
      const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', profile.id).single()
      currentTeacherId = tData?.id
    }

    if (!currentTeacherId) return

    // Fetch from teacher_assignments (the real assignment table)
    const { data: assignData } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, class:classes(id, name), subject:subjects(id, name, class_id)')
      .eq('teacher_id', currentTeacherId)

    const assignments = assignData ?? []

    // Build unique class list
    const classMap = new Map<string, any>()
    assignments.forEach((a: any) => {
      if (!a.class_id) return
      if (!classMap.has(a.class_id)) {
        const cObj = Array.isArray(a.class) ? a.class[0] : a.class
        classMap.set(a.class_id, { id: a.class_id, name: cObj?.name ?? 'Unknown Class' })
      }
    })

    // Normalize to flat list for subject filtering
    const normalized = assignments.map((a: any) => ({
      class_id: a.class_id,
      subject_id: a.subject_id,
      classes: Array.isArray(a.class) ? a.class[0] : a.class,
      subjects: Array.isArray(a.subject) ? a.subject[0] : a.subject,
    }))
    setAllAssignments(normalized)

    // Fallback to teaching map if no formal assignments
    if (classMap.size === 0) {
      const { data: mapData } = await supabase
        .from('teacher_teaching_map')
        .select('class_id, subject_id, classes(id, name), subjects(id, name, class_id)')
        .eq('teacher_id', currentTeacherId)
      ;(mapData || []).forEach((m: any) => {
        if (m.class_id && !classMap.has(m.class_id)) {
          const cObj = Array.isArray(m.classes) ? m.classes[0] : m.classes
          classMap.set(m.class_id, { id: m.class_id, name: cObj?.name ?? 'Unknown Class' })
        }
      })
      setAllAssignments(mapData || [])
    }

    setClasses(Array.from(classMap.values()) as Class[])

    const { data: centersData } = await supabase.from('tuition_centers').select('id, name').order('name')
    setCenters(centersData || [])
  }

  // Update subjects when class changes
  useEffect(() => {
    if (form.class_id) {
      const filteredSubjects = allAssignments
        .filter((m: any) => m.class_id === form.class_id)
        .map((m: any) => m.subjects)
        .filter(Boolean)
      setSubjects(filteredSubjects)
    } else {
      setSubjects([])
    }
  }, [form.class_id, allAssignments])

  const addQuestion = () => {
    setQuestions([...questions, { 
      id: crypto.randomUUID(), 
      text: '', 
      type: 'multiple_choice', 
      options: ['', '', '', ''], 
      correct_answer: '',
      correct_answers: [],
      keywords: [],
      grading_method: 'exact',
      marks: 1
    }])
  }

  const removeQuestion = (id: string) => {
    if (questions.length === 1) return
    setQuestions(questions.filter(q => q.id !== id))
  }

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const saveQuiz = async () => {
    if (!form.title || !form.class_id || !form.subject_id) {
      toast.error('Please fill in title, class, and subject')
      return
    }
    
    const isValid = questions.every(q => {
      if (!q.text) return false
      if (q.type === 'multiple_choice') return q.correct_answer && q.options.every(o => o)
      if (q.type === 'multiple_answer') return q.correct_answers.length > 0 && q.options.every(o => o)
      if (q.type === 'true_false') return q.correct_answer
      if (q.type === 'short_answer') return q.grading_method === 'keyword' ? q.keywords.length > 0 : q.correct_answers.length > 0
      return false
    })
    if (!isValid) {
      toast.error('Please complete all questions, options, and correct answers')
      return
    }

    setLoading(true)

    // Resolve teacher ID at save time to avoid race conditions with auth store hydration
    let currentTeacherId = teacher?.id
    if (!currentTeacherId && profile?.id) {
      const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', profile.id).single()
      currentTeacherId = tData?.id
    }

    if (!currentTeacherId) {
      toast.error('Teacher profile not found. Please re-login and try again.')
      setLoading(false)
      return
    }
    
    // Build the quiz payload — all columns now exist via migration 20260402_extend_quizzes_assignments.sql
    const quizPayload: Record<string, any> = {
      title: form.title,
      description: form.instructions || null,
      class_id: form.class_id,
      subject_id: form.subject_id,
      questions: questions,
      duration_minutes: form.time_limit || null,
      total_marks: questions.reduce((sum, q) => sum + q.marks, 0),
      pass_mark_percentage: form.passing_score,
      max_attempts: form.max_attempts,
      retake_delay_minutes: form.retake_delay_minutes,
      audience: form.audience,
      instructions: form.instructions || null,
      publish_at: form.publish_at || null,
      is_published: true,
      teacher_id: currentTeacherId,
      tuition_center_id: form.tuition_center_id || null,
    }

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert(quizPayload)
      .select()
      .single()

    if (error) {
      console.error('[Quiz Save Error]', error)
      toast.error('Failed to create quiz: ' + error.message)
    } else {
      toast.success('Quiz created successfully!')
      router.push('/teacher/quizzes')
    }
    setLoading(false)
  }


  return (
    <div className="p-6 max-w-5xl mx-auto pb-32">
       <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-[var(--input)]"><X size={20} /></button>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>New Quiz Creator</h1>
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={saveQuiz} isLoading={loading}><Send size={16} className="mr-2" /> Save &amp; Publish</Button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Metadata & Questions */}
         <div className="lg:col-span-2 space-y-8">
            <Card className="p-6 space-y-4">
               <h3 className="font-bold border-b pb-2 mb-4 text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <HelpCircle size={16} className="text-primary" /> Quiz Details
               </h3>
               <Input label="Quiz Title" placeholder="e.g. Weekly Math Challenge" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
               <Textarea label="Instructions (optional)" placeholder="Rules of the quiz..." value={form.instructions} onChange={e => setForm({...form, instructions: e.target.value})} />
            </Card>

            <div className="space-y-6">
               <h3 className="font-bold text-sm uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                  Questions ({questions.length})
                  <Button variant="secondary" size="sm" onClick={addQuestion}><Plus size={14} className="mr-1" /> Add Question</Button>
               </h3>

                {questions.map((q, idx) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-6 space-y-4 relative group">
                       <button onClick={() => removeQuestion(q.id)} className="absolute top-4 right-4 p-1.5 text-danger opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                       
                       <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex items-center gap-3 flex-1">
                             <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">{idx + 1}</div>
                             <Input className="flex-1" placeholder="Enter your question here..." value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} />
                          </div>
                          <div className="flex items-center gap-2">
                             <Select className="w-40" value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value)}>
                                <option value="multiple_choice">MCQ</option>
                                <option value="multiple_answer">Multi-Answer</option>
                                <option value="true_false">True/False</option>
                                <option value="short_answer">Short Answer</option>
                             </Select>
                             <div className="w-24">
                                <Input type="number" placeholder="Marks" value={q.marks} onChange={e => updateQuestion(q.id, 'marks', parseInt(e.target.value))} />
                             </div>
                          </div>
                       </div>

                       {(q.type === 'multiple_choice' || q.type === 'multiple_answer') && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                 <input 
                                    type={q.type === 'multiple_choice' ? "radio" : "checkbox"}
                                    name={`correct-${q.id}`} 
                                    checked={q.type === 'multiple_choice' 
                                      ? q.correct_answer === opt && opt !== ''
                                      : q.correct_answers.includes(opt) && opt !== ''
                                    }
                                    onChange={() => {
                                      if (q.type === 'multiple_choice') {
                                        updateQuestion(q.id, 'correct_answer', opt)
                                      } else {
                                        const newCorrect = q.correct_answers.includes(opt)
                                          ? q.correct_answers.filter((a: string) => a !== opt)
                                          : [...q.correct_answers, opt]
                                        updateQuestion(q.id, 'correct_answers', newCorrect)
                                      }
                                    }}
                                    className="w-4 h-4 accent-primary"
                                 />
                                 <Input 
                                   placeholder={`Option ${oIdx + 1}`} 
                                   value={opt} 
                                   onChange={e => {
                                      const newOpts = [...q.options];
                                      const oldVal = newOpts[oIdx];
                                      newOpts[oIdx] = e.target.value;
                                      updateQuestion(q.id, 'options', newOpts);
                                      if (q.type === 'multiple_choice' && q.correct_answer === oldVal) {
                                        updateQuestion(q.id, 'correct_answer', e.target.value);
                                      } else if (q.type === 'multiple_answer' && q.correct_answers.includes(oldVal)) {
                                        updateQuestion(q.id, 'correct_answers', q.correct_answers.map((a: string) => a === oldVal ? e.target.value : a));
                                      }
                                   }}
                                 />
                              </div>
                            ))}
                         </div>
                       )}

                       {q.type === 'true_false' && (
                         <div className="flex gap-4 pl-11">
                            {['True', 'False'].map(opt => (
                              <button 
                                key={opt}
                                onClick={() => updateQuestion(q.id, 'correct_answer', opt)}
                                className={`px-4 py-2 rounded-lg border transition-all ${q.correct_answer === opt ? 'bg-primary text-white border-primary' : 'bg-transparent border-input'}`}
                              >
                                {opt}
                              </button>
                            ))}
                         </div>
                       )}

                       {q.type === 'short_answer' && (
                         <div className="space-y-4 pl-11">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <Select label="Grading Method" value={q.grading_method} onChange={e => updateQuestion(q.id, 'grading_method', e.target.value)}>
                                  <option value="exact">Exact Match</option>
                                  <option value="keyword">Keyword Matching</option>
                                  <option value="similarity">AI Text Similarity</option>
                               </Select>
                               <Input 
                                  label={q.grading_method === 'keyword' ? "Correct Keywords (comma separated)" : "Correct Answer"} 
                                  placeholder={q.grading_method === 'keyword' ? "keyword1, keyword2..." : "Type the answer..."}
                                  value={q.grading_method === 'keyword' ? q.keywords.join(', ') : (q.correct_answers[0] || '')}
                                  onChange={e => {
                                    if (q.grading_method === 'keyword') {
                                      updateQuestion(q.id, 'keywords', e.target.value.split(',').map((s: string) => s.trim()))
                                    } else {
                                      updateQuestion(q.id, 'correct_answers', [e.target.value])
                                    }
                                  }}
                               />
                            </div>
                         </div>
                       )}

                       <div className="pl-11">
                          <Input label="Explanation (optional)" placeholder="Why is this answer correct?" value={q.explanation} onChange={e => updateQuestion(q.id, 'explanation', e.target.value)} />
                       </div>
                    </Card>
                  </motion.div>
                ))}
               
               <Button variant="outline" className="w-full border-dashed py-8" onClick={addQuestion}>
                  <Plus className="mr-2" /> Add another question
               </Button>
            </div>
         </div>

         {/* Settings Sidebar */}
         <div className="space-y-6">
             <Card className="p-6 space-y-4">
                <h3 className="font-bold border-b pb-2 mb-4 text-sm" style={{ color: 'var(--text)' }}>Configuration</h3>
                
                <Select label="Assign To" value={form.audience} onChange={e => setForm({...form, audience: e.target.value as any})}>
                   <option value="class">Specific Class</option>
                   <option value="all_classes">All My Classes</option>
                   <option value="class_subject">Class + Subject</option>
                </Select>

                {form.audience !== 'all_classes' && (
                  <Select label="Class" value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value, subject_id: ''})}>
                     <option value="">Select Class</option>
                     {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                )}

                <Select label="Subject" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} disabled={!form.class_id}>
                   <option value="">{form.class_id ? 'Select Subject' : 'Select a class first'}</option>
                   {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>

                <Select label="Tuition Center" value={form.tuition_center_id} onChange={e => setForm({...form, tuition_center_id: e.target.value})}>
                   <option value="">All Centers (Default)</option>
                   {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>

                <div className="grid grid-cols-2 gap-4">
                   <Input label="Time Limit (Min)" type="number" value={form.time_limit} onChange={e => setForm({...form, time_limit: parseInt(e.target.value)})} />
                   <Input label="Passing %" type="number" value={form.passing_score} onChange={e => setForm({...form, passing_score: parseInt(e.target.value)})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <Input label="Max Attempts" type="number" value={form.max_attempts} onChange={e => setForm({...form, max_attempts: parseInt(e.target.value)})} />
                   <Input label="Retake Delay (m)" type="number" value={form.retake_delay_minutes} onChange={e => setForm({...form, retake_delay_minutes: parseInt(e.target.value)})} />
                </div>
                
                <div className="space-y-1">
                   <Input label="Schedule Publish (Optional)" type="datetime-local" value={form.publish_at} onChange={e => setForm({...form, publish_at: e.target.value})} />
                   <p className="text-[10px] text-[var(--text-muted)]">Leave empty to publish instantly</p>
                </div>
             </Card>

            <Card className="p-6 bg-primary/5 border-primary/20">
               <h3 className="font-bold mb-2 text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Trophy size={16} className="text-primary" /> Gamification
               </h3>
               <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Interactive quizzes automatically generate leaderboards and issue digital certificates to students who pass.</p>
               <div className="mt-4 p-3 rounded-lg bg-white/5 border border-primary/10">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                     <span>Leaderboard enabled</span>
                     <CheckCircle2 size={12} className="text-emerald-500" />
                  </div>
               </div>
            </Card>
         </div>
      </div>
    </div>
  )
}
