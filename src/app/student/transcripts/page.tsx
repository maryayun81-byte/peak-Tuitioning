'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Award,
  Calendar, TrendingUp, Expand
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
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

  // Average always computed from the subject rows — some generator paths
  // never stored average_score, which rendered as "undefined%".
  const latestAvg = (() => {
    const rows = ((transcripts[0] as any)?.subject_results || []) as any[]
    const vals = rows
      .map(r => r.percentage ?? r.percent ?? (r.marks != null ? (Number(r.marks) / (Number(r.max_marks ?? r.max_mark ?? 100) || 100)) * 100 : null))
      .filter((v): v is number => v != null && !isNaN(Number(v)))
      .map(Number)
    if (vals.length === 0) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  })()

  if (loading) return <div className="p-6"><SkeletonList count={3} /></div>

  return (
    <div className="p-6 space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Award className="text-primary" /> Transcripts
        </h1>
        <p className="text-sm text-muted-foreground">Your academic records — tap a document to open it.</p>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard 
           title="Latest Grade" 
            value={transcripts[0]?.overall_grade || '–'}
           icon={<Award size={18} />} 
         />
          <StatCard
            title="Average Score"
            value={latestAvg != null ? `${latestAvg}%` : '–'}
            icon={<TrendingUp size={18} />}
          />
         <StatCard 
           title="Reports Available" 
           value={transcripts.length} 
           icon={<FileText size={18} />} 
         />
      </div>

      {/* Document library: snapshots, never full pages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {transcripts.length > 0 ? transcripts.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link href={`/student/transcripts/${t.id}`} className="group block">
              <div className="transition-transform duration-300 group-hover:-translate-y-1.5">
                <TranscriptSnapshot transcript={t} student={student} compact />
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-xs font-bold truncate">
                  {(t as any).exam_event?.name || (t as any).title || 'Transcript'}
                </p>
                <span className="flex items-center gap-1 text-[11px] font-black shrink-0 ml-2" style={{ color: 'var(--primary)' }}>
                  <Expand size={12} /> Open
                </span>
              </div>
            </Link>
          </motion.div>
        )) : (
          <Card className="p-20 text-center border-dashed col-span-full">
             <Calendar className="mx-auto mb-3 opacity-10" size={48} />
             <p className="text-sm font-medium text-muted-foreground">Your transcripts will appear here once they are published by the administrator.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
