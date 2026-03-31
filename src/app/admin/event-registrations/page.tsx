'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit, Trash2, Users, Calendar, X, Eye } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'

const registrationSchema = z.object({
  student_name: z.string().min(2, "Name is required"),
  tuition_event_id: z.string().min(1, "Please select an event"),
  class_id: z.string().optional().nullable(),
  curriculum_id: z.string().optional().nullable(),
  tuition_center_id: z.string().optional().nullable(),
  notes: z.string().optional(),
  status: z.enum(['active', 'withdrawn', 'suspended']).default('active'),
})

type RegistrationForm = z.infer<typeof registrationSchema>

export default function AdminEventRegistrations() {
  const supabase = getSupabaseBrowserClient()
  const [registrations, setRegistrations] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [curriculums, setCurriculums] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEvent, setFilterEvent] = useState('')
  const [filterCurriculum, setFilterCurriculum] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterCenter, setFilterCenter] = useState('')
  
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      status: 'active'
    }
  })

  // Derive form classes based on selected curriculum
  const watchCurriculum = watch('curriculum_id')
  const formClasses = curriculums.length > 0 && watchCurriculum
    ? classes.filter(c => c.curriculum_id === watchCurriculum)
    : classes

  useEffect(() => { 
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rRes, eRes, cRes, cenRes, curRes] = await Promise.all([
        supabase
          .from('event_registrations')
          .select(`
            *,
            tuition_event:tuition_events(id, name),
            class:classes(id, name, curriculum_id),
            center:tuition_centers(id, name)
          `)
          .order('registered_at', { ascending: false }),
        supabase.from('tuition_events').select('id, name').order('start_date', { ascending: false }),
        supabase.from('classes').select('id, name, curriculum_id').order('name'),
        supabase.from('tuition_centers').select('id, name').order('name'),
        supabase.from('curriculums').select('id, name').order('name')
      ])

      setRegistrations(rRes.data ?? [])
      setEvents(eRes.data ?? [])
      setClasses(cRes.data ?? [])
      setCenters(cenRes.data ?? [])
      setCurriculums(curRes.data ?? [])
      
      // Auto-select the first event as a default filter if none selected
      if (!filterEvent && eRes.data && eRes.data.length > 0) {
         setFilterEvent(eRes.data[0].id)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch = r.student_name.toLowerCase().includes(search.toLowerCase())
    const matchesEvent = filterEvent ? r.tuition_event_id === filterEvent : true
    const matchesCurriculum = filterCurriculum ? r.class?.curriculum_id === filterCurriculum : true
    const matchesClass = filterClass ? r.class_id === filterClass : true
    const matchesCenter = filterCenter ? r.tuition_center_id === filterCenter : true
    return matchesSearch && matchesEvent && matchesCurriculum && matchesClass && matchesCenter
  })
  
  const paginatedRegistrations = filteredRegistrations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredRegistrations.length / PAGE_SIZE))

  const onSubmit = async (data: RegistrationForm) => {
    setLoading(true)
    try {
      if (editing) {
         const { error } = await supabase.from('event_registrations').update({
           student_name: data.student_name,
           tuition_event_id: data.tuition_event_id,
           class_id: data.class_id || null,
           tuition_center_id: data.tuition_center_id || null,
           notes: data.notes || null,
           status: data.status,
         }).eq('id', editing.id)
         
         if (error) {
            if (error.code === '23505') toast.error('This student is already registered for this event.')
            else throw error
         } else {
            toast.success('Registration updated')
            setAddOpen(false)
         }
      } else {
         const { error } = await supabase.from('event_registrations').insert({
           student_name: data.student_name,
           tuition_event_id: data.tuition_event_id,
           class_id: data.class_id || null,
           tuition_center_id: data.tuition_center_id || null,
           notes: data.notes || null,
           status: data.status,
         })
         
         if (error) {
            if (error.code === '23505') toast.error('This student is already registered for this event.')
            else throw error
         } else {
            toast.success('Student registered!')
            setAddOpen(false)
            reset()
         }
      }
      loadData()
    } catch (err: any) {
      toast.error('Something went wrong')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    try {
      reset({
        tuition_event_id: filterEvent || (events && events.length > 0 ? events[0].id : ''),
        curriculum_id: filterCurriculum || '',
        status: 'active'
      })
      setEditing(null)
      setAddOpen(true)
    } catch (e) {
      console.error('Error opening add modal:', e)
      toast.error('Could not open form')
    }
  }

  const openEdit = (reg: any) => {
    setEditing(reg)
    reset({
      student_name: reg.student_name,
      tuition_event_id: reg.tuition_event_id,
      curriculum_id: reg.class?.curriculum_id || '',
      class_id: reg.class_id || '',
      tuition_center_id: reg.tuition_center_id || '',
      notes: reg.notes || '',
      status: reg.status,
    })
    setAddOpen(true)
  }

  const deleteRegistration = async () => {
    if (!selected) return
    const { error } = await supabase.from('event_registrations').delete().eq('id', selected.id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Registration removed')
    loadData()
    setSelected(null)
    setDeleteOpen(false)
  }
  
  const stats = {
     total: filteredRegistrations.length,
     active: filteredRegistrations.filter(r => r.status === 'active').length,
     withdrawn: filteredRegistrations.filter(r => r.status === 'withdrawn').length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Event Registrations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage student enrollments for tuition events</p>
        </div>
        <Button onClick={openAdd} className="whitespace-nowrap">
          <Plus size={16} /> Register Student
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
         <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
            <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Total Enrolled</p>
            <p className="text-2xl font-black mt-1" style={{ color: 'var(--primary)' }}>{stats.total}</p>
         </div>
         <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
            <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Active</p>
            <p className="text-2xl font-black mt-1" style={{ color: '#10B981' }}>{stats.active}</p>
         </div>
         <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
            <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Withdrawn</p>
            <p className="text-2xl font-black mt-1" style={{ color: '#EF4444' }}>{stats.withdrawn}</p>
         </div>
      </div>

      <div className="flex flex-col md:flex-row flex-wrap gap-3">
        <select 
          className="px-4 py-2.5 rounded-xl border-none outline-none font-medium text-sm sm:w-auto w-full" 
          style={{ background: 'var(--primary)', color: 'white', opacity: 0.9 }}
          value={filterEvent} 
          onChange={e => { setFilterEvent(e.target.value); setPage(1); }}
        >
          <option value="" disabled style={{ color: '#000' }}>Select Event...</option>
          {events.map(e => <option key={e.id} value={e.id} style={{ color: '#000', background: 'white' }}>{e.name}</option>)}
        </select>
        
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search student name..."
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
          {classes.filter(c => filterCurriculum ? c.curriculum_id === filterCurriculum : true).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
           <SkeletonList count={5} />
        </div>
      ) : (
        <div className="space-y-6">
           {paginatedRegistrations.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                 {filterEvent ? 'No students enrolled for these filters yet.' : 'Please select a tuition event or register students.'}
              </div>
           ) : (
              <div className="rounded-[1.5rem] border border-[var(--card-border)] overflow-hidden bg-[var(--card)] shadow-sm">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                       <thead style={{ background: 'var(--input)', color: 'var(--text-muted)' }} className="text-xs uppercase font-black">
                          <tr>
                             <th className="px-5 py-4 min-w-[200px]">Student Name</th>
                             <th className="px-5 py-4">Event</th>
                             <th className="px-5 py-4">Class</th>
                             <th className="px-5 py-4">Center</th>
                             <th className="px-5 py-4">Status</th>
                             <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--card-border)]">
                          {paginatedRegistrations.map((reg) => (
                             <tr key={reg.id} className="hover:bg-[var(--input)] transition-colors">
                                <td className="px-5 py-4 font-bold" style={{ color: 'var(--text)' }}>
                                   {reg.student_name}
                                </td>
                                <td className="px-5 py-4">
                                   <Badge variant="info">{reg.tuition_event?.name}</Badge>
                                </td>
                                <td className="px-5 py-4" style={{ color: 'var(--text-muted)' }}>
                                   {reg.class?.name || '—'}
                                </td>
                                <td className="px-5 py-4" style={{ color: 'var(--text-muted)' }}>
                                   {reg.center?.name || '—'}
                                </td>
                                <td className="px-5 py-4">
                                   <Badge variant={reg.status === 'active' ? 'success' : reg.status === 'withdrawn' ? 'danger' : 'warning'}>
                                      {reg.status}
                                   </Badge>
                                </td>
                                <td className="px-5 py-4 text-right">
                                   <div className="flex justify-end gap-2">
                                      <button onClick={() => openEdit(reg)} className="p-2 rounded-lg bg-[var(--input)] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                         <Edit size={14} style={{ color: 'var(--text-muted)' }} />
                                      </button>
                                      <button onClick={() => { setSelected(reg); setDeleteOpen(true) }} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                                         <Trash2 size={14} className="text-red-500" />
                                      </button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
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

      {/* Add/Edit Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title={editing ? "Edit Registration" : "Register Student"}>
        <form onSubmit={handleSubmit(onSubmit, (errs) => {
          console.error("Validation failed:", errs);
          toast.error("Please fill in all required fields correctly.");
        })} className="space-y-4">
          <Input label="Student Name" placeholder="Full name of student" error={errors.student_name?.message} {...register('student_name')} />
          <Select label="Tuition Event" error={errors.tuition_event_id?.message} {...register('tuition_event_id')}>
            <option value="">Select Event...</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Select label="Curriculum (Optional)" error={errors.curriculum_id?.message} {...register('curriculum_id')}>
            <option value="">No Curriculum Filter</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
             <Select label="Class (Optional)" error={errors.class_id?.message} {...register('class_id')}>
               <option value="">No Class</option>
               {formClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </Select>
             <Select label="Center (Optional)" error={errors.tuition_center_id?.message} {...register('tuition_center_id')}>
               <option value="">No Center</option>
               {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </Select>
          </div>
          <Select label="Status" error={errors.status?.message} {...register('status')}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="withdrawn">Withdrawn</option>
          </Select>
          <Input label="Notes (Optional)" placeholder="Any specific requirements or notes?" {...register('notes')} />
          
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update Registration' : 'Register Student'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteRegistration}
        title="Remove Registration"
        message={`Are you sure you want to remove ${selected?.student_name} from this event? This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  )
}
