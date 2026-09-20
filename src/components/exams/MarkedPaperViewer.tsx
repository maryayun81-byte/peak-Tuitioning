'use client'

import { useState } from 'react'
import { Camera, X, FileText, Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

/**
 * Marked-paper viewer: zoom pages, fullscreen, download where permitted.
 * Works for physical scripts (photo pages) and online attempts (print view).
 */
export function MarkedPaperViewer({
  isOpen,
  onClose,
  title,
  pages,
  allowDownload = true,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  pages: string[]
  allowDownload?: boolean
}) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  if (!isOpen) return null
  const current = pages[index]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-3">
        {pages.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            No pages uploaded for this paper yet.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
              <span>Page {index + 1} of {pages.length}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="px-2 py-1 rounded-lg border border-[var(--card-border)]">−</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} className="px-2 py-1 rounded-lg border border-[var(--card-border)]">+</button>
                <button onClick={() => window.open(current, '_blank')} className="px-2 py-1 rounded-lg border border-[var(--card-border)]">Fullscreen</button>
                {allowDownload && (
                  <a href={current} download className="px-2 py-1 rounded-lg text-white flex items-center gap-1" style={{ background: 'var(--primary)' }}>
                    <Download size={12} /> Save
                  </a>
                )}
              </div>
            </div>
            <div className="rounded-2xl overflow-auto border border-[var(--card-border)] bg-black/90 flex justify-center" style={{ maxHeight: '60vh' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current} alt={`Page ${index + 1}`} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', maxWidth: '100%' }} className="object-contain" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pages.map((p, i) => (
                <button key={p + i} onClick={() => setIndex(i)} className="relative shrink-0 w-14 h-[72px] rounded-lg overflow-hidden border-2" style={{ borderColor: i === index ? 'var(--primary)' : 'var(--card-border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={index === 0} onClick={() => setIndex(i => Math.max(0, i - 1))}>Previous</Button>
              <Button variant="secondary" className="flex-1" disabled={index >= pages.length - 1} onClick={() => setIndex(i => Math.min(pages.length - 1, i + 1))}>Next</Button>
            </div>
          </>
        )}
        <p className="text-[11px] text-center flex items-center justify-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Camera size={11} /> Teacher annotations and marks appear on the published pages.
        </p>
        <button onClick={() => { setIndex(0); setZoom(1); onClose() }} className="hidden" aria-hidden><X size={10} /></button>
      </div>
    </Modal>
  )
}
