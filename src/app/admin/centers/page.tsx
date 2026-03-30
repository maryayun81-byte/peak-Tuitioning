'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit, MapPin } from 'lucide-react'
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

interface TuitionCenter {
  id: string
  name: string
  location: string | null
}

const schema = z.object({ 
  name: z.string().min(1, 'Name is required'), 
  location: z.string().optional() 
})
type FormData = z.infer<typeof schema>

export default function AdminTuitionCenters() {
  const supabase = getSupabaseBrowserClient()
  const [centers, setCenters] = useState<TuitionCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<TuitionCenter | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => { load() }, [])
  
  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('tuition_centers').select('*').order('name')
      if (error) throw error
      setCenters(data ?? [])
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to load data: ' + e.message)
      setCenters([])
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (c: TuitionCenter) => {
    setEditing(c)
    setValue('name', c.name)
    setValue('location', c.location ?? '')
    setAddOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    const payload = { name: data.name, location: data.location || null }
    const { error } = editing
      ? await supabase.from('tuition_centers').update(payload).eq('id', editing.id)
      : await supabase.from('tuition_centers').insert(payload)

    if (error) { 
      if (error.message?.includes('tuition_centers_name_key') || error.message?.includes('duplicate key value')) {
        toast.error('A tuition center with this name already exists.')
      } else {
        toast.error(error.message)
      }
      return 
    }
    toast.success(editing ? 'Updated center!' : 'Center created!')
    reset(); setEditing(null); setAddOpen(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('Are you sure? This might affect classes or subjects explicitly tied to this center.')) return
    const { error } = await supabase.from('tuition_centers').delete().eq('id', id)
    if (error) { toast.error('Cannot delete — existing records may rely on this center.'); return }
    toast.success('Deleted'); load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Tuition Centers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{centers.length} center(s) configured</p>
        </div>
        <Button onClick={() => { reset(); setEditing(null); setAddOpen(true) }}><Plus size={16} className="mr-2" /> Add Center</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {centers.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none" />
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary">
                    <MapPin size={24} />
                  </div>
                  <div className="flex gap-2 relative z-10">
                    <button onClick={() => openEdit(c)} className="p-2 rounded-xl hover:bg-primary/10 transition-colors text-primary"><Edit size={16} /></button>
                    <button onClick={() => del(c.id)} className="p-2 rounded-xl hover:bg-rose-500/10 transition-colors text-rose-500"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="font-black text-xl mb-1 truncate" style={{ color: 'var(--text)' }}>{c.name}</h3>
                {c.location ? (
                   <p className="text-sm tracking-wide truncate" style={{ color: 'var(--text-muted)' }}>{c.location}</p>
                ) : (
                   <p className="text-sm italic opacity-50" style={{ color: 'var(--text-muted)' }}>No location set</p>
                )}
              </Card>
            </motion.div>
          ))}
          {centers.length === 0 && (
            <div className="col-span-3 text-center py-16" style={{ color: 'var(--text-muted)' }}>
              No tuition centers yet. Create your first one to get started!
            </div>
          )}
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setEditing(null); reset() }} title={editing ? 'Edit Tuition Center' : 'New Tuition Center'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Center Name" placeholder="e.g. Downtown Campus" error={errors.name?.message} {...register('name')} />
          <Input label="Location (optional)" placeholder="Physical address or region" error={errors.location?.message} {...register('location')} />
          <div className="flex gap-3 justify-end mt-6">
            <Button type="button" variant="secondary" onClick={() => { setAddOpen(false); reset(); setEditing(null) }}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Create Center'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
