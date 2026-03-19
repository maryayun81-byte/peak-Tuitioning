'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Eye, UserCheck, BookOpen, School, Trash2 } from 'lucide-react'
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
  const [creating, setCreating] = useState(false)
  const [curriculums, setCurriculums] = useState<any[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [page, setPage] = useState(1)
  
  // Assignment Modal States
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignForm, setAssignForm] = useState({
    class_id: '',
    subject_id: '',
    is_class_teacher: false
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeacherForm>({
    resolver: zodResolver(teacherSchema),
  })
  const PAGE_SIZE = 12

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tRes, cRes, clRes, sRes] = await Promise.all([
        supabase
          .from('teachers')
          .select(`
            *,
            teacher_teaching_map(curriculum:curriculums(name), class:classes(name), subject:subjects(name)),
            teacher_assignments(id, class:classes(name, id), subject:subjects(name, id), is_class_teacher)
          `)
          .order('full_name'),
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('classes').select('*, curriculum:curriculums(name)').order('level'),
        supabase.from('subjects').select('*').order('name'),
      ])

      setTeachers(tRes.data ?? [])
      setCurriculums(cRes.data ?? [])
      setClasses(clRes.data ?? [])
      setSubjects(sRes.data ?? [])
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
      
      // Note: We are creating the teacher record. 
      // If user_id is NOT NULL in the DB, this will fail.
      // We may need to update the schema to make user_id nullable for invitation flow.
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
      toast.error('Please select both class and subject');
      return;
    }
    setAssigning(true);
    try {
      const { error } = await supabase.from('teacher_assignments').insert({
        teacher_id: selected.id,
        class_id: assignForm.class_id,
        subject_id: assignForm.subject_id,
        is_class_teacher: assignForm.is_class_teacher
      });
      if (error) throw error;
      toast.success('Teacher assigned successfully!');
      setAssignOpen(false);
      setAssignForm({ class_id: '', subject_id: '', is_class_teacher: false });
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const removeAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    try {
      const { error } = await supabase.from('teacher_assignments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Assignment removed');
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = teachers.filter((t: any) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Teachers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{filtered.length} teachers registered</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Teacher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Teachers" value={teachers.length} icon={<UserCheck size={20} />} />
        <StatCard title="Onboarded" value={teachers.filter(t => t.onboarded).length} icon={<BookOpen size={20} />} />
        <StatCard title="Assigned" value={teachers.filter(t => (t as any).teacher_assignments?.length > 0).length} icon={<School size={20} />} />
        <StatCard title="Class Teachers" value={teachers.filter(t => (t as any).teacher_assignments?.some((a: any) => a.is_class_teacher)).length} icon={<UserCheck size={20} />} />
      </div>

      <Input
        placeholder="Search by name or email…"
        leftIcon={<Search size={16} />}
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1) }}
      />

      {loading ? <SkeletonList count={6} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((teacher, i) => {
            const t = teacher as any
            const mappings: any[] = t.teacher_teaching_map ?? []
            // Deduplicate using Set
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
                          <div className="text-sm opacity-60" style={{ color: 'var(--text)' }}>{teacher.email}</div>
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
                      {/* Admin-assigned classes */}
                      {assignedClasses.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedClasses.slice(0, 3).map((c: string) => <Badge key={c} variant="primary">{c}</Badge>)}
                          {assignedClasses.length > 3 && <Badge variant="muted">+{assignedClasses.length - 3}</Badge>}
                        </div>
                      )}
                      {/* Preferred subjects from onboarding */}
                      {prefSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 opacity-80">
                          {prefSubjects.slice(0, 3).map((s: string) => <Badge key={s} variant="info">{s}</Badge>)}
                          {prefSubjects.length > 3 && <Badge variant="muted">+{prefSubjects.length - 3}</Badge>}
                        </div>
                      )}
                      {/* Preferred curricula */}
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
                    <span>Added {formatDate(teacher.created_at)}</span>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
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
                <Button size="sm" onClick={() => { setViewOpen(false); setAssignOpen(true); }} className="h-8 text-xs">
                  <Plus size={14} className="mr-1" /> Assign New
                </Button>
              </div>

              {selected.teacher_assignments?.length > 0 ? (
                <div className="space-y-2">
                  {selected.teacher_assignments.map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--card-border)] hover:bg-[var(--input)] transition-all group">
                      <div>
                        <div className="text-sm font-bold">{assignment.class?.name}</div>
                        <div className="text-xs opacity-60">{assignment.subject?.name} {assignment.is_class_teacher && '• Class Teacher'}</div>
                      </div>
                      <button 
                         onClick={(e) => { e.stopPropagation(); removeAssignment(assignment.id); }}
                         className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
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

          <label className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--input)] cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded-md border-2 border-primary accent-primary"
              checked={assignForm.is_class_teacher}
              onChange={e => setAssignForm({ ...assignForm, is_class_teacher: e.target.checked })}
            />
            <div>
              <div className="text-sm font-black">Designate as Class Teacher</div>
              <div className="text-xs opacity-60">Allows this teacher to manage the entire class progress</div>
            </div>
          </label>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} isLoading={assigning} disabled={!assignForm.subject_id}>
              Assign Teacher
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
    </div>
  )
}
