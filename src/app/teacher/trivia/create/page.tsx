'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Clock, ChevronRight, ChevronLeft, Image, Check, Trophy, Users, AlertCircle, Save, BookOpen } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import dynamic from 'next/dynamic'
const TriviaImageUploader = dynamic(
  () => import('@/components/trivia/TriviaImageUploader').then(mod => mod.TriviaImageUploader),
  { ssr: false }
)
import RichTextEditor from '@/components/ui/RichTextEditor'
import { generateId } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Option { id: string; text: string }
interface Question {
  id: string
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

export default function CreateTriviaPage() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1 — config
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [centerId, setCenterId] = useState('')
  const [classIds, setClassIds] = useState<string[]>([])

  // Step 2 — questions
  const [questions, setQuestions] = useState<Question[]>([makeQuestion()])
  const [activeQIdx, setActiveQIdx] = useState(0)

  // Data
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([])
  const [mySubjects, setMySubjects] = useState<{ id: string; name: string; class_id: string }[]>([])
  const [centers, setCenters] = useState<any[]>([])

  useEffect(() => { if (teacher?.id) loadData() }, [teacher?.id])

  const loadData = async () => {
    if (!teacher?.id) return
    const { data } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, class:classes(id,name), subject:subjects(id,name,class_id)')
      .eq('teacher_id', teacher.id)

    const classes = (data ?? []).map((a: any) => a.class).filter(Boolean).filter((c: any, i: number, arr: any[]) => arr.findIndex(x => x.id === c.id) === i)
    const subjects = (data ?? []).map((a: any) => a.subject).filter(Boolean).filter((s: any, i: number, arr: any[]) => arr.findIndex(x => x.id === s.id) === i)
    setMyClasses(classes)
    setMySubjects(subjects)

    const { data: centersData } = await supabase.from('tuition_centers').select('id, name').order('name')
    setCenters(centersData || [])
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
  const step1Valid = questions.every(q =>
    q.text.trim() &&
    q.options.filter(o => o.text.trim()).length >= 2 &&
    q.correct_option_id &&
    q.options.find(o => o.id === q.correct_option_id)?.text.trim()
  )

  // ── Submit ────────────────────────────────────────────────────
  const handleSave = async (publish = false) => {
    if (!teacher?.id) {
       toast.error('Authentication error. Please reload.')
       return
    }
    setSaving(true)
    const { data: session, error: sErr } = await supabase
      .from('trivia_sessions')
      .insert({
        teacher_id: teacher.id,
        title: title.trim(),
        description: description.trim() || null,
        subject_id: subjectId || null,
        class_ids: classIds,
        tuition_center_id: centerId || null,
        status: publish ? 'published' : 'draft',
      })
      .select()
      .single()

    if (sErr || !session) { toast.error('Failed to save trivia'); setSaving(false); return }

    const qPayload = questions.map((q, i) => ({
      session_id: session.id,
      position: i,
      text: q.text.trim(),
      options: q.options.filter(o => o.text.trim()),
      correct_option_id: q.correct_option_id,
      marks: q.marks,
      time_seconds: q.time_seconds,
      image_url: q.image_url || null,
    }))

    const { error: qErr } = await supabase.from('trivia_questions').insert(qPayload)
    if (qErr) { toast.error('Failed to save questions'); setSaving(false); return }

    toast.success(publish ? '🚀 Trivia published!' : 'Trivia saved as draft')
    router.push(`/teacher/trivia/${session.id}`)
  }

  const activeQ = questions[activeQIdx]

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/trivia')}>
          <ChevronLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Create Trivia</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Set up a competitive group challenge for your students</p>
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

      {/* ── Step 0: Configure ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <Card className="p-5 space-y-4">
              <h2 className="font-black text-base flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Trophy size={18} className="text-amber-500" /> Basic Info
              </h2>
              <Input label="Trivia Title *" placeholder="e.g. Chemistry Term 1 Challenge" value={title} onChange={e => setTitle(e.target.value)} />
              <Input label="Description" placeholder="Brief description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
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
                  {myClasses.length === 0 && <p className="text-xs text-[var(--text-muted)]">No classes assigned</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Subject (optional)" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                  <option value="">Any Subject</option>
                  {mySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Select label="Tuition Center" value={centerId} onChange={e => setCenterId(e.target.value)}>
                  <option value="">All Centers (Default)</option>
                  {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} disabled={!step0Valid}>
                Next: Add Questions <ChevronRight size={16} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 1: Questions ─────────────────────────────────── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Question sidebar / horizontal slider on mobile */}
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 md:w-32 shrink-0 scrollbar-hide">
                {questions.map((q, i) => (
                  <motion.button key={q.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    onClick={() => setActiveQIdx(i)}
                    className={`shrink-0 w-16 md:w-full h-10 md:h-auto text-center md:text-left p-2 md:p-3 rounded-xl border text-[10px] md:text-xs font-bold transition-all ${activeQIdx === i ? 'text-white border-transparent' : 'border-[var(--card-border)] text-[var(--text-muted)]'}`}
                    style={{ background: activeQIdx === i ? 'var(--primary)' : 'var(--input)' }}>
                    <div className="flex justify-between items-center group">
                       <span>Q{i + 1}</span>
                       {q.correct_option_id && q.text && <Check size={10} className="text-emerald-400" />}
                    </div>
                    <div className="truncate font-normal opacity-80 mt-0.5 hidden md:block">{q.text.slice(0, 15) || 'Untitled'}</div>
                  </motion.button>
                ))}
                <button onClick={addQuestion}
                  className="shrink-0 w-12 md:w-full h-10 p-2 md:p-3 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-1 transition-all hover:border-primary hover:text-primary"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
                  <Plus size={14} /> <span className="hidden md:inline">Add</span>
                </button>
              </div>

              {/* Question editor */}
              {activeQ && (
                <motion.div key={activeQ.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 min-w-0 space-y-4">
                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>Question {activeQIdx + 1}</h3>
                      <button onClick={() => removeQuestion(activeQIdx)} className="text-red-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mb-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Marks</label>
                        <input type="number" min="1" max="10"
                          className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                          value={activeQ.marks}
                          onChange={e => updateQ(activeQIdx, { marks: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>
                          <Clock size={10} className="inline mr-1" />Time per Q (sec)
                        </label>
                        <input type="number" min="5" max="300"
                          className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                          value={activeQ.time_seconds}
                          onChange={e => updateQ(activeQIdx, { time_seconds: parseInt(e.target.value) || 30 })}
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm" style={{ color: 'var(--text)' }}>Answer Options</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                        Click option to mark correct
                      </span>
                    </div>
                    {activeQ.options.map((opt, oi) => (
                      <div key={opt.id} className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => updateQ(activeQIdx, { correct_option_id: opt.id })}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${activeQ.correct_option_id === opt.id ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg' : 'border-[var(--card-border)]'}`}>
                          {activeQ.correct_option_id === opt.id ? <Check size={16} /> : <span className="text-[10px] font-black opacity-40">{String.fromCharCode(65 + oi)}</span>}
                        </button>
                        <input
                          className="flex-1 rounded-xl px-3 py-2.5 text-sm border outline-none transition-all focus:ring-4 focus:ring-primary/10"
                          style={{ background: 'var(--input)', border: activeQ.correct_option_id === opt.id ? '2px solid #10B981' : '1px solid var(--card-border)', color: 'var(--text)' }}
                          placeholder={`Enter Option ${String.fromCharCode(65 + oi)}...`}
                          value={opt.text}
                          onChange={e => updateOption(activeQIdx, oi, e.target.value)}
                        />
                      </div>
                    ))}
                    {!activeQ.correct_option_id && (
                      <div className="flex items-center gap-2 text-amber-500 text-xs">
                        <AlertCircle size={12} /> Select the correct option
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </div>

            {!step1Valid && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-amber-600"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertCircle size={14} /> All questions need text, at least 2 options, and a correct answer selected.
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(0)}>
                <ChevronLeft size={16} /> Back
              </Button>
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>
                Review <ChevronRight size={16} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Review ───────────────────────────────────── */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Card className="p-5 space-y-3">
              <h2 className="font-black text-base flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Trophy size={18} className="text-amber-500" /> {title}
              </h2>
              {description && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>}
              <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><Users size={12} /> {classIds.length} class{classIds.length !== 1 ? 'es' : ''}</span>
                <span className="flex items-center gap-1"><BookOpen size={12} /> {questions.length} questions</span>
                <span className="flex items-center gap-1">
                  {questions.reduce((a, q) => a + q.marks, 0)} total marks
                </span>
              </div>
            </Card>

            <div className="space-y-2">
              {questions.map((q, i) => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 text-white" style={{ background: 'var(--primary)' }}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{q.text}</p>
                      <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {q.time_seconds}s</span>
                        <span className="text-emerald-500">✓ {q.options.find(o => o.id === q.correct_option_id)?.text}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Back
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => handleSave(false)} isLoading={saving}>
                <Save size={16} /> Save as Draft
              </Button>
              <Button className="flex-1" onClick={() => handleSave(true)} isLoading={saving}>
                🚀 Publish Now
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
