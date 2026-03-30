'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import type { Class, Curriculum } from '@/types/database'

const schema = z.object({
  name: z.string().min(1),
  curriculum_id: z.string().uuid(),
  level: z.number().min(1).default(1),
  tuition_center_id: z.string().optional().nullable(),
})
type FormData = z.infer<typeof schema>

export default function AdminClasses() {
  const supabase = getSupabaseBrowserClient()
  const [classes, setClasses] = useState<Class[]>([])
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Class | null>(null)
  const [filterCurriculum, setFilterCurriculum] = useState('')
  const [filterCenter, setFilterCenter] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, curRes, cenRes] = await Promise.all([
        supabase.from('classes').select('*, curriculum:curriculums(*), center:tuition_centers(*)').order('level').order('name'),
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('tuition_centers').select('*').order('name'),
      ])
      setClasses(cRes.data ?? [])
      setCurriculums(curRes.data ?? [])
      setCenters(cenRes.data ?? [])
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filtered = classes.filter(c => {
    const matchesCurriculum = filterCurriculum ? c.curriculum_id === filterCurriculum : true
    const matchesCenter = filterCenter ? (c as any).tuition_center_id === filterCenter : true
    return matchesCurriculum && matchesCenter
  })

  const onSubmit = async (data: FormData) => {
    const payload = { name: data.name, curriculum_id: data.curriculum_id, level: data.level, tuition_center_id: data.tuition_center_id || null }
    const { error } = editing
      ? await supabase.from('classes').update(payload).eq('id', editing.id)
      : await supabase.from('classes').insert(payload)
    if (error) { toast.error(error.message); return }
    toast.success(editing ? 'Updated!' : 'Class created!')
    reset(); setEditing(null); setAddOpen(false); load()
  }

  const del = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) { toast.error('Cannot delete — subjects may exist'); return }
    toast.success('Deleted'); load()
  }

  // Group classes by curriculum
  const grouped = filtered.reduce((acc, cls) => {
    const curName = (cls.curriculum as any)?.name ?? 'Unknown'
    if (!acc[curName]) acc[curName] = []
    acc[curName].push(cls)
    return acc
  }, {} as Record<string, Class[]>)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Classes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{classes.length} classes across {curriculums.length} curricula</p>
        </div>
        <Button onClick={() => { reset(); setEditing(null); setAddOpen(true) }}><Plus size={16} /> Add Class</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select value={filterCurriculum} onChange={e => setFilterCurriculum(e.target.value)}>
          <option value="">All Curricula</option>
          {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={filterCenter} onChange={e => setFilterCenter(e.target.value)}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {loading ? <SkeletonList count={5} /> : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([curName, cls]) => (
            <div key={curName}>
              <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{curName}</h3>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                      {['Class Name', 'Level', 'Curriculum', 'Center', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(cls as Class[]).map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td className="px-5 py-3 font-semibold" style={{ color: 'var(--text)' }}>{c.name}</td>
                        <td className="px-5 py-3"><Badge variant="muted">Level {c.level}</Badge></td>
                        <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{(c.curriculum as any)?.name}</td>
                        <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{(c as any).center?.name || 'All Centers'}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => { setEditing(c); setValue('name', c.name); setValue('curriculum_id', c.curriculum_id); setValue('level', c.level); setValue('tuition_center_id', (c as any).tuition_center_id || ''); setAddOpen(true) }} className="p-1.5 rounded-lg" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}><Edit size={14} /></button>
                            <button onClick={() => del(c.id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No classes found</div>}
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); reset(); setEditing(null) }} title={editing ? 'Edit Class' : 'New Class'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Curriculum" error={errors.curriculum_id?.message} {...register('curriculum_id')}>
            <option value="">Select curriculum</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Tuition Center" {...register('tuition_center_id')}>
            <option value="">All Centers (Default)</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Class Name" placeholder="e.g. Form 1, Grade 7" error={errors.name?.message} {...register('name')} />
          <Input label="Level" type="number" placeholder="1" {...register('level', { valueAsNumber: true })} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
