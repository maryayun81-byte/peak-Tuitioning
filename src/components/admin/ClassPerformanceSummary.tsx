'use client'

import { useEffect, useState } from 'react'
import { Transcript } from '@/types/database'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface ClassPerformanceSummaryProps {
  transcripts: Transcript[]
  filterSubject?: string
  onReady?: (ready: boolean) => void
}

const SUBJECT_COLORS = [
  '#1D4477', // Navy
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#F43F5E', // Rose
]

export function ClassPerformanceSummary({ transcripts, filterSubject, onReady }: ClassPerformanceSummaryProps) {
  const supabase = getSupabaseBrowserClient()
  const [globalConfig, setGlobalConfig] = useState<any>(null)
  
  // Extract all unique subjects across all transcripts
  const allSubjects = filterSubject 
    ? [filterSubject]
    : Array.from(new Set(
        transcripts.flatMap(t => (t.subject_results as any[] || []).map(r => r.subject_name))
      )).sort()

  useEffect(() => {
    supabase.from('transcript_config').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setGlobalConfig(data)
      if (onReady) {
        // Small buffer to ensure rendering
        setTimeout(() => onReady(true), 1000)
      }
    })
  }, [onReady])

  const schoolName = globalConfig?.school_name || "PEAK PERFORMANCE TUTORING"

  return (
    <div 
      className="bg-white p-12 w-fit min-w-[1200px] border-[16px] border-[#1D4477] relative"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-6xl font-black text-[#1D4477] tracking-[0.1em] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          STUDENTS LIST
        </h1>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-0.5 w-24 bg-[#1D4477]/20" />
          <h2 className="text-xl font-bold text-[#1D4477] tracking-[0.3em] uppercase">
            Academic Performance Summary
          </h2>
          <div className="h-0.5 w-24 bg-[#1D4477]/20" />
        </div>
        <p className="text-sm font-black text-[#7ABA78] tracking-[0.2em] uppercase">
          {schoolName} • Official Record
        </p>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border-2 border-[#1D4477] shadow-2xl">
        <table className="w-full border-collapse text-sm">
          <thead>
            {/* Main Header Rows */}
            <tr className="text-white text-[11px] font-black uppercase tracking-wider">
              <th rowSpan={2} className="bg-[#1D4477] p-4 border-r border-[#ffffff20] w-12 text-center">No.</th>
              <th rowSpan={2} className="bg-[#1D4477] p-4 border-r border-[#ffffff20] w-64 text-center">Student Name</th>
              <th rowSpan={2} className="bg-[#1D4477] p-4 border-r border-[#ffffff20] w-24 text-center">Class/<br/>Form</th>
              
              {allSubjects.map((subject, idx) => (
                <th key={subject} colSpan={2} className="p-3 border-r border-[#ffffff20] text-center" style={{ backgroundColor: SUBJECT_COLORS[idx % SUBJECT_COLORS.length] }}>
                  {subject}
                </th>
              ))}
            </tr>
            <tr className="bg-[#1D4477]/90 text-white text-[9px] font-black uppercase tracking-widest">
              {allSubjects.map((subject) => (
                <>
                  <th key={`${subject}-m`} className="p-2 border-r border-[#ffffff20] text-center w-16">Marks</th>
                  <th key={`${subject}-g`} className="p-2 border-r border-[#ffffff20] text-center w-12">Grade</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {transcripts.map((t, sIdx) => {
              const student = t.student as any
              return (
                <tr key={t.id} className={sIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                  <td className="p-4 border-r border-slate-200 text-center font-bold text-[#1D4477]/60 tabular-nums">{sIdx + 1}</td>
                  <td className="p-4 border-r border-slate-200 font-extrabold text-[#1D4477] uppercase text-xs">{student?.full_name}</td>
                  <td className="p-4 border-r border-slate-200 text-center font-bold text-slate-500 text-xs">{student?.class?.name || '—'}</td>
                  
                  {allSubjects.map((subName) => {
                    const result = (t.subject_results as any[] || []).find(r => r.subject_name === subName)
                    return (
                      <>
                        <td key={`${t.id}-${subName}-m`} className="p-4 border-r border-slate-100 text-center font-black text-slate-700 text-base">
                          {result?.marks ?? '—'}
                        </td>
                        <td key={`${t.id}-${subName}-g`} className="p-4 border-r border-slate-200 text-center font-black text-[#1D4477] text-base">
                          {result?.grade ?? '—'}
                        </td>
                      </>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-between items-end opacity-40 italic text-[10px] font-bold text-[#1D4477]">
        <p>Generated on {new Date().toLocaleDateString()} • Peak Performance Management System</p>
        <p>Verified Transcript Summary</p>
      </div>
    </div>
  )
}
