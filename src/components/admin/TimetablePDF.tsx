'use client'

import React from 'react'
import type { Timetable } from '@/types/database'

interface TimetablePDFProps {
  className: string
  curriculumName: string
  termInfo: string
  sessions: Timetable[]
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export const TimetablePDF: React.FC<TimetablePDFProps> = ({ 
  className, 
  curriculumName, 
  termInfo, 
  sessions 
}) => {
  // Extract unique time slots across all sessions to build the Y-axis
  // In a real school timetable, these are often fixed (e.g., 8:00, 9:00), 
  // but we'll derive them from the data for maximum flexibility.
  const timeSlots = Array.from(new Set(
    sessions.map(s => `${s.start_time}-${s.end_time}`)
  )).sort()

  const getSession = (day: string, slot: string) => {
    return sessions.find(s => 
      s.day.toLowerCase() === day.toLowerCase() && 
      `${s.start_time}-${s.end_time}` === slot
    )
  }

  return (
    <div 
      id="timetable-pdf-content"
      className="p-12 bg-white text-slate-900 w-[1100px] min-h-[800px] font-sans"
      style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
    >
      {/* Header section with school-style branding */}
      <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">PEAK PERFORMANCE TUTORING</h1>
          <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Academic Excellence & Mentorship</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900">{className}</div>
          <div className="text-xs font-bold text-slate-500 uppercase">{curriculumName} • {termInfo}</div>
        </div>
      </div>

      {/* Main Timetable Grid */}
      <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="border-r border-slate-700 p-4 text-left text-xs font-black uppercase tracking-widest w-40">Time</th>
              {DAYS.map(day => (
                <th key={day} className="border-r border-slate-700 p-4 text-center text-xs font-black uppercase tracking-widest last:border-r-0">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, i) => (
              <tr key={slot} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border-t border-r border-slate-200 p-4 text-xs font-bold text-slate-600 align-middle">
                  {slot.replace('-', ' → ')}
                </td>
                {DAYS.map(day => {
                  const s = getSession(day, slot)
                  return (
                    <td key={day} className="border-t border-r border-slate-200 p-2 align-top last:border-r-0 h-32 w-1/5">
                      {s ? (
                        <div className="h-full flex flex-col justify-between p-2 rounded border border-slate-200 bg-white shadow-sm">
                          <div className="space-y-1">
                            <div className="text-[10px] font-black leading-tight text-slate-900 uppercase">
                              {(s as any).subject?.name}
                            </div>
                            <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                              {(s as any).teacher?.full_name}
                            </div>
                          </div>
                          {s.room_number && (
                            <div className="mt-auto pt-2 border-t border-slate-100 text-[8px] font-black text-primary uppercase">
                              Room: {s.room_number}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full w-full bg-slate-100/30 border border-dashed border-slate-200 rounded flex items-center justify-center italic text-[8px] text-slate-300 uppercase font-bold tracking-widest">
                          Unassigned
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Branding */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-center opacity-50">
        <div className="text-[10px] font-bold text-slate-400">
          Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
        <div className="text-[10px] font-black tracking-widest text-slate-900 uppercase">
          Official Class Schedule
        </div>
      </div>
    </div>
  )
}
