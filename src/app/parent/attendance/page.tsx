'use client'

import { useState, useEffect } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { ClipboardList, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function ParentAttendancePage() {
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
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Attendance Monitoring</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Track daily and periodic attendance logs for your children.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Overall Attendance" value="96.5%" icon={<ClipboardList className="text-emerald-500" size={20} />} />
          <StatCard title="Total Absences" value="2 Days" icon={<AlertCircle className="text-rose-500" size={20} />} />
          <StatCard title="Punctuality Score" value="A+" icon={<CheckCircle2 className="text-blue-500" size={20} />} />
       </div>

       {students.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
             <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No students linked to this account.</p>
          </Card>
       ) : (
          students.map(s => (
             <Card key={s.id} className="p-6">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-xl">
                      {s.full_name[0]}
                   </div>
                   <div>
                      <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{s.full_name}</h2>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.class?.name}</p>
                   </div>
                </div>

                <div className="space-y-4">
                   {[
                      { date: 'Today', status: 'present', note: 'Arrived at 07:45 AM' },
                      { date: 'Yesterday', status: 'present', note: 'Arrived at 07:50 AM' },
                      { date: 'Monday, Mar 15', status: 'absent', note: 'Excused - Medical Appointment' },
                   ].map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[var(--card-border)] bg-[var(--input)]">
                         <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${log.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                               {log.status === 'present' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            </div>
                            <div>
                               <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{log.date}</p>
                               <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{log.note}</p>
                            </div>
                         </div>
                         <div className={`text-xs font-black uppercase tracking-wider ${log.status === 'present' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {log.status}
                         </div>
                      </div>
                   ))}
                </div>
             </Card>
          ))
       )}
    </div>
  )
}
