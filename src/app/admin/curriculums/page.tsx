'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import type { Curriculum } from '@/types/database'

const schema = z.object({ name: z.string().min(1), description: z.string().optional() })
type FormData = z.infer<typeof schema>

export default function AdminCurriculums() {
  const supabase = getSupabaseBrowserClient()
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Curriculum | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => { load() }, [])
  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('curriculums').select('*').order('name')
      if (error) throw error
      setCurriculums(data ?? [])
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to load data: ' + e.message)
      setCurriculums([])
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (c: Curriculum) => {
    setEditing(c)
    setValue('name', c.name)
    setValue('description', c.description ?? '')
    setAddOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    const payload = { name: data.name, description: data.description }
    const { error } = editing
      ? await supabase.from('curriculums').update(payload).eq('id', editing.id)
      : await supabase.from('curriculums').insert(payload)

    if (error) { 
      if (error.message?.includes('curriculums_name_key') || error.message?.includes('duplicate key value')) {
        toast.error('A curriculum with this name already exists.')
      } else {
        toast.error(error.message)
      }
      return 
    }
    toast.success(editing ? 'Updated!' : 'Curriculum created!')
    reset(); setEditing(null); setAddOpen(false); load()
  }

  const del = async (id: string) => {
    const { error } = await supabase.from('curriculums').delete().eq('id', id)
    if (error) { toast.error('Cannot delete — classes may exist'); return }
    toast.success('Deleted'); load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Curriculums</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{curriculums.length} curricula configured</p>
        </div>
        <Button onClick={() => { reset(); setEditing(null); setAddOpen(true) }}><Plus size={16} /> Add Curriculum</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {curriculums.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: 'linear-gradient(135deg, #4F8CFF, #22D3EE)', color: 'white' }}>
                    {c.name.slice(0, 2)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:opacity-80" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}><Edit size={14} /></button>
                    <button onClick={() => del(c.id)} className="p-1.5 rounded-lg hover:opacity-80" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
                <h3 className="font-black text-lg mb-1" style={{ color: 'var(--text)' }}>{c.name}</h3>
                {c.description && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{c.description}</p>}
              </Card>
            </motion.div>
          ))}
          {curriculums.length === 0 && (
            <div className="col-span-3 text-center py-16" style={{ color: 'var(--text-muted)' }}>
              No curriculums yet. Create your first one!
            </div>
          )}
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setEditing(null); reset() }} title={editing ? 'Edit Curriculum' : 'New Curriculum'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Curriculum Name" placeholder="e.g. 8-4-8, IGCSE, KCSE" error={errors.name?.message} {...register('name')} />
          <Input label="Description (optional)" placeholder="Brief description" {...register('description')} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
