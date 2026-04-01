'use client'

import { useState, useEffect, useCallback } from 'react'
import { use } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, Users, CreditCard, Download } from 'lucide-react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import toast from 'react-hot-toast'

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string
  receipt_number: string
  student: { full_name: string }
}

interface Expense {
  id: string
  amount: number
  expense_date: string
  description: string
  category: { name: string; color: string }
}

export default function CenterFinancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = getSupabaseBrowserClient()
  const [center, setCenter] = useState<{ name: string; location: string | null } | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')

  const getPeriodDates = useCallback(() => {
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    let from: string
    if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    } else if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3)
      from = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0]
    } else {
      from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    }
    return { from, to }
  }, [period])

  const loadData = useCallback(async () => {
    setLoading(true)
    const { from, to } = getPeriodDates()
    try {
      const [centerRes, paymentsRes, expensesRes] = await Promise.all([
        supabase.from('tuition_centers').select('name, location').eq('id', id).single(),
        supabase.from('payments').select('id, amount, payment_date, method, receipt_number, student:students(full_name)').eq('tuition_center_id', id).gte('payment_date', from).lte('payment_date', to).order('payment_date', { ascending: false }),
        supabase.from('expenses').select('id, amount, expense_date, description, category:expense_categories(name, color)').eq('tuition_center_id', id).gte('expense_date', from).lte('expense_date', to).order('expense_date', { ascending: false }),
      ])
      setCenter(centerRes.data)
      setPayments((paymentsRes.data ?? []) as any)
      setExpenses((expensesRes.data ?? []) as any)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load center data')
    } finally {
      setLoading(false)
    }
  }, [supabase, id, getPeriodDates])

  useEffect(() => { loadData() }, [loadData])

  const { from, to } = getPeriodDates()
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit = totalRevenue - totalExpenses

  // Payment methods breakdown
  const methodMap = new Map<string, number>()
  payments.forEach(p => methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + Number(p.amount)))
  const methodData = Array.from(methodMap.entries()).map(([name, value]) => ({ name, value }))

  const exportCenterPDF = async () => {
    if (!center) return
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      doc.setFillColor(11, 15, 26)
      doc.rect(0, 0, 210, 40, 'F')
      try {
        const imgRes = await fetch('/logo.png')
        const imgBlob = await imgRes.blob()
        const reader = new FileReader()
        await new Promise<void>(resolve => {
          reader.onload = () => {
            try { doc.addImage(reader.result as string, 'PNG', 155, 3, 40, 34) } catch {}
            resolve()
          }
          reader.readAsDataURL(imgBlob)
        })
      } catch {}

      doc.setTextColor(245, 158, 11)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('PEAK PERFORMANCE TUTORING', 15, 15)
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(11)
      doc.text(`Center Report: ${center.name}`, 15, 24)
      doc.setFontSize(8)
      doc.text(`Period: ${from} to ${to}`, 15, 32)

      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', formatCurrency(totalRevenue)],
          ['Total Expenses', formatCurrency(totalExpenses)],
          ['Net Profit', formatCurrency(netProfit)],
          ['Total Payments', payments.length.toString()],
          ['Location', center.location ?? 'Not set'],
        ],
        headStyles: { fillColor: [11, 15, 26], textColor: [245, 158, 11] },
        margin: { left: 15, right: 15 },
      })

      const y1 = (doc as any).lastAutoTable.finalY + 10
      autoTable(doc, {
        startY: y1,
        head: [['Date', 'Student', 'Method', 'Receipt', 'Amount (KES)']],
        body: payments.map(p => [p.payment_date, (p as any).student?.full_name ?? '—', p.method, p.receipt_number, Number(p.amount).toLocaleString('en-KE')]),
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 4: { halign: 'right' } },
        margin: { left: 15, right: 15 },
      })

      doc.save(`center_${center.name.replace(/\s+/g, '_')}_report.pdf`)
      toast.success('PDF exported!')
    } catch (err) {
      console.error(err)
      toast.error('PDF export failed')
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/finance/centers">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text)' }}>
            {loading ? '…' : center?.name ?? 'Center'}
          </h1>
          {center?.location && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{center.location}</p>
          )}
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={exportCenterPDF} disabled={loading || !center}>
            <Download size={14} /> Export PDF
          </Button>
        </div>
      </div>

      {/* Period picker */}
      <div className="flex gap-2">
        {(['month', 'quarter', 'year'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
            style={{ background: period === p ? '#F59E0B' : 'var(--card)', color: period === p ? '#000' : 'var(--text)', border: '1px solid var(--card-border)' }}>
            This {p}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Revenue', value: totalRevenue, color: '#10B981', icon: <TrendingUp size={20} />, bg: 'from-emerald-500/20 to-teal-500/10' },
          { label: 'Expenses', value: totalExpenses, color: '#EF4444', icon: <TrendingDown size={20} />, bg: 'from-rose-500/20 to-pink-500/10' },
          { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? '#F59E0B' : '#EF4444', icon: <CreditCard size={20} />, bg: 'from-amber-500/20 to-orange-500/10' },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`p-5 bg-gradient-to-br ${item.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${item.color}20`, color: item.color }}>
                  {item.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
              </div>
              <p className="text-2xl font-black" style={{ color: loading ? 'var(--text-muted)' : item.color }}>
                {loading ? '…' : formatCurrency(item.value)}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart: Payment Methods */}
      {!loading && methodData.length > 0 && (
        <Card className="p-5">
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>Payment Methods</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={methodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12 }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Bar dataKey="value" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Payments table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(16,185,129,0.05)' }}>
          <TrendingUp size={16} style={{ color: '#10B981' }} />
          <h2 className="font-bold text-sm" style={{ color: 'var(--text)' }}>
            Payments ({payments.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {['Student', 'Date', 'Method', 'Receipt', 'Amount'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--card-border)' }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{(p as any).student?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(p.payment_date)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>{p.method}</span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.receipt_number}</code>
                  </td>
                  <td className="px-4 py-3 font-bold text-right" style={{ color: '#10B981' }}>{formatCurrency(Number(p.amount))}</td>
                </tr>
              ))}
              {payments.length === 0 && !loading && (
                <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No payments this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Expenses table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(239,68,68,0.05)' }}>
          <TrendingDown size={16} style={{ color: '#EF4444' }} />
          <h2 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Expenses ({expenses.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {['Description', 'Date', 'Category', 'Amount'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--card-border)' }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{e.description}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(e.expense_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: (e as any).category?.color ?? '#6B7280' }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(e as any).category?.name ?? 'Other'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-right" style={{ color: '#EF4444' }}>{formatCurrency(Number(e.amount))}</td>
                </tr>
              ))}
              {expenses.length === 0 && !loading && (
                <tr><td colSpan={4} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No expenses this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
