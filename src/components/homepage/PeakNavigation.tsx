'use client'

import { motion, useScroll, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { PublicPortalMenu } from '../ui/PublicPortalMenu'

const NAV_LINKS = [
  { label: 'HOW PEAK WORKS', href: '#how-it-works' },
  { label: 'PROGRAMMES', href: '#programmes' },
  { label: 'FEES', href: '#fees' },
  { label: 'RESULTS', href: '#results' },
  { label: 'CAMPUS', href: '#campus' },
  { label: 'BLOG', href: '#blog' },
]

export function PeakNavigation() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scrollY } = useScroll()

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (v) => setScrolled(v > 50))
    return () => unsubscribe()
  }, [scrollY])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white py-0 shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_20px_-4px_rgba(0,0,0,0.04)]'
            : 'bg-white/80 backdrop-blur-md py-0'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Top accent line */}
        <div className="h-[3px] bg-gradient-to-r from-peak-green via-peak-blue to-peak-cyan" />

        {/* Main nav row */}
        <div className="landing-container">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="relative">
                <img src="/logo.png" alt="Peak Performance Tutoring" className="w-7 h-7 rounded-md object-contain" />
                <motion.div
                  className="absolute inset-0 rounded-md bg-peak-green/20"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
              <span className="hidden sm:inline text-sm font-bold tracking-tight text-slate-900">
                PEAK PERFORMANCE
              </span>
            </Link>

            {/* Desktop nav with dividers */}
            <nav className="hidden lg:flex items-center">
              {NAV_LINKS.map((link, i) => (
                <div key={link.label} className="flex items-center">
                  {i > 0 && (
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                  )}
                  <Link
                    href={link.href}
                    className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 hover:text-peak-green transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
            </nav>

            {/* CTA + Mobile toggle */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block w-px h-6 bg-slate-200 mr-1" />
              <PublicPortalMenu />
              <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />
              <Link
                href="#fees"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 bg-peak-green text-white text-[11px] font-bold uppercase tracking-[0.08em] rounded hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                GET STARTED
              </Link>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                <motion.div
                  animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                  className="w-5 h-[2px] bg-slate-700 rounded-full origin-center"
                />
                <motion.div
                  animate={mobileOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                  className="w-3.5 h-[2px] bg-slate-700 rounded-full"
                />
                <motion.div
                  animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                  className="w-5 h-[2px] bg-slate-700 rounded-full origin-center"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom divider — always visible */}
        <div className="h-px bg-slate-200" />
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Menu panel */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 right-0 bg-white shadow-lg"
            >
              {/* Top accent */}
              <div className="h-[3px] bg-gradient-to-r from-peak-green via-peak-blue to-peak-cyan" />

              <div className="landing-container pt-4 pb-6">
                {/* Close button row */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Peak" className="w-6 h-6 rounded object-contain" />
                    <span className="text-xs font-bold text-slate-900 tracking-tight">PEAK PERFORMANCE</span>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Links with dividers */}
                <div className="space-y-0">
                  {NAV_LINKS.map((link, i) => (
                    <motion.div
                      key={link.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between py-3.5 text-sm font-bold uppercase tracking-wider text-slate-700 hover:text-peak-green transition-colors"
                      >
                        {link.label}
                        <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                      {i < NAV_LINKS.length - 1 && (
                        <div className="h-px bg-slate-100" />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: NAV_LINKS.length * 0.05 }}
                  className="mt-4 pt-4 border-t border-slate-200"
                >
                  <Link
                    href="#fees"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-peak-green text-white text-sm font-bold uppercase tracking-wider rounded hover:bg-peak-green-dim transition-colors"
                  >
                    GET STARTED
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </motion.div>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}