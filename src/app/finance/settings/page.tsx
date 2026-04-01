'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, Tag, Plus, Trash2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface FinanceSettings {
  org_name: string
  org_address: string
  org_phone: string
  org_email: string
  default_currency: string
  fiscal_year_start_month: number
  pdf_footer_text: string
}

interface Category {
  id: string
  name: string
  color: string
}

const settingsSchema = z.object({
  org_name: z.string().min(1),
  org_address: z.string().optional(),
  org_phone: z.string().optional(),
  org_email: z.string().email().optional().or(z.literal('')),
  default_currency: z.string(),
  fiscal_year_start_month: z.number().min(1).max(12),
  pdf_footer_text: z.string().optional(),
})
type SettingsForm = z.infer<typeof settingsSchema>

const catSchema = z.object({
  name: z.string().min(1, 'Name required'),
  color: z.string().default('#6366F1'),
})
type CatForm = z.infer<typeof catSchema>

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function FinanceSettings() {
  const supabase = getSupabaseBrowserClient()
  const [settings, setSettings] = useState<FinanceSettings | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema)
  })
  const { register: catReg, handleSubmit: catSubmit, reset: catReset, setValue: catSetVal } = useForm<CatForm>({
    resolver: zodResolver(catSchema)
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [settRes, catRes] = await Promise.all([
        supabase.from('finance_settings').select('*').limit(1).single(),
        supabase.from('expense_categories').select('*').order('name'),
      ])
      if (settRes.data) {
        const s = settRes.data as FinanceSettings
        setSettings(s)
        reset({
          org_name: s.org_name ?? '',
          org_address: s.org_address ?? '',
          org_phone: s.org_phone ?? '',
          org_email: s.org_email ?? '',
          default_currency: s.default_currency ?? 'KES',
          fiscal_year_start_month: s.fiscal_year_start_month ?? 1,
          pdf_footer_text: s.pdf_footer_text ?? '',
        })
      }
      setCategories(catRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase, reset])

  const onSave = async (data: SettingsForm) => {
    setSaving(true)
    const { error } = await supabase.from('finance_settings').update({
      ...data,
      updated_at: new Date().toISOString(),
    }).eq('org_name', settings?.org_name ?? '')

    if (error) {
      // Try insert if not found
      await supabase.from('finance_settings').insert({ ...data })
    }
    setSaving(false)
    toast.success('Settings saved!')
  }

  const onCatSubmit = async (data: CatForm) => {
    if (editingCat) {
      const { error } = await supabase.from('expense_categories').update(data).eq('id', editingCat.id)
      if (error) { toast.error(error.message); return }
      toast.success('Category updated!')
    } else {
      const { error } = await supabase.from('expense_categories').insert(data)
      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          toast.error('A category with this name already exists')
        } else {
          toast.error(error.message)
        }
        return
      }
      toast.success('Category added!')
    }
    catReset(); setEditingCat(null); setCatOpen(false)
    const { data: cats } = await supabase.from('expense_categories').select('*').order('name')
    setCategories(cats ?? [])
  }

  const delCat = async (id: string) => {
    if (!confirm('Delete this category? Existing expenses will keep their category reference.')) return
    const { error } = await supabase.from('expense_categories').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setCategories(prev => prev.filter(c => c.id !== id))
    toast.success('Category deleted')
  }

  const openEditCat = (cat: Category) => {
    setEditingCat(cat)
    catSetVal('name', cat.name)
    catSetVal('color', cat.color)
    setCatOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Settings size={24} style={{ color: '#F59E0B' }} />
          Finance Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Configure PDF branding, fiscal year, and expense categories
        </p>
      </div>

      {/* Organisation Settings */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-5">
          <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text)' }}>Organisation & PDF Branding</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--input)' }} />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <Input
                label="Organisation Name"
                placeholder="Peak Performance Tutoring"
                error={errors.org_name?.message}
                {...register('org_name')}
              />
              <Input
                label="Address (appears on PDF reports)"
                placeholder="123 Main Street, Nairobi, Kenya"
                {...register('org_address')}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" placeholder="+254 700 000 000" {...register('org_phone')} />
                <Input label="Email" type="email" placeholder="info@peak.ac.ke" {...register('org_email')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Default Currency</label>
                  <select
                    {...register('default_currency')}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                  >
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Fiscal Year Start Month</label>
                  <select
                    {...register('fiscal_year_start_month', { valueAsNumber: true })}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                  >
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>

              <Input
                label="PDF Footer Text"
                placeholder="Generated by Peak Performance Tutoring Finance Portal"
                {...register('pdf_footer_text')}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={saving}>
                  <Save size={15} /> Save Settings
                </Button>
              </div>
            </form>
          )}
        </Card>
      </motion.div>

      {/* Expense Categories */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Expense Categories</h2>
            <Button size="sm" onClick={() => { catReset(); setEditingCat(null); setCatOpen(true) }}>
              <Plus size={14} /> Add Category
            </Button>
          </div>

          <div className="space-y-2">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ border: '1px solid var(--card-border)', background: 'var(--input)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ background: cat.color }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{cat.name}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditCat(cat)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <Settings size={13} />
                  </button>
                  <button onClick={() => delCat(cat.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors text-rose-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No categories yet</p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Category Modal */}
      <Modal isOpen={catOpen} onClose={() => { setCatOpen(false); catReset(); setEditingCat(null) }} title={editingCat ? 'Edit Category' : 'New Category'} size="sm">
        <form onSubmit={catSubmit(onCatSubmit)} className="space-y-4">
          <Input label="Category Name" placeholder="e.g. Rent" {...catReg('name')} />
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Color</label>
            <input type="color" {...catReg('color')} className="w-full h-10 rounded-xl cursor-pointer" style={{ border: '1px solid var(--card-border)' }} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => { setCatOpen(false); catReset() }}>Cancel</Button>
            <Button type="submit">{editingCat ? 'Save' : 'Add Category'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
