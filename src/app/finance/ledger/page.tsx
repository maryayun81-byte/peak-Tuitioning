'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Download, Filter, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, Calendar, X
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface LedgerEntry {
  id: string
  date: string
  description: string
  center: string
  category: string
  type: 'revenue' | 'expense'
  debit: number
  credit: number
  method?: string
  reference?: string
}

interface TuitionCenter {
  id: string
  name: string
}

export default function GeneralLedger() {
  const supabase = getSupabaseBrowserClient()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [centers, setCenters] = useState<TuitionCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCenter, setSelectedCenter] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [paymentsRes, expensesRes, centersRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount, currency, payment_date, method, receipt_number, notes, reference, tuition_center_id, student:students(full_name), tuition_event:tuition_events(name), center:tuition_centers(name)')
          .gte('payment_date', dateFrom)
          .lte('payment_date', dateTo)
          .order('payment_date', { ascending: false }),
        supabase
          .from('expenses')
          .select('id, amount, currency, expense_date, description, notes, tuition_center_id, category:expense_categories(name, color), center:tuition_centers(name)')
          .gte('expense_date', dateFrom)
          .lte('expense_date', dateTo)
          .order('expense_date', { ascending: false }),
        supabase.from('tuition_centers').select('id, name').order('name'),
      ])

      setCenters(centersRes.data ?? [])

      const paymentEntries: LedgerEntry[] = (paymentsRes.data ?? []).map((p: any) => ({
        id: `pay-${p.id}`,
        date: p.payment_date,
        description: `Payment — ${p.student?.full_name ?? 'Unknown'} (${p.tuition_event?.name ?? 'General'})`,
        center: p.center?.name ?? 'Unassigned',
        category: 'Fee Collection',
        type: 'revenue',
        debit: 0,
        credit: Number(p.amount),
        method: p.method,
        reference: p.receipt_number,
      }))

      const expenseEntries: LedgerEntry[] = (expensesRes.data ?? []).map((e: any) => ({
        id: `exp-${e.id}`,
        date: e.expense_date,
        description: e.description,
        center: e.center?.name ?? 'Unassigned',
        category: e.category?.name ?? 'Other',
        type: 'expense',
        debit: Number(e.amount),
        credit: 0,
        reference: undefined,
      }))

      const all = [...paymentEntries, ...expenseEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEntries(all)
    } catch (err) {
      console.error('Ledger load error:', err)
      toast.error('Failed to load ledger data')
    } finally {
      setLoading(false)
    }
  }, [supabase, dateFrom, dateTo])

  useEffect(() => { loadData() }, [loadData])

  const filtered = entries.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = e.description.toLowerCase().includes(q) || e.center.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || (e.reference?.toLowerCase().includes(q) ?? false)
    const matchCenter = selectedCenter ? e.center === centers.find(c => c.id === selectedCenter)?.name : true
    const matchType = selectedType ? e.type === selectedType : true
    return matchSearch && matchCenter && matchType
  })

  // Running balance
  let runningBalance = 0
  const withBalance = filtered.map(e => {
    runningBalance += e.credit - e.debit
    return { ...e, balance: runningBalance }
  })

  const paginated = withBalance.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const totalRevenue = filtered.filter(e => e.type === 'revenue').reduce((s, e) => s + e.credit, 0)
  const totalExpenses = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + e.debit, 0)
  const netBalance = totalRevenue - totalExpenses

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Center', 'Category', 'Type', 'Debit (KES)', 'Credit (KES)', 'Balance (KES)', 'Reference']
    const rows = withBalance.map(e => [
      e.date, e.description, e.center, e.category, e.type,
      e.debit || '', e.credit || '', e.balance, e.reference || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger_${dateFrom}_to_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported!')
  }

  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Header
      doc.setFillColor(11, 15, 26)
      doc.rect(0, 0, 297, 40, 'F')
      doc.setTextColor(245, 158, 11)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('PEAK PERFORMANCE TUTORING', 15, 16)
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(11)
      doc.text('General Ledger Report', 15, 24)
      doc.setFontSize(9)
      doc.text(`Period: ${dateFrom} to ${dateTo}`, 15, 32)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 200, 32)

      // Summary boxes
      doc.setFillColor(16, 185, 129)
      doc.roundedRect(15, 46, 60, 14, 3, 3, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.text('Total Revenue', 18, 52)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(formatCurrency(totalRevenue), 18, 58)

      doc.setFillColor(239, 68, 68)
      doc.roundedRect(82, 46, 60, 14, 3, 3, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Total Expenses', 85, 52)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(formatCurrency(totalExpenses), 85, 58)

      doc.setFillColor(netBalance >= 0 ? 245 : 239, netBalance >= 0 ? 158 : 68, netBalance >= 0 ? 11 : 68)
      doc.roundedRect(149, 46, 60, 14, 3, 3, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Net Balance', 152, 52)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(formatCurrency(netBalance), 152, 58)

      // Table
      autoTable(doc, {
        startY: 68,
        head: [['Date', 'Description', 'Center', 'Category', 'Type', 'Debit (KES)', 'Credit (KES)', 'Balance (KES)']],
        body: withBalance.map(e => [
          e.date,
          e.description.length > 40 ? e.description.substring(0, 40) + '…' : e.description,
          e.center,
          e.category,
          e.type.toUpperCase(),
          e.debit > 0 ? Number(e.debit).toLocaleString('en-KE') : '',
          e.credit > 0 ? Number(e.credit).toLocaleString('en-KE') : '',
          Number(e.balance).toLocaleString('en-KE'),
        ]),
        headStyles: { fillColor: [11, 15, 26], textColor: [245, 158, 11], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 248, 252] },
        columnStyles: {
          5: { halign: 'right', textColor: [239, 68, 68] },
          6: { halign: 'right', textColor: [16, 185, 129] },
          7: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 15, right: 15 },
      })

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        doc.text('Peak Performance Tutoring — Confidential Finance Document', 15, 200)
        doc.text(`Page ${i} of ${pageCount}`, 250, 200)
      }

      doc.save(`ledger_${dateFrom}_to_${dateTo}.pdf`)
      toast.success('PDF exported successfully!')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to generate PDF')
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text)' }}>General Ledger</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} entries · Revenue: <strong style={{ color: '#10B981' }}>{formatCurrency(totalRevenue)}</strong> · Expenses: <strong style={{ color: '#EF4444' }}>{formatCurrency(totalExpenses)}</strong> · Net: <strong style={{ color: netBalance >= 0 ? '#F59E0B' : '#EF4444' }}>{formatCurrency(netBalance)}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download size={15} /> CSV
          </Button>
          <Button size="sm" onClick={exportPDF}>
            <Download size={15} /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search entries…"
            leftIcon={<Search size={15} />}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <div className="flex items-center gap-2">
            <Calendar size={15} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
            />
          </div>
          <Select value={selectedCenter} onChange={e => setSelectedCenter(e.target.value)}>
            <option value="">All Centers</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            <option value="">All Types</option>
            <option value="revenue">Revenue</option>
            <option value="expense">Expense</option>
          </Select>
        </div>
      </Card>

      {/* Ledger Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                {['Date', 'Description', 'Center', 'Category', 'Type', 'Debit (KES)', 'Credit (KES)', 'Balance (KES)'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--input)', width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  style={{ borderBottom: '1px solid var(--card-border)' }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="font-medium truncate" style={{ color: 'var(--text)' }}>{entry.description}</div>
                    {entry.reference && (
                      <code className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{entry.reference}</code>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {entry.center}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-1 rounded-full" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-bold ${entry.type === 'revenue' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                      {entry.type === 'revenue' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                      {entry.type === 'revenue' ? 'Revenue' : 'Expense'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: entry.debit > 0 ? '#EF4444' : 'var(--text-muted)' }}>
                    {entry.debit > 0 ? Number(entry.debit).toLocaleString('en-KE') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: entry.credit > 0 ? '#10B981' : 'var(--text-muted)' }}>
                    {entry.credit > 0 ? Number(entry.credit).toLocaleString('en-KE') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-black" style={{ color: (entry as any).balance >= 0 ? 'var(--text)' : '#EF4444' }}>
                    {Number((entry as any).balance).toLocaleString('en-KE')}
                  </td>
                </motion.tr>
              ))}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    No entries found for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '2px solid var(--card-border)' }}>
                  <td colSpan={5} className="px-4 py-3 font-black text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    TOTALS ({filtered.length} entries)
                  </td>
                  <td className="px-4 py-3 text-right font-black" style={{ color: '#EF4444' }}>
                    {totalExpenses.toLocaleString('en-KE')}
                  </td>
                  <td className="px-4 py-3 text-right font-black" style={{ color: '#10B981' }}>
                    {totalRevenue.toLocaleString('en-KE')}
                  </td>
                  <td className="px-4 py-3 text-right font-black" style={{ color: netBalance >= 0 ? '#F59E0B' : '#EF4444' }}>
                    {netBalance.toLocaleString('en-KE')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid var(--card-border)' }}>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages} · {filtered.length} entries</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={15} />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
