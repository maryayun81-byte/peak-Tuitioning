'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, GraduationCap, ClipboardList, 
  TrendingUp, Award, Bell, 
  ArrowRight, Download, CheckCircle2,
  AlertCircle, Wallet, Calendar, Users,
  Sparkles, Zap
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

function TypingText({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [speed, setSpeed] = useState(150)

  useEffect(() => {
    const handleTyping = () => {
      const currentPhrase = phrases[index % phrases.length]
      
      if (isDeleting) {
        setDisplayText(currentPhrase.substring(0, displayText.length - 1))
        setSpeed(50)
      } else {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1))
        setSpeed(100)
      }

      if (!isDeleting && displayText === currentPhrase) {
        setTimeout(() => setIsDeleting(true), 2000)
      } else if (isDeleting && displayText === '') {
        setIsDeleting(false)
        setIndex((prev) => prev + 1)
      }
    }

    const timer = setTimeout(handleTyping, speed)
    return () => clearTimeout(timer)
  }, [displayText, isDeleting, index, phrases, speed])

  return (
    <span className="inline-block min-h-[1.5em] text-primary">
      {displayText}
      <span className="ml-1 border-r-2 border-primary animate-pulse" />
    </span>
  )
}

export default function ParentDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  
  const [students, setStudents] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [stats, setStats] = useState({
    totalBalance: 0,
    avgAttendance: 0,
    meanGrade: 'A-'
  })

  useEffect(() => {
    if (profile) loadDashboard()
  }, [profile, parent])

  const loadDashboard = async () => {
    console.log('[ParentDashboard] loadDashboard triggered, parent:', parent?.id)
    if (!parent?.id) {
       console.warn('[ParentDashboard] No parent ID available yet. Stopping automatic data load.')
       setLoading(false)
       return
    }
    
    setLoading(true)
    try {
      console.log('[ParentDashboard] Executing dashboard queries...')
      const [sRes, pRes, nRes] = await Promise.all([
        supabase.from('parent_student_links').select('student:students(*, class:classes(name), attendance(present), results:quiz_attempts(score))').eq('parent_id', parent.id),
        supabase.from('payments').select('*').limit(5).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', profile?.id).limit(3).order('created_at', { ascending: false })
      ])
      
      if (sRes.error) {
        console.error('[ParentDashboard] Student query error:', sRes.error)
        toast.error('Failed to load students: ' + sRes.error.message)
      }
      
      const fetchedStudents = sRes.data?.map((l: any) => l.student).filter(Boolean) ?? []
      console.log(`[ParentDashboard] Loaded ${fetchedStudents.length} students`)
      setStudents(fetchedStudents)
      if (fetchedStudents.length > 0) setSelectedStudent(fetchedStudents[0])
      
      setRecentPayments(pRes.data ?? [])
      setNotifications(nRes.data ?? [])
 
      // Aggregate Stats
      let totalAtt = 0
      let presentCount = 0
      let totalScores = 0
      let scoreCount = 0
      
      fetchedStudents.forEach(s => {
         const att = s.attendance || []
         totalAtt += att.length
         presentCount += att.filter((a: any) => a.present).length

         const res = s.results || []
         res.forEach((r: any) => {
            totalScores += r.score
            scoreCount++
         })
      })

      setStats({
         totalBalance: 0, 
         avgAttendance: totalAtt > 0 ? (presentCount / totalAtt) * 100 : 98,
         meanGrade: scoreCount > 0 ? getGrade(totalScores / scoreCount) : 'A'
      })
    } catch (err: any) {
      console.error('[ParentDashboard] Fatal load error:', err)
      toast.error('Failed to load dashboard data')
    } finally {
      console.log('[ParentDashboard] Loading complete')
      setLoading(false)
    }
  }

  const getGrade = (score: number) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B+'
    if (score >= 60) return 'B'
    return 'C'
  }

  if (loading) return <SkeletonDashboard />

  if (students.length === 0) {
    return (
      <div className="p-4 sm:p-6 min-h-[85vh] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] bg-[var(--card)] border border-[var(--card-border)] shadow-2xl relative overflow-hidden text-center space-y-6 sm:space-y-8"
        >
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-tr-full -z-10" />

          <div className="w-24 h-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <GraduationCap size={48} />
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
              Welcome to the <br className="hidden sm:block" />
              <TypingText phrases={['Parent Portal', 'Growth Journey', 'Education Success']} />
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              To get started, you need to link your students. It&apos;s a quick one-time process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {[
              { step: '1', text: 'Get Admission Numbers' },
              { step: '2', text: 'Find Secret PIN in Notifications' },
              { step: '3', text: 'Link & Track Progress' },
            ].map((s) => (
              <div key={s.step} className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)]">
                <div className="text-xs font-black text-primary mb-1">STEP {s.step}</div>
                <div className="text-xs font-bold leading-tight" style={{ color: 'var(--text)' }}>{s.text}</div>
              </div>
            ))}
          </div>

          <div className="pt-2 sm:pt-4">
            <Link href="/parent/link">
              <Button size="lg" className="w-full sm:w-auto px-8 sm:px-12 py-6 sm:py-8 text-lg sm:text-xl font-black rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl shadow-primary/30 transition-transform hover:scale-105 active:scale-95">
                Link Students Now <ArrowRight size={20} className="ml-2" />
              </Button>
            </Link>
          </div>
          
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-30">
            Secure • Real-time • Academic Insights
          </p>
        </motion.div>
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
            <div className="bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-500/20 text-xs font-black uppercase tracking-wider flex items-center gap-2">
               <Zap size={14} className="fill-emerald-600" /> Academic Season 2024
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Linked Students" value={students.length} icon={<Users className="text-primary" size={20} />} />
         <StatCard title="Fees Balance" value={formatCurrency(stats.totalBalance)} icon={<Wallet className="text-orange-500" size={20} />} />
         <StatCard title="Avg. Attendance" value={`${stats.avgAttendance.toFixed(1)}%`} icon={<ClipboardList className="text-emerald-500" size={20} />} />
         <StatCard title="Mean Grade" value={stats.meanGrade} icon={<TrendingUp className="text-indigo-500" size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            {/* Student Spotlight */}
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Award size={20} className="text-primary" /> Family Highlights
               </h2>
               <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {students.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => setSelectedStudent(s)}
                      className={`text-[10px] whitespace-nowrap font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${selectedStudent?.id === s.id ? 'bg-primary text-white shadow-lg' : 'bg-[var(--input)] text-muted hover:bg-[var(--card-border)]'}`}
                    >
                       {s.full_name.split(' ')[0]}
                    </button>
                  ))}
               </div>
            </div>

            <Card className="p-8 border-none bg-gradient-to-br from-primary to-emerald-600 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-4">
                     <div>
                        <h3 className="text-2xl font-black">{selectedStudent?.full_name}</h3>
                        <p className="text-sm opacity-80">{selectedStudent?.class?.name || 'Class Unassigned'} • Performance Summary</p>
                     </div>
                     <div className="flex gap-4">
                        <div className="px-4 py-2 bg-white/20 rounded-xl">
                           <div className="text-[10px] font-bold uppercase opacity-60">Avg Score</div>
                           <div className="text-lg font-black">{selectedStudent?.results?.length > 0 ? getGrade(selectedStudent.results.reduce((a:any,b:any)=>a+b.score,0)/selectedStudent.results.length) : 'A'}</div>
                        </div>
                        <div className="px-4 py-2 bg-white/20 rounded-xl">
                           <div className="text-[10px] font-bold uppercase opacity-60">Status</div>
                           <div className="text-lg font-black italic">Active</div>
                        </div>
                     </div>
                  </div>
                  <Link href={`/parent/students`}>
                     <Button className="bg-white text-emerald-600 hover:bg-white/90 border-none font-black px-8 py-6 rounded-2xl shadow-xl">
                        Full Student Profile <ArrowRight size={18} className="ml-2" />
                     </Button>
                  </Link>
               </div>
            </Card>

            {/* Financial Overview */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-muted flex items-center gap-2">
                     <CreditCard size={16} /> Recent Ledger
                  </h3>
                  <Link href="/parent/billing" className="text-xs font-bold text-primary hover:underline">Full Statement</Link>
               </div>
               <div className="space-y-3">
                  {recentPayments.length === 0 ? (
                    <div className="p-8 text-center bg-[var(--input)] rounded-[2rem] border-dashed border-2 border-[var(--card-border)]">
                       <p className="text-xs text-muted">No recent financial transactions found.</p>
                    </div>
                  ) : (
                    recentPayments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] hover:border-primary/20 transition-all">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                               <CreditCard size={20} />
                            </div>
                            <div>
                               <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>Tuition Fee Remittance</p>
                               <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(p.created_at, 'short')} • ID: {p.id.slice(0, 8)}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-sm font-black text-emerald-600">-{formatCurrency(p.amount)}</p>
                            <Badge variant="success" className="text-[8px] rounded-md">Cleared</Badge>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
         </div>

         {/* Sidebar Alerts */}
         <div className="space-y-8">
            <h2 className="text-xl font-black flex items-center justify-between" style={{ color: 'var(--text)' }}>
               <div className="flex items-center gap-2">
                  <Bell size={20} className="text-indigo-500" /> Intelligence
               </div>
               {notifications.length > 0 && <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />}
            </h2>
            <div className="space-y-4">
               {notifications.length === 0 ? (
                 <div className="p-12 text-center bg-indigo-500/5 rounded-[2.5rem] border border-indigo-500/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/40">Inbox Clear</p>
                 </div>
               ) : (
                 notifications.map((n, i) => (
                   <Link href="/parent/notifications" key={i}>
                      <Card className="p-5 border-none shadow-sm group hover:bg-[var(--input)] transition-all cursor-pointer rounded-2xl">
                         <div className="flex gap-4">
                            <div className={`p-3 rounded-xl shrink-0 h-fit bg-primary/5 text-primary`}>
                               {n.type === 'alert' ? <AlertCircle size={16} /> : <Sparkles size={16} />}
                            </div>
                            <div className="min-w-0">
                               <p className="text-xs font-black truncate" style={{ color: 'var(--text)' }}>{n.title}</p>
                               <p className="text-[10px] mt-1 text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                            </div>
                         </div>
                      </Card>
                   </Link>
                 ))
               )}
            </div>

            <Card className="p-8 bg-indigo-600 text-white text-center space-y-5 rounded-[2.5rem] relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
               <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center mx-auto text-white backdrop-blur-md">
                  <GraduationCap size={32} />
               </div>
               <div>
                  <h4 className="font-black text-sm uppercase tracking-widest">Success Team</h4>
                  <p className="text-[10px] mt-2 opacity-80 leading-relaxed">Need executive support? Our team is available 24/7 for you.</p>
               </div>
               <Button className="w-full bg-white text-indigo-600 hover:bg-white/90 border-none px-6 py-6 rounded-2xl font-black shadow-xl">
                  Contact Dedicated Support
               </Button>
            </Card>
         </div>
      </div>
    </div>
  )
}
