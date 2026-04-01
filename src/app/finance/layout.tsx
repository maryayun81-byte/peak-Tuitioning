'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, BarChart3, FileText,
  TrendingUp, MapPin, ShoppingBag, Settings, LogOut,
  DollarSign
} from 'lucide-react'
import { Sidebar, BottomNav } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { SplashScreen } from '@/components/SplashScreen'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/finance', icon: <LayoutDashboard size={18} /> },
  { label: 'General Ledger', href: '/finance/ledger', icon: <BookOpen size={18} /> },
  { label: 'Balance Sheet', href: '/finance/balance-sheet', icon: <BarChart3 size={18} /> },
  { label: 'Income Statement', href: '/finance/income-statement', icon: <TrendingUp size={18} /> },
  { label: 'Weekly Reports', href: '/finance/weekly-reports', icon: <FileText size={18} /> },
  { label: 'Payments', href: '/finance/payments', icon: <DollarSign size={18} /> },
  { label: 'Centers', href: '/finance/centers', icon: <MapPin size={18} /> },
  { label: 'Expenses', href: '/finance/expenses', icon: <ShoppingBag size={18} /> },
  { label: 'Settings', href: '/finance/settings', icon: <Settings size={18} /> },
]

const MOBILE_BOTTOM = NAV_ITEMS.slice(0, 4)
const MOBILE_MORE = [
  ...NAV_ITEMS.slice(4),
  { label: 'Sign Out', href: '#', icon: <LogOut size={18} /> },
]

const LogoComponent = (
  <div className="flex items-center gap-2">
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
    >
      <DollarSign size={18} className="text-white" />
    </div>
    <div>
      <div className="text-xs font-black" style={{ color: 'var(--text)' }}>Peak Finance</div>
      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Finance Portal</div>
    </div>
  </div>
)

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuthStore()
  const { signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!profile) {
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().profile) {
          router.push('/auth/login?role=finance')
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
    if (profile.role && profile.role !== 'finance' && profile.role !== 'admin') {
      router.push(`/${profile.role}`)
    }
  }, [profile, isLoading, router])

  if (isLoading && !profile) {
    return <SplashScreen done={false} role="admin" />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <SplashScreen storageKey="splash-finance" role="admin" />

      {/* Desktop Sidebar */}
      <Sidebar
        items={NAV_ITEMS}
        bottomItems={[
          { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
        ]}
        logo={LogoComponent}
        role="admin"
      />

      {/* Main content */}
      <main className="min-h-screen transition-all duration-300 pb-20 md:pb-0" style={{ marginLeft: 0 }}>
        {/* Top bar (mobile) */}
        <div
          className="sticky top-0 z-30 flex md:hidden items-center justify-between px-4 py-3"
          style={{
            background: 'rgba(11,15,26,0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--card-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
            >
              <DollarSign size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Finance</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:ml-[260px]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav
        items={MOBILE_BOTTOM}
        moreItems={MOBILE_MORE.map(item =>
          item.label === 'Sign Out' ? { ...item, onClick: signOut } : item
        )}
      />
    </div>
  )
}
