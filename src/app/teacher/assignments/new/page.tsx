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
import { FileUploadZone } from '@/components/worksheet/FileUploadZone'
import toast from 'react-hot-toast'
import type { WorksheetBlock, QuestionType } from '@/types/database'
import Link from 'next/link'
import { useAutoSave } from '@/hooks/useAutoSave'
import { DraftBanner } from '@/components/ui/DraftBanner'
import { clearPageDataCache } from '@/hooks/usePageData'
import { useAIFormStore } from '@/stores/aiFormStore'

export default function NewWorksheetPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()

  // Metadata
  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [centerId, setCenterId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [passage, setPassage] = useState('')
  const [passageType, setPassageType] = useState<'none' | 'passage' | 'poem' | 'diagram'>('none')
  const [showTimer, setShowTimer] = useState(false)
  const [timeLimit, setTimeLimit] = useState(60)
  const [shuffleQ, setShuffleQ] = useState(false)
  const [lockAfterDeadline, setLockAfterDeadline] = useState(false)

  // Block state
  const [blocks, setBlocks] = useState<WorksheetBlock[]>([])

  // Document upload state
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [responseMode, setResponseMode] = useState<'draw' | 'type' | 'both'>('draw')
  const [isWorkbook, setIsWorkbook] = useState(false)

  // UI state
  const [typeSheetOpen, setTypeSheetOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showPreviewPanel, setShowPreviewPanel] = useState(true)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [rawAssignments, setRawAssignments] = useState<any[]>([])
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([])

  // Audience selection
  const [audience, setAudience] = useState<'curriculum_center' | 'class' | 'students'>('class')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [audienceCenterFilter, setAudienceCenterFilter] = useState('')
  const [audienceClassFilter, setAudienceClassFilter] = useState('')
  const [audienceStudents, setAudienceStudents] = useState<any[]>([])

  // Auto-save integration
  const formData = useMemo(() => ({
    title, classId, subjectId, centerId, dueDate, passage, passageType,
    showTimer, timeLimit, shuffleQ, blocks, attachmentUrl, responseMode,
    audience, selectedStudentIds, isWorkbook, lockAfterDeadline
  }), [title, classId, subjectId, centerId, dueDate, passage, passageType, showTimer, timeLimit, shuffleQ, blocks, attachmentUrl, responseMode, audience, selectedStudentIds, isWorkbook, lockAfterDeadline])

  const { hasSavedDraft, restore, clear, draftAge } = useAutoSave('new_assignment', formData, (saved) => {
    // This callback is for manual restoration
    setTitle(saved.title)
    setClassId(saved.classId)
    setSubjectId(saved.subjectId)
    setCenterId(saved.centerId)
    setDueDate(saved.dueDate)
    setPassage(saved.passage)
    setPassageType(saved.passageType)
    setShowTimer(saved.showTimer)
    setTimeLimit(saved.timeLimit)
    setShuffleQ(saved.shuffleQ)
    setBlocks(saved.blocks)
    setAttachmentUrl(saved.attachmentUrl)
    setResponseMode(saved.responseMode)
    setAudience(saved.audience)
    setSelectedStudentIds(saved.selectedStudentIds)
    setIsWorkbook(saved.isWorkbook ?? false)
    setLockAfterDeadline(saved.lockAfterDeadline ?? false)
    toast.success('Draft restored!')
  })

  useEffect(() => { loadMeta() }, [])

  // ── AI Auto-fill Listener ──
  const { parsedData, intent, lastGeneratedAt, clear: clearAI } = useAIFormStore()
  useEffect(() => {
    if (lastGeneratedAt && intent === 'assignment' && parsedData) {
      if (parsedData.title) setTitle(parsedData.title)
      if (parsedData.class_id) setClassId(parsedData.class_id)
      if (parsedData.subject_id) setSubjectId(parsedData.subject_id)
      if (parsedData.due_date) setDueDate(parsedData.due_date.slice(0, 16))
      if (parsedData.questions) {
        setBlocks(parsedData.questions.map((q: any) => ({
          ...createBlock(q.type === 'long_answer' ? 'long_answer' : 'short_answer' as any),
          question: q.question,
          marks: q.marks || 5,
          lines: q.lines || 3
        })))
      }
      if (parsedData.settings) {
        setLockAfterDeadline(parsedData.settings.strict_mode || false)
      }
      toast.success('AI populated this assignment! 🚀')
      clearAI()
    }
  }, [lastGeneratedAt, intent, parsedData])

  // Load students when audience class filter changes
  useEffect(() => {
    if (audience !== 'students' || !audienceClassFilter) {
      setAudienceStudents([])
      return
    }
    supabase
      .from('students')
      .select('id, full_name')
      .eq('class_id', audienceClassFilter)
      .limit(100)
      .then(({ data }) => setAudienceStudents(data || []))
  }, [audience, audienceClassFilter])

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

    // Fetch from teacher_assignments (the real assignment table)
    const [assignRes, tRes, centersRes] = await Promise.all([
      supabase
        .from('teacher_assignments')
        .select(`
          class_id,
          subject_id,
          tuition_center_id,
          class:classes(id, name),
          subject:subjects(id, name, class_id)
        `)
        .eq('teacher_id', currentTeacherId),
      supabase.from('worksheet_templates_v3').select('*').order('created_at', { ascending: false }),
      supabase.from('tuition_centers').select('id, name').order('name')
    ])

    if (assignRes.error) {
      console.error('[NewAssignment] Assignment fetch error:', assignRes.error)
    }

    let assignments = assignRes.data || []

    // If no formal assignments, fall back to teaching map (onboarding preferences)
    if (assignments.length === 0) {
      const { data: mapData } = await supabase
        .from('teacher_teaching_map')
        .select('class_id, subject_id, classes(id, name), subjects(id, name, class_id)')
        .eq('teacher_id', currentTeacherId)
      
      assignments = (mapData || []).map((m: any) => ({
        class_id: m.class_id,
        subject_id: m.subject_id,
        tuition_center_id: null,
        class: m.classes,
        subject: m.subjects
      }))
    }

    setRawAssignments(assignments)
    setTemplates(tRes.data ?? [])
    setCenters(centersRes.data ?? [])
  }

  // Derive available options based on hierarchy
  const availableCenterIds = Array.from(new Set(rawAssignments.map(a => a.tuition_center_id)))
  const availableCenters = centers.filter(c => availableCenterIds.includes(c.id))
  // We represent "null" tuition center explicitly as empty string in state
  const hasGlobalAssignments = availableCenterIds.includes(null)

  const centerAssignments = rawAssignments.filter(a => (a.tuition_center_id || '') === centerId)

  const derivedClasses = Array.from(
    new Map(
      centerAssignments
        .filter(a => a.class_id && a.class)
        .map(a => {
          const cObj = Array.isArray(a.class) ? a.class[0] : a.class
          return [a.class_id, { id: a.class_id, name: cObj?.name ?? 'Unknown Class' }]
        })
    ).values()
  )

  const classAssignments = centerAssignments.filter(a => a.class_id === classId)
  const derivedSubjects = Array.from(
    new Map(
      classAssignments
        .filter(a => a.subject_id && a.subject)
        .map(a => {
          const sObj = Array.isArray(a.subject) ? a.subject[0] : a.subject
          return [a.subject_id, { id: a.subject_id, name: sObj?.name ?? 'Unknown Subject', class_id: a.class_id }]
        })
    ).values()
  )

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
    if (blocks.length === 0 && !attachmentUrl) { toast.error('Add at least one question or upload a document'); return }

    setSaving(true)

    // Always resolve teacher ID at save time to avoid race conditions
    let currentTeacherId = teacher?.id
    if (!currentTeacherId && profile?.id) {
      const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', profile.id).single()
      currentTeacherId = tData?.id
    }

    if (!currentTeacherId) {
      toast.error('Teacher profile not found. Please re-login and try again.')
      setSaving(false)
      return
    }

    const { data: newAssign, error } = await supabase.from('assignments').insert({
      title,
      class_id: classId,
      subject_id: subjectId,
      tuition_center_id: centerId || null,
      due_date: dueDate || null,
      status,
      teacher_id: currentTeacherId,
      worksheet: blocks,
      passage: passage || null,
      passage_type: passageType,
      total_marks: totalMarks,
      shuffle_questions: shuffleQ,
      show_timer: showTimer,
      time_limit: showTimer ? timeLimit : null,
      max_marks: totalMarks,
      attachment_url: attachmentUrl || null,
      response_mode: attachmentUrl ? responseMode : 'blocks',
      content: JSON.stringify(blocks),
      audience: audience === 'students' ? 'selected_students' : 'class',
      selected_student_ids: audience === 'students' ? selectedStudentIds : [],
      is_workbook: isWorkbook,
      lock_after_deadline: lockAfterDeadline,
    }).select('id').single()

    if (error) {
      console.error('[Save Assignment Error]', error)
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success(status === 'published' ? '🎉 Worksheet published!' : '✅ Draft saved!')
      
      // SEND NOTIFICATIONS
      if (status === 'published') {
        const studentIds = audience === 'students' ? selectedStudentIds : []
        let targetUserIds: string[] = []

        if (audience === 'students' && studentIds.length > 0) {
          const { data: stUsers } = await supabase.from('students').select('user_id').in('id', studentIds)
          targetUserIds = stUsers?.map(s => s.user_id).filter(Boolean) as string[] || []
        } else if (audience === 'class' && classId) {
          const { data: stUsers } = await supabase.from('students').select('user_id').eq('class_id', classId)
          targetUserIds = stUsers?.map(s => s.user_id).filter(Boolean) as string[] || []
        }

        if (targetUserIds.length > 0) {
          const notifications = targetUserIds.map(uid => ({
            user_id: uid,
            type: 'new_assignment',
            title: 'New Assignment Posted',
            body: `A new assignment "${title}" has been posted in ${derivedSubjects.find(s => s.id === subjectId)?.name || 'your class'}.`,
            related_id: newAssign?.id,
            data: { assignment_id: newAssign?.id, subject_id: subjectId }
          }))
          await supabase.from('notifications').insert(notifications)
        }
      }

      clear() // Clear auto-save draft on successful save
      clearPageDataCache() // Invalidate list cache
      router.push('/teacher/assignments')
    }
    setSaving(false)
  }


  const selectedClass = derivedClasses.find(c => c.id === classId)
  const selectedSubject = derivedSubjects.find(s => s.id === subjectId)

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
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
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Templates — icon only on mobile */}
          <button
            onClick={() => setTemplatesOpen(true)}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all"
            style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
            title="Templates"
          >
            <LayoutTemplate size={14} />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {/* Toggle Preview Panel — desktop only */}
          <button
            onClick={() => setShowPreviewPanel(p => !p)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: showPreviewPanel ? 'var(--primary-dim)' : 'var(--input)', color: showPreviewPanel ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            {showPreviewPanel ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreviewPanel ? 'Hide' : 'Preview'}
          </button>

          {/* Preview modal — icon only on mobile */}
          <button
            onClick={() => setPreviewOpen(true)}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all md:hidden"
            style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
            title="Preview"
          >
            <Eye size={14} />
          </button>

          {/* Save Draft */}
          <button
            onClick={() => save('draft')}
            disabled={saving}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all border"
            style={{ background: 'var(--card)', color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}
            title="Save Draft"
          >
            <Save size={14} />
            <span className="hidden sm:inline">Draft</span>
          </button>

          {/* Publish */}
          <button
            onClick={() => save('published')}
            disabled={saving}
            className="h-8 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all text-white"
            style={{ background: 'var(--primary)' }}
            title="Publish"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Publish</span>
          </button>
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

            {/* Draft Restore Notification */}
            {hasSavedDraft && (
              <DraftBanner
                label="assignment"
                draftAge={draftAge}
                onRestore={restore}
                onDiscard={() => { clear(); toast('Draft discarded', { icon: '🗑️' }) }}
              />
            )}

            {/* Workbook Mode Toggle */}
            <div className="p-4 rounded-2xl border-2 transition-all flex items-center justify-between"
                 style={{ 
                   borderColor: isWorkbook ? 'var(--primary)' : 'var(--card-border)',
                   background: isWorkbook ? 'var(--primary-dim)' : 'transparent'
                 }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isWorkbook ? 'bg-primary text-white' : 'bg-input text-muted'}`}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="text-sm font-black" style={{ color: 'var(--text)' }}>Physical Workbook Mode</div>
                  <div className="text-[10px] uppercase font-bold text-muted">Student submits a photo of their book</div>
                </div>
              </div>
              <button 
                onClick={() => setIsWorkbook(!isWorkbook)}
                className={`w-12 h-6 rounded-full relative transition-colors ${isWorkbook ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isWorkbook ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Select label="Tuition Center/Scope *" value={centerId} onChange={e => { setCenterId(e.target.value); setClassId(''); setSubjectId('') }}>
                <option value="">Select Center Scope</option>
                {hasGlobalAssignments && <option value="">Global / Unassigned Center</option>}
                {availableCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label="Class *" value={classId} onChange={e => { setClassId(e.target.value); setSubjectId('') }} disabled={!centerId && !hasGlobalAssignments}>
                <option value="">Select Class</option>
                {derivedClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label="Subject *" value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId}>
                <option value="">Select Subject</option>
                {derivedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Due Date" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="timer" checked={showTimer} onChange={e => setShowTimer(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <label htmlFor="timer" className="text-sm font-medium" style={{ color: 'var(--text)' }}>Enable Timer</label>
                  {showTimer && (
                    <input type="number" min={5} max={300} value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))}
                      className="w-16 rounded-lg px-2 py-1 text-sm text-center" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                    />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="strict_deadline" 
                    checked={lockAfterDeadline} 
                    onChange={e => setLockAfterDeadline(e.target.checked)} 
                    className="w-4 h-4 accent-red-500" 
                  />
                  <label htmlFor="strict_deadline" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    Block late submissions <span className="text-[10px] opacity-60 font-normal">(STRICT)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── Audience Selection ── */}
            <div className="p-4 rounded-2xl space-y-4" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
                Target Audience
              </label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'class',              label: 'Entire Class' },
                  { value: 'curriculum_center',  label: 'All in Center' },
                  { value: 'students',           label: 'Specific Students' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setAudience(opt.value)
                      setSelectedStudentIds([])
                      setAudienceCenterFilter('')
                      setAudienceClassFilter('')
                    }}
                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all"
                    style={{
                      background: audience === opt.value ? 'var(--primary)' : 'var(--card)',
                      color: audience === opt.value ? 'white' : 'var(--text-muted)',
                      borderColor: audience === opt.value ? 'var(--primary)' : 'var(--card-border)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {audience === 'curriculum_center' && (
                <div className="space-y-2">
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Sent to <strong>all students</strong> in the chosen center across every class.
                  </p>
                  <Select
                    label="Target Tuition Center"
                    value={audienceCenterFilter}
                    onChange={e => setAudienceCenterFilter(e.target.value)}
                  >
                    <option value="">All My Centers (Broadcast)</option>
                    {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
              )}

              {audience === 'students' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Filter by Center"
                      value={audienceCenterFilter}
                      onChange={e => { setAudienceCenterFilter(e.target.value); setAudienceClassFilter('') }}
                    >
                      <option value="">All Centers</option>
                      {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Select
                      label="Filter by Class"
                      value={audienceClassFilter}
                      onChange={e => setAudienceClassFilter(e.target.value)}
                    >
                      <option value="">Select a Class</option>
                      {derivedClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Select Students</label>
                      <span className="text-[10px] font-black" style={{ color: 'var(--primary)' }}>
                        {selectedStudentIds.length} selected
                      </span>
                    </div>
                    <div
                      className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 rounded-xl border"
                      style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                    >
                      {audienceStudents.map(s => (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all hover:bg-primary/5"
                          style={{ borderColor: 'var(--card-border)' }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...selectedStudentIds, s.id]
                                : selectedStudentIds.filter(id => id !== s.id)
                              setSelectedStudentIds(next)
                            }}
                          />
                          <span className="text-[10px] font-bold truncate" style={{ color: 'var(--text)' }}>
                            {s.full_name}
                          </span>
                        </label>
                      ))}
                      {audienceStudents.length === 0 && (
                        <div className="col-span-full py-8 text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {audienceClassFilter ? 'No students found' : 'Select a class to load students'}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      💡 Switch filters to add students from different classes — selections are preserved.
                    </p>
                  </div>
                </div>
              )}
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

            {/* Document Upload Section */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                📎 Source Document (Optional)
              </label>
              <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
                Upload a PDF or image (e.g. a scanned question paper). Students will work directly on it.
              </p>
              <FileUploadZone value={attachmentUrl} onChange={setAttachmentUrl} acceptDocs={true} />
            </div>

            {/* Student Response Mode — only shown when a document is uploaded */}
            {attachmentUrl && (
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                  Student Response Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'draw', emoji: '✏️', label: 'Draw', desc: 'Pen & annotation tools (Math)' },
                    { value: 'type', emoji: '📝', label: 'Type',  desc: 'Click to type in spaces (English)' },
                    { value: 'both', emoji: '🔀', label: 'Both',  desc: 'Student can switch modes' },
                  ] as const).map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setResponseMode(m.value)}
                      className="rounded-2xl p-3 text-left transition-all border-2 text-xs"
                      style={{
                        background: responseMode === m.value ? 'var(--primary-dim)' : 'var(--input)',
                        borderColor: responseMode === m.value ? 'var(--primary)' : 'transparent',
                      }}
                    >
                      <div className="text-lg mb-1">{m.emoji}</div>
                      <div className="font-black" style={{ color: 'var(--text)' }}>{m.label}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
