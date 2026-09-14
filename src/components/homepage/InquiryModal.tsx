'use client'

import { useState } from 'react'
import { trackLead } from '@/lib/ads'

export function InquiryModal() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (submitted) {
    return (
      <div id="inquiry-modal" className="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) (e.target as HTMLElement).classList.add('hidden') }}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 rounded-full bg-peak-green/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-peak-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-lg font-bold text-slate-900 mb-1">Inquiry sent</p>
          <p className="text-sm text-slate-500">We'll get back to you within 24 hours.</p>
          <button
            onClick={() => {
              setSubmitted(false)
              document.getElementById('inquiry-modal')?.classList.add('hidden')
            }}
            className="mt-6 px-6 py-2 bg-peak-green text-white text-sm font-bold uppercase tracking-wider rounded hover:shadow-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div id="inquiry-modal" className="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) (e.target as HTMLElement).classList.add('hidden') }}>
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Send an inquiry</h3>
          <button
            onClick={() => document.getElementById('inquiry-modal')?.classList.add('hidden')}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setLoading(true)
            setTimeout(() => {
              setSubmitted(true)
              trackLead('homepage_inquiry')
            }, 1200)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Your name
            </label>
            <input
              type="text"
              required
              placeholder="Jane Doe"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-peak-green focus:ring-1 focus:ring-peak-green/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Phone number
            </label>
            <input
              type="tel"
              required
              placeholder="0712 345 678"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-peak-green focus:ring-1 focus:ring-peak-green/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Learner class / grade
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Form 4, Grade 9"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-peak-green focus:ring-1 focus:ring-peak-green/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              What do you need help with?
            </label>
            <textarea
              rows={3}
              required
              placeholder="Weak subjects, current marks, whether you need term or holiday tuition..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-peak-green focus:ring-1 focus:ring-peak-green/20 transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-peak-green text-white text-sm font-bold uppercase tracking-wider rounded hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Sending...' : 'Send inquiry'}
          </button>
        </form>
      </div>
    </div>
  )
}