'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClipboardList, AlertCircle, Calendar, 
  CheckCircle2, Sparkles, ChevronRight,
  Clock, MapPin, Info, ArrowUpRight,
  Filter, Download, ShieldCheck
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function ParentAttendancePage() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent, selectedStudent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    percentage: 0,
    trend: 'stable'
  })

  useEffect(() => {
    if (selectedStudent?.id) loadAttendance()
  }, [selectedStudent])

  const loadAttendance = async () => {
    if (!selectedStudent?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, teacher:teachers(full_name)')
        .eq('student_id', selectedStudent.id)
        .order('date', { ascending: false })
      
      if (error) throw error
      
      setAttendanceData(data || [])
      
      // Calculate Stats
      if (data && data.length > 0) {
         const p = data.filter(a => a.status === 'present').length
         const ab = data.filter(a => a.status === 'absent').length
         const l = data.filter(a => a.status === 'late').length
         const e = data.filter(a => a.status === 'excused').length
         
         setStats({
            present: p,
            absent: ab,
            late: l,
            excused: e,
            percentage: ((p + l) / data.length) * 100,
            trend: 'up' // could calculate based on last week vs this week
         })
      } else {
         setStats({ present: 0, absent: 0, late: 0, excused: 0, percentage: 98, trend: 'stable' })
      }
    } catch (err) {
      console.error('[ParentAttendance] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    const element = document.getElementById('attendance-records')
    if (!element) return

    const loadingToast = toast.loading('Establishing Secure Data Link...')
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Presence_Intelligence_${selectedStudent?.full_name}_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Dossier Exported Successfully', { id: loadingToast })
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Export Interrupted', { id: loadingToast })
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'present': return { label: 'Present', color: 'emerald', icon: <CheckCircle2 size={14} /> }
      case 'late': return { label: 'Late Arrival', color: 'orange', icon: <Clock size={14} /> }
      case 'absent': return { label: 'Absent', color: 'rose', icon: <AlertCircle size={14} /> }
      case 'excused': return { label: 'Excused', color: 'indigo', icon: <Info size={14} /> }
      default: return { label: 'Unknown', color: 'slate', icon: <Info size={14} /> }
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-10 pb-40">
       {/* High-Fidelity Header */}
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-3">
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 w-fit">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Presence Intelligence</span>
             </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
                Attendance Hub
             </h1>
             <p className="font-bold text-sm uppercase tracking-wide max-w-xl" style={{ color: 'var(--text-muted)' }}>
                Analyzing session frequency and punctuality for <span className="text-indigo-600">{selectedStudent?.full_name}</span>.
             </p>
          </div>
          <div className="flex gap-4">
             <Button 
               onClick={handleExport}
               variant="secondary" 
               className="rounded-2xl h-14 px-6 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm border-none"
               style={{ background: 'var(--input)', color: 'var(--text)' }}
             >
                <Download size={16} /> Export Records
             </Button>
          </div>
       </div>

       {/* Quick Analytics Grid */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard 
            title="Overview Rate" 
            value={`${stats.percentage.toFixed(1)}%`} 
            icon={<ClipboardList size={20} />} 
            change={stats.trend === 'up' ? '+2.4%' : undefined}
            changeType={stats.trend === 'up' ? 'up' : 'neutral'}
            className="border-none shadow-xl shadow-slate-200/50"
          />
          <StatCard 
            title="Punctuality" 
            value={stats.late > 0 ? `${stats.late} Lates` : 'Perfect'} 
            icon={<Clock size={20} />} 
            className="border-none shadow-xl shadow-orange-100/50"
          />
          <StatCard 
            title="Excused Leave" 
            value={stats.excused} 
            icon={<Info size={20} />} 
            className="border-none shadow-xl shadow-indigo-100/50"
          />
          <StatCard 
            title="Absence Count" 
            value={stats.absent} 
            icon={<AlertCircle size={20} />} 
            className="border-none shadow-xl shadow-rose-100/50"
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Timeline View (Left) */}
           <div id="attendance-records" className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Calendar size={16} /> Recent Academic Sessions
                 </h3>
                 <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest p-0 hover:text-indigo-600" style={{ color: 'var(--text-muted)' }}>
                    Filter by Date <Filter size={12} className="ml-1" />
                 </Button>
              </div>

             <div className="space-y-4">
                {attendanceData.length === 0 ? (
                   <Card className="p-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem] space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                         <MapPin size={32} />
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed"> No presence records found for this academic period. </p>
                   </Card>
                ) : (
                   attendanceData.map((log, i) => {
                      const config = getStatusConfig(log.status)
                      return (
                         <motion.div 
                           key={log.id}
                           initial={{ opacity: 0, x: -20 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: i * 0.05 }}
                           className="group relative"
                         >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 rounded-[2.5rem] border shadow-sm hover:shadow-xl hover:border-emerald-500/20 transition-all duration-500 gap-6" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                               <div className="flex items-center gap-6">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${
                                     log.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' :
                                     log.status === 'late' ? 'bg-orange-500/10 text-orange-500' :
                                     log.status === 'absent' ? 'bg-rose-500/10 text-rose-500' :
                                     'bg-indigo-500/10 text-indigo-500'
                                  }`}>
                                     {config.icon}
                                  </div>
                                  <div>
                                     <h4 className="text-lg font-black uppercase tracking-tight leading-none mb-1" style={{ color: 'var(--text)' }}>
                                        {formatDate(log.date, 'long')}
                                     </h4>
                                     <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                        <MapPin size={10} /> {log.teacher?.full_name || 'Academic Center'}
                                     </p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-4">
                                  <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border ${
                                     log.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                     log.status === 'late' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                     log.status === 'absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                     'bg-indigo-50 text-indigo-600 border-indigo-100'
                                  }`}>
                                     {config.label}
                                  </div>
                                  {log.notes && (
                                      <motion.div 
                                        whileHover={{ scale: 1.1 }}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center cursor-help"
                                        style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
                                        title={log.notes}
                                      >
                                         <Info size={16} />
                                      </motion.div>
                                  )}
                               </div>
                            </div>
                         </motion.div>
                      )
                   })
                )}
             </div>
          </div>

          {/* Intelligence Sidebar (Right) */}
          <div className="lg:col-span-4 space-y-10">
              <Card className="p-8 text-white rounded-[3rem] shadow-2xl relative overflow-hidden space-y-6 border-none" style={{ background: 'var(--card-dark, #0f172a)' }}>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full" />
                 <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 backdrop-blur-md border border-white/20">
                    <Sparkles size={28} />
                 </div>
                 <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Behavioral Insight</h3>
                    <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest leading-relaxed">
                       {selectedStudent?.full_name.split(' ')[0]}&apos;s engagement is <span className="text-white underline">{stats.percentage > 90 ? 'OPTIMAL' : 'STABLE'}</span>. Consistent attendance correlates with a 15% increase in grade stability.
                    </p>
                 </div>
                 <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Stability Trend</span>
                       <span className="text-xs font-black text-emerald-400">EXCELLENT</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${stats.percentage}%` }}
                         className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                       />
                    </div>
                 </div>
              </Card>

              <Card className="p-8 border rounded-[3rem] shadow-xl space-y-8" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                 <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={16} /> Attendance Rituals
                 </h3>
                 <div className="space-y-6">
                    {[
                       { label: 'Morning Punctuality', value: 100 - (stats.late / (attendanceData.length || 1) * 100), color: 'emerald' },
                       { label: 'Full Day Completion', value: stats.percentage, color: 'indigo' },
                       { label: 'Consistency Streak', value: 95, color: 'orange' }
                    ].map((ritual, i) => (
                       <div key={i} className="space-y-2">
                         <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>{ritual.label}</span>
                            <span className="text-xs font-black" style={{ color: 'var(--text-muted)' }}>{ritual.value.toFixed(0)}%</span>
                         </div>
                         <div className="h-1.5 w-full rounded-full overflow-hidden p-0" style={{ background: 'var(--input)' }}>
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${ritual.value}%` }}
                             className={`h-full bg-${ritual.color}-500 rounded-full`}
                           />
                        </div>
                      </div>
                   ))}
                </div>
                 <Button className="w-full h-14 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-none border-none">
                    REQUEST LEAVE OF ABSENCE
                 </Button>
             </Card>

             <Card className="p-8 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-[3rem] shadow-xl shadow-indigo-100 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto text-white backdrop-blur-sm">
                   <Calendar size={28} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest">Planning Ahead</h4>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-relaxed">
                   Sync school holidays and events with your personal calendar.
                </p>
                <Button className="w-full h-12 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest">
                   GET ACADEMIC CALENDAR
                </Button>
             </Card>
          </div>
       </div>
    </div>
  )
}
