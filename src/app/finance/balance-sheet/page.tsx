'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Download, Calendar, RefreshCw, Building2, TrendingUp, TrendingDown, Scale } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface BalanceData {
  // Assets
  cashCollected: number
  cashByCenter: { name: string; amount: number }[]
  // Liabilities
  outstandingFees: number
  // Computed
  totalAssets: number
  totalLiabilities: number
  equity: number
}

export default function BalanceSheet() {
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const getPeriodDates = useCallback(() => {
    const now = new Date()
    let from: string, to: string
    to = now.toISOString().split('T')[0]
    if (period === 'week') {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      from = start.toISOString().split('T')[0]
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    } else if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3)
      from = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0]
    } else if (period === 'year') {
      from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    } else {
      from = customFrom
      to = customTo
    }
    return { from, to }
  }, [period, customFrom, customTo])

  const loadData = useCallback(async () => {
    setLoading(true)
    const { from, to } = getPeriodDates()
    try {
      const [paymentsRes, centersRes, expensesRes] = await Promise.all([
        supabase.from('payments').select('amount, tuition_center_id, center:tuition_centers(name)').gte('payment_date', from).lte('payment_date', to),
        supabase.from('tuition_centers').select('id, name'),
        supabase.from('expenses').select('amount').gte('expense_date', from).lte('expense_date', to),
      ])

      const payments = paymentsRes.data ?? []
      const centers = centersRes.data ?? []
      const expenses = expensesRes.data ?? []

      const cashCollected = payments.reduce((s, p) => s + Number(p.amount), 0)
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)

      // Group by center
      const centerMap = new Map<string, number>()
      centers.forEach(c => centerMap.set(c.id, 0))
      payments.forEach((p: any) => {
        if (p.tuition_center_id && centerMap.has(p.tuition_center_id)) {
          centerMap.set(p.tuition_center_id, (centerMap.get(p.tuition_center_id) ?? 0) + Number(p.amount))
        }
      })

      const cashByCenter = centers.map(c => ({
        name: c.name,
        amount: centerMap.get(c.id) ?? 0,
      }))

      const bd: BalanceData = {
        cashCollected,
        cashByCenter,
        outstandingFees: 0, // Placeholder — need fee schedule to compute
        totalAssets: cashCollected,
        totalLiabilities: totalExpenses,
        equity: cashCollected - totalExpenses,
      }
      setData(bd)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load balance sheet')
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

      // Dark header bar
      doc.setFillColor(11, 15, 26)
      doc.rect(0, 0, 210, 45, 'F')

      // Try to embed the logo image
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
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('PEAK PERFORMANCE TUTORING', 15, 18)
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(13)
      doc.text('Balance Sheet', 15, 28)
      doc.setFontSize(9)
      doc.text(`As of: ${to} | Period: ${from} to ${to}`, 15, 37)

      let y = 55

      // ASSETS
      doc.setFillColor(16, 185, 129)
      doc.roundedRect(15, y, 180, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('ASSETS', 18, y + 5.5)
      y += 14

      autoTable(doc, {
        startY: y,
        head: [['Asset', 'KES Amount']],
        body: [
          ['Cash Collected (Total)', data.cashCollected.toLocaleString('en-KE')],
          ...data.cashByCenter.map(c => [`  └ ${c.name}`, c.amount.toLocaleString('en-KE')]),
        ],
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 15, right: 15 },
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // LIABILITIES
      doc.setFillColor(239, 68, 68)
      doc.roundedRect(15, y, 180, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('LIABILITIES', 18, y + 5.5)
      y += 14

      autoTable(doc, {
        startY: y,
        head: [['Liability', 'KES Amount']],
        body: [
          ['Total Expenses (Period)', data.totalLiabilities.toLocaleString('en-KE')],
          ['Outstanding Fees', data.outstandingFees.toLocaleString('en-KE')],
        ],
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 15, right: 15 },
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // EQUITY
      doc.setFillColor(245, 158, 11)
      doc.roundedRect(15, y, 180, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('EQUITY (NET POSITION)', 18, y + 5.5)
      y += 14

      autoTable(doc, {
        startY: y,
        body: [
          ['Net Position (Assets − Liabilities)', data.equity.toLocaleString('en-KE')],
        ],
        bodyStyles: { fontSize: 11, fontStyle: 'bold', fillColor: [245, 245, 220] },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 15, right: 15 },
      })

      // Footer
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text('Peak Performance Tutoring — Confidential Finance Document', 15, 285)
      doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 130, 285)

      doc.save(`balance_sheet_${to}.pdf`)
      toast.success('Balance Sheet PDF exported!')
    } catch (err) {
      console.error(err)
      toast.error('PDF export failed')
    }
  }

  const PERIODS = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text)' }}>Balance Sheet</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Period: {from} to {to}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button size="sm" onClick={exportPDF} disabled={loading || !data}>
            <Download size={14} /> Export PDF
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value as any)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: period === p.value ? '#F59E0B' : 'var(--card)',
              color: period === p.value ? '#000' : 'var(--text)',
              border: '1px solid var(--card-border)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Balance Sheet Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--card)' }} />
          ))}
        </div>
      ) : data && (
        <div className="space-y-4">
          {/* ASSETS */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                <TrendingUp size={18} className="text-white" />
                <h2 className="font-black text-white uppercase tracking-wide text-sm">Assets</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Cash Collected (Period)</span>
                  <span className="font-black text-xl" style={{ color: '#10B981' }}>{formatCurrency(data.cashCollected)}</span>
                </div>
                {data.cashByCenter.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 pl-4">
                    <span className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <Building2 size={14} /> {c.name}
                    </span>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{formatCurrency(c.amount)}</span>
                  </div>
                ))}
                <div className="pt-3 flex items-center justify-between" style={{ borderTop: '2px solid #10B981' }}>
                  <span className="font-black uppercase text-sm tracking-wide" style={{ color: 'var(--text)' }}>Total Assets</span>
                  <span className="font-black text-2xl" style={{ color: '#10B981' }}>{formatCurrency(data.totalAssets)}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* LIABILITIES */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                <TrendingDown size={18} className="text-white" />
                <h2 className="font-black text-white uppercase tracking-wide text-sm">Liabilities</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm" style={{ color: 'var(--text)' }}>Total Expenses (Period)</span>
                  <span className="font-semibold" style={{ color: '#EF4444' }}>{formatCurrency(data.totalLiabilities)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm" style={{ color: 'var(--text)' }}>Outstanding Fees</span>
                  <span className="font-semibold" style={{ color: '#EF4444' }}>{formatCurrency(data.outstandingFees)}</span>
                </div>
                <div className="pt-3 flex items-center justify-between" style={{ borderTop: '2px solid #EF4444' }}>
                  <span className="font-black uppercase text-sm tracking-wide" style={{ color: 'var(--text)' }}>Total Liabilities</span>
                  <span className="font-black text-2xl" style={{ color: '#EF4444' }}>{formatCurrency(data.totalLiabilities)}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* EQUITY */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2" style={{ background: data.equity >= 0 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                <Scale size={18} className="text-white" />
                <h2 className="font-black text-white uppercase tracking-wide text-sm">Equity (Net Position)</h2>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                    Total Assets − Total Liabilities
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(data.totalAssets)} − {formatCurrency(data.totalLiabilities)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black" style={{ color: data.equity >= 0 ? '#F59E0B' : '#EF4444' }}>
                    {formatCurrency(Math.abs(data.equity))}
                  </p>
                  <p className="text-sm font-semibold mt-1" style={{ color: data.equity >= 0 ? '#10B981' : '#EF4444' }}>
                    {data.equity >= 0 ? '▲ Surplus' : '▼ Deficit'}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
