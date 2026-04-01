'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, DollarSign, Search, Eye, EyeOff, Copy } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { formatDate, generateTempPassword } from '@/lib/utils'

interface Financier {
  id: string
  full_name: string
  email: string
  created_at: string
  role: string
}

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Minimum 8 characters'),
})
type FormData = z.infer<typeof schema>

export default function AdminFinanciers() {
  const supabase = getSupabaseBrowserClient()
  const [financiers, setFinanciers] = useState<Financier[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [generatedPass, setGeneratedPass] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at, role')
        .eq('role', 'finance')
        .order('created_at', { ascending: false })
      setFinanciers(data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  const generatePassword = () => {
    const pass = generateTempPassword()
    setGeneratedPass(pass)
    setValue('password', pass)
  }

  const onSubmit = async (data: FormData) => {
    setCreating(true)
    try {
      // Call admin create user endpoint via Supabase admin API
      // Since we're in client context, we use the signUp flow and update role via metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: 'finance',
          }
        }
      })

      if (authError) {
        toast.error(authError.message)
        return
      }

      if (authData.user) {
        // Update the profile role
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: data.full_name,
          email: data.email,
          role: 'finance',
        })
        toast.success(`Financier account created! Credentials: ${data.email} / ${data.password}`, {
          duration: 10000
        })
        reset()
        setGeneratedPass('')
        setAddOpen(false)
        loadData()
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create account')
    } finally {
      setCreating(false)
    }
  }

  const deactivate = async (id: string) => {
    if (!confirm('Remove this financier account?')) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Financier removed')
    loadData()
  }

  const filtered = financiers.filter(f =>
    f.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Financiers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {financiers.length} finance portal user(s)
          </p>
        </div>
        <Button onClick={() => { reset(); setGeneratedPass(''); setAddOpen(true) }}>
          <Plus size={16} /> Add Financier
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by name or email…"
        leftIcon={<Search size={16} />}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* List */}
      {loading ? <SkeletonList count={4} /> : (
        <div className="space-y-3">
          {filtered.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(245,158,11,0.1)' }}>
                      <DollarSign size={20} style={{ color: '#F59E0B' }} />
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text)' }}>{f.full_name}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{f.email}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Added {formatDate(f.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                      Finance
                    </span>
                    <button
                      onClick={() => deactivate(f.id)}
                      className="p-2 rounded-xl hover:bg-rose-500/10 transition-colors text-rose-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <Card className="p-12 text-center">
              <DollarSign size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>No financier accounts yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Create one to grant access to the Finance Portal
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Add Financier Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); reset(); setGeneratedPass('') }} title="Create Financier Account" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
            ⚠️ The financier can only access the Finance Portal, not the Admin area.
          </p>

          <Input
            label="Full Name"
            placeholder="Jane Mwangi"
            error={errors.full_name?.message}
            {...register('full_name')}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="finance@peak.ac.ke"
            error={errors.email?.message}
            {...register('email')}
          />

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Password</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Temporary password"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none pr-10"
                  style={{ background: 'var(--input)', color: 'var(--text)', border: `1px solid ${errors.password ? '#EF4444' : 'var(--card-border)'}` }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={generatePassword}>
                Generate
              </Button>
            </div>
            {errors.password && <p className="text-xs mt-1 text-rose-400">{errors.password.message}</p>}
            {generatedPass && (
              <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: 'var(--input)' }}>
                <code className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>{generatedPass}</code>
                <button type="button" onClick={() => { navigator.clipboard.writeText(generatedPass); toast.success('Copied!') }}>
                  <Copy size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => { setAddOpen(false); reset() }}>Cancel</Button>
            <Button type="submit" isLoading={creating}>Create Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
