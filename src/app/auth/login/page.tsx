'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { GraduationCap, Mail, Lock, Eye, EyeOff, Shield, UserCheck, Users, ArrowLeft, DollarSign, LogIn, Sparkles, Hash } from 'lucide-react'
import { getSupabaseLoginClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  email: z.string().min(3, 'Required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

const ROLE_CONFIG = {
  admin: { label: 'Admin', Icon: Shield, color: '#7C3AED', desc: 'Manage everything' },
  teacher: { label: 'Teacher', Icon: UserCheck, color: '#0EA5E9', desc: 'Teach & mentor' },
  student: { label: 'Student', Icon: GraduationCap, color: '#10B981', desc: 'Learn & grow' },
  parent: { label: 'Parent', Icon: Users, color: '#F59E0B', desc: 'Stay informed' },
  finance: { label: 'Finance', Icon: DollarSign, color: '#D97706', desc: 'Manage finances' },
}

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = getSupabaseLoginClient()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const selectedRole = (searchParams.get('role') as keyof typeof ROLE_CONFIG) || 'student'

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Handle errors from middleware (e.g. role mismatch)
  useEffect(() => {
    const errorType = searchParams.get('error')
    const fromRole = searchParams.get('from')
    
    if (errorType === 'role_mismatch') {
      toast.error(`You were redirected because your account is registered as a ${fromRole}, not an ${selectedRole}.`, {
        id: 'role-mismatch-error', // Prevent duplicate toasts
        duration: 5000
      })
      // Clear the URL params without refreshing to avoid showing the toast again on refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      url.searchParams.delete('from')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, selectedRole])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      let loginIdentifier = data.email.toLowerCase().trim()
      if (selectedRole === 'student' && !loginIdentifier.includes('@')) {
        loginIdentifier = `${loginIdentifier}@student.peak.edu`
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginIdentifier,
        password: data.password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (authData.user) {
        // Strict Role Enforcement
        const userRole = authData.user.app_metadata?.role || authData.user.user_metadata?.role
        
        if (userRole && userRole !== selectedRole) {
          await supabase.auth.signOut()
          toast.error(`Access Denied: Your account is registered as a ${userRole}.`)
          return
        }

        toast.success(`Successfully logged in as ${selectedRole}! Welcome back.`)

        // Redirect IMMEDIATELY â€” don't wait for data to load.
        // AuthHandler fires SIGNED_IN event and loads profile+student in background.
        // The portal renders with cached data (or skeleton) while fresh data arrives.
        router.push(`/${selectedRole}`)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const config = ROLE_CONFIG[selectedRole]
  const RoleIcon = config.Icon

  return (
    <div
      className="min-h-[100dvh] flex items-start sm:items-center justify-center px-3 py-4 sm:p-6 overflow-x-hidden"
      style={{ background: 'var(--bg)' }}
    >
      <Link href="/" className="fixed top-3 left-3 sm:top-6 sm:left-6 md:top-8 md:left-8 z-50 flex items-center gap-2 px-3 h-10 rounded-xl bg-[var(--card)]/80 border border-[var(--card-border)] backdrop-blur-xl text-xs sm:text-sm font-bold opacity-80 hover:opacity-100 transition-opacity" style={{ color: 'var(--text)' }}>
         <ArrowLeft size={16} /> Back to Home
      </Link>
      {/* Background glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${config.color}20 0%, transparent 70%)` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[460px] mt-14 sm:mt-0"
      >
        {/* Card */}
        <div
          className="rounded-[26px] sm:rounded-[32px] px-4 py-5 sm:p-8 shadow-2xl shadow-black/10 overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        >
          {/* Logo */}
          <div className="text-center mb-5 sm:mb-7">
            <Link href="/">
              <div
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] sm:rounded-[22px] flex items-center justify-center mx-auto mb-3 sm:mb-4 text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}aa)` }}
              >
                <RoleIcon size={25} />
                <span className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-[var(--card)] flex items-center justify-center">
                  <Sparkles size={11} style={{ color: config.color }} />
                </span>
              </div>
            </Link>
            <h1 className="text-[26px] sm:text-3xl font-black tracking-tight mb-1" style={{ color: 'var(--text)' }}>Welcome Back</h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to your {config.label} portal
            </p>
          </div>

          {/* Role tabs */}
          <div className="-mx-1 mb-5 sm:mb-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex sm:grid sm:grid-cols-5 gap-2 min-w-max sm:min-w-0 p-1 rounded-2xl" style={{ background: 'var(--input)' }}>
            {(Object.keys(ROLE_CONFIG) as (keyof typeof ROLE_CONFIG)[]).map((role) => (
              <Link
                key={role}
                href={`/auth/login?role=${role}`}
                className="min-w-[72px] sm:min-w-0 h-14 px-2 rounded-xl text-[10px] font-bold text-center transition-all flex flex-col items-center justify-center gap-1"
                style={{
                  background: selectedRole === role ? 'var(--card)' : 'transparent',
                  color: selectedRole === role ? ROLE_CONFIG[role].color : 'var(--text-muted)',
                  boxShadow: selectedRole === role ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                {(() => {
                  const Icon = ROLE_CONFIG[role].Icon
                  return <Icon size={17} />
                })()}
                {ROLE_CONFIG[role].label}
              </Link>
            ))}
          </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            <Input
              label={selectedRole === 'student' ? 'Admission Number' : 'Email'}
              type={selectedRole === 'student' ? 'text' : 'email'}
              placeholder={selectedRole === 'student' ? 'PPT-2026-00001' : 'your@email.com'}
              leftIcon={selectedRole === 'student' ? <Hash size={19} /> : <Mail size={19} />}
              error={errors.email?.message}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete={selectedRole === 'student' ? 'username' : 'email'}
              inputMode={selectedRole === 'student' ? 'text' : 'email'}
              className="!h-[54px] !rounded-2xl !text-base !pl-12 !pr-4 font-semibold"
              {...register('email')}
            />
            <div className="space-y-1.5">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                leftIcon={<Lock size={19} />}
                rightIcon={
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                }
                error={errors.password?.message}
                autoComplete="current-password"
                className="!h-[54px] !rounded-2xl !text-base !pl-12 !pr-14 font-semibold"
                {...register('password')}
              />
              <div className="flex justify-end">
                <Link 
                  href={`/auth/forgot-password?role=${selectedRole}`}
                  className="text-xs font-bold py-1 opacity-70 hover:opacity-100 transition-opacity"
                  style={{ color: config.color }}
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full !h-[54px] !rounded-2xl !text-sm !font-black shadow-lg"
              size="lg"
              isLoading={loading}
              style={{ background: config.color }}
            >
              <span className="inline-flex items-center gap-2"><LogIn size={18} /> Sign In to {config.label}</span>
            </Button>
          </form>

          <p className="text-center text-xs sm:text-sm mt-5 sm:mt-6" style={{ color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link
              href={`/auth/register?role=${selectedRole}`}
              className="font-semibold hover:opacity-80"
              style={{ color: config.color }}
            >
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
