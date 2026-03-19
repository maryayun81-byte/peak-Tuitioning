'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ClipboardCheck, Clock, CheckCircle2, 
  Search, Filter, ArrowRight, User, 
  BookOpen, FileText, AlertCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { Submission } from '@/types/database'

export default function TeacherMarkingQueue() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('submitted')

  useEffect(() => {
    if (profile) loadQueue()
  }, [profile])

  const loadQueue = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('submissions')
        .select('*, student:students(full_name, admission_number), assignment:assignments(title, max_marks)')
        .order('submitted_at', { ascending: true })
      
      setSubmissions(data ?? [])
    } finally {
      setLoading(false)
    }
  }

  // Safety timeout
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), 5000)
      return () => clearTimeout(t)
    }
  }, [loading])

  const filtered = submissions.filter(s => {
    const q = search.toLowerCase()
    const matchesSearch = s.student?.full_name.toLowerCase().includes(q) || s.assignment?.title.toLowerCase().includes(q)
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Marking Queue</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Review and grade student submissions</p>
         </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Pending" value={submissions.filter(s => s.status === 'submitted').length} icon={<Clock size={20} />} change="Urgent" changeType="down" />
         <StatCard title="Marked Today" value="8" icon={<CheckCircle2 size={20} />} change="+2" changeType="up" />
         <StatCard title="Total Submissions" value={submissions.length} icon={<FileText size={20} />} />
         <StatCard title="Avg. Score" value="82%" icon={<AlertCircle size={20} />} />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
         <Input placeholder="Search student or assignment..." leftIcon={<Search size={16} />} value={search} onChange={e => setSearch(e.target.value)} />
         <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full md:w-48">
            <option value="all">All Status</option>
            <option value="submitted">Needs Marking</option>
            <option value="marked">Graded</option>
            <option value="returned">Returned</option>
         </Select>
      </div>

      {loading ? <SkeletonList count={8} /> : (
        <Card className="overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-sm">
                 <thead>
                    <tr style={{ background: 'var(--input)', borderBottom: '1px solid var(--card-border)' }}>
                       {['Student', 'Assignment', 'Submitted', 'Score', 'Status', 'Action'].map(h => (
                         <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                       ))}
                    </tr>
                 </thead>
                 <tbody>
                    {filtered.map((s, i) => (
                      <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ borderBottom: '1px solid var(--card-border)' }}>
                         <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px]" style={{ background: 'var(--primary)', color: 'white' }}>
                                  {s.student?.full_name[0]}
                               </div>
                               <div>
                                  <div className="font-bold" style={{ color: 'var(--text)' }}>{s.student?.full_name}</div>
                                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.student?.admission_number}</div>
                               </div>
                            </div>
                         </td>
                         <td className="px-5 py-3 font-medium" style={{ color: 'var(--text)' }}>{s.assignment?.title}</td>
                         <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(s.submitted_at, 'short')}</td>
                         <td className="px-5 py-3">
                            {s.marks !== null ? (
                               <span className="font-bold text-primary">{s.marks} / {s.assignment?.max_marks}</span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                         </td>
                         <td className="px-5 py-3">
                            <Badge variant={s.status === 'submitted' ? 'warning' : 'success'}>{s.status}</Badge>
                         </td>
                         <td className="px-5 py-3">
                            <Link href={`/teacher/marking/${s.id}`}>
                               <Button size="sm" variant="secondary">Mark <ArrowRight size={12} className="ml-1" /></Button>
                            </Link>
                         </td>
                      </motion.tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No submissions found in this category.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </Card>
      )}
    </div>
  )
}
