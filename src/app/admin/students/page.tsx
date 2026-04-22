'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Edit, Trash2, GraduationCap, Eye, Copy, X } from 'lucide-react'
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
  full_name: z.string().optional(),
  class_id: z.string().uuid(),
  curriculum_id: z.string().uuid(),
  tuition_center_id: z.string().optional().nullable(),
})
type StudentForm = z.infer<typeof studentSchema>

export default function AdminStudents() {
  const supabase = getSupabaseBrowserClient()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [centers, setCenters] = useState<any[]>([])
  
  const [filterClass, setFilterClass] = useState('')
  const [filterCurriculum, setFilterCurriculum] = useState('')
  const [filterCenter, setFilterCenter] = useState('')
  
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

  const watchCurriculum = watch('curriculum_id')

  useEffect(() => { 
    loadData()
    // Safety Break: Never block admin for more than 5s
    const timer = setTimeout(() => setLoading(false), 5000)
    return () => clearTimeout(timer)
  }, [])

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
            curriculum:curriculums(id, name),
            center:tuition_centers(id, name),
            student_subjects(id, subject:subjects(name))
          `)
          .order('created_at', { ascending: false })
      console.log('Students fetched:', sRes)

      console.log('Fetching classes...')
      const cRes = await supabase.from('classes').select('*, curriculum:curriculums(id, name)').order('name')
      console.log('Classes fetched:', cRes)

      console.log('Fetching curriculums...')
      const curRes = await supabase.from('curriculums').select('*').order('name')
      console.log('Curriculums fetched:', curRes)
      
      console.log('Fetching centers...')
      const cenRes = await supabase.from('tuition_centers').select('*').order('name')

      if (sRes.error) {
        console.error('Students fetch error:', sRes.error)
        toast.error('DB Error: ' + sRes.error.message)
      }
      
      setStudents(sRes.data ?? [])
      setClasses(cRes.data ?? [])
      setCurriculums(curRes.data ?? [])
      setCenters(cenRes.data ?? [])
      console.log(`Loaded ${sRes.data?.length ?? 0} students.`)
      console.timeEnd('StudentsLoad')
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || (s.admission_number || '').toLowerCase().includes(search.toLowerCase())
    const matchesClass = filterClass ? s.class_id === filterClass : true
    const matchesCurr = filterCurriculum ? s.curriculum_id === filterCurriculum : true
    const matchesCenter = filterCenter ? s.tuition_center_id === filterCenter : true
    return matchesSearch && matchesClass && matchesCurr && matchesCenter
  })
  const paginatedStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE))

  const filteredClasses = curriculums.length > 0 
    ? classes.filter(c => c.curriculum_id === watchCurriculum)
    : classes

  const [isBulk, setIsBulk] = useState(false)
  const [bulkRows, setBulkRows] = useState<string[]>([''])

  const openAddModal = (isBulkMode: boolean) => {
    setIsBulk(isBulkMode)
    if (isBulkMode) setBulkRows([''])
    reset({
      full_name: '',
      curriculum_id: '',
      class_id: '',
      tuition_center_id: '',
    })
    setAddOpen(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      let names: string[] = []
      
      if (file.name.endsWith('.csv')) {
        // Simple CSV parsing (split by comma or line)
        names = text.split(/\r?\n/).map(line => {
          const parts = line.split(',')
          return parts[0].trim() // Assume first column is name
        }).filter(name => name.length > 2 && name.toLowerCase() !== 'name' && name.toLowerCase() !== 'full name')
      } else {
        // Plain text parsing (one per line)
        names = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 2)
      }
      
      if (names.length > 0) {
        setBulkRows([...bulkRows.filter(r => r.trim() !== ''), ...names])
        toast.success(`Imported ${names.length} names from ${file.name}`)
      }
    }
    reader.readAsText(file)
  }

  const addBulkRow = () => setBulkRows([...bulkRows, ''])
  const removeBulkRow = (index: number) => {
    const newRows = [...bulkRows]
    newRows.splice(index, 1)
    setBulkRows(newRows.length ? newRows : [''])
  }
  const updateBulkRow = (index: number, val: string) => {
    const newRows = [...bulkRows]
    newRows[index] = val
    setBulkRows(newRows)
  }

  const onBulkSubmit = async (data: StudentForm) => {
    const names = bulkRows.map(r => r.trim()).filter(r => r.length > 2)
    if (names.length === 0) {
      toast.error('Please enter at least one valid name')
      return
    }

    setLoading(true)
    let createdCount = 0
    let lastAdmission = ''

    try {
      // Get current max admission index
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

      let currentNextNum = nextNum

      for (const name of names) {
        let success = false
        let authProvision: any = null
        let finalAdmissionNumber = ''
        const tempPwd = generateTempPassword()

        // Reuse the collision prevention logic
        while (!success && currentNextNum < nextNum + 200) {
          finalAdmissionNumber = generateAdmissionNumber(currentNextNum)
          authProvision = await createStudentUser(
            finalAdmissionNumber, 
            `${finalAdmissionNumber.toLowerCase()}@student.peak.edu`, 
            tempPwd, 
            name
          )

          if (authProvision.success) {
            success = true
          } else {
            currentNextNum++
          }
        }

        if (success) {
          await supabase.from('students').insert({
            user_id: authProvision.user_id,
            full_name: name,
            class_id: data.class_id,
            curriculum_id: data.curriculum_id,
            tuition_center_id: data.tuition_center_id || null,
            admission_number: finalAdmissionNumber,
            temp_password: tempPwd,
            onboarded: false,
            created_by_admin: true,
          })
          createdCount++
          lastAdmission = finalAdmissionNumber
          currentNextNum++
        }
      }

      toast.success(`Successfully created ${createdCount} students! Last Admission: ${lastAdmission}`, { duration: 6000 })
      setAddOpen(false)
      setBulkRows([''])
      reset()
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Bulk creation partially failed. Please check the list.')
    } finally {
      setLoading(false)
    }
  }

  // Consolidated submission handler
  const handleCombinedSubmit = async (data: StudentForm) => {
    if (isBulk) {
       await onBulkSubmit(data);
       return;
    }

    if (!data.full_name || data.full_name.trim().length < 2) {
      toast.error('Student name is required');
      return;
    }

    setLoading(true)
    try {
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

      while (!success && currentNextNum < nextNum + 50) {
        finalAdmissionNumber = generateAdmissionNumber(currentNextNum)
        authProvision = await createStudentUser(
          finalAdmissionNumber, 
          `${finalAdmissionNumber.toLowerCase()}@student.peak.edu`, 
          tempPwd, 
          data.full_name
        )

        if (authProvision.success) success = true
        else currentNextNum++
      }

      if (success) {
        await supabase.from('students').insert({
          user_id: authProvision.user_id,
          full_name: data.full_name,
          class_id: data.class_id,
          curriculum_id: data.curriculum_id,
          tuition_center_id: data.tuition_center_id || null,
          admission_number: finalAdmissionNumber,
          temp_password: tempPwd,
          onboarded: false,
          created_by_admin: true,
        })
        toast.success(`Student created! Admission: ${finalAdmissionNumber}`)
        setAddOpen(false)
        reset()
        loadData()
      } else {
        toast.error('Failed to generate a unique admission number. Please try again.')
      }

    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const removeSubject = async (studentId: string, ssId: string) => {
    if (!confirm('Remove this subject?')) return
    
    try {
      const { error } = await supabase
        .from('student_subjects')
        .delete()
        .eq('id', ssId)

      if (error) throw error
      
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            student_subjects: (s as any).student_subjects.filter((ss: any) => ss.id !== ssId)
          }
        }
        return s
      }))
      
      toast.success('Subject removed')
    } catch (err: any) {
      toast.error('Failed to remove: ' + err.message)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Students</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{filteredStudents.length} students matching criteria</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openAddModal(true)} className="whitespace-nowrap">
            <Plus size={16} /> Bulk Add
          </Button>
          <Button onClick={() => openAddModal(false)} className="whitespace-nowrap">
            <Plus size={16} /> Add Student
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search name or admission no..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-none outline-none font-medium h-full"
            style={{ background: 'var(--input)', color: 'var(--text)' }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        
        <select 
          className="px-4 py-2.5 rounded-xl border-none outline-none font-medium text-sm sm:w-auto w-full" 
          style={{ background: 'var(--input)', color: 'var(--text)' }}
          value={filterCurriculum} 
          onChange={e => { setFilterCurriculum(e.target.value); setPage(1); }}
        >
          <option value="">All Curriculums</option>
          {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select 
          className="px-4 py-2.5 rounded-xl border-none outline-none font-medium text-sm sm:w-auto w-full" 
          style={{ background: 'var(--input)', color: 'var(--text)' }}
          value={filterClass} 
          onChange={e => { setFilterClass(e.target.value); setPage(1); }}
        >
          <option value="">All Classes</option>
          {classes.filter(c => !filterCurriculum || c.curriculum_id === filterCurriculum).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                   <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>School</p>
                                   <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{student.school_name || 'Not Set'}</p>
                                </div>
                             </div>

                             {/* Subjects List */}
                             {(student as any).student_subjects?.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {(student as any).student_subjects.map((ss: any, idx: number) => (
                                    <Badge key={ss.id || idx} variant="info" className="text-[10px] pr-1 group/badge relative transition-all">
                                      {ss.subject?.name}
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeSubject(student.id, ss.id);
                                        }}
                                        className="opacity-0 group-hover/badge:opacity-100 hover:bg-red-500/20 rounded-full p-0.5 ml-1 transition-all"
                                        title="Remove subject"
                                      >
                                        <X size={10} />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                             )}
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
        </div>
      )}

      {/* Add Student Modal */}
      <Modal 
        isOpen={addOpen} 
        onClose={() => setAddOpen(false)} 
        title={isBulk ? "Bulk Create Students" : "Add Student"}
        size={isBulk ? "lg" : "md"}
      >
        <form onSubmit={handleSubmit(handleCombinedSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Curriculum" error={errors.curriculum_id?.message} {...register('curriculum_id')}>
              <option value="">Select curriculum</option>
              {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Class" error={errors.class_id?.message} {...register('class_id')}>
              <option value="">Select class</option>
              {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          
          <Select label="Tuition Center (Optional)" {...register('tuition_center_id')}>
            <option value="">All Centers (Default)</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          {!isBulk ? (
            <Input label="Student Full Name" placeholder="Student full name" error={errors.full_name?.message} {...register('full_name')} />
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold" style={{ color: 'var(--text)' }}>Student Names (Dynamic Rows)</label>
                <div className="flex gap-2">
                  <label className="cursor-pointer text-xs font-bold text-emerald-500 hover:underline">
                    📁 Upload CSV/TXT
                    <input type="file" className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {bulkRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input 
                        placeholder={`Student ${idx + 1} Name`} 
                        value={row}
                        onChange={(e) => updateBulkRow(idx, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addBulkRow();
                          }
                        }}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeBulkRow(idx)}
                      className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all mt-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              
              <Button type="button" variant="secondary" className="w-full border-dashed" onClick={addBulkRow}>
                <Plus size={14} className="mr-2" /> Add Another Row
              </Button>

              <div className="p-3 rounded-xl text-[11px] leading-relaxed" style={{ background: 'rgba(16,185,129,0.05)', color: '#10B981' }}>
                💡 Pro-Tip: Press <b>Enter</b> in any row to quickly add a new one. You can also upload a list.
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : isBulk ? `Create ${bulkRows.filter(r => r.trim()).length} Students` : 'Create Student'}
            </Button>
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
              { label: 'Tuition Center', value: (selected as any).center?.name ?? '—' },
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
