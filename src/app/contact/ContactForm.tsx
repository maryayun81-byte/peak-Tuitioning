'use client'

import { useState } from 'react'

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-peak-green/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-peak-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-lg font-bold text-slate-900 mb-1">Message sent</p>
        <p className="text-sm text-slate-500">We&apos;ll get back to you within 24 hours.</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => setSubmitted(true), 1200)
      }}
      className="space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
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
            Phone
          </label>
          <input
            type="tel"
            required
            placeholder="0712 345 678"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-peak-green focus:ring-1 focus:ring-peak-green/20 transition-all"
          />
        </div>
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
        className="w-full px-6 py-3 bg-slate-900 text-white text-sm font-bold uppercase tracking-wider rounded hover:bg-peak-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending...' : 'Send message'}
      </button>
    </form>
  )
}