'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { GraduationCap, Mail, Lock, Eye, EyeOff, Shield, UserCheck, Users, ArrowLeft, DollarSign } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  email: z.string().min(3, 'Required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: <Shield size={20} />, color: '#7C3AED', desc: 'Manage everything' },
  teacher: { label: 'Teacher', icon: <UserCheck size={20} />, color: '#0EA5E9', desc: 'Teach & mentor' },
  student: { label: 'Student', icon: <GraduationCap size={20} />, color: '#10B981', desc: 'Learn & grow' },
  parent: { label: 'Parent', icon: <Users size={20} />, color: '#F59E0B', desc: 'Stay informed' },
  finance: { label: 'Finance', icon: <DollarSign size={20} />, color: '#D97706', desc: 'Manage finances' },
}

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
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
      let loginIdentifier = data.email
      if (selectedRole === 'student' && !loginIdentifier.includes('@')) {
        loginIdentifier = `${loginIdentifier.toLowerCase().trim()}@student.peak.edu`
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

        // Redirect IMMEDIATELY — don't wait for data to load.
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      <Link href="/" className="fixed top-6 left-6 md:top-8 md:left-8 z-50 flex items-center gap-2 text-sm font-bold opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'var(--text)' }}>
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
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}aa)` }}
              >
                {config.icon}
              </div>
            </Link>
            <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>Welcome Back</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to your {config.label} portal
            </p>
          </div>

          {/* Role tabs */}
          <div className="grid grid-cols-5 gap-1.5 mb-6 p-1 rounded-xl" style={{ background: 'var(--input)' }}>
            {(Object.keys(ROLE_CONFIG) as (keyof typeof ROLE_CONFIG)[]).map((role) => (
              <Link
                key={role}
                href={`/auth/login?role=${role}`}
                className="py-2 px-1 rounded-lg text-xs font-semibold text-center transition-all"
                style={{
                  background: selectedRole === role ? 'var(--card)' : 'transparent',
                  color: selectedRole === role ? ROLE_CONFIG[role].color : 'var(--text-muted)',
                  boxShadow: selectedRole === role ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                {ROLE_CONFIG[role].label}
              </Link>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={selectedRole === 'student' ? 'Admission Number' : 'Email'}
              type={selectedRole === 'student' ? 'text' : 'email'}
              placeholder={selectedRole === 'student' ? 'PPT-2026-00001' : 'your@email.com'}
              leftIcon={selectedRole === 'student' ? <GraduationCap size={16} /> : <Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="space-y-1.5">
              <Input
                label="Password"
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
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={loading}
              style={{ background: config.color }}
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
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
