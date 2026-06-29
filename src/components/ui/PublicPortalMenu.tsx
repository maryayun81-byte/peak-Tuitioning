'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, ChevronDown, DollarSign, GraduationCap, Home, LogIn, MessageSquareQuote, Phone, Shield, Sparkles, UserCheck, Users } from 'lucide-react'

const publicLinks = [
  {
    label: 'Who We Are',
    desc: 'Peak philosophy, tiers and teaching model',
    href: '/#who-we-are',
    icon: Home,
  },
  {
    label: 'Holiday Tuition',
    desc: 'Open programmes, revision camps and intakes',
    href: '/holiday-tuition-kenya',
    icon: Sparkles,
  },
  {
    label: 'Method',
    desc: 'How diagnosis becomes visible progress',
    href: '/#how-it-works',
    icon: BookOpenCheck,
  },
  {
    label: 'Testimonials',
    desc: 'Parent, student and teacher stories',
    href: '/#testimonials',
    icon: MessageSquareQuote,
  },
  {
    label: 'Contact',
    desc: 'Call, WhatsApp or visit Kinoo learning point',
    href: '/contact',
    icon: Phone,
  },
]

const portalLinks = [
  {
    label: 'Student Portal',
    desc: 'Assignments, live classes, quizzes, study tools',
    href: '/auth/login?role=student',
    icon: GraduationCap,
  },
  {
    label: 'Parent Portal',
    desc: 'Progress, attendance, billing, live visibility',
    href: '/auth/login?role=parent',
    icon: Users,
  },
  {
    label: 'Teacher Studio',
    desc: 'Classes, live sessions, marking, resources',
    href: '/auth/login?role=teacher',
    icon: UserCheck,
  },
  {
    label: 'Admin Portal',
    desc: 'Students, teachers, terms, operations',
    href: '/auth/login?role=admin',
    icon: Shield,
  },
  {
    label: 'Finance Portal',
    desc: 'Payments, reports, balances, ledgers',
    href: '/auth/login?role=finance',
    icon: DollarSign,
  },
]

export function PublicPortalMenu() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div ref={menuRef} className="relative z-[200]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Open portal sign in menu"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white px-3 text-xs font-black uppercase tracking-[0.12em] text-[#073159] shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#eaf3f8] sm:h-11 sm:px-4 sm:text-sm sm:normal-case sm:tracking-normal"
      >
        <LogIn size={15} />
        <span className="hidden min-[360px]:inline">Portals</span>
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-[210] mt-3 w-[min(calc(100vw-1rem),390px)] overflow-hidden rounded-2xl border border-white/20 bg-white text-[#073159] shadow-[0_28px_80px_rgba(2,6,23,0.35)]">
          <div className="border-b border-white/10 bg-[#071a2d] px-4 py-3 text-white sm:px-5 sm:py-4">
            <div className="text-sm font-black tracking-tight sm:text-base">Peak navigation</div>
            <div className="mt-0.5 text-[11px] text-white/60 sm:mt-1 sm:text-xs">Portals first. Explore Peak below.</div>
          </div>
          <div className="max-h-[min(calc(100svh-8rem),430px)] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
            <div className="grid gap-px bg-slate-200">
              {portalLinks.map(({ label, desc, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="group flex items-start gap-2.5 bg-white px-3 py-2.5 transition hover:bg-[#f4f9fc] sm:gap-3 sm:p-4"
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eaf3f8] text-[#145da0] transition group-hover:bg-[#145da0] group-hover:text-white sm:h-10 sm:w-10 sm:rounded-xl">
                    <Icon size={16} />
                  </span>
                  <span>
                    <span className="block text-[13px] font-black leading-tight sm:text-sm">{label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-slate-600 sm:text-xs sm:leading-5">{desc}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="border-y border-slate-200 bg-white px-4 py-2.5 lg:hidden">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Explore Peak</div>
            </div>
            <div className="bg-[#f4f9fc] p-2.5 lg:hidden">
              <div className="grid gap-1.5">
                {publicLinks.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-2.5 rounded-xl border border-[#145da0]/10 bg-white px-3 py-2 shadow-sm transition hover:border-[#7ed957]/50 hover:bg-white"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eaf3f8] text-[#145da0] transition group-hover:bg-[#145da0] group-hover:text-white">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-black leading-tight">{label}</span>
                    </span>
                    <ArrowRight size={13} className="shrink-0 text-[#7ed957]" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
