'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, DollarSign, GraduationCap, Shield, UserCheck, Users } from 'lucide-react'

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
        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-sm transition hover:bg-emerald-100"
      >
        Portals <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[min(88vw,340px)] overflow-hidden rounded-lg border border-white/20 bg-white text-slate-950 shadow-2xl">
          <div className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
            <div className="text-sm font-black tracking-tight">Choose your portal</div>
            <div className="text-xs text-white/60">Sign in directly to the workspace you need.</div>
          </div>
          <div className="grid gap-px bg-slate-200">
            {portalLinks.map(({ label, desc, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 bg-white p-4 transition hover:bg-emerald-50"
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
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
