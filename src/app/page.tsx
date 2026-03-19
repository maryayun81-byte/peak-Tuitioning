'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  GraduationCap, BookOpen, Users, UserCheck,
  Star, ChevronRight, Zap, Shield, BarChart3,
  Award, Bell, CheckCircle, ArrowRight, Play
} from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'

const WORDS = ['Excellence', 'Success', 'Growth', 'Mastery', 'Achievement']

export default function LandingPage() {
  const [splashDone, setSplashDone] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setSplashDone(true), 2800)
    const t2 = setInterval(() => setWordIndex(i => (i + 1) % WORDS.length), 3000)
    
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    // Detect platform
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent
      const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
      setIsIOS(ios)
      
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
      setIsStandalone(standalone)
      
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }

    return () => { 
      clearTimeout(t1)
      clearInterval(t2)
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
    }
  }

  return (
    <>
      <SplashScreen done={splashDone} />
      <AnimatePresence>
        {splashDone && (
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen"
            style={{ background: 'var(--bg)' }}
          >
            <Navbar onInstall={installPrompt ? handleInstallClick : undefined} />
            <Hero wordIndex={wordIndex} onInstall={installPrompt ? handleInstallClick : undefined} />
            <Features />
            <PortalSection />
            <Footer />
            
            {/* iOS Installation Hint */}
            {isIOS && !isStandalone && (
              <IOSInstallHint />
            )}
          </motion.main>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Navbar ─────────────────────────────────────────────────────
function Navbar({ onInstall }: { onInstall?: () => void }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between"
      style={{
        background: 'rgba(11,15,26,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'white', overflow: 'hidden' }}
        >
          <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <span className="font-bold text-white text-sm hidden sm:block">
          Peak Performance Tutoring
        </span>
        <span className="font-bold text-white text-sm sm:hidden">PPT</span>
      </div>
      <div className="flex items-center gap-3">
        {onInstall && (
          <button
            onClick={onInstall}
            className="hidden sm:flex px-4 py-2 rounded-xl text-sm font-bold text-white items-center gap-2 hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}
          >
            <Zap size={14} /> Install App
          </button>
        )}
        <Link
          href="/auth/login"
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
        >
          Log In
        </Link>
        <Link
          href="/auth/register"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--primary)' }}
        >
          Get Started
        </Link>
      </div>
    </nav>
  )
}

// ── Hero ───────────────────────────────────────────────────────
function Hero({ wordIndex, onInstall }: { wordIndex: number, onInstall?: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(79,140,255,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Floating orbs */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 right-1/4 w-3 h-3 rounded-full"
        style={{ background: '#4F8CFF', opacity: 0.6 }}
      />
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full"
        style={{ background: '#22D3EE', opacity: 0.5 }}
      />

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-8"
          style={{ background: 'rgba(79,140,255,0.12)', border: '1px solid rgba(79,140,255,0.3)', color: '#4F8CFF' }}
        >
          <Zap size={14} />
          Premium Education Platform
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-5xl md:text-7xl font-black mb-6 leading-[1.1]"
          style={{ color: 'white' }}
        >
          Unlock Your{' '}
          <span className="relative">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="gradient-text"
              >
                {WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          The world-class tuition management platform that connects students, teachers, parents, and administrators in one seamless experience.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Link
            href="/auth/register?role=student"
            className="px-8 py-4 rounded-2xl text-base font-bold text-white flex items-center gap-2 hover:opacity-90 transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #4F8CFF, #22D3EE)', boxShadow: '0 8px 30px rgba(79,140,255,0.35)' }}
          >
            Start Learning <ArrowRight size={18} />
          </Link>
          <Link
            href="#portals"
            className="px-8 py-4 rounded-2xl text-base font-semibold flex items-center gap-2 hover:opacity-80 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
          >
            <Play size={16} /> View Portals
          </Link>

          {/* New prominent Install Button */}
          {onInstall && (
            <button
              onClick={onInstall}
              className="px-8 py-4 rounded-2xl text-base font-bold text-white flex items-center gap-2 hover:opacity-90 transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #10B981, #34D399)', boxShadow: '0 8px 30px rgba(16,185,129,0.35)' }}
            >
              <Zap size={18} /> Install App
            </button>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="grid grid-cols-3 gap-6 max-w-md mx-auto mt-16"
        >
          {[
            { value: '10K+', label: 'Students' },
            { value: '500+', label: 'Teachers' },
            { value: '98%', label: 'Satisfaction' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black gradient-text">{stat.value}</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ── Features ───────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: <BookOpen size={24} />, title: 'Smart Assignments', desc: 'Create rich worksheets with KaTeX math, TipTap editor, and multimedia support.' },
    { icon: <BarChart3 size={24} />, title: 'Deep Analytics', desc: 'Track performance, attendance trends, and identify at-risk students instantly.' },
    { icon: <Bell size={24} />, title: 'Real-time Notifications', desc: 'Instant alerts for assignments, quiz results, payments, and transcripts.' },
    { icon: <Award size={24} />, title: 'Certificates & Transcripts', desc: 'Auto-generate PDF certificates and branded transcripts with your stamp and logo.' },
    { icon: <Shield size={24} />, title: 'Secure & Private', desc: 'Role-based access control with Supabase Row Level Security for every table.' },
    { icon: <Zap size={24} />, title: 'Works Offline', desc: 'Progressive Web App with IndexedDB caching, installable on any device.' },
  ]

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-black mb-4" style={{ color: 'white' }}>
            Everything You Need
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
            Built for modern education, designed for every role
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--card-border)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                style={{ background: 'rgba(79,140,255,0.12)', color: '#4F8CFF' }}
              >
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}


// ── Portal Section ─────────────────────────────────────────────
function PortalSection() {
  const portals = [
    {
      role: 'admin',
      label: 'Admin Portal',
      icon: <Shield size={32} />,
      desc: 'Manage everything — students, teachers, payments, transcripts, and analytics.',
      gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
      shadow: 'rgba(124,58,237,0.4)',
      features: ['Student & Teacher Management', 'Transcript Generation', 'Payment Tracking', 'Performance Analytics'],
    },
    {
      role: 'teacher',
      label: 'Teacher Portal',
      icon: <UserCheck size={32} />,
      desc: 'Create assignments, mark work, track attendance, and empower your students.',
      gradient: 'linear-gradient(135deg, #0EA5E9, #22D3EE)',
      shadow: 'rgba(14,165,233,0.4)',
      features: ['Assignment & Quiz Creator', 'Annotation Engine', 'Attendance Register', 'Schemes of Work'],
    },
    {
      role: 'student',
      label: 'Student Portal',
      icon: <GraduationCap size={32} />,
      desc: 'Learn, complete assignments, track your progress, and celebrate achievements.',
      gradient: 'linear-gradient(135deg, #10B981, #34D399)',
      shadow: 'rgba(16,185,129,0.4)',
      features: ['Online Worksheets', 'Quiz Leaderboard', 'Transcript Access', 'Certificate Downloads'],
    },
    {
      role: 'parent',
      label: 'Parent Portal',
      icon: <Users size={32} />,
      desc: "Stay connected with your child's education — attendance, payments, and more.",
      gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
      shadow: 'rgba(245,158,11,0.4)',
      features: ['Attendance Tracking', 'Payment Receipts', 'Performance Reports', 'Real-time Notifications'],
    },
  ]

  return (
    <section id="portals" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-black mb-4" style={{ color: 'white' }}>Choose Your Portal</h2>
          <p style={{ color: 'var(--text-muted)' }}>Tailored experiences for every role</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map((p, i) => (
            <motion.div
              key={p.role}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative overflow-hidden rounded-2xl p-6 group"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              {/* Background gradient on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"
                style={{ background: p.gradient }}
              />

              <div className="relative z-10">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-5"
                  style={{ background: p.gradient, boxShadow: `0 8px 24px ${p.shadow}` }}
                >
                  {p.icon}
                </div>

                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>{p.label}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-muted)' }}>{p.desc}</p>

                <ul className="space-y-2 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <CheckCircle size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/auth/login?role=${p.role}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-105"
                  style={{ background: p.gradient, boxShadow: `0 4px 14px ${p.shadow}` }}
                >
                  Access Portal <ChevronRight size={16} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-12 px-6" style={{ borderTop: '1px solid var(--card-border)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4F8CFF, #22D3EE)' }}
          >
            <GraduationCap size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
            Peak Performance Tutoring
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Peak Performance Tutoring. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

// ── iOS Install Hint ──────────────────────────────────────────
function IOSInstallHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 5, duration: 0.8 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(calc(100%-3rem),400px)]"
    >
      <div 
        className="relative p-5 rounded-2xl shadow-2xl overflow-hidden"
        style={{ 
          background: 'rgba(11,15,26,0.95)', 
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}
      >
        {/* Animated pointer arrow pointing to the Share icon */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="text-primary" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-white text-sm mb-1">Install Peak Performance</h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Tap the <span className="inline-flex items-center mx-0.5 align-middle"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/IOS_share_icon.png" className="w-4 h-4 invert opacity-80" alt="share" /></span> share icon below and select <span className="text-white font-medium underline underline-offset-2">"Add to Home Screen"</span> for the best experience.
            </p>
          </div>
          <button 
            onClick={(e) => {
              const target = e.currentTarget.closest('.fixed');
              if (target) (target as HTMLElement).style.display = 'none';
            }}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="text-white/40 rotate-90" size={18} />
          </button>
        </div>

        {/* Pulsing indicator */}
        <div 
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
          style={{ background: 'rgba(11,15,26,0.95)', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>
    </motion.div>
  )
}

