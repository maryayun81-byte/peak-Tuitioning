'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, ChevronLeft, ChevronRight, Plus, Trash2,
  BookOpen, Users, Clock, Check, Image, AlertCircle, Save
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { TriviaImageUploader } from '@/components/trivia/TriviaImageUploader'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { generateId } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Option { id: string; text: string }
interface Question {
  id: string
  dbId?: string // to track existing questions
  text: string
  options: Option[]
  correct_option_id: string
  marks: number
  time_seconds: number
  image_url: string
}

function makeOption(text = ''): Option {
  return { id: generateId(), text }
}
function makeQuestion(): Question {
  return {
    id: generateId(),
    text: '',
    options: [makeOption(), makeOption(), makeOption(), makeOption()],
    correct_option_id: '',
    marks: 1,
    time_seconds: 30,
    image_url: '',
  }
}

const STEP_LABELS = ['Configure', 'Questions', 'Review']

export default function EditTriviaPage() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Step 1 — config
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [classIds, setClassIds] = useState<string[]>([])
  const [status, setStatus] = useState<'draft' | 'published' | 'closed'>('draft')

  // Step 2 — questions
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeQIdx, setActiveQIdx] = useState(0)

  // Data
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([])
  const [mySubjects, setMySubjects] = useState<{ id: string; name: string; class_id: string }[]>([])

  useEffect(() => { 
    if (teacher?.id && sessionId) {
      loadSessionData()
    }
  }, [teacher?.id, sessionId])

  const loadSessionData = async () => {
    setLoading(true)
    try {
      // 1. Load Session
      const { data: session, error: sErr } = await supabase
        .from('trivia_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      if (sErr || !session) throw new Error('Trivia not found')
      
      setTitle(session.title)
      setDescription(session.description || '')
      setSubjectId(session.subject_id || '')
      setClassIds(session.class_ids || [])
      setStatus(session.status)

      // 2. Load Questions
      const { data: qs, error: qErr } = await supabase
        .from('trivia_questions')
        .select('*')
        .eq('session_id', sessionId)
        .order('position')
      
      if (qErr) throw qErr
      
      if (qs && qs.length > 0) {
        setQuestions(qs.map(q => ({
          id: generateId(),
          dbId: q.id,
          text: q.text,
          options: q.options,
          correct_option_id: q.correct_option_id,
          marks: q.marks,
          time_seconds: q.time_seconds,
          image_url: q.image_url || '',
        })))
      } else {
        setQuestions([makeQuestion()])
      }

      // 3. Load Teacher Meta
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id, subject_id, class:classes(id,name), subject:subjects(id,name,class_id)')
        .eq('teacher_id', teacher!.id)

      const classes = (assignments ?? []).map((a: any) => a.class).filter(Boolean).filter((c: any, i: number, arr: any[]) => arr.findIndex(x => x.id === c.id) === i)
      const subjects = (assignments ?? []).map((a: any) => a.subject).filter(Boolean).filter((s: any, i: number, arr: any[]) => arr.findIndex(x => x.id === s.id) === i)
      setMyClasses(classes)
      setMySubjects(subjects)

    } catch (e: any) {
      toast.error(e.message || 'Failed to load data')
      router.push('/teacher/trivia')
    } finally {
      setLoading(false)
    }
  }

  // ── Question helpers ──────────────────────────────────────────
  const updateQ = (idx: number, patch: Partial<Question>) =>
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q))

  const updateOption = (qIdx: number, oIdx: number, text: string) =>
    setQuestions(qs => qs.map((q, i) => i !== qIdx ? q : {
      ...q,
      options: q.options.map((o, j) => j === oIdx ? { ...o, text } : o)
    }))

  const addQuestion = () => {
    setQuestions(qs => [...qs, makeQuestion()])
    setActiveQIdx(questions.length)
  }

  const removeQuestion = (idx: number) => {
    if (questions.length === 1) { toast.error('Need at least 1 question'); return }
    setQuestions(qs => qs.filter((_, i) => i !== idx))
    setActiveQIdx(Math.max(0, activeQIdx - 1))
  }

  // ── Validation ────────────────────────────────────────────────
  const step0Valid = title.trim() && classIds.length > 0
  const step1Valid = questions.length > 0 && questions.every(q =>
    q.text.trim() &&
    q.options.filter(o => o.text.trim()).length >= 2 &&
    q.correct_option_id &&
    q.options.find(o => o.id === q.correct_option_id)?.text.trim()
  )

  // ── Submit ────────────────────────────────────────────────────
  const handleSave = async (publish = false) => {
    setSaving(true)
    try {
      // 1. Update Session
      const { error: sErr } = await supabase
        .from('trivia_sessions')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          subject_id: subjectId || null,
          class_ids: classIds,
          status: publish ? 'published' : status,
        })
        .eq('id', sessionId)

      if (sErr) throw sErr

      // 2. Clear old questions (simple approach: delete and re-insert)
      const { error: dErr } = await supabase.from('trivia_questions').delete().eq('session_id', sessionId)
      if (dErr) throw dErr

      // 3. Insert new questions
      const qPayload = questions.map((q, i) => ({
        session_id: sessionId,
        position: i,
        text: q.text.trim(),
        options: q.options.filter(o => o.text.trim()),
        correct_option_id: q.correct_option_id,
        marks: q.marks,
        time_seconds: q.time_seconds,
        image_url: q.image_url || null,
      }))

      const { error: qErr } = await supabase.from('trivia_questions').insert(qPayload)
      if (qErr) throw qErr

      toast.success(publish ? '🚀 Trivia published & saved!' : 'Changes saved successfully')
      router.push(`/teacher/trivia/${sessionId}`)
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase tracking-[0.2em] opacity-50">Loading Excellence...</div>

  const activeQ = questions[activeQIdx]

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/trivia')}>
          <ChevronLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Edit Trivia</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Modify your competitive challenge parameters</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black transition-all ${i <= step ? 'text-white' : 'text-[var(--text-muted)]'}`}
              style={{ background: i <= step ? 'var(--primary)' : 'var(--input)' }}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-[10px] sm:text-xs font-black ${i === step ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className="hidden sm:block w-6 h-px bg-[var(--card-border)]" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <Card className="p-5 space-y-4">
              <h2 className="font-black text-base flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Trophy size={18} className="text-amber-500" /> Basic Info
              </h2>
              <Input label="Trivia Title *" value={title} onChange={e => setTitle(e.target.value)} />
              <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} />
            </Card>

            <Card className="p-5 space-y-4">
              <h2 className="font-black text-base flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Users size={18} className="text-primary" /> Classes & Subject
              </h2>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>Classes *</label>
                <div className="flex flex-wrap gap-2">
                  {myClasses.map(c => (
                    <button key={c.id}
                      onClick={() => setClassIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${classIds.includes(c.id) ? 'text-white border-transparent' : 'border-[var(--card-border)] text-[var(--text-muted)]'}`}
                      style={{ background: classIds.includes(c.id) ? 'var(--primary)' : 'var(--input)' }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <Select label="Subject (optional)" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                <option value="">Any Subject</option>
                {mySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} disabled={!step0Valid}>
                Next: Edit Questions <ChevronRight size={16} />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 md:w-32 shrink-0 scrollbar-hide">
                {questions.map((q, i) => (
                  <motion.button key={q.id}
                    onClick={() => setActiveQIdx(i)}
                    className={`shrink-0 w-16 md:w-full h-10 md:h-auto text-center md:text-left p-2 md:p-3 rounded-xl border text-[10px] md:text-xs font-bold transition-all ${activeQIdx === i ? 'text-white border-transparent' : 'border-[var(--card-border)] text-[var(--text-muted)]'}`}
                    style={{ background: activeQIdx === i ? 'var(--primary)' : 'var(--input)' }}>
                    <div className="flex justify-between items-center">
                       <span>Q{i + 1}</span>
                       {q.correct_option_id && q.text && <Check size={10} className="text-emerald-400" />}
                    </div>
                  </motion.button>
                ))}
                <button onClick={addQuestion}
                  className="shrink-0 w-12 md:w-full h-10 p-2 md:p-3 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-1 transition-all hover:border-primary hover:text-primary"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
                  <Plus size={14} />
                </button>
              </div>

              {activeQ && (
                <div className="flex-1 min-w-0 space-y-4">
                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>Question {activeQIdx + 1}</h3>
                      <button onClick={() => removeQuestion(activeQIdx)} className="text-red-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mb-4 mt-2">
                       <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>Question Prompt *</label>
                       <RichTextEditor
                         value={activeQ.text}
                         onChange={(html: string) => updateQ(activeQIdx, { text: html })}
                         placeholder="Enter question, math formula ($$ E=mc^2 $$), or chemical equation..."
                       />
                    </div>

                    <div className="mb-4">
                       <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>Visual Context (Diagrams / Images)</label>
                       <TriviaImageUploader
                         imageUrl={activeQ.image_url || null}
                         onImageChange={(url: string | null) => updateQ(activeQIdx, { image_url: url || '' })}
                         disabled={saving}
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Marks" type="number" value={activeQ.marks.toString()} onChange={e => updateQ(activeQIdx, { marks: parseInt(e.target.value) || 1 })} />
                      <Input label="Time (s)" type="number" value={activeQ.time_seconds.toString()} onChange={e => updateQ(activeQIdx, { time_seconds: parseInt(e.target.value) || 30 })} />
                    </div>
                  </Card>
                  <Card className="p-5 space-y-3">
                    <h4 className="font-black text-sm" style={{ color: 'var(--text)' }}>Answer Options</h4>
                    {activeQ.options.map((opt, oi) => (
                      <div key={opt.id} className="flex items-center gap-3">
                        <button
                          onClick={() => updateQ(activeQIdx, { correct_option_id: opt.id })}
                          className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center shrink-0 ${activeQ.correct_option_id === opt.id ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg' : 'border-[var(--card-border)]'}`}>
                          {activeQ.correct_option_id === opt.id ? <Check size={16} /> : String.fromCharCode(65 + oi)}
                        </button>
                        <input
                          className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none"
                          style={{ background: 'var(--input)', border: activeQ.correct_option_id === opt.id ? '2px solid #10B981' : '1px solid var(--card-border)', color: 'var(--text)' }}
                          value={opt.text}
                          onChange={e => updateOption(activeQIdx, oi, e.target.value)}
                        />
                      </div>
                    ))}
                  </Card>
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>Review</Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Card className="p-5">
              <h2 className="font-black text-base italic text-primary uppercase tracking-widest">{title}</h2>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{questions.length} Questions / {questions.reduce((a,q)=>a+q.marks,0)} Total Marks</p>
            </Card>
            <div className="flex flex-col gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => handleSave(false)} isLoading={saving}><Save size={16} className="mr-2"/> Save Changes</Button>
              {status === 'draft' && <Button className="flex-1 bg-emerald-500 text-white" onClick={() => handleSave(true)} isLoading={saving}>🚀 Save & Publish</Button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
