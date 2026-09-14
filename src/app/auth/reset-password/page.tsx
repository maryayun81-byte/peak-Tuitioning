'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Lock, Eye, EyeOff, Shield, UserCheck, GraduationCap, Users, DollarSign, ArrowLeft, KeyRound } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string()
}).refine(data => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
})
type FormData = z.infer<typeof schema>

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: <Shield size={20} />, color: '#7C3AED' },
  teacher: { label: 'Teacher', icon: <UserCheck size={20} />, color: '#0EA5E9' },
  student: { label: 'Student', icon: <GraduationCap size={20} />, color: '#10B981' },
  parent: { label: 'Parent', icon: <Users size={20} />, color: '#F59E0B' },
  finance: { label: 'Finance', icon: <DollarSign size={20} />, color: '#D97706' },
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  
  const selectedRole = (searchParams.get('role') as keyof typeof ROLE_CONFIG) || 'teacher'
  const linkError = searchParams.get('error')

  // Recovery link state machine:
  //  - 'verifying': we are exchanging ?code= (PKCE) or waiting for the
  //    #access_token hash session to be picked up.
  //  - 'ready': a session exists — the form is usable.
  //  - 'invalid': no session and no code — link expired/used/wrong.
  const [linkState, setLinkState] = useState<'verifying' | 'ready' | 'invalid'>('verifying')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Establish a session from the recovery link, then unlock the form.
  // Normal path: /auth/confirm already exchanged ?code= server-side, so a
  // session exists on arrival. Fallback: very old emails (sent before the
  // confirm route existed) land here directly with ?code= — exchange it
  // client-side so those links still work.
  useEffect(() => {
    let cancelled = false
    const establish = async () => {
      // Supabase dashboard redirects here with ?error=expired when the
      // code exchange failed server-side.
      if (linkError === 'expired') {
        if (!cancelled) setLinkState('invalid')
        return
      }
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            if (!cancelled) setLinkState('invalid')
            return
          }
          // Remove the single-use code from the address bar.
          url.searchParams.delete('code')
          window.history.replaceState({}, '', url.toString())
        }
        const { data: { session } } = await supabase.auth.getSession()
        if (!cancelled) setLinkState(session ? 'ready' : 'invalid')
      } catch {
        if (!cancelled) setLinkState('invalid')
      }
    }
    establish()

    // If the user opens a legacy implicit link (#access_token=...), the
    // client picks the session up asynchronously — unlock when it arrives.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setLinkState('ready')
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase.auth, linkError])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setCompleted(true)
      toast.success('Password updated successfully!')
      // End the recovery session so the user lands on login cleanly
      // (otherwise the active session can auto-bounce them to a dashboard).
      await supabase.auth.signOut()
      
      // Delay redirect to show success state
      setTimeout(() => {
        router.push(`/auth/login?role=${selectedRole}`)
      }, 3000)
    } catch (e: any) {
      toast.error('Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const config = ROLE_CONFIG[selectedRole] || ROLE_CONFIG.teacher

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${config.color}20 0%, transparent 70%)` }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}aa)` }}
            >
              <KeyRound size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>Create New Password</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Set a secure new password for your account
            </p>
          </div>

          {completed ? (
            <div className="text-center space-y-6 py-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium">
                Success! Your password has been reset. Redirecting you to login...
              </div>
              <Button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push(`/auth/login?role=${selectedRole}`)
                }}
                className="w-full h-12 rounded-xl"
                style={{ background: config.color }}
              >
                Go to Login Now
              </Button>
            </div>
          ) : linkState === 'verifying' ? (
            <div className="text-center space-y-6 py-8">
              <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: config.color }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Verifying your reset link…
              </p>
            </div>
          ) : linkState === 'invalid' ? (
            <div className="text-center space-y-6 py-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium">
                This reset link is invalid or has expired (links are single-use and time-limited).
                Please request a fresh one.
              </div>
              <Button
                onClick={() => router.push(`/auth/forgot-password?role=${selectedRole}`)}
                className="w-full h-12 rounded-xl"
                style={{ background: config.color }}
              >
                Request New Link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock size={16} />}
                error={errors.confirm_password?.message}
                {...register('confirm_password')}
              />

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-widest mt-6"
                isLoading={loading}
                style={{ background: config.color }}
              >
                Update Password
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
