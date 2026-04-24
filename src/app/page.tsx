'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  GraduationCap, Users, UserCheck,
  ChevronRight, Shield, CheckCircle,
  Sparkles, Globe, ArrowUpRight, DollarSign,
  BookOpen, Calculator, Atom, Microscope, Languages, History as HistoryIcon,
  ChevronLeft, LayoutGrid, Info, Image as ImageIcon, MapPin
} from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'
import { InstallPWAButton } from '@/components/InstallPWAButton'

const GALLERY_IMAGES = [
  "/media__1776583920902.jpg",
  "/media__1776583980277.jpg",
  "/media__1776584038977.jpg",
  "/media__1776865914262.png",
  "/media__1776866448074.jpg",
  "/media__1776866580234.png",
  "/media__1776870071958.png",
  "/media__1776887573372.png",
  "/media__1776963140035.jpg",
  "/media__1776963140037.jpg",
  "/media__1776963140335.jpg",
  "/media__1776963140480.jpg",
  "/media__1776963140564.jpg",
  "/media__1776964680100.jpg",
  "/media__1776964680146.jpg",
  "/media__1776964680232.jpg",
  "/media__1776964680278.jpg",
  "/media__1776964680330.jpg"
]

export default function LandingPage() {
  const [splashDone, setSplashDone] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const t1 = setTimeout(() => setSplashDone(true), 1500)
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ 
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      clearTimeout(t1)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <>
      <SplashScreen done={splashDone} />
      <AnimatePresence>
        {splashDone && (
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="min-h-screen flex flex-col relative overflow-hidden bg-[#0A0F1C]"
          >
            {/* Interactive Background */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
               <motion.div 
                 animate={{ x: mousePos.x, y: mousePos.y }}
                 transition={{ type: "spring", stiffness: 50, damping: 25 }}
                 className="absolute -top-[10%] left-[10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px]"
                 style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.4) 0%, transparent 70%)' }}
               />
               <motion.div 
                 animate={{ x: mousePos.x * -1, y: mousePos.y * -1 }}
                 transition={{ type: "spring", stiffness: 50, damping: 25 }}
                 className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] rounded-full opacity-10 blur-[150px]"
                 style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 70%)' }}
               />
               <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02] bg-[length:40px_40px]" />
            </div>

            <Navbar />
            
            {/* Hero Section */}
            <section className="relative z-10 pt-44 pb-24 px-6 max-w-7xl mx-auto w-full">
               <div className="text-center space-y-8 mb-24">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
                  >
                     <Sparkles size={14} className="text-emerald-400" />
                     <span className="text-xs font-black uppercase tracking-[0.2em] text-white/80">Established 2023 • Nairobi, Kenya</span>
                  </motion.div>
                  
                  <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.95] text-white">
                    Peak Performance <br/>
                    <span className="text-emerald-500 italic">Tutoring</span>
                  </h1>
                  
                  <p className="text-lg md:text-xl font-medium text-white/50 max-w-3xl mx-auto leading-relaxed">
                    Peak Performance Tutoring is a modern tutoring center in Kenya offering both <span className="text-white font-bold">KCSE and CBC</span> academic support. We help students excel through structured lessons, revision programs, and personalized learning across all key subjects.
                  </p>

                  <div className="pt-4 flex flex-wrap justify-center gap-4">
                     <button onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' })} className="px-10 py-5 rounded-3xl bg-emerald-500 text-white font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
                        Access Portals
                     </button>
                     <Link href="/about" className="px-10 py-5 rounded-3xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all active:scale-95">
                        Our Mission
                     </Link>
                  </div>
               </div>

               {/* Subjects Quick Grid */}
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-32">
                  {[
                    { name: 'Mathematics', icon: <Calculator size={20} />, color: 'text-blue-400' },
                    { name: 'English', icon: <Languages size={20} />, color: 'text-orange-400' },
                    { name: 'Kiswahili', icon: <Languages size={20} />, color: 'text-emerald-400' },
                    { name: 'Biology', icon: <Microscope size={20} />, color: 'text-rose-400' },
                    { name: 'Chemistry', icon: <Atom size={20} />, color: 'text-indigo-400' },
                    { name: 'Physics', icon: <Atom size={20} />, color: 'text-sky-400' },
                  ].map((subject, idx) => (
                    <div key={idx} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-4 hover:bg-white/10 transition-all group">
                       <div className={`${subject.color} group-hover:scale-110 transition-transform`}>
                         {subject.icon}
                       </div>
                       <span className="text-xs font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">{subject.name}</span>
                    </div>
                  ))}
               </div>
            </section>

            {/* Gallery (Slideshow Overlay style) */}
            <PhotoGallery />

            {/* Portal Navigation Section */}
            <section id="portals" className="relative z-10 py-32 px-6 bg-emerald-500/5">
              <div className="max-w-7xl mx-auto space-y-16">
                 <div className="text-center space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight">Institutional <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Portals</span></h2>
                    <p className="text-white/40 max-w-xl mx-auto text-sm">Select your gateway to access structured academic tracking, reports, and revision nodes.</p>
                 </div>
                 <PortalSection />
              </div>
            </section>

            {/* Final SEO Links Section */}
            <section className="py-24 px-6 border-t border-white/5 bg-[#080C16]">
               <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="space-y-4 text-center md:text-left">
                     <h3 className="text-2xl font-bold uppercase tracking-tight">Leading Tutoring in Kenya</h3>
                     <p className="text-white/40 text-sm max-w-md">Helping students across secondary school tuition programs and CBC levels in Nairobi and beyond.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6">
                     <Link href="/tuition-center-nairobi" className="text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2">
                        Nairobi Center <ArrowUpRight size={14} />
                     </Link>
                     <Link href="/kcse-and-cbc-tutoring-kenya" className="text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2">
                        KCSE & CBC Support <ArrowUpRight size={14} />
                     </Link>
                     <Link href="/about" className="text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2">
                        About Us <ArrowUpRight size={14} />
                     </Link>
                  </div>
               </div>
            </section>

            <Footer />
          </motion.main>
        )}
      </AnimatePresence>
    </>
  )
}

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-12 py-6 flex items-center justify-between bg-gradient-to-b from-[#0A0F1C]/80 to-transparent backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/20 group-hover:scale-105 transition-transform">
           <GraduationCap size={20} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-white text-sm tracking-[0.2em] uppercase">PEAK TUTORING</span>
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest opacity-60">Success Unlocked</span>
        </div>
      </Link>
      <div className="hidden lg:flex items-center gap-8">
         <Link href="/tuition-center-nairobi" className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2 transition-all">
           <MapPin size={12} className="text-emerald-400" /> Nairobi
         </Link>
         <Link href="/kcse-and-cbc-tutoring-kenya" className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2 transition-all">
           <BookOpen size={12} className="text-emerald-400" /> Programs
         </Link>
         <Link href="/about" className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2 transition-all">
           <Info size={12} className="text-emerald-400" /> About
         </Link>
      </div>
      <div className="flex items-center gap-4">
        <InstallPWAButton />
        <button onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' })} className="px-6 py-2.5 rounded-full bg-white text-[#0A0F1C] font-black uppercase tracking-widest text-[9px] hover:bg-emerald-400 hover:text-white transition-all shadow-xl active:scale-95">
           Logan Portals
        </button>
      </div>
    </nav>
  )
}

function PhotoGallery() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % GALLERY_IMAGES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative z-10 py-12 mb-32 group">
       <div className="max-w-[1400px] mx-auto px-6">
          <div className="relative aspect-[21/9] md:aspect-[3/1] rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
             <AnimatePresence mode="wait">
               <motion.img
                 key={index}
                 src={GALLERY_IMAGES[index]}
                 initial={{ opacity: 0, scale: 1.1 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ duration: 1.5, ease: "easeInOut" }}
                 className="absolute inset-0 w-full h-full object-cover"
               />
             </AnimatePresence>
             <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-transparent to-transparent opacity-80" />
             
             {/* Text Overlay */}
             <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row items-end justify-between gap-8">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-emerald-400 mb-4">
                      <ImageIcon size={18} />
                      <span className="text-xs font-black uppercase tracking-[0.3em]">Learning Sanctuary</span>
                   </div>
                   <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter max-w-xl text-white">Our Modern Classes in Kenya</h3>
                   <p className="text-white/60 max-w-md text-sm">Experience structured learning environments tailored for KCSE excellence and CBC growth.</p>
                </div>
                
                {/* Dots */}
                <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md px-6 py-4 rounded-full border border-white/5">
                   {GALLERY_IMAGES.map((_, i) => (
                     <button
                       key={i}
                       onClick={() => setIndex(i)}
                       className={`w-2 h-2 rounded-full transition-all ${index === i ? 'bg-emerald-500 w-8' : 'bg-white/20 hover:bg-white/40'}`}
                     />
                   ))}
                </div>
             </div>

             {/* Arrows */}
             <div className="absolute inset-y-0 left-6 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setIndex((index - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length)} className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10">
                   <ChevronLeft size={24} />
                </button>
             </div>
             <div className="absolute inset-y-0 right-6 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setIndex((index + 1) % GALLERY_IMAGES.length)} className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10">
                   <ChevronRight size={24} />
                </button>
             </div>
          </div>
       </div>
    </section>
  )
}

function PortalSection() {
  const portals = [
    {
      role: 'student',
      label: 'Student',
      icon: <GraduationCap size={36} strokeWidth={1.5} />,
      desc: 'Access KCSE revision, CBC assignments, and track your performance in real-time.',
      gradient: 'from-emerald-400 to-teal-600',
      glow: 'shadow-emerald-500/20',
      border: 'border-emerald-500/30',
      features: ['Assignments', 'Live Transcripts', 'Revision Nodes'],
      delay: 0.1
    },
    {
       role: 'parent',
       label: 'Parent',
       icon: <Users size={36} strokeWidth={1.5} />,
       desc: "Monitor child's focus telemetry, academic transcripts, and secure billing portals.",
       gradient: 'from-amber-400 to-orange-600',
       glow: 'shadow-orange-500/20',
       border: 'border-orange-500/30',
       features: ['Live Tracking', 'Official Reports', 'Payment History'],
       delay: 0.2
     },
     {
       role: 'teacher',
       label: 'Teacher',
       icon: <UserCheck size={36} strokeWidth={1.5} />,
       desc: 'Manage classrooms, grade KCSE exams, and curate specialized CBC practice banks.',
       gradient: 'from-sky-400 to-blue-600',
       glow: 'shadow-blue-500/20',
       border: 'border-blue-500/30',
       features: ['Grading Engine', 'Practice Bank', 'Curriculum Hub'],
       delay: 0.3
     },
     {
       role: 'admin',
       label: 'Admin',
       icon: <Shield size={36} strokeWidth={1.5} />,
       desc: 'System oversight. Center management, verification, and institutional configurations.',
       gradient: 'from-violet-400 to-fuchsia-600',
       glow: 'shadow-violet-500/20',
       border: 'border-violet-500/30',
       features: ['Total Analytics', 'Staff Verify', 'System Config'],
       delay: 0.4
     },
     {
       role: 'finance',
       label: 'Finance',
       icon: <DollarSign size={36} strokeWidth={1.5} />,
       desc: 'Financial command center. Weekly reports, ledgers, and institutional balance sheets.',
       gradient: 'from-amber-400 to-yellow-600',
       glow: 'shadow-amber-500/20',
       border: 'border-amber-500/30',
       features: ['Weekly Stats', 'Ledgers', 'PDF Reporting'],
       delay: 0.5
     },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {portals.map((p) => (
        <Link href={`/auth/login?role=${p.role}`} key={p.role} className="block group group outline-none">
           <motion.div
             initial={{ opacity: 0, y: 30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: p.delay }}
             className={`relative h-full p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:bg-white/10 hover:${p.border} ${p.glow} hover:shadow-2xl`}
           >
              <div className={`absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br ${p.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-10 opacity-0 group-hover:opacity-20 transition-opacity duration-700`} />
              
              <div className="relative z-10 flex-1 flex flex-col h-full">
                 <div className="flex justify-between items-start mb-8">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white bg-gradient-to-br ${p.gradient} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-500`}>
                       {p.icon}
                    </div>
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:text-white group-hover:border-white/30 group-hover:bg-white/5 transition-all">
                       <ArrowUpRight size={18} />
                    </div>
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-tight text-white mb-3">{p.label} Portal</h3>
                 <p className="text-xs text-white/50 leading-relaxed mb-8 flex-1 font-medium">{p.desc}</p>
                 <div className="space-y-3 pt-6 border-t border-white/10">
                    {p.features.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                         <span>{f}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </motion.div>
        </Link>
      ))}
    </div>
  )
}

function Footer() {
  return (
    <footer className="relative z-10 py-16 px-6 mt-12 w-full border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
         <div className="space-y-4 text-center md:text-left">
            <div className="font-black text-xl text-white tracking-widest uppercase">PEAK PERFORMANCE</div>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.4em]">Strive · Achieve · Excel</p>
         </div>
         <div className="flex flex-wrap justify-center gap-12">
            <div className="space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Quick Links</h4>
               <div className="flex flex-col gap-3">
                  <Link href="/about" className="text-xs text-white/40 hover:text-white transition-colors">About Us</Link>
                  <Link href="/tuition-center-nairobi" className="text-xs text-white/40 hover:text-white transition-colors">Contact Central</Link>
                  <Link href="/auth/login?role=student" className="text-xs text-white/40 hover:text-white transition-colors">Student Entry</Link>
               </div>
            </div>
            <div className="space-y-6 text-center md:text-right">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Copyright</h4>
               <p className="text-xs text-white/20 font-black tracking-widest uppercase truncate max-w-[200px]">
                  © {new Date().getFullYear()} PEAK PERFORMANCE TUTORING KENYA. ALL RIGHTS RESERVED.
               </p>
            </div>
         </div>
      </div>
    </footer>
  )
}
