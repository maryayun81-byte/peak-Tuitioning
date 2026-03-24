'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LayoutGrid, HelpCircle, ArrowRight, ArrowLeft, Plus, AlertCircle, Bookmark } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import toast from 'react-hot-toast'

interface TopicStat {
  id: string
  name: string
  question_count: number
  created_at: string
}

interface PageProps {
  params: Promise<{ classId: string; subjectId: string }>
}

export default function PracticeQuestionsTopicsPage({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const classId = resolvedParams.classId
  const subjectId = resolvedParams.subjectId
  const supabase = getSupabaseBrowserClient()
  
  const [topics, setTopics] = useState<TopicStat[]>([])
  const [className, setClassName] = useState('Loading...')
  const [subjectName, setSubjectName] = useState('Loading...')
  const [loading, setLoading] = useState(true)

  // Creation state
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')

  useEffect(() => {
    load()
  }, [classId, subjectId])

  const load = async () => {
    setLoading(true)
    try {
      // Get context names
      const [classRes, subRes] = await Promise.all([
         supabase.from('classes').select('name').eq('id', classId).single(),
         supabase.from('subjects').select('name').eq('id', subjectId).single()
      ])
      
      if (classRes.data) setClassName(classRes.data.name)
      if (subRes.data) setSubjectName(subRes.data.name)

      // Fetch topics
      const { data: topicData, error } = await supabase
        .from('topics')
        .select('id, name, created_at, practice_questions(id)')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const mappedTopics = (topicData || []).map(t => ({
         id: t.id,
         name: t.name,
         created_at: t.created_at,
         question_count: (t.practice_questions || []).length
      }))

      setTopics(mappedTopics)
    } catch (err) {
      console.error('[PracticeQuestions] failed to load topics:', err)
      toast.error('Failed to load topics.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTopic = async (e: React.FormEvent) => {
     e.preventDefault()
     if (!newTopicName.trim()) return

     setSaving(true)
     try {
        const { error } = await supabase.from('topics').insert({
           subject_id: subjectId,
           name: newTopicName.trim()
        })
        if (error) throw error
        
        toast.success('Topic created!')
        setCreateOpen(false)
        setNewTopicName('')
        load()
     } catch (err: any) {
        toast.error('Failed to create topic: ' + err.message)
     } finally {
        setSaving(false)
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
              onClick={() => router.push(`/teacher/practice-questions/${classId}`)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-105" 
              style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ArrowLeft size={18} />
           </button>
           <div>
             <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
               {subjectName} Topics
             </h1>
             <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <span className="opacity-60">{className}</span> 
               <ChevronRight size={12} className="opacity-40" /> 
               <span className="font-semibold">{subjectName}</span>
             </p>
           </div>
         </div>
         <Button onClick={() => setCreateOpen(true)} className="shrink-0 group">
            <Plus size={16} className="mr-2 group-hover:rotate-90 transition-transform duration-300" /> New Topic
         </Button>
      </div>

      {topics.length === 0 ? (
         <div className="py-20 text-center rounded-3xl" style={{ border: '2px dashed var(--card-border)' }}>
            <LayoutGrid size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>No Topics Found</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Get started by creating your first topic for this subject.</p>
            <Button onClick={() => setCreateOpen(true)} variant="outline">Create First Topic</Button>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {topics.map((t, idx) => (
              <Link key={t.id} href={`/teacher/practice-questions/${classId}/${subjectId}/${t.id}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="h-full"
                >
                  <Card className="p-5 h-full transition-all hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden" 
                        style={{ 
                           background: 'var(--card)', 
                           border: '1px solid var(--card-border)',
                           boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                        }}>
                     
                     <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-[0.03] transition-transform group-hover:scale-110 duration-500" 
                          style={{ background: '#A855F7' }} />

                     <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                           <div className="font-black text-lg pr-4 leading-tight" style={{ color: 'var(--text)' }}>
                              {t.name}
                           </div>
                           <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-all group-hover:bg-purple-500/10 group-hover:text-purple-500 text-muted">
                              <ArrowRight size={16} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                           </div>
                        </div>

                        <div className="flex items-center gap-3">
                           <div className="px-3 py-1.5 rounded-lg flex items-center gap-2" style={{ background: 'var(--input)' }}>
                              <HelpCircle size={14} className="text-purple-500" />
                              <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{t.question_count} <span className="opacity-50">Qs</span></span>
                           </div>
                           <div className="text-[10px] font-bold uppercase tracking-widest text-muted opacity-50">
                              Added {new Date(t.created_at).toLocaleDateString()}
                           </div>
                        </div>
                     </div>
                  </Card>
                </motion.div>
              </Link>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Creation Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create New Topic" size="sm">
         <form onSubmit={handleCreateTopic} className="space-y-4">
            <p className="text-xs opacity-70 mb-4">Topics help organize your practice questions. For example: "Algebraic Expressions", "Cell Biology", etc.</p>
            <Input 
               label="Topic Name" 
               placeholder="e.g. Linear Equations" 
               value={newTopicName} 
               onChange={e => setNewTopicName(e.target.value)}
               autoFocus
               required
            />
            <div className="flex justify-end gap-3 pt-2">
               <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
               <Button type="submit" isLoading={saving} style={{ background: '#A855F7', color: 'white' }}>Create Topic</Button>
            </div>
         </form>
      </Modal>
    </div>
  )
}

function ChevronRight({ size, className }: { size: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}
