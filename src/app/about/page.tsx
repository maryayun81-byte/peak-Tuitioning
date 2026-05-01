'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, Award, Users, BookOpen, ShieldCheck, 
  Sparkles, Zap, ChevronRight, ArrowUpRight, 
  MapPin, Clock, Heart, Globe, Quote, Microscope,
  Brain, Rocket, Lightbulb, CheckCircle2, Star,
  Shield, Laptop, Code, Cpu, GraduationCap,
  TrendingUp, BarChart3, PenTool, CheckCircle,
  Activity, UserCheck
} from 'lucide-react'
import Link from 'next/link'

type MissionTab = 'campus' | 'performance' | 'academy'

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<MissionTab>('campus')

  return (
    <main className="relative min-h-screen bg-[#05070A] text-white overflow-hidden selection:bg-emerald-500/30">
      {/* Premium Ambient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#0c1220_0%,#05070a_100%)]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3" />
      </div>

      <nav className="relative z-50 px-8 lg:px-20 py-10 flex items-center justify-between border-b border-white/5 bg-[#05070A]/50 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-black shadow-2xl">
             <GraduationCap size={24} />
          </div>
          <div>
            <span className="block font-black uppercase tracking-tight text-lg leading-none">Peak Campus</span>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Institutional Profile</span>
          </div>
        </Link>
        <Link href="/" className="px-8 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all">
          Return Home
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-emerald-500 mb-8 inline-block">
               Our Professional Mission
            </span>
            <h1 className="text-5xl md:text-9xl font-black text-white tracking-tight leading-[0.85] mb-10 uppercase">
              Defined by<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40 italic">Mastery.</span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed">
              Academic success is not an accident; it is the result of structured guidance, disciplined effort, and clear vision.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── TAB SELECTOR ── */}
      <section className="relative z-10 py-12 px-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-3xl mb-24 shadow-2xl">
          <TabButton 
            active={activeTab === 'campus'} 
            onClick={() => setActiveTab('campus')}
            label="Peak Campus"
          />
          <TabButton 
            active={activeTab === 'performance'} 
            onClick={() => setActiveTab('performance')}
            label="Peak Performance Tutoring"
          />
          <TabButton 
            active={activeTab === 'academy'} 
            onClick={() => setActiveTab('academy')}
            label="Peak Skills Academy"
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'campus' && <CampusSection key="campus" />}
          {activeTab === 'performance' && <PerformanceSection key="performance" />}
          {activeTab === 'academy' && <AcademySection key="academy" />}
        </AnimatePresence>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 py-24 px-10 border-t border-white/5 bg-[#030507] text-center mt-32">
         <div className="max-w-4xl mx-auto space-y-12">
            <div className="font-black text-3xl text-white tracking-tighter uppercase">PEAK CAMPUS</div>
            <div className="pt-10 flex items-center justify-center gap-12 text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em] border-t border-white/5">
              <span>Nairobi, Kenya</span>
              <span>Est. 2020</span>
              <span>Performance First</span>
            </div>
         </div>
      </footer>
    </main>
  )
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
        active 
          ? 'bg-white text-black shadow-2xl' 
          : 'text-slate-500 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  )
}

function CampusSection() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-24"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
        <div className="space-y-10">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none">A Unified <span className="text-emerald-500">Eco-system.</span></h2>
          <p className="text-xl text-slate-400 leading-relaxed font-medium">
            At Peak Campus, our mission is to develop complete, future-ready individuals by transforming how students learn, grow, and prepare for life.
          </p>
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
               <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Our Unified Purpose</h4>
               <p className="text-sm text-slate-400 leading-relaxed font-medium">
                 Together, our pillars form a complete system where students Learn, Build, and Become confident, capable, and self-driven individuals.
               </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['Academic Mastery', 'Real-world Readiness', 'Practical Development', 'Personal Growth'].map(l => (
                <div key={l} className="flex items-center gap-4">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-square p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.04] transition-all">
            <BookOpen className="text-emerald-500" size={32} />
            <h4 className="font-black uppercase tracking-tight text-white/40 group-hover:text-white transition-colors">Learn</h4>
          </div>
          <div className="aspect-square p-10 rounded-[2.5rem] bg-emerald-500 text-white flex flex-col justify-between mt-12 shadow-2xl">
            <Zap size={32} />
            <h4 className="font-black uppercase tracking-tight">Build</h4>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PerformanceSection() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="space-y-32"
    >
      {/* Primary Mission */}
      <div className="text-center space-y-10 max-w-4xl mx-auto">
         <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tight leading-none">Redefining <span className="text-emerald-500 italic">Education.</span></h2>
         <div className="space-y-6">
           <p className="text-xl md:text-2xl text-slate-200 font-medium leading-relaxed">
             Our mission is to transform students into confident, high-performing, and self-driven learners by redefining how they understand and approach education.
           </p>
           <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-3xl mx-auto">
             We go beyond traditional tutoring—focusing not only on covering the syllabus, but on building deep understanding, critical thinking, and lasting academic confidence.
           </p>
         </div>
      </div>

      {/* What We Stand For */}
      <div className="space-y-16">
        <div className="flex items-center gap-8">
           <h3 className="text-2xl font-black uppercase tracking-tighter shrink-0 text-emerald-500">What We Stand For</h3>
           <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MissionValue 
            title="Clarity Over Cramming" 
            desc="We break down complex concepts in Mathematics, Sciences, and Languages into simple, understandable steps—ensuring students truly understand instead of memorizing."
            icon={<Brain />}
          />
          <MissionValue 
            title="Consistency Over Shortcuts" 
            desc="We believe real success comes from disciplined effort. Through structured programs, we help students build habits that lead to long-term success."
            icon={<Activity />}
          />
          <MissionValue 
            title="Confidence Through Mastery" 
            desc="Confidence is built. By helping students master topics step by step, we eliminate doubt and empower them to approach exams with certainty."
            icon={<ShieldCheck />}
          />
          <MissionValue 
            title="Personalized Learning" 
            desc="We identify individual strengths and weaknesses, then tailor our teaching methods to ensure each student reaches their full potential."
            icon={<UserCheck />}
          />
          <MissionValue 
            title="Results That Matter" 
            desc="From better grades to stronger problem-solving skills, our systems are designed to produce visible and consistent academic progress."
            icon={<BarChart3 />}
          />
        </div>
      </div>

      {/* How We Fulfill */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 space-y-12">
          <h3 className="text-3xl font-black uppercase tracking-tight">How We Fulfill Our Mission</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
            {[
              { label: 'Structured Learning Systems', desc: 'Clear lesson pathways that build understanding progressively.' },
              { label: 'Targeted Practice & Revision', desc: 'Exposure to different question types and exam patterns.' },
              { label: 'Performance Tracking', desc: 'Continuous assessment to monitor and improve progress.' },
              { label: 'Mentorship & Guidance', desc: 'Supporting students academically and mentally.' },
              { label: 'Exam Prep Strategies', desc: 'Teaching students how to think and solve effectively.' }
            ].map(v => (
              <div key={v.label} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-200">{v.label}</h4>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-4">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 p-12 rounded-[3rem] bg-white/[0.01] border border-white/5 space-y-10">
           <h3 className="text-3xl font-black uppercase tracking-tight text-emerald-500">Our Commitment</h3>
           <div className="space-y-6">
              {[
                'Feel supported, motivated, and understood',
                'Challenged to grow beyond their limits',
                'Develop discipline, focus, and resilience',
                'Gain the confidence to perform under pressure'
              ].map(c => (
                <div key={c} className="flex items-center gap-4 group">
                  <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                    <CheckCircle2 size={12} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-200 transition-colors">{c}</span>
                </div>
              ))}
           </div>
           <div className="pt-8 border-t border-white/5">
              <div className="text-[9px] font-black text-emerald-500/40 uppercase tracking-[0.5em] mb-4">Our Purpose</div>
              <p className="text-xl font-black uppercase tracking-tighter leading-tight italic text-white/80">
                To help every student reach their peak performance—and sustain it.
              </p>
           </div>
        </div>
      </div>
    </motion.div>
  )
}

function AcademySection() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="space-y-20"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-10">
           <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-tight">Future <span className="text-blue-500 italic">Workforce.</span></h2>
           <p className="text-xl text-slate-400 font-medium leading-relaxed">
             Equipping students with practical, real-world skills that go beyond the classroom. Preparing for a technology-driven world.
           </p>
           <div className="grid grid-cols-2 gap-8">
              {[
                { title: 'Independent Thinking', icon: <Lightbulb /> },
                { title: 'Income-Generating', icon: <TrendingUp /> },
                { title: 'Adaptability', icon: <Rocket /> },
                { title: 'Modern Tech', icon: <Laptop /> }
              ].map(s => (
                <div key={s.title} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">{s.icon}</div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.title}</span>
                </div>
              ))}
           </div>
        </div>
        <div className="p-16 rounded-[3rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 space-y-8">
          <h3 className="text-4xl font-black uppercase tracking-tight text-white">Our Skills Vision</h3>
          <ul className="space-y-6">
            {[
              'Hands-on applied learning',
              'Digital and creative media',
              'Professional skills training',
              'Robotics and AI orientation'
            ].map(l => (
              <li key={l} className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                <div className="w-1 h-1 rounded-full bg-blue-500" /> {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}

function MissionValue({ title, desc, icon }: { title: string, desc: string, icon: React.ReactNode }) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all space-y-6 group">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all shadow-xl">
         {icon}
      </div>
      <h4 className="text-xl font-black uppercase tracking-tight leading-none text-white">{title}</h4>
      <p className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors font-bold uppercase tracking-widest leading-relaxed">
        {desc}
      </p>
    </div>
  )
}

