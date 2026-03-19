'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart3, Target, Zap, Award, Activity, Users, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/Input'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#4F8CFF', '#10B981', '#F59E0B', '#EF4444', '#A855F7', '#EC4899']

const MOCK_DATA = {
  curriculumPerformance: [
    { name: '8-4-8', score: 78, students: 120 },
    { name: 'IGCSE', score: 85, students: 45 },
    { name: 'KCSE', score: 72, students: 230 },
    { name: 'Competency', score: 82, students: 88 },
  ],
  subjectTrends: [
    { month: 'Jan', Math: 65, English: 72, Science: 60 },
    { month: 'Feb', Math: 68, English: 75, Science: 62 },
    { month: 'Mar', Math: 75, English: 70, Science: 68 },
    { month: 'Apr', Math: 82, English: 78, Science: 74 },
    { month: 'May', Math: 80, English: 82, Science: 76 },
    { month: 'Jun', Math: 85, English: 85, Science: 80 },
  ],
  genderSplit: [
    { name: 'Male', value: 480 },
    { name: 'Female', value: 520 },
  ],
  attendanceByWeek: [
    { week: 'W1', rate: 92 },
    { week: 'W2', rate: 88 },
    { week: 'W3', rate: 94 },
    { week: 'W4', rate: 91 },
    { week: 'W5', rate: 89 },
  ]
}

export default function AdminPerformance() {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [filterCurriculum, setFilterCurriculum] = useState('all')
  const [performanceData, setPerformanceData] = useState<any[]>([]) // Added state for performance data

  useEffect(() => {
    const loadPerformanceData = async () => {
      setLoading(true)
      try {
        // This is a placeholder for actual data fetching.
        // The provided snippet uses 'quiz_attempts', but MOCK_DATA is used elsewhere.
        // For now, we'll simulate fetching with a timeout and then set mock data.
        // If actual data fetching is intended, replace this with your supabase call.
        const { data, error } = await supabase.from('quiz_attempts').select('*, quiz:quizzes(title), student:students(full_name, admission_number)').order('completed_at', { ascending: false })
        if (error) throw error
        setPerformanceData(data ?? [])
        // Simulate a network delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500)); 
      } catch (e) {
        console.error('Failed to load performance data:', e)
        // Optionally, set an error state here
      } finally {
        setLoading(false)
      }
    }

    loadPerformanceData()
  }, [])

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-6 pb-12">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Performance Analytics</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Real-time institutional performance metrics</p>
         </div>
         <div className="flex gap-2">
            <Select value={filterCurriculum} onChange={e => setFilterCurriculum(e.target.value)} className="w-40">
               <option value="all">Global View</option>
               <option value="8-4-8">8-4-8 Curriculum</option>
               <option value="IGCSE">IGCSE</option>
            </Select>
         </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Avg Score" value="79.2%" icon={<Target size={20} />} change="+4.5%" changeType="up" />
         <StatCard title="Active Students" value="1,024" icon={<Users size={20} />} change="+12" changeType="up" />
         <StatCard title="Learning Velocity" value="8.4/10" icon={<Zap size={20} />} change="+1.2" changeType="up" />
         <StatCard title="Awards Issued" value="156" icon={<Award size={20} />} change="-4%" changeType="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Subject Comparison */}
         <Card className="p-5">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}><TrendUp size={16} /> Subject Trends</h3>
               <Badge variant="info">Passing Rate %</Badge>
            </div>
            <ResponsiveContainer width="100%" height={250}>
               <LineChart data={MOCK_DATA.subjectTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                  <Line type="monotone" dataKey="Math" stroke="#4F8CFF" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="English" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Science" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
               </LineChart>
            </ResponsiveContainer>
         </Card>

         {/* Curriculum Performance */}
         <Card className="p-5">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}><BarChart3 size={16} /> Curriculum Efficiency</h3>
               <Badge variant="success">Current Term</Badge>
            </div>
            <ResponsiveContainer width="100%" height={250}>
               <BarChart data={MOCK_DATA.curriculumPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 'bold' }} width={80} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--text)' }} />
                  <Bar dataKey="score" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: 'var(--text)', fontSize: 10, offset: 10, formatter: (val: any) => `${val}%` }} />
               </BarChart>
            </ResponsiveContainer>
         </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Gender Split */}
         <Card className="p-5">
            <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>Demographics</h3>
            <div className="h-[180px]">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={MOCK_DATA.genderSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {MOCK_DATA.genderSplit.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
               {MOCK_DATA.genderSplit.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                     <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                     <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.name} ({d.value})</span>
                  </div>
               ))}
            </div>
         </Card>

         {/* Attendance Trend */}
         <Card className="p-5 md:col-span-2">
            <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>Institutional Attendance</h3>
            <ResponsiveContainer width="100%" height={180}>
               <AreaChart data={MOCK_DATA.attendanceByWeek}>
                  <defs>
                     <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F8CFF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4F8CFF" stopOpacity={0} />
                     </linearGradient>
                  </defs>
                  <Tooltip />
                  <Area type="monotone" dataKey="rate" stroke="#4F8CFF" fill="url(#attGrad)" strokeWidth={2} />
               </AreaChart>
            </ResponsiveContainer>
         </Card>
      </div>

      {/* Top Performers Table */}
      <Card className="p-5">
         <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>Top Performing Students</h3>
         <div className="space-y-3">
            {[
               { name: 'Alice Johnson', class: 'Form 4A', score: 96, medal: '🥇' },
               { name: 'Bob Smith', class: 'Year 11', score: 94, medal: '🥈' },
               { name: 'Charlie Davis', class: 'Form 3B', score: 92, medal: '🥉' },
            ].map((s, i) => (
               <div key={s.name} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--input)' }}>
                  <div className="flex items-center gap-3">
                     <span className="text-lg">{s.medal}</span>
                     <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{s.name}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.class}</div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="font-black text-primary" style={{ color: 'var(--primary)' }}>{s.score}%</div>
                     <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg. Aggregate</div>
                  </div>
               </div>
            ))}
         </div>
      </Card>
    </div>
  )
}
import { TrendingUp as TrendUp } from 'lucide-react'
