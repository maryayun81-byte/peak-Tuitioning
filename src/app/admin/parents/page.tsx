'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, Search, Filter, MessageSquare, 
  Phone, Mail, GraduationCap, ChevronRight,
  ExternalLink, UserPlus, Trash2, ShieldCheck
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AdminParents() {
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [parents, setParents] = useState<any[]>([])
  const [curriculums, setCurriculums] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])

  const [filters, setFilters] = useState({
    search: '',
    curriculumId: 'all',
    classId: 'all',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch parents with their linked students
      const [pRes, cuRes, clRes] = await Promise.all([
        supabase
          .from('parent_student_links')
          .select(`
            parent:profiles!parent_id(id, full_name, email, phone),
            student:students(id, full_name, admission_number, class:classes(id, name, curriculum_id))
          `),
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('classes').select('*').order('name'),
      ])

      // Group links by parent
      const parentMap = new Map()
      const rawLinks = pRes.data ?? []
      
      rawLinks.forEach((link: any) => {
        if (!link.parent) return
        if (!parentMap.has(link.parent.id)) {
          parentMap.set(link.parent.id, {
            ...link.parent,
            students: []
          })
        }
        if (link.student) {
          parentMap.get(link.parent.id).students.push(link.student)
        }
      })

      setParents(Array.from(parentMap.values()))
      setCurriculums(cuRes.data ?? [])
      setClasses(clRes.data ?? [])
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

  const filtered = parents.filter(p => {
    const q = filters.search.toLowerCase()
    const matchesSearch = p.full_name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.students.some((s: any) => s.full_name.toLowerCase().includes(q))
    
    const matchesCurriculum = filters.curriculumId === 'all' || p.students.some((s: any) => s.class?.curriculum_id === filters.curriculumId)
    const matchesClass = filters.classId === 'all' || p.students.some((s: any) => s.class?.id === filters.classId)
    
    return matchesSearch && matchesCurriculum && matchesClass
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <ShieldCheck size={24} />
            </div>
            <div>
               <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Parent Management</h1>
               <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Oversee parent-student links and administrative profiles</p>
            </div>
         </div>
         <Button><UserPlus size={16} className="mr-2" /> Add Parent Account</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         <StatCard title="Total Parents" value={parents.length} icon={<Users size={20} />} />
         <StatCard title="Active Links" value={parents.reduce((acc, p) => acc + p.students.length, 0)} icon={<GraduationCap size={20} />} />
         <StatCard title="Communications" value="48 today" icon={<MessageSquare size={20} />} change="+12%" changeType="up" />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
         <Input 
           placeholder="Search name, email or student..." 
           leftIcon={<Search size={16} />} 
           className="flex-1"
           value={filters.search} 
           onChange={e => setFilters({...filters, search: e.target.value})} 
         />
         <Select value={filters.curriculumId} onChange={e => setFilters({...filters, curriculumId: e.target.value})} className="w-full md:w-48">
            <option value="all">All Curriculums</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
         </Select>
         <Select value={filters.classId} onChange={e => setFilters({...filters, classId: e.target.value})} className="w-full md:w-48">
            <option value="all">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
         </Select>
      </div>

      {loading ? <SkeletonList count={8} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {filtered.length > 0 ? filtered.map((p, i) => (
             <motion.div key={p.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                <Card className="p-6 h-full flex flex-col group border border-[var(--card-border)] hover:bg-[var(--input)] transition-all">
                   <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #10B981, #3B82F6)' }}>
                            {p.full_name[0]}
                         </div>
                         <div>
                            <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>{p.full_name}</h3>
                            <div className="flex gap-3 mt-1">
                               <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}><Mail size={10} /> {p.email}</span>
                               <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}><Phone size={10} /> {p.phone || 'No phone'}</span>
                            </div>
                         </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-2 rounded-lg text-danger hover:bg-danger-light"><Trash2 size={16} /></button>
                      </div>
                   </div>

                   <div className="space-y-3 flex-1 mb-6">
                      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Linked Students</div>
                      <div className="grid grid-cols-1 gap-2">
                         {p.students.length > 0 ? p.students.map((s: any) => (
                           <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--card-border)]">
                              <div className="flex items-center gap-3">
                                 <GraduationCap size={16} className="text-primary" />
                                 <div>
                                    <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>{s.full_name}</div>
                                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.class?.name} • #{s.admission_number}</div>
                                 </div>
                              </div>
                              <ExternalLink size={14} className="text-muted opacity-50" />
                           </div>
                         )) : (
                           <div className="text-xs italic p-4 text-center rounded-xl bg-[var(--bg)]" style={{ color: 'var(--text-muted)' }}>No students linked yet</div>
                         )}
                      </div>
                   </div>

                   <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="flex-1">Manage Links</Button>
                      <Button size="sm" variant="ghost" className="flex-1">View Profile</Button>
                   </div>
                </Card>
             </motion.div>
           )) : (
             <div className="col-span-full py-24 text-center space-y-4 border-2 border-dashed rounded-[2.5rem]" style={{ borderColor: 'var(--card-border)' }}>
                <Users size={48} className="mx-auto text-muted opacity-10" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No parent accounts found matching your filters.</p>
             </div>
           )}
        </div>
      )}
    </div>
  )
}
