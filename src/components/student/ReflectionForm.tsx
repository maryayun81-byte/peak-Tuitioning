'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { LearningReflection } from '@/types/homeschooling'

interface ReflectionFormProps {
  sessionId: string
  existingReflection?: LearningReflection
  onSubmit: () => void
}

const CONFIDENCE_OPTIONS = [
  { value: 'need_help', label: 'Need help', icon: '🔴', color: '#EF4444' },
  { value: 'getting_there', label: 'Getting there', icon: '🟡', color: '#F59E0B' },
  { value: 'comfortable', label: 'Comfortable', icon: '🟢', color: '#10B981' },
  { value: 'very_confident', label: 'Very confident', icon: '🔵', color: '#3B82F6' },
] as const

interface ReflectionFormData {
  accomplished: string
  difficulties: string
  confidence: string
}

export function ReflectionForm({ sessionId, existingReflection, onSubmit }: ReflectionFormProps) {
  const supabase = getSupabaseBrowserClient()
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingReflection)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ReflectionFormData>({
    defaultValues: {
      accomplished: existingReflection?.accomplished || '',
      difficulties: existingReflection?.difficulties || '',
      confidence: existingReflection?.confidence || '',
    },
  })

  const confidenceValue = watch('confidence')

  const onFormSubmit = async (data: ReflectionFormData) => {
    setSaving(true)
    const toastId = toast.loading('Saving your reflection...')
    try {
      const { error } = await supabase.rpc('submit_learning_reflection' as any, {
        p_session_id: sessionId,
        p_accomplished: data.accomplished || null,
        p_difficulties: data.difficulties || null,
        p_confidence: data.confidence || null,
      } as any)

      if (error) {
        const { error: insertError } = await supabase
          .from('learning_reflections')
          .upsert({
            session_id: sessionId,
            accomplished: data.accomplished || null,
            difficulties: data.difficulties || null,
            confidence: data.confidence || null,
          }, { onConflict: 'session_id,student_id' })

        if (insertError) throw insertError
      }

      toast.success('Reflection saved!', { id: toastId })
      setSubmitted(true)
      onSubmit()
    } catch (err: any) {
      console.error('[ReflectionForm] Error:', err)
      toast.error(err.message || 'Failed to save reflection', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-3xl bg-green-500/5 border border-green-500/10 text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-green-500" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>Reflection Saved</h3>
        <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>Your insights help Peak Coach personalize your learning path.</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Sparkles size={14} className="text-primary" /> Session Reflection
        </h3>
        <p className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>Share your thoughts on today&apos;s session</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
          What did you accomplish today?
        </label>
        <Textarea
          {...register('accomplished')}
          placeholder="Describe what you learned or completed..."
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
          What was difficult?
        </label>
        <Textarea
          {...register('difficulties')}
          placeholder="Any topics or concepts you found challenging..."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
          How confident do you feel?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {CONFIDENCE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                confidenceValue === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-[var(--card-border)] bg-[var(--input)] hover:border-primary/30'
              }`}
            >
              <input
                type="radio"
                value={option.value}
                {...register('confidence', { required: 'Please select your confidence level' })}
                className="sr-only"
              />
              <span className="text-lg">{option.icon}</span>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: confidenceValue === option.value ? 'var(--primary)' : 'var(--text)' }}>
                {option.label}
              </span>
              {confidenceValue === option.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <CheckCircle2 size={16} className="text-primary" />
                </motion.div>
              )}
            </label>
          ))}
        </div>
        {errors.confidence && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> {errors.confidence.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        isLoading={saving}
        className="w-full py-6 text-sm font-black uppercase tracking-widest"
      >
        Save Reflection
      </Button>
    </form>
  )
}
