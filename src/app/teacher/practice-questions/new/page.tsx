'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, Save, AlertCircle } from 'lucide-react'
import { QuestionEditor } from '@/components/practice-questions/QuestionEditor'
import toast from 'react-hot-toast'
import type { Class, Subject, Topic } from '@/types/database'

import { Suspense } from 'react'

function EditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()

  const editId = searchParams.get('editId')
  const initialClassId = searchParams.get('classId') || ''
  const initialSubjectId = searchParams.get('subjectId') || ''
  const initialTopicId = searchParams.get('topicId') || ''

  // Form State
  const [classId, setClassId] = useState(initialClassId)
  const [subjectId, setSubjectId] = useState(initialSubjectId)
  const [topicId, setTopicId] = useState(initialTopicId)
  
  const [content, setContent] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [marks, setMarks] = useState('1')

  // Hierarchy Data State
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [profile, teacher, editId])

  const load = async () => {
    let currentTeacherId = teacher?.id
    if (!currentTeacherId && profile?.role === 'teacher') {
      const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', profile.id).single()
      currentTeacherId = tData?.id
    }
    if (!currentTeacherId) return

    setLoading(true)
    try {
      // 1. Fetch assigned classes and subjects map
      const { data: mapData } = await supabase
        .from('teacher_teaching_map')
        .select('class_id, subject_id, classes(id, name), subjects(id, name, class_id)')
        .eq('teacher_id', currentTeacherId)

      const uniqueClasses = Array.from(new Set((mapData || []).map(m => {
        const c = m.classes
        return JSON.stringify(Array.isArray(c) ? c[0] : c)
      })))
        .filter(c => c !== 'null')
        .map(c => JSON.parse(c as string)) as Class[]
      
      const uniqueSubjects = Array.from(new Set((mapData || []).map(m => {
        const s = m.subjects
        return JSON.stringify(Array.isArray(s) ? s[0] : s)
      })))
        .filter(s => s !== 'null')
        .map(s => JSON.parse(s as string)) as Subject[]

      setClasses(uniqueClasses)
      setSubjects(uniqueSubjects)

      // Fetch topics for all those subjects just in case
      if (uniqueSubjects.length > 0) {
         const subIds = uniqueSubjects.map(s => s.id)
         const { data: topicData } = await supabase.from('topics').select('*').in('subject_id', subIds)
         if (topicData) setTopics(topicData as Topic[])
      }

      // If Edit Mode, fetch the existing question overrides
      if (editId) {
         const { data: qData, error: qErr } = await supabase
            .from('practice_questions')
            .select('*, topic:topics(subject_id, subjects(class_id))')
            .eq('id', editId)
            .single()

         if (qErr) throw qErr
         if (qData) {
            // Restore Tiptap content and parse metadata
            let metadata = { difficulty: 'medium', marks: '1' }
            let actualContent = qData.content

            try {
               const parsed = JSON.parse(qData.content)
               if (parsed.metadata) {
                  metadata = parsed.metadata
                  // Also re-stringify the inner content for the editor
                  actualContent = JSON.stringify(parsed.content)
               } else if (parsed.difficulty || parsed.marks) {
                  metadata.difficulty = parsed.difficulty || 'medium'
                  metadata.marks = parsed.marks || '1'
                  // The actual tip tap content is probably in parsed.tiptap
                  actualContent = JSON.stringify(parsed.tiptap || parsed)
               }
            } catch (e) { }

            setContent(actualContent)
            setDifficulty(metadata.difficulty)
            setMarks(metadata.marks)

            setTopicId(qData.topic_id)
            if ((qData as any).topic) {
               setSubjectId((qData as any).topic.subject_id)
               setClassId((qData as any).topic.subjects.class_id)
            }
         }
      }

    } catch (err: any) {
      console.error('[Editor] Failed to load:', err)
      toast.error('Failed to initialize editor.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
     if (!topicId) {
        toast.error('Please select a topic to save this question under.')
        return
     }
     if (!content || content === '{"type":"doc","content":[{"type":"paragraph"}]}') {
        toast.error('Question content cannot be empty.')
        return
     }

     setSaving(true)
     try {
        let currentTeacherId = teacher?.id
        if (!currentTeacherId && profile?.role === 'teacher') {
           const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', profile?.id).single()
           currentTeacherId = tData?.id
        }

        // Package the tiptap JSON with metadata
        const payload = {
           metadata: { difficulty, marks },
           content: JSON.parse(content)
        }

        const dataObj = {
           topic_id: topicId,
           teacher_id: currentTeacherId,
           content: JSON.stringify(payload) // store all combined as JSONB
        }

        if (editId) {
           const { error } = await supabase.from('practice_questions').update(dataObj).eq('id', editId)
           if (error) throw error
           toast.success('Question updated successfully!')
        } else {
           const { error } = await supabase.from('practice_questions').insert(dataObj)
           if (error) throw error
           toast.success('Question created successfully!')
        }

        router.push(`/teacher/practice-questions/${classId}/${subjectId}/${topicId}`)

     } catch (err: any) {
        toast.error('Failed to save question: ' + err.message)
     } finally {
        setSaving(false)
     }
  }

  const filteredSubjects = subjects.filter(s => s.class_id === classId)
  const filteredTopics = topics.filter(t => t.subject_id === subjectId)

  if (loading) return (
     <div className="p-6 max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
           <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
           <div className="text-sm font-bold text-muted uppercase tracking-widest">Loading Editor...</div>
        </div>
     </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-center gap-4">
           <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-105 shrink-0" 
              style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ChevronLeft size={20} />
           </button>
           <div>
             <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>
               {editId ? 'Edit Practice Question' : 'New Practice Question'}
             </h1>
             <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
               Create high-quality, rich-text questions.
             </p>
           </div>
         </div>
         <Button onClick={handleSave} isLoading={saving} className="shrink-0 w-full sm:w-auto" style={{ background: '#A855F7', color: 'white' }}>
            <Save size={16} className="mr-2" /> {editId ? 'Update Question' : 'Save Question'}
         </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Left Col: Editor */}
         <div className="lg:col-span-2 space-y-4">
            <Card className="p-1 border border-[var(--card-border)] bg-[var(--card)] shadow-xs">
               <QuestionEditor 
                  value={content} 
                  onChange={setContent} 
                  placeholder="Type your question here. Use the Math (f(x)) button to insert equations!"
               />
            </Card>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-500 text-sm">
               <AlertCircle size={16} className="shrink-0 mt-0.5" />
               <p className="leading-snug">
                  <strong>KaTeX Math Support is active.</strong> You can type formulas wrapping them in <code className="bg-blue-500/10 px-1 py-0.5 rounded font-bold">$$</code>. The editor will automatically render them properly on the student's end.
               </p>
            </div>
         </div>

         {/* Right Col: Metadata & Hierarchy */}
         <div className="space-y-6">
            <Card className="p-5 border border-[var(--card-border)] bg-[var(--card)] space-y-4">
               <h3 className="font-bold text-sm uppercase tracking-widest text-muted border-b border-[var(--card-border)] pb-2 mb-4">Location</h3>
               
               <Select 
                  label="Class" 
                  value={classId} 
                  onChange={e => {
                     setClassId(e.target.value)
                     setSubjectId('')
                     setTopicId('')
                  }}
               >
                  <option value="">Select a class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </Select>

               <Select 
                  label="Subject" 
                  value={subjectId} 
                  onChange={e => {
                     setSubjectId(e.target.value)
                     setTopicId('')
                  }}
                  disabled={!classId}
               >
                  <option value="">Select a subject...</option>
                  {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </Select>

               <Select 
                  label="Topic" 
                  value={topicId} 
                  onChange={e => setTopicId(e.target.value)}
                  disabled={!subjectId}
               >
                  <option value="">Select a topic...</option>
                  {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </Select>
               {subjectId && filteredTopics.length === 0 && (
                  <p className="text-xs text-red-500">No topics found in this subject. Go back to create one.</p>
               )}
            </Card>

            <Card className="p-5 border border-[var(--card-border)] bg-[var(--card)] space-y-4">
               <h3 className="font-bold text-sm uppercase tracking-widest text-muted border-b border-[var(--card-border)] pb-2 mb-4">Metadata</h3>
               
               <Select label="Difficulty Level" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
               </Select>

               <Input 
                  label="Marks (Score)" 
                  type="number" 
                  min="1" 
                  value={marks} 
                  onChange={e => setMarks(e.target.value)} 
               />
            </Card>
         </div>
      </div>
    </div>
  )
}

export default function PracticeQuestionEditorPage() {
  return (
    <Suspense fallback={
       <div className="p-6 max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
             <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
             <div className="text-sm font-bold text-muted uppercase tracking-widest">Loading Editor...</div>
          </div>
       </div>
    }>
      <EditorContent />
    </Suspense>
  )
}
