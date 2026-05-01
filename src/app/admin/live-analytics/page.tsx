import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { 
  BarChart3, Activity, Users, Target, 
  ArrowUpRight, ArrowDownRight, Zap, 
  Clock, Shield, ChevronRight, AlertTriangle,
  CheckCircle2, TrendingUp
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminLiveAnalyticsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check Admin Role (Assuming standard check)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  // 1. Fetch Session Data with Outcomes and Attendance
  const { data: sessions } = await supabase
    .from('live_sessions')
    .select(`
      *,
      teacher:teachers(full_name),
      subject:subjects(name),
      class:classes(name),
      outcomes:live_session_outcomes(is_completed),
      attendance:live_session_attendance(id)
    `)
    .order('created_at', { ascending: false })

  // 2. Compute Aggregates
  const totalSessions = sessions?.length || 0
  const activeSessions = sessions?.filter(s => s.status === 'live').length || 0
  const completionRate = sessions && sessions.length > 0 
    ? Math.round((sessions.reduce((acc, s) => {
        const achieved = s.outcomes?.filter((o: any) => o.is_completed).length || 0
        const total = s.outcomes?.length || 1
        return acc + (achieved / total)
      }, 0) / totalSessions) * 100)
    : 0

  const totalAttendance = sessions?.reduce((acc, s) => acc + (s.attendance?.length || 0), 0) || 0

  return (
    <div className="min-h-screen bg-[#05070A] text-white p-6 md:p-12 space-y-16">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <Shield size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Institutional Governance</span>
           </div>
           <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">Live Session <br /><span className="text-slate-500">Intelligence</span></h1>
        </div>

        <div className="flex items-center gap-4">
           <button className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">Export Raw Data</button>
           <button className="px-8 py-4 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] shadow-xl">Live Command Room</button>
        </div>
      </div>

      {/* High-Level Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <MetricCard label="Global Sessions" value={totalSessions.toString()} trend="+12%" icon={<Zap />} />
         <MetricCard label="Avg Mastery Rate" value={`${completionRate}%`} trend="+5.4%" icon={<Target />} up />
         <MetricCard label="Live Attendance" value={totalAttendance.toString()} trend="-2.1%" icon={<Users />} />
         <MetricCard label="Active Channels" value={activeSessions.toString()} trend="Stable" icon={<Activity />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Session Audit Log */}
        <div className="lg:col-span-8 space-y-10">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Session Audit Pipeline</h3>
              <div className="h-px flex-1 mx-8 bg-white/5" />
           </div>

           <div className="space-y-4">
              {sessions?.map(session => (
                <AuditListItem key={session.id} session={session} />
              ))}
           </div>
        </div>

        {/* Behavioral Flags */}
        <div className="lg:col-span-4 space-y-10">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight">Anomalies</h3>
              <div className="h-px flex-1 mx-8 bg-white/5" />
           </div>

           <div className="space-y-6">
              {/* Flag low performance */}
              {sessions?.filter(s => {
                const rate = (s.outcomes?.filter((o: any) => o.is_completed).length || 0) / (s.outcomes?.length || 1)
                return rate < 0.5 && s.status === 'completed'
              }).map(s => (
                <AnomalyCard key={s.id} title="Low Goal Completion" session={s.title} teacher={s.teacher?.full_name} />
              ))}
              
              <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 space-y-6">
                 <div className="flex items-center gap-3">
                    <TrendingUp size={20} className="text-emerald-500" />
                    <h4 className="font-black uppercase tracking-tight text-[11px]">Teacher Performance</h4>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mastery Efficiency</span>
                       <span className="text-[10px] font-black text-white">92.4%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full w-[92%] bg-emerald-500" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, trend, icon, up = true }: { label: string, value: string, trend: string, icon: any, up?: boolean }) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6 group hover:bg-white/[0.04] transition-all">
       <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
             {icon}
          </div>
          <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${up ? 'text-emerald-500' : 'text-red-500'}`}>
             {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
             {trend}
          </div>
       </div>
       <div>
          <div className="text-4xl font-black uppercase tracking-tighter text-white mb-1">{value}</div>
          <div className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">{label}</div>
       </div>
    </div>
  )
}

function AuditListItem({ session }: { session: any }) {
  const achieved = session.outcomes?.filter((o: any) => o.is_completed).length || 0
  const total = session.outcomes?.length || 0
  const masteryRate = total > 0 ? Math.round((achieved / total) * 100) : 0

  return (
    <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 group">
       <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-600 group-hover:text-white transition-all">
             <Clock size={24} />
          </div>
          <div className="space-y-1">
             <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">{session.teacher?.full_name}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">|</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{session.subject?.name}</span>
             </div>
             <h4 className="text-lg font-black uppercase tracking-tight text-white">{session.title}</h4>
          </div>
       </div>

       <div className="flex items-center gap-12">
          <div className="text-right space-y-1">
             <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mastery Rate</div>
             <div className={`text-lg font-black ${masteryRate > 80 ? 'text-emerald-500' : masteryRate > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {masteryRate}%
             </div>
          </div>
          <div className="text-right space-y-1">
             <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Attendance</div>
             <div className="text-lg font-black text-white">{session.attendance?.length || 0}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-700 hover:text-white transition-colors">
             <ChevronRight size={18} />
          </div>
       </div>
    </div>
  )
}

function AnomalyCard({ title, session, teacher }: { title: string, session: string, teacher: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 space-y-4">
       <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle size={18} />
          <h4 className="text-[10px] font-black uppercase tracking-widest">{title}</h4>
       </div>
       <div className="space-y-1">
          <p className="text-xs font-bold text-slate-200 uppercase tracking-tight">{session}</p>
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Instructor: {teacher}</p>
       </div>
    </div>
  )
}
