'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Edit, Trash2, GraduationCap, Eye, Copy } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  generateAdmissionNumber, generateTempPassword, formatDate
} from '@/lib/utils'
import type { Student, Class, Curriculum } from '@/types/database'
import { createStudentUser } from '@/app/actions/student'

const studentSchema = z.object({
  full_name: z.string().min(2),
  class_id: z.string().uuid(),
  curriculum_id: z.string().uuid(),
})
type StudentForm = z.infer<typeof studentSchema>

export default function AdminStudents() {
  const supabase = getSupabaseBrowserClient()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState<Student | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
  })

  const curriculumId = watch('curriculum_id')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      console.time('StudentsLoad')
      console.log('Loading students data...')
      
      console.log('Fetching students...')
      const sRes = await supabase
          .from('students')
          .select(`
            *,
            class:classes(id, name),
            curriculum:curriculums(id, name)
          `)
          .order('created_at', { ascending: false })
      console.log('Students fetched:', sRes)

      console.log('Fetching classes...')
      const cRes = await supabase.from('classes').select('*, curriculum:curriculums(id, name)').order('name')
      console.log('Classes fetched:', cRes)

      console.log('Fetching curriculums...')
      const curRes = await supabase.from('curriculums').select('*').order('name')
      console.log('Curriculums fetched:', curRes)
      
      if (sRes.error) {
        console.error('Students fetch error:', sRes.error)
        toast.error('DB Error: ' + sRes.error.message)
      }
      
      setStudents(sRes.data ?? [])
      setClasses(cRes.data ?? [])
      setCurriculums(curRes.data ?? [])
      console.log(`Loaded ${sRes.data?.length ?? 0} students.`)
      console.timeEnd('StudentsLoad')
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  )

  const paginatedStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE)

  const filteredClasses = curriculumId
    ? classes.filter(c => c.curriculum_id === curriculumId)
    : classes

  const onSubmit = async (data: StudentForm) => {
    setLoading(true)
    try {
      // Get max admission number to prevent collisions after deletions
      const { data: lastStudents } = await supabase
        .from('students')
        .select('admission_number')
        .order('admission_number', { ascending: false })
        .limit(1)
      
      let nextNum = 1
      if (lastStudents && lastStudents.length > 0) {
        const parts = lastStudents[0].admission_number.split('-')
        const lastSeq = parseInt(parts[parts.length - 1])
        if (!isNaN(lastSeq)) nextNum = lastSeq + 1
      }
      
      const tempPwd = generateTempPassword()

      let success = false
      let authProvision: any = null
      let currentNextNum = nextNum
      let finalAdmissionNumber = ''

      // Retry loop to handle "ghost" Auth users with the same admission number
      // We try up to 50 increments to find a clear spot
      while (!success && currentNextNum < nextNum + 50) {
        finalAdmissionNumber = generateAdmissionNumber(currentNextNum)
        console.log(`Attempting to provision student with admission: ${finalAdmissionNumber}`)
        
        authProvision = await createStudentUser(
          finalAdmissionNumber, 
          `${finalAdmissionNumber.toLowerCase()}@student.peak.edu`, 
          tempPwd, 
          data.full_name
        )

        if (authProvision.success) {
          success = true
        } else if (
          authProvision.error?.includes('already been registered') || 
          authProvision.code === 'email_exists'
        ) {
          console.warn(`Admission ${finalAdmissionNumber} already exists in Auth, skipping...`)
          currentNextNum++
        } else {
          // Other error, break and show
          toast.error(authProvision.error || 'Auth provisioning failed')
          setLoading(false)
          return
        }
      }

      if (!success) {
        toast.error('Failed to find a unique admission number. Please try again or check Auth logs.')
        setLoading(false)
        return
      }

      // 2. Insert Student Database Record
      const { error } = await supabase.from('students').insert({
        user_id: authProvision.user_id,
        full_name: data.full_name,
        class_id: data.class_id,
        curriculum_id: data.curriculum_id,
        admission_number: finalAdmissionNumber,
        temp_password: tempPwd,
        onboarded: false,
        created_by_admin: true,
      })

      if (error) {
        console.error('DB Insert Error:', error)
        toast.error('Failed to create student record: ' + error.message)
        setLoading(false)
        return
      }

      toast.success(`Student created! Admission: ${finalAdmissionNumber} | Temp password: ${tempPwd}`, { duration: 8000 })
      reset()
      setAddOpen(false)
      loadData()
    } catch {
      toast.error('Something went wrong')
      setLoading(false)
    }
  }

  const deleteStudent = async () => {
    if (!selected) return
    const { error } = await supabase.from('students').delete().eq('id', selected.id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Student removed')
    loadData()
    setSelected(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Students</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {filteredStudents.length} students enrolled
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Student
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by name or admission number…"
        leftIcon={<Search size={16} />}
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1) }}
      />

      {/* Grid view of Students */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <SkeletonList count={3} />
        </div>
      ) : (
        <div className="space-y-6">
           {paginatedStudents.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No students found matching your criteria.</div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {paginatedStudents.map((student, i) => (
                    <motion.div
                       key={student.id}
                       initial={{ opacity: 0, y: 15 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: i * 0.05 }}
                    >
                       <Card className="p-6 h-full flex flex-col justify-between hover:border-emerald-500/30 transition-colors border border-[var(--card-border)] bg-[var(--card)] relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
                          
                          <div className="flex items-start justify-between mb-4">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shadow-inner shadow-black/10" style={{ background: 'var(--primary)', color: 'white' }}>
                                   {student.full_name[0]}
                                </div>
                                <div>
                                   <div className="font-bold text-lg leading-tight" style={{ color: 'var(--text)' }}>{student.full_name}</div>
                                   <Badge variant={student.user_id ? 'success' : 'warning'} className="mt-1 scale-90 origin-left">
                                      {student.user_id ? 'Registered' : 'Pending'}
                                   </Badge>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-3 flex-1 mb-6">
                             <div className="flex justify-between items-center bg-[var(--input)] p-2 rounded-lg border border-[var(--card-border)]">
                                <span className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Admission No.</span>
                                <div className="flex items-center gap-2">
                                   <code className="text-sm font-black font-mono" style={{ color: 'var(--text)' }}>{student.admission_number}</code>
                                   <button onClick={() => { navigator.clipboard.writeText(student.admission_number); toast.success('Admission Copied!') }} className="opacity-50 hover:opacity-100 transition-opacity">
                                      <Copy size={14} style={{ color: 'var(--text-muted)' }} />
                                   </button>
                                </div>
                             </div>

                             <div className="flex justify-between items-center bg-[var(--input)] p-2 rounded-lg border border-[var(--card-border)]">
                                <span className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Password</span>
                                <div className="flex items-center gap-2">
                                   <code className="text-xs px-2 py-0.5 rounded text-amber-600 bg-amber-500/10 font-bold font-mono">
                                      {student.temp_password || '********'}
                                   </code>
                                   {student.temp_password && (
                                     <button onClick={() => { navigator.clipboard.writeText(student.temp_password!); toast.success('Password Copied!') }} className="opacity-50 hover:opacity-100 transition-opacity text-amber-600">
                                        <Copy size={14} />
                                     </button>
                                   )}
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-2 mt-4">
                                <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                                   <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Class</p>
                                   <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{(student.class as any)?.name ?? '—'}</p>
                                </div>
                                <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                                   <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Curriculum</p>
                                   <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{(student.curriculum as any)?.name ?? '—'}</p>
                                </div>
                             </div>
                          </div>

                          <div className="flex gap-2">
                             <Button
                               variant="secondary"
                               className="flex-1 text-xs"
                               onClick={() => { setSelected(student); setViewOpen(true) }}
                             >
                               <Eye size={14} className="mr-2" /> Details
                             </Button>
                             <Button
                               variant="outline"
                               className="text-red-500 hover:bg-red-50 border-red-100"
                               onClick={() => { setSelected(student); setDeleteOpen(true) }}
                             >
                               <Trash2 size={14} />
                             </Button>
                          </div>
                       </Card>
                    </motion.div>
                 ))}
              </div>
           )}

           {totalPages > 1 && (
             <div className="flex items-center justify-between mt-8 p-4 bg-[var(--card)] rounded-xl border border-[var(--card-border)]">
                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                   Showing page <span style={{ color: 'var(--text)' }}>{page}</span> of <span style={{ color: 'var(--text)' }}>{totalPages}</span>
                </span>
                <div className="flex gap-2">
                   <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      Previous
                   </Button>
                   <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      Next
                   </Button>
                </div>
             </div>
           )}
        </div>
      )}

      {/* Add Student Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Student">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" placeholder="Student full name" error={errors.full_name?.message} {...register('full_name')} />
          <Select label="Curriculum" error={errors.curriculum_id?.message} {...register('curriculum_id')}>
            <option value="">Select curriculum</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Class" error={errors.class_id?.message} {...register('class_id')}>
            <option value="">Select class</option>
            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(79,140,255,0.1)', color: '#4F8CFF' }}>
            💡 Admission number and temporary password will be auto-generated. Share these with the student to log in.
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">Create Student</Button>
          </div>
        </form>
      </Modal>

      {/* View Student Modal */}
      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Student Details" size="md">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--input)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black" style={{ background: 'var(--primary)', color: 'white' }}>
                {selected.full_name[0]}
              </div>
              <div>
                <div className="text-lg font-black" style={{ color: 'var(--text)' }}>{selected.full_name}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{selected.school_name ?? 'School not set'}</div>
              </div>
            </div>
            {[
              { label: 'Admission Number', value: selected.admission_number },
              { label: 'Class', value: (selected.class as any)?.name ?? '—' },
              { label: 'Curriculum', value: (selected.curriculum as any)?.name ?? '—' },
              { label: 'Account Status', value: selected.user_id ? '✅ Registered' : '⏳ Pending Registration' },
              { label: 'Onboarded', value: selected.onboarded ? '✅ Yes' : '❌ No' },
              { label: 'Temp Password', value: selected.temp_password ?? '—' },
              { label: 'Created', value: formatDate(selected.created_at, 'long') },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{value}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteStudent}
        title="Delete Student"
        message={`Are you sure you want to remove ${selected?.full_name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
