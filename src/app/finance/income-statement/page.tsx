'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Download, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface PLData {
  revenue: { label: string; amount: number }[]
  expenses: { label: string; amount: number; color: string }[]
  totalRevenue: number
  totalExpenses: number
  grossProfit: number
  netIncome: number
  margin: number
  chartData: { name: string; Revenue: number; Expenses: number }[]
}

export default function IncomeStatement() {
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<PLData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  const getPeriodDates = useCallback(() => {
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    let from: string
    if (period === 'week') {
      const s = new Date(now); s.setDate(s.getDate() - 7)
      from = s.toISOString().split('T')[0]
    } else if (period === 'month') {
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
      const [paymentsRes, expensesRes, centersRes] = await Promise.all([
        supabase.from('payments').select('amount, tuition_center_id, center:tuition_centers(name), tuition_event:tuition_events(name)')
          .gte('payment_date', from).lte('payment_date', to),
        supabase.from('expenses').select('amount, description, category:expense_categories(name, color), center:tuition_centers(name)')
          .gte('expense_date', from).lte('expense_date', to),
        supabase.from('tuition_centers').select('id, name'),
      ])

      const payments = paymentsRes.data ?? []
      const expenses = expensesRes.data ?? []
      const centers = centersRes.data ?? []

      // Revenue by center
      const centerRevMap = new Map<string, number>()
      payments.forEach((p: any) => {
        const name = p.center?.name ?? 'Unassigned'
        centerRevMap.set(name, (centerRevMap.get(name) ?? 0) + Number(p.amount))
      })

      const revenue = Array.from(centerRevMap.entries()).map(([label, amount]) => ({ label, amount }))
      const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)

      // Expenses by category
      const catMap = new Map<string, { amount: number; color: string }>()
      expenses.forEach((e: any) => {
        const cat = e.category?.name ?? 'Other'
        const col = e.category?.color ?? '#6B7280'
        if (!catMap.has(cat)) catMap.set(cat, { amount: 0, color: col })
        catMap.get(cat)!.amount += Number(e.amount)
      })
      const expenseItems = Array.from(catMap.entries()).map(([label, { amount, color }]) => ({ label, amount, color }))
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)

      // Chart: by center comparison
      const chartData = centers.map(c => {
        const rev = centerRevMap.get(c.name) ?? 0
        const exp = expenses.filter((e: any) => e.center?.name === c.name).reduce((s, e) => s + Number(e.amount), 0)
        return { name: c.name.length > 12 ? c.name.substring(0, 12) + '…' : c.name, Revenue: rev, Expenses: exp }
      }).filter(d => d.Revenue > 0 || d.Expenses > 0)

      setData({
        revenue,
        expenses: expenseItems,
        totalRevenue,
        totalExpenses,
        grossProfit: totalRevenue,
        netIncome: totalRevenue - totalExpenses,
        margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
        chartData,
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to load income statement')
    } finally {
      setLoading(false)
    }
  }, [supabase, getPeriodDates])

  useEffect(() => { loadData() }, [loadData])

  const { from, to } = getPeriodDates()

  const exportPDF = async () => {
    if (!data) return
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      doc.setFillColor(11, 15, 26)
      doc.rect(0, 0, 210, 45, 'F')

      try {
        const imgRes = await fetch('/logo.png')
        const imgBlob = await imgRes.blob()
        const reader = new FileReader()
        await new Promise<void>(resolve => {
          reader.onload = () => {
            try { doc.addImage(reader.result as string, 'PNG', 155, 5, 40, 35) } catch {}
            resolve()
          }
          reader.readAsDataURL(imgBlob)
        })
      } catch {}

      doc.setTextColor(245, 158, 11)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('PEAK PERFORMANCE TUTORING', 15, 18)
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(12)
      doc.text('Income Statement (Profit & Loss)', 15, 28)
      doc.setFontSize(9)
      doc.text(`Period: ${from} to ${to}`, 15, 37)

      let y = 55

      // Revenue section
      doc.setFillColor(16, 185, 129)
      doc.roundedRect(15, y, 180, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('REVENUE', 18, y + 5.5)
      y += 12

      autoTable(doc, {
        startY: y,
        head: [['Revenue Source', 'Amount (KES)']],
        body: [
          ...data.revenue.map(r => [r.label, r.amount.toLocaleString('en-KE')]),
          [{ content: 'TOTAL REVENUE', styles: { fontStyle: 'bold' } }, { content: data.totalRevenue.toLocaleString('en-KE'), styles: { fontStyle: 'bold' } }],
        ],
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 15, right: 15 },
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // Expenses section
      doc.setFillColor(239, 68, 68)
      doc.roundedRect(15, y, 180, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('EXPENSES', 18, y + 5.5)
      y += 12

      autoTable(doc, {
        startY: y,
        head: [['Expense Category', 'Amount (KES)']],
        body: [
          ...data.expenses.map(e => [e.label, e.amount.toLocaleString('en-KE')]),
          [{ content: 'TOTAL EXPENSES', styles: { fontStyle: 'bold' } }, { content: data.totalExpenses.toLocaleString('en-KE'), styles: { fontStyle: 'bold' } }],
        ],
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 15, right: 15 },
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // Bottom line
      doc.setFillColor(data.netIncome >= 0 ? 245 : 239, data.netIncome >= 0 ? 158 : 68, data.netIncome >= 0 ? 11 : 68)
      doc.roundedRect(15, y, 180, 20, 3, 3, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('NET INCOME', 20, y + 8)
      doc.setFontSize(14)
      doc.text(`KES ${data.netIncome.toLocaleString('en-KE')}`, 20, y + 16)
      doc.setFontSize(9)
      doc.text(`Margin: ${data.margin.toFixed(1)}%`, 140, y + 12)

      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text('Peak Performance Tutoring — Confidential Finance Document', 15, 285)
      doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 130, 285)

      doc.save(`income_statement_${to}.pdf`)
      toast.success('PDF exported!')
    } catch (err) {
      console.error(err)
      toast.error('PDF export failed')
    }
  }

  const PERIODS = ['week', 'month', 'quarter', 'year']

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text)' }}>Income Statement</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Profit & Loss · {from} to {to}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button size="sm" onClick={exportPDF} disabled={loading || !data}>
            <Download size={14} /> PDF
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p as any)}
            className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
            style={{ background: period === p ? '#F59E0B' : 'var(--card)', color: period === p ? '#000' : 'var(--text)', border: '1px solid var(--card-border)' }}>
            This {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Banner */}
      {!loading && data && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: data.totalRevenue, icon: <TrendingUp size={20} />, color: '#10B981', bg: 'from-emerald-500/20 to-teal-500/10' },
            { label: 'Total Expenses', value: data.totalExpenses, icon: <TrendingDown size={20} />, color: '#EF4444', bg: 'from-rose-500/20 to-pink-500/10' },
            { label: 'Net Income', value: data.netIncome, icon: <Minus size={20} />, color: data.netIncome >= 0 ? '#F59E0B' : '#EF4444', bg: data.netIncome >= 0 ? 'from-amber-500/20 to-orange-500/10' : 'from-rose-500/20 to-red-500/10' },
          ].map((item, i) => (
            <Card key={i} className={`p-5 bg-gradient-to-br ${item.bg} border-0`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${item.color}20`, color: item.color }}>
                  {item.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
              </div>
              <p className="text-2xl font-black" style={{ color: item.color }}>{formatCurrency(item.value)}</p>
              {item.label === 'Net Income' && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Margin: {data.margin.toFixed(1)}%</p>
              )}
            </Card>
          ))}
        </motion.div>
      )}

      {/* Chart */}
      {!loading && data && data.chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>Revenue vs Expenses by Center</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--text)' }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Revenue" fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Detailed P&L Table */}
      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue Lines */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="overflow-hidden">
              <div className="px-5 py-3" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                <h3 className="font-black text-white text-sm uppercase tracking-wide">Revenue Lines</h3>
              </div>
              <div className="p-4 space-y-2">
                {data.revenue.map((r, i) => (
                  <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{r.label}</span>
                    <span className="font-bold text-sm" style={{ color: '#10B981' }}>{formatCurrency(r.amount)}</span>
                  </div>
                ))}
                {data.revenue.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No revenue recorded</p>
                )}
                <div className="pt-2 flex justify-between font-black">
                  <span style={{ color: 'var(--text)' }}>TOTAL</span>
                  <span style={{ color: '#10B981' }}>{formatCurrency(data.totalRevenue)}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Expense Lines */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <Card className="overflow-hidden">
              <div className="px-5 py-3" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                <h3 className="font-black text-white text-sm uppercase tracking-wide">Expense Lines</h3>
              </div>
              <div className="p-4 space-y-2">
                {data.expenses.map((e, i) => (
                  <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{e.label}</span>
                    </div>
                    <span className="font-bold text-sm" style={{ color: '#EF4444' }}>{formatCurrency(e.amount)}</span>
                  </div>
                ))}
                {data.expenses.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No expenses recorded</p>
                )}
                <div className="pt-2 flex justify-between font-black">
                  <span style={{ color: 'var(--text)' }}>TOTAL</span>
                  <span style={{ color: '#EF4444' }}>{formatCurrency(data.totalExpenses)}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
