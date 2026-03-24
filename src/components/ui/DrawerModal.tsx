'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface DrawerModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/**
 * DrawerModal — A drawing-optimised modal that is:
 * 1. Rendered via createPortal so it's a sibling of <body>, completely
 *    outside any Framer Motion parent that could re-animate on state change.
 * 2. Uses CSS only (no Framer Motion) so there are zero spring animations
 *    that could be re-triggered by child state changes.
 * 3. Sets touch-action:none on the inner panel so mobile browsers never
 *    interpret drawing strokes as scroll/pan gestures.
 * 4. Locks body scroll while open.
 */
export function DrawerModal({ isOpen, onClose, title, children }: DrawerModalProps) {
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isOpen])

  if (!isOpen || typeof window === 'undefined') return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
      }}
      onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/*
        The drawing panel itself — NO Framer Motion, NO overflow:auto that 
        would shift on content change, touch-action:none to block mobile scroll.
      */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          background: 'var(--card, #ffffff)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',        // clip at panel boundary
          touchAction: 'none',       // CRITICAL: stop mobile browser scroll during drawing
        }}
      >
        {/* Header — never scrolls away */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: 'var(--card, #ffffff)',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text, #0f172a)', margin: 0 }}>{title}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0', fontWeight: 600 }}>ILLUSTRATION BUILDER</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '12px',
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content — fills remaining space, internal scroll only */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
