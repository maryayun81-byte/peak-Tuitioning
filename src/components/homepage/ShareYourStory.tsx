'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const ROLES = [
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'guardian', label: 'Guardian' },
]

export function ShareYourStory() {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [quote, setQuote] = useState('')
  const [rating, setRating] = useState(5)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !role || !quote.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const { submitTestimonial } = await import('@/app/actions/testimonials')
      const result = await submitTestimonial({
        fullName: fullName.trim(),
        role,
        quote: quote.trim(),
        rating,
      })

      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error || 'Failed to submit. Please try again.')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="story" className="relative py-32 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-slate-50 opacity-30" />

      <div className="relative z-10 max-w-2xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-peak-green/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-peak-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Thank you for sharing!</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Your testimonial has been submitted and will appear on the site after review.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Header */}
              <div className="text-center mb-12">
                <span className="peak-label peak-label-green mb-4 block">SHARE YOUR STORY</span>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Tell Us About
                  <br />
                  <span className="text-peak-green">Your Experience.</span>
                </h2>
                <p className="text-slate-500 mt-4 max-w-md mx-auto">
                  Your story helps other families understand what Peak can do for their children.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-peak-green/20 focus:border-peak-green transition-all text-slate-900"
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-2">
                      I am a...
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-peak-green/20 focus:border-peak-green transition-all text-slate-900 appearance-none"
                    >
                      <option value="">Select role</option>
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-2">
                    Your Experience
                  </label>
                  <textarea
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    rows={4}
                    required
                    minLength={20}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-peak-green/20 focus:border-peak-green transition-all text-slate-900 resize-none"
                    placeholder="How has Peak impacted your child's learning journey? What changed?"
                  />
                  <div className="text-right text-xs text-slate-400 mt-1">
                    {quote.length}/900 characters
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-3">
                    How would you rate your experience?
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className="group"
                      >
                        <svg
                          className={`w-8 h-8 transition-colors ${
                            value <= rating
                              ? 'text-amber-400'
                              : 'text-slate-200 hover:text-amber-200'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !fullName.trim() || !role || !quote.trim()}
                  className="w-full bg-peak-green text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 hover:bg-peak-green/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Share My Story'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}