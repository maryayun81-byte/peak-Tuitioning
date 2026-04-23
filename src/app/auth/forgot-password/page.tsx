'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Mail, Shield, UserCheck, GraduationCap, Users, DollarSign, ArrowLeft, Send } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  email: z.string().email('Invalid email address'),
})
type FormData = z.infer<typeof schema>

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: <Shield size={20} />, color: '#7C3AED' },
  teacher: { label: 'Teacher', icon: <UserCheck size={20} />, color: '#0EA5E9' },
  student: { label: 'Student', icon: <GraduationCap size={20} />, color: '#10B981' },
  parent: { label: 'Parent', icon: <Users size={20} />, color: '#F59E0B' },
  finance: { label: 'Finance', icon: <DollarSign size={20} />, color: '#D97706' },
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const selectedRole = (searchParams.get('role') as keyof typeof ROLE_CONFIG) || 'teacher'

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password?role=${selectedRole}`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setSent(true)
      toast.success('Password reset link sent to your email!')
    } catch (e: any) {
      toast.error('Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const config = ROLE_CONFIG[selectedRole] || ROLE_CONFIG.teacher

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <Link href={`/auth/login?role=${selectedRole}`} className="fixed top-6 left-6 md:top-8 md:left-8 z-50 flex items-center gap-2 text-sm font-bold opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'var(--text)' }}>
         <ArrowLeft size={16} /> Back to Login
      </Link>

      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${config.color}20 0%, transparent 70%)` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}aa)` }}
            >
              <Send size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>Forgot Password</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Enter your email to receive a reset link
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                leftIcon={<Mail size={16} />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-widest"
                isLoading={loading}
                style={{ background: config.color }}
              >
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-6 py-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium">
                We&apos;ve sent a password reset link to your email. Please check your inbox (and spam folder).
              </div>
              <Button
                onClick={() => router.push(`/auth/login?role=${selectedRole}`)}
                variant="outline"
                className="w-full h-12 rounded-xl"
              >
                Return to Login
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}
