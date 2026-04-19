'use client'

import React from 'react'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'

interface AttendanceRecord {
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  notes?: string
}

interface StudentRecords {
  studentName: string
  records: AttendanceRecord[]
}

interface AttendanceReportProps {
  id: string
  type: 'student-weekly' | 'student-full' | 'class-weekly'
  data: {
    studentName?: string
    className?: string
    centerName?: string
    tuitionEventName?: string
    weekLabel?: string
    weeksToRender?: { label: string, activeDates: string[] }[]
    records: AttendanceRecord[] | StudentRecords[]
    activeDates: string[] // Essential for alignment
  }
}

export const AttendanceReportTemplate = ({ id, type, data }: AttendanceReportProps) => {
  const weeksToRender = data.weeksToRender || [{ label: data.weekLabel || 'Week Report', activeDates: data.activeDates }]
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'present': return { bg: '#2D6A4F', border: '#40916C', icon: <CheckCircle2 size={12} className="mr-1" />, label: 'Present' }
      case 'absent': return { bg: '#941B0C', border: '#BC3908', icon: <XCircle size={12} className="mr-1" />, label: 'Absent' }
      case 'late': return { bg: '#D68C45', border: '#E99B56', icon: <Clock size={12} className="mr-1" />, label: 'Late' }
      case 'excused': return { bg: '#1B4965', border: '#62B6CB', icon: <AlertCircle size={12} className="mr-1" />, label: 'Excused' }
      default: return { bg: '#4A4E69', border: '#9A8C98', icon: null, label: 'Unmarked' }
    }
  }

  // Helper to render a status pill
  const StatusPill = ({ status }: { status: string }) => {
    const style = getStatusStyle(status)
    return (
      <div 
        className="flex items-center justify-center px-2 py-1 rounded-md text-[9px] font-bold text-white border shadow-sm"
        style={{ backgroundColor: style.bg, borderColor: style.border }}
      >
        {style.icon}
        {style.label}
      </div>
    )
  }

  return (
    <div 
      id={id}
      className="relative overflow-hidden w-[1000px] min-h-[600px] p-10 font-sans"
      style={{ 
        backgroundImage: 'url("/chalkboard.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#FFFFFF'
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 w-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-10 border-b border-white/20 pb-6">
          <div className="space-y-2">
            <img src="/logo.png" alt="Logo" className="h-14 w-auto drop-shadow-lg" />
            <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: '"DM Sans", sans-serif' }}>
              Student Attendance
            </h1>
            <p className="text-amber-400 font-bold tracking-widest uppercase text-xs">
              {data.weekLabel || 'Session Overview'}
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
              <p className="text-[10px] text-white/60 uppercase font-black">Tuition Event</p>
              <p className="text-sm font-bold text-white">{data.tuitionEventName || 'Peak Program'}</p>
            </div>
            {data.centerName && (
              <p className="text-xs text-white/70 font-medium">{data.centerName}</p>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {type !== 'class-weekly' && (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[9px] text-white/40 uppercase font-black mb-1">Student</p>
              <p className="text-lg font-black">{data.studentName}</p>
            </div>
          )}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[9px] text-white/40 uppercase font-black mb-1">Class</p>
            <p className="text-lg font-black">{data.className || 'General'}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[9px] text-white/40 uppercase font-black mb-1">Report Generated</p>
            <p className="text-lg font-black">{formatDate(new Date(), 'long')}</p>
          </div>
        </div>

        {/* Data Tables */}
        <div className="space-y-10">
          {type === 'student-full' ? (
            weeksToRender.map((week, wIdx) => (
              <div key={wIdx} className="space-y-2">
                <div className="px-4 py-1 bg-white/10 rounded-t-xl text-[10px] font-black uppercase tracking-widest">
                  {week.label}
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-b-3xl border border-white/10 overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1E3A8A]/80">
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest border-r border-white/10 min-w-[150px]">
                          Student Name
                        </th>
                        {week.activeDates.map(date => (
                          <th key={date} className="px-3 py-4 text-[11px] font-black uppercase tracking-widest text-center border-r last:border-0 border-white/10">
                            <div className="text-amber-400">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className="text-[9px] opacity-70">{new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white/5">
                        <td className="px-6 py-4 font-bold text-sm border-r border-white/10">
                          {data.studentName}
                        </td>
                        {week.activeDates.map(date => {
                          const rec = (data.records as AttendanceRecord[]).find(r => r.date === date)
                          return (
                            <td key={date} className="px-2 py-3 border-r last:border-0 border-white/10 text-center">
                              {rec ? <StatusPill status={rec.status} /> : <div className="text-center opacity-20 text-[8px] font-black uppercase">N/A</div>}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1E3A8A]/80">
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest border-r border-white/10 min-w-[150px]">
                      {type === 'class-weekly' ? 'Student Name' : 'Description'}
                    </th>
                    {data.activeDates.map(date => (
                      <th key={date} className="px-3 py-4 text-[11px] font-black uppercase tracking-widest text-center border-r last:border-0 border-white/10">
                        <div className="text-amber-400">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-[9px] opacity-70">{new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {type === 'class-weekly' ? (
                    (data.records as StudentRecords[]).map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white/5' : ''}>
                        <td className="px-6 py-4 font-bold text-sm border-r border-white/10">
                          {row.studentName}
                        </td>
                        {data.activeDates.map(date => {
                          const rec = row.records.find(r => r.date === date)
                          return (
                            <td key={date} className="px-2 py-3 border-r last:border-0 border-white/10">
                              {rec ? <StatusPill status={rec.status} /> : <div className="text-center opacity-20 text-[8px] font-black uppercase">N/A</div>}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr className="bg-white/5">
                      <td className="px-6 py-4 font-bold text-sm border-r border-white/10">
                        {data.studentName}
                      </td>
                      {data.activeDates.map(date => {
                        const rec = (data.records as AttendanceRecord[]).find(r => r.date === date)
                        return (
                          <td key={date} className="px-2 py-3 border-r last:border-0 border-white/10 text-center">
                            {rec ? <StatusPill status={rec.status} /> : <div className="text-center opacity-20 text-[8px] font-black uppercase">N/A</div>}
                          </td>
                        )
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 flex justify-between items-end opacity-50">
          <div className="text-[10px] font-black tracking-widest uppercase italic">
            Peak Performance Tutoring · Official Attendance Report
          </div>
          <div className="text-[9px] font-medium italic">
            * Generated via Peak Portal Management System
          </div>
        </div>
      </div>
    </div>
  )
}
