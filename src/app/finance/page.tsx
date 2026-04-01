'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle,
  ArrowUpRight, ArrowDownRight, MapPin, RefreshCw, Calendar
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

interface KPIData {
  totalRevenueMTD: number
  totalExpensesMTD: number
  netProfitMTD: number
  totalOutstanding: number
  revenueChange: number
  expenseChange: number
}

interface CenterRevenue {
  name: string
  revenue: number
  expenses: number
}

interface WeeklyTrend {
  week: string
  revenue: number
  expenses: number
}

interface RecentPayment {
  id: string
  amount: number
  currency: string
  payment_date: string
  method: string
  receipt_number: string
  student: { full_name: string }
  tuition_event: { name: string } | null
}

interface ExpenseBreakdown {
  name: string
  value: number
  color: string
}

const COLORS = ['#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#F97316', '#06B6D4', '#6B7280']

export default function FinanceDashboard() {
  const supabase = getSupabaseBrowserClient()
  const [kpi, setKpi] = useState<KPIData>({
    totalRevenueMTD: 0, totalExpensesMTD: 0, netProfitMTD: 0,
    totalOutstanding: 0, revenueChange: 0, expenseChange: 0
  })
  const [centerRevenue, setCenterRevenue] = useState<CenterRevenue[]>([])
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([])
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = now.toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch payments MTD
      const [paymentsRes, lastMonthPayRes, expensesRes, lastMonthExpRes, centersRes, recentRes, expCatRes] = await Promise.all([
        supabase.from('payments').select('amount, tuition_center_id').gte('payment_date', monthStart).lte('payment_date', monthEnd),
        supabase.from('payments').select('amount').gte('payment_date', lastMonthStart).lte('payment_date', lastMonthEnd),
        supabase.from('expenses').select('amount, tuition_center_id, category:expense_categories(name, color)').gte('expense_date', monthStart).lte('expense_date', monthEnd),
        supabase.from('expenses').select('amount').gte('expense_date', lastMonthStart).lte('expense_date', lastMonthEnd),
        supabase.from('tuition_centers').select('id, name'),
        supabase.from('payments').select('id, amount, currency, payment_date, method, receipt_number, student:students(full_name), tuition_event:tuition_events(name)').order('payment_date', { ascending: false }).limit(8),
        supabase.from('expenses').select('amount, category:expense_categories(name, color)').gte('expense_date', monthStart).lte('expense_date', monthEnd),
      ])

      const payments = paymentsRes.data ?? []
      const lastMonthPay = lastMonthPayRes.data ?? []
      const expenses = expensesRes.data ?? []
      const lastMonthExp = lastMonthExpRes.data ?? []
      const centers = centersRes.data ?? []

      const totalRevMTD = payments.reduce((s, p) => s + Number(p.amount), 0)
      const totalExpMTD = expenses.reduce((s, e) => s + Number(e.amount), 0)
      const lastRevMTD = lastMonthPay.reduce((s, p) => s + Number(p.amount), 0)
      const lastExpMTD = lastMonthExp.reduce((s, e) => s + Number(e.amount), 0)

      setKpi({
        totalRevenueMTD: totalRevMTD,
        totalExpensesMTD: totalExpMTD,
        netProfitMTD: totalRevMTD - totalExpMTD,
        totalOutstanding: 0, // Would need fee schedule table
        revenueChange: lastRevMTD > 0 ? ((totalRevMTD - lastRevMTD) / lastRevMTD) * 100 : 0,
        expenseChange: lastExpMTD > 0 ? ((totalExpMTD - lastExpMTD) / lastExpMTD) * 100 : 0,
      })

      // Center revenue breakdown
      const centerMap = new Map<string, CenterRevenue>()
      centers.forEach(c => centerMap.set(c.id, { name: c.name, revenue: 0, expenses: 0 }))
      payments.forEach(p => {
        if (p.tuition_center_id && centerMap.has(p.tuition_center_id)) {
          centerMap.get(p.tuition_center_id)!.revenue += Number(p.amount)
        }
      })
      expenses.forEach((e: any) => {
        if (e.tuition_center_id && centerMap.has(e.tuition_center_id)) {
          centerMap.get(e.tuition_center_id)!.expenses += Number(e.amount)
        }
      })
      const centerArr = Array.from(centerMap.values()).filter(c => c.revenue > 0 || c.expenses > 0)
      if (centerArr.length === 0 && centers.length > 0) {
        centers.slice(0, 5).forEach(c => centerArr.push({ name: c.name, revenue: 0, expenses: 0 }))
      }
      setCenterRevenue(centerArr)

      // Weekly trend (last 8 weeks)
      const weeklyData: WeeklyTrend[] = []
      for (let i = 7; i >= 0; i--) {
        const weekEnd = new Date()
        weekEnd.setDate(weekEnd.getDate() - i * 7)
        const weekStart2 = new Date(weekEnd)
        weekStart2.setDate(weekStart2.getDate() - 6)
        const ws = weekStart2.toISOString().split('T')[0]
        const we = weekEnd.toISOString().split('T')[0]
        const [wPay, wExp] = await Promise.all([
          supabase.from('payments').select('amount').gte('payment_date', ws).lte('payment_date', we),
          supabase.from('expenses').select('amount').gte('expense_date', ws).lte('expense_date', we),
        ])
        const label = weekStart2.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        weeklyData.push({
          week: label,
          revenue: (wPay.data ?? []).reduce((s, p) => s + Number(p.amount), 0),
          expenses: (wExp.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
        })
      }
      setWeeklyTrend(weeklyData)

      // Recent payments
      setRecentPayments((recentRes.data ?? []) as any)

      // Expense breakdown by category
      const catMap = new Map<string, { value: number; color: string }>()
      ;(expCatRes.data ?? []).forEach((e: any) => {
        const catName = e.category?.name ?? 'Other'
        const catColor = e.category?.color ?? '#6B7280'
        if (!catMap.has(catName)) catMap.set(catName, { value: 0, color: catColor })
        catMap.get(catName)!.value += Number(e.amount)
      })
      setExpenseBreakdown(Array.from(catMap.entries()).map(([name, { value, color }]) => ({ name, value, color })))

      setLastRefresh(new Date())
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, monthStart, monthEnd, lastMonthStart, lastMonthEnd])

  useEffect(() => { load() }, [load])

  const kpiCards = [
    {
      label: 'Revenue (MTD)',
      value: formatCurrency(kpi.totalRevenueMTD),
      change: kpi.revenueChange,
      icon: <TrendingUp size={22} />,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'rgba(16,185,129,0.2)',
    },
    {
      label: 'Expenses (MTD)',
      value: formatCurrency(kpi.totalExpensesMTD),
      change: -kpi.expenseChange,
      icon: <TrendingDown size={22} />,
      gradient: 'from-rose-500 to-pink-600',
      glow: 'rgba(239,68,68,0.2)',
    },
    {
      label: 'Net Profit (MTD)',
      value: formatCurrency(kpi.netProfitMTD),
      change: null,
      icon: <DollarSign size={22} />,
      gradient: kpi.netProfitMTD >= 0 ? 'from-amber-400 to-orange-500' : 'from-rose-500 to-red-600',
      glow: kpi.netProfitMTD >= 0 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
    },
    {
      label: 'Transactions (MTD)',
      value: loading ? '—' : `${(recentPayments.length)} recent`,
      change: null,
      icon: <AlertCircle size={22} />,
      gradient: 'from-violet-500 to-purple-600',
      glow: 'rgba(139,92,246,0.2)',
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text)' }}>
            Finance Dashboard
          </h1>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Calendar size={14} />
            {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} · Updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 60 }}
          >
            <Card className="p-4 sm:p-5 relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top right, ${card.glow}, transparent 70%)` }}
              />
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${card.gradient} shadow-lg`}
                >
                  {card.icon}
                </div>
                {card.change !== null && (
                  <div
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${card.change >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}
                  >
                    {card.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(card.change).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {card.label}
              </p>
              <p className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text)' }}>
                {loading ? <span className="animate-pulse opacity-40">Loading…</span> : card.value}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Weekly Revenue Trend - takes 2/3 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-2"
        >
          <Card className="p-5">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>
              8-Week Revenue vs Expenses Trend
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--text)' }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="url(#expGrad)" strokeWidth={2} name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Expense Breakdown - 1/3 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-5 h-full">
            <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>Expense Breakdown</h2>
            {expenseBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-muted)' }}>
                No expenses this month
              </div>
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--text)' }}
                        formatter={(val: number) => formatCurrency(val)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {expenseBreakdown.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color || COLORS[i % COLORS.length] }} />
                        <span style={{ color: 'var(--text-muted)' }}>{item.name}</span>
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Revenue by Center */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="p-5">
          <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>Revenue by Center (MTD)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={centerRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--text)' }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#F59E0B" radius={[0, 6, 6, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {centerRevenue.length === 0 && !loading && (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              <MapPin size={32} className="mx-auto mb-2 opacity-20" />
              No center data. Assign payments to tuition centers to see this chart.
            </div>
          )}
        </Card>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="p-5">
          <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Student', 'Receipt', 'Amount', 'Method', 'Date', 'Event'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.04 }}
                    style={{ borderBottom: '1px solid var(--card-border)' }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-3 py-3 font-semibold" style={{ color: 'var(--text)' }}>
                      {(p as any).student?.full_name ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <code className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                        {p.receipt_number}
                      </code>
                    </td>
                    <td className="px-3 py-3 font-bold" style={{ color: '#10B981' }}>
                      {formatCurrency(Number(p.amount))}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                        {p.method}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(p as any).tuition_event?.name ?? '—'}
                    </td>
                  </motion.tr>
                ))}
                {recentPayments.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
                      No transactions recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
