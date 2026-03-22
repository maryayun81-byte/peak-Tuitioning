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
  student?: any // Added student prop
}

export function PremiumTranscript({ transcript, schoolName = 'PEAK PERFORMANCE TUTORING', logoUrl, student: studentContext }: PremiumTranscriptProps) {
  const [expandedSubjects, setExpandedSubjects] = useState(false)
  const snapshot = (transcript.branding_snapshot as any) || {}
  const { student: authStudent } = useAuthStore()
  
  // Use passed context, then auth store student if it matches the transcript's student_id
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
    <div className="w-full max-w-4xl mx-auto bg-[var(--card)] text-[var(--text)] shadow-2xl rounded-[2.5rem] overflow-hidden border border-[var(--card-border)] transition-theme relative">
      {/* WATERMARK EFFECT */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden">
        <span className="text-[12rem] font-black uppercase rotate-[-35deg] select-none whitespace-nowrap">
          {snapshot.transcript_watermark || 'OFFICIAL'}
        </span>
      </div>

      {/* AUTHORITATIVE HEADER */}
      <div className="relative p-10 md:p-16 overflow-hidden bg-[var(--input)] border-b-2 border-[var(--card-border)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain mb-4" />
            ) : (
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                <GraduationCap className="text-white w-10 h-10" />
              </div>
            )}
            <h1 className="text-xl font-black tracking-widest text-[var(--text)] uppercase">{snapshot.school_name || schoolName}</h1>
            <p className="text-xs font-bold text-[var(--text-muted)] tracking-[0.2em] uppercase mt-1">{snapshot.transcript_watermark || 'Foundational Excellence'}</p>
          </div>

          <div className="flex flex-col items-center md:items-end text-center md:text-right w-full md:w-auto overflow-visible">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-[var(--text)] leading-tight tracking-tight whitespace-pre-wrap">OFFICIAL ACADEMIC<br/>TRANSCRIPT</h2>
            <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-[var(--card)] rounded-full border border-[var(--card-border)] shadow-sm self-center md:self-end">
               <Calendar size={14} className="text-[var(--primary)]" />
               <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{transcript.title || 'Academic Period'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENT METADATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--card-border)] border-b-2 border-[var(--card-border)]">
        <div className="bg-[var(--card)] p-6 md:p-10 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-[var(--input)] flex items-center justify-center border border-[var(--card-border)] shrink-0">
            <User className="text-[var(--text-muted)]" size={28} />
          </div>
          <div className="min-w-0 flex-1 overflow-visible">
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)] mb-1">Student Name</p>
            <p className="text-base sm:text-lg md:text-xl font-black text-[var(--text)] uppercase whitespace-nowrap truncate overflow-visible">
              {transcript.student?.full_name || student?.full_name || 'STUDENT NAME'}
            </p>
          </div>
        </div>
        <div className="bg-[var(--card)] p-6 md:p-10 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-[var(--input)] flex items-center justify-center border border-[var(--card-border)] shrink-0">
            <FileText className="text-[var(--text-muted)]" size={28} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full overflow-visible">
            <div className="min-w-0 flex-1 overflow-visible">
              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)] mb-1">Admission No</p>
              <p className="font-bold text-[var(--text)] text-sm sm:text-base tracking-tight whitespace-nowrap truncate overflow-visible">
                {transcript.student?.admission_number || student?.admission_number || 'N/A'}
              </p>
            </div>
            <div className="min-w-0 overflow-visible">
              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)] mb-1">Class / Level</p>
              <p className="font-bold text-[var(--text)] text-sm sm:text-base uppercase tracking-tight whitespace-nowrap truncate overflow-visible">
                {transcript.student?.class?.name || (student as any)?.class?.name || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-12">
        {/* DESKTOP SUBJECT LIST */}
        <div className="hidden md:block overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--input)] text-[10px] font-black tracking-widest text-[var(--text-muted)] uppercase">
                <th className="p-5 border-b border-[var(--card-border)]">Subject</th>
                <th className="p-5 border-b border-[var(--card-border)] text-center">Marks</th>
                <th className="p-5 border-b border-[var(--card-border)] text-right">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {transcript.subject_results.map((res, i) => (
                <tr key={i} className="group hover:bg-[var(--input)]/50 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--primary)]/20 group-hover:bg-[var(--primary)] transition-colors" />
                      <span className="font-bold text-[var(--text)] uppercase">{res.subject_name}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center font-mono font-bold text-[var(--text-muted)]">{res.marks}</td>
                  <td className="p-5 text-right">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--sidebar)] text-white font-black shadow-lg shadow-black/20 border border-white/5">
                      {res.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE SUBJECT CARDS */}
        <div className="md:hidden space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Layers size={14} /> Subject Analysis
            </h3>
            <button 
              onClick={() => setExpandedSubjects(!expandedSubjects)}
              className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1"
            >
              {expandedSubjects ? 'Collapse All' : 'Expand All'} <ChevronDown className={`w-3 h-3 transition-transform ${expandedSubjects ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          <div className="space-y-3">
            {transcript.subject_results.map((res, i) => (
              <MobileSubjectItem key={i} res={res} forceExpanded={expandedSubjects} />
            ))}
          </div>
        </div>

        {/* SUMMARY SECTION */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-8 rounded-[2.5rem] bg-[var(--input)] border border-[var(--card-border)] flex flex-col justify-between shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-8">Performance Summary</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Marks</span>
                  <span className="text-xl font-black text-[var(--text)]">{transcript.total_marks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Mean Score</span>
                  <span className="text-xl font-black text-[var(--text)]">{transcript.average_score?.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-primary text-white shadow-xl shadow-primary/20 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-2 relative">Overall Grade</p>
              <span className="text-6xl md:text-7xl font-black relative drop-shadow-2xl">{transcript.overall_grade}</span>
            </div>
          </div>

            <div className="p-8 rounded-[2.5rem] bg-[var(--sidebar)] text-white flex flex-col justify-between shadow-2xl border border-white/10 relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/50" />
              <div className="flex items-center gap-2 mb-8 relative">
                <Trophy size={16} className="text-emerald-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Official Rankings</p>
              </div>
            <div className="space-y-6 relative">
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase mb-1 tracking-widest">Class Rank</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tighter">{transcript.class_rank || '-'}</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">of {transcript.exam_event?.total_candidates || 'N/A'}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] font-black text-white/40 uppercase mb-1 tracking-widest">Curriculum Rank</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-400 tracking-tighter">{transcript.curriculum_rank || '-'}</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Campus Wide</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DIRECTOR REMARKS */}
        {transcript.remarks?.trim() && (
          <div className="mt-12 p-8 md:p-10 rounded-[3rem] bg-[var(--input)] border border-[var(--card-border)] flex gap-8 items-start relative group">
            <div className="w-16 h-16 rounded-3xl bg-[var(--primary)] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[var(--primary)]/20">
               <Quote size={32} />
            </div>
            <div className="space-y-4 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)]">Director&apos;s Official Cognizance</p>
              <p className="text-xl leading-relaxed text-[var(--text)] font-medium italic opacity-90 tracking-tight">&quot;{transcript.remarks}&quot;</p>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Quote size={80} />
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-20 pt-16 border-t-2 border-[var(--card-border)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12 text-center md:text-left relative">
          <div className="space-y-6">
             <div className="h-20 flex items-center justify-center md:justify-start overflow-hidden border-b-2 border-[var(--card-border)] relative">
               <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-[var(--primary)]/30" />
               
               {snapshot.signature_data ? (
                 snapshot.signature_type === 'draw' ? (
                   <img src={snapshot.signature_data} alt="Signature" className="max-h-16 object-contain brightness-0 contrast-200" />
                 ) : (
                   <span style={{ fontFamily: snapshot.signature_font, fontSize: '32px' }} className="text-[var(--text)] whitespace-nowrap px-2">
                     {snapshot.signature_data}
                   </span>
                 )
               ) : (
                 <div className="w-full h-full opacity-10 border-b border-dashed border-[var(--text)]" />
               )}
             </div>
             <div>
               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Director&apos;s Signature</p>
               <p className="text-[10px] font-bold text-[var(--text)] opacity-40 mt-1 uppercase tracking-widest truncate">{snapshot.director_name || 'Authorized Signatory'}</p>
             </div>
          </div>
          <div className="space-y-6">
             <div className="h-20 flex items-end justify-center md:justify-start border-b-2 border-[var(--card-border)] pb-3">
                <span className="font-mono text-lg font-black text-[var(--text)] tracking-wider">
                  {new Date(transcript.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
             </div>
             <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] pt-2">Date of Issue</p>
          </div>
          <div className="hidden sm:flex flex-col items-center justify-center md:items-start lg:items-center">
             <div className="w-32 h-32 rounded-full border-2 border-dashed border-[var(--card-border)] flex items-center justify-center relative group bg-[var(--input)]/50 shadow-inner">
                {snapshot.stamp_url ? (
                  <img src={snapshot.stamp_url} alt="Stamp" className="w-24 h-24 object-contain opacity-20 rotate-[-15deg] group-hover:opacity-40 transition-opacity" />
                ) : (
                  <div className="text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]/20 rotate-[-15deg]">Official</span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]/20 rotate-[-15deg]">School Stamp</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full border border-[var(--primary)]/5 scale-110" />
             </div>
          </div>
        </div>
      </div>
      
      <div className="bg-[var(--sidebar)] p-4 text-center border-t border-white/5">
         <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Excellence Through Dedication • Peak Performance Tutoring</p>
      </div>
    </div>
  )
}

function MobileSubjectItem({ res, forceExpanded }: { res: SubjectResult, forceExpanded: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const show = forceExpanded || isExpanded

  return (
    <div className="bg-[var(--input)] rounded-2xl border border-[var(--card-border)] overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text)] font-black">
            {res.grade}
          </div>
          <span className="font-bold text-[var(--text)] uppercase">{res.subject_name}</span>
        </div>
        {!forceExpanded && (
          <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 border-t border-slate-200/50"
          >
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[var(--card)] p-3 rounded-xl border border-[var(--card-border)]">
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Marks Obtained</p>
                <p className="text-lg font-black text-[var(--text)] opacity-80">{res.marks}</p>
              </div>
              <div className="bg-[var(--card)] p-3 rounded-xl border border-[var(--card-border)]">
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Academic Grade</p>
                <p className="text-lg font-black text-[var(--primary)]">{res.grade}</p>
              </div>
            </div>
            {res.remark && (
              <div className="mt-3 p-3 bg-[var(--card)] rounded-xl border border-[var(--card-border)] flex gap-2">
                 <Award size={14} className="text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-xs font-medium text-[var(--text-muted)]">"{res.remark}"</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
