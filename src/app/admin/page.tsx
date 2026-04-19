'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UserCheck, GraduationCap, TrendingUp,
  Calendar, CreditCard, Bell, AlertCircle, Activity,
  CheckCircle, BarChart3, Clock, FileText, ShieldCheck
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
  recentNotifications: Notification[]
}

const MOCK_ATTENDANCE_DATA = [
  { day: 'Mon', present: 87, absent: 13 },
  { day: 'Tue', present: 92, absent: 8 },
  { day: 'Wed', present: 85, absent: 15 },
  { day: 'Thu', present: 95, absent: 5 },
  { day: 'Fri', present: 78, absent: 22 },
]

const MOCK_PAYMENT_DATA = [
  { month: 'Jan', amount: 145000 },
  { month: 'Feb', amount: 189000 },
  { month: 'Mar', amount: 213000 },
  { month: 'Apr', amount: 176000 },
  { month: 'May', amount: 234000 },
  { month: 'Jun', amount: 198000 },
]

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
      console.log('[AdminDashboard] Loading stats...')
      const safeFetch = async (promise: PromiseLike<any>, fallback: any) => {
        try {
          return await withTimeout(Promise.resolve(promise), 8000)
        } catch (err) {
          console.warn('[AdminDashboard] Query timed out or failed, using fallback')
          return fallback
        }
      }

      const [studentsRes, teachersRes, parentsRes, eventRes, paymentsRes] = await Promise.all([
        safeFetch(supabase.from('students').select('id', { count: 'exact', head: true }), { count: 0 }),
        safeFetch(supabase.from('teachers').select('id', { count: 'exact', head: true }), { count: 0 }),
        safeFetch(supabase.from('parents').select('id', { count: 'exact', head: true }), { count: 0 }),
        safeFetch(supabase.from('tuition_events').select('*').eq('is_active', true).maybeSingle(), { data: null }),
        safeFetch(supabase.from('payments').select('amount').limit(5000), { data: [] })
      ])
      console.log('[AdminDashboard] Stats fetch completed')

      const totalPayments = paymentsRes.data?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) ?? 0

      setStats({
        totalStudents: studentsRes.count ?? 0,
        totalTeachers: teachersRes.count ?? 0,
        totalParents: parentsRes.count ?? 0,
        activeEvent: eventRes.data,
        totalPayments,
        attendanceRate: 89,
        recentNotifications: [],
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
          { title: 'Total Students', value: stats?.totalStudents ?? 0, icon: <GraduationCap size={20} />, change: '+12 this month', changeType: 'up' as const },
          { title: 'Total Teachers', value: stats?.totalTeachers ?? 0, icon: <UserCheck size={20} />, change: '+3 this month', changeType: 'up' as const },
          { title: 'Attendance Rate', value: `${stats?.attendanceRate ?? 0}%`, icon: <CheckCircle size={20} />, change: '+2% vs last week', changeType: 'up' as const },
          { title: 'Total Revenue', value: formatCurrency(stats?.totalPayments ?? 0), icon: <CreditCard size={20} />, change: '+18% this month', changeType: 'up' as const },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text)' }}>Weekly Attendance</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>This week by day</p>
              </div>
              <Badge variant="primary">This Week</Badge>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MOCK_ATTENDANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--text)' }}
                />
                <Bar dataKey="present" fill="#4F8CFF" radius={[6, 6, 0, 0]} name="Present" />
                <Bar dataKey="absent" fill="rgba(239,68,68,0.5)" radius={[6, 6, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Revenue Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text)' }}>Revenue Trend</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Monthly payments (KES)</p>
              </div>
              <Badge variant="success">6 months</Badge>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MOCK_PAYMENT_DATA}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--text)' }}
                  formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                />
                <Area dataKey="amount" stroke="#10B981" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

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
