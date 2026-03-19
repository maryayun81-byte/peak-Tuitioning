'use client'

import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-xl py-2.5 text-sm transition-all duration-200 outline-none',
              leftIcon ? 'pl-10 pr-4' : 'px-4',
              rightIcon ? 'pr-10' : '',
              error ? 'border-red-500' : '',
              className
            )}
            style={{
              background: 'var(--input)',
              color: 'var(--text)',
              border: error ? '1px solid #EF4444' : '1px solid var(--card-border)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary)'
              e.target.style.boxShadow = '0 0 0 3px rgba(79,140,255,0.15)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? '#EF4444' : 'var(--card-border)'
              e.target.style.boxShadow = 'none'
            }}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn('w-full rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer', className)}
          style={{
            background: 'var(--input)',
            color: 'var(--text)',
            border: error ? '1px solid #EF4444' : '1px solid var(--card-border)',
          }}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn('w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none', className)}
          style={{
            background: 'var(--input)',
            color: 'var(--text)',
            border: error ? '1px solid #EF4444' : '1px solid var(--card-border)',
          }}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
