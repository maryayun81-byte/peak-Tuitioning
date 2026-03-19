'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, Search, ClipboardList, BookOpen, 
  Map, Calendar, Trash2, Edit, CheckCircle,
  MoreVertical, Download, Link as LinkIcon
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { SchemeOfWork, Subject, Class } from '@/types/database'

export default function TeacherSchemes() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  
  const [schemes, setSchemes] = useState<any[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const [form, setForm] = useState({
    title: '',
    week_number: 1,
    topic: '',
    sub_topic: '',
    objectives: '',
    subject_id: '',
    class_id: '',
    status: 'draft' as 'draft' | 'approved' | 'active',
  })

  useEffect(() => {
    if (teacher?.id) loadData()
  }, [teacher?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [scRes, sRes, cRes] = await Promise.all([
        supabase.from('schemes_of_work').select('*, subject:subjects(name), class:classes(name)').eq('teacher_id', teacher?.id).order('week_number'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('classes').select('*').order('name'),
      ])
      setSchemes(scRes.data ?? [])
      setSubjects(sRes.data ?? [])
      setClasses(cRes.data ?? [])
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

  const handleSave = async () => {
    if (!form.topic || !form.subject_id || !form.class_id) {
       toast.error('Fill in required fields')
       return
    }
    const { error } = await supabase.from('schemes_of_work').insert({
       ...form,
       teacher_id: teacher?.id
    })

    if (error) { toast.error(error.message) }
    else {
       toast.success('Scheme of Work entry saved!')
       setAddOpen(false)
       loadData()
    }
  }

  const deleteScheme = async (id: string) => {
    const { error } = await supabase.from('schemes_of_work').delete().eq('id', id)
    if (error) { toast.error('Check permissions') }
    else { toast.success('Entry removed'); loadData() }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <Map size={24} />
            </div>
            <div>
               <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Schemes of Work</h1>
               <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Plan your teaching roadmap week-by-week</p>
            </div>
         </div>
         <Button onClick={() => setAddOpen(true)}><Plus size={16} className="mr-2" /> New Entry</Button>
      </div>

      {loading ? <SkeletonList count={8} /> : (
        <div className="space-y-4">
           {schemes.length > 0 ? schemes.map((s, i) => (
             <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className="p-4 flex flex-col md:flex-row md:items-center gap-6 group hover:bg-[var(--input)] transition-all">
                   <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl shrink-0" style={{ background: 'var(--bg)', border: '1px solid var(--card-border)' }}>
                      <span className="text-[10px] uppercase font-bold text-muted">Week</span>
                      <span className="text-xl font-black text-primary">{s.week_number}</span>
                   </div>

                   <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                         <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>{s.topic}</h3>
                         <Badge variant={s.status === 'active' ? 'success' : 'muted'} className="text-[9px] uppercase">{s.status}</Badge>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.sub_topic || 'No sub-topics defined'}</p>
                      <div className="flex gap-4 mt-2">
                         <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}><BookOpen size={10} /> {s.subject?.name}</span>
                         <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}><ClipboardList size={10} /> {s.class?.name}</span>
                      </div>
                   </div>

                   <div className="flex gap-2">
                      <button className="p-2 rounded-lg text-muted hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={16} /></button>
                      <button onClick={() => deleteScheme(s.id)} className="p-2 rounded-lg text-danger hover:bg-danger-light opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                      <Button size="sm" variant="secondary" className="hidden md:flex">View Objectives</Button>
                   </div>
                </Card>
             </motion.div>
           )) : (
             <div className="py-20 text-center space-y-4 border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--card-border)' }}>
                <Map size={48} className="mx-auto text-muted opacity-10" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No curriculum plans yet. Click &quot;New Entry&quot; to start planning.</p>
             </div>
           )}
        </div>
      )}

      {/* Add Scheme Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Roadmap Planning" size="md">
         <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
               <div className="col-span-1">
                  <Input label="Week No." type="number" value={form.week_number} onChange={e => setForm({...form, week_number: parseInt(e.target.value)})} />
               </div>
               <div className="col-span-2">
                  <Input label="Main Topic" placeholder="e.g. Intro to Algebra" value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} />
               </div>
            </div>
            <Input label="Sub Topic" placeholder="e.g. Solving for X" value={form.sub_topic} onChange={e => setForm({...form, sub_topic: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-4">
               <Select label="Subject" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </Select>
               <Select label="Class" value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </Select>
            </div>

            <Textarea label="Learning Objectives" placeholder="By the end of this week, students should be able to..." rows={4} value={form.objectives} onChange={e => setForm({...form, objectives: e.target.value})} />
            
            <div className="flex gap-3 justify-end pt-4">
               <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
               <Button onClick={handleSave}>Save Entry</Button>
            </div>
         </div>
      </Modal>
    </div>
  )
}
