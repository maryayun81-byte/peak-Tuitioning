'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Plus, Search, Award, Clock, 
  Users, Trash2, Edit, Play,
  ChevronRight, BrainCircuit, Timer
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { usePageData, clearPageDataCache } from '@/hooks/usePageData'

export default function TeacherQuizzes() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['teacher-quizzes', teacher?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('quizzes')
        .select('*, class:classes(name), subject:subjects(name)')
        .eq('teacher_id', teacher!.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!teacher?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const loading = isLoading && quizzes.length === 0

  const deleteQuiz = async (id: string) => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id)
    if (error) { toast.error('Check for existing attempts first.') }
    else { 
      toast.success('Quiz deleted')
      clearPageDataCache()
      queryClient.invalidateQueries({ queryKey: ['teacher-quizzes', teacher?.id] }) 
    }
  }

  const filtered = quizzes.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) || 
    q.subject?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Interactive Quizzes</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create and manage gamified assessments</p>
         </div>
         <Link href="/teacher/quizzes/new">
            <Button><Plus size={16} className="mr-2" /> Create Quiz</Button>
         </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Active Quizzes" value={quizzes.length} icon={<BrainCircuit size={20} />} />
         <StatCard title="Total Attempts" value="842" icon={<Users size={20} />} change="+12 today" changeType="up" />
         <StatCard title="Avg. Score" value="76%" icon={<Award size={20} />} />
         <StatCard title="Time Spent" value="Avg 12m" icon={<Timer size={20} />} />
      </div>

      <div className="flex gap-4">
         <Input placeholder="Search quizzes..." leftIcon={<Search size={16} />} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <SkeletonList count={6} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filtered.map((q, i) => (
             <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-5 h-full flex flex-col group relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
                   
                   <div className="flex items-start justify-between mb-4 relative">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #A855F7, #EC4899)', color: 'white' }}>
                         <BrainCircuit size={24} />
                      </div>
                      <div className="flex gap-1">
                         <button onClick={() => deleteQuiz(q.id)} className="p-2 rounded-lg text-danger hover:bg-danger-light"><Trash2 size={14} /></button>
                         <Link href={`/teacher/quizzes/${q.id}/edit`} className="p-2 rounded-lg text-muted hover:bg-input"><Edit size={14} /></Link>
                      </div>
                   </div>

                   <h3 className="font-bold text-lg mb-1 leading-tight" style={{ color: 'var(--text)' }}>{q.title}</h3>
                   <div className="flex gap-2 mb-4">
                      <Badge variant="muted">{q.class?.name}</Badge>
                      <Badge variant="info">{q.subject?.name}</Badge>
                   </div>

                   <div className="space-y-2 mb-6 flex-1">
                      <div className="flex text-[10px] items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                         <Clock size={12} /> {q.time_limit} Minutes limit
                      </div>
                      <div className="flex text-[10px] items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                         <Award size={12} /> {q.passing_score}% Passing score
                      </div>
                   </div>

                   <div className="pt-4 mt-auto border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                      <Link href={`/teacher/quizzes/${q.id}/results`} className="text-xs font-bold text-primary hover:underline flex items-center">
                         View Analytics <ChevronRight size={14} />
                      </Link>
                      <Badge variant="success">Active</Badge>
                   </div>
                </Card>
             </motion.div>
           ))}
           {filtered.length === 0 && (
             <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-[var(--input)] rounded-full flex items-center justify-center mx-auto">
                   <Plus size={32} className="text-muted opacity-20" />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No quizzes found. Create your first gamified assessment!</p>
                <Link href="/teacher/quizzes/new"><Button size="sm">Create Quiz</Button></Link>
             </div>
           )}
        </div>
      )}
    </div>
  )
}
