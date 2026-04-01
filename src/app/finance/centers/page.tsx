'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { MapPin, TrendingUp, TrendingDown, Users, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

interface CenterSummary {
  id: string
  name: string
  location: string | null
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  paymentCount: number
}

export default function FinanceCenters() {
  const supabase = getSupabaseBrowserClient()
  const [centers, setCenters] = useState<CenterSummary[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = now.toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [centersRes, paymentsRes, expensesRes] = await Promise.all([
        supabase.from('tuition_centers').select('id, name, location').order('name'),
        supabase.from('payments').select('amount, tuition_center_id').gte('payment_date', monthStart).lte('payment_date', monthEnd),
        supabase.from('expenses').select('amount, tuition_center_id').gte('expense_date', monthStart).lte('expense_date', monthEnd),
      ])

      const centersData = centersRes.data ?? []
      const payments = paymentsRes.data ?? []
      const expenses = expensesRes.data ?? []

      const summaries: CenterSummary[] = centersData.map(c => {
        const cPayments = payments.filter(p => p.tuition_center_id === c.id)
        const cExpenses = expenses.filter(e => e.tuition_center_id === c.id)
        const rev = cPayments.reduce((s, p) => s + Number(p.amount), 0)
        const exp = cExpenses.reduce((s, e) => s + Number(e.amount), 0)
        return {
          id: c.id,
          name: c.name,
          location: c.location,
          totalRevenue: rev,
          totalExpenses: exp,
          netProfit: rev - exp,
          paymentCount: cPayments.length,
        }
      })

      setCenters(summaries)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase, monthStart, monthEnd])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text)' }}>Centers Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Financial summary per tuition center · Month-to-date
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--card)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {centers.map((center, i) => (
            <motion.div
              key={center.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link href={`/finance/centers/${center.id}`}>
                <Card className="p-5 relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none rounded-bl-full"
                    style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)' }} />

                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(245,158,11,0.1)' }}>
                      <MapPin size={24} style={{ color: '#F59E0B' }} />
                    </div>
                    <ChevronRight size={18} className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                      style={{ color: 'var(--text-muted)' }} />
                  </div>

                  <h3 className="font-black text-lg mb-0.5 truncate" style={{ color: 'var(--text)' }}>{center.name}</h3>
                  {center.location && (
                    <p className="text-xs mb-4 truncate" style={{ color: 'var(--text-muted)' }}>{center.location}</p>
                  )}

                  <div className="space-y-2 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <TrendingUp size={13} style={{ color: '#10B981' }} /> Revenue
                      </span>
                      <span className="font-bold" style={{ color: '#10B981' }}>{formatCurrency(center.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <TrendingDown size={13} style={{ color: '#EF4444' }} /> Expenses
                      </span>
                      <span className="font-bold" style={{ color: '#EF4444' }}>{formatCurrency(center.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>Net Profit</span>
                      <span className="font-black" style={{ color: center.netProfit >= 0 ? '#F59E0B' : '#EF4444' }}>
                        {formatCurrency(center.netProfit)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Users size={11} />
                      {center.paymentCount} payments this month
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}

          {centers.length === 0 && (
            <div className="col-span-3 text-center py-16" style={{ color: 'var(--text-muted)' }}>
              <MapPin size={40} className="mx-auto mb-3 opacity-20" />
              <p>No tuition centers configured yet.</p>
              <p className="text-sm mt-1">Ask the Admin to add centers in the Admin Portal.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
