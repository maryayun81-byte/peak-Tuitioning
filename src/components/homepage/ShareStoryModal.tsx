'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface ShareStoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShareStoryModal({ isOpen, onClose }: ShareStoryModalProps) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: '',
    relationship: '',
    quote: '',
    rating: 5,
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)

    try {
      const { submitTestimonial } = await import('@/app/actions/testimonials')
      const res = await submitTestimonial({
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        relationshipLabel: form.relationship,
        quote: form.quote,
        rating: form.rating,
      })
      setResult(res)
      if (res.success) {
        setTimeout(() => {
          onClose()
          setForm({ fullName: '', email: '', role: '', relationship: '', quote: '', rating: 5 })
        }, 2000)
      }
    } catch {
      setResult({ success: false, message: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal — always centered via flex */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto"
            >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Share Your Story</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Tell other families about your Peak experience.</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {result?.success ? (
                <div className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Thank you!</h4>
                  <p className="text-sm text-slate-500">Your story has been submitted for review.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) => update('fullName', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-peak-green/30 focus:border-peak-green transition-all"
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-peak-green/30 focus:border-peak-green transition-all"
                        placeholder="jane@email.com"
                      />
                    </div>
                  </div>

                  {/* Role + Relationship */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">I am a *</label>
                      <select
                        required
                        value={form.role}
                        onChange={(e) => update('role', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-peak-green/30 focus:border-peak-green transition-all"
                      >
                        <option value="">Select...</option>
                        <option value="Parent">Parent</option>
                        <option value="Student">Student</option>
                        <option value="Teacher">Teacher</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Child&apos;s Grade/Class</label>
                      <input
                        type="text"
                        value={form.relationship}
                        onChange={(e) => update('relationship', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-peak-green/30 focus:border-peak-green transition-all"
                        placeholder="e.g. Form 4"
                      />
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Rating *</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => update('rating', star)}
                          className="p-0.5"
                        >
                          <svg
                            className={`w-7 h-7 transition-colors ${star <= form.rating ? 'text-amber-400' : 'text-slate-200 hover:text-slate-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quote */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Your Story *</label>
                    <textarea
                      required
                      rows={4}
                      value={form.quote}
                      onChange={(e) => update('quote', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-peak-green/30 focus:border-peak-green transition-all resize-none"
                      placeholder="How has Peak made a difference for your family?"
                    />
                    <div className="text-right text-[10px] text-slate-400 mt-1">{form.quote.length}/500</div>
                  </div>

                  {/* Error */}
                  {result && !result.success && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{result.message}</p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-peak-green text-white font-bold text-sm tracking-wider hover:bg-peak-green-dim transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit My Story'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}