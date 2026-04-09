'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BarChart3, Users, Target, Clock,
  ChevronRight, Download, Share2, TrendingUp
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as ReTooltip, ResponsiveContainer, Cell 
} from 'recharts'
import type { WorksheetBlock } from '@/types/database'
import Link from 'next/link'

export default function WorksheetAnalyticsPage() {
  const params = useParams()
  const assignmentId = params.id as string
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [assignment, setAssignment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])

  useEffect(() => { loadData() }, [assignmentId])

  const loadData = async () => {
    setLoading(true)
    const [aRes, sRes] = await Promise.all([
      supabase.from('assignments').select('*, class:classes(name)').eq('id', assignmentId).single(),
      supabase.from('submissions').select('*, student:students(full_name)').eq('assignment_id', assignmentId)
    ])
    setAssignment(aRes.data)
    setSubmissions(sRes.data ?? [])
    setLoading(false)
  }

  const stats = useMemo(() => {
    if (!assignment || !submissions.length) return null
    
    const blocks: WorksheetBlock[] = assignment.worksheet ?? []
    const questionBlocks = blocks.filter(b => b.type !== 'section_header' && b.type !== 'reading_passage')
    
    // Per question performance
    const questionStats = questionBlocks.map((b, i) => {
      let totalAwarded = 0
      let count = 0
      submissions.forEach(s => {
        if (s.question_marks?.[b.id] !== undefined) {
          totalAwarded += s.question_marks[b.id]
          count++
        }
      })
      const avg = count > 0 ? (totalAwarded / (count * b.marks)) * 100 : 0
      return {
        name: `Q${i + 1}`,
        full: (b.question || 'Untitled Question').slice(0, 30) + '...',
        average: Math.round(avg),
        marks: b.marks
      }
    })

    const avgScore = submissions.reduce((sum, s) => sum + (s.marks || 0), 0) / submissions.length
    const maxPossible = assignment.total_marks || assignment.max_marks || 1
    
    return {
      questionStats,
      avgScore: Math.round(avgScore),
      avgPct: Math.round((avgScore / maxPossible) * 100),
      submissionCount: submissions.length,
      topScorer: [...submissions].sort((a, b) => (b.marks || 0) - (a.marks || 0))[0]
    }
  }, [assignment, submissions])

  if (loading) return <div className="p-10 flex justify-center"><div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)' }} /></div>

  return (
    <div className="p-6 space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/teacher/assignments">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center bg-input text-muted"><ArrowLeft size={18} /></button>
          </Link>
          <div>
            <h1 className="text-2xl font-black">{assignment?.title}</h1>
            <p className="text-sm text-muted">Analytics & Performance Insight for {assignment?.class?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm"><Download size={14} className="mr-2" /> Export</Button>
          <Button size="sm"><Share2 size={14} className="mr-2" /> Share Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Submissions" value={stats?.submissionCount || 0} icon={<Users size={20} />} change="Active" changeType="up" />
        <StatCard title="Avg. Score" value={`${stats?.avgScore || 0}/${assignment?.total_marks || assignment?.max_marks}`} icon={<Target size={20} />} change={`${stats?.avgPct || 0}%`} changeType="up" />
        <StatCard title="Success Rate" value={`${stats?.avgPct || 0}%`} icon={<TrendingUp size={20} />} />
        <StatCard title="Highest Score" value={stats?.topScorer?.marks || 0} icon={<Award size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2 p-6 flex flex-col">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" /> Question Performance (%)
          </h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.questionStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <ReTooltip 
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '12px' }}
                  cursor={{ fill: 'var(--primary-dim)', opacity: 0.1 }}
                />
                <Bar dataKey="average" radius={[6, 6, 0, 0]} barSize={40}>
                  {stats?.questionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.average > 70 ? '#10B981' : entry.average > 40 ? '#F59E0B' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Student List */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6">Student Rankings</h3>
          <div className="space-y-4">
            {submissions.sort((a, b) => (b.marks || 0) - (a.marks || 0)).slice(0, 8).map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-6 text-xs font-black text-muted">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {s.student?.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{s.student?.full_name}</div>
                </div>
                <div className="text-sm font-black text-primary">{s.marks || 0}</div>
              </div>
            ))}
            {submissions.length === 0 && <p className="text-sm text-muted text-center py-10">No submissions yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Award({ size, className }: { size: number, className?: string }) {
  return <TrendingUp size={size} className={className} />
}
