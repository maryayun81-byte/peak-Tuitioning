'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
}

export function Modal({ isOpen, onClose, title, children, size = 'md', closable = true }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={closable ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={cn('relative w-full rounded-2xl shadow-2xl', sizeClasses[size])}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            {(title || closable) && (
              <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
                {title && (
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
                )}
                {closable && (
                  <button
                    onClick={onClose}
                    className="ml-auto p-2 rounded-lg hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--input)', color: 'var(--text)' }}
        >
          Cancel
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: variant === 'danger' ? '#EF4444' : 'var(--primary)' }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
