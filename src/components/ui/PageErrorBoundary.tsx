'use client'

import React from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'

interface State {
  hasError: boolean
  errorMessage: string
}

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * PageErrorBoundary
 * Catches any render-time or async errors thrown inside a page.
 * Shows a clean "Something went wrong" card with a Retry button
 * instead of a white blank page or infinite spinner.
 *
 * Usage: Wrap {children} in each portal layout.
 */
export class PageErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred.',
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[PageErrorBoundary] Caught error:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'var(--bg)' }}
        >
          <div
            className="max-w-sm w-full rounded-3xl p-8 text-center space-y-6"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(239,68,68,0.08)' }}
            >
              <WifiOff size={28} className="text-red-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>
                Something went wrong
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                The page encountered an error. This is usually a temporary network issue.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-3 text-left">
                  <summary className="text-[10px] font-bold text-red-500 cursor-pointer">
                    Error details (dev only)
                  </summary>
                  <pre className="text-[9px] mt-2 p-2 rounded-xl overflow-auto max-h-32" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                    {this.state.errorMessage}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleRetry}
                className="w-full py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'var(--primary)' }}
              >
                <RefreshCw size={15} /> Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 rounded-2xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
              >
                Hard Refresh
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
