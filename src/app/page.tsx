'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  GraduationCap, Users, UserCheck,
  ChevronRight, Shield, CheckCircle,
  Sparkles, Pointer, Globe, ArrowUpRight
} from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'
import { InstallPWAButton } from '@/components/InstallPWAButton'

export default function LandingPage() {
  const [splashDone, setSplashDone] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const t1 = setTimeout(() => setSplashDone(true), 2000)
    
    // Interactive background tracking
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
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="min-h-screen flex flex-col relative overflow-hidden bg-[#0A0F1C]"
          >
            {/* Premium Animated Background Layer */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent" />
               <motion.div 
                 animate={{ x: mousePos.x * 2, y: mousePos.y * 2 }}
                 transition={{ type: "spring", stiffness: 50, damping: 20 }}
                 className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full opacity-30 blur-[120px] mix-blend-screen"
                 style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.8) 0%, rgba(59,130,246,0) 70%)' }}
               />
               <motion.div 
                 animate={{ x: mousePos.x * -2, y: mousePos.y * -2 }}
                 transition={{ type: "spring", stiffness: 50, damping: 20 }}
                 className="absolute top-[10%] -right-[15%] w-[60%] h-[60%] rounded-full opacity-20 blur-[150px] mix-blend-screen"
                 style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.8) 0%, rgba(139,92,246,0) 70%)' }}
               />
               <motion.div 
                 animate={{ x: mousePos.x, y: mousePos.y }}
                 transition={{ type: "spring", stiffness: 30, damping: 10 }}
                 className="absolute -bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full opacity-20 blur-[100px] mix-blend-screen"
                 style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, rgba(5,150,105,0) 70%)' }}
               />
               {/* Grid overlay for texture */}
               <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] bg-[length:32px_32px]" />
            </div>

            <Navbar />
            
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center pt-32 pb-24 px-4 sm:px-6 w-full max-w-7xl mx-auto">
               
               {/* Hero Header */}
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ duration: 1, delay: 0.2, type: "spring" }}
                 className="text-center mb-16 space-y-6 relative"
               >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-px h-10 bg-gradient-to-t from-emerald-500 to-transparent opacity-50" />
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-xl"
                  >
                     <Sparkles size={14} className="text-emerald-400" />
                     <span className="text-xs font-black uppercase tracking-[0.2em] text-white/80">Next-Gen Education OS</span>
                  </motion.div>
                  
                  <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 leading-[1.1] pb-2">
                     Peak Performance <br/>
                     <span className="italic relative inline-block">
                        <span className="relative z-10">Tutoring</span>
                        <span className="absolute -bottom-2 left-0 right-0 h-4 bg-emerald-500/20 blur-lg -z-10" />
                     </span>
                  </h1>
                  
                  <p className="text-lg sm:text-xl font-medium text-white/50 max-w-2xl mx-auto leading-relaxed">
                     A unified, AI-powered command center designed to accelerate academic mastery. Select your portal identity below to access your highly-secure dashboard.
                  </p>
               </motion.div>

               <PortalSection />
            </div>

            <Footer />
          </motion.main>
        )}
      </AnimatePresence>
    </>
  )
}

function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 px-6 lg:px-12 py-5 flex items-center justify-between transition-all duration-500"
      style={{
        background: 'linear-gradient(to bottom, rgba(10,15,28,0.9), rgba(10,15,28,0))',
        backdropFilter: 'blur(10px)',
      }}
    >
      <motion.div 
        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }}
        className="flex items-center gap-4 group cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-2xl relative overflow-hidden bg-white/10 border border-white/20 backdrop-blur-md group-hover:scale-105 transition-transform">
           <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
           <GraduationCap size={20} className="text-white relative z-10" />
        </div>
        <span className="font-black text-white text-sm tracking-widest uppercase hidden sm:block drop-shadow-md">
          PEAK <span className="opacity-50">OS</span>
        </span>
      </motion.div>
      <motion.div 
        initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }}
        className="flex items-center gap-4"
      >
        <InstallPWAButton />
        <a href="https://peak-performance.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md">
           <Globe size={18} />
        </a>
      </motion.div>
    </nav>
  )
}

function PortalSection() {
  const portals = [
    {
      role: 'student',
      label: 'Student',
      icon: <GraduationCap size={36} strokeWidth={1.5} />,
      desc: 'Access your coursework, assignments, and track your interactive mastery roadmap.',
      gradient: 'from-emerald-400 to-teal-600',
      glow: 'shadow-emerald-500/20',
      border: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/5',
      features: ['Assignments', 'Live Transcripts', 'Gamified Journey'],
      delay: 0.6
    },
    {
      role: 'parent',
      label: 'Parent',
      icon: <Users size={36} strokeWidth={1.5} />,
      desc: "Monitor your child's real-time focus telemetry, verified transcripts, and secure billing.",
      gradient: 'from-amber-400 to-orange-600',
      glow: 'shadow-orange-500/20',
      border: 'border-orange-500/30',
      bgColor: 'bg-orange-500/5',
      features: ['Live Tracking', 'Certified Reports', 'Payment Ledger'],
      delay: 0.7
    },
    {
      role: 'teacher',
      label: 'Teacher',
      icon: <UserCheck size={36} strokeWidth={1.5} />,
      desc: 'Command your classroom matrix. Grade assignments, curate practice nodes, and track stats.',
      gradient: 'from-sky-400 to-blue-600',
      glow: 'shadow-blue-500/20',
      border: 'border-blue-500/30',
      bgColor: 'bg-blue-500/5',
      features: ['Grading Engine', 'Practice Bank', 'Curriculum Hub'],
      delay: 0.8
    },
    {
      role: 'admin',
      label: 'Admin',
      icon: <Shield size={36} strokeWidth={1.5} />,
      desc: 'Absolute system oversight. Manage institution data, verify docs, and handle finances.',
      gradient: 'from-violet-400 to-fuchsia-600',
      glow: 'shadow-violet-500/20',
      border: 'border-violet-500/30',
      bgColor: 'bg-violet-500/5',
      features: ['Total Analytics', 'Signatures', 'System Config'],
      delay: 0.9
    },
  ]

  return (
    <div className="w-full relative z-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8">
        {portals.map((p, i) => (
          <Link href={`/auth/login?role=${p.role}`} key={p.role} className="block group outline-none">
             <motion.div
               initial={{ opacity: 0, y: 40 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: p.delay, type: "spring", stiffness: 40, damping: 15 }}
               className={`relative h-full flex flex-col p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:bg-white/10 hover:${p.border} ${p.glow} hover:shadow-2xl`}
             >
                {/* Hover Illuminator */}
                <div className={`absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br ${p.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700`} />
                
                <div className="relative z-10 flex-1 flex flex-col">
                   <div className="flex justify-between items-start mb-8">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white bg-gradient-to-br ${p.gradient} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-500`}>
                         {p.icon}
                      </div>
                      <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:text-white group-hover:border-white/30 group-hover:bg-white/5 transition-all">
                         <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                   </div>

                   <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-all">
                      {p.label}
                   </h3>
                   
                   <p className="text-sm text-white/50 leading-relaxed mb-8 flex-1 font-medium">
                      {p.desc}
                   </p>

                   <div className="space-y-3 pt-6 border-t border-white/10">
                      {p.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs font-bold text-white/40 uppercase tracking-widest">
                           <CheckCircle size={14} className={`text-white/20 group-hover:text-white/80 transition-colors`} />
                           <span className="group-hover:text-white/70 transition-colors">{f}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Footer() {
  return (
    <motion.footer 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ delay: 1.5, duration: 1 }}
      className="relative z-10 py-8 px-6 mt-12 w-full text-center"
    >
      <div className="max-w-7xl mx-auto flex w-full border-t border-white/5 pt-8 flex-col sm:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-3">
            <span className="font-black text-xs uppercase tracking-widest text-white/30">
               PEAK OS © {new Date().getFullYear()}
            </span>
         </div>
         <div className="flex items-center gap-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
               <Pointer size={12} /> Interact to enter
            </span>
         </div>
      </div>
    </motion.footer>
  )
}
