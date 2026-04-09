'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Search, FileText, Clock, Users, ChevronRight, MoreVertical, Trash2, Edit, ExternalLink, ClipboardCheck } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Assignment } from '@/types/database'

export default function TeacherAssignments() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6
  
  // Delete States
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const queryClient = useQueryClient()

  // ── React Query: fetch + cache assignments ─────────────────────────────
  const fetchAssignments = async () => {
    if (!teacher?.id) return null
    // 1. Fetch assignments
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*, class:classes(name), subject:subjects(name)')
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false })
    const assignmentsList = assignmentsData ?? []

    // 2. Fetch total pending submissions
    const { count: totalPendingSubmissions } = await supabase
      .from('submissions')
      .select('id, assignment:assignments!inner(id)', { count: 'exact', head: true })
      .eq('assignment.teacher_id', teacher.id)
      .eq('status', 'submitted')

    // 3. Enrich assignments with submission and expected student counts (batched)
    const enriched = await Promise.all(assignmentsList.map(async (a: any) => {
      const [{ count: subCount }, expectedRes] = await Promise.all([
        supabase.from('submissions').select('id', { count: 'exact', head: true })
          .eq('assignment_id', a.id).neq('status', 'not_started'),
        a.audience === 'selected_students'
          ? Promise.resolve({ count: a.selected_student_ids?.length || 0 })
          : (() => {
              let q = supabase.from('students')
                .select('*, student_subjects!inner(subject_id)', { count: 'exact', head: true })
                .eq('class_id', a.class_id)
                .eq('student_subjects.subject_id', a.subject_id)
              if (a.tuition_center_id) q = q.eq('tuition_center_id', a.tuition_center_id)
              return q
            })()
      ])
      return { ...a, submission_count: subCount || 0, expected_count: expectedRes.count || 0 }
    }))

    return { assignments: enriched, submissionsCount: totalPendingSubmissions || 0 }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-assignments', teacher?.id],
    queryFn: fetchAssignments,
    enabled: !!teacher?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const assignments = data?.assignments ?? []
  const submissionsCount = data?.submissionsCount ?? 0
  const loading = isLoading && !data

  const handleDeleteOne = async () => {
    if (!deleteId) return
    setDeleting(true)
    const { error } = await supabase.from('assignments').delete().eq('id', deleteId)
    setDeleting(false)
    setDeleteId(null)
    if (error) { toast.error('Check for student submissions first.') }
    else { toast.success('Assignment deleted'); queryClient.invalidateQueries({ queryKey: ['teacher-assignments', teacher?.id] }) }
  }

  const handleDeleteAll = async () => {
    setDeleting(true)
    const { error } = await supabase.from('assignments').delete().eq('teacher_id', teacher?.id)
    setDeleting(false)
    setShowDeleteAll(false)
    if (error) { toast.error('Could not delete some assignments.') }
    else { toast.success('All assignments deleted'); queryClient.invalidateQueries({ queryKey: ['teacher-assignments', teacher?.id] }) }
  }

  const filtered = assignments.filter(a => {
    const q = search.toLowerCase()
    const matchesSearch = a.title.toLowerCase().includes(q) || a.class?.name.toLowerCase().includes(q)
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
             <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text)' }}>
               Assignments 
               <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{assignments.length} Total</span>
             </h1>
             <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage classroom tasks and evaluate submissions</p>
          </div>
         <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            {assignments.length > 0 && (
               <Button 
                variant="outline" 
                size="sm" 
                className="text-danger hover:bg-danger-light border-danger/20 w-full sm:w-auto order-2 sm:order-1"
                onClick={() => setShowDeleteAll(true)}
               >
                 <Trash2 size={16} className="mr-2" /> Delete All
               </Button>
            )}
            <Link href="/teacher/assignments/new" className="w-full sm:w-auto order-1 sm:order-2">
               <Button className="w-full sm:w-auto"><Plus size={16} className="mr-2" /> Create Assignment</Button>
            </Link>
         </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
         <StatCard title="Total Issued" value={assignments.length} icon={<FileText size={20} />} />
         <StatCard title="Published" value={assignments.filter(a => a.status === 'published').length} icon={<Users size={20} />} />
         <StatCard title="Drafts" value={assignments.filter(a => a.status === 'draft').length} icon={<Clock size={20} />} />
         <StatCard title="Submissions" value={submissionsCount} icon={<ClipboardCheck size={20} />} change={submissionsCount > 0 ? "Pending Marking" : ""} changeType="up" /> 
      </div>

      <div className="flex flex-col md:flex-row gap-4">
         <div className="flex-1">
            <Input placeholder="Search assignments..." leftIcon={<Search size={16} />} value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
         </div>
         <Select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="w-full md:w-48">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
         </Select>
      </div>

      {loading ? <SkeletonList count={6} /> : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-5 flex flex-col h-full group">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--primary)' }}>
                          <FileText size={20} />
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setDeleteId(a.id)} className="p-2 rounded-lg text-danger hover:bg-danger-light opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                          <Link href={`/teacher/assignments/${a.id}/edit`} className="p-2 rounded-lg text-muted hover:bg-input opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><Edit size={14} /></Link>
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
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100/50">
                             <Users size={12} className="text-slate-400" />
                             <span className="text-[10px] font-bold" style={{ color: 'var(--text)' }}>
                                {a.submission_count} / {a.expected_count}
                             </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/teacher/assignments/${a.id}/progress`} className="flex-1">
                              <Button size="sm" variant="secondary" className="w-full">View Progress</Button>
                          </Link>
                          {a.status === 'published' && (
                             <Link href={`/teacher/marking?assignment_id=${a.id}`} className="flex-1">
                                <Button size="sm" variant="primary" className="w-full">Mark All</Button>
                             </Link>
                          )}
                        </div>
                        {a.worksheet && (
                            <Link href={`/teacher/assignments/${a.id}/analytics`} className="w-full">
                              <Button size="sm" variant="ghost" className="w-full">Learning Analytics</Button>
                            </Link>
                        )}
                    </div>
                  </Card>
              </motion.div>
            ))}
            {filtered.length === 0 && <div className="col-span-full py-20 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No assignments found. Start by creating one!</div>}
          </div>

          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            hasNext={currentPage < totalPages}
            hasPrev={currentPage > 1}
          />
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteOne}
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment? This action cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete Assignment'}
      />

      <ConfirmModal 
        isOpen={showDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        onConfirm={handleDeleteAll}
        title="Delete ALL Assignments"
        message="Are you sure you want to delete ALL assignments you've issued? This is a permanent action and will remove all student tasks."
        confirmLabel={deleting ? 'Deleting...' : 'Yes, Delete Everything'}
      />
    </div>
  )
}
