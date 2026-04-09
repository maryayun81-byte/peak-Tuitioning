'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Plus, Eye, EyeOff, Save, Send, ArrowLeft, Settings2,
  BookOpen, Clock, LayoutTemplate, Sparkles, ChevronDown,
  Loader2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
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

export default function EditWorksheetPage() {
  const router = useRouter()
  const { id } = useParams()
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

  // Block state
  const [blocks, setBlocks] = useState<WorksheetBlock[]>([])

  // Document upload state
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [responseMode, setResponseMode] = useState<'draw' | 'type' | 'both'>('draw')
  const [isWorkbook, setIsWorkbook] = useState(false)

  // UI state
  const [loading, setLoading] = useState(true)
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

  useEffect(() => { loadMeta(); loadAssignment() }, [])

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

  const formData = useMemo(() => ({
    title, classId, subjectId, centerId, dueDate, passage, passageType,
    showTimer, timeLimit, shuffleQ, blocks, attachmentUrl, response_mode: responseMode,
    audience, selectedStudentIds, isWorkbook
  }), [title, classId, subjectId, centerId, dueDate, passage, passageType, showTimer, timeLimit, shuffleQ, blocks, attachmentUrl, responseMode, audience, selectedStudentIds, isWorkbook])

  const { hasSavedDraft, restore, clear } = useAutoSave(`edit_assignment_${id}`, formData, (saved) => {
    setTitle(saved.title)
    setBlocks(saved.blocks)
    setAttachmentUrl(saved.attachmentUrl)
    setIsWorkbook(saved.isWorkbook ?? false)
    toast.success('Draft restored!')
  })

  const loadAssignment = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (data) {
        setTitle(data.title || '')
        setClassId(data.class_id || '')
        setSubjectId(data.subject_id || '')
        setCenterId(data.tuition_center_id || '')
        setDueDate(data.due_date ? new Date(data.due_date).toISOString().slice(0, 16) : '')
        setBlocks(data.worksheet || [])
        setPassage(data.passage || '')
        setPassageType(data.passage_type || 'none')
        setShowTimer(data.show_timer || false)
        setTimeLimit(data.time_limit || 60)
        setShuffleQ(data.shuffle_questions || false)
        setAttachmentUrl(data.attachment_url || null)
        setResponseMode(data.response_mode || 'draw')
        setAudience(data.audience === 'selected_students' ? 'students' : 'class')
        setSelectedStudentIds(data.selected_student_ids || [])
        setIsWorkbook(data.is_workbook || false)
      }
    } catch (e: any) {
      toast.error('Failed to load assignment: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMeta = async () => {
    const { profile: currentProfile } = useAuthStore.getState()
    if (!currentProfile?.id) return

    let currentTeacherId = teacher?.id
    if (!currentTeacherId) {
      const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', currentProfile.id).single()
      currentTeacherId = tData?.id
    }

    if (!currentTeacherId) return

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

    let assignments = assignRes.data || []
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

  const availableCenterIds = Array.from(new Set(rawAssignments.map(a => a.tuition_center_id)))
  const availableCenters = centers.filter(c => availableCenterIds.includes(c.id))
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

  const totalMarks = useMemo(() => blocks.reduce((sum, b) => sum + (b.marks || 0), 0), [blocks])

  const addBlock = (type: QuestionType) => setBlocks(prev => [...prev, createBlock(type)])
  const updateBlock = (index: number, updated: WorksheetBlock) => setBlocks(prev => prev.map((b, i) => (i === index ? updated : b)))
  const deleteBlock = (index: number) => setBlocks(prev => prev.filter((_, i) => i !== index))

  const save = async (status: 'draft' | 'published') => {
    if (!title.trim()) { toast.error('Please enter a worksheet title'); return }
    if (!classId) { toast.error('Please select a class'); return }
    if (!subjectId) { toast.error('Please select a subject'); return }
    if (blocks.length === 0 && !attachmentUrl) { toast.error('Add at least one question or upload a document'); return }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('assignments')
        .update({
          title,
          class_id: classId,
          subject_id: subjectId,
          tuition_center_id: centerId || null,
          due_date: dueDate || null,
          status,
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
        })
        .eq('id', id)

      if (error) throw error
      toast.success(status === 'published' ? '🎉 Worksheet updated & published!' : '✅ Edit saved!')
      router.push('/teacher/assignments')
    } catch (e: any) {
      toast.error('Failed to update: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="text-sm font-bold text-[var(--text-muted)]">Loading worksheet details...</p>
      </div>
    </div>
  )

  const selectedClass = derivedClasses.find(c => c.id === classId)
  const selectedSubject = derivedSubjects.find(s => s.id === subjectId)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-6 py-3" style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/teacher/assignments">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div className="min-w-0">
            <div className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>Edit: {title}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{blocks.length} questions · {totalMarks} marks</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
           {/* Re-using buttons from new/page.tsx but with Update logic */}
           <button onClick={() => setTemplatesOpen(true)} className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
             <LayoutTemplate size={14} /> <span className="hidden sm:inline">Templates</span>
           </button>
           <button onClick={() => setShowPreviewPanel(p => !p)} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: showPreviewPanel ? 'var(--primary-dim)' : 'var(--input)', color: showPreviewPanel ? 'var(--primary)' : 'var(--text-muted)' }}>
             {showPreviewPanel ? <EyeOff size={14} /> : <Eye size={14} />} {showPreviewPanel ? 'Hide' : 'Preview'}
           </button>
           <button onClick={() => save('draft')} disabled={saving} className="h-8 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border" style={{ background: 'var(--card)', color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}>
             <Save size={14} /> <span className="hidden sm:inline">Save Draft</span>
           </button>
           <button onClick={() => save('published')} disabled={saving} className="h-8 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black text-white" style={{ background: 'var(--primary)' }}>
             <Send size={14} /> <span className="hidden sm:inline">Update & Publish</span>
           </button>
        </div>
      </div>

      <div className={`flex-1 flex ${showPreviewPanel ? 'md:grid md:grid-cols-2' : ''} divide-x divide-[var(--card-border)] overflow-hidden`}>
        {/* Editor (Clone of New UI) */}
        <div className="flex-1 overflow-y-auto pb-32 md:pb-8">
           <div className="p-4 md:p-6 space-y-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
             <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Worksheet Details</h2>
             <Input label="Worksheet Title" value={title} onChange={e => setTitle(e.target.value)} />
             
             {/* Draft Restore Notification */}
             <AnimatePresence>
               {hasSavedDraft && (
                 <motion.div
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="overflow-hidden"
                 >
                   <div className="p-3 rounded-xl border-2 border-dashed flex items-center justify-between gap-3" 
                         style={{ borderColor: 'var(--primary)', background: 'var(--primary-dim)' }}>
                     <div className="flex items-center gap-2">
                       <Sparkles size={16} className="text-primary" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-primary">Edits recovered from local draft</span>
                     </div>
                     <div className="flex gap-2">
                       <button onClick={clear} className="text-[10px] font-bold text-muted px-2 py-1">Discard</button>
                       <button onClick={restore} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-primary text-white rounded-lg">Restore</button>
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

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
               <Select label="Tuition Center scope" value={centerId} onChange={e => setCenterId(e.target.value)}>
                 <option value="">Select Center</option>
                 {availableCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </Select>
               <Select label="Class" value={classId} onChange={e => setClassId(e.target.value)}>
                 <option value="">Select Class</option>
                 {derivedClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </Select>
               <Select label="Subject" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                 <option value="">Select Subject</option>
                 {derivedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </Select>
             </div>
             <Input label="Due Date" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
             
             {/* Audience Selector */}
             <div className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] space-y-4">
                <label className="text-[10px] font-black uppercase text-primary">Target Audience</label>
                <div className="flex gap-2">
                   {['class', 'students'].map(a => (
                     <button key={a} onClick={() => setAudience(a as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${audience === a ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted border-card-border'}`}>
                        {a === 'class' ? 'Entire Class' : 'Specific Students'}
                     </button>
                   ))}
                </div>
                {audience === 'students' && (
                  <div className="space-y-2">
                     <Select label="Filter by Class" value={audienceClassFilter} onChange={e => setAudienceClassFilter(e.target.value)}>
                        <option value="">Select Class</option>
                        {derivedClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </Select>
                     <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
                        {audienceStudents.map(s => (
                          <label key={s.id} className="flex items-center gap-2 p-2 rounded-lg border border-[var(--card-border)] cursor-pointer">
                             <input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={e => {
                               const next = e.target.checked ? [...selectedStudentIds, s.id] : selectedStudentIds.filter(id => id !== s.id)
                               setSelectedStudentIds(next)
                             }} />
                             <span className="text-[10px] font-bold">{s.full_name}</span>
                          </label>
                        ))}
                     </div>
                  </div>
                )}
             </div>

             {/* Document Upload */}
             <FileUploadZone value={attachmentUrl} onChange={setAttachmentUrl} />
           </div>

           <div className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted">Questions ({blocks.length})</h2>
                <Badge variant="primary">{totalMarks} Marks</Badge>
              </div>

              <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-3">
                {blocks.map((block, index) => (
                  <Reorder.Item key={block.id} value={block}>
                    <QuestionBlock block={block} index={index} onChange={u => updateBlock(index, u)} onDelete={() => deleteBlock(index)} />
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              <button onClick={() => setTypeSheetOpen(true)} className="w-full py-4 rounded-2xl border-2 border-dashed border-card-border text-primary font-bold hover:bg-primary/5 transition-all">
                + Add Question
              </button>
           </div>
        </div>

        {/* Preview Panel */}
        {showPreviewPanel && (
          <div className="hidden md:block flex-1 overflow-hidden">
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
        )}
      </div>

       <QuestionTypeSheet isOpen={typeSheetOpen} onClose={() => setTypeSheetOpen(false)} onSelect={addBlock} />
    </div>
  )
}
