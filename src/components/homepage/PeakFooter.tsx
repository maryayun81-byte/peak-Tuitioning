'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'

const ROUTE_STEPS = ['DIAGNOSE', 'PRACTICE', 'CORRECT', 'REPEAT', 'PROGRESS']

export function PeakFooter() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <footer ref={ref} className="relative overflow-hidden">
      {/* Cinematic finale */}
      <div className="relative py-16 md:py-20 bg-white">
        <div className="absolute inset-0 bg-slate-50 opacity-30" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* Trajectory behind student */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="flex items-center justify-center gap-2 mb-12"
          >
            {ROUTE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 0.4, y: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="peak-mono text-[9px] text-slate-500 tracking-wider"
                >
                  {step}
                </motion.span>
                {i < ROUTE_STEPS.length - 1 && (
                  <div className="w-4 h-[1px] bg-slate-200" />
                )}
              </div>
            ))}
          </motion.div>

          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[0.95] mb-6">
              DON'T JUST HOPE
              <br />
              THE MARKS MOVE.
            </h2>
            <p className="text-xl text-slate-500 mb-2">
              <span className="text-peak-green font-bold">KNOW WHY THEY WILL.</span>
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8 }}
            className="mt-10"
          >
            <Link href="#fees" className="peak-cta text-base px-8 py-4">
              GET STARTED
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Practical footer */}
      <div className="bg-slate-50 border-t border-slate-200/30 py-12">
        <div className="landing-container">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Peak Performance Tutoring" className="w-8 h-8 rounded-lg object-contain flex items-center justify-center" />
                <span className="text-lg font-bold text-slate-900">PEAK</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Academic performance system. Not tuition. Diagnosis, precision, practice, mastery.
              </p>
            </div>

            {/* Links — every entry resolves to a real, indexable page.
                Dead ends (404s) and homepage loops waste crawl equity and
                actively block sitelinks. */}
            <div className="col-span-2 md:col-span-1">
              <div className="peak-label text-slate-500 mb-3">PROGRAMMES</div>
              <div className="space-y-2">
                {[
                  { label: 'Junior (Grades 4–9)', href: '/kcse-and-cbc-tutoring-kenya' },
                  { label: 'Senior (Grade 10)', href: '/kcse-and-cbc-tutoring-kenya' },
                  { label: '8-4-4 (Form 3–4)', href: '/kcse-and-cbc-tutoring-kenya' },
                  { label: 'Holiday Tuition', href: '/holiday-tuition-kenya' },
                ].map((link) => (
                  <div key={link.label}>
                    <Link href={link.href} className="text-xs text-slate-600 hover:text-peak-green transition-colors">
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="peak-label text-slate-500 mb-3">PORTALS</div>
              <div className="space-y-2">
                {[
                  { label: 'Student Portal', href: '/auth/login?role=student' },
                  { label: 'Parent Portal', href: '/auth/login?role=parent' },
                  { label: 'Teacher Studio', href: '/auth/login?role=teacher' },
                ].map((link) => (
                  <div key={link.label}>
                    <Link href={link.href} className="text-xs text-slate-600 hover:text-peak-green transition-colors">
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="peak-label text-slate-500 mb-3">EXPLORE</div>
              <div className="space-y-2">
                {[
                  { label: 'About Us', href: '/about' },
                  { label: 'Blog & Insights', href: '/blog' },
                  { label: 'Nairobi Tuition Centre', href: '/tuition-center-nairobi' },
                  { label: 'Events & Registration', href: '/events/register' },
                  { label: 'Contact Us', href: '/contact' },
                ].map((link) => (
                  <div key={link.label}>
                    <Link href={link.href} className="text-xs text-slate-600 hover:text-peak-green transition-colors">
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="peak-label text-slate-500 mb-3">CONTACT</div>
              <div className="space-y-2">
                <div className="text-xs text-slate-500">St Ignatius, Kinoo, Nairobi, Kenya</div>
                <div className="text-xs text-slate-500">info@peakcampus.co.ke</div>
                <div className="text-xs text-slate-500">+254 798 971 625</div>
              </div>
            </div>

            <div>
              <div className="peak-label text-slate-500 mb-3">LEGAL</div>
              <div className="space-y-2">
                <div><Link href="/privacy" className="text-xs text-slate-600 hover:text-peak-green transition-colors">Privacy Policy</Link></div>
                <div><Link href="/terms" className="text-xs text-slate-600 hover:text-peak-green transition-colors">Terms of Service</Link></div>
                <div><Link href="/cookies" className="text-xs text-slate-600 hover:text-peak-green transition-colors">Cookie Policy</Link></div>
              </div>
            </div>

            <div>
              <div className="peak-label text-slate-500 mb-3">NEWSLETTER</div>
              <form
                className="space-y-2"
                action=""
                onSubmit={e => {
                  e.preventDefault();
                  // TODO: submit to newsletter service
                  alert('Thanks for subscribing!');
                }}
              >
                <input
                  type="email"
                  placeholder="enter@email.com"
                  className="w-full bg-slate-100 border border-slate-200 rounded py-2 px-3 text-sm placeholder-slate-400 focus:outline-none focus:border-peak-green"
                />
                <button
                  type="submit"
                  className="w-full bg-peak-green text-white py-2 rounded text-sm font-bold uppercase tracking-[0.1em] transition"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-slate-200/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[10px] text-slate-500 peak-mono">
              © 2026 PEAK CAMPUS. ALL RIGHTS RESERVED.
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <span>BUILT WITH</span>
              <span className="text-peak-green">♥</span>
              <span>IN KENYA</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
