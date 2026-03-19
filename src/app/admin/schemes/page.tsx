'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, Search, ClipboardList, BookOpen, 
  Map, Calendar, Trash2, Edit, CheckCircle,
  MoreVertical, Download, Link as LinkIcon,
  Filter, User, GraduationCap
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AdminSchemes() {
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [schemes, setSchemes] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [curriculums, setCurriculums] = useState<any[]>([])

  const [filters, setFilters] = useState({
    search: '',
    curriculumId: 'all',
    classId: 'all',
    subjectId: 'all',
    teacherId: 'all',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [scRes, sRes, cRes, tRes, cuRes] = await Promise.all([
        supabase.from('schemes_of_work').select('*, subject:subjects(name), class:classes(name, curriculum_id), teacher:profiles!created_by(full_name)').order('week_number'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('profiles').select('id, full_name').eq('role', 'teacher').order('full_name'),
        supabase.from('curriculums').select('*').order('name'),
      ])

      setSchemes(scRes.data ?? [])
      setSubjects(sRes.data ?? [])
      setClasses(cRes.data ?? [])
      setTeachers(tRes.data ?? [])
      setCurriculums(cuRes.data ?? [])
    } catch (e) {
      console.error('Failed to load schemes:', e)
    } finally {
      setLoading(false)
    }
  }

  // Safety timeout
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), 5000)
      return () => clearTimeout(t)
    }
  }, [loading])

  const filtered = schemes.filter(s => {
    const q = filters.search.toLowerCase()
    const matchesSearch = s.topic.toLowerCase().includes(q) || s.teacher?.full_name.toLowerCase().includes(q)
    const matchesCurriculum = filters.curriculumId === 'all' || s.class?.curriculum_id === filters.curriculumId
    const matchesClass = filters.classId === 'all' || s.class_id === filters.classId
    const matchesSubject = filters.subjectId === 'all' || s.subject_id === filters.subjectId
    const matchesTeacher = filters.teacherId === 'all' || s.created_by === filters.teacherId
    
    return matchesSearch && matchesCurriculum && matchesClass && matchesSubject && matchesTeacher
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <Map size={24} />
            </div>
            <div>
               <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Global Schemes of Work</h1>
               <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Monitor and manage teaching plans across all classes</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Total Plans" value={schemes.length} icon={<Map size={20} />} />
         <StatCard title="Teachers" value={teachers.length} icon={<User size={20} />} />
         <StatCard title="Classes" value={classes.length} icon={<GraduationCap size={20} />} />
         <StatCard title="Subjects" value={subjects.length} icon={<BookOpen size={20} />} />
      </div>

      <div className="flex flex-col gap-4 p-4 rounded-3xl bg-[var(--card)] border border-[var(--card-border)] shadow-sm">
         <div className="flex items-center gap-2 mb-2">
            <Filter size={16} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Filters</span>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input 
              placeholder="Search topic or teacher..." 
              leftIcon={<Search size={16} />} 
              value={filters.search} 
              onChange={e => setFilters({...filters, search: e.target.value})} 
            />
            <Select value={filters.curriculumId} onChange={e => setFilters({...filters, curriculumId: e.target.value})}>
               <option value="all">All Curriculums</option>
               {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={filters.classId} onChange={e => setFilters({...filters, classId: e.target.value})}>
               <option value="all">All Classes</option>
               {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={filters.subjectId} onChange={e => setFilters({...filters, subjectId: e.target.value})}>
               <option value="all">All Subjects</option>
               {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select value={filters.teacherId} onChange={e => setFilters({...filters, teacherId: e.target.value})}>
               <option value="all">All Teachers</option>
               {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </Select>
         </div>
      </div>

      {loading ? <SkeletonList count={8} /> : (
        <div className="space-y-4">
           {filtered.length > 0 ? filtered.map((s, i) => (
             <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className="p-4 flex flex-col md:flex-row md:items-center gap-6 group hover:bg-[var(--input)] transition-all">
                   <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl shrink-0" style={{ background: 'var(--bg)', border: '1px solid var(--card-border)' }}>
                      <span className="text-[10px] uppercase font-bold text-muted">Week</span>
                      <span className="text-xl font-black text-primary">{s.week_number}</span>
                   </div>

                   <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>{s.topic}</h3>
                            <Badge variant={s.status === 'active' ? 'success' : 'muted'} className="text-[9px] uppercase">{s.status}</Badge>
                         </div>
                         <div className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            Teacher: <span className="text-primary">{s.teacher?.full_name}</span>
                         </div>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.sub_topic || 'No sub-topics defined'}</p>
                      <div className="flex gap-4 mt-2">
                         <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}><BookOpen size={10} /> {s.subject?.name}</span>
                         <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}><ClipboardList size={10} /> {s.class?.name}</span>
                      </div>
                   </div>

                   <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="hidden md:flex">Review Objectives</Button>
                      <button className="p-2 rounded-lg text-danger hover:bg-danger-light opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                   </div>
                </Card>
             </motion.div>
           )) : (
             <div className="py-24 text-center space-y-4 border-2 border-dashed rounded-[2.5rem]" style={{ borderColor: 'var(--card-border)' }}>
                <Map size={48} className="mx-auto text-muted opacity-10" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No curriculum plans found matching your filters.</p>
                <Button variant="ghost" size="sm" onClick={() => setFilters({search: '', curriculumId: 'all', classId: 'all', subjectId: 'all', teacherId: 'all'})}>Clear all filters</Button>
             </div>
           )}
        </div>
      )}
    </div>
  )
}
