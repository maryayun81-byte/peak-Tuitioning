'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Trash2, Save, Send, Eye, X, 
  HelpCircle, CheckCircle2, List, Clock,
  Trophy, AlertCircle, Info, BookOpen
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'
import { FileUploadZone } from '@/components/worksheet/FileUploadZone'
import { LatexRenderer } from '@/components/ui/LatexRenderer'
import { useAutoSave } from '@/hooks/useAutoSave'
import { DraftBanner } from '@/components/ui/DraftBanner'
import { clearPageDataCache } from '@/hooks/usePageData'
import { generateId } from '@/lib/utils'
import dynamic from 'next/dynamic'
const AnnotationCanvas = dynamic(() => import('@/components/worksheet/AnnotationCanvas').then(m => m.AnnotationCanvas), { ssr: false })
import { useMemo } from 'react'
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
  image_url?: string | null
}

interface QuizFormProps {
  initialData?: any
  isEditing?: boolean
}

export function QuizForm({ initialData, isEditing = false }: QuizFormProps) {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { profile, teacher } = useAuthStore()

  const [allAssignments, setAllAssignments] = useState<any[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  // Per-question illustration draw modal: key = question id
  const [drawingModalQId, setDrawingModalQId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    class_id: initialData?.class_id || '',
    subject_id: initialData?.subject_id || '',
    tuition_center_id: initialData?.tuition_center_id || '',
    time_limit: initialData?.duration_minutes || 15,
    passing_score: initialData?.pass_mark_percentage || 70,
    max_attempts: initialData?.max_attempts || 1,
    retake_delay_minutes: initialData?.retake_delay_minutes || 0,
    audience: initialData?.audience || 'class',
    instructions: initialData?.instructions || '',
    publish_at: initialData?.publish_at ? new Date(initialData.publish_at).toISOString().slice(0, 16) : '',
  })

  const [questions, setQuestions] = useState<Question[]>(
    initialData?.questions || [
      { 
        id: generateId(), 
        text: '', 
        type: 'multiple_choice', 
        options: ['', '', '', ''], 
        correct_answer: '',
        correct_answers: [],
        keywords: [],
        grading_method: 'exact',
        marks: 1,
        image_url: null
      }
    ]
  )

  // Draft auto-save
  const draftData = useMemo(() => ({ form, questions }), [form, questions])
  const { hasSavedDraft, restore, clear, draftAge } = useAutoSave(
    isEditing ? `edit_quiz_${initialData?.id}` : 'new_quiz',
    draftData,
    (saved) => {
      setForm(saved.form)
      setQuestions(saved.questions)
      toast.success('Draft restored!')
    }
  )

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
      .select('class_id, subject_id, class:classes(id, name), subject:subjects(id, name, class_id), tuition_center:tuition_centers(id, name)')
      .eq('teacher_id', currentTeacherId)

    const assignments = assignData ?? []
    setAllAssignments(assignments)

    // Build unique class list
    const classMap = new Map<string, any>()
    assignments.forEach((a: any) => {
      if (!a.class_id) return
      if (!classMap.has(a.class_id)) {
        const cObj = Array.isArray(a.class) ? a.class[0] : a.class
        classMap.set(a.class_id, { id: a.class_id, name: cObj?.name ?? 'Unknown Class' })
      }
    })

    setClasses(Array.from(classMap.values()) as Class[])

    const { data: centersData } = await supabase.from('tuition_centers').select('id, name').order('name')
    setCenters(centersData || [])
  }

  // Update subjects when class changes
  useEffect(() => {
    if (form.class_id) {
      const filteredSubjects = allAssignments
        .filter((m: any) => m.class_id === form.class_id)
        .map((m: any) => Array.isArray(m.subject) ? m.subject[0] : m.subject)
        .filter(Boolean)
      
      // Deduplicate by ID
      const seen = new Set()
      const dedupedSubjects = filteredSubjects.filter(s => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })
      
      setSubjects(dedupedSubjects)
    } else {
      setSubjects([])
    }
  }, [form.class_id, allAssignments])

  const addQuestion = () => {
    setQuestions([...questions, { 
      id: generateId(), 
      text: '', 
      type: 'multiple_choice', 
      options: ['', '', '', ''], 
      correct_answer: '',
      correct_answers: [],
      keywords: [],
      grading_method: 'exact',
      marks: 1,
      image_url: null
    }])
  }

  const removeQuestion = (id: string) => {
    if (questions.length === 1) return
    setQuestions(questions.filter(q => q.id !== id))
  }

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const handleSave = async () => {
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

    // Resolve teacher ID
    let currentTeacherId = teacher?.id
    if (!currentTeacherId && profile?.id) {
      const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', profile.id).single()
      currentTeacherId = tData?.id
    }

    if (!currentTeacherId) {
      toast.error('Teacher profile not found.')
      setLoading(false)
      return
    }
    
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

    let saveError = null;
    if (isEditing && initialData?.id) {
      const { error } = await supabase
        .from('quizzes')
        .update(quizPayload)
        .eq('id', initialData.id)
      saveError = error
    } else {
      const { error } = await supabase
        .from('quizzes')
        .insert(quizPayload)
      saveError = error
    }

    if (saveError) {
      console.error('[Quiz Save Error]', saveError)
      toast.error('Failed to save quiz: ' + saveError.message)
    } else {
      clear() // Clear draft on successful save
      clearPageDataCache() // Invalidate global caches
      toast.success(isEditing ? 'Quiz updated successfully!' : 'Quiz created successfully!')
      router.push('/teacher/quizzes')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32">
       {/* Draft Banner */}
       {hasSavedDraft && !isEditing && (
         <div className="mb-6">
           <DraftBanner
             label="quiz"
             draftAge={draftAge}
             onRestore={restore}
             onDiscard={() => { clear(); toast('Draft discarded', { icon: '🗑️' }) }}
           />
         </div>
       )}
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
         <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-[var(--input)] transition-colors"><X size={20} /></button>
            <h1 className="text-xl md:text-2xl font-black leading-tight uppercase tracking-tighter" style={{ color: 'var(--text)' }}>
              {isEditing ? 'Edit Quiz' : 'New Quiz Creator'}
            </h1>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
            <Button variant="secondary" onClick={() => router.back()} className="flex-1 md:flex-none">Cancel</Button>
            <Button onClick={handleSave} isLoading={loading} className="flex-1 md:flex-none">
               <Send size={16} className="mr-2 hidden sm:inline" /> {isEditing ? 'Save Changes' : 'Save & Publish'}
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         {/* Main Form (3 cols) */}
         <div className="lg:col-span-3 space-y-8">
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
                             <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">{idx + 1}</div>
                             <div className="flex-1 space-y-2">
                                <Input className="w-full" placeholder="Enter your question here... Use $$ for LaTeX" value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} />
                                {q.text.includes('$$') && (
                                   <Card className="p-4 bg-[var(--input)] border-primary/20 shadow-inner">
                                      <div className="font-bold opacity-40 mb-2 uppercase tracking-widest text-[9px] flex items-center gap-1">
                                         <Eye size={10} /> Live Preview
                                      </div>
                                      <LatexRenderer content={q.text} block className="text-lg font-medium" />
                                   </Card>
                                )}
                             </div>
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

                        {/* Image + Illustration Support */}
                        <div className="pl-11 pr-4 space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Question Image / Illustration</label>
                              <div className="flex items-center gap-2">
                                 {q.image_url && <Button variant="secondary" size="xs" onClick={() => updateQuestion(q.id, 'image_url', null)}>Remove</Button>}
                                 <button
                                   type="button"
                                   onClick={() => setDrawingModalQId(q.id)}
                                   className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border"
                                   style={{
                                     background: 'var(--input)',
                                     borderColor: 'var(--card-border)',
                                     color: 'var(--text-muted)'
                                   }}
                                   title="Draw an illustration"
                                 >
                                   ✏️ Draw
                                 </button>
                              </div>
                           </div>
                           <FileUploadZone 
                             value={q.image_url || null} 
                             onChange={(url) => updateQuestion(q.id, 'image_url', url)}
                             bucket="quiz-media"
                           />
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
                                 <div className="flex-1 space-y-1">
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
                                    {opt.includes('$$') && (
                                      <div className="px-2 py-1.5 rounded bg-[var(--card)] border border-primary/20 mt-1 shadow-sm">
                                         <LatexRenderer content={opt} className="text-[10px]" />
                                      </div>
                                    )}
                                 </div>
                              </div>
                            ))}
                         </div>
                       )}

                       {q.type === 'true_false' && (
                         <div className="flex gap-4 pl-11">
                            {['True', 'False'].map(opt => (
                              <button 
                                key={opt}
                                type="button"
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
                                  label={q.grading_method === 'keyword' ? "Correct Keywords" : "Correct Answer"} 
                                  placeholder={q.grading_method === 'keyword' ? "k1, k2..." : "Answer..."}
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
                          <Input label="Explanation (optional)" placeholder="Why is this correct?" value={q.explanation} onChange={e => updateQuestion(q.id, 'explanation', e.target.value)} />
                       </div>
                    </Card>
                  </motion.div>
                ))}
            </div>
         </div>

         {/* Sidebar (1 col) */}
         <div className="space-y-6">
            {/* REFERENCE PANEL (The Hint) */}
            <Card className="p-5 border-primary/20 bg-primary/[0.02]">
               <h3 className="font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                  <BookOpen size={14} /> My Applied Curriculum
               </h3>
               <div className="space-y-3">
                  {allAssignments.length > 0 ? (
                    allAssignments.map((a, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-[var(--card-border)] shadow-sm last:mb-0">
                         <div className="text-[10px] font-black text-primary uppercase mb-1">{a.class?.name || 'Class'}</div>
                         <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>{a.subject?.name || 'Subject'}</div>
                         <div className="text-[9px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                            <Info size={10} /> {a.tuition_center?.name || 'All Centers'}
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-[var(--text-muted)] italic">No active teaching assignments found.</div>
                  )}
               </div>
               <p className="mt-4 text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Hint: Create quizzes for the subjects and classes listed above to ensure students can access them.
               </p>
            </Card>

            <Card className="p-6 space-y-4">
               <h3 className="font-bold border-b pb-2 mb-4 text-sm" style={{ color: 'var(--text)' }}>Settings</h3>
               
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
                  <Input label="Schedule Publish" type="datetime-local" value={form.publish_at} onChange={e => setForm({...form, publish_at: e.target.value})} />
               </div>
            </Card>

            <Card className="p-6 bg-primary/5 border-primary/20">
               <h3 className="font-bold mb-2 text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Trophy size={16} className="text-primary" /> Gamification
               </h3>
               <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Auto-leaderboards and digital certificates are enabled.</p>
            </Card>
         </div>
      </div>

      {/* Illustration Draw Modal */}
      {drawingModalQId !== null && (() => {
        const q = questions.find(x => x.id === drawingModalQId)
        if (!q) return null
        return (
          <Modal
            isOpen={true}
            onClose={() => setDrawingModalQId(null)}
            title={`Draw Illustration — Q${questions.findIndex(x => x.id === drawingModalQId) + 1}`}
            size="lg"
          >
            <div className="space-y-4">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Draw diagrams, shapes, or annotations. Click Save to attach as the question image.
              </p>
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
                <AnnotationCanvas
                  backgroundImageUrl={q.image_url || undefined}
                  initialJson={undefined}
                  readOnly={false}
                  onSave={(json) => {
                    // Convert the canvas JSON annotation into a data URL via a temporary canvas
                    // We store the JSON directly in image_url
                    updateQuestion(q.id, 'image_url', json)
                    setDrawingModalQId(null)
                    toast.success('Illustration saved!')
                  }}
                  defaultColor="#1e3a8a"
                />
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                The drawing will be shown to students above the question.
              </p>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
