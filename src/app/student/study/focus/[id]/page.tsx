'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FocusMode } from '@/components/student/study/FocusMode'
import { ReflectionSystem } from '@/components/student/study/ReflectionSystem'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { SkeletonDashboard } from '@/components/ui/Skeleton'

export default function FocusPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [phase, setPhase] = useState<'focus' | 'reflection' | 'complete'>('focus')

  useEffect(() => {
    if (id) loadSession()
  }, [id])

  const loadSession = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('study_sessions')
      .select('*, goals:study_goals(*), subject:subjects(name)')
      .eq('id', id)
      .single()
    
    setSession(data)
    setLoading(false)
  }

  if (loading) return <SkeletonDashboard />
  if (!session) return <div>Session not found</div>

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {phase === 'focus' && (
        <FocusMode 
          session={session} 
          onComplete={() => setPhase('reflection')} 
          onCancel={() => router.push('/student/study')}
        />
      )}

      {phase === 'reflection' && (
        <ReflectionSystem 
          session={session} 
          onComplete={() => router.push('/student/study')}
        />
      )}
    </div>
  )
}
