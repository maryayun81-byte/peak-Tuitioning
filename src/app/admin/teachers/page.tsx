'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search,Star, Eye, UserCheck, BookOpen, School, Trash2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { formatDate, generateTempPassword } from '@/lib/utils'
import type { Teacher, Class, Subject } from '@/types/database'

const teacherSchema = z.object({
  full_name: z.string().min(2, 'Full name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
})
type TeacherForm = z.infer<typeof teacherSchema>

export default function AdminTeachers() {
  const supabase = getSupabaseBrowserClient()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [curriculums, setCurriculums] = useState<any[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [centers, setCenters] = useState<any[]>([])
  
  const [filterClass, setFilterClass] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterCenter, setFilterCenter] = useState('')
  
  const [page, setPage] = useState(1)
  
  // Assignment Modal States
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignClassTeacherOpen, setAssignClassTeacherOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignForm, setAssignForm] = useState({
    class_id: '',
    subject_id: '',
    tuition_center_id: '',
    is_class_teacher: false
  })
  const [assignClassTeacherForm, setAssignClassTeacherForm] = useState({
    class_id: '',
    tuition_center_id: ''
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeacherForm>({
    resolver: zodResolver(teacherSchema),
  })
  const PAGE_SIZE = 12

  useEffect(() => { 
    loadData() 
    // Safety Break: Never block admin for more than 5s
    const timer = setTimeout(() => setLoading(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const fetchAuxData = async () => {
    const [curRes, classRes, subRes, centerRes] = await Promise.all([
      supabase.from('curriculums').select('*').order('name'),
      supabase.from('classes').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('tuition_centers').select('*').order('name')
    ])
    if (curRes.data) setCurriculums(curRes.data)
    if (classRes.data) setClasses(classRes.data)
    if (subRes.data) setSubjects(subRes.data)
    if (centerRes.data) setCenters(centerRes.data)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [tRes] = await Promise.all([
        supabase
          .from('teachers')
          .select(`
            *,
            teacher_teaching_map(curriculum:curriculums(name), class:classes(name), subject:subjects(name)),
            teacher_assignments(id, class_id, subject_id, tuition_center_id, class:classes(name, id), subject:subjects(name, id), center:tuition_centers(name, id), is_class_teacher)
          `)
          .order('full_name'),
        fetchAuxData()
      ])

      setTeachers(tRes.data ?? [])
    } catch (e) {
      console.error('Failed to load teachers and metadata:', e)
      toast.error('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: TeacherForm) => {
    setCreating(true)
    try {
      const tempPwd = generateTempPassword()
      
      const { error } = await supabase.from('teachers').insert({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        onboarded: false,
      })

      if (error) {
        console.error('Teacher creation error:', error)
        if (error.code === '23502') { // Not-null violation
          toast.error('Failed: Database constraint. Please run the SQL fix provided in the walkthrough.')
        } else {
          toast.error('Failed to create teacher: ' + error.message)
        }
        return
      }

      toast.success(`Teacher record created! Temporary password: ${tempPwd}`, { duration: 6000 })
      reset()
      setAddOpen(false)
      loadData()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  const handleAssign = async () => {
    if (!selected || !assignForm.class_id || !assignForm.subject_id) {
      toast.error('Please select a subject');
      return;
    }
    setAssigning(true);
    try {
      const { error } = await supabase.from('teacher_assignments').insert({
        teacher_id: selected.id,
        class_id: assignForm.class_id,
        subject_id: assignForm.subject_id,
        tuition_center_id: assignForm.tuition_center_id || null,
        is_class_teacher: false
      });
      if (error) throw error;
      toast.success('Teacher assigned successfully!');
      setAssignOpen(false);
      setAssignForm({ class_id: '', subject_id: '', tuition_center_id: '', is_class_teacher: false });
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignClassTeacher = async () => {
    if (!selected || !assignClassTeacherForm.class_id) {
      toast.error('Please select a class');
      return;
    }
    setAssigning(true);
    try {
      const { error } = await supabase.from('teacher_assignments').insert({
        teacher_id: selected.id,
        class_id: assignClassTeacherForm.class_id,
        subject_id: null,
        tuition_center_id: assignClassTeacherForm.tuition_center_id || null,
        is_class_teacher: true
      });
      if (error) throw error;
      toast.success('Assigned as Class Teacher successfully!');
      setAssignClassTeacherOpen(false);
      setAssignClassTeacherForm({ class_id: '', tuition_center_id: '' });
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const toggleClassTeacher = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('teacher_assignments').update({ is_class_teacher: !currentStatus }).eq('id', id);
      if (error) throw error;
      toast.success(!currentStatus ? 'Promoted to Class Teacher' : 'Class Teacher status removed');
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    try {
      const { error } = await supabase.from('teacher_assignments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Assignment removed');
      loadData();
      setViewOpen(false); // Close modal to refresh data cleanly
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteTeacher = async () => {
    if (!teacherToDelete) return;
    try {
      const { error } = await supabase.from('teachers').delete().eq('id', teacherToDelete.id);
      if (error) throw error;
      toast.success('Teacher deleted successfully');
      setDeleteOpen(false);
      setTeacherToDelete(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete teacher');
    }
  };

  const filtered = teachers.filter((t: any) => {
    const matchesSearch = t.full_name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
    const matchesClass = filterClass ? t.teacher_assignments?.some((a:any) => a.class_id === filterClass) : true
    const matchesSubject = filterSubject ? t.teacher_assignments?.some((a:any) => a.subject_id === filterSubject) : true
    const matchesCenter = filterCenter ? t.teacher_assignments?.some((a:any) => a.tuition_center_id === filterCenter) : true
    return matchesSearch && matchesClass && matchesSubject && matchesCenter
  })
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Teachers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{filtered.length} teachers matching criteria</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="whitespace-nowrap">
          <Plus size={16} /> Add Teacher
        </Button>
      </div>

      <div className="flex flex-col md:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-none outline-none font-medium h-full"
            style={{ background: 'var(--input)', color: 'var(--text)' }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        
        <select 
          className="px-4 py-2.5 rounded-xl border-none outline-none font-medium text-sm sm:w-auto w-full" 
          style={{ background: 'var(--input)', color: 'var(--text)' }}
          value={filterClass} 
          onChange={e => { setFilterClass(e.target.value); setPage(1); }}
        >
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select 
          className="px-4 py-2.5 rounded-xl border-none outline-none font-medium text-sm sm:w-auto w-full" 
          style={{ background: 'var(--input)', color: 'var(--text)' }}
          value={filterSubject} 
          onChange={e => { setFilterSubject(e.target.value); setPage(1); }}
        >
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select 
          className="px-4 py-2.5 rounded-xl border-none outline-none font-medium text-sm sm:w-auto w-full" 
          style={{ background: 'var(--input)', color: 'var(--text)' }}
          value={filterCenter} 
          onChange={e => { setFilterCenter(e.target.value); setPage(1); }}
        >
          <option value="">All Centers</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Teachers" value={teachers.length} icon={<UserCheck size={20} />} />
        <StatCard title="Onboarded" value={teachers.filter(t => t.onboarded).length} icon={<BookOpen size={20} />} />
        <StatCard title="Assigned" value={teachers.filter(t => (t as any).teacher_assignments?.length > 0).length} icon={<School size={20} />} />
        <StatCard title="Class Teachers" value={teachers.filter(t => (t as any).teacher_assignments?.some((a: any) => a.is_class_teacher)).length} icon={<UserCheck size={20} />} />
      </div>

      {loading ? <SkeletonList count={6} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((teacher, i) => {
            const t = teacher as any
            const mappings: any[] = t.teacher_teaching_map ?? []
            const curricula = [...new Set(mappings.map((m: any) => m.curriculum?.name).filter(Boolean))]
            const prefClasses = [...new Set(mappings.map((m: any) => m.class?.name).filter(Boolean))]
            const prefSubjects = [...new Set(mappings.map((m: any) => m.subject?.name).filter(Boolean))]
            const assignedClasses = t.teacher_assignments?.map((a: any) => a.class?.name).filter(Boolean) ?? []
            const isClassTeacher = t.teacher_assignments?.some((a: any) => a.is_class_teacher) ?? false

            return (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card 
                  className="p-6 h-full flex flex-col justify-between hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden" 
                  onClick={() => { setSelected(t); setViewOpen(true) }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none group-hover:bg-primary/10 transition-colors" />
                  
                  <div>
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner shadow-black/5" style={{ background: 'var(--primary)', color: 'white' }}>
                          {teacher.full_name[0]}
                        </div>
                        <div>
                          <div className="font-black text-lg" style={{ color: 'var(--text)' }}>{teacher.full_name}</div>
                          <div className="text-sm opacity-60 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                             <span>{teacher.phone || teacher.email}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={teacher.onboarded ? 'success' : 'warning'} className="mt-1">
                        {teacher.onboarded ? 'Active' : 'Pending'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-3 rounded-2xl bg-[var(--input)] border border-[var(--card-border)]">
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-50">Assigned</div>
                        <div className="text-sm font-black truncate">{assignedClasses.length} Classes</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[var(--input)] border border-[var(--card-border)]">
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-50">Role</div>
                        <div className="text-sm font-black truncate">{isClassTeacher ? 'Class Teacher' : 'Teacher'}</div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {assignedClasses.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedClasses.slice(0, 3).map((c: string) => <Badge key={c} variant="primary">{c}</Badge>)}
                          {assignedClasses.length > 3 && <Badge variant="muted">+{assignedClasses.length - 3}</Badge>}
                        </div>
                      )}
                      {prefSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 opacity-80">
                          {prefSubjects.slice(0, 3).map((s: string) => <Badge key={s} variant="info">{s}</Badge>)}
                          {prefSubjects.length > 3 && <Badge variant="muted">+{prefSubjects.length - 3}</Badge>}
                        </div>
                      )}
                      {curricula.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 opacity-60">
                          {curricula.map((c: string) => <Badge key={c} variant="muted">{c}</Badge>)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--card-border)] flex items-center justify-between text-xs font-bold opacity-60">
                    <div className="flex items-center gap-1.5">
                      <Eye size={14} /> View Profile
                    </div>
                    <div className="flex items-center gap-3">
                       <span>{formatDate(teacher.created_at)}</span>
                       <button
                         onClick={(e) => { e.stopPropagation(); setTeacherToDelete(t); setDeleteOpen(true); }}
                         className="p-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 p-4 bg-[var(--card)] rounded-xl border border-[var(--card-border)] gap-4">
          <span className="text-sm font-medium text-center sm:text-left" style={{ color: 'var(--text-muted)' }}>
            Showing page <span style={{ color: 'var(--text)' }}>{page}</span> of <span style={{ color: 'var(--text)' }}>{totalPages}</span>
          </span>
          <div className="flex gap-2 justify-center sm:justify-end w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* View Teacher Modal */}
      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Teacher Profile" size="md">
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-5 rounded-2xl" style={{ background: 'var(--input)' }}>
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black shadow-lg shadow-primary/20" style={{ background: 'var(--primary)', color: 'white' }}>
                {selected.full_name[0]}
              </div>
              <div className="flex-1">
                <div className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>{selected.full_name}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selected.onboarded ? 'success' : 'warning'}>
                    {selected.onboarded ? 'Active Teacher' : 'Pending Onboarding'}
                  </Badge>
                  {selected.teacher_assignments?.some((a: any) => a.is_class_teacher) && (
                    <Badge variant="info">Class Teacher</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted opacity-50 mb-1">Email</div>
                <div className="text-sm font-bold truncate">{selected.email}</div>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted opacity-50 mb-1">Phone</div>
                <div className="text-sm font-bold truncate">{selected.phone || 'N/A'}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider opacity-60">Assignments</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setViewOpen(false); setAssignClassTeacherOpen(true); }} className="h-8 text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none">
                    <Star size={14} className="mr-1" /> Assign Class Teacher
                  </Button>
                  <Button size="sm" onClick={() => { setViewOpen(false); setAssignOpen(true); }} className="h-8 text-xs">
                    <Plus size={14} className="mr-1" /> Assign New
                  </Button>
                </div>
              </div>

              {selected.teacher_assignments?.length > 0 ? (
                <div className="space-y-2">
                  {selected.teacher_assignments.map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--card-border)] hover:bg-[var(--input)] transition-all group">
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                           {assignment.class?.name}
                           {assignment.is_class_teacher && <span className="text-[10px] uppercase font-black tracking-widest text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Class Teacher</span>}
                        </div>
                        <div className="text-xs opacity-60">
                           {assignment.subject?.name || 'No Specific Subject'} {assignment.center?.name ? `• ${assignment.center.name}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                         <button 
                            onClick={(e) => { e.stopPropagation(); toggleClassTeacher(assignment.id, assignment.is_class_teacher); }}
                            className={`p-2 rounded-lg transition-all ${assignment.is_class_teacher ? 'text-amber-500 hover:bg-amber-100' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'} opacity-100`}
                            title={assignment.is_class_teacher ? "Remove Class Teacher Status" : "Make Class Teacher"}
                         >
                            <Star size={16} fill={assignment.is_class_teacher ? "currentColor" : "none"} />
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); removeAssignment(assignment.id); }}
                            className="p-2 rounded-lg opacity-100 hover:bg-red-50 text-red-500 transition-all"
                            title="Remove completely"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 rounded-2xl border-2 border-dashed border-[var(--card-border)] text-sm opacity-40 italic">
                  No active assignments found
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--card-border)] flex justify-between text-xs text-muted">
               <span>Teacher ID: {selected.id.slice(0, 8)}...</span>
               <span>Joined {formatDate(selected.created_at, 'long')}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Modal */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title={`Assign ${selected?.full_name}`} size="md">
        <div className="space-y-5">
          {/* Teacher preferences hint */}
          {selected && (() => {
            const maps: any[] = selected.teacher_teaching_map ?? []
            const prefCurricula = [...new Set(maps.map((m: any) => m.curriculum?.name).filter(Boolean))]
            const prefSubjectNames = [...new Set(maps.map((m: any) => m.subject?.name).filter(Boolean))]
            const prefClassNames = [...new Set(maps.map((m: any) => m.class?.name).filter(Boolean))]
            if (!maps.length) return null
            return (
              <div className="p-4 rounded-2xl text-xs space-y-2" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)' }}>
                <div className="font-black text-[11px] uppercase tracking-widest" style={{ color: '#0EA5E9' }}>📋 Onboarding Preferences</div>
                {prefCurricula.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="opacity-50 shrink-0">Curricula:</span>
                    {prefCurricula.map(c => <Badge key={c} variant="muted">{c}</Badge>)}
                  </div>
                )}
                {prefSubjectNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="opacity-50 shrink-0">Subjects:</span>
                    {prefSubjectNames.map(s => <Badge key={s} variant="info">{s}</Badge>)}
                  </div>
                )}
                {prefClassNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="opacity-50 shrink-0">Classes:</span>
                    {prefClassNames.map(c => <Badge key={c} variant="primary">{c}</Badge>)}
                  </div>
                )}
              </div>
            )
          })()}

          <Select
            label="Tuition Center"
            value={assignForm.tuition_center_id}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignForm({ ...assignForm, tuition_center_id: e.target.value })}
          >
            <option value="">All Centers (Default)</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <Select
            label="Select Class"
            value={assignForm.class_id}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignForm({ ...assignForm, class_id: e.target.value, subject_id: '' })}
          >
            <option value="">Choose a class...</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.curriculum?.name ? `${c.curriculum.name} — ` : ''}{c.name}</option>
            ))}
          </Select>

          <Select
            label="Select Subject"
            value={assignForm.subject_id}
            disabled={!assignForm.class_id}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignForm({ ...assignForm, subject_id: e.target.value })}
          >
            <option value="">{!assignForm.class_id ? 'Select a class first...' : 'Choose a subject...'}</option>
            {subjects
              .filter((s: any) => {
                if (!assignForm.class_id) return false;
                const assignedClass = classes.find((c: any) => c.id === assignForm.class_id);
                return s.class_id === assignForm.class_id || (assignedClass && s.curriculum_id === assignedClass.curriculum_id && !s.class_id);
              })
              .map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
          </Select>

          {assignForm.class_id && subjects.filter((s: any) => {
             const assignedClass = classes.find((c: any) => c.id === assignForm.class_id);
             return s.class_id === assignForm.class_id || (assignedClass && s.curriculum_id === assignedClass.curriculum_id && !s.class_id);
          }).length === 0 && (
            <div className="text-xs p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
              ⚠️ No subjects found for this class. Make sure subjects are configured for this class in the Subjects section.
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} isLoading={assigning} disabled={!assignForm.subject_id}>
              Assign Teacher
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Class Teacher Explicit Modal */}
      <Modal isOpen={assignClassTeacherOpen} onClose={() => setAssignClassTeacherOpen(false)} title={`Assign ${selected?.full_name} as Class Teacher`} size="sm">
        <div className="space-y-5">
          <Select
            label="Tuition Center"
            value={assignClassTeacherForm.tuition_center_id}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignClassTeacherForm({ ...assignClassTeacherForm, tuition_center_id: e.target.value })}
          >
            <option value="">All Centers (Default)</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <Select
            label="Select Class"
            value={assignClassTeacherForm.class_id}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignClassTeacherForm({ ...assignClassTeacherForm, class_id: e.target.value })}
          >
            <option value="">Choose a class...</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.curriculum?.name ? `${c.curriculum.name} — ` : ''}{c.name}</option>
            ))}
          </Select>
          
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs">
            <Star size={14} className="inline mr-1" /> This will give the teacher administrative oversight for the chosen class.
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setAssignClassTeacherOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignClassTeacher} isLoading={assigning} disabled={!assignClassTeacherForm.class_id} className="bg-amber-500 hover:bg-amber-600 text-white border-none">
              Assign Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Teacher Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Teacher">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input 
            label="Full Name" 
            placeholder="Teacher full name" 
            error={errors.full_name?.message} 
            {...register('full_name')} 
          />
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="teacher@example.com" 
            error={errors.email?.message} 
            {...register('email')} 
          />
          <Input 
            label="Phone Number (optional)" 
            type="tel" 
            placeholder="+254 7XX XXX XXX" 
            {...register('phone')} 
          />
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}>
            💡 A temporary password will be generated. The teacher will need to register with their email to set a permanent password.
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={creating}>Create Teacher</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Teacher Modal */}
      {deleteOpen && (
         <Modal isOpen={deleteOpen} onClose={() => { setDeleteOpen(false); setTeacherToDelete(null); }} title="Delete Teacher" size="sm">
            <div className="space-y-4">
               <p className="text-sm" style={{ color: 'var(--text)' }}>
                 Are you sure you want to delete <strong>{teacherToDelete?.full_name}</strong>? This action cannot be undone and will remove all their assignments and access.
               </p>
               <div className="flex gap-3 justify-end pt-2">
                 <Button variant="secondary" onClick={() => { setDeleteOpen(false); setTeacherToDelete(null); }}>Cancel</Button>
                 <Button onClick={deleteTeacher} className="bg-red-500 hover:bg-red-600 text-white border-none shadow-xl shadow-red-500/20">
                   Delete Teacher
                 </Button>
               </div>
            </div>
         </Modal>
      )}

    </div>
  )
}
