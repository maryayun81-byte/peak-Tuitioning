'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus, Trash2, Save, BookOpen, FileText, ChevronDown, ChevronUp,
  Image as ImageIcon, Table2, BookMarked, Languages, Music2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { createExam, addExamQuestion } from '@/app/actions/exams'
import { LatexRenderer } from '@/components/ui/LatexRenderer'
import type { Subject } from '@/types/database'
import toast from 'react-hot-toast'
import { generateId } from '@/lib/utils'
import { generateQuestionNumber, DEPTH_LABELS } from '@/lib/exam/kcse-numbering'
import { SET_BOOKS, getSetBookGroups, SET_BOOK_SUBJECTS } from '@/lib/exam/kcse-set-books'

// ─── Data ─────────────────────────────────────────────────────────────────────
type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'essay' | 'math_working' | 'fill_in_blank'

const PASSAGE_TYPES = [
  // English / General
  { value: 'prose', label: 'Prose / Comprehension Passage', group: 'English' },
  { value: 'poem', label: 'Poem / Poetry', group: 'English' },
  { value: 'dialogue', label: 'Dialogue / Conversation', group: 'English' },
  { value: 'set_book', label: 'Set Book Extract', group: 'English' },
  { value: 'article', label: 'Article / News Passage', group: 'English' },
  // Fasihi ya Kiswahili
  { value: 'mashairi', label: '🇰🇪 Mashairi', group: 'Fasihi' },
  { value: 'hadithi', label: '🇰🇪 Hadithi / Prose', group: 'Fasihi' },
  { value: 'tamthilia', label: '🇰🇪 Tamthilia (Dondoo)', group: 'Fasihi' },
  { value: 'riwaya', label: '🇰🇪 Riwaya (Dondoo)', group: 'Fasihi' },
  { value: 'dondoo', label: '🇰🇪 Dondoo la Fasihi', group: 'Fasihi' },
  { value: 'methali', label: '🇰🇪 Methali', group: 'Fasihi' },
  { value: 'nahau', label: '🇰🇪 Nahau', group: 'Fasihi' },
  { value: 'vitendawili', label: '🇰🇪 Vitendawili', group: 'Fasihi' },
  { value: 'semi', label: '🇰🇪 Semi', group: 'Fasihi' },
  { value: 'mazungumzo', label: '🇰🇪 Mazungumzo (Kiswahili)', group: 'Fasihi' },
  // Kiswahili Ufahamu
  { value: 'kifungu', label: '🇰🇪 Kifungu (Ufahamu)', group: 'Kiswahili' },
  { value: 'barua_kifungu', label: '🇰🇪 Barua (Ufahamu)', group: 'Kiswahili' },
  { value: 'ripoti_kifungu', label: '🇰🇪 Ripoti (Ufahamu)', group: 'Kiswahili' },
  { value: 'hotuba_kifungu', label: '🇰🇪 Hotuba (Ufahamu)', group: 'Kiswahili' },
  { value: 'tangazo_kifungu', label: '🇰🇪 Tangazo (Ufahamu)', group: 'Kiswahili' },
  // Visual / Data
  { value: 'table', label: '📊 Table / Jedwali', group: 'Visual' },
  { value: 'image', label: '🖼 Image / Diagram / Graph / Map', group: 'Visual' },
  { value: 'chart', label: '📈 Chart / Graph', group: 'Visual' },
  { value: 'cartoon', label: '🎨 Political Cartoon / Poster', group: 'Visual' },
  { value: 'timeline', label: '📅 Timeline', group: 'Visual' },
  { value: 'flowchart', label: '🔀 Flowchart / Diagram', group: 'Visual' },
  { value: 'advertisement', label: '📢 Advertisement / Notice', group: 'Visual' },
  { value: 'custom', label: 'Custom', group: 'Other' },
]

const PASSAGE_TYPE_GROUPS = PASSAGE_TYPES.reduce((acc, pt) => {
  if (!acc[pt.group]) acc[pt.group] = []
  acc[pt.group].push(pt)
  return acc
}, {} as Record<string, typeof PASSAGE_TYPES>)

const FUNCTIONAL_WRITING_TYPES = [
  // English
  { value: 'free', label: 'Free Composition / Essay', lang: 'en' },
  { value: 'essay', label: 'Structured Essay', lang: 'en' },
  { value: 'letter', label: 'Formal Letter', lang: 'en' },
  { value: 'report', label: 'Report', lang: 'en' },
  { value: 'speech', label: 'Speech', lang: 'en' },
  { value: 'memo', label: 'Memorandum', lang: 'en' },
  { value: 'minutes', label: 'Minutes of a Meeting', lang: 'en' },
  { value: 'diary', label: 'Diary Entry', lang: 'en' },
  { value: 'notice', label: 'Notice', lang: 'en' },
  { value: 'article', label: 'Newspaper Article', lang: 'en' },
  { value: 'summary', label: 'Summary / Precis', lang: 'en' },
  // Kiswahili
  { value: 'barua_rasmi', label: '🇰🇪 Barua Rasmi', lang: 'sw' },
  { value: 'barua_binafsi', label: '🇰🇪 Barua Binafsi', lang: 'sw' },
  { value: 'ripoti', label: '🇰🇪 Ripoti', lang: 'sw' },
  { value: 'hotuba', label: '🇰🇪 Hotuba', lang: 'sw' },
  { value: 'tangazo', label: '🇰🇪 Tangazo', lang: 'sw' },
  { value: 'kumbukumbu', label: '🇰🇪 Kumbukumbu za Mkutano', lang: 'sw' },
  { value: 'wasifu', label: '🇰🇪 Wasifu / CV', lang: 'sw' },
  { value: 'insha_hoja', label: '🇰🇪 Insha ya Hoja', lang: 'sw' },
  { value: 'insha_masimulizi', label: '🇰🇪 Insha ya Masimulizi', lang: 'sw' },
  { value: 'insha_maelezo', label: '🇰🇪 Insha ya Maelezo', lang: 'sw' },
  { value: 'mdahalo', label: '🇰🇪 Mdahalo (Debate)', lang: 'sw' },
  { value: 'notisi', label: '🇰🇪 Notisi', lang: 'sw' },
]

const IMAGE_SUBTYPES = [
  'Map / Ramani', 'Poster / Bango', 'Advertisement / Tangazo', 'Graph / Grafu',
  'Diagram / Mchoro', 'Chart / Chati', 'Timeline / Mtiririko wa Wakati',
  'Flowchart', 'Political Cartoon / Katuni', 'Photograph / Picha', 'Other / Nyingine'
]

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface Passage {
  id: string
  title: string
  content: string
  passage_type: string
  set_book_id: string
  set_book_custom_title: string
  image_url: string
  image_subtype: string
  allow_search: boolean
  order_index: number
  isExpanded: boolean
}

interface Question {
  id: string
  type: QuestionType
  content: string
  options: string[]
  correct_answer: string
  marks: number
  topic_tags: string
  passage_id: string
  depth: number // 0=top, 1=sub, 2=sub-sub etc
  parent_id: string // '' = top-level
  functional_writing_type: string
  word_limit: string
  isExpanded: boolean
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function ExamBuilder() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    duration_minutes: 60,
    pass_mark: 50,
    random_order: false,
    language: 'en' as 'en' | 'sw' | 'mixed',
  })

  const [passages, setPassages] = useState<Passage[]>([])
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: generateId(), type: 'short_answer', content: '',
      options: [], correct_answer: '', marks: 1, topic_tags: '',
      passage_id: '', depth: 0, parent_id: '',
      functional_writing_type: 'free', word_limit: '', isExpanded: true
    }
  ])

  useEffect(() => { loadSubjects() }, [])

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name')
    if (data) setSubjects(data)
  }

  // ─── Auto-generate KCSE question numbers ─────────────────────────────────
  const getQuestionNumber = useCallback((q: Question, allQuestions: Question[]): string => {
    // Find path of depths from root
    const path: number[] = []
    
    // Determine position at each depth level
    const questionsUpToThis = allQuestions.slice(0, allQuestions.findIndex(x => x.id === q.id) + 1)
    
    // Count siblings at same depth
    let countAtDepth = 0
    for (const prev of questionsUpToThis) {
      if (prev.depth === q.depth) countAtDepth++
    }
    
    // Build path from depth 0 down to q.depth
    if (q.depth === 0) {
      path.push(countAtDepth)
    } else {
      // Find parent counts
      let parentNum = 0
      let lastDepthCount = 0
      for (const prev of questionsUpToThis) {
        if (prev.depth === q.depth - 1) parentNum++
        if (prev.depth === q.depth) lastDepthCount++
      }
      // Simplified: just use depth+counter for now
      for (let d = 0; d <= q.depth; d++) {
        const countAtD = questionsUpToThis.filter(x => x.depth === d).length
        path.push(countAtD > 0 ? countAtD : 1)
      }
    }

    return generateQuestionNumber(path)
  }, [])

  // ─── Passage handlers ─────────────────────────────────────────────────────
  const addPassage = () => {
    setPassages(prev => [...prev, {
      id: generateId(), title: '', content: '', passage_type: 'prose',
      set_book_id: '', set_book_custom_title: '', image_url: '',
      image_subtype: IMAGE_SUBTYPES[0], allow_search: false,
      order_index: prev.length, isExpanded: true
    }])
  }

  const removePassage = (id: string) => {
    setPassages(p => p.filter(x => x.id !== id))
    setQuestions(q => q.map(x => x.passage_id === id ? { ...x, passage_id: '' } : x))
  }

  const updatePassage = (id: string, field: keyof Passage, value: any) => {
    setPassages(p => p.map(x => x.id === id ? { ...x, [field]: value } : x))
  }

  const handleImageUpload = async (passageId: string, file: File) => {
    setImageUploading(passageId)
    try {
      const ext = file.name.split('.').pop()
      const path = `exam-passages/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('quiz-media').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('quiz-media').getPublicUrl(path)
      updatePassage(passageId, 'image_url', publicUrl)
      toast.success('Image uploaded!')
    } catch (e: any) {
      toast.error(e.message || 'Image upload failed')
    } finally {
      setImageUploading(null)
    }
  }

  // ─── Question handlers ────────────────────────────────────────────────────
  const addQuestion = (type: QuestionType = 'short_answer', depth = 0) => {
    setQuestions(prev => [...prev, {
      id: generateId(), type, content: '',
      options: type === 'mcq' ? ['', '', '', ''] : [],
      correct_answer: '', marks: 1, topic_tags: '', passage_id: '',
      depth, parent_id: '',
      functional_writing_type: 'free', word_limit: '', isExpanded: true
    }])
  }

  const removeQuestion = (id: string) => {
    if (questions.length === 1) return toast.error('You need at least one question')
    setQuestions(q => q.filter(x => x.id !== id))
  }

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(q => q.map(x => x.id === id ? { ...x, [field]: value } : x))
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async (status: 'draft' | 'published') => {
    if (!form.title) return toast.error('Please enter an exam title')
    if (!form.subject_id) return toast.error('Please select a subject')
    for (const [i, q] of questions.entries()) {
      if (!q.content.trim()) return toast.error(`Question ${i + 1} is empty`)
    }

    setLoading(true)
    try {
      const exam = await createExam({ ...form, status })
      const passageIdMap: Record<string, string> = {}

      for (const [i, p] of passages.entries()) {
        const { data: saved, error } = await supabase
          .from('exam_passages')
          .insert({
            exam_id: exam.id,
            title: p.title || `Passage ${i + 1}`,
            content: p.content,
            passage_type: p.passage_type,
            allow_search: p.allow_search,
            image_url: p.image_url || null,
            image_subtype: p.image_subtype || null,
            set_book_id: p.set_book_id || null,
            order_index: i,
          })
          .select().single()
        if (error) throw error
        passageIdMap[p.id] = saved.id
      }

      for (const [i, q] of questions.entries()) {
        await addExamQuestion(exam.id, {
          question_type: q.type,
          content: q.content,
          options: q.type === 'mcq' ? q.options : null,
          correct_answer: q.correct_answer,
          marks: q.marks,
          topic_tags: q.topic_tags.split(',').map(t => t.trim()).filter(Boolean),
          order_index: i,
          passage_id: q.passage_id ? (passageIdMap[q.passage_id] || null) : null,
          question_number: getQuestionNumber(q, questions),
          functional_writing_type: q.type === 'essay' ? q.functional_writing_type : null,
          word_limit: q.word_limit ? parseInt(q.word_limit) : null,
        })
      }

      toast.success(status === 'published' ? '✅ Exam Published!' : 'Draft saved!')
      router.push('/teacher/exam-desk')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save exam')
    } finally {
      setLoading(false)
    }
  }

  const totalMarks = questions.reduce((acc, q) => acc + (parseFloat(String(q.marks)) || 0), 0)
  const setBookGroups = getSetBookGroups()

  const isVisualPassage = (type: string) => ['image', 'chart', 'cartoon', 'timeline', 'flowchart', 'advertisement'].includes(type)
  const isFasihiMashairi = (type: string) => ['mashairi', 'poem'].includes(type)

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-32">

      {/* ─── Exam Settings ───────────────────────────────────────────────── */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Exam Settings</h2>
            <p className="text-sm text-muted">Configure the paper details / Weka maelezo ya karatasi.</p>
          </div>
          <span className="text-sm font-bold text-muted bg-[var(--input)] px-3 py-1.5 rounded-xl">
            Jumla: <span className="text-indigo-500 font-black">{totalMarks} marks</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <Input label="Exam Title / Kichwa cha Mtihani"
              placeholder="e.g., Form 4 English Paper 2 | Kiswahili Karatasi ya 2"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <Select label="Language / Lugha" value={form.language}
            onChange={e => setForm({ ...form, language: e.target.value as any })}>
            <option value="en">🇬🇧 English</option>
            <option value="sw">🇰🇪 Kiswahili</option>
            <option value="mixed">🌍 Mixed / Mchanganyiko</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Select label="Subject / Somo" value={form.subject_id}
            onChange={e => setForm({ ...form, subject_id: e.target.value })} required>
            <option value="">Select a subject…</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Textarea label="Instructions / Maelekezo"
            placeholder="e.g., Answer ALL questions. Jibu maswali YOTE..."
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <Input type="number" label="Duration / Muda (mins)" value={form.duration_minutes}
            onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} min={1} />
          <Input type="number" label="Pass Mark / Alama ya Kufaulu (%)" value={form.pass_mark}
            onChange={e => setForm({ ...form, pass_mark: parseInt(e.target.value) || 0 })} min={0} max={100} />
          <div className="flex items-center gap-3 mt-7 col-span-2">
            <input type="checkbox" id="random_order" checked={form.random_order}
              onChange={e => setForm({ ...form, random_order: e.target.checked })} className="w-5 h-5 rounded" />
            <label htmlFor="random_order" className="text-sm font-bold cursor-pointer">Randomize Order / Panga Nasibu</label>
          </div>
        </div>
      </Card>

      {/* ─── Passages ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-[var(--card)] p-4 rounded-3xl border border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><BookOpen size={18} /></div>
            <div>
              <h3 className="font-black">Passages, Poems & Stimulus Material</h3>
              <p className="text-xs text-muted">Vifungu, Mashairi, Picha, Jedwali, Dondoo za Vitabu</p>
            </div>
          </div>
          <Button variant="ghost" onClick={addPassage} className="text-emerald-500 hover:bg-emerald-500/10">
            <Plus size={16} className="mr-2" /> Add Passage / Ongeza Kifungu
          </Button>
        </div>

        {passages.map((passage, idx) => {
          const isVisual = isVisualPassage(passage.passage_type)
          const isMashairi = isFasihiMashairi(passage.passage_type)

          return (
            <Card key={passage.id} className="border-l-4 border-l-emerald-500 p-5 space-y-4">
              <div className="flex items-center justify-between cursor-pointer"
                onClick={() => updatePassage(passage.id, 'isExpanded', !passage.isExpanded)}>
                <div className="flex items-center gap-3">
                  <Badge variant="primary" className="bg-emerald-500/10 text-emerald-500 shrink-0">
                    {isVisual ? <ImageIcon size={12} className="mr-1 inline" /> : <BookOpen size={12} className="mr-1 inline" />}
                    Passage {idx + 1}
                  </Badge>
                  <span className="text-sm font-bold text-muted truncate max-w-sm">
                    {passage.title || passage.passage_type}
                  </span>
                  {isMashairi && <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">Line Numbers</span>}
                </div>
                <div className="flex items-center gap-2">
                  {passage.isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); removePassage(passage.id) }}
                    className="text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></Button>
                </div>
              </div>

              {passage.isExpanded && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-4 border-t border-[var(--card-border)]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Passage Title / Kichwa"
                      placeholder="e.g., Read the poem below / Soma kifungu kifuatacho"
                      value={passage.title} onChange={e => updatePassage(passage.id, 'title', e.target.value)} />

                    {/* Passage type — grouped select */}
                    <div>
                      <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text)' }}>
                        Passage Type / Aina ya Kifungu
                      </label>
                      <select
                        value={passage.passage_type}
                        onChange={e => updatePassage(passage.id, 'passage_type', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--input)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {Object.entries(PASSAGE_TYPE_GROUPS).map(([group, types]) => (
                          <optgroup key={group} label={group}>
                            {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 mt-6">
                      <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                        <input type="checkbox" checked={passage.allow_search}
                          onChange={e => updatePassage(passage.id, 'allow_search', e.target.checked)} className="w-4 h-4 rounded" />
                        Allow Ctrl+F Search
                      </label>
                    </div>
                  </div>

                  {/* Set book selector */}
                  {passage.passage_type === 'set_book' || passage.passage_type === 'dondoo' ||
                    ['tamthilia', 'riwaya'].includes(passage.passage_type) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                      <div>
                        <label className="block text-sm font-bold mb-1.5">
                          <BookMarked size={14} className="inline mr-1 text-purple-500" />
                          Set Book / Kitabu
                        </label>
                        <select
                          value={passage.set_book_id}
                          onChange={e => updatePassage(passage.id, 'set_book_id', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--input)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select a set book…</option>
                          {Object.entries(setBookGroups).map(([subj, books]) => (
                            <optgroup key={subj} label={SET_BOOK_SUBJECTS[subj] || subj}>
                              {books.map(b => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      {passage.set_book_id === 'custom' && (
                        <Input label="Custom Book Title / Jina la Kitabu"
                          placeholder="Type book title here…"
                          value={passage.set_book_custom_title}
                          onChange={e => updatePassage(passage.id, 'set_book_custom_title', e.target.value)} />
                      )}
                    </div>
                  ) : null}

                  {/* Image upload for visual passages */}
                  {isVisual && (
                    <div className="space-y-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Image Type / Aina ya Picha" value={passage.image_subtype}
                          onChange={e => updatePassage(passage.id, 'image_subtype', e.target.value)}>
                          {IMAGE_SUBTYPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <div>
                          <label className="block text-sm font-bold mb-1.5">
                            <ImageIcon size={14} className="inline mr-1 text-amber-500" />
                            Upload Image / Pakia Picha
                          </label>
                          <input type="file" accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(passage.id, file)
                            }}
                            className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-amber-500/10 file:text-amber-500 hover:file:bg-amber-500/20 cursor-pointer"
                          />
                        </div>
                      </div>
                      {passage.image_url && (
                        <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--input)] p-2">
                          <img src={passage.image_url} alt="Passage image" className="max-h-64 w-auto mx-auto rounded-xl object-contain" />
                          <p className="text-xs text-center text-muted mt-2 font-bold">{passage.image_subtype}</p>
                        </div>
                      )}
                      {imageUploading === passage.id && (
                        <div className="flex items-center gap-2 text-sm text-amber-500 font-bold">
                          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          Uploading image…
                        </div>
                      )}
                      <Textarea
                        label="Caption / Context (optional)"
                        placeholder="e.g., Study the graph below and answer questions 11–14."
                        value={passage.content}
                        onChange={e => updatePassage(passage.id, 'content', e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Text content for non-visual passages */}
                  {!isVisual && (
                    <div>
                      <Textarea
                        label={isMashairi
                          ? '📜 Shairi / Poem — Each line on a new line; blank line between stanzas'
                          : '📄 Passage Content / Yaliyomo ya Kifungu'
                        }
                        placeholder={isMashairi
                          ? 'Weka mshororo mmoja kwa kila mstari.\nAcha mstari mtupu kati ya beti.\n\nStudents will see line numbers automatically.'
                          : 'Paste the passage here.\n\nEach paragraph separated by a blank line will be numbered [1], [2], [3]...'
                        }
                        value={passage.content}
                        onChange={e => updatePassage(passage.id, 'content', e.target.value)}
                        rows={12}
                        className="font-serif text-base leading-8"
                      />
                      <p className="text-xs text-muted mt-2">
                        {isMashairi
                          ? '💡 Mashairi: Each line is numbered. Questions can say "Rejelea mstari wa 8…" and students jump directly there.'
                          : '💡 Paragraphs are numbered automatically. Questions can say "Refer to paragraph 3" and students jump directly there.'
                        }
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </Card>
          )
        })}
      </div>

      {/* ─── Questions ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-[var(--card)] p-4 rounded-3xl border border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl"><FileText size={18} /></div>
            <div>
              <h3 className="font-black">Questions / Maswali ({questions.length})</h3>
              <p className="text-xs text-muted">Auto KCSE numbering: 1 → 1(a) → 1(a)(i) → 1(a)(i)(I)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setQuestions(q => q.map(x => ({ ...x, isExpanded: false })))} className="text-muted text-xs">Collapse All</Button>
            <Button variant="ghost" size="sm" onClick={() => setQuestions(q => q.map(x => ({ ...x, isExpanded: true })))} className="text-muted text-xs">Expand All</Button>
          </div>
        </div>

        {questions.map((q, index) => {
          const qNum = getQuestionNumber(q, questions)
          return (
            <Card key={q.id} className={`p-5 border-l-4 transition-all ${q.depth === 0 ? 'border-l-indigo-500' : q.depth === 1 ? 'border-l-violet-400 ml-4' : 'border-l-purple-300 ml-8'}`}>
              <div className="flex items-center justify-between cursor-pointer"
                onClick={e => {
                  if ((e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT|BUTTON/)) return
                  updateQuestion(q.id, 'isExpanded', !q.isExpanded)
                }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Badge className="bg-indigo-500/10 text-indigo-500 font-black shrink-0">{qNum}</Badge>
                  {q.passage_id && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                      P{passages.findIndex(p => p.id === q.passage_id) + 1}
                    </span>
                  )}
                  {!q.isExpanded && (
                    <span className="text-sm font-medium text-muted truncate max-w-xs">
                      {q.content || 'Empty question'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-muted">{q.marks}m</span>
                  <Button variant="ghost" size="sm"
                    onClick={e => { e.stopPropagation(); updateQuestion(q.id, 'isExpanded', !q.isExpanded) }}
                    className="text-indigo-500">
                    {q.isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                  <Button variant="ghost" size="sm"
                    onClick={e => { e.stopPropagation(); removeQuestion(q.id) }}
                    className="text-red-500 hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {q.isExpanded && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-4 mt-3 border-t border-[var(--card-border)]">
                  {/* Row 1: type, depth, marks, passage */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Select label="Question Type / Aina" value={q.type}
                      onChange={e => updateQuestion(q.id, 'type', e.target.value as QuestionType)}>
                      <option value="short_answer">Short Answer / Jibu Fupi</option>
                      <option value="essay">Essay / Writing / Uandishi</option>
                      <option value="mcq">Multiple Choice / Chaguo</option>
                      <option value="true_false">True / False / Kweli / Uwongo</option>
                      <option value="math_working">Math Working (Canvas)</option>
                      <option value="fill_in_blank">Fill in the Blank / Jaza Pengo</option>
                    </Select>

                    {/* Depth / numbering level */}
                    <Select label="Level / Kiwango" value={q.depth}
                      onChange={e => updateQuestion(q.id, 'depth', parseInt(e.target.value))}>
                      {DEPTH_LABELS.map(d => (
                        <option key={d.depth} value={d.depth}>
                          {d.example} ({d.label})
                        </option>
                      ))}
                    </Select>

                    <Input type="number" label="Marks / Alama" value={q.marks} min={0.5} step={0.5}
                      onChange={e => updateQuestion(q.id, 'marks', parseFloat(e.target.value) || 1)} />

                    <Select label="Link to Passage / Kifungu" value={q.passage_id}
                      onChange={e => updateQuestion(q.id, 'passage_id', e.target.value)}>
                      <option value="">No passage / Bila kifungu</option>
                      {passages.map((p, i) => (
                        <option key={p.id} value={p.id}>
                          {`Passage ${i + 1}: ${p.title || p.passage_type}`}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Essay/writing subtype */}
                  {q.type === 'essay' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                      <div>
                        <label className="block text-sm font-bold mb-1.5">Writing Type / Aina ya Uandishi</label>
                        <select value={q.functional_writing_type}
                          onChange={e => updateQuestion(q.id, 'functional_writing_type', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--input)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500">
                          <optgroup label="🇬🇧 English">
                            {FUNCTIONAL_WRITING_TYPES.filter(t => t.lang === 'en').map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="🇰🇪 Kiswahili">
                            {FUNCTIONAL_WRITING_TYPES.filter(t => t.lang === 'sw').map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      <div className="flex gap-4">
                        <Input type="number" label="Word Limit / Kikomo cha Maneno" placeholder="e.g. 350"
                          value={q.word_limit}
                          onChange={e => updateQuestion(q.id, 'word_limit', e.target.value)} />
                      </div>
                      <div className="md:col-span-2 text-xs text-rose-500 font-bold">
                        💡 The correct writing template will auto-load for students — Muundo sahihi utajaza moja kwa moja.
                      </div>
                    </div>
                  )}

                  {/* Question text */}
                  <div>
                    <Textarea
                      label="Question / Swali (Supports LaTeX: $x^2$, supports Kiswahili Unicode)"
                      value={q.content}
                      onChange={e => updateQuestion(q.id, 'content', e.target.value)}
                      placeholder="Enter question here / Andika swali hapa…"
                      rows={3}
                    />
                    {q.content.includes('$') && (
                      <div className="mt-2 p-3 bg-[var(--input)] rounded-xl border border-[var(--card-border)] text-sm">
                        <LatexRenderer text={q.content} />
                      </div>
                    )}
                  </div>

                  {/* MCQ options */}
                  {q.type === 'mcq' && (
                    <div className="space-y-2 bg-[var(--input)] p-4 rounded-2xl border border-[var(--card-border)]">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Options / Machaguo — click radio to mark correct</p>
                      {['A', 'B', 'C', 'D', 'E'].map((letter, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <span className="w-6 h-6 flex items-center justify-center text-xs font-black text-muted shrink-0">{letter}</span>
                          <input type="radio" name={`correct_${q.id}`}
                            checked={q.correct_answer === q.options[oIndex] && !!q.options[oIndex]}
                            onChange={() => updateQuestion(q.id, 'correct_answer', q.options[oIndex])}
                            className="w-4 h-4 text-indigo-500 shrink-0" />
                          <Input placeholder={`Option ${letter}`} value={q.options[oIndex] || ''}
                            onChange={e => {
                              const newOpts = [...(q.options.length >= 5 ? q.options : [...q.options, '', ''])]
                              newOpts[oIndex] = e.target.value
                              updateQuestion(q.id, 'options', newOpts)
                              if (q.correct_answer === q.options[oIndex]) updateQuestion(q.id, 'correct_answer', e.target.value)
                            }}
                            className="flex-1 !mt-0" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* True/False */}
                  {q.type === 'true_false' && (
                    <Input label="Correct Answer / Jibu Sahihi (True / False / Kweli / Uwongo)"
                      value={q.correct_answer}
                      onChange={e => updateQuestion(q.id, 'correct_answer', e.target.value)} />
                  )}

                  {/* Short answer key */}
                  {(q.type === 'short_answer' || q.type === 'fill_in_blank') && (
                    <Input label="Expected Answer / Mark Scheme"
                      placeholder="e.g. Mwandishi anaonesha huzuni… / photosynthesis; chloroplast"
                      value={q.correct_answer}
                      onChange={e => updateQuestion(q.id, 'correct_answer', e.target.value)} />
                  )}

                  {/* Tags */}
                  <Input label="Topic Tags / Mada (comma separated)"
                    placeholder="e.g., Comprehension, Ufahamu, Set Book, Fasihi"
                    value={q.topic_tags}
                    onChange={e => updateQuestion(q.id, 'topic_tags', e.target.value)} />
                </motion.div>
              )}
            </Card>
          )
        })}

        {/* Add question buttons */}
        <div className="p-4 bg-[var(--card)] rounded-3xl border border-dashed border-[var(--card-border)] space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted">Add Question / Ongeza Swali</p>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'short_answer', label: '+ Short Answer', depth: 0 },
              { type: 'essay', label: '+ Essay / Insha / Uandishi', depth: 0 },
              { type: 'mcq', label: '+ MCQ / Chaguo', depth: 0 },
              { type: 'true_false', label: '+ True / False', depth: 0 },
              { type: 'math_working', label: '+ Math / Science', depth: 0 },
              { type: 'fill_in_blank', label: '+ Fill in Blank / Jaza Pengo', depth: 0 },
            ].map(({ type, label, depth }) => (
              <Button key={type} variant="ghost" size="sm"
                onClick={() => addQuestion(type as QuestionType, depth)}
                className="text-indigo-500 hover:bg-indigo-500/10 border border-indigo-500/20">
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-3">
            <p className="w-full text-[10px] font-bold text-muted uppercase">Add Sub-Question (indented):</p>
            {[1, 2, 3].map(depth => (
              <Button key={depth} variant="ghost" size="sm"
                onClick={() => addQuestion('short_answer', depth)}
                className="text-violet-500 hover:bg-violet-500/10 border border-violet-500/20 text-xs">
                {['+ (a)(b)(c)', '+ (i)(ii)(iii)', '+ (I)(II)(III)'][depth - 1]} Level {depth + 1}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Bottom bar ──────────────────────────────────────────────────── */}
      <div className="sticky bottom-24 md:bottom-8 bg-[var(--card)] p-4 rounded-3xl border border-[var(--card-border)] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm font-bold text-muted">
          {questions.length} swali · {passages.length} kifungu · <span className="text-indigo-500 font-black">{totalMarks} marks</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="secondary" onClick={() => handleSave('draft')} disabled={loading} className="flex-1 sm:flex-none">
            Save Draft / Hifadhi
          </Button>
          <Button variant="primary" onClick={() => handleSave('published')} disabled={loading}
            className="flex-1 sm:flex-none bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20">
            <Save size={16} className="mr-2" /> Publish / Chapisha
          </Button>
        </div>
      </div>
    </div>
  )
}
