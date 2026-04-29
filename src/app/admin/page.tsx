'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UserCheck, GraduationCap, TrendingUp,
  Calendar, CreditCard, Bell, AlertCircle, Activity,
  CheckCircle, BarChart3, Clock, FileText, ShieldCheck, ArrowRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { StatCard, Card } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { ExamEventBanner } from '@/components/dashboard/ExamEventBanner'
import { TuitionEventBanner } from '@/components/dashboard/TuitionEventBanner'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { TuitionEvent, Notification } from '@/types/database'
import { withTimeout } from '@/lib/supabase/utils'

interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalParents: number
  activeEvent: TuitionEvent | null
  totalPayments: number
  attendanceRate: number
  attendanceTrend: any[]
  revenueTrend: any[]
  classDistribution: any[]
  eventComparison: any[]
  recentActivities: any[]
}

// No longer using fixed mock data constants - they are generated from DB now

export default function AdminDashboard() {
  const supabase = getSupabaseBrowserClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    // CRITICAL SAFETY: Never leave the admin hanging on a skeleton
    const safetyTimer = setTimeout(() => setLoading(false), 5000)
    return () => clearTimeout(safetyTimer)
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      console.log('[AdminDashboard] Loading real stats...')
      const safeFetch = async (promise: PromiseLike<any>, fallback: any) => {
        try {
          return await withTimeout(Promise.resolve(promise), 10000)
        } catch (err) {
          console.warn('[AdminDashboard] Query timed out or failed, using fallback')
          return fallback
        }
      }

      // Time periods
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

      const [studentsRes, teachersRes, parentsRes, eventRes, paymentsRes, attendanceRes, classRes, notificationRes] = await Promise.all([
        safeFetch(supabase.from('students').select('id', { count: 'exact', head: true }), { count: 0 }),
        safeFetch(supabase.from('teachers').select('id', { count: 'exact', head: true }), { count: 0 }),
        safeFetch(supabase.from('parents').select('id', { count: 'exact', head: true }), { count: 0 }),
        safeFetch(supabase.from('tuition_events').select('*').eq('is_active', true).maybeSingle(), { data: null }),
        safeFetch(supabase.from('payments').select('amount, payment_date, currency').gte('payment_date', sixMonthsAgo), { data: [] }),
        safeFetch(supabase.from('attendance').select('status, date').gte('date', sevenDaysAgo), { data: [] }),
        safeFetch(supabase.from('classes').select('name, students(id)'), { data: [] }),
        safeFetch(supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5), { data: [] })
      ])

      // 1. Process Revenue Trend (6 months)
      const monthlyRevenueMap: Record<string, number> = {}
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = d.toLocaleString('en-US', { month: 'short' })
        monthlyRevenueMap[monthKey] = 0
      }

      paymentsRes.data?.forEach((p: any) => {
        const d = new Date(p.payment_date)
        const monthKey = d.toLocaleString('en-US', { month: 'short' })
        if (monthlyRevenueMap[monthKey] !== undefined) {
          monthlyRevenueMap[monthKey] += Number(p.amount)
        }
      })

      const revenueTrend = Object.entries(monthlyRevenueMap)
        .map(([month, amount]) => ({ month, amount }))
        .reverse()

      // 2. Process Attendance Trend (Last 7 days)
      const attendanceMap: Record<string, { present: number; absent: number; day: string }> = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
        const dateKey = d.toISOString().split('T')[0]
        attendanceMap[dateKey] = { 
          day: d.toLocaleString('en-US', { weekday: 'short' }), 
          present: 0, 
          absent: 0 
        }
      }

      attendanceRes.data?.forEach((a: any) => {
        if (attendanceMap[a.date]) {
          if (a.status === 'present') attendanceMap[a.date].present++
          else if (a.status === 'absent') attendanceMap[a.date].absent++
        }
      })

      const attendanceTrend = Object.values(attendanceMap)

      // 3. Process Class Distribution
      const classDistribution = (classRes.data || []).map((c: any) => ({
        name: c.name,
        value: c.students?.length || 0
      })).filter((c: any) => c.value > 0).slice(0, 10)

      // 4. Calculate Attendance Rate for current active event
      const totalAttendance = attendanceRes.data?.length || 0
      const presentCount = attendanceRes.data?.filter((a: any) => a.status === 'present').length || 0
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

      // 5. Cross-Event Comparison (Ended vs Active)
      // We'll fetch the last 5 events and their overall attendance
      const { data: allEvents } = await supabase.from('tuition_events').select('id, name').order('start_date', { ascending: false }).limit(6)
      const eventIds = (allEvents || []).map(e => e.id)
      
      const { data: crossAtt } = await supabase.from('attendance').select('tuition_event_id, status').in('tuition_event_id', eventIds)
      
      const eventComparison = (allEvents || []).map(ev => {
        const evAtt = (crossAtt || []).filter(a => a.tuition_event_id === ev.id)
        const evPresent = evAtt.filter(a => a.status === 'present').length
        const rate = evAtt.length > 0 ? Math.round((evPresent / evAtt.length) * 100) : 0
        return { name: ev.name, rate }
      }).reverse()

      // 6. Total payments across all time (basic total)
      const totalPayments = (paymentsRes.data || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)

      setStats({
        totalStudents: studentsRes.count ?? 0,
        totalTeachers: teachersRes.count ?? 0,
        totalParents: parentsRes.count ?? 0,
        activeEvent: eventRes.data,
        totalPayments,
        attendanceRate,
        attendanceTrend,
        revenueTrend,
        classDistribution,
        eventComparison,
        recentActivities: notificationRes.data || []
      })
    } catch (err) {
      console.error('[AdminDashboard] Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {formatDate(new Date(), 'long')} · Peak Performance Tutoring
        </p>
      </motion.div>

      {/* Exam Event Banner */}
      <ExamEventBanner />

      {/* Tuition Event Banner */}
      <TuitionEventBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Students', value: stats?.totalStudents ?? 0, icon: <GraduationCap size={20} />, change: 'Real-time', changeType: 'neutral' as const },
          { title: 'Total Teachers', value: stats?.totalTeachers ?? 0, icon: <UserCheck size={20} />, change: 'Real-time', changeType: 'neutral' as const },
          { title: 'Attendance Rate', value: `${stats?.attendanceRate ?? 0}%`, icon: <CheckCircle size={20} />, change: 'Last 7 days', changeType: (stats?.attendanceRate ?? 0) > 80 ? 'up' as const : 'down' as const },
          { title: 'Revenue (6m)', value: formatCurrency(stats?.totalPayments ?? 0), icon: <CreditCard size={20} />, change: 'Snapshot', changeType: 'neutral' as const },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Charts Level 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="xl:col-span-2">
          <Card className="p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Users size={18} className="text-primary" />
                  Weekly Enrollment Participation
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Real student presence over last 7 days</p>
              </div>
              <Badge variant="primary">LIVE TREND</Badge>
            </div>
            <div className="h-[300px] w-full">
               {stats?.attendanceTrend?.length ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={stats.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                     <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                     <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                     <Tooltip
                       contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '16px', color: 'var(--text)', fontSize: '12px' }}
                       cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                     />
                     <Bar dataKey="present" fill="#4F8CFF" radius={[6, 6, 0, 0]} name="Present" barSize={32} />
                     <Bar dataKey="absent" fill="rgba(239,68,68,0.4)" radius={[6, 6, 0, 0]} name="Absent" barSize={32} />
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex items-center justify-center text-sm opacity-30 italic">No attendance data recorded this week</div>
               )}
            </div>
          </Card>
        </motion.div>

        {/* Class Distribution Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
           <Card className="p-5 h-full">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Activity size={18} className="text-indigo-400" />
                  Class Distribution
                </h3>
              </div>
              <div className="h-[250px] w-full mt-4">
                 {stats?.classDistribution?.length ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={stats.classDistribution} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
                        <Bar dataKey="value" fill="#6366F1" radius={[0, 6, 6, 0]} name="Students" />
                     </BarChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="h-full flex items-center justify-center text-sm opacity-30 italic">Assign students to classes to see breakdown</div>
                 )}
              </div>
              <div className="mt-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">PRO TIP</p>
                 <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>Focus on classes with lower enrollment to optimize faculty assignment.</p>
              </div>
           </Card>
        </motion.div>
      </div>

      {/* Level 2: Revenue Trend & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <TrendingUp size={18} className="text-emerald-500" />
                  Revenue Performance
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Monthly collected payments (KES)</p>
              </div>
              <Badge variant="success">6 MONTH LOOKBACK</Badge>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.revenueTrend ?? []} margin={{ left: -20, right: 10 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '16px', color: 'var(--text)', fontSize: '11px' }}
                    formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#10B981" fill="url(#revenueGradient)" strokeWidth={3} animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card className="p-5 h-full overflow-hidden flex flex-col">
            <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--text)' }}>
              <Bell size={18} className="text-amber-500" />
              Intelligence Feed
            </h3>
            <div className="space-y-5 flex-1">
               {stats?.recentActivities?.length ? stats.recentActivities.map((act, idx) => (
                 <div key={idx} className="flex gap-4 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                    <div>
                       <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text)' }}>{act.title}</p>
                       <p className="text-[10px] mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{act.body}</p>
                       <p className="text-[9px] mt-1 font-medium opacity-50">{formatDate(act.created_at)}</p>
                    </div>
                 </div>
               )) : (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-10">
                    <AlertCircle size={32} className="mb-2" />
                    <p className="text-xs font-bold italic">No recent system notifications</p>
                 </div>
               )}
            </div>
            <a href="/admin/notifications" className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center justify-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10 hover:bg-primary/10 transition-colors">
               EXPLORE ALL LOGS <ArrowRight size={12} />
            </a>
          </Card>
        </motion.div>
      </div>

      {/* Level 3: Event Comparison */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
         <Card className="p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <BarChart3 size={18} className="text-primary" />
                  Strategic Attendance Comparison (By Tuition Event)
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Comparing overall attendance rates across your historical data</p>
              </div>
              <Badge variant="info">MARKET INTELLIGENCE</Badge>
            </div>
            <div className="h-[200px] w-full">
              {stats?.eventComparison?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.eventComparison}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--text)', fontSize: '12px' }}
                    />
                    <Bar dataKey="rate" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Attendance Rate (%)" barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm opacity-30 italic">Not enough historical data to compare events</div>
              )}
            </div>
         </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add Student', href: '/admin/students', icon: <GraduationCap size={18} />, color: '#10B981' },
              { label: 'Record Payment', href: '/admin/payments', icon: <CreditCard size={18} />, color: '#F59E0B' },
              { label: 'Transcripts', href: '/admin/transcripts', icon: <FileText size={18} />, color: '#EC4899' },
              { label: 'New Event', href: '/admin/tuition-events', icon: <Calendar size={18} />, color: '#4F8CFF' },
              { label: 'Credentials', href: '/admin/student-credentials', icon: <ShieldCheck size={18} />, color: '#10B981' },
              { label: 'Send Notice', href: '/admin/notifications', icon: <Bell size={18} />, color: '#A855F7' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all hover:scale-105"
                style={{ background: `${action.color}15`, border: `1px solid ${action.color}30` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${action.color}20`, color: action.color }}>
                  {action.icon}
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{action.label}</span>
              </a>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
