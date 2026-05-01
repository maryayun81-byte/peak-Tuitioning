'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calculator, Atom, Microscope, Languages, 
  Beaker, Binary, Zap, Heart, Star, 
  CheckCircle2, ArrowRight, BookOpen, 
  Globe, LayoutGrid, Quote, GraduationCap
} from 'lucide-react'
import Link from 'next/link'

const PROGRAMS = {
  '844': {
    title: '8-4-4 High Achievement',
    subtitle: 'Pure KCSE Secondary Stream',
    color: 'emerald',
    description: 'Precision-led revision modules for Form 1 through Form 4, focusing on exam intelligence and subject mastery.',
    subjects: [
      { name: 'Mathematics', code: 'MATH', icon: <Calculator size={28} />, focus: ['Calculus', 'Trigonometry', 'Pure Logic'], intensity: 100 },
      { name: 'Physics', code: 'PHYC', icon: <Zap size={28} />, focus: ['Mechanics', 'Electronics', 'Modern Physics'], intensity: 95 },
      { name: 'Chemistry', code: 'CHEM', icon: <Beaker size={28} />, focus: ['Organic Chem', 'Stoichiometry', 'Analysis'], intensity: 90 },
      { name: 'Biology', code: 'BIO', icon: <Microscope size={28} />, focus: ['Genetics', 'Evolution', 'Physiology'], intensity: 85 },
      { name: 'English', code: 'ENG', icon: <Languages size={28} />, focus: ['Analytical Literature', 'Grammar'], intensity: 80 },
      { name: 'Kiswahili', code: 'KISWA', icon: <Languages size={28} />, focus: ['Fasihi simulizi', 'Insha'], intensity: 80 },
    ]
  },
  'cbc': {
    title: 'CBC STEM Pathway',
    subtitle: 'Competency-Based Innovation',
    color: 'blue',
    description: 'Specialized support for the STEM track of the CBC curriculum, bridging practical skills with theoretical depth.',
    subjects: [
      { name: 'Core Mathematics', code: 'C-MATH', icon: <Calculator size={28} />, focus: ['Algorithmic Thinking', 'Data Science'], intensity: 100 },
      { name: 'Chemistry', code: 'CHEM', icon: <Atom size={28} />, focus: ['Industrial Apps', 'Chemical Systems'], intensity: 90 },
      { name: 'Biology', code: 'BIO', icon: <Microscope size={28} />, focus: ['Environmental Sci', 'Bio-Tech'], intensity: 85 },
      { name: 'English', code: 'ENG', icon: <Languages size={28} />, focus: ['Media Literacy', 'Critical Writing'], intensity: 80 },
      { name: 'Kiswahili', code: 'KISWA', icon: <Languages size={28} />, focus: ['Lugha na Mawasiliano'], intensity: 80 },
      { name: 'Community Service', code: 'CSL', icon: <Globe size={28} />, focus: ['Social Innovation', 'Leadership'], intensity: 75 },
    ]
  }
}

export default function ProgramsPage() {
  const [activeStream, setActiveStream] = useState<'844' | 'cbc'>('844')

  return (
    <main className="relative min-h-screen bg-[#03050C] text-white overflow-hidden selection:bg-emerald-500/30">
      {/* Background Dynamics */}
      <div className="fixed inset-0 z-0">
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,${activeStream === '844' ? '#0a1a14' : '#0a141a'} 0%,#03050c 100%)] transition-colors duration-1000`} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-50 px-8 lg:px-16 py-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-2xl group-hover:rotate-12 transition-transform">
             <LayoutGrid size={20} />
          </div>
          <span className="font-black uppercase tracking-widest text-[10px]">Ecosystem Hub</span>
        </Link>
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-3xl">
          {(['844', 'cbc'] as const).map(s => (
            <button key={s} onClick={() => setActiveStream(s)}
              className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStream === s ? 'bg-white text-[#03050C] shadow-2xl' : 'text-white/40 hover:text-white'}`}>
              {s} Stream
            </button>
          ))}
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-16 pb-24 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
           <AnimatePresence mode="wait">
             <motion.div key={activeStream} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6 }}
               className="space-y-6">
                <span className={`px-4 py-1.5 rounded-full border ${activeStream === '844' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' : 'border-blue-500/20 text-blue-500 bg-blue-500/5'} text-[10px] font-black uppercase tracking-[0.4em]`}>
                   {PROGRAMS[activeStream].subtitle}
                </span>
                <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.9]">
                  {activeStream === '844' ? 'Academic' : 'Innovation'}<br />
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${activeStream === '844' ? 'from-emerald-400 to-teal-600' : 'from-blue-400 to-indigo-600'} italic`}>Matrices.</span>
                </h1>
                <p className="text-xl md:text-2xl text-white/40 max-w-2xl font-medium leading-relaxed">
                  {PROGRAMS[activeStream].description}
                </p>
             </motion.div>
           </AnimatePresence>
        </div>
      </section>

      {/* ── SUBJECT GRID ── */}
      <section className="relative z-10 py-12 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             <AnimatePresence mode="popLayout">
                {PROGRAMS[activeStream].subjects.map((s, i) => (
                  <motion.div key={`${activeStream}-${s.code}`} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, duration: 0.5 }}
                    className="group relative p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 overflow-hidden hover:bg-white/[0.05] hover:border-white/10 transition-all shadow-2xl">
                    <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity ${activeStream === '844' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    
                    <div className="relative z-10 space-y-8">
                       <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${activeStream === '844' ? 'from-emerald-500 to-teal-600 shadow-emerald-500/20' : 'from-blue-500 to-indigo-600 shadow-blue-500/20'} shadow-2xl group-hover:rotate-6 transition-transform`}>
                          {s.icon}
                       </div>
                       
                       <div className="space-y-2">
                          <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{s.name}</h3>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">{s.code} • Core Module</p>
                       </div>

                       <div className="space-y-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-white/40 flex justify-between">
                             <span>Focus Areas</span>
                             <span>Intensity {s.intensity}%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                             {s.focus.map((f, idx) => (
                               <span key={idx} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-white/60 group-hover:text-white transition-colors">{f}</span>
                             ))}
                          </div>
                       </div>

                       <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                          <div className="flex gap-1">
                             {[1,2,3,4,5].map(star => (
                               <Star key={star} size={10} className={star <= 4 ? (activeStream === '844' ? 'fill-emerald-500 text-emerald-500' : 'fill-blue-500 text-blue-500') : 'text-white/10'} />
                             ))}
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover:text-white transition-colors">Advanced Tier</span>
                       </div>
                    </div>
                  </motion.div>
                ))}
             </AnimatePresence>
           </div>
        </div>
      </section>

      {/* ── METHODOLOGY BREAKDOWN ── */}
      <section className="relative z-10 py-32 px-6 border-y border-white/5 bg-white/[0.01]">
         <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
            <div className="space-y-12">
               <div className="space-y-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.6em] text-emerald-500">The Methodology</span>
                  <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">Beyond the <span className="text-white/20 italic">Classroom.</span></h2>
                  <p className="text-xl text-white/40 font-medium leading-relaxed">We employ a three-tier delivery model designed for long-term retention and exam dominance.</p>
               </div>
               
               <div className="space-y-10">
                  {[
                    { t: 'Intensive Concept Labs', d: 'Breakdown of complex STEM theories into visual, manageable modules.', icon: <Beaker size={24} className="text-emerald-400" /> },
                    { t: 'Exam Intelligence', d: 'Strategic training on paper interpretation, time management, and marking scheme logic.', icon: <CheckCircle2 size={24} className="text-blue-400" /> },
                    { t: 'Performance Feedback', d: 'Weekly digital transcripts for parents and students to monitor trajectory.', icon: <ArrowRight size={24} className="text-purple-400" /> },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-8 group">
                       <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          {item.icon}
                       </div>
                       <div className="space-y-2">
                          <h4 className="text-xl font-black uppercase tracking-tighter">{item.t}</h4>
                          <p className="text-sm text-white/40 font-medium leading-relaxed">{item.d}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="relative">
               <div className="absolute inset-0 bg-emerald-500/10 blur-[150px] rounded-full" />
               <div className="relative p-12 rounded-[4rem] bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 backdrop-blur-3xl shadow-2xl space-y-12">
                  <div className="w-20 h-20 rounded-[2rem] bg-emerald-500 flex items-center justify-center text-white shadow-2xl">
                     <GraduationCap size={40} />
                  </div>
                  <blockquote className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-none text-white/90">
                    "Peak Performance is not just a tuition center; it is a refinery where potential is processed into mastery."
                  </blockquote>
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 rounded-2xl bg-emerald-500/20" />
                     <div>
                        <div className="text-lg font-black uppercase tracking-tighter">Academic Board</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">STEM Strategy Hub</div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* ── CALL TO ACTION ── */}
      <section className="relative z-10 py-48 px-6 text-center">
         <div className="max-w-4xl mx-auto space-y-16">
            <div className="space-y-8">
               <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">Ready to secure your <span className="text-emerald-500">A-Rank?</span></h2>
               <p className="text-xl text-white/30 font-medium">Limited slots available for the 2026 Academic Season. Secure your position today.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
               <Link href="/" className="px-16 py-8 rounded-[2rem] bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                  Join the Ecosystem
               </Link>
               <button onClick={() => window.history.back()} className="px-16 py-8 rounded-[2rem] bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all">
                  Go Back
               </button>
            </div>
         </div>
      </section>

      {/* Footer Minimal */}
      <footer className="relative z-10 py-20 px-10 border-t border-white/5 text-center">
         <p className="text-[10px] text-white/20 font-black tracking-[0.4em] uppercase">PEAK CAMPUS KENYA • STEM MATRICES • ALL RIGHTS RESERVED</p>
      </footer>
    </main>
  )
}
