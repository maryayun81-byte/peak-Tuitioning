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
const BRAND_NAVY = '#002147' // Premium Academy Navy
const BRAND_ACCENT = '#4F8CFF' // Peak Primary

export const TimetablePDF: React.FC<TimetablePDFProps> = ({ 
  className, 
  curriculumName, 
  termInfo, 
  sessions 
}) => {
  // Extract unique time slots across all sessions
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
      // Fixed aspect ratio for A4 Landscape roughly
      className="p-16 bg-white text-slate-900 w-[1400px] min-h-[990px] font-sans border-[16px] border-[#f8fafc]"
      style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
    >
      {/* PROFESSIONAL HEADER */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex items-center gap-8">
          <div className="w-24 h-24 bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center">
             <img src="/logo.png" alt="Peak Tuitioning" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-6xl font-black tracking-tighter leading-none" style={{ color: BRAND_NAVY }}>PEAK PERFORMANCE</h1>
            <p className="text-xl font-bold tracking-[0.5em] text-slate-400 uppercase mt-2">Academic Excellence • 2026</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block px-6 py-2 rounded-full border-4 font-black text-2xl mb-2" style={{ borderColor: BRAND_NAVY, color: BRAND_NAVY }}>
            {className}
          </div>
          <div className="text-md font-black text-slate-500 uppercase tracking-widest">
            {curriculumName} • {termInfo}
          </div>
          <div className="h-2 w-48 bg-gradient-to-r from-transparent to-[#002147] mt-4 ml-auto" />
        </div>
      </div>

      {/* TIMETABLE GRID */}
      <div className="relative border-[3px] border-slate-900 rounded-[2rem] overflow-hidden shadow-2xl">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: BRAND_NAVY }} className="text-white">
              <th className="p-8 text-left text-lg font-black uppercase tracking-widest border-r border-white/10 w-48">Schedule</th>
              {DAYS.map(day => (
                <th key={day} className="p-8 text-center text-lg font-black uppercase tracking-widest border-r border-white/10 last:border-r-0">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, i) => (
              <tr key={slot} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-6 border-r border-slate-200 align-middle">
                   <div className="text-xl font-black text-slate-900 leading-tight">
                     {slot.split('-')[0]}
                   </div>
                   <div className="text-sm font-bold text-slate-400 mt-1 uppercase">
                     to {slot.split('-')[1]}
                   </div>
                </td>
                {DAYS.map(day => {
                  const s = getSession(day, slot) as any
                  return (
                    <td key={day} className="border-r border-slate-100 p-2 align-top last:border-r-0 h-40 w-1/5 relative">
                      {s ? (
                        <div className="h-full flex flex-col justify-between p-5 rounded-2xl bg-white border-2 border-slate-100 shadow-sm transition-all">
                          <div className="space-y-3">
                            <div className="text-lg font-black leading-tight uppercase tracking-tighter" style={{ color: BRAND_NAVY }}>
                              {['class', 'practical', 'assessment', 'exam', 'cat'].includes(s.session_type) 
                                ? s.subject?.name 
                                : s.session_type?.toUpperCase()}
                            </div>
                            
                            {/* TEACHER - WORLD CLASS legibility */}
                            <div className="flex items-center gap-3 mt-1">
                               <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: BRAND_ACCENT }} />
                               <div className="text-md font-black text-slate-600 uppercase">
                                 {s.teacher?.full_name || s.guest_speaker || 'Academy Staff'}
                               </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                             {s.room_number && (
                                <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-500 uppercase tracking-widest">
                                   Room: {s.room_number}
                                </div>
                             )}
                             <div className="text-[10px] font-black italic opacity-30 uppercase tracking-tighter">
                               Peak Ref: {s.id.slice(0, 4)}
                             </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full bg-slate-200/20 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center opacity-20 grayscale">
                          <img src="/logo.png" className="w-12 h-12 object-contain opacity-20" />
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

      {/* FOOTER INFO */}
      <div className="mt-16 pt-8 border-t-2 border-slate-100 flex justify-between items-center bg-[#f8fafc]/50 p-8 rounded-3xl">
        <div className="flex gap-12">
           <div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Issue Date</div>
             <div className="text-sm font-black text-slate-900">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
           </div>
           <div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Status</div>
             <div className="text-sm font-black text-emerald-600">OFFICIALLY SANCTIONED</div>
           </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black tracking-[0.8em] text-slate-300 uppercase">CONSPICUOUS ACADEMY SCHEDULE</div>
          <p className="text-[9px] font-bold text-slate-400 mt-2 italic px-4 py-1 bg-white inline-block rounded-lg shadow-sm">This document is ready for high-resolution large format printing.</p>
        </div>
      </div>
    </div>
  )
}
