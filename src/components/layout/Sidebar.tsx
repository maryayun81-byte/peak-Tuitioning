'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard, Users, UserCheck, GraduationCap, BookOpen,
  Calendar, CalendarDays, ClipboardList, BarChart3, Bell,
  Settings, LogOut, ChevronLeft, ChevronRight, CreditCard,
  FileText, School, Award, TrendingUp, Library, Menu, X,
  UserCircle, Layers, Home, BookMarked, Clock
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useSidebarStore, sidebarCollapsedKey, SIDEBAR_WIDTHS } from '@/stores/sidebarStore'

export interface NavItem {
  label: string
  shortLabel?: string
  group?: string
  href: string
  icon: React.ReactNode
  badge?: number
  onClick?: () => void
  children?: NavItem[]
}

interface SidebarProps {
  items: NavItem[]
  bottomItems?: (NavItem & { onClick?: () => void })[]
  logo?: React.ReactNode
  role: string
  children?: React.ReactNode
}

const ease = { duration: 0.3, ease: 'easeInOut' as const }

export function Sidebar({ items, bottomItems = [], logo, role, children }: SidebarProps) {
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { collapsed, setCollapsed, toggle, mobileOpen, setMobileOpen } = useSidebarStore()
  const prefersReducedMotion = useReducedMotion()
  const transition = prefersReducedMotion ? { duration: 0 } : ease

  // Load the per-user collapse preference whenever the signed-in user changes.
  useEffect(() => {
    if (!profile?.id) return
    const saved = localStorage.getItem(sidebarCollapsedKey(profile.id))
    if (saved !== null) setCollapsed(saved === 'true')
  }, [profile?.id, setCollapsed])

  const handleToggle = () => {
    const next = !collapsed
    setCollapsed(next)
    if (profile?.id) localStorage.setItem(sidebarCollapsedKey(profile.id), String(next))
  }

  const isActive = (href: string) => pathname === href || (href !== '/' && href !== '/student' && pathname.startsWith(href + '/'))

  const bodyProps = {
    items,
    bottomItems,
    logo,
    role,
    children,
    isActive,
  }

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? SIDEBAR_WIDTHS.collapsed : SIDEBAR_WIDTHS.expanded }}
        transition={transition}
        className="fixed left-0 top-0 h-screen z-40 flex flex-col hidden md:flex"
        style={{
          background: 'var(--sidebar)',
          borderRight: '1px solid var(--card-border)',
          overflow: 'hidden',
        }}
      >
        <SidebarContent {...bodyProps} collapsed={collapsed} onToggle={handleToggle} mobile={false} />
      </motion.aside>

      {/* Mobile overlay drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="fixed inset-0 z-50 md:hidden"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -SIDEBAR_WIDTHS.expanded }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_WIDTHS.expanded }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 flex flex-col md:hidden"
              style={{
                width: `min(${SIDEBAR_WIDTHS.expanded}px, 85vw)`,
                background: 'var(--sidebar)',
                borderRight: '1px solid var(--card-border)',
              }}
            >
              <SidebarContent {...bodyProps} collapsed={false} onToggle={() => setMobileOpen(false)} mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

interface SidebarContentProps {
  items: NavItem[]
  bottomItems: NavItem[]
  logo?: React.ReactNode
  role: string
  children?: React.ReactNode
  collapsed: boolean
  mobile: boolean
  onToggle: () => void
  isActive: (href: string) => boolean
}

function SidebarContent({ items, bottomItems, logo, role, children, collapsed, mobile, onToggle, isActive }: SidebarContentProps) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 h-16" style={{ borderBottom: '1px solid var(--card-border)' }}>
        {!collapsed && logo}
        <button
          onClick={onToggle}
          className="ml-auto p-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: 'var(--card)', color: 'var(--text-muted)' }}
          aria-label={mobile ? 'Close navigation menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {mobile ? <X size={16} /> : collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
        {items.map((item, index) => {
          const showGroup = !collapsed && item.group && item.group !== items[index - 1]?.group
          return (
            <div key={item.href} onClick={mobile ? onToggle : undefined}>
              {showGroup && (
                <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  {item.group}
                </div>
              )}
              <SidebarItem item={item} collapsed={collapsed} isActive={isActive(item.href)} />
            </div>
          )
        })}
      </nav>

      {/* Bottom items */}
      {bottomItems.length > 0 && (
        <div className="py-3 px-3 space-y-1" style={{ borderTop: '1px solid var(--card-border)' }}>
          {bottomItems.map((item) => (
            <div key={item.href} onClick={mobile ? onToggle : undefined}>
              <SidebarItem
                item={item}
                collapsed={collapsed}
                isActive={isActive(item.href)}
                onClick={item.onClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* Children elements */}
      {!collapsed && children}

      {/* User info */}
      <UserInfo role={role} />
    </>
  )
}

function UserInfo({ role }: { role: string }) {
  const { profile } = useAuthStore()
  if (!profile) return null
  return (
    <div className="p-3" style={{ borderTop: '1px solid var(--card-border)' }}>
      <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'var(--card)' }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          {getInitials(profile.full_name)}
        </div>
        <div className="overflow-hidden">
          <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
            {profile.full_name}
          </div>
          <div className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
            {role}
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarItem({
  item,
  collapsed,
  isActive,
  onClick,
}: {
  item: NavItem
  collapsed: boolean
  isActive: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span className={cn('flex-shrink-0', isActive ? 'text-white' : '')}>{item.icon}</span>
      {!collapsed && (
        <span className="flex-1 truncate">{item.label}</span>
      )}
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <span
          className="text-xs px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: '#EF4444', color: 'white' }}
        >
          {item.badge}
        </span>
      )}
    </>
  )

  const commonProps = {
    className: cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group w-full text-left',
      isActive ? 'text-white' : 'hover:opacity-80',
      collapsed ? 'justify-center' : ''
    ),
    style: {
      background: isActive ? 'var(--primary)' : 'transparent',
      color: isActive ? 'white' : 'var(--text-muted)',
    },
    title: collapsed ? item.label : undefined,
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onClick()
        }}
        {...commonProps}
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      href={item.href}
      prefetch={false}
      {...commonProps}
    >
      {content}
    </Link>
  )
}

// Mobile hamburger — place it in a portal's mobile header to open the overlay drawer.
export function MobileSidebarToggle() {
  const { setMobileOpen } = useSidebarStore()
  return (
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      className="p-2 rounded-xl hover:bg-[var(--input)] transition-colors md:hidden"
      aria-label="Open navigation menu"
    >
      <Menu size={20} />
    </button>
  )
}

// ============================================================
// BOTTOM NAVIGATION (Mobile)
// ============================================================
interface BottomNavProps {
  items: NavItem[]
  moreItems?: NavItem[]
}

export function BottomNav({ items, moreItems = [] }: BottomNavProps) {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const isActive = (href: string) => pathname === href || (href !== '/' && href !== '/student' && pathname.startsWith(href + '/'))

  const mainItems = items.slice(0, 4)
  const hasMore = items.length > 4 || moreItems.length > 0
  const allMoreItems = [...items.slice(4), ...moreItems]

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden"
        style={{
          background: 'var(--sidebar)',
          borderTop: '1px solid var(--card-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {mainItems.map((item) => {
          const content = (
            <>
              {item.icon}
              <span className="max-w-[64px] truncate text-[10px] font-semibold leading-tight">{item.shortLabel || item.label}</span>
            </>
          )
          const commonStyle = { color: isActive(item.href) ? 'var(--primary)' : 'var(--text-muted)' }

          if (item.onClick) {
            return (
              <button
                key={item.href}
                onClick={item.onClick}
                className="min-w-0 flex-1 flex flex-col items-center justify-center px-1 py-2.5 gap-1 transition-all"
                style={commonStyle}
              >
                {content}
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="min-w-0 flex-1 flex flex-col items-center justify-center px-1 py-2.5 gap-1 transition-all"
              style={commonStyle}
            >
              {content}
            </Link>
          )
        })}
        {hasMore && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            setShowMore(!showMore)
          }}
          className="min-w-0 flex-1 flex flex-col items-center justify-center px-1 py-2.5 gap-1"
          style={{ color: showMore ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          <Menu size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
        )}
      </div>

      {/* More drawer */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 md:hidden"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed bottom-16 left-0 right-0 z-40 md:hidden rounded-t-2xl p-4"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>More</span>
                <button onClick={() => setShowMore(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[60vh] space-y-5 overflow-y-auto pb-2">
                {Array.from(new Set(allMoreItems.map(item => item.group || 'More'))).map(group => (
                  <div key={group}>
                    <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                      {group}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                {allMoreItems.filter(item => (item.group || 'More') === group).map((item) => {
                  const content = (
                    <>
                      {item.icon}
                      <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight">{item.shortLabel || item.label}</span>
                    </>
                  )
                  const commonStyle = {
                    background: isActive(item.href) ? 'var(--primary)' : 'var(--input)',
                    color: isActive(item.href) ? 'white' : 'var(--text)',
                  }
                  const className = "flex flex-col items-center gap-2 p-3 rounded-xl scale-95 md:scale-100 transition-all hover:scale-105 active:scale-95"

                  if (item.onClick) {
                    return (
                      <button
                        key={item.href}
                        onClick={(e) => {
                          e.preventDefault()
                          item.onClick!()
                          setShowMore(false)
                        }}
                        className={className}
                        style={commonStyle}
                      >
                        {content}
                      </button>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setShowMore(false)}
                      className={className}
                      style={commonStyle}
                    >
                      {content}
                    </Link>
                  )
                })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Notification bell
export function NotificationBell() {
  const { unreadCount } = useNotificationStore()

  return (
    <div className="relative">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
          style={{ background: '#EF4444', color: 'white' }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  )
}
