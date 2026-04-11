'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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

export interface NavItem {
  label: string
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
}

export function Sidebar({ items, bottomItems = [], logo, role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const { unreadCount } = useNotificationStore()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col hidden md:flex"
      style={{
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--card-border)',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 h-16" style={{ borderBottom: '1px solid var(--card-border)' }}>
        {!collapsed && logo}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: 'var(--card)', color: 'var(--text-muted)' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
        {items.map((item) => (
          <SidebarItem key={item.href} item={item} collapsed={collapsed} isActive={isActive(item.href)} />
        ))}
      </nav>

      {/* Bottom items */}
      {bottomItems.length > 0 && (
        <div className="py-3 px-3 space-y-1" style={{ borderTop: '1px solid var(--card-border)' }}>
          {bottomItems.map((item) => (
            <SidebarItem 
              key={item.href} 
              item={item} 
              collapsed={collapsed} 
              isActive={isActive(item.href)} 
              onClick={item.onClick}
            />
          ))}
        </div>
      )}

      {/* User info */}
      {profile && (
        <div
          className="p-3"
          style={{ borderTop: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'var(--card)' }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'var(--primary)', color: 'white' }}
            >
              {getInitials(profile.full_name)}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {profile.full_name}
                </div>
                <div className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                  {role}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.aside>
  )
}

function SidebarItem({ 
  item, 
  collapsed, 
  isActive,
  onClick
}: { 
  item: NavItem; 
  collapsed: boolean; 
  isActive: boolean;
  onClick?: () => void
}) {
  const router = useRouter()

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
    title: collapsed ? item.label : undefined
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
      prefetch={true}
      onMouseEnter={() => router.prefetch(item.href)}
      {...commonProps}
    >
      {content}
    </Link>
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
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

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
              <span className="text-[10px] font-medium">{item.label}</span>
            </>
          )
          const commonStyle = { color: isActive(item.href) ? 'var(--primary)' : 'var(--text-muted)' }
          
          if (item.onClick) {
            return (
              <button
                key={item.href}
                onClick={item.onClick}
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all"
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
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all"
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
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
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
              <div className="grid grid-cols-4 gap-2">
                {allMoreItems.map((item) => {
                  const content = (
                    <>
                      {item.icon}
                      <span className="text-[10px] font-medium text-center">{item.label}</span>
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
                      onClick={() => setShowMore(false)}
                      className={className}
                      style={commonStyle}
                    >
                      {content}
                    </Link>
                  )
                })}
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
