'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, ChevronRight, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useAIFormStore, type AIIntent } from '@/stores/aiFormStore'
import { processTeacherInstruction } from '@/app/actions/ai-teacher'
import toast from 'react-hot-toast'

/**
 * Guided AI creation — the teacher picks class / subject / topic / size and
 * the AI drafts the content into the matching form (assignment or quiz),
 * which the teacher reviews and publishes. Guided pickers instead of a
 * blank prompt box: faster, fewer failed generations, always teacher-approved.
 */
export function GuidedAICreate({
  intent,
  open,
  onClose,
}: {
  intent: Extract<AIIntent, 'assignment' | 'quiz'>
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { teacher, profile } = useAuthStore()

  const [classes, setClasses] = useState<Array<{ id: string; name: string; curriculum: string }>>([])
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; class_id: string }>>([])
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(intent === 'quiz' ? 5 : 4)
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState(false)

  // Load the teacher's classes/subjects for guided pickers (not free text —
  // the backend maps names to IDs from this same scope). Sources mirror the
  // rest of the portal: formal assignments, self-registered subjects, and
  // onboarding teaching-map entries — any one of them may be the only place
  // a class/subject link lives.
  useEffect(() => {
    if (!open) return
    const load = async () => {
      const ownerId = profile?.id
      if (!ownerId) return
      let teacherId = teacher?.id
      if (!teacherId) {
        const { data } = await supabase.from('teachers').select('id').eq('user_id', ownerId).maybeSingle()
        teacherId = (data as any)?.id
      }
      if (!teacherId) return
      const [assignRes, selfRes, mapRes] = await Promise.all([
        supabase
          .from('teacher_assignments')
          .select('class_id, subject_id, class:classes(id, name, curriculum:curriculums(name)), subject:subjects(id, name, class_id)')
          .eq('teacher_id', teacherId),
        supabase
          .from('teacher_subject_classes')
          .select('class_id, subject_id, subject:subjects(id, name, class_id), class:classes(id, name, curriculum:curriculums(name))')
          .eq('teacher_id', teacherId),
        supabase
          .from('teacher_teaching_map')
          .select('class_id, subject_id, class:classes(id, name, curriculum:curriculums(name)), subject:subjects(id, name, class_id)')
          .eq('teacher_id', teacherId),
      ])
      const rel = (v: any) => (Array.isArray(v) ? v[0] : v)
      const classMap = new Map<string, { id: string; name: string; curriculum: string }>()
      const subjMap = new Map<string, { id: string; name: string; class_id: string }>()
      const ingest = (row: any) => {
        const c = rel(row.class)
        const s = rel(row.subject)
        const curriculum =
          rel(c?.curriculum)?.name || rel(row.curriculum)?.name || ''
        if (row.class_id && c?.name) {
          const prev = classMap.get(row.class_id)
          classMap.set(row.class_id, { id: row.class_id, name: c.name, curriculum: prev?.curriculum || curriculum })
        }
        if (row.subject_id && s?.name) {
          const cid = s.class_id || row.class_id
          if (cid) subjMap.set(`${row.subject_id}:${cid}`, { id: row.subject_id, name: s.name, class_id: cid })
        }
      }
      for (const row of ((assignRes.data || []) as any[])) ingest(row)
      for (const row of ((selfRes.data || []) as any[])) ingest(row)
      for (const row of ((mapRes.data || []) as any[])) ingest(row)
      // A missing table (older DBs) surfaces as an error — the other sources
      // still stand; never fail the whole picker on one source.
      setClasses([...classMap.values()])
      setSubjects([...subjMap.values()])
    }
    load()
  }, [open, profile?.id, teacher?.id, supabase])

  const classSubjects = (() => {
    // De-duplicate by subject id: one subject taught in several classes must
    // still render a single <option> (duplicate keys corrupt selection).
    const dedupe = (list: Array<{ id: string; name: string; class_id: string }>) => {
      const seen = new Set<string>()
      return list.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    }
    if (!classId) return dedupe(subjects)
    const scoped = subjects.filter((s) => s.class_id === classId)
    // Fallback: a class with no linked subjects still offers all of the
    // teacher's subjects rather than a dead empty dropdown.
    return dedupe(scoped.length > 0 ? scoped : subjects)
  })()
  const className = classes.find((c) => c.id === classId)?.name || ''
  const curriculumName = classes.find((c) => c.id === classId)?.curriculum || ''
  const subjectName = subjects.find((s) => s.id === subjectId)?.name || ''
  const canGenerate = topic.trim().length >= 3 && !generating

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Tell the AI the topic first (at least 3 characters).')
      return
    }
    setGenerating(true)
    try {
      const scope = [className, subjectName].filter(Boolean).join(' ') || 'my class'
      const curriculumBit = curriculumName ? ` (${curriculumName} curriculum)` : ''
      const mathBit = /math|physics|chemistry|biology|science/i.test(subjectName)
        ? ' Write all formulas and equations in LaTeX ($...$ inline, $$...$$ display) and mark equation-heavy questions with type "math".'
        : ''
      const prompt =
        intent === 'assignment'
          ? `Create an assignment for ${scope}${curriculumBit} on "${topic.trim()}" with ${count} syllabus-aligned questions (a mix of short and long answers, each with marks).${mathBit}${notes.trim() ? ` Extra instructions: ${notes.trim()}` : ''}`
          : `Create a quiz for ${scope}${curriculumBit} on "${topic.trim()}" with ${count} syllabus-aligned questions (multiple choice with 4 options and true/false, each with the correct answer and marks).${mathBit}${notes.trim() ? ` Extra instructions: ${notes.trim()}` : ''}`
      const result = await processTeacherInstruction(prompt)
      if ((result as any).error) {
        toast.error((result as any).error)
        return
      }
      const data = (result as any).data
      useAIFormStore.getState().setParsedData(data, intent)
      toast.success(`AI drafted your ${intent}! Review and publish.`)
      onClose()
      router.push(intent === 'assignment' ? '/teacher/assignments/new' : '/teacher/quizzes/new')
    } catch {
      toast.error('AI generation failed. Check your connection and try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={intent === 'assignment' ? 'Ask AI · Assignment' : 'Ask AI · Quiz'} size="md">
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'var(--primary-dim)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'var(--primary)' }}>
            <Sparkles size={18} />
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
            {intent === 'assignment'
              ? 'Guide the AI in 4 quick picks — it drafts the worksheet, you review every question before publishing.'
              : 'Guide the AI in 4 quick picks — it drafts the quiz with answers, you review everything before publishing.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId('') }}>
            <option value="">Any of mine</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Any subject</option>
            {classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>

        <Input
          label="Topic"
          placeholder={intent === 'assignment' ? 'e.g. Quadratic equations by factorization' : 'e.g. Acids, bases and indicators'}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {intent === 'assignment' ? 'Questions' : 'Questions'}
            </label>
            <div className="flex items-center gap-2">
              {[3, 5, 8, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all border-2"
                  style={{
                    background: count === n ? 'var(--primary)' : 'var(--input)',
                    color: count === n ? 'white' : 'var(--text-muted)',
                    borderColor: count === n ? 'var(--primary)' : 'transparent',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Input label="Extra notes (optional)" placeholder="e.g. exam-style, easy first" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={generating}>
            <X size={14} /> Cancel
          </Button>
          <Button className="flex-[2]" onClick={handleGenerate} isLoading={generating} disabled={!canGenerate}>
            <Sparkles size={15} /> Generate {intent === 'assignment' ? 'Assignment' : 'Quiz'}
          </Button>
        </div>
        <AnimatePresence>
          {generating && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-[11px] font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              AI is drafting your questions… usually under 30 seconds.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}
