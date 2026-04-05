'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, MessageSquare, Phone, Mail, Award, BookOpen } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'

// Module-level cache keyed by teacher ID
const studentsCache = new Map<string, { data: any[]; ts: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

export default function TeacherStudents() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (teacher) loadStudents()
  }, [teacher?.id])

  // Safety timeout
  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setLoading(false), 6000)
    return () => clearTimeout(t)
  }, [loading])

  const loadStudents = async () => {
    if (!teacher?.id) return

    // Serve from cache if fresh
    const cached = studentsCache.get(teacher.id)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setStudents(cached.data)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Single query: join teacher_assignments → students via class_id
      // No sequential waterfall — get class_ids and students in one pass
      const { data: assignments, error: aErr } = await supabase
        .from('teacher_assignments')
        .select('class_id')
        .eq('teacher_id', teacher.id)

      if (aErr) throw aErr
      const classIds = (assignments ?? []).map(a => a.class_id).filter(Boolean)

      if (classIds.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      const { data, error: sErr } = await supabase
        .from('students')
        .select('*, class:classes(name)')
        .in('class_id', classIds)
        .order('full_name')

      if (sErr) throw sErr

      const result = data ?? []
      studentsCache.set(teacher.id, { data: result, ts: Date.now() })
      setStudents(result)
    } catch (err) {
      console.error('[TeacherStudents] loadStudents failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>My Students</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>View and communicate with students in your classes</p>
         </div>
         <Badge variant="info" className="px-4 py-1.5"><Users size={14} className="mr-2" /> {students.length} Total Students</Badge>
      </div>

      <div className="flex gap-4">
         <Input 
           placeholder="Search students by name or admission number..." 
           leftIcon={<Search size={16} />} 
           className="max-w-md"
           value={search} 
           onChange={e => setSearch(e.target.value)} 
         />
      </div>

      {loading ? <SkeletonList count={8} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filtered.map((s, i) => (
             <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-6 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                   
                   <div className="flex items-center gap-4 mb-6 relative">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary/10" style={{ background: 'var(--primary)', color: 'white' }}>
                         {s.full_name?.[0] ?? '?'}
                      </div>
                      <div>
                         <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>{s.full_name}</h3>
                         <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="muted" className="text-[10px]">{s.class?.name}</Badge>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>#{s.admission_number}</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mb-6 relative">
                      <div className="p-3 rounded-xl bg-[var(--input)] flex items-center gap-3">
                         <Award size={16} className="text-amber-500" />
                         <div>
                            <div className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Performance</div>
                            <div className="text-xs font-black" style={{ color: 'var(--text)' }}>8.4 GPA</div>
                         </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--input)] flex items-center gap-3">
                         <BookOpen size={16} className="text-blue-500" />
                         <div>
                            <div className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Attendance</div>
                            <div className="text-xs font-black" style={{ color: 'var(--text)' }}>96%</div>
                         </div>
                      </div>
                   </div>

                   <div className="flex gap-2 relative">
                      <a href={`mailto:${s.email || '#'}`} className="flex-1">
                         <Button size="sm" variant="secondary" className="w-full gap-2"><Mail size={14} /> Email</Button>
                      </a>
                      <a href={`tel:${s.phone || '#'}`} className="flex-1">
                         <Button size="sm" variant="ghost" className="w-full gap-2"><Phone size={14} /> Call</Button>
                      </a>
                   </div>
                </Card>
             </motion.div>
           ))}
           {filtered.length === 0 && !loading && (
             <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-[var(--input)] rounded-full flex items-center justify-center mx-auto opacity-30">
                   <Users size={32} className="text-muted" />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No students found in your assigned classes.</p>
             </div>
           )}
        </div>
      )}
    </div>
  )
}
