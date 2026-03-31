import React from 'react'

interface AttendancePDFProps {
  studentName: string
  className?: string
  subjectName?: string
  overallPercentage: number
  stats: {
    attended: number
    missed: number
    excused: number
    late: number
  }
  history: {
    date: string
    status: 'present' | 'absent' | 'excused' | 'late' | 'unmarked'
    notes?: string
  }[]
}

export function AttendancePDF({ studentName, className, subjectName, overallPercentage, stats, history }: AttendancePDFProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#10B981' // emerald-500
      case 'absent': return '#EF4444' // red-500
      case 'excused': return '#6366F1' // indigo-500
      case 'late': return '#F59E0B' // amber-500
      default: return '#9CA3AF' // gray-400
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  // Calculate grade based on percentage
  const getGrade = (pct: number) => {
    if (pct >= 95) return { letter: 'A+', text: 'Exceptional Attendance', color: '#10B981' }
    if (pct >= 90) return { letter: 'A', text: 'Excellent Attendance', color: '#10B981' }
    if (pct >= 85) return { letter: 'B', text: 'Good Attendance', color: '#3B82F6' }
    if (pct >= 75) return { letter: 'C', text: 'Average Attendance', color: '#F59E0B' }
    return { letter: 'Needs Work', text: 'Below Expectations', color: '#EF4444' }
  }

  const grade = getGrade(overallPercentage)

  return (
    <div id="attendance-pdf-content" className="fixed top-0 left-0 -z-50 bg-white" style={{ width: '1200px', display: 'none', fontFamily: 'Inter, sans-serif' }}>
      <div className="p-12 text-slate-900 bg-[#f8fafc] min-h-[1697px]"> {/* A4 Portrait Approx Ratio */}
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b-4 border-slate-900 pb-8 mb-12">
          <div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tight mb-2">ATTENDANCE</h1>
            <h2 className="text-3xl font-bold tracking-widest text-slate-400 uppercase">Official Report</h2>
          </div>
          <div className="text-right">
            <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center text-white mb-4 ml-auto shadow-2xl">
              <span className="text-5xl font-black">{studentName.charAt(0)}</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{studentName}</div>
            <div className="text-lg font-bold text-slate-500 mt-1">{className || 'All Classes'} • {subjectName || 'General'}</div>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="flex gap-8 mb-12">
          {/* Main Percentage Drop */}
          <div className="flex-1 bg-white p-10 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col justify-center">
            <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 relative">
              <span className="relative z-10 bg-white pr-4">Overall Score</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-8xl font-black tracking-tighter" style={{ color: grade.color }}>{overallPercentage}%</span>
            </div>
            <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full border-2" style={{ borderColor: grade.color + '40', color: grade.color }}>
              <span className="font-bold text-lg">{grade.text}</span>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="w-[400px] flex flex-col gap-4">
             <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
                <div>
                   <div className="text-4xl font-black text-emerald-600">{stats.attended}</div>
                   <div className="text-xs font-black uppercase tracking-widest text-emerald-600/60 mt-1">Present</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">P</div>
             </div>
             <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex items-center justify-between">
                <div>
                   <div className="text-4xl font-black text-rose-600">{stats.missed}</div>
                   <div className="text-xs font-black uppercase tracking-widest text-rose-600/60 mt-1">Absent</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold">A</div>
             </div>
             <div className="flex gap-4">
                <div className="flex-1 bg-amber-50 p-5 rounded-2xl border border-amber-100">
                   <div className="text-2xl font-black text-amber-600">{stats.late || 0}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-amber-600/60 mt-1">Late</div>
                </div>
                <div className="flex-1 bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                   <div className="text-2xl font-black text-indigo-600">{stats.excused}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 mt-1">Excused</div>
                </div>
             </div>
          </div>
        </div>

        {/* Detailed Timeline Table */}
        <div className="bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 px-8 py-6 text-white flex items-center justify-between">
             <h3 className="text-lg font-black tracking-widest uppercase">Chronological Record</h3>
             <span className="text-sm font-semibold opacity-60">{history.length} entries</span>
          </div>
          
          <div className="p-8">
             {history.length === 0 ? (
               <div className="text-center py-12 text-slate-400 font-medium text-lg">
                 No attendance records found for this period.
               </div>
             ) : (
               <table className="w-full">
                 <thead>
                   <tr className="border-b-2 border-slate-100">
                     <th className="py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Date</th>
                     <th className="py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                     <th className="py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Notes & Comments</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {history.map((entry, idx) => (
                     <tr key={idx} className="group">
                       <td className="py-5 w-48">
                          <div className="font-bold text-slate-900">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                       </td>
                       <td className="py-5 w-48">
                          <div className="inline-flex items-center px-3 py-1.5 rounded-lg border font-black text-sm uppercase tracking-wider" 
                               style={{ backgroundColor: getStatusColor(entry.status) + '15', color: getStatusColor(entry.status), borderColor: getStatusColor(entry.status) + '30' }}>
                            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getStatusColor(entry.status) }}></div>
                            {getStatusLabel(entry.status)}
                          </div>
                       </td>
                       <td className="py-5">
                          {entry.notes ? (
                            <span className="text-slate-600 italic font-medium">{entry.notes}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-slate-400 text-sm font-semibold tracking-wider">
           Generated securely by Peak Tuitioning Platform • {new Date().toLocaleDateString()}
        </div>

      </div>
    </div>
  )
}
