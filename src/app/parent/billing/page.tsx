'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { CreditCard, Download, ExternalLink, Filter } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function ParentBillingPage() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  
  useEffect(() => {
    if (profile) loadData()
  }, [profile])
  
  const loadData = async () => {
    setLoading(true)
    const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-32">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Billing & Financials</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your tuition, transport, and other school fees.</p>
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" className="gap-2"><Filter size={16} /> Filter</Button>
            <Button className="gap-2" style={{ background: 'var(--primary)' }}><Download size={16} /> Statement</Button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-emerald-500 text-white min-h-[160px] flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-white/20 rounded-xl"><CreditCard size={24} /></div>
                <div className="text-xs font-bold px-2 py-1 bg-white/20 rounded-lg">Total Paid</div>
             </div>
             <div>
                <h3 className="text-3xl font-black">{formatCurrency(45000)}</h3>
                <p className="text-sm opacity-80 mt-1">Academic Year 2024</p>
             </div>
          </Card>
          
          <Card className="p-6 bg-orange-500 text-white min-h-[160px] flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-white/20 rounded-xl"><CreditCard size={24} /></div>
                <div className="text-xs font-bold px-2 py-1 bg-white/20 rounded-lg">Outstanding Balance</div>
             </div>
             <div>
                <h3 className="text-3xl font-black">{formatCurrency(12500)}</h3>
                <p className="text-sm opacity-80 mt-1">Due in 14 days</p>
             </div>
          </Card>
       </div>

       <Card className="p-6">
          <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--text)' }}>Transaction Ledger</h2>
          
          <div className="space-y-4">
             {payments.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                   No transactions found.
                </div>
             ) : (
                payments.map((p, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-emerald-500/30 transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center text-emerald-500">
                            <CreditCard size={20} />
                         </div>
                         <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Term 1 Tuition Fee</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Mpesa • Ref: {p.id.slice(0, 8).toUpperCase()}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-lg font-black text-emerald-600">-{formatCurrency(p.amount)}</p>
                         <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(p.created_at)}</p>
                      </div>
                   </div>
                ))
             )}
          </div>
       </Card>
    </div>
  )
}
