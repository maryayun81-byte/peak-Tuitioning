'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { GraduationCap, Mail, Lock, Eye, EyeOff, User, Shield, UserCheck, Users, Phone, ArrowLeft } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { generateParentCode } from '@/lib/utils'

type Role = 'teacher' | 'parent'

const schema = z.object({
  full_name: z.string().min(2, 'Full name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm_password: z.string(),
  // Student specific
  admission_number: z.string().optional(),
  parent_code: z.string().optional(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

const ROLE_CONFIG = {
  teacher: { label: 'Teacher', icon: <UserCheck size={20} />, color: '#0EA5E9' },
  parent: { label: 'Parent', icon: <Users size={20} />, color: '#F59E0B' },
}

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const selectedRole = (searchParams.get('role') as Role) || 'teacher'
  const config = ROLE_CONFIG[selectedRole] || ROLE_CONFIG.teacher

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      // Sign up
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: selectedRole,
          },
        },
      })

      if (error) {
        console.error('Registration auth.signUp error:', error)
        toast.error(error.message)
        return
      }

      if (!authData.user) {
        toast.error('Something went wrong. Please try again.')
        return
      }

      const userId = authData.user.id

      // Role-specific record creation
      if (selectedRole === 'teacher') {
        const { error: e2 } = await supabase.from('teachers').upsert({
          user_id: userId,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          onboarded: false,
        }, { onConflict: 'email' })
        if (e2) { 
          console.error('Teacher profile creation error:', e2)
          toast.error('Account created but profile setup failed: ' + e2.message)
          return 
        }
      } else if (selectedRole === 'parent') {
        const parentCode = generateParentCode()
        const { error: e2 } = await supabase.from('parents').insert({
          user_id: userId,
          parent_code: parentCode,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
        })
        if (e2) { 
          console.error('Parent profile creation error:', e2)
          toast.error('Account created but profile setup failed: ' + e2.message)
          return 
        }
        toast.success(`Your Parent Code: ${parentCode} — share this with your child!`, { duration: 8000 })
      }

      toast.success('Account created! Please check your email to verify.')
      router.push(`/auth/login?role=${selectedRole}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <Link href="/" className="fixed top-6 left-6 md:top-8 md:left-8 z-50 flex items-center gap-2 text-sm font-bold opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'var(--text)' }}>
         <ArrowLeft size={16} /> Back to Home
      </Link>
      {/* Glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${config.color}20 0%, transparent 70%)` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-3xl p-8" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}aa)` }}
              >
                {config.icon}
              </div>
            </Link>
            <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>Create Account</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Join as a {config.label}</p>
          </div>

          {/* Role tabs */}
          <div className="grid grid-cols-3 gap-2 mb-6 p-1 rounded-xl" style={{ background: 'var(--input)' }}>
            {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => (
              <Link
                key={role}
                href={`/auth/register?role=${role}`}
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Full Name" placeholder="Your full name" leftIcon={<User size={16} />} error={errors.full_name?.message} {...register('full_name')} />
            <Input label="Email" type="email" placeholder="your@email.com" leftIcon={<Mail size={16} />} error={errors.email?.message} {...register('email')} />
            <Input label="Phone (optional)" type="tel" placeholder="+254 7XX XXX XXX" leftIcon={<Phone size={16} />} {...register('phone')} />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 characters"
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
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              leftIcon={<Lock size={16} />}
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />

            <Button type="submit" className="w-full" size="lg" isLoading={loading} style={{ background: config.color }}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href={`/auth/login?role=${selectedRole}`} className="font-semibold" style={{ color: config.color }}>
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
