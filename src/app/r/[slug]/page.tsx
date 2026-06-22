'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Loader2, BookOpen, ArrowRight, ShieldAlert } from 'lucide-react'

export default function ResourceLinkPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const [resourceTitle, setResourceTitle] = useState('')

  useEffect(() => {
    if (!slug) return

    const titleFromSlug = slug
      .replace(/-[a-z0-9]{6}$/i, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
    setResourceTitle(titleFromSlug)

    const checkAuth = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setStatus('authenticated')
        setTimeout(() => router.push('/student/resources'), 1500)
      } else {
        setStatus('unauthenticated')
      }
    }
    checkAuth()
  }, [slug, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <Loader2 size={40} className="animate-spin mx-auto text-emerald-500" />
          <p className="text-slate-500 font-medium">Loading shared resource...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-6 max-w-md mx-auto p-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <BookOpen size={36} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">{resourceTitle || 'Resource'}</h1>
          <p className="text-slate-500 font-medium">Redirecting you to your resource library...</p>
          <div className="flex justify-center">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <ShieldAlert size={36} className="text-amber-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Resource Shared With You</h1>
        <p className="text-slate-500 font-medium">
          A teacher has shared <span className="font-bold text-slate-700">{resourceTitle || 'a resource'}</span> with you.
          Sign in to access it.
        </p>
        <button
          onClick={() => router.push('/student/resources')}
          className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-all"
        >
          Sign In to View <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
