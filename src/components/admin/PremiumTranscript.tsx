'use client'

import { Transcript, SubjectResult } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Trophy,
  User,
  FileText,
  Quote,
  Calendar,
  Layers,
  Award,
  Star,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState, useEffect } from 'react'

interface PremiumTranscriptProps {
  transcript: Transcript
  schoolName?: string
  logoUrl?: string
  student?: any 
}

export function PremiumTranscript({ transcript, schoolName = 'PEAK PERFORMANCE TUTORING', logoUrl, student: studentContext }: PremiumTranscriptProps) {
  const [expandedSubjects, setExpandedSubjects] = useState(false)
  const snapshot = (transcript.branding_snapshot as any) || {}
  const { student: authStudent } = useAuthStore()
  
  const student = studentContext || (authStudent?.id === transcript.student_id ? authStudent : null) || transcript.student

  useEffect(() => {
    if (snapshot.signature_type === 'type' && snapshot.signature_font) {
      const fontName = snapshot.signature_font.split(',')[0].replace(/['"]/g, '').trim()
      const link = document.createElement('link')
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}&display=swap`
      link.rel = 'stylesheet'
      document.head.appendChild(link)
      return () => {
        try { document.head.removeChild(link) } catch(e) {}
      }
    }
  }, [snapshot.signature_font, snapshot.signature_type])

  return (
    <div className="w-full max-w-3xl mx-auto bg-[var(--card)] text-[var(--text)] shadow-2xl rounded-2xl overflow-hidden border border-[var(--card-border)] transition-theme relative">
      {/* PROFESSIONAL WATERMARK */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] overflow-hidden">
        <span className="text-[10rem] font-black uppercase rotate-[-35deg] select-none whitespace-nowrap">
          {snapshot.transcript_watermark || 'OFFICIAL RECORD'}
        </span>
      </div>

      {/* REFINED HEADER */}
      <div className="relative p-6 md:p-8 overflow-hidden bg-[var(--input)] border-b border-[var(--card-border)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="relative flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain mb-3" />
            ) : (
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-3 shadow-md shadow-primary/10">
                <GraduationCap className="text-white w-8 h-8" />
              </div>
            )}
            <h1 className="text-lg font-black tracking-widest text-[var(--text)] uppercase">{snapshot.school_name || schoolName}</h1>
            <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.15em] uppercase mt-0.5 opacity-60">Foundational Excellence</p>
          </div>

          <div className="flex flex-col items-center md:items-end text-center md:text-right w-full md:w-auto">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-[var(--text)] leading-tight tracking-tight uppercase italic underline decoration-primary/30 decoration-4">Academic Transcript</h2>
            <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-[var(--card)] rounded-lg border border-[var(--card-border)] shadow-sm">
               <Calendar size={12} className="text-[var(--primary)]" />
               <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">{transcript.title || 'Official Report'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPACT STUDENT DATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--card-border)] border-b border-[var(--card-border)]">
        <div className="bg-[var(--card)] p-4 md:p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--input)] flex items-center justify-center border border-[var(--card-border)] shrink-0">
            <User className="text-[var(--text-muted)]" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-0.5">Full Name</p>
            <p className="text-sm font-black text-[var(--text)] uppercase truncate">
              {transcript.student?.full_name || student?.full_name || 'STUDENT NAME'}
            </p>
          </div>
        </div>
        <div className="bg-[var(--card)] p-4 md:p-6 flex items-center gap-4 border-l border-[var(--card-border)]">
          <div className="w-10 h-10 rounded-xl bg-[var(--input)] flex items-center justify-center border border-[var(--card-border)] shrink-0">
            <FileText className="text-[var(--text-muted)]" size={20} />
          </div>
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-0.5">Admission</p>
              <p className="font-bold text-[var(--text)] text-xs tracking-tight truncate">
                {transcript.student?.admission_number || student?.admission_number || 'N/A'}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-0.5">Level</p>
              <p className="font-bold text-[var(--text)] text-xs uppercase truncate">
                {transcript.student?.class?.name || (student as any)?.class?.name || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {/* FORMAL SUBJECT TABLE */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--input)] text-[9px] font-black tracking-widest text-[var(--text-muted)] uppercase">
                <th className="px-5 py-3 border-b border-[var(--card-border)]">Subject Field</th>
                <th className="px-5 py-3 border-b border-[var(--card-border)] text-center w-24">Marks (%)</th>
                <th className="px-5 py-3 border-b border-[var(--card-border)] text-right w-24">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {transcript.subject_results.map((res, i) => (
                <tr key={i} className="hover:bg-[var(--input)]/50 transition-colors">
                  <td className="px-5 py-2.5">
                    <span className="font-bold text-sm text-[var(--text)] uppercase">{res.subject_name}</span>
                  </td>
                  <td className="px-5 py-2.5 text-center font-mono font-bold text-[var(--text-muted)] text-sm">{res.marks}</td>
                  <td className="px-5 py-2.5 text-right font-black text-primary text-sm">{res.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* COMPACT MOBILE LIST */}
        <div className="md:hidden space-y-2">
          {transcript.subject_results.map((res, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-[var(--input)] rounded-xl border border-[var(--card-border)]">
              <span className="font-bold text-xs text-[var(--text)] uppercase">{res.subject_name}</span>
              <div className="flex items-center gap-3">
                 <span className="font-mono text-[10px] text-[var(--text-muted)]">{res.marks}%</span>
                 <span className="font-black text-primary text-xs w-6 text-right">{res.grade}</span>
              </div>
            </div>
          ))}
        </div>

        {/* REFINED SUMMARY CARDS */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 p-5 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] flex items-center justify-between">
            <div className="space-y-4">
               <div>
                 <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Total Aggregate</p>
                 <p className="text-xl font-black text-[var(--text)]">{transcript.total_marks}</p>
               </div>
               <div>
                 <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Mean Score</p>
                 <p className="text-xl font-black text-[var(--text)] tracking-tighter">{transcript.average_score?.toFixed(1)}%</p>
               </div>
            </div>
            <div className="w-24 h-24 rounded-2xl bg-primary flex flex-col items-center justify-center text-white shadow-lg">
               <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Overall</p>
               <span className="text-4xl font-black">{transcript.overall_grade}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] space-y-3">
             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Class Standing</p>
             <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-600">{transcript.class_rank || '-'}</span>
                <span className="text-[9px] font-bold text-slate-300">/ {transcript.exam_event?.total_candidates || 'N/A'}</span>
             </div>
             <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/5 px-2 py-0.5 rounded-md w-fit">Positioned</p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--sidebar)] text-white space-y-3">
             <p className="text-[9px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 pb-2">Institution Tier</p>
             <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-400">{transcript.curriculum_rank || 'Top Tier'}</span>
             </div>
             <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded-md w-fit italic">Certified Rank</p>
          </div>
        </div>

        {/* MODERATED REMARKS */}
        {transcript.remarks?.trim() && (
          <div className="mt-8 p-6 rounded-2xl bg-[var(--input)] border-l-4 border-primary/40 flex gap-5 items-start">
            <Quote size={24} className="text-primary/30 shrink-0" />
            <div className="space-y-2 flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 italic">Official Assessment Remarks</p>
              <p className="text-sm leading-relaxed text-[var(--text)] font-semibold italic">&quot;{transcript.remarks}&quot;</p>
            </div>
          </div>
        )}

        {/* FORMAL FOOTER */}
        <div className="mt-12 pt-8 border-t border-[var(--card-border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-end">
          <div className="space-y-4">
             <div className="h-14 flex items-center border-b border-[var(--card-border)] relative">
               {snapshot.signature_data ? (
                 snapshot.signature_type === 'draw' ? (
                   <img src={snapshot.signature_data} alt="Sign" className="max-h-12 object-contain brightness-0 contrast-150" />
                 ) : (
                   <span style={{ fontFamily: snapshot.signature_font, fontSize: '24px' }} className="text-[var(--text)] whitespace-nowrap px-1">
                     {snapshot.signature_data}
                   </span>
                 )
               ) : (
                 <div className="w-full h-px border-b border-dashed border-[var(--text-muted)] opacity-20" />
               )}
             </div>
             <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-primary">Academic Director</p>
               <p className="text-[9px] font-medium text-[var(--text-muted)] uppercase tracking-widest opacity-40">{snapshot.director_name || 'Authorized Official'}</p>
             </div>
          </div>
          
          <div className="space-y-4">
             <div className="h-14 flex items-end border-b border-[var(--card-border)] pb-2 font-mono text-sm font-bold text-[var(--text)]">
                {new Date(transcript.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Date Validated</p>
          </div>

          <div className="hidden lg:flex justify-end">
             <div className="w-24 h-24 rounded-full border border-dashed border-[var(--card-border)] flex items-center justify-center relative p-2">
                {snapshot.stamp_url ? (
                  <img src={snapshot.stamp_url} alt="Stamp" className="w-16 h-16 object-contain opacity-20 rotate-[-12deg]" />
                ) : (
                  <ShieldCheck size={32} className="text-slate-200" />
                )}
                <div className="absolute inset-0 rounded-full border border-primary/5 scale-110" />
             </div>
          </div>
        </div>
      </div>
      
      <div className="bg-[var(--sidebar)] py-3 text-center border-t border-white/5">
         <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.4em]">Official Records • Foundational Excellence</p>
      </div>
    </div>
  )
}
