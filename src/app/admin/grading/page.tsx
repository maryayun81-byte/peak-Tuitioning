'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Award, Plus, Search, Filter, Trash2, Edit, 
  Copy, CheckCircle2, ChevronRight, BookOpen, 
  Layers, Settings2, ShieldCheck, Zap
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { GradingSystemModal } from '@/components/admin/GradingSystemModal'
import toast from 'react-hot-toast'
import type { GradingSystem, Curriculum } from '@/types/database'

export default function AdminGrading() {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([])
  const [search, setSearch] = useState('')
  const [filterCurriculum, setFilterCurriculum] = useState('All')
  const [activeTab, setActiveTab] = useState<string>('')

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSystem, setEditingSystem] = useState<GradingSystem | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data: curr } = await supabase.from('curriculums').select('*').order('name')
      const { data: gs } = await supabase.from('grading_systems').select('*, curriculum:curriculums(name), subject:subjects(name), class:classes(name), scales:grading_scales(*)').order('created_at', { ascending: false })
      
      setCurriculums(curr || [])
      setGradingSystems(gs || [])
      if (curr?.length && !activeTab) setActiveTab(curr[0].id)
    } finally {
      setLoading(false)
    }
  }

  const deleteSystem = async (id: string) => {
    if (!confirm('Are you sure? This will remove all grading scales associated with this system.')) return
    const { error } = await supabase.from('grading_systems').delete().eq('id', id)
    if (error) toast.error('Failed to delete: ' + error.message)
    else { toast.success('Deleted successfully'); load() }
  }

  const duplicateSystem = async (system: GradingSystem) => {
    const toastId = toast.loading('Duplicating...')
    try {
        const { data: newSys, error: sysErr } = await supabase.from('grading_systems').insert({
            name: `${system.name} (Copy)`,
            curriculum_id: system.curriculum_id,
            subject_id: system.subject_id,
            class_id: system.class_id,
            is_default: false,
            is_overall: false
        }).select().single()

        if (sysErr) throw sysErr

        const scalesPayload = (system.scales || []).map((s: any) => ({
            grading_system_id: newSys.id,
            grade: s.grade,
            min_score: s.min_score,
            max_score: s.max_score,
            points: s.points,
            remarks: s.remarks
        }))

        if (scalesPayload.length) {
            const { error: scaleErr } = await supabase.from('grading_scales').insert(scalesPayload)
            if (scaleErr) throw scaleErr
        }

        toast.success('Duplicated successfully!', { id: toastId })
        load()
    } catch (e: any) {
        toast.error('Failed: ' + e.message, { id: toastId })
    }
  }

  const filteredSystems = gradingSystems.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.curriculum?.name.toLowerCase().includes(search.toLowerCase())
    const matchesCurriculum = filterCurriculum === 'All' || s.curriculum_id === filterCurriculum
    return matchesSearch && matchesCurriculum
  })

  const systemsByCurriculum = curriculums.map(c => ({
    ...c,
    systems: gradingSystems.filter(s => s.curriculum_id === c.id)
  }))

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-8 pb-24">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
             <Award className="text-primary" /> Grading Systems
          </h1>
          <p className="text-sm text-muted-foreground">Configure how student marks translate to grades across different curricula.</p>
        </div>
        <Button onClick={() => { setEditingSystem(null); setModalOpen(true) }}>
          <Plus size={16} className="mr-2" /> New Grading System
        </Button>
      </motion.div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4">
         <Input 
           placeholder="Search systems..." 
           leftIcon={<Search size={16} />}
           value={search}
           onChange={e => setSearch(e.target.value)}
           className="flex-1"
         />
         <Select value={filterCurriculum} onChange={e => setFilterCurriculum(e.target.value)} className="w-full md:w-64">
            <option value="All">All Curriculums</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
         </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         {/* Sidebar Navigation */}
         <div className="md:col-span-1 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-40 px-2 mb-4">Curriculums</h3>
            {curriculums.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${activeTab === c.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-[var(--input)] opacity-60 hover:opacity-100'}`}
              >
                <div className="flex items-center gap-2">
                   {c.name.toLowerCase().includes('cbc') ? <Zap size={16} /> : <BookOpen size={16} />}
                   <span className="text-sm font-bold">{c.name}</span>
                </div>
                <Badge variant={activeTab === c.id ? 'primary' : 'muted'} className="text-[10px]">
                  {gradingSystems.filter(s => s.curriculum_id === c.id).length}
                </Badge>
              </button>
            ))}
         </div>

         {/* Content Area */}
         <div className="md:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
               {systemsByCurriculum.filter(c => c.id === activeTab).map(curriculum => (
                  <motion.div 
                    key={curriculum.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                     <div className="flex items-center justify-between pb-4 border-b border-[var(--card-border)]">
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                              <Layers size={24} />
                           </div>
                           <div>
                              <h2 className="text-xl font-bold">{curriculum.name} Systems</h2>
                              <p className="text-xs opacity-60">Master grading templates for {curriculum.name}</p>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {curriculum.systems.length === 0 ? (
                           <div className="col-span-2 py-20 text-center border-2 border-dashed rounded-3xl opacity-20">
                              <Award size={64} className="mx-auto mb-4" />
                              <p className="font-bold">No grading systems defined for {curriculum.name}</p>
                              <p className="text-xs">Create a system to start mapping scores to grades.</p>
                           </div>
                        ) : (
                           curriculum.systems.map((system: any) => (
                              <Card key={system.id} className="p-0 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                                 <div className="p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                       <div className="space-y-1">
                                          <h4 className="font-black text-lg">{system.name}</h4>
                                          <div className="flex flex-wrap gap-2">
                                             <Badge variant="primary" className="text-[10px] uppercase">
                                                {system.subject?.name || 'GLOBAL'}
                                             </Badge>
                                             {system.class && (
                                                <Badge variant="info" className="text-[10px] uppercase">
                                                   {system.class.name}
                                                </Badge>
                                             )}
                                              {system.is_default && (
                                                 <Badge variant="success" className="text-[10px] uppercase">
                                                    DEFAULT
                                                 </Badge>
                                              )}
                                              {system.is_overall && (
                                                 <Badge variant="warning" className="text-[10px] uppercase">
                                                    OVERALL MEAN GRADE
                                                 </Badge>
                                              )}
                                          </div>
                                       </div>
                                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => { setEditingSystem(system); setModalOpen(true) }} className="p-2 rounded-lg hover:bg-slate-100"><Edit size={14} /></button>
                                          <button onClick={() => duplicateSystem(system)} className="p-2 rounded-lg hover:bg-slate-100"><Copy size={14} /></button>
                                          <button onClick={() => deleteSystem(system.id)} className="p-2 rounded-lg hover:bg-danger-light text-danger"><Trash2 size={14} /></button>
                                       </div>
                                    </div>

                                    <div className="space-y-2">
                                       <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Grade Bands ({system.scales?.length || 0})</div>
                                       <div className="flex flex-wrap gap-1.5">
                                          {system.scales?.sort((a: any, b: any) => b.min_score - a.min_score).map((scale: any) => (
                                             <div key={scale.id} className="px-2 py-1 rounded-lg bg-[var(--input)] border border-[var(--card-border)] text-[10px] font-bold">
                                                <span className="text-primary">{scale.grade}</span>: {scale.min_score}-{scale.max_score}
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 </div>
                                 <div className="bg-[var(--input)] p-3 border-t border-[var(--card-border)] flex items-center justify-between">
                                    <span className="text-[10px] opacity-40">Created {new Date(system.created_at).toLocaleDateString()}</span>
                                    <button 
                                      onClick={() => { setEditingSystem(system); setModalOpen(true) }}
                                      className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                                    >
                                       Edit System <ChevronRight size={12} />
                                    </button>
                                 </div>
                              </Card>
                           ))
                        )}
                     </div>
                  </motion.div>
               ))}
            </AnimatePresence>
         </div>
      </div>

      <GradingSystemModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSaved={load} 
        editingSystem={editingSystem}
      />
    </div>
  )
}
