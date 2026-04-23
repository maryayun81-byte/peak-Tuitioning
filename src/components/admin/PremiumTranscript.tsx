'use client'

import { Transcript } from '@/types/database'
import { motion } from 'framer-motion'
import {
  User,
  BookOpen,
  GraduationCap,
  Layers,
  Star,
  ShieldCheck,
  Calendar,
  PenTool,
  FileText
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface PremiumTranscriptProps {
  transcript: Transcript
  student?: any 
  onReady?: (ready: boolean) => void
}

export function PremiumTranscript({ transcript, student: studentContext, onReady }: PremiumTranscriptProps) {
  const supabase = getSupabaseBrowserClient()
  const [globalConfig, setGlobalConfig] = useState<any>(null)
  const [readyStates, setReadyStates] = useState({
    config: false,
    logo: false,
    sig: false
  })
  const snapshot = (transcript.branding_snapshot as any) || {}
  const student = studentContext || transcript.student

  // globalConfig is always fresh from DB — it wins over the potentially stale branding_snapshot
  const DEFAULT_LOGO = "https://res.cloudinary.com/dzt6omwps/image/upload/v1713800000/peak_logo_circular.png"
  const logoUrl = globalConfig?.logo_url || snapshot.logo_url || DEFAULT_LOGO
  const sigData = globalConfig?.signature_data || snapshot.signature_data || ''
  const sigType = globalConfig?.signature_type || snapshot.signature_type || 'draw'
  const sigFont = globalConfig?.signature_font || snapshot.signature_font || "'Dancing Script', cursive"
  const directorName = globalConfig?.director_name || snapshot.director_name || "Director General"
  const showSignature = globalConfig?.apply_transcripts ?? snapshot.apply_transcripts ?? true

  useEffect(() => {
    supabase.from('transcript_config').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle().then(({ data, error }) => {
      if (data) {
        setGlobalConfig(data)
        console.log('PremiumTranscript: Branding Loaded:', {
          logo: !!data.logo_url,
          sig: !!data.signature_data,
          type: data.signature_type
        })
      }
      setReadyStates(prev => ({ ...prev, config: true }))
      if (error) console.warn('PremiumTranscript: could not load config', error.message)
    })
  }, [])

  // Report readiness to parent when all conditions met
  useEffect(() => {
    if (!onReady) return
    const isLogoReady = readyStates.logo || !logoUrl
    const isSigReady = readyStates.sig || !sigData || sigType === 'type' || !showSignature
    
    if (readyStates.config && isLogoReady && isSigReady) {
      // Small buffer to ensure browser has rendered
      const timer = setTimeout(() => onReady(true), 150)
      return () => clearTimeout(timer)
    } else {
      onReady(false)
    }
  }, [readyStates, logoUrl, sigData, sigType, showSignature, onReady])

  // Inject Playfair Display for that official premium look
  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;600;800&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => {
      try { document.head.removeChild(link) } catch(e) {}
    }
  }, [])

  const NavyIcon = ({ children }: { children: React.ReactNode }) => (
    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1D4477] text-white shrink-0">
      {children}
    </div>
  )

  return (
    <div 
      className="w-[1000px] mx-auto p-12 relative overflow-hidden transition-all duration-500 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] bg-[#FDFBF7]"
      style={{ 
        fontFamily: "'Inter', sans-serif",
        border: '12px solid #1D4477',
        outline: '1px solid #7ABA78',
        outlineOffset: '-6px',
        minWidth: '1000px'
      }}
    >
      {/* DECORATIVE CORNERS (Optional but adds to luxury) */}
      <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-[#7ABA78] opacity-20" />
      <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-[#7ABA78] opacity-20" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-[#7ABA78] opacity-20" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-[#7ABA78] opacity-20" />

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-6">
          <div className="relative group">
             <div className="absolute inset-0 bg-[#7ABA78] rounded-full blur-xl opacity-10 group-hover:opacity-20 transition-opacity" />
             <div className="w-32 h-32 relative flex items-center justify-center">
                <img 
                  src={logoUrl} 
                  alt="Peak Logo" 
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain drop-shadow-md"
                  onLoad={() => setReadyStates(prev => ({ ...prev, logo: true }))}
                  onError={(e) => { 
                    (e.target as HTMLImageElement).src = DEFAULT_LOGO
                    setReadyStates(prev => ({ ...prev, logo: true })) // Mark as ready even on error
                  }}
                />
             </div>
          </div>
          <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-[0.2em] text-[#1D4477] leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                PEAK
              </h1>
              <p className="text-lg font-bold tracking-[0.3em] text-[#1D4477]/90 -mt-1">PERFORMANCE</p>
             <div className="flex items-center gap-2">
                <div className="h-[2px] w-12 bg-[#7ABA78]" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#7ABA78]">TUTORING</span>
                <div className="h-[2px] w-12 bg-[#7ABA78]" />
             </div>
          </div>
        </div>

        <div className="text-right space-y-2 border-l-2 border-[#1D4477]/10 pl-8">
           <p className="text-[10px] font-black uppercase tracking-widest text-[#1D4477]/60 leading-none">EMPOWERING STUDENTS.</p>
           <p className="text-[10px] font-black uppercase tracking-widest text-[#1D4477]/60 leading-none">ELEVATING POTENTIAL.</p>
           <div className="flex justify-end pt-2">
              <svg viewBox="0 0 100 20" className="w-24 h-4 text-[#7ABA78]">
                <path d="M10 10 L45 10 M55 10 L90 10" stroke="currentColor" strokeWidth="1" />
                <path d="M50 10 L54 6 L50 2 L46 6 Z" fill="none" stroke="currentColor" />
              </svg>
           </div>
        </div>
      </div>

      {/* OFFICIAL TRANSCRIPT TITLE */}
      <div className="text-center mb-16 relative">
         <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
           <GraduationCap size={200} />
         </div>
         <div className="flex items-center justify-center gap-8 mb-2">
            <div className="h-px flex-1 bg-[#1D4477]/30" />
            <h2 className="text-5xl font-black text-[#1D4477] uppercase tracking-[0.2em]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Official Transcript
            </h2>
            <div className="h-px flex-1 bg-[#1D4477]/30" />
         </div>
         <div className="flex justify-center">
            <svg viewBox="0 0 200 4" className="w-48 text-[#7ABA78]">
               <path d="M0 2 L200 2" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 2" />
            </svg>
         </div>
      </div>

      {/* STUDENT IDENTITY GRID */}
      <div className="grid grid-cols-2 gap-8 mb-16">
        {[
          { label: 'STUDENT NAME', value: student?.full_name || 'STUDENT NAME', icon: <User size={16} /> },
          { label: 'CLASS', value: student?.class?.name || 'Class Name', icon: <GraduationCap size={16} /> },
          { label: 'ADMISSION NUMBER', value: student?.admission_number || 'N/A', icon: <FileText size={16} className="rotate-90" /> },
          { label: 'CURRICULUM', value: student?.curriculum?.name || 'Curriculum', icon: <Layers size={16} /> },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-4 bg-white/50 border border-[#1D4477]/5 px-6 py-4 rounded-2xl shadow-sm">
            <NavyIcon>{item.icon}</NavyIcon>
            <div className="flex-1">
              <p className="text-[10px] font-black text-[#1D4477]/40 uppercase tracking-widest mb-1">{item.label}</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-sm font-black text-[#1D4477]">:</span>
                 <p className="text-base font-black text-[#1D4477] uppercase tracking-tight">{item.value}</p>
              </div>
              <div className="mt-1 h-px w-full bg-[#1D4477]/10" />
            </div>
          </div>
        ))}
      </div>

      {/* SUBJECT TABLE */}
      <div className="mb-16 border-2 border-[#1D4477] rounded-3xl overflow-hidden shadow-xl bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1D4477] text-white text-[11px] font-black uppercase tracking-widest">
              <th className="px-8 py-5 border-r border-white/10 uppercase italic">Subject</th>
              <th className="px-8 py-5 border-r border-white/10 text-center w-36 uppercase italic">Marks</th>
              <th className="px-8 py-5 border-r border-white/10 text-center w-32 uppercase italic">Grade</th>
              <th className="px-8 py-5 text-center uppercase italic">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1D4477]/5">
            {transcript.subject_results.map((res: any, i: any) => (
              <tr key={i} className={i % 2 === 1 ? 'bg-[#FDFBF7]' : 'bg-white'}>
                <td className="px-8 py-4 border-r border-[#1D4477]/5">
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black text-[#7ABA78] tabular-nums">{(i+1).toString().padStart(2, '0')}</span>
                     <span className="font-bold text-sm text-[#1D4477] uppercase">{res.subject_name}</span>
                  </div>
                </td>
                <td className="px-8 py-4 border-r border-[#1D4477]/5 text-center font-black text-[#1D4477]/60 text-base">{res.marks}</td>
                <td className="px-8 py-4 border-r border-[#1D4477]/5 text-center font-black text-[#1D4477] text-base">{res.grade}</td>
                <td className="px-8 py-4 text-[#1D4477] font-bold italic text-[11px]">
                  {res.remark || '-'}
                </td>
              </tr>
            ))}
            {/* Fill empty rows for consistent height if needed */}
            {[...Array(Math.max(0, 10 - transcript.subject_results.length))].map((_, i) => (
              <tr key={`empty-${i}`} className={(i + transcript.subject_results.length) % 2 === 1 ? 'bg-[#FDFBF7]' : 'bg-white'}>
                <td className="px-8 py-4 border-r border-[#1D4477]/5 h-[53px]"></td>
                <td className="px-8 py-4 border-r border-[#1D4477]/5"></td>
                <td className="px-8 py-4 border-r border-[#1D4477]/5"></td>
                <td className="px-8 py-4"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* OVERALL GRADE SECTION */}
      <div className="flex gap-8 mb-16">
        <div className="w-56 h-36 bg-[#1D4477] rounded-[2rem] flex flex-col items-center justify-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl translate-x-1/2 -translate-y-1/2" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-2 text-[#7ABA78]">OVERALL GRADE</p>
          <div className="flex items-center gap-1">
             <div className="h-0.5 w-6 bg-[#7ABA78]" />
             <span className="text-5xl font-black leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>{transcript.overall_grade}</span>
             <div className="h-0.5 w-6 bg-[#7ABA78]" />
          </div>
        </div>

        <div className="flex-1 bg-white border-2 border-[#7ABA78]/30 rounded-[2rem] p-6 flex flex-col items-center justify-center relative shadow-lg">
           <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20">
              <svg viewBox="0 0 100 100" className="w-16 h-16 text-[#7ABA78]">
                <path d="M50 20 L60 40 L85 45 L65 65 L70 90 L50 75 L30 90 L35 65 L15 45 L40 40 Z" fill="currentColor" />
              </svg>
           </div>
           {/* Laurel Wreath */}
           <div className="w-full flex justify-center items-center gap-12 text-[#7ABA78]">
              <div className="flex flex-col gap-1 items-end">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-0.5 bg-[#7ABA78]" style={{ width: `${10 + (i*8)}px` }} />
                ))}
              </div>
              <div className="w-24 h-24 rounded-full border-4 border-double border-[#7ABA78] flex items-center justify-center">
                 <Star size={40} className="fill-[#7ABA78]" />
              </div>
              <div className="flex flex-col gap-1 items-start">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-0.5 bg-[#7ABA78]" style={{ width: `${10 + (i*8)}px` }} />
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* DIRECTOR'S REMARKS */}
      <div className="mb-16">
         <div className="flex justify-center mb-6">
            <div className="bg-[#1D4477] px-8 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl border border-[#7ABA78]/50">
              Director's Remarks
            </div>
         </div>
         <div className="relative p-10 bg-[#F9FBFF] border-2 border-[#1D4477]/20 rounded-[3rem] shadow-[inset_0_4px_12px_rgba(29,68,119,0.05)]">
            {/* Background lines like a notebook */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between opacity-[0.05] pointer-events-none">
               {[...Array(6)].map((_, i) => (
                 <div key={i} className="h-px w-full bg-[#1D4477]" />
               ))}
            </div>
            <p className="relative z-10 text-[#1D4477] font-bold text-center italic text-xl leading-relaxed font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              &quot;{transcript.remarks || 'Excellent academic standing maintained throughout the focused tuition period. Continued dedication will lead to exceptional results in the final examinations.'}&quot;
            </p>
         </div>
      </div>

      {/* FOOTER / SIGNATURES */}
      <div className="flex justify-between items-end px-4">
        {showSignature && (
          <div className="flex-1 space-y-4">
            <div className="h-20 flex items-end justify-center border-b-2 border-[#1D4477]">
               {sigData ? (
                  sigType === 'type' ? (
                    <span 
                      className="text-4xl font-bold text-[#1D4477] mb-2 lowercase"
                      style={{ fontFamily: sigFont }}
                    >
                      {sigData}
                    </span>
                  ) : (
                    <img 
                      src={sigData}
                      crossOrigin="anonymous"
                      alt="Sign" 
                      className="max-h-16 object-contain brightness-50" 
                      onLoad={() => setReadyStates(prev => ({ ...prev, sig: true }))}
                      onError={() => setReadyStates(prev => ({ ...prev, sig: true }))}
                    />
                  )
               ) : (
                 <span className="text-4xl font-bold text-[#1D4477] opacity-60 mb-2 italic" style={{ fontFamily: "'Dancing Script', cursive" }}>PeakOfficial</span>
               )}
            </div>
            <div className="flex flex-col items-center">
               <p className="text-[11px] font-black text-[#1D4477] uppercase tracking-widest">
                 {directorName}
               </p>
            </div>
          </div>
        )}

        <div className="mx-12 mb-6">
           <div className="w-0.5 h-16 bg-[#7ABA78]/30 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#7ABA78]" />
           </div>
        </div>

        <div className="flex-1 space-y-4">
           <div className="h-20 flex items-end justify-center border-b-2 border-[#1D4477] pb-2">
              <div className="flex items-center gap-3">
                 <Calendar size={18} className="text-[#7ABA78]" />
                 <span className="text-xl font-bold text-[#1D4477] tabular-nums">
                   {new Date(transcript.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                 </span>
              </div>
           </div>
           <div className="flex flex-col items-center">
              <p className="text-[11px] font-black text-[#1D4477] uppercase tracking-widest">Date</p>
           </div>
        </div>
      </div>

      {/* STRIVE ACHIEVE EXCEL */}
      <div className="mt-16 flex items-center justify-center gap-8">
         <div className="w-1.5 h-1.5 rounded-full bg-[#7ABA78]" />
         <p className="text-xs font-black text-[#1D4477] tracking-[0.8em] uppercase">Strive· Achieve· Excel·</p>
         <div className="w-1.5 h-1.5 rounded-full bg-[#7ABA78]" />
      </div>

      {/* Branding Snapshot info */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-1 opacity-[0.03] select-none pointer-events-none">
         {[...Array(20)].map((_, i) => (
           <span key={i} className="text-[8px] font-black whitespace-nowrap">PEAK PERFORMANCE TUTORING • VERIFIED OFFICIAL RECORD</span>
         ))}
      </div>
    </div>
  )
}
