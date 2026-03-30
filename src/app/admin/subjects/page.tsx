'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit, BookMarked, Search, Layers } from 'lucide-react'
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
import type { Subject, Curriculum } from '@/types/database'
import { withTimeout } from '@/lib/supabase/utils'

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  curriculum_id: z.string().uuid(),
  category: z.string().optional(),
  tuition_center_id: z.string().optional().nullable(),
})
type FormData = z.infer<typeof schema>

export default function AdminSubjects() {
  const supabase = getSupabaseBrowserClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [search, setSearch] = useState('')
  const [filterCurriculum, setFilterCurriculum] = useState('')
  const [filterCenter, setFilterCenter] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, curRes, cenRes] = await withTimeout(
        Promise.all([
          supabase.from('subjects').select('*, curriculum:curriculums(*), center:tuition_centers(*)').order('name'),
          supabase.from('curriculums').select('*').order('name'),
          supabase.from('tuition_centers').select('*').order('name')
        ]),
        5000,
        'Subjects & Curriculums load'
      )
      setSubjects(sRes.data ?? [])
      setCurriculums(curRes.data ?? [])
      setCenters(cenRes.data ?? [])
    } catch (e) {
      console.error('Failed to load subjects and curriculums:', e)
      toast.error('The database request is taking longer than expected. Please try refreshing or check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = subjects.filter(s => {
    const q = search.toLowerCase()
    const matchesSearch = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    const matchesCurriculum = filterCurriculum ? s.curriculum_id === filterCurriculum : true
    const matchesCenter = filterCenter ? (s as any).tuition_center_id === filterCenter : true
    return matchesSearch && matchesCurriculum && matchesCenter
  })

  const onSubmit = async (data: FormData) => {
    const payload = { ...data, tuition_center_id: data.tuition_center_id || null }
    const { error } = editing
      ? await supabase.from('subjects').update(payload).eq('id', editing.id)
      : await supabase.from('subjects').insert(payload)
    if (error) { toast.error(error.message); return }
    toast.success(editing ? 'Subject updated!' : 'Subject created!')
    reset(); setEditing(null); setAddOpen(false); load()
  }

  const del = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (error) { toast.error('Cannot delete — assignments may exist'); return }
    toast.success('Deleted'); load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Subjects</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{subjects.length} subjects configured</p>
        </div>
        <Button onClick={() => { reset(); setEditing(null); setAddOpen(true) }}><Plus size={16} /> Add Subject</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input placeholder="Search by name or code…" leftIcon={<Search size={16} />} value={search} onChange={e => setSearch(e.target.value)} />
        <Select value={filterCurriculum} onChange={e => setFilterCurriculum(e.target.value)}>
          <option value="">All Curricula</option>
          {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={filterCenter} onChange={e => setFilterCenter(e.target.value)}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {loading ? <SkeletonList count={8} /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Subject Name', 'Code', 'Category', 'Curriculum', 'Center', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'var(--input)', color: 'var(--primary)' }}>
                          <BookMarked size={14} />
                        </div>
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><code className="text-xs px-2 py-0.5 rounded-lg font-mono" style={{ background: 'var(--input)', color: 'var(--text)' }}>{s.code}</code></td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{s.category ?? '—'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{(s as any).curriculum?.name}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{(s as any).center?.name || 'All Centers'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditing(s); setValue('name', s.name); setValue('code', s.code); setValue('curriculum_id', s.curriculum_id); setValue('category', s.category ?? ''); setValue('tuition_center_id', (s as any).tuition_center_id || ''); setAddOpen(true) }} className="p-1.5 rounded-lg" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}><Edit size={14} /></button>
                        <button onClick={() => del(s.id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No subjects found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); reset(); setEditing(null) }} title={editing ? 'Edit Subject' : 'New Subject'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Curriculum" error={errors.curriculum_id?.message} {...register('curriculum_id')}>
            <option value="">Select curriculum</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Tuition Center" {...register('tuition_center_id')}>
            <option value="">All Centers (Default)</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Subject Name" placeholder="e.g. Mathematics" error={errors.name?.message} {...register('name')} />
          <Input label="Subject Code" placeholder="e.g. MATH-01" error={errors.code?.message} {...register('code')} />
          <Input label="Category (optional)" placeholder="e.g. Sciences, Languages" {...register('category')} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
