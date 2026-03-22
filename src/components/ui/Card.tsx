'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
  className?: string
}

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
  const variants = {
    primary: { bg: 'rgba(79,140,255,0.15)', color: '#4F8CFF', border: '1px solid rgba(79,140,255,0.3)' },
    secondary: { bg: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' },
    success: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' },
    warning: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' },
    danger: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' },
    info: { bg: 'rgba(34,211,238,0.15)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.3)' },
    muted: { bg: 'rgba(107,114,128,0.15)', color: 'var(--text-muted)', border: '1px solid rgba(107,114,128,0.3)' },
  }

  const style = variants[variant]

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold', className)}
      style={{ background: style.bg, color: style.color, border: style.border }}
    >
      {children}
    </span>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  gradient?: string
  className?: string
}

export function StatCard({ title, value, icon, change, changeType = 'neutral', gradient, className }: StatCardProps) {
  const changeColor = changeType === 'up' ? '#10B981' : changeType === 'down' ? '#EF4444' : 'var(--text-muted)'

  return (
    <div
      className={cn('rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] cursor-default', className)}
      style={{
        background: gradient || 'var(--card)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(79,140,255,0.15)' }}
        >
          <span style={{ color: 'var(--primary)' }}>{icon}</span>
        </div>
        {change && (
          <span className="text-xs font-semibold" style={{ color: changeColor }}>
            {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : ''} {change}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {title}
      </div>
    </div>
  )
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ children, className, style, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl transition-theme', className)}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-border)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
