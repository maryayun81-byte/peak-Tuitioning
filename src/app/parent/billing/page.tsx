'use client'

import { useState, useEffect } from 'react'
import { Card, Badge } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { CreditCard, Download, ExternalLink, Filter, Wallet, Sparkles, ClipboardList } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'

export default function ParentBillingPage() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [stats, setStats] = useState({
     totalPaid: 0,
     totalBalance: 12500 // Assuming a fixed remaining balance for demo if no bills table exists
  })
  
  useEffect(() => {
    if (profile && parent) loadData()
  }, [profile, parent])
  
  const loadData = async () => {
    if (!parent?.id) {
       console.warn('[ParentBilling] No parent ID')
       setLoading(false)
       return
    }
    setLoading(true)

    try {
      console.log('[ParentBilling] Fetching linked students...')
      // 1. Fetch linked students
      const { data: links, error: linkError } = await supabase
        .from('parent_student_links')
        .select('student:students(id)')
        .eq('parent_id', parent.id)
      
      if (linkError) {
        console.error('[ParentBilling] Link fetch error:', linkError)
        throw linkError
      }
      
      const students = links?.map((l: any) => l.student).filter(Boolean)

      if (!students || students.length === 0) {
         console.warn('[ParentBilling] No linked students found')
         setPayments([])
         return
      }

      const studentIds = students.map(s => s.id)
      console.log('[ParentBilling] Fetching payments for students:', studentIds)

      // 2. Fetch payments for those students
      const { data, error: payError } = await supabase
        .from('payments')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
      
      if (payError) {
        console.error('[ParentBilling] Payments fetch error:', payError)
        throw payError
      }
      
      const paid = data?.reduce((acc: number, curr: any) => acc + curr.amount, 0) || 0
      setPayments(data || [])
      setStats(prev => ({ ...prev, totalPaid: paid }))
    } catch (err: any) {
      console.error('[ParentBilling] Fatal error:', err)
      toast.error('Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-32">
       {/* Premium Header */}
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
                <Wallet size={12} /> Financial Overview
             </div>
             <h1 className="text-3xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                Billing & Ledger
             </h1>
             <p className="text-sm sm:text-base max-w-md" style={{ color: 'var(--text-muted)' }}>
                Securely manage tuition fees and view historical remittance data.
             </p>
          </div>
          <div className="flex gap-3">
             <Button variant="secondary" className="rounded-2xl px-6 font-black gap-2">
                <Filter size={18} /> Filter
             </Button>
             <Button className="rounded-2xl px-6 font-black gap-2 bg-primary text-white shadow-xl shadow-primary/20">
                <Download size={18} /> Statement
             </Button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
             <Card className="p-8 bg-emerald-600 text-white min-h-[180px] flex flex-col justify-between rounded-[2rem] border-none shadow-2xl shadow-emerald-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full transition-transform group-hover:scale-110" />
                <div className="flex justify-between items-start relative z-10">
                   <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><CreditCard size={24} /></div>
                   <Badge className="bg-white/20 text-white border-none uppercase text-[8px] font-black tracking-[0.2em]">Live Data</Badge>
                </div>
                <div className="relative z-10">
                   <h3 className="text-4xl font-black tracking-tighter">{formatCurrency(stats.totalPaid)}</h3>
                   <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest text-emerald-100">Total Paid (2024)</p>
                </div>
             </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
             <Card className="p-8 bg-orange-500 text-white min-h-[180px] flex flex-col justify-between rounded-[2rem] border-none shadow-2xl shadow-orange-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full transition-transform group-hover:scale-110" />
                <div className="flex justify-between items-start relative z-10">
                   <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Wallet size={24} /></div>
                   <Badge className="bg-white/20 text-white border-none uppercase text-[8px] font-black tracking-[0.2em]">Outstanding</Badge>
                </div>
                <div className="relative z-10">
                   <h3 className="text-4xl font-black tracking-tighter">{formatCurrency(stats.totalBalance)}</h3>
                   <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest text-orange-100">Next Due: April 15</p>
                </div>
             </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
             <Card className="p-8 bg-indigo-600 text-white min-h-[180px] flex flex-col justify-between rounded-[2rem] border-none shadow-2xl shadow-indigo-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full transition-transform group-hover:scale-110" />
                <div className="flex justify-between items-start relative z-10">
                   <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Sparkles size={24} /></div>
                   <Badge className="bg-white/20 text-white border-none uppercase text-[8px] font-black tracking-[0.2em]">Family Score</Badge>
                </div>
                <div className="relative z-10">
                   <h3 className="text-4xl font-black tracking-tighter">Gold</h3>
                   <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest text-indigo-100">Preferred Payer Status</p>
                </div>
             </Card>
          </motion.div>
       </div>

       <Card className="p-8 sm:p-12 rounded-[3rem] border-none shadow-2xl bg-[var(--card)]">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <ClipboardList size={22} className="text-primary" /> Transaction Ledger
             </h2>
             <span className="text-[10px] font-black uppercase tracking-widest text-muted">{payments.length} Records</span>
          </div>
          
          <div className="space-y-4">
             {payments.length === 0 ? (
                <div className="py-20 text-center space-y-4 bg-[var(--input)] rounded-[2rem] border-dashed border-2 border-[var(--card-border)]">
                   <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                      <CreditCard size={32} />
                   </div>
                   <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No transactions recorded yet.</p>
                </div>
             ) : (
                payments.map((p, i) => (
                   <motion.div 
                     key={i} 
                     initial={{ opacity: 0, y: 10 }} 
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className="flex items-center justify-between p-6 rounded-[2rem] bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/20 hover:bg-[var(--bg)] transition-all group"
                   >
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                            <CreditCard size={24} />
                         </div>
                         <div>
                            <p className="text-base font-black" style={{ color: 'var(--text)' }}>Tuition Fee Remittance</p>
                            <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                               Mpesa Transfer • Trace: <span className="font-bold text-primary">{p.id.slice(0, 10).toUpperCase()}</span>
                            </p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black text-emerald-600">{formatCurrency(p.amount)}</p>
                         <div className="flex items-center gap-2 justify-end mt-1">
                            <Badge variant="success" className="text-[8px] py-0.5 rounded-md">Validated</Badge>
                            <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{formatDate(p.created_at, 'short')}</p>
                         </div>
                      </div>
                   </motion.div>
                ))
             )}
          </div>
       </Card>
    </div>
  )
}
