'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, TrendingUp, ClipboardList, 
  Wallet, ArrowRight, GraduationCap,
  Sparkles, Award, BookOpen, 
  ShieldCheck, MoreVertical, Search, Trophy,
  Check, Star
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default function MyStudents() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    if (profile && parent) loadStudents()
  }, [profile, parent])

  const loadStudents = async () => {
    if (!parent?.id) {
       console.warn('[ParentStudents] No parent ID')
       setLoading(false)
       return
    }
    setLoading(true)
    try {
      console.log('[ParentStudents] Fetching linked students for parent:', parent.id)
      // Fetch students with their class and basic stats
      const { data, error } = await supabase
        .from('parent_student_links')
        .select(`
          student:students(*, class:classes(name), attendance(present), results:quiz_attempts(score), badges:study_badges(*))
        `)
        .eq('parent_id', parent.id)
      
      if (error) {
         console.error('[ParentStudents] Fetch error:', error)
         toast.error('Failed to load students: ' + error.message)
      } else {
         // Process stats for each student
         const processed = data?.map((link: any) => link.student).filter(Boolean).map(s => {
            const attendance = s.attendance || []
            const totalAtt = attendance.length
            const present = attendance.filter((a: any) => a.present).length
            const attRate = totalAtt > 0 ? (present / totalAtt) * 100 : 95 // Default to 95 if no data

            const results = s.results || []
            const avgScore = results.length > 0 ? results.reduce((a: any, b: any) => a + b.score, 0) / results.length : 85

            return { ...s, attRate, avgScore }
         })
         console.log(`[ParentStudents] Processed ${processed?.length || 0} students`)
         setStudents(processed || [])
      }
    } catch (err: any) {
      console.error('[ParentStudents] Fatal error:', err)
      toast.error('Data error in students view')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-32">
       {/* Header Section */}
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
                <Sparkles size={12} /> Elite Education
             </div>
             <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
                Scholar Collective
             </h1>
             <p className="font-bold text-sm uppercase tracking-wide max-w-xl" style={{ color: 'var(--text-muted)' }}>
                Overview of linked student profiles and core academic status.
             </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex -space-x-3">
                {students.map((s, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-[var(--bg)] bg-primary/10 flex items-center justify-center text-xs font-black text-primary shadow-xl">
                    {s.full_name[0]}
                  </div>
                ))}
             </div>
             <Link href="/parent/link">
                <Button variant="secondary" className="rounded-2xl px-6 font-black gap-2">
                   <Users size={18} /> Link Student
                </Button>
             </Link>
          </div>
       </div>

        {students.length === 0 ? (
           <Card className="p-16 text-center space-y-8 border-2 border-dashed bg-[var(--card-muted)] rounded-[3rem] backdrop-blur-3xl border-[var(--card-border)]">
              <div className="w-24 h-24 rounded-full bg-[var(--input)] flex items-center justify-center mx-auto text-[var(--text-muted)] ring-8 ring-[var(--card)]">
                 <Users size={48} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black tracking-tight text-[var(--text)]">Awaiting Your Students</h3>
                 <p className="text-sm max-w-sm mx-auto text-[var(--text-muted)]">Unlock elite academic monitoring and automated progress tracking by linking your first student profile.</p>
              </div>
              <Link href="/parent/link" className="inline-block">
                 <Button className="rounded-2xl px-12 py-7 text-lg font-black shadow-2xl shadow-primary/20 hover:scale-105 transition-transform">
                    Link Student Profile
                 </Button>
              </Link>
           </Card>
        ) : (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 pb-20">
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, type: 'spring', damping: 25 }}
                  className="relative group outline-none"
                >
                   {/* Premium Holographic Aura (Animated) */}
                   <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-emerald-500/20 rounded-[4rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10" />
                   
                   <div className="bg-[var(--card)] rounded-3xl border border-[var(--card-border)] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[var(--primary)]/5 transition-all duration-300 ring-1 ring-white/5 group">
                      <div className="p-6 md:p-8 space-y-8">
                         
                         {/* Header: Avatar, Name, Verified Status */}
                         <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 border-b border-[var(--card-border)] pb-8">
                            <div className="relative shrink-0">
                               <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-indigo-600 p-[2px] shadow-lg shadow-[var(--primary)]/20 transition-transform group-hover:scale-105 duration-500">
                                  <div className="w-full h-full rounded-[14px] bg-[var(--card)] flex items-center justify-center">
                                     <span className="text-3xl font-black bg-gradient-to-br from-[var(--primary)] to-indigo-600 bg-clip-text text-transparent">
                                        {student.full_name[0]}
                                     </span>
                                  </div>
                               </div>
                               <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-[var(--card)] p-1 shadow-sm border border-[var(--card-border)] hidden sm:block">
                                  <div className="w-full h-full rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                                     <Check size={12} strokeWidth={4} />
                                  </div>
                               </div>
                            </div>
                            
                            <div className="flex-1 space-y-2">
                               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <h3 className="text-2xl font-black tracking-tight text-[var(--text)]">
                                     {student.full_name}
                                  </h3>
                                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest w-fit mx-auto sm:mx-0">
                                     Active Status
                                  </Badge>
                               </div>
                               
                               <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">
                                  <span className="flex items-center gap-1.5 bg-[var(--input)] px-3 py-1.5 rounded-lg border border-[var(--card-border)]">
                                    <GraduationCap size={14} className="text-[var(--primary)]" /> {student.class?.name || 'Unassigned'}
                                  </span>
                                  <span className="flex items-center gap-1.5 bg-[var(--input)] px-3 py-1.5 rounded-lg border border-[var(--card-border)]">
                                    <ShieldCheck size={14} className="text-indigo-500" /> #{student.admission_number || student.id.slice(0, 8)}
                                  </span>
                               </div>
                            </div>
                         </div>

                           {/* Core Metrics - Simplified */}
                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-5 rounded-3xl bg-[var(--input)] border border-[var(--card-border)] transition-all">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Attendance</p>
                                <p className="text-xl font-black" style={{ color: 'var(--text)' }}>{Math.round(student.attRate)}%</p>
                             </div>
                             
                             <div className="p-5 rounded-3xl bg-[var(--input)] border border-[var(--card-border)] transition-all">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Rank Index</p>
                                <p className="text-xl font-black text-indigo-500">Tier 1</p>
                             </div>
                          </div>

                          <Link href="/parent/academics" className="block">
                             <Button className="w-full h-12 rounded-xl bg-[var(--input)] text-[var(--text)] border-none font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                                VIEW ACADEMIC HUB
                             </Button>
                          </Link>
                       </div>
                    </div>
                 </motion.div>
              ))}
           </div>
        )}

     </div>
  )
}
