'use client'

import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent' | 'warning' | 'info' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'

    const variants = {
      primary: 'text-white shadow-lg hover:shadow-xl',
      secondary: 'text-[var(--text)] hover:opacity-90',
      ghost: 'text-[var(--text)] hover:text-[var(--text)]',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg',
      outline: 'border text-[var(--text)] hover:opacity-80',
      accent: 'text-white shadow-lg hover:shadow-xl',
      warning: 'text-white shadow-lg hover:shadow-xl',
      info: 'text-white shadow-lg hover:shadow-xl',
      success: 'text-white shadow-lg hover:shadow-xl',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2',
    }

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: { background: 'var(--primary)' },
      secondary: { background: 'var(--card)', border: '1px solid var(--card-border)' },
      ghost: { background: 'transparent' },
      danger: {},
      outline: { background: 'transparent', borderColor: 'var(--card-border)' },
      accent: { background: 'var(--accent)' },
      warning: { background: '#F59E0B' },
      info: { background: '#22D3EE' },
      success: { background: '#10B981' },
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        style={variantStyles[variant]}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
