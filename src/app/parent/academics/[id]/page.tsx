'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Trophy, TrendingUp, Calendar, 
  Award, BrainCircuit, Zap,
  CheckCircle2, Clock, Target,
  Download, ArrowRight, User,
  FileText, MessageSquare, Star,
  LineChart as LineChartIcon
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'

export default function ParentAcademicReport() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const [subjectStats, setSubjectStats] = useState<any[]>([])
  const [transcripts, setTranscripts] = useState<any[]>([])
  const [remarks, setRemarks] = useState<any[]>([])

  useEffect(() => {
    if (profile) loadData()
  }, [id, profile])

  const loadData = async () => {
    setLoading(true)
    const [sRes, tRes] = await Promise.all([
      supabase.from('students').select('*, class:classes(name)').eq('id', id).single(),
      supabase.from('transcripts').select('*').eq('student_id', id).order('created_at', { ascending: false })
    ])
    
    setStudent(sRes.data)
    setTranscripts(tRes.data ?? [])

    // Mock subject analytics for the radar chart
    setSubjectStats([
      { subject: 'Math', score: 85, fullMark: 100 },
      { subject: 'English', score: 78, fullMark: 100 },
      { subject: 'Science', score: 92, fullMark: 100 },
      { subject: 'History', score: 65, fullMark: 100 },
      { subject: 'Arts', score: 88, fullMark: 100 },
      { subject: 'Phys Ed', score: 95, fullMark: 100 },
    ])

    // Mock teacher remarks
    setRemarks([
      { teacher: 'Mr. Gabriel', subject: 'Physics', text: 'Exceptionally focused on practical experiments. Top of her class in mechanics.', date: 'Mar 12' },
      { teacher: 'Ms. Sarah', subject: 'Mathematics', text: 'Consistent performance in Calculus. Should work more on geometry speed.', date: 'Mar 05' },
    ])

    setLoading(false)
  }

  if (loading) return <SkeletonDashboard />
  if (!student) return <div>Access denied or student not found.</div>

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2.5 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--input)]"><ChevronLeft size={20} /></button>
            <div>
               <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Academic Intelligence</h1>
               <div className="flex items-center gap-2 mt-1">
                  <Badge variant="primary" className="text-[10px] px-3">{student.full_name}</Badge>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{student.class?.name}</span>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Mastery Radar Graph */}
         <Card className="p-8 lg:col-span-1 space-y-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted">Subject Competency</h3>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectStats}>
                     <PolarGrid stroke="var(--card-border)" />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                     <PolarRadiusAxis hide domain={[0, 100]} />
                     <Radar
                        name={student.full_name}
                        dataKey="score"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.6}
                     />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
            <div className="pt-4 border-t border-[var(--card-border)]">
               <p className="text-[10px] leading-relaxed text-center" style={{ color: 'var(--text-muted)' }}>
                  This radar map shows the student&apos;s strength across various fields. Science and Phys Ed are currently the strongest points.
               </p>
            </div>
         </Card>

         {/* Transcripts & Documents */}
         <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
               <h3 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <FileText size={20} className="text-primary" /> Reports & Certification
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transcripts.length > 0 ? transcripts.map((t, i) => (
                    <Card key={i} className="p-6 flex items-center justify-between group hover:bg-primary/5 transition-all border-dashed">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                             <Award size={24} />
                          </div>
                          <div>
                             <h4 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t.title || 'Term Exam Transcript'}</h4>
                             <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Posted {formatDate(t.created_at, 'short')}</p>
                          </div>
                       </div>
                       <Button size="sm" variant="secondary" className="rounded-xl group-hover:bg-primary group-hover:text-white"><Download size={14} /></Button>
                    </Card>
                  )) : (
                    <div className="col-span-full py-12 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--card-border)' }}>
                       <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No official transcripts published yet for the current term.</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Teacher Remarks */}
            <div className="space-y-4">
               <h3 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <MessageSquare size={20} className="text-secondary" /> Faculty Feedback
               </h3>
               <div className="space-y-4">
                  {remarks.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                       <Card className="p-6 border-none shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4">
                             <Badge variant="muted" className="text-[8px]">{r.date}</Badge>
                          </div>
                          <div className="flex gap-4">
                             <div className="w-10 h-10 rounded-xl bg-[var(--input)] flex items-center justify-center font-black text-xs text-muted">
                                {r.teacher[0]}
                             </div>
                             <div>
                                <h4 className="text-xs font-black" style={{ color: 'var(--text)' }}>{r.teacher}</h4>
                                <p className="text-[10px] text-primary font-bold">{r.subject}</p>
                                <p className="mt-3 text-sm leading-relaxed italic" style={{ color: 'var(--text-muted)' }}>
                                   &quot;{r.text}&quot;
                                </p>
                             </div>
                          </div>
                       </Card>
                    </motion.div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}

import { ChevronLeft } from 'lucide-react'
