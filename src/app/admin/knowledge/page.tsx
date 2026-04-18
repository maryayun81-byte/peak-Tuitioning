'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Trash2, Lightbulb, Sparkles, Edit2, CheckCircle, XCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

const knowledgeSchema = z.object({
  category: z.enum(['vocabulary', 'fact']),
  // Dynamic fields based on category
  word: z.string().optional(),
  type: z.string().optional(),
  def: z.string().optional(),
  ex: z.string().optional(),
  text: z.string().optional(),
})

type KnowledgeForm = z.infer<typeof knowledgeSchema>

export default function AdminKnowledge() {
  const supabase = getSupabaseBrowserClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  
  const [addOpen, setAddOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<KnowledgeForm>({
    resolver: zodResolver(knowledgeSchema),
    defaultValues: { category: 'vocabulary' }
  })

  const watchCategory = watch('category')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('app_knowledge_base')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) toast.error('Failed to load knowledge base')
    else setItems(data || [])
    setLoading(false)
  }

  const onSubmit = async (data: KnowledgeForm) => {
    setLoading(true)
    const content = data.category === 'vocabulary' 
      ? { word: data.word, type: data.type, def: data.def, ex: data.ex }
      : { text: data.text }

    const { error } = await supabase.from('app_knowledge_base').insert({
      category: data.category,
      content,
      is_active: true
    })

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Knowledge item added!')
      setAddOpen(false)
      reset()
      loadData()
    }
    setLoading(false)
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('app_knowledge_base')
      .update({ is_active: !currentStatus })
      .eq('id', id)
    
    if (error) toast.error('Update failed')
    else {
      setItems(items.map(i => i.id === id ? { ...i, is_active: !currentStatus } : i))
      toast.success('Status updated')
    }
  }

  const deleteItem = async () => {
    if (!selected) return
    const { error } = await supabase.from('app_knowledge_base').delete().eq('id', selected.id)
    if (error) toast.error('Delete failed')
    else {
      toast.success('Item removed')
      loadData()
      setDeleteOpen(false)
    }
  }

  const filteredItems = items.filter(i => {
    const content = i.content || {}
    const searchText = (content.word || '' + content.text || '').toLowerCase()
    const matchesSearch = searchText.includes(search.toLowerCase())
    const matchesCat = filterCategory ? i.category === filterCategory : true
    return matchesSearch && matchesCat
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Knowledge Base</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage Vocabulary and Facts for the Student Dashboard</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus size={16} /> Add Content
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search content..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-none outline-none font-medium"
            style={{ background: 'var(--input)', color: 'var(--text)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select 
          value={filterCategory} 
          onChange={e => setFilterCategory(e.target.value)}
          className="md:w-48"
        >
          <option value="">All Categories</option>
          <option value="vocabulary">Vocabulary</option>
          <option value="fact">Quick Facts</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <SkeletonList count={6} />
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted">No items found. Add some knowledge!</div>
        ) : (
          filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5 h-full flex flex-col justify-between border border-[var(--card-border)] bg-[var(--card)] relative overflow-hidden">
                <div className={`absolute top-0 right-0 p-3 opacity-10`}>
                  {item.category === 'vocabulary' ? <Lightbulb size={40} /> : <Sparkles size={40} />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={item.category === 'vocabulary' ? 'info' : 'success'}>
                      {item.category === 'vocabulary' ? 'Vocabulary' : 'Fact'}
                    </Badge>
                    {!item.is_active && <Badge variant="warning">Inactive</Badge>}
                  </div>

                  {item.category === 'vocabulary' ? (
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-primary">{item.content.word}</h3>
                      <p className="text-xs italic opacity-60">{item.content.type}</p>
                      <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>{item.content.def}</p>
                      <div className="bg-white/5 p-2 rounded-lg mt-2">
                        <p className="text-[10px] uppercase font-bold text-muted mb-1">Example</p>
                        <p className="text-xs italic">"{item.content.ex}"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>{item.content.text}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={() => toggleActive(item.id, item.is_active)}
                  >
                    {item.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => { setSelected(item); setDeleteOpen(true) }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Knowledge Item">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Category" {...register('category')}>
            <option value="vocabulary">Vocabulary</option>
            <option value="fact">Quick Fact</option>
          </Select>

          {watchCategory === 'vocabulary' ? (
            <div className="space-y-4">
              <Input label="Word" placeholder="e.g. Resilience" {...register('word')} />
              <Input label="Type" placeholder="e.g. Noun, Adj." {...register('type')} />
              <Textarea label="Definition" placeholder="What does it mean?" {...register('def')} />
              <Textarea label="Example Sentence" placeholder="Use it in a sentence..." {...register('ex')} />
            </div>
          ) : (
            <Textarea label="Fact Text" placeholder="Did you know that..." {...register('text')} />
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">Save Content</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteItem}
        title="Remove Knowledge"
        message="Are you sure you want to remove this item? It will no longer appear on the student dashboard."
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  )
}
