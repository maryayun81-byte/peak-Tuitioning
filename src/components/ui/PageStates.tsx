'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface SectionErrorBoundaryState {
  hasError: boolean
  error: string
}

interface SectionErrorBoundaryProps {
  children: React.ReactNode
  title?: string
  className?: string
}

/**
 * SectionErrorBoundary
 * A lightweight error boundary for individual page sections/widgets.
 * Unlike PageErrorBoundary (full-screen), this shows a small inline
 * error card so the rest of the page remains functional.
 *
 * Usage:
 *   <SectionErrorBoundary title="Assignments">
 *     <AssignmentList />
 *   </SectionErrorBoundary>
 */
export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SectionErrorBoundary]', error, info)
  }

  reset = () => this.setState({ hasError: false, error: '' })

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`rounded-2xl p-5 flex items-center justify-between gap-4 ${this.props.className ?? ''}`}
          style={{ background: 'var(--card)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 shrink-0">
              <AlertTriangle size={16} className="text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                {this.props.title ?? 'Section'} failed to load
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                This section hit an error. Other parts of the page are unaffected.
              </p>
            </div>
          </div>
          <button
            onClick={this.reset}
            className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity"
            style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * EmptyState — Standard empty data UI.
 * Shown when a page loads successfully but has no records.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4"
    >
      {icon && (
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
        >
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
          {title}
        </h3>
        {description && (
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ background: 'var(--primary)' }}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}

/**
 * ErrorState — Standard error + retry UI.
 * Shown when a fetch fails after all retries.
 */
export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-12 px-6 text-center gap-4 ${className ?? ''}`}
    >
      <div className="w-14 h-14 rounded-3xl flex items-center justify-center bg-rose-500/10">
        <AlertTriangle size={24} className="text-rose-500" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          Failed to load
        </h3>
        <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
          {message || 'There was a problem fetching the data. Check your connection and try again.'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 text-white hover:opacity-90 transition-opacity"
          style={{ background: 'var(--primary)' }}
        >
          <RefreshCw size={12} /> Try Again
        </button>
      )}
    </motion.div>
  )
}

/**
 * TimeoutState — Shown when a request times out (different messaging from generic error).
 */
export function TimeoutState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      message="This is taking longer than expected. Your connection may be slow. Cached data is shown where available."
      onRetry={onRetry}
    />
  )
}

/**
 * PageStates — A unified component to handle various non-ideal page states.
 */
export function PageStates({ 
  status, 
  onRetry 
}: { 
  status: 'error' | 'timeout' | 'empty' | string, 
  onRetry?: () => void 
}) {
  if (status === 'timeout') return <TimeoutState onRetry={onRetry} />
  if (status === 'error') return <ErrorState onRetry={onRetry} />
  return null
}
