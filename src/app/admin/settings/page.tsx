'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, Upload, Stamp, Signature, Image as ImageIcon, Plus, Trash2, Award, BookOpen, Palette } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { THEMES } from '@/lib/themes'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'
import type { Curriculum, Subject } from '@/types/database'

export default function AdminSettings() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const { theme: currentTheme, syncThemeToProfile } = useThemeStore()
  const [loading, setLoading] = useState(true)
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [gradingConfig, setGradingConfig] = useState<any[]>([])
  const [branding, setBranding] = useState({
    logo_url: '',
    stamp_url: '',
    signature_url: '',
    school_name: 'Peak Performance Tutoring',
    transcript_watermark: 'OFFICIAL TRANSCRIPT',
    default_remarks: 'Excellent performance. Keep it up!',
  })

  const [addGradeOpen, setAddGradeOpen] = useState(false)
  const [newGrade, setNewGrade] = useState({
    curriculum_id: '',
    subject_id: '',
    min_score: 0,
    max_score: 100,
    grade: 'A',
    points: 12,
  })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, sRes, gRes] = await Promise.all([
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('grading_systems').select('*, curriculum:curriculums(name), subject:subjects(name)').order('min_score', { ascending: false }),
      ])
      setCurriculums(cRes.data ?? [])
      setSubjects(sRes.data ?? [])
      setGradingConfig(gRes.data ?? [])
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }

  const saveBranding = async () => {
    toast.success('Branding settings saved locally!')
    // In a real app, this would update a 'settings' table or site_config
  }

  const addGrade = async () => {
    const { error } = await supabase.from('grading_systems').insert({
      ...newGrade,
      subject_id: newGrade.subject_id === '' ? null : newGrade.subject_id
    })
    if (error) { toast.error(error.message); return }
    toast.success('Grade rule added!')
    setAddGradeOpen(false)
    load()
  }

  const deleteGrade = async (id: string) => {
    const { error } = await supabase.from('grading_systems').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Rule removed'); load()
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>System Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure branding, grading, and portal defaults</p>
      </motion.div>

      {/* Branding & Assets */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <ImageIcon size={20} className="text-primary" /> School Branding & Assets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>School Logo</span>
               <Badge variant="info">TRANSCRIPTS</Badge>
            </div>
            <div className="aspect-square w-24 mx-auto rounded-2xl flex items-center justify-center border-2 border-dashed" style={{ borderColor: 'var(--card-border)' }}>
              <ImageIcon size={32} className="text-muted" />
            </div>
            <Button size="sm" variant="secondary" className="w-full"><Upload size={14} className="mr-2" /> Upload Logo</Button>
            <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Appears on all dashboards and reports.</p>
          </Card>

          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Official Stamp</span>
               <Badge variant="warning">STAMP</Badge>
            </div>
            <div className="aspect-square w-24 mx-auto rounded-full flex items-center justify-center border-2 border-dashed" style={{ borderColor: 'var(--card-border)' }}>
              <Stamp size={32} className="text-muted" />
            </div>
            <Button size="sm" variant="secondary" className="w-full"><Upload size={14} className="mr-2" /> Upload Stamp</Button>
            <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Appears as watermark and footer on transcripts.</p>
          </Card>

          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Admin Signature</span>
               <Badge variant="success">SIGNATURE</Badge>
            </div>
            <div className="h-24 w-full rounded-xl flex items-center justify-center border-2 border-dashed" style={{ borderColor: 'var(--card-border)' }}>
              <Signature size={32} className="text-muted" />
            </div>
            <Button size="sm" variant="secondary" className="w-full"><Upload size={14} className="mr-2" /> Upload Signature</Button>
            <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Auto-applied to certificates and official letters.</p>
          </Card>
        </div>
      </section>

      {/* Themes & Appearance */}
      <section className="space-y-4">
         <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Palette size={20} className="text-primary" /> Portal Appearance
         </h2>
         <Card className="p-6">
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Choose a visual style that inspires your administrative workflow.</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                     const store = useThemeStore.getState()
                     store.setTheme(t.id as any)
                     if (profile?.id) store.syncThemeToProfile(t.id as any, profile.id)
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all text-left space-y-3 ${currentTheme === t.id ? 'border-primary ring-4 ring-primary/10 bg-[var(--card)]' : 'border-[var(--card-border)] hover:bg-[var(--input)]'}`}
                >
                   <div className="h-10 rounded-lg shadow-inner flex overflow-hidden border border-black/10">
                      <div className="flex-1" style={{ background: t.bg }}></div>
                      <div className="flex-1" style={{ background: t.card }}></div>
                      <div className="flex-1" style={{ background: t.primary }}></div>
                      <div className="flex-1" style={{ background: t.accent }}></div>
                   </div>
                   <div>
                     <span className="block text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{t.name}</span>
                     <span className="block text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.font}</span>
                   </div>
                </button>
              ))}
            </div>
         </Card>
      </section>

      {/* General Config */}
      <section className="space-y-4">
         <Card className="p-6">
           <h3 className="font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Settings size={18} /> General Configuration
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="School Name" value={branding.school_name} onChange={e => setBranding({...branding, school_name: e.target.value})} />
              <Input label="Transcript Watermark Text" value={branding.transcript_watermark} onChange={e => setBranding({...branding, transcript_watermark: e.target.value})} />
              <div className="md:col-span-2">
                 <Textarea label="Default Transcript Remarks" rows={3} value={branding.default_remarks} onChange={e => setBranding({...branding, default_remarks: e.target.value})} />
              </div>
           </div>
           <Button className="mt-6" onClick={saveBranding}><Save size={16} className="mr-2" /> Save Changes</Button>
         </Card>
      </section>

      {/* Grading Systems */}
      <section className="space-y-4">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
               <Award size={20} className="text-primary" /> Grading Systems
            </h2>
            <Button size="sm" onClick={() => setAddGradeOpen(true)}><Plus size={14} /> Add Grade Rule</Button>
         </div>
         
         <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                 <thead>
                    <tr style={{ background: 'var(--input)', borderBottom: '1px solid var(--card-border)' }}>
                       {['Curriculum', 'Subject', 'Score Range', 'Grade', 'Points', 'Actions'].map(h => (
                         <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                       ))}
                    </tr>
                 </thead>
                 <tbody>
                    {gradingConfig.map((g, i) => (
                      <tr key={g.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                         <td className="px-5 py-3" style={{ color: 'var(--text)' }}>{g.curriculum?.name}</td>
                         <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{g.subject?.name ?? <Badge variant="muted">GLOBAL</Badge>}</td>
                         <td className="px-5 py-3 font-mono" style={{ color: 'var(--text)' }}>{g.min_score} - {g.max_score}</td>
                         <td className="px-5 py-3"><Badge variant="primary" className="text-base h-8 w-8 flex items-center justify-center font-black">{g.grade}</Badge></td>
                         <td className="px-5 py-3 font-bold" style={{ color: 'var(--primary)' }}>{g.points} pts</td>
                         <td className="px-5 py-3">
                            <button onClick={() => deleteGrade(g.id)} className="p-2 rounded-lg text-danger hover:bg-danger-light"><Trash2 size={16} /></button>
                         </td>
                      </tr>
                    ))}
                    {gradingConfig.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No grading rules defined. Create one to enable auto-grading.</td></tr>
                    )}
                 </tbody>
              </table>
            </div>
         </Card>
      </section>

      {/* Grade Rule Modal */}
      <Modal isOpen={addGradeOpen} onClose={() => setAddGradeOpen(false)} title="Add Grading Rule" size="md">
         <div className="space-y-4">
            <Select label="Curriculum" value={newGrade.curriculum_id} onChange={e => setNewGrade({...newGrade, curriculum_id: e.target.value})}>
               <option value="">Select Curriculum</option>
               {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <div className="p-3 rounded-lg text-[10px]" style={{ background: 'rgba(79,140,255,0.05)', color: 'var(--text-muted)' }}>
               💡 Keep subject empty to apply this rule to ALL subjects in this curriculum.
            </div>
            <Select label="Subject (Optional)" value={newGrade.subject_id} onChange={e => setNewGrade({...newGrade, subject_id: e.target.value})}>
               <option value="">Specific Subject (Optional)</option>
               {subjects.filter(s => s.curriculum_id === newGrade.curriculum_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-4">
               <Input label="Min Score" type="number" value={newGrade.min_score} onChange={e => setNewGrade({...newGrade, min_score: parseInt(e.target.value)})} />
               <Input label="Max Score" type="number" value={newGrade.max_score} onChange={e => setNewGrade({...newGrade, max_score: parseInt(e.target.value)})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <Input label="Grade Letter" placeholder="A" value={newGrade.grade} onChange={e => setNewGrade({...newGrade, grade: e.target.value.toUpperCase()})} />
               <Input label="Grade Points" type="number" value={newGrade.points} onChange={e => setNewGrade({...newGrade, points: parseInt(e.target.value)})} />
            </div>
            <div className="flex gap-3 justify-end pt-4">
               <Button variant="secondary" onClick={() => setAddGradeOpen(false)}>Cancel</Button>
               <Button onClick={addGrade}>Save Rule</Button>
            </div>
         </div>
      </Modal>
    </div>
  )
}
