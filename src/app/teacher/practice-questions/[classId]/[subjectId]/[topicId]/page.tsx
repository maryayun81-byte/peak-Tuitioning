'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LayoutGrid, ArrowLeft, Plus, Edit, Trash2, ChevronRight, FileQuestion } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import toast from 'react-hot-toast'
import type { PracticeQuestion } from '@/types/database'

interface PageProps {
  params: Promise<{ classId: string; subjectId: string; topicId: string }>
}

export default function PracticeQuestionsListPage({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const classId = resolvedParams.classId
  const subjectId = resolvedParams.subjectId
  const topicId = resolvedParams.topicId
  const supabase = getSupabaseBrowserClient()
  
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [className, setClassName] = useState('Loading...')
  const [subjectName, setSubjectName] = useState('Loading...')
  const [topicName, setTopicName] = useState('Loading...')
  const [loading, setLoading] = useState(true)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    load()
  }, [classId, subjectId, topicId])

  const load = async () => {
    setLoading(true)
    try {
      // Get context names
      const [classRes, subRes, topicRes] = await Promise.all([
         supabase.from('classes').select('name').eq('id', classId).single(),
         supabase.from('subjects').select('name').eq('id', subjectId).single(),
         supabase.from('topics').select('name').eq('id', topicId).single()
      ])
      
      if (classRes.data) setClassName(classRes.data.name)
      if (subRes.data) setSubjectName(subRes.data.name)
      if (topicRes.data) setTopicName(topicRes.data.name)

      // Fetch questions
      const { data: qData, error } = await supabase
        .from('practice_questions')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuestions(qData as PracticeQuestion[])

    } catch (err) {
      console.error('[PracticeQuestions] failed to load questions:', err)
      toast.error('Failed to load questions.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
     if (!deleteId) return
     setDeleting(true)
     try {
        const { error } = await supabase.from('practice_questions').delete().eq('id', deleteId)
        if (error) throw error
        toast.success('Question deleted.')
        setQuestions(prev => prev.filter(q => q.id !== deleteId))
     } catch (err: any) {
        toast.error('Failed to delete: ' + err.message)
     } finally {
        setDeleting(false)
        setDeleteId(null)
     }
  }

  const parseContent = (jsonStr: string) => {
     try {
        const parsed = JSON.parse(jsonStr)
        // If it's a Tiptap JSON, extract plain text for preview
        if (parsed.content) {
           return extractText(parsed).substring(0, 150) + '...'
        }
        // Fallback for HTML or flat structure
        return String(jsonStr).substring(0, 150)
     } catch (e) {
        return jsonStr.substring(0, 150)
     }
  }

  // Very basic recursive text extractor for Tiptap JSON preview
  const extractText = (node: any): string => {
     if (node.type === 'text') return node.text || ''
     if (node.content) return node.content.map(extractText).join(' ')
     return ''
  }

  // Get difficulty from metadata if stored in JSON
  const getMetadata = (jsonStr: string) => {
     try {
        const parsed = JSON.parse(jsonStr)
        return {
           difficulty: parsed.difficulty || 'medium',
           marks: parsed.marks || '--'
        }
     } catch (e) {
        return { difficulty: 'medium', marks: '--' }
     }
  }

  if (loading) return (
    <div className="p-6 space-y-6">
      <SkeletonList count={4} />
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-center gap-4">
           <button 
              onClick={() => router.push(`/teacher/practice-questions/${classId}/${subjectId}`)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-105" 
              style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ArrowLeft size={18} />
           </button>
           <div>
             <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
               {topicName}
             </h1>
             <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <span className="opacity-60">{className}</span> 
               <ChevronRight size={12} className="opacity-40" /> 
               <span className="opacity-80">{subjectName}</span>
               <ChevronRight size={12} className="opacity-40" /> 
               <span className="font-semibold">{topicName}</span>
             </p>
           </div>
         </div>
         <Link href={`/teacher/practice-questions/new?classId=${classId}&subjectId=${subjectId}&topicId=${topicId}`}>
            <Button className="shrink-0 group w-full sm:w-auto" style={{ background: '#A855F7', color: 'white' }}>
               <Plus size={16} className="mr-2" /> Create Question
            </Button>
         </Link>
      </div>

      {questions.length === 0 ? (
         <div className="py-20 text-center rounded-3xl" style={{ border: '2px dashed var(--card-border)' }}>
            <FileQuestion size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>No Questions Found</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Start building your question bank for this topic.</p>
            <Link href={`/teacher/practice-questions/new?classId=${classId}&subjectId=${subjectId}&topicId=${topicId}`}>
               <Button variant="outline">Create First Question</Button>
            </Link>
         </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {questions.map((q, idx) => {
              const meta = getMetadata(q.content)
              
              return (
                 <motion.div
                   key={q.id}
                   initial={{ opacity: 0, y: 15 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, height: 0 }}
                   transition={{ delay: idx * 0.05 }}
                 >
                   <Card className="p-4 sm:p-5 transition-all hover:shadow-lg group flex flex-col sm:flex-row gap-4" 
                         style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                      
                      {/* Left: Metadata Badges */}
                      <div className="flex sm:flex-col gap-2 shrink-0">
                         <div className="px-3 py-1.5 rounded-lg text-center" style={{ background: 'var(--input)' }}>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Marks</div>
                            <div className="text-sm font-black text-purple-500">{meta.marks}</div>
                         </div>
                         <div className="px-3 py-1.5 rounded-lg text-center flex-1 sm:flex-none" style={{ background: 'var(--input)' }}>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Level</div>
                            <div className="text-xs font-bold capitalize" style={{ 
                               color: meta.difficulty === 'hard' ? '#EF4444' : meta.difficulty === 'medium' ? '#F59E0B' : '#10B981' 
                            }}>{meta.difficulty}</div>
                         </div>
                      </div>

                      {/* Middle: Content Preview */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                         <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
                            {parseContent(q.content) || <span className="italic opacity-50">Empty question content</span>}
                         </p>
                         <div className="text-[10px] font-bold uppercase tracking-widest text-muted opacity-50 mt-3 border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
                            Added {new Date(q.created_at).toLocaleDateString()}
                         </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 sm:self-center shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0" style={{ borderColor: 'var(--card-border)' }}>
                         {/* Pass questionId to edit page via query param */}
                         <Link href={`/teacher/practice-questions/new?classId=${classId}&subjectId=${subjectId}&topicId=${topicId}&editId=${q.id}`}>
                            <button className="p-2.5 rounded-xl transition-all hover:bg-white/10" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                               <Edit size={16} />
                            </button>
                         </Link>
                         <button onClick={() => setDeleteId(q.id)} className="p-2.5 rounded-xl transition-all hover:bg-red-500/20" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                            <Trash2 size={16} />
                         </button>
                      </div>
                   </Card>
                 </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Question" size="sm">
         <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Are you sure you want to delete this specific practice question? This action cannot be undone.</p>
            <div className="flex justify-end gap-3 pt-2">
               <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
               <Button variant="danger" isLoading={deleting} onClick={handleDelete}>Delete Permanently</Button>
            </div>
         </div>
      </Modal>
    </div>
  )
}
