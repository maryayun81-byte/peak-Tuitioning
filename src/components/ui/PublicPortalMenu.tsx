'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, DollarSign, GraduationCap, LogIn, Shield, UserCheck, Users } from 'lucide-react'

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
    <div ref={menuRef} className="relative z-50">
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
        <div className="absolute right-0 mt-3 w-[min(calc(100vw-2rem),360px)] overflow-hidden rounded-2xl border border-white/20 bg-white text-[#073159] shadow-[0_28px_80px_rgba(2,6,23,0.35)]">
          <div className="border-b border-white/10 bg-[#071a2d] px-5 py-4 text-white">
            <div className="text-base font-black tracking-tight">Your Peak workspace</div>
            <div className="mt-1 text-xs text-white/60">Choose a secure portal to continue.</div>
          </div>
          <div className="grid gap-px bg-slate-200">
            {portalLinks.map(({ label, desc, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="group flex items-start gap-3 bg-white p-4 transition hover:bg-[#f4f9fc]"
              >
                <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf3f8] text-[#145da0] transition group-hover:bg-[#145da0] group-hover:text-white">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-black">{label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-600">{desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
