'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion'
import Link from 'next/link'
import {
  GraduationCap, Users, UserCheck, ChevronRight, Shield, CheckCircle,
  Sparkles, ArrowUpRight, DollarSign, BookOpen, Calculator, Atom,
  Microscope, Languages, Info, Image as ImageIcon, MapPin, Zap, Award, 
  LayoutGrid, Heart, Beaker, Binary, Globe, MousePointer2, ExternalLink,
  Target, TrendingUp, BarChart3, Clock, Lock, ArrowRight, Activity
} from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'
import { PremiumCarousel } from '@/components/ui/PremiumCarousel'

const GALLERY_IMAGES = [
  "/media__1776963140035.jpg",
  "/media__1776963140037.jpg",
  "/media__1776963140335.jpg",
  "/media__1776963140480.jpg",
  "/media__1776963140564.jpg",
  "/media__1776964680100.jpg",
  "/media__1776964680146.jpg",
  "/media__1776964680232.jpg",
  "/media__1776964680278.jpg",
  "/media__1776964680330.jpg",
]

const SUBJECTS_844 = [
  { name: 'MATHEMATICS', icon: <Calculator size={22} />, color: 'from-slate-700 to-slate-900', desc: 'KCSE Mastery' },
  { name: 'ENGLISH', icon: <Languages size={22} />, color: 'from-slate-700 to-slate-900', desc: 'Linguistic Arts' },
  { name: 'KISWAHILI', icon: <Languages size={22} />, color: 'from-slate-700 to-slate-900', desc: 'National Dialect' },
  { name: 'BIOLOGY', icon: <Microscope size={22} />, color: 'from-slate-700 to-slate-900', desc: 'Life Sciences' },
  { name: 'CHEMISTRY', icon: <Atom size={22} />, color: 'from-slate-700 to-slate-900', desc: 'Molecular Logic' },
  { name: 'PHYSICS', icon: <Zap size={22} />, color: 'from-slate-700 to-slate-900', desc: 'Universal Laws' },
]

const SUBJECTS_CBC = [
  { name: 'CORE MATH', icon: <Calculator size={22} />, color: 'from-slate-700 to-slate-900', desc: 'STEM logic' },
  { name: 'ENGLISH', icon: <Languages size={22} />, color: 'from-slate-700 to-slate-900', desc: 'Literacy Strands' },
  { name: 'KISWAHILI', icon: <Languages size={22} />, color: 'from-slate-700 to-slate-900', desc: 'Lugha Teule' },
  { name: 'CHEMISTRY', icon: <Atom size={22} />, color: 'from-slate-700 to-slate-900', desc: 'STEM Practical' },
  { name: 'BIOLOGY', icon: <Microscope size={22} />, color: 'from-slate-700 to-slate-900', desc: 'STEM Systems' },
  { name: 'CSL', icon: <Heart size={22} />, color: 'from-slate-700 to-slate-900', desc: 'Community Service' },
]

export default function LandingPage() {
  const [splashDone, setSplashDone] = useState(false)
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const smoothY = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })
  const backgroundOpacity = useTransform(smoothY, [0, 0.2], [0.4, 0.1])

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <SplashScreen done={splashDone} />
      <AnimatePresence>
        {splashDone && (
          <motion.main ref={containerRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}
            className="relative min-h-screen bg-[#05070A] text-white overflow-hidden selection:bg-emerald-500/30">

            {/* Premium Ambient Background */}
            <div className="fixed inset-0 z-0">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#0c1220_0%,#05070a_100%)]" />
               <motion.div style={{ opacity: backgroundOpacity }}
                  className="absolute top-0 right-0 w-[80%] h-[80%] rounded-full bg-emerald-500/5 blur-[160px]" />
            </div>

            <Navbar />

            {/* ── HERO ── */}
            <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-20">
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}
                className="px-5 py-1.5 rounded-full border border-white/5 bg-white/[0.03] backdrop-blur-3xl mb-12 cursor-default">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-500">Peak Performance Tutoring</span>
              </motion.div>

              <div className="relative max-w-7xl mx-auto text-center space-y-12">
                <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="text-6xl md:text-[10rem] font-black tracking-tight leading-[0.9] uppercase">
                  Strive. Achieve.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40 italic">Excel.</span>
                </motion.h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }}
                  className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed">
                  Nairobi's premier educational ecosystem for <span className="text-white">KCSE Secondary</span> and <span className="text-emerald-500">CBC STEM Scholars</span>.
                </motion.p>
              </div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1, duration: 0.8 }}
                className="mt-20 flex flex-col sm:flex-row gap-8 justify-center w-full px-6">
                <button onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-14 py-6 rounded-2xl bg-white text-black font-bold uppercase tracking-widest text-[11px] hover:bg-emerald-500 hover:text-white transition-all shadow-2xl">
                  Access Portal Hub
                </button>
                <Link href="/about"
                  className="px-14 py-6 rounded-2xl bg-white/5 border border-white/10 font-bold uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all backdrop-blur-3xl flex items-center gap-3 group">
                  Our Mission <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </section>

            {/* ── PORTAL SECTION: ENRICHED ── */}
            <section id="portals" className="relative z-10 py-40 px-6 border-t border-white/5">
              <div className="max-w-7xl mx-auto">
                <div className="text-center space-y-6 mb-24">
                  <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tight text-white">
                    Tutoring <span className="text-emerald-500">Portals</span>
                  </h2>
                  <p className="text-slate-500 max-w-xl mx-auto text-lg font-medium leading-relaxed">
                    A centralized, secure digital ecosystem designed to streamline the academic journey for scholars, parents, and educators.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <PortalCard 
                    role="student" 
                    label="Scholar" 
                    icon={<GraduationCap size={32} />} 
                    desc="Academic Command Center" 
                    features={['Assignment Hub', 'Performance Analytics', 'Digital Library', 'Exam Schedule']}
                  />
                  <PortalCard 
                    role="parent" 
                    label="Parent" 
                    icon={<Users size={32} />} 
                    desc="Monitoring & Oversight" 
                    features={['Real-time Progress', 'Billing & Finance', 'Teacher Insights', 'Activity Logs']}
                  />
                  <PortalCard 
                    role="teacher" 
                    label="Teacher" 
                    icon={<UserCheck size={32} />} 
                    desc="Instructional Hub" 
                    features={['Class Management', 'Marking Systems', 'Student Intervention', 'Attendance']}
                  />
                  <PortalCard 
                    role="admin" 
                    label="Staff" 
                    icon={<Shield size={32} />} 
                    desc="Institutional Control" 
                    features={['Center Operations', 'Credentialing', 'Curriculum Config', 'Global Metrics']}
                  />
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="mt-20 p-12 rounded-[3rem] bg-white/[0.01] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-3xl">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Lock size={28} /></div>
                      <div>
                        <h4 className="text-xl font-black uppercase tracking-tight">Enterprise Security</h4>
                        <p className="text-slate-500 text-sm font-medium">End-to-end encrypted data handling and secure user authentication.</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="flex -space-x-3">
                         {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-[#05070A]" />)}
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active ecosystem members</span>
                   </div>
                </motion.div>
              </div>
            </section>

            {/* ── ENTITIES ── */}
            <section className="relative z-10 py-40 px-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="relative p-16 rounded-[3rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('/media__1776963140480.jpg')] bg-cover bg-center opacity-10 grayscale group-hover:opacity-20 transition-opacity duration-1000" />
                  <div className="relative z-10 space-y-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white"><Award size={32} /></div>
                    <h3 className="text-4xl font-black uppercase tracking-tight">Peak Performance<br />Tutoring</h3>
                    <p className="text-slate-400 text-lg leading-relaxed font-medium">Academic mastery for KCSE and CBC pathways. Rigorous, result-oriented, and personalized.</p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="relative p-16 rounded-[3rem] bg-white/[0.01] border border-white/5 overflow-hidden flex flex-col justify-between">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><TrendingUp size={32} /></div>
                       <span className="px-4 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest border border-blue-500/20">Coming 2026</span>
                    </div>
                    <h3 className="text-4xl font-black uppercase tracking-tight">Peak Skills<br />Academy</h3>
                    <p className="text-slate-500 text-lg leading-relaxed font-medium">A distinct innovation hub for future-ready skills: AI, Robotics, and Digital Literacy.</p>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* ── SUBJECT MATRICES ── */}
            <section className="relative z-10 py-40 bg-[#07090C]">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
                  <div>
                    <div className="space-y-6 mb-16">
                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-[0.4em]">Secondary Pathway</span>
                      <h3 className="text-5xl font-black uppercase tracking-tight text-white">8-4-4 Core</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {SUBJECTS_844.map((s, i) => <SubjectCard key={i} {...s} />)}
                    </div>
                  </div>
                  <div>
                    <div className="space-y-6 mb-16">
                      <span className="text-xs font-bold text-blue-500 uppercase tracking-[0.4em]">STEM Stream</span>
                      <h3 className="text-5xl font-black uppercase tracking-tight text-white">CBC Matrix</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {SUBJECTS_CBC.map((s, i) => <SubjectCard key={i} {...s} />)}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── GALLERY ── */}
            <section className="relative z-10 py-48 px-6 max-w-7xl mx-auto">
               <PremiumCarousel images={GALLERY_IMAGES} />
            </section>

            {/* ── FOOTER ── */}
            <footer className="relative z-10 py-32 px-10 border-t border-white/5 bg-[#030507]">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-20">
                <div className="space-y-8">
                  <div className="font-black text-3xl text-white tracking-tighter uppercase">PEAK CAMPUS</div>
                  <p className="text-slate-500 max-w-xs font-medium">The leading academic development ecosystem in Nairobi.</p>
                </div>
                <div className="flex gap-20">
                  <FooterCol title="Navigation" links={['/about', '/kcse-and-cbc-tutoring-kenya', '/tuition-center-nairobi']} />
                  <FooterCol title="Contact" links={['Main Campus, Nairobi', 'info@peakcampus.ke']} />
                </div>
              </div>
              <div className="max-w-7xl mx-auto pt-20 mt-20 border-t border-white/5 flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">
                 <p>© {new Date().getFullYear()} PEAK PERFORMANCE TUTORING</p>
                 <div className="flex gap-8"><Globe size={14} /> <Shield size={14} /></div>
              </div>
            </footer>

          </motion.main>
        )}
      </AnimatePresence>
    </>
  )
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-8 lg:px-20 py-10 flex items-center justify-between transition-all duration-700 ${scrolled ? 'bg-[#05070A]/90 backdrop-blur-xl py-6 border-b border-white/5' : 'bg-transparent'}`}>
      <Link href="/" className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-black shadow-2xl">
          <GraduationCap size={24} />
        </div>
        <div className="hidden sm:block">
          <div className="font-black text-white text-md tracking-tight uppercase leading-none">PEAK CAMPUS</div>
          <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Nairobi</div>
        </div>
      </Link>
      <div className="hidden lg:flex items-center gap-12">
        {['Programs', 'Mission', 'Center'].map((l, i) => (
          <Link key={i} href={l === 'Mission' ? '/about' : '/'} className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 hover:text-white transition-all">
            {l}
          </Link>
        ))}
      </div>
      <button onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' })}
        className="px-8 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all">
        Portal Hub
      </button>
    </nav>
  )
}

function PortalCard({ role, label, icon, desc, features }: { role: string, label: string, icon: React.ReactNode, desc: string, features: string[] }) {
  return (
    <Link href={`/auth/login?role=${role}`}>
      <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group flex flex-col h-full">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-black transition-all mb-8">
          {icon}
        </div>
        <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">{label} Portal</h3>
        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mb-8">{desc}</p>
        
        <div className="space-y-3 mb-10 flex-1">
          {features.map(f => (
            <div key={f} className="flex items-center gap-3 text-white/30 group-hover:text-white/60 transition-colors">
              <div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-emerald-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{f}</span>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-white/5 flex items-center justify-between text-[10px] font-black text-white/20 group-hover:text-white transition-colors uppercase tracking-widest">
           Access Portal <ArrowRight size={14} />
        </div>
      </div>
    </Link>
  )
}

function SubjectCard({ name, icon, desc }: { name: string, icon: React.ReactNode, desc: string }) {
  return (
    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center gap-6 group hover:bg-white/[0.04] transition-all">
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-sm font-black uppercase tracking-tight text-white">{name}</div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 group-hover:text-slate-400 transition-colors">{desc}</div>
      </div>
    </div>
  )
}

function FooterCol({ title, links }: { title: string, links: string[] }) {
  return (
    <div className="space-y-8">
      <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">{title}</h4>
      <div className="flex flex-col gap-4">
        {links.map(l => (
          <Link key={l} href={l.startsWith('/') ? l : '#'} className="text-sm font-bold text-slate-500 hover:text-white transition-colors">
            {l.replace('/', '')}
          </Link>
        ))}
      </div>
    </div>
  )
}
