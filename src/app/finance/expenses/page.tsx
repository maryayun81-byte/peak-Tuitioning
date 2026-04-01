'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit, ShoppingBag, Search, Download, Tag } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  description: z.string().min(1, 'Description required'),
  amount: z.number().positive('Must be positive'),
  category_id: z.string().uuid('Select a category'),
  tuition_center_id: z.string().optional(),
  expense_date: z.string(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Expense {
  id: string
  description: string
  amount: number
  expense_date: string
  notes: string | null
  tuition_center_id: string | null
  category: { id: string; name: string; color: string } | null
  center: { name: string } | null
}

interface Category { id: string; name: string; color: string }
interface Center { id: string; name: string }

export default function ExpensesPage() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterCenter, setFilterCenter] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { expense_date: new Date().toISOString().split('T')[0] }
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [expRes, catRes, centerRes] = await Promise.all([
        supabase.from('expenses')
          .select('id, description, amount, expense_date, notes, tuition_center_id, category:expense_categories(id, name, color), center:tuition_centers(name)')
          .gte('expense_date', dateFrom).lte('expense_date', dateTo)
          .order('expense_date', { ascending: false }),
        supabase.from('expense_categories').select('id, name, color').order('name'),
        supabase.from('tuition_centers').select('id, name').order('name'),
      ])
      setExpenses((expRes.data ?? []) as any)
      setCategories(catRes.data ?? [])
      setCenters(centerRes.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateFrom, dateTo])

  useEffect(() => { loadData() }, [loadData])

  const openEdit = (exp: Expense) => {
    setEditing(exp)
    setValue('description', exp.description)
    setValue('amount', exp.amount)
    setValue('category_id', exp.category?.id ?? '')
    setValue('tuition_center_id', exp.tuition_center_id ?? '')
    setValue('expense_date', exp.expense_date)
    setValue('notes', exp.notes ?? '')
    setAddOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    const payload = {
      description: data.description,
      amount: data.amount,
      currency: 'KES',
      category_id: data.category_id,
      tuition_center_id: data.tuition_center_id || null,
      expense_date: data.expense_date,
      notes: data.notes || null,
      created_by: profile?.id,
    }

    const { error } = editing
      ? await supabase.from('expenses').update(payload).eq('id', editing.id)
      : await supabase.from('expenses').insert(payload)

    if (error) { toast.error(error.message); return }
    toast.success(editing ? 'Expense updated!' : 'Expense recorded!')
    reset(); setEditing(null); setAddOpen(false); loadData()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this expense record?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); loadData()
  }

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = e.description.toLowerCase().includes(q) || (e.center?.name.toLowerCase().includes(q) ?? false)
    const matchCat = filterCat ? e.category?.id === filterCat : true
    const matchCenter = filterCenter ? e.tuition_center_id === filterCenter : true
    return matchSearch && matchCat && matchCenter
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const totalAmount = filtered.reduce((s, e) => s + Number(e.amount), 0)

  // Category totals for the summary strip
  const categoryTotals = categories.map(cat => ({
    ...cat,
    total: filtered.filter(e => e.category?.id === cat.id).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text)' }}>Expenses</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} records · Total: <strong style={{ color: '#EF4444' }}>{formatCurrency(totalAmount)}</strong>
          </p>
        </div>
        <Button onClick={() => { reset(); setEditing(null); setAddOpen(true) }}>
          <Plus size={16} /> Add Expense
        </Button>
      </div>

      {/* Category Summary Strip */}
      {categoryTotals.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categoryTotals.map(cat => (
            <div
              key={cat.id}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
              onClick={() => setFilterCat(filterCat === cat.id ? '' : cat.id)}
              style={{
                background: filterCat === cat.id ? `${cat.color}30` : 'var(--card)',
                border: `1px solid ${filterCat === cat.id ? cat.color : 'var(--card-border)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{cat.name}</span>
              </div>
              <p className="text-sm font-black mt-1" style={{ color: cat.color }}>{formatCurrency(cat.total)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search expenses…"
            leftIcon={<Search size={15} />}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <input
            type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
          />
          <input
            type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
          />
          <Select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={filterCenter} onChange={e => setFilterCenter(e.target.value)}>
            <option value="">All Centers</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                {['Date', 'Description', 'Center', 'Category', 'Amount', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--input)', width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.map((exp, i) => (
                <motion.tr
                  key={exp.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: '1px solid var(--card-border)' }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatDate(exp.expense_date)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>
                    <div className="truncate max-w-[200px]">{exp.description}</div>
                    {exp.notes && <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{exp.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{exp.center?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: exp.category?.color ?? '#6B7280' }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{exp.category?.name ?? 'Other'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-black" style={{ color: '#EF4444' }}>{formatCurrency(Number(exp.amount))}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-primary">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => del(exp.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors text-rose-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-14" style={{ color: 'var(--text-muted)' }}>
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-20" />
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid var(--card-border)' }}>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); reset(); setEditing(null) }} title={editing ? 'Edit Expense' : 'Record Expense'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Description"
            placeholder="e.g. January rent payment"
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (KES)"
              type="number"
              placeholder="5000"
              error={errors.amount?.message}
              {...register('amount', { valueAsNumber: true })}
            />
            <Input
              label="Date"
              type="date"
              error={errors.expense_date?.message}
              {...register('expense_date')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" error={errors.category_id?.message} {...register('category_id')}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Tuition Center (optional)" {...register('tuition_center_id')}>
              <option value="">All / Unassigned</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <Input
            label="Notes (optional)"
            placeholder="Additional details…"
            {...register('notes')}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => { setAddOpen(false); reset(); setEditing(null) }}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Record Expense'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
