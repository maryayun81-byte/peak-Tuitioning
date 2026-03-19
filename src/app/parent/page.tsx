'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CreditCard, GraduationCap, ClipboardList, 
  TrendingUp, Award, Bell, 
  ArrowRight, Download, CheckCircle2,
  AlertCircle, Wallet, Calendar, Users
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default function ParentDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  
  const [students, setStudents] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  useEffect(() => {
    if (profile) loadDashboard()
  }, [profile])

  const loadDashboard = async () => {
    setLoading(true)
    const [sRes, pRes] = await Promise.all([
      supabase.from('students').select('*, class:classes(name)').eq('parent_id', profile?.id),
      supabase.from('payments').select('*').limit(5)
    ])
    
    setStudents(sRes.data ?? [])
    if (sRes.data && sRes.data.length > 0) setSelectedStudent(sRes.data[0])
    setRecentPayments(pRes.data ?? [])
    setLoading(false)
  }

  if (loading) return <SkeletonDashboard />

  if (students.length === 0) {
    return (
      <div className="p-6 h-[80vh] flex flex-col items-center justify-center text-center space-y-6">
         <div className="w-24 h-24 rounded-[2.5rem] bg-[var(--input)] flex items-center justify-center border border-[var(--card-border)]">
            <GraduationCap size={48} className="text-muted opacity-20" />
         </div>
         <div className="max-w-md">
            <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>No Student Linked</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Link your child&apos;s account using their admission number and your secret parent PIN to see their progress.</p>
         </div>
         <Link href="/parent/link">
            <Button className="px-10 py-6 rounded-[1.5rem] shadow-xl shadow-primary/20">Link Student Now <ArrowRight size={18} className="ml-2" /></Button>
         </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-2xl font-black shrink-0" style={{ color: 'var(--text)' }}>Welcome back, {profile?.full_name.split(' ')[0]}</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Review your family&apos;s academic and financial status</p>
         </div>
         <div className="flex gap-4">
            <Badge variant="success" className="px-4 py-2 rounded-xl border-dashed">Academic Season 2024</Badge>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Linked Students" value={students.length} icon={<Users className="text-primary" size={20} />} />
         <StatCard title="Fees Balance" value={formatCurrency(12500)} icon={<Wallet className="text-orange-500" size={20} />} />
         <StatCard title="Avg. Attendance" value="96.5%" icon={<ClipboardList className="text-emerald-500" size={20} />} />
         <StatCard title="Mean Grade" value="A-" icon={<TrendingUp className="text-indigo-500" size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            {/* Student Spotlight */}
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Award size={20} className="text-primary" /> Student Highlights
               </h2>
               <div className="flex gap-2">
                  {students.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => setSelectedStudent(s)}
                      className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${selectedStudent?.id === s.id ? 'bg-primary text-white shadow-lg' : 'bg-[var(--input)] text-muted hover:bg-[var(--card-border)]'}`}
                    >
                       {s.full_name.split(' ')[0]}
                    </button>
                  ))}
               </div>
            </div>

            <Card className="p-8 border-none bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-xl shadow-emerald-500/10">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-4">
                     <div>
                        <h3 className="text-2xl font-black">{selectedStudent?.full_name}</h3>
                        <p className="text-sm opacity-80">{selectedStudent?.class?.name} • Top 5 in Physics</p>
                     </div>
                     <div className="flex gap-4">
                        <div className="px-4 py-2 bg-white/20 rounded-xl">
                           <div className="text-[10px] font-bold uppercase opacity-60">Latest Score</div>
                           <div className="text-lg font-black">94%</div>
                        </div>
                        <div className="px-4 py-2 bg-white/20 rounded-xl">
                           <div className="text-[10px] font-bold uppercase opacity-60">Attendance</div>
                           <div className="text-lg font-black">98%</div>
                        </div>
                     </div>
                  </div>
                  <Link href={`/parent/academics/${selectedStudent?.id}`}>
                     <Button className="bg-white text-emerald-600 hover:bg-white/90 border-none font-black">Full Intel Report <ArrowRight size={18} className="ml-2" /></Button>
                  </Link>
               </div>
            </Card>

            {/* Financial Overview */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-muted">Recent Financial Activity</h3>
                  <Link href="/parent/billing" className="text-xs font-bold text-primary hover:underline">View Ledger</Link>
               </div>
               <div className="space-y-3">
                  {recentPayments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)]">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                             <CreditCard size={20} />
                          </div>
                          <div>
                             <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>Tuition Fee Payment</p>
                             <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(p.created_at, 'short')} • ID: {p.id.slice(0, 8)}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">-{formatCurrency(p.amount)}</p>
                          <Badge variant="success" className="text-[8px]">Processed</Badge>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Sidebar Alerts */}
         <div className="space-y-8">
            <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
               <Bell size={20} className="text-indigo-500" /> Notifications
            </h2>
            <div className="space-y-4">
               {[
                 { title: 'New Transcript', desc: 'Q1 Grade Transcript is now available for download.', icon: <Download size={14} />, type: 'info' },
                 { title: 'Upcoming Exam', desc: 'End of term exams start on March 25th.', icon: <Calendar size={14} />, type: 'warning' },
                 { title: 'Bill Posted', desc: 'March transport and meals fee has been posted.', icon: <AlertCircle size={14} />, type: 'error' },
               ].map((n, i) => (
                 <Card key={i} className="p-4 border-none shadow-md group hover:bg-[var(--input)] transition-colors cursor-pointer">
                    <div className="flex gap-4">
                       <div className={`p-2.5 rounded-xl shrink-0 ${n.type === 'error' ? 'bg-rose-500/10 text-rose-500' : n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {n.icon}
                       </div>
                       <div>
                          <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{n.title}</p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{n.desc}</p>
                       </div>
                    </div>
                 </Card>
               ))}
            </div>

            <Card className="p-6 bg-indigo-500/5 border-dashed border-2 border-indigo-500/20 text-center space-y-4">
               <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-500">
                  <GraduationCap size={32} />
               </div>
               <div>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Support Contact</h4>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Need help? Reach out to our 24/7 success team.</p>
               </div>
               <Button variant="secondary" size="sm" className="w-full text-[10px] font-black">Contact Success Team</Button>
            </Card>
         </div>
      </div>
    </div>
  )
}

