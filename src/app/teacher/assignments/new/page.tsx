'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Plus, Eye, EyeOff, Save, Send, ArrowLeft, Settings2,
  BookOpen, Clock, LayoutTemplate, Sparkles, ChevronDown
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'
import { WorksheetPreview } from '@/components/worksheet/WorksheetPreview'
import { QuestionBlock, createBlock } from '@/components/worksheet/QuestionBlock'
import { QuestionTypeSheet } from '@/components/worksheet/QuestionTypeSheet'
import toast from 'react-hot-toast'
import type { WorksheetBlock, QuestionType } from '@/types/database'
import Link from 'next/link'

export default function NewWorksheetPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()

  // Metadata
  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [passage, setPassage] = useState('')
  const [passageType, setPassageType] = useState<'none' | 'passage' | 'poem' | 'diagram'>('none')
  const [showTimer, setShowTimer] = useState(false)
  const [timeLimit, setTimeLimit] = useState(60)
  const [shuffleQ, setShuffleQ] = useState(false)

  // Block state
  const [blocks, setBlocks] = useState<WorksheetBlock[]>([])

  // UI state
  const [typeSheetOpen, setTypeSheetOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showPreviewPanel, setShowPreviewPanel] = useState(true)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string; class_id: string }[]>([])

  useEffect(() => { loadMeta() }, [])

  const loadMeta = async () => {
    if (!profile?.id) return

    // Ensure teacher record is loaded
    let currentTeacherId = teacher?.id
    if (!currentTeacherId) {
      const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', profile.id).single()
      currentTeacherId = tData?.id
    }

    if (!currentTeacherId) {
      console.error('[NewAssignment] Teacher record not found')
      return
    }

    // Fetch teacher's assigned subjects and classes from teaching map
    const [mapRes, tRes] = await Promise.all([
      supabase
        .from('teacher_teaching_map')
        .select(`
          class_id,
          subject_id,
          classes (id, name),
          subjects (id, name, class_id)
        `)
        .eq('teacher_id', currentTeacherId),
      supabase.from('worksheet_templates_v3').select('*').order('created_at', { ascending: false })
    ])

    if (mapRes.error) {
      console.error('[NewAssignment] Map fetch error:', mapRes.error)
      toast.error('Failed to load your assigned subjects')
      return
    }

    // Extract unique classes from the map
    const mappedClasses = Array.from(new Set((mapRes.data || [])
      .flatMap(m => m.classes)
      .filter(Boolean)
      .map(c => JSON.stringify(c))))
      .map(s => JSON.parse(s as string))

    // Extract unique subjects from the map
    const mappedSubjects = Array.from(new Set((mapRes.data || [])
      .flatMap(m => {
        const subjs = Array.isArray(m.subjects) ? m.subjects : [m.subjects];
        return subjs.filter(Boolean).map(s => ({
          ...s,
          class_id: m.class_id // Link subject to the class assigned in the mapping table
        }));
      })
      .map(s => JSON.stringify(s))))
      .map(s => JSON.parse(s as string))

    setClasses(mappedClasses)
    setSubjects(mappedSubjects)
    setTemplates(tRes.data ?? [])
  }

  const filteredSubjects = subjects.filter(s => s.class_id === classId)

  const totalMarks = useMemo(
    () => blocks.reduce((sum, b) => sum + (b.marks || 0), 0),
    [blocks]
  )

  const addBlock = (type: QuestionType) => {
    setBlocks(prev => [...prev, createBlock(type)])
  }

  const updateBlock = (index: number, updated: WorksheetBlock) => {
    setBlocks(prev => prev.map((b, i) => (i === index ? updated : b)))
  }

  const deleteBlock = (index: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== index))
  }

  const loadTemplate = (template: any) => {
    setTitle(template.title)
    setBlocks(template.blocks || [])
    setTemplatesOpen(false)
    toast.success('Template loaded!')
  }

  const save = async (status: 'draft' | 'published') => {
    if (!title.trim()) { toast.error('Please enter a worksheet title'); return }
    if (!classId) { toast.error('Please select a class'); return }
    if (!subjectId) { toast.error('Please select a subject'); return }
    if (blocks.length === 0) { toast.error('Add at least one question'); return }

    setSaving(true)
    const { error } = await supabase.from('assignments').insert({
      title,
      class_id: classId,
      subject_id: subjectId,
      due_date: dueDate || null,
      status,
      teacher_id: teacher?.id,
      // Worksheet fields stored in JSONB
      worksheet: blocks,
      passage: passage || null,
      passage_type: passageType,
      total_marks: totalMarks,
      shuffle_questions: shuffleQ,
      show_timer: showTimer,
      time_limit: showTimer ? timeLimit : null,
      max_marks: totalMarks,
      // Required fields
      content: JSON.stringify(blocks), // backward compat
      audience: 'class',
    })

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success(status === 'published' ? '🎉 Worksheet published!' : '✅ Draft saved!')
      router.push('/teacher/assignments')
    }
    setSaving(false)
  }

  const selectedClass = classes.find(c => c.id === classId)
  const selectedSubject = subjects.find(s => s.id === subjectId)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top Bar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-6 py-3"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/teacher/assignments">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div className="min-w-0">
            <div className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{title || 'New Worksheet'}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {blocks.length} question{blocks.length !== 1 ? 's' : ''} · {totalMarks} marks total
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTemplatesOpen(true)}
            className="hidden sm:flex"
          >
            <LayoutTemplate size={14} className="mr-1.5" /> Templates
          </Button>
          <button
            onClick={() => setShowPreviewPanel(p => !p)}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: showPreviewPanel ? 'var(--primary-dim)' : 'var(--input)', color: showPreviewPanel ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            {showPreviewPanel ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreviewPanel ? 'Hide Preview' : 'Show Preview'}
          </button>
          <Button size="sm" variant="secondary" onClick={() => setPreviewOpen(true)}>
            <Eye size={14} /> <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button size="sm" variant="secondary" isLoading={saving} onClick={() => save('draft')}>
            <Save size={14} /> <span className="hidden sm:inline">Draft</span>
          </Button>
          <Button size="sm" isLoading={saving} onClick={() => save('published')}>
            <Send size={14} /> <span className="hidden sm:inline">Publish</span>
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className={`flex-1 flex ${showPreviewPanel ? 'md:grid md:grid-cols-2' : ''} divide-x divide-[var(--card-border)] overflow-hidden`}>

        {/* Left: Editor */}
        <div className="flex-1 overflow-y-auto pb-32 md:pb-8">
          {/* Metadata */}
          <div className="p-4 md:p-6 space-y-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Worksheet Details</h2>
            <Input
              label="Worksheet Title"
              placeholder="e.g. Form 2 Mathematics — Term 2 Revision"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Class" value={classId} onChange={e => { setClassId(e.target.value); setSubjectId('') }}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label="Subject" value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId}>
                <option value="">Select Subject</option>
                {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Due Date" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="timer" checked={showTimer} onChange={e => setShowTimer(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="timer" className="text-sm font-medium" style={{ color: 'var(--text)' }}>Enable Timer</label>
                {showTimer && (
                  <input type="number" min={5} max={300} value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))}
                    className="w-16 rounded-lg px-2 py-1 text-sm text-center" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                  />
                )}
              </div>
            </div>

            {/* Passage toggle */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Reading Passage / Poem (Optional)</label>
              <div className="flex gap-2 mb-3">
                {(['none', 'passage', 'poem'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setPassageType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                    style={{ background: passageType === t ? 'var(--primary)' : 'var(--input)', color: passageType === t ? 'white' : 'var(--text-muted)' }}
                  >{t === 'none' ? 'None' : t}</button>
                ))}
              </div>
              {passageType !== 'none' && (
                <textarea
                  className="w-full rounded-xl p-3 text-sm resize-none"
                  style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                  rows={5}
                  value={passage}
                  onChange={e => setPassage(e.target.value)}
                  placeholder={passageType === 'poem' ? 'Paste your poem here...' : 'Paste your passage / text here...'}
                />
              )}
            </div>
          </div>

          {/* Questions */}
          <div className="p-4 md:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Questions ({blocks.length})
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                  {totalMarks} marks
                </span>
                <button
                  type="button"
                  onClick={() => setShuffleQ(s => !s)}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: shuffleQ ? 'var(--primary-dim)' : 'var(--input)', color: shuffleQ ? 'var(--primary)' : 'var(--text-muted)' }}
                >
                  Shuffle
                </button>
              </div>
            </div>

            {blocks.length === 0 && (
              <div className="py-16 text-center rounded-2xl" style={{ border: '2px dashed var(--card-border)' }}>
                <div className="text-4xl mb-3">📋</div>
                <p className="font-bold" style={{ color: 'var(--text)' }}>No questions yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Tap the + button below to add your first question</p>
              </div>
            )}

            <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-3">
              {blocks.map((block, index) => (
                <Reorder.Item key={block.id} value={block}>
                  <QuestionBlock
                    block={block}
                    index={index}
                    onChange={updated => updateBlock(index, updated)}
                    onDelete={() => deleteBlock(index)}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>

            {/* Desktop: inline add button */}
            <button
              type="button"
              onClick={() => setTypeSheetOpen(true)}
              className="hidden md:flex w-full items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01]"
              style={{ border: '2px dashed var(--card-border)', color: 'var(--primary)', background: 'var(--primary-dim)' }}
            >
              <Plus size={18} /> Add Question
            </button>
          </div>
        </div>

        {/* Right: Live Preview (desktop only) */}
        {showPreviewPanel && (
          <div className="hidden md:flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
            <div className="px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }}>
              <span>Live Preview</span>
              <span className="normal-case font-normal">A4 format</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <WorksheetPreview
                title={title}
                subject={selectedSubject?.name}
                class_name={selectedClass?.name}
                blocks={blocks}
                passage={passage}
                passage_type={passageType}
                total_marks={totalMarks}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <motion.button
        type="button"
        onClick={() => setTypeSheetOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="md:hidden fixed bottom-28 right-5 z-30 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{ background: 'var(--primary)', color: 'white' }}
      >
        <Plus size={24} />
      </motion.button>

      {/* Question Type Bottom Sheet */}
      <QuestionTypeSheet
        isOpen={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        onSelect={addBlock}
      />

      {/* Full-screen preview modal (mobile) */}
      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Worksheet Preview" size="lg">
        <div style={{ maxHeight: '80vh', overflow: 'auto' }}>
          <WorksheetPreview
            title={title}
            subject={selectedSubject?.name}
            class_name={selectedClass?.name}
            blocks={blocks}
            passage={passage}
            passage_type={passageType}
            total_marks={totalMarks}
          />
        </div>
      </Modal>

      {/* Templates Modal */}
      <Modal isOpen={templatesOpen} onClose={() => setTemplatesOpen(false)} title="Worksheet Templates" size="lg">
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          {templates.length === 0 ? (
            <div className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              <LayoutTemplate size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">No templates found</p>
              <p className="text-sm mt-1">Create worksheets in the Worksheet Builder to see them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => loadTemplate(t)}
                  className="w-full text-left p-4 rounded-2xl border transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-black" style={{ color: 'var(--text)' }}>{t.title}</div>
                    <div className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                      {t.total_marks || 0} Marks
                    </div>
                  </div>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t.description}</div>
                  <div className="text-[10px] opacity-40 uppercase font-bold tracking-widest">
                    {(t.blocks?.length || 0)} Questions · {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
