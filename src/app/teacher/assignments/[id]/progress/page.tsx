'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, CheckCircle2, Clock, 
  AlertCircle, Search, Filter, 
  User, Mail, ArrowRight,
  BarChart3, Users, FileText
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function AssignmentProgressPage() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.id as string
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [assignment, setAssignment] = useState<any>(null)
  const [classStatus, setClassStatus] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    if (assignmentId) loadProgressData()
  }, [assignmentId])

  const loadProgressData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Assignment
      const { data: assignmentData, error: aError } = await supabase
        .from('assignments')
        .select('*, class:classes(name), subject:subjects(name)')
        .eq('id', assignmentId)
        .single()

      if (aError || !assignmentData) {
        toast.error('Assignment not found')
        router.push('/teacher/assignments')
        return
      }
      setAssignment(assignmentData)

      // 2. Determine Audience & Fetch Students with Subject Filter
      // We only want students in this class/center who are actually taking this subject
      let studentsQuery = supabase
        .from('students')
        .select(`
          id, 
          full_name, 
          admission_number, 
          email,
          student_subjects!inner(subject_id)
        `)
        .eq('class_id', assignmentData.class_id)
        .eq('student_subjects.subject_id', assignmentData.subject_id)

      if (assignmentData.tuition_center_id) {
        studentsQuery = studentsQuery.eq('tuition_center_id', assignmentData.tuition_center_id)
      }

      if (assignmentData.audience === 'selected_students' && assignmentData.selected_student_ids?.length > 0) {
        studentsQuery = studentsQuery.in('id', assignmentData.selected_student_ids)
      }

      const { data: students, error: sError } = await studentsQuery
      if (sError) throw sError

      // 3. Fetch Submissions
      const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('id, student_id, status, marks, submitted_at')
        .eq('assignment_id', assignmentId)
      
      if (subError) throw subError

      // 4. Map Progress
      const statusMap = (students ?? []).map(st => {
        const sub = (submissions ?? []).find(s => s.student_id === st.id)
        return {
          ...st,
          submissionId: sub?.id,
          status: sub?.status || 'missing',
          marks: sub?.marks,
          submittedAt: sub?.submitted_at
        }
      }).sort((a, b) => a.full_name.localeCompare(b.full_name))

      setClassStatus(statusMap)
    } catch (err: any) {
      console.error('Error loading progress:', err)
      toast.error('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }

  const filteredStatus = useMemo(() => {
    return classStatus.filter(s => {
      const q = search.toLowerCase()
      const matchesSearch = s.full_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q)
      const matchesStatus = filterStatus === 'all' || s.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [classStatus, search, filterStatus])

  const stats = useMemo(() => {
    const total = classStatus.length
    const graded = classStatus.filter(s => s.status === 'marked' || s.status === 'returned').length
    const pending = classStatus.filter(s => s.status === 'submitted').length
    const missing = classStatus.filter(s => s.status === 'missing' || s.status === 'not_started').length
    const inProgress = classStatus.filter(s => s.status === 'in_progress').length
    
    return { total, graded, pending, missing, inProgress }
  }, [classStatus])

  if (loading) return (
    <div className="p-8 space-y-8">
       <SkeletonList count={1} />
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />)}
       </div>
       <SkeletonList count={10} />
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <Link href="/teacher/assignments">
               <button className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                  <ArrowLeft size={18} />
               </button>
            </Link>
            <div>
               <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                   {assignment?.title}
                   <Badge variant="primary" className="ml-2">Progress</Badge>
                   <span className="ml-2 text-sm font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                     {(stats.graded + stats.pending)} / {stats.total} Submitted
                   </span>
                </h1>
               <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5"><Users size={14} /> {assignment?.class?.name}</span>
                  <span>•</span>
                  <span>{assignment?.subject?.name}</span>
               </div>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <Link href={`/teacher/marking?assignment_id=${assignmentId}`}>
               <Button variant="primary">
                  <ArrowRight size={16} className="mr-2" /> Marking Queue
               </Button>
            </Link>
         </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className="p-5 flex items-center gap-4 border-none bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
               <CheckCircle2 size={24} />
            </div>
            <div>
               <div className="text-2xl font-black text-emerald-700">{stats.graded}</div>
               <div className="text-[10px] uppercase font-bold text-emerald-600/60 tracking-widest">Graded</div>
            </div>
         </Card>
         <Card className="p-5 flex items-center gap-4 border-none bg-amber-500/5 hover:bg-amber-500/10 transition-colors group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
               <Clock size={24} />
            </div>
            <div>
               <div className="text-2xl font-black text-amber-700">{stats.pending}</div>
               <div className="text-[10px] uppercase font-bold text-amber-600/60 tracking-widest">Pending Marking</div>
            </div>
         </Card>
         <Card className="p-5 flex items-center gap-4 border-none bg-blue-500/5 hover:bg-blue-500/10 transition-colors group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
               <BarChart3 size={24} />
            </div>
            <div>
               <div className="text-2xl font-black text-blue-700">{stats.inProgress}</div>
               <div className="text-[10px] uppercase font-bold text-blue-600/60 tracking-widest">In Progress</div>
            </div>
         </Card>
         <Card className="p-5 flex items-center gap-4 border-none bg-rose-500/5 hover:bg-rose-500/10 transition-colors group">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
               <AlertCircle size={24} />
            </div>
            <div>
               <div className="text-2xl font-black text-rose-700">{stats.missing}</div>
               <div className="text-[10px] uppercase font-bold text-rose-600/60 tracking-widest">Missing</div>
            </div>
         </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="w-full md:w-96">
            <Input 
               placeholder="Search students..." 
               leftIcon={<Search size={16} />} 
               value={search} 
               onChange={e => setSearch(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <Select 
               value={filterStatus} 
               onChange={e => setFilterStatus(e.target.value)}
               className="w-full md:w-48"
            >
               <option value="all">All Status</option>
               <option value="missing">Missing</option>
               <option value="in_progress">In Progress</option>
               <option value="submitted">Submitted</option>
               <option value="marked">Marked</option>
               <option value="returned">Returned</option>
            </Select>
            <Button variant="ghost" onClick={loadProgressData}>
               Refresh
            </Button>
         </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-none shadow-2xl rounded-[2rem]">
         <div className="overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                     <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Details</th>
                     <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                     <th className="text-center px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Score</th>
                     <th className="text-right px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {filteredStatus.map((s, i) => (
                     <motion.tr 
                        key={s.id} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-slate-50/50 transition-colors"
                     >
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-xs text-slate-600">
                                 {s.full_name[0]}
                              </div>
                              <div>
                                 <div className="font-bold text-slate-700">{s.full_name}</div>
                                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{s.admission_number}</div>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           {s.status === 'missing' ? (
                              <Badge variant="muted" className="bg-rose-50 text-rose-500 border-rose-100">Missing</Badge>
                           ) : s.status === 'in_progress' ? (
                              <Badge variant="info" className="bg-blue-50 text-blue-500 border-blue-100">In Progress</Badge>
                           ) : s.status === 'submitted' ? (
                              <Badge variant="warning" className="animate-pulse">Needs Marking</Badge>
                           ) : (
                              <Badge variant="success">Graded</Badge>
                           )}
                        </td>
                        <td className="px-8 py-5 text-center font-black text-slate-600">
                           {s.marks !== undefined && s.marks !== null ? (
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                 {s.marks} / {assignment?.total_marks || assignment?.max_marks}
                              </span>
                           ) : '—'}
                        </td>
                        <td className="px-8 py-5 text-right font-medium">
                           {s.submissionId ? (
                              <Link href={`/teacher/marking/${s.submissionId}`}>
                                 <Button size="sm" variant={s.status === 'submitted' ? 'primary' : 'secondary'} className="rounded-xl">
                                    {s.status === 'submitted' ? 'Mark Now' : 'View Work'}
                                 </Button>
                              </Link>
                           ) : (
                              <Button size="sm" variant="ghost" disabled className="text-slate-300">
                                 No Entry
                              </Button>
                           )}
                        </td>
                     </motion.tr>
                  ))}
                  {filteredStatus.length === 0 && (
                     <tr>
                        <td colSpan={4} className="py-20 text-center">
                           <div className="flex flex-col items-center gap-4 text-slate-400">
                              <Search size={40} className="opacity-20" />
                              <p className="font-bold">No students found matching filters.</p>
                           </div>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </Card>
    </div>
  )
}
