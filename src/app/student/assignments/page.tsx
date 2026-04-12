'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, FileText, Clock, Award, 
  ChevronRight, ArrowRight, Zap,
  CheckCircle2, AlertCircle, Filter, 
  SearchIcon, Trophy
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { 
  SectionErrorBoundary, 
  ErrorState, 
  EmptyState, 
  TimeoutState 
} from '@/components/ui/PageStates'
import { useStudentAssignments } from '@/hooks/useDashboardData'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function StudentAssignments() {
  const supabase = getSupabaseBrowserClient()
  const { student, profile } = useAuthStore()
  
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 6

  // ── High Performance Data Stream ──────────────────────────────────────
  const { 
    data: result, 
    status, 
    refetch 
  } = useStudentAssignments({
    studentId: student?.id,
    tuitionCenterId: student?.tuition_center_id,
    classId: student?.class_id,
    page,
    pageSize
  })

  // Destructure data for easy access
  const assignments: any[] = result?.assignments || []
  const submissions = result?.submissions || {}
  const totalCount = result?.count || 0

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = assignments.filter(a => {
    const q = search.toLowerCase()
    const matchesSearch = a.title.toLowerCase().includes(q) || a.subject?.name.toLowerCase().includes(q)
    
    if (filter === 'pending') return matchesSearch && !submissions[a.id]
    if (filter === 'submitted') return matchesSearch && submissions[a.id] && submissions[a.id].status === 'submitted'
    if (filter === 'marked') return matchesSearch && submissions[a.id] && submissions[a.id].status === 'returned'
    
    return matchesSearch
  })

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Learning Quests</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Complete assignments to earn XP and level up!</p>
         </div>
         <div className="flex gap-4">
            <StatCard title="Completed" value={Object.keys(submissions).length} icon={<CheckCircle2 size={16} />} className="w-40 py-2" />
            <StatCard title="Pending" value={Math.max(0, totalCount - Object.keys(submissions).length)} icon={<Clock size={16} />} className="w-40 py-2" />
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
         <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <Input className="pl-12 py-6 rounded-[1.5rem]" placeholder="Search quests by title or subject..." value={search} onChange={e => setSearch(e.target.value)} />
         </div>
         <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-full md:w-48 py-6 rounded-[1.5rem]">
            <option value="all">All Quests</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="marked">Marked</option>
         </Select>
      </div>

      <SectionErrorBoundary title="Quest Board">
        {status === 'loading' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 rounded-3xl border animate-pulse space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-white/5" />
                  <div className="w-16 h-5 rounded-lg bg-white/5" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-3/4 bg-white/5 rounded-md" />
                  <div className="h-3 w-1/2 bg-white/5 rounded-md" />
                </div>
                <div className="pt-4 mt-auto">
                   <div className="h-10 w-full bg-white/5 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          <ErrorState onRetry={refetch} />
        ) : status === 'timeout' ? (
          <TimeoutState onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState 
            title={search ? "No Matches Found" : "Zero Quests Available"}
            description={search ? `No assignments found for "${search}". Try a different term.` : "Looks like you've cleared the current sector. Check back later!"}
            icon={<Zap size={40} className="text-muted opacity-20" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filtered.map((a, i) => {
               const sub = submissions[a.id]
               const isOverdue = new Date(a.due_date) < new Date() && !sub

               return (
                 <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="p-6 h-full flex flex-col group hover:scale-[1.02] transition-all relative overflow-hidden">
                       {sub?.status === 'returned' && (
                          <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-white rounded-bl-xl">
                             <CheckCircle2 size={14} />
                          </div>
                       )}
                       
                       <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-2xl ${sub ? 'bg-emerald-500/10 text-emerald-500' : isOverdue ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                             <FileText size={20} />
                          </div>
                          <Badge variant="muted">{a.subject?.name}</Badge>
                       </div>

                       <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>
                          {a.title}
                          {a.worksheet && <span className="ml-2 text-[10px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Worksheet</span>}
                       </h3>
                       <p className="text-[10px] mb-6 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                          <Clock size={12} /> {sub ? `Submitted ${formatDate(sub.submitted_at, 'short')}` : `Due: ${formatDate(a.due_date, 'long')}`}
                          {(a.max_marks || a.total_marks) && <span className="ml-auto font-black text-primary">{a.max_marks || a.total_marks} Marks</span>}
                       </p>

                       <div className="mt-auto space-y-4">
                          {sub?.status === 'returned' ? (
                             <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                <span className="text-xs font-black text-emerald-600 uppercase tracking-tighter">
                                   Marks: {sub.marks}/{a.max_marks || a.total_marks}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                                   <Zap size={10} className="fill-amber-500" /> +{20 + ((sub.marks / (a.max_marks || a.total_marks || 1)) >= 0.8 ? 50 : 0)} XP
                                </div>
                             </div>
                          ) : (
                             <div className="flex items-center gap-4 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                <span className="flex items-center gap-1 text-amber-500"><Zap size={10} className="fill-amber-500" /> +20 XP Completion</span>
                                <span className="flex items-center gap-1 text-indigo-500"><Trophy size={10} className="text-indigo-500" /> Bonus +50 XP Mastery</span>
                             </div>
                          )}
                          
                          {(() => {
                             const isLocked = a.lock_after_deadline && isOverdue
                             const btnText = sub 
                                ? (sub.status === 'returned' ? 'View Intel' : 'Review Workspace') 
                                : isLocked 
                                  ? 'CLOSED (STRICT)' 
                                  : isOverdue 
                                    ? 'Attempt Late' 
                                    : 'Accept Quest'

                             return (
                                <Link href={isLocked ? '#' : `/student/assignments/${a.id}`} className={isLocked ? 'pointer-events-none' : ''}>
                                   <Button 
                                     className={`w-full py-4 text-xs font-black rounded-xl ${isLocked ? 'opacity-50 grayscale' : ''}`}
                                     variant={sub ? 'secondary' : isLocked ? 'ghost' : 'primary'}
                                     disabled={isLocked}
                                   >
                                      {btnText} 
                                      <ArrowRight size={14} className="ml-2" />
                                   </Button>
                                </Link>
                             )
                          })()}
                       </div>
                    </Card>
                 </motion.div>
               )
             })}
          </div>
        )}
      </SectionErrorBoundary>

      {/* Pagination Controls */}
      {totalCount > pageSize && status !== 'loading' && (
         <div className="flex items-center justify-center gap-4 pt-12">
            <Button 
               variant="secondary" 
               size="sm" 
               disabled={page === 1} 
               onClick={() => handlePageChange(page - 1)}
               className="rounded-xl px-4 h-10 shadow-sm"
            >
               <ChevronRight size={16} className="rotate-180 mr-1 opacity-70" /> Previous
            </Button>
            
            <div className="flex items-center gap-2 bg-[var(--input)] p-1 rounded-2xl border border-[var(--card-border)]">
               {Array.from({ length: Math.ceil(totalCount / pageSize) }).map((_, i) => (
                  <button
                     key={i}
                     onClick={() => handlePageChange(i + 1)}
                     className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                        page === i + 1 
                        ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                        : 'text-[var(--text-muted)] hover:bg-[var(--card-border)] hover:text-[var(--text)]'
                     }`}
                  >
                     {i + 1}
                  </button>
               ))}
            </div>

            <Button 
               variant="secondary" 
               size="sm" 
               disabled={page >= Math.ceil(totalCount / pageSize)} 
               onClick={() => handlePageChange(page + 1)}
               className="rounded-xl px-4 h-10 shadow-sm"
            >
               Next <ChevronRight size={16} className="ml-1 opacity-70" />
            </Button>
         </div>
      )}
    </div>
  )
}
