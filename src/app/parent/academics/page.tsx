'use client'

import { useState, useEffect } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { LineChart, Award, TrendingUp, BookOpen } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function ParentAcademicsPage() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  const loadData = async () => {
    setLoading(true)
    const { data } = await supabase.from('students').select('*, class:classes(name)').eq('parent_id', profile?.id)
    setStudents(data || [])
    setLoading(false)
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-32">
       <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Academic Performance</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyze grades, term metrics, and academic progression.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Overall Average" value="88.4%" icon={<LineChart className="text-emerald-500" size={20} />} />
          <StatCard title="Class Rank" value="Top 5%" icon={<Award className="text-orange-500" size={20} />} />
          <StatCard title="Term Progress" value="+4.2%" icon={<TrendingUp className="text-indigo-500" size={20} />} />
          <StatCard title="Completed Tasks" value="142" icon={<BookOpen className="text-blue-500" size={20} />} />
       </div>

       {students.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
             <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No students linked to this account.</p>
          </Card>
       ) : (
          students.map(s => (
             <div key={s.id} className="space-y-6">
                <h2 className="text-xl font-black mt-8" style={{ color: 'var(--text)' }}>{s.full_name}&apos;s Academic Profile</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   <div className="col-span-2">
                       <Card className="p-6 h-full border-2 border-indigo-500/20 bg-indigo-500/5">
                          <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-600">
                             <TrendingUp size={18} /> Subject Breakdown (Current Term)
                          </h3>
                          <div className="space-y-4">
                             {[
                                { subject: 'Mathematics', score: 92, grade: 'A' },
                                { subject: 'Physics', score: 88, grade: 'A-' },
                                { subject: 'Literature', score: 85, grade: 'B+' },
                                { subject: 'Chemistry', score: 94, grade: 'A+' },
                             ].map((sub, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                   <div className="flex justify-between items-end">
                                      <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{sub.subject}</span>
                                      <span className="text-xs font-black" style={{ color: 'var(--text-muted)' }}>{sub.score}% ({sub.grade})</span>
                                   </div>
                                   <div className="h-2 w-full bg-[var(--input)] rounded-full overflow-hidden">
                                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${sub.score}%` }} />
                                   </div>
                                </div>
                             ))}
                          </div>
                       </Card>
                   </div>
                   
                   <div className="space-y-6">
                      <Card className="p-6 bg-gradient-to-br from-[#10B981] to-[#059669] text-white">
                         <h3 className="font-bold flex items-center gap-2 mb-2"><Award size={18} /> Teacher&apos;s Remarks</h3>
                         <p className="text-sm opacity-90 italic">&quot;A highly dedicated student who consistently participates in class and submits well-researched assignments ahead of time.&quot;</p>
                         <div className="mt-4 pt-4 border-t border-white/20">
                            <p className="text-xs font-bold">- Mr. T. Anderson</p>
                         </div>
                      </Card>
                   </div>
                </div>
             </div>
          ))
       )}
    </div>
  )
}
