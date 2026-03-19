'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, Download, Eye, Award, 
  ChevronRight, Calendar, Search, TrendingUp
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { Transcript } from '@/types/database'

export default function StudentTranscriptsPage() {
  const supabase = getSupabaseBrowserClient()
  const { profile, student } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [transcripts, setTranscripts] = useState<Transcript[]>([])

  useEffect(() => {
    if (student) loadTranscripts()
  }, [student])

  const loadTranscripts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*, exam_event:exam_events(name, start_date)')
        .eq('student_id', student!.id)
        .eq('is_published', true) // Critical: only show published ones
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTranscripts(data || [])
    } catch (err) {
      console.error('Error loading student transcripts:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6"><SkeletonList count={3} /></div>

  return (
    <div className="p-6 space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Award className="text-primary" /> My Transcripts
          </h1>
          <p className="text-sm text-muted-foreground">Access your official academic performance reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard 
           title="Latest Grade" 
           value={transcripts[0]?.overall_grade || 'N/A'} 
           icon={<Award size={18} />} 
         />
         <StatCard 
           title="Average Score" 
           value={transcripts.length > 0 ? `${transcripts[0].average_score?.toFixed(1)}%` : 'N/A'} 
           icon={<TrendingUp size={18} />} 
         />
         <StatCard 
           title="Reports Available" 
           value={transcripts.length} 
           icon={<FileText size={18} />} 
         />
      </div>

      <div className="space-y-4">
        {transcripts.length > 0 ? transcripts.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={`/student/transcripts/${t.id}`}>
              <Card className="p-4 hover:border-primary transition-all cursor-pointer flex items-center justify-between group">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--primary-dim)] text-primary">
                      <FileText size={24} />
                   </div>
                   <div>
                      <h3 className="font-bold text-sm group-hover:text-primary transition-colors">
                        {(t as any).exam_event?.name || t.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Released: {formatDate(t.published_at || t.created_at)} · Grade: {t.overall_grade}
                      </p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="hidden md:block text-right">
                      <div className="text-xs font-black" style={{ color: 'var(--primary)' }}>{t.average_score?.toFixed(1)}%</div>
                      <div className="text-[10px] text-muted-foreground">Average</div>
                   </div>
                   <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>
          </motion.div>
        )) : (
          <Card className="p-20 text-center border-dashed">
             <Calendar className="mx-auto mb-3 opacity-10" size={48} />
             <p className="text-sm font-medium text-muted-foreground">Your transcripts will appear here once they are published by the administrator.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
