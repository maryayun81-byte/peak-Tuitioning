'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, FileText, Clock, Users, ChevronRight, MoreVertical, Trash2, Edit, ExternalLink } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Assignment } from '@/types/database'

export default function TeacherAssignments() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    if (teacher?.id) loadAssignments()
  }, [teacher?.id])

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('assignments')
        .select('*, class:classes(name), subject:subjects(name)')
        .eq('teacher_id', teacher?.id)
        .order('created_at', { ascending: false })
      
      setAssignments(data ?? [])
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

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (error) { toast.error('Check for student submissions first.') }
    else { toast.success('Assignment deleted'); loadAssignments() }
  }

  const filtered = assignments.filter(a => {
    const q = search.toLowerCase()
    const matchesSearch = a.title.toLowerCase().includes(q) || a.class?.name.toLowerCase().includes(q)
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Assignments</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage classroom tasks and evaluate submissions</p>
         </div>
         <Link href="/teacher/assignments/new">
            <Button><Plus size={16} className="mr-2" /> Create Assignment</Button>
         </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Total Issued" value={assignments.length} icon={<FileText size={20} />} />
         <StatCard title="Published" value={assignments.filter(a => a.status === 'published').length} icon={<Users size={20} />} />
         <StatCard title="Drafts" value={assignments.filter(a => a.status === 'draft').length} icon={<Clock size={20} />} />
         <StatCard title="Submissions" value="142" icon={<Plus size={20} />} /> 
      </div>

      <div className="flex flex-col md:flex-row gap-4">
         <Input placeholder="Search assignments..." leftIcon={<Search size={16} />} value={search} onChange={e => setSearch(e.target.value)} />
         <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full md:w-48">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
         </Select>
      </div>

      {loading ? <SkeletonList count={6} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filtered.map((a, i) => (
             <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-5 flex flex-col h-full group">
                   <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--primary)' }}>
                         <FileText size={20} />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => deleteAssignment(a.id)} className="p-2 rounded-lg text-danger hover:bg-danger-light"><Trash2 size={14} /></button>
                         <Link href={`/teacher/assignments/${a.id}/edit`} className="p-2 rounded-lg text-muted hover:bg-input"><Edit size={14} /></Link>
                      </div>
                   </div>

                   <h3 className="font-bold text-base mb-1 truncate" style={{ color: 'var(--text)' }}>
                     {a.title}
                     {a.worksheet && <span className="ml-2 text-[10px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Worksheet</span>}
                   </h3>
                   <div className="flex gap-2 mb-4">
                      <Badge variant="muted">{a.class?.name}</Badge>
                      <Badge variant="info">{a.subject?.name}</Badge>
                      {a.total_marks && <Badge variant="muted">{a.total_marks} Marks</Badge>}
                   </div>

                   <div className="space-y-3 pt-4 mt-auto" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <div className="flex justify-between items-center">
                         <Badge variant={a.status === 'published' ? 'success' : a.status === 'draft' ? 'warning' : 'danger'}>
                            {a.status}
                         </Badge>
                         <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Due: {formatDate(a.due_date, 'short')}</span>
                      </div>
                      <div className="flex gap-2">
                         <Link href={`/teacher/marking?assignment_id=${a.id}`} className="flex-1">
                            <Button size="sm" variant="secondary" className="w-full">Mark Submissions</Button>
                         </Link>
                         {a.worksheet && (
                            <Link href={`/teacher/assignments/${a.id}/analytics`} className="flex-1">
                               <Button size="sm" variant="ghost" className="w-full">Analytics</Button>
                            </Link>
                         )}
                      </div>
                   </div>
                </Card>
             </motion.div>
           ))}
           {filtered.length === 0 && <div className="col-span-full py-20 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No assignments found. Start by creating one!</div>}
        </div>
      )}
    </div>
  )
}
