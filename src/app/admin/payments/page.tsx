'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit, CreditCard, Search, Download } from 'lucide-react'
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
import { formatDate, formatCurrency, generateReceiptNumber } from '@/lib/utils'
import type { Payment, Student, TuitionEvent } from '@/types/database'

const schema = z.object({
  student_id: z.string().uuid(),
  tuition_event_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('KES'),
  payment_date: z.string(),
  method: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
})
type PaymentForm = z.infer<typeof schema>

export default function AdminPayments() {
  const supabase = getSupabaseBrowserClient()
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Pick<Student, 'id' | 'full_name' | 'admission_number'>[]>([])
  const [events, setEvents] = useState<TuitionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterEvent, setFilterEvent] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentForm>({ resolver: zodResolver(schema), defaultValues: { currency: 'KES', payment_date: new Date().toISOString().split('T')[0] } })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, sRes, eRes] = await Promise.all([
        supabase.from('payments').select('*, student:students(full_name, admission_number), tuition_event:tuition_events(name)').order('payment_date', { ascending: false }),
        supabase.from('students').select('id, full_name, admission_number'),
        supabase.from('tuition_events').select('id, name').eq('is_active', true),
      ])
      setPayments(pRes.data ?? [])
      setStudents(sRes.data ?? [])
      setEvents(eRes.data as any[] ?? [])
    } catch (e) {
      console.error('Failed to load payments:', e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    const nameMatch = (p as any).student?.full_name?.toLowerCase().includes(q)
    const refMatch = p.receipt_number.toLowerCase().includes(q)
    const eventMatch = filterEvent ? p.tuition_event_id === filterEvent : true
    return (nameMatch || refMatch) && eventMatch
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const totalAmount = filtered.reduce((sum, p) => sum + Number(p.amount), 0)

  const onSubmit = async (data: PaymentForm) => {
    const receiptNumber = generateReceiptNumber()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('payments').insert({
      ...data,
      receipt_number: receiptNumber,
      created_by: user?.id,
    })
    if (error) { toast.error(error.message); return }

    // Notify parent if linked
    const { data: studentData } = await supabase
      .from('students')
      .select('parent:parents(user_id), full_name')
      .eq('id', data.student_id)
      .single()

    if ((studentData as any)?.parent?.user_id) {
      const eventName = events.find(e => e.id === data.tuition_event_id)?.name ?? 'event'
      await supabase.from('notifications').insert({
        user_id: (studentData as any).parent.user_id,
        title: 'Payment Recorded',
        body: `A payment of ${formatCurrency(data.amount, data.currency)} has been recorded for ${(studentData as any).full_name} for ${eventName}.`,
        type: 'payment_recorded',
      })
    }

    toast.success(`Payment recorded! Receipt: ${receiptNumber}`, { duration: 5000 })
    reset()
    setAddOpen(false)
    load()
  }

  const METHODS = ['Cash', 'MPESA', 'Bank Transfer', 'Cheque', 'Card']

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Payments</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} records · Total: <strong style={{ color: 'var(--text)' }}>{formatCurrency(totalAmount)}</strong>
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Record Payment</Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input placeholder="Search student or receipt…" leftIcon={<Search size={16} />} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <Select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
          <option value="">All Events</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
      </div>

      {loading ? <SkeletonList count={8} /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Student', 'Receipt No.', 'Amount', 'Method', 'Date', 'Event', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td className="px-5 py-3">
                      <div className="font-semibold" style={{ color: 'var(--text)' }}>{(p as any).student?.full_name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{(p as any).student?.admission_number}</div>
                    </td>
                    <td className="px-5 py-3">
                      <code className="text-xs px-2 py-0.5 rounded-lg font-mono" style={{ background: 'var(--input)', color: 'var(--text)' }}>{p.receipt_number}</code>
                    </td>
                    <td className="px-5 py-3 font-bold" style={{ color: '#10B981' }}>{formatCurrency(Number(p.amount), p.currency)}</td>
                    <td className="px-5 py-3"><Badge variant="muted">{p.method}</Badge></td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(p.payment_date)}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{(p as any).tuition_event?.name ?? '—'}</td>
                    <td className="px-5 py-3"><Badge variant="success">Paid</Badge></td>
                  </motion.tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No payments found</td></tr>
                )}
              </tbody>
            </table>
          </div>

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
      )}

      {/* Record Payment Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Record Payment" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Student" error={errors.student_id?.message} {...register('student_id')}>
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
          </Select>
          <Select label="Tuition Event" error={errors.tuition_event_id?.message} {...register('tuition_event_id')}>
            <option value="">Select event</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount" type="number" placeholder="5000" error={errors.amount?.message} {...register('amount', { valueAsNumber: true })} />
            <Select label="Currency" {...register('currency')}>
              <option value="KES">KES</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Method" {...register('method')}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Input label="Payment Date" type="date" {...register('payment_date')} />
          </div>
          <Input label="Reference (optional)" placeholder="Transaction ID, cheque no, etc." {...register('reference')} />
          <Input label="Notes (optional)" placeholder="Additional notes" {...register('notes')} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
