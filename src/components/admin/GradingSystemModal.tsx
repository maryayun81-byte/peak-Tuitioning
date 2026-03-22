'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Trash2, Plus, Info, AlertTriangle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Curriculum, Subject, Class, GradingSystem, GradingScale } from '@/types/database'

interface GradingSystemModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  editingSystem?: GradingSystem | null
}

const CBC_DEFAULT_SCALES = [
  { grade: 'EE', min_score: 80, max_score: 100, remarks: 'Exceeding Expectation', points: 4 },
  { grade: 'ME', min_score: 60, max_score: 79, remarks: 'Meeting Expectation', points: 3 },
  { grade: 'AE', min_score: 40, max_score: 59, remarks: 'Approaching Expectation', points: 2 },
  { grade: 'BE', min_score: 0, max_score: 39, remarks: 'Below Expectation', points: 1 },
]

export function GradingSystemModal({ isOpen, onClose, onSaved, editingSystem }: GradingSystemModalProps) {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])

  const [formData, setFormData] = useState({
    name: '',
    curriculum_id: '',
    subject_id: '',
    class_id: '',
    is_default: false,
    is_overall: false,
  })

  const [scales, setScales] = useState<Partial<GradingScale>[]>([
    { grade: '', min_score: 0, max_score: 100, remarks: '', points: 0 }
  ])

  useEffect(() => {
    if (isOpen) {
      loadData()
      if (editingSystem) {
        setFormData(prev => ({
          ...prev,
          name: editingSystem.name,
          curriculum_id: editingSystem.curriculum_id,
          subject_id: editingSystem.subject_id || '',
          class_id: editingSystem.class_id || '',
          is_default: editingSystem.is_default,
          is_overall: (editingSystem as any).is_overall || false
        }))
        setScales(editingSystem.scales || [])
      } else {
        setFormData({ name: '', curriculum_id: '', subject_id: '', class_id: '', is_default: false, is_overall: false })
        setScales([{ grade: '', min_score: 0, max_score: 100, remarks: '', points: 0 }])
      }
    }
  }, [isOpen, editingSystem])

  const loadData = async () => {
    try {
      const [curr, subj, cls] = await Promise.all([
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('classes').select('*').order('level'),
      ])
      
      if (curr.error) throw curr.error
      if (subj.error) throw subj.error
      if (cls.error) throw cls.error

      setCurriculums(curr.data || [])
      setSubjects(subj.data || [])
      setClasses(cls.data || [])

      // If we're creating a new system and curriculums just loaded, set the first one as default
      if (!editingSystem && !formData.curriculum_id && curr.data?.length) {
        setFormData(prev => ({ ...prev, curriculum_id: curr.data[0].id }))
      }
    } catch (error: any) {
      console.error('Failed to load grading modal data:', error)
      toast.error('Failed to load subjects or curriculums')
    }
  }

  const handleCurriculumChange = (id: string) => {
    setFormData(prev => ({ ...prev, curriculum_id: id, subject_id: '', class_id: '' }))
    const curriculum = curriculums.find(c => c.id === id)
    if (curriculum?.name.toLowerCase().includes('cbc')) {
      setScales(CBC_DEFAULT_SCALES)
      if (!formData.name) setFormData(prev => ({ ...prev, name: 'Standard CBC Grading' }))
    }
  }

  // Automatically load CBC scales if CBC is selected (e.g. on initial load)
  useEffect(() => {
    const curriculum = curriculums.find(c => c.id === formData.curriculum_id)
    if (curriculum?.name.toLowerCase().includes('cbc') && scales.length === 0) {
      setScales(CBC_DEFAULT_SCALES)
      if (!formData.name) setFormData(prev => ({ ...prev, name: 'Standard CBC Grading' }))
    }
  }, [formData.curriculum_id, curriculums, scales.length])

  const addRow = () => {
    setScales([...scales, { grade: '', min_score: 0, max_score: 0, remarks: '', points: 0 }])
  }

  const removeRow = (index: number) => {
    setScales(scales.filter((_, i) => i !== index))
  }

  const updateScale = (index: number, field: keyof GradingScale, value: any) => {
    const newScales = [...scales]
    newScales[index] = { ...newScales[index], [field]: value }
    setScales(newScales)
  }

  const validate = () => {
    if (!formData.name) return 'System name is required.'
    if (!formData.curriculum_id) return 'Curriculum is required.'
    if (scales.length === 0) return 'At least one grade level is required.'

    // Range checks
    for (const s of scales) {
      if (!s.grade) return 'All grade letters must be filled.'
      if (s.min_score === undefined || s.max_score === undefined) return 'All scores must be filled.'
      if (s.min_score! > s.max_score!) return `Invalid range for ${s.grade}: Min cannot be greater than Max.`
    }

    // Overlap checks
    const sorted = [...scales].sort((a, b) => a.min_score! - b.min_score!)
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].max_score! >= sorted[i+1].min_score!) {
            return `Overlapping ranges detected: ${sorted[i].grade} ends at ${sorted[i].max_score} but ${sorted[i+1].grade} starts at ${sorted[i+1].min_score}.`
        }
    }

    return null
  }

  const save = async () => {
    const err = validate()
    if (err) { toast.error(err); return }

    setLoading(true)
    try {
      // 1. Check for single-system enforcement (CBC)
      if (isCBC && !editingSystem) {
        const { count } = await supabase
          .from('grading_systems')
          .select('*', { count: 'exact', head: true })
          .eq('curriculum_id', formData.curriculum_id)
        
        if (count && count > 0) {
          throw new Error('CBC curriculum only allows ONE grading system. Please edit the existing one instead.')
        }
      }

      // 2. Check for "Overall" uniqueness
      if (formData.is_overall && !editingSystem) {
         const { count } = await supabase
          .from('grading_systems')
          .select('*', { count: 'exact', head: true })
          .eq('curriculum_id', formData.curriculum_id)
          .eq('is_overall', true)
        
        if (count && count > 0) {
          throw new Error('An overall grading system already exists for this curriculum.')
        }
      }

      const systemPayload = {
        ...formData,
        subject_id: formData.is_overall || isCBC ? null : (formData.subject_id || null),
        class_id: formData.is_overall || isCBC ? null : (formData.class_id || null),
      }

      let systemId = editingSystem?.id
      if (editingSystem) {
        const { error } = await supabase.from('grading_systems').update(systemPayload).eq('id', editingSystem.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('grading_systems').insert(systemPayload).select().single()
        if (error) throw error
        systemId = data.id
      }

      // Upsert scales (simplest is to delete and re-insert for clean update)
      if (editingSystem) {
        await supabase.from('grading_scales').delete().eq('grading_system_id', systemId)
      }

      const scalePayloads = scales.map(s => ({
        grading_system_id: systemId,
        grade: s.grade,
        min_score: s.min_score,
        max_score: s.max_score,
        points: s.points,
        remarks: s.remarks
      }))

      const { error: scaleErr } = await supabase.from('grading_scales').insert(scalePayloads)
      if (scaleErr) throw scaleErr

      toast.success('Grading system saved!')
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const isCBC = curriculums.find(c => c.id === formData.curriculum_id)?.name.toLowerCase().includes('cbc')

  const filteredSubjects = subjects.filter(s => {
    const matchesCurriculum = !formData.curriculum_id || s.curriculum_id === formData.curriculum_id
    const matchesClass = !formData.class_id || !s.class_id || s.class_id === formData.class_id
    return matchesCurriculum && matchesClass
  })

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingSystem ? 'Edit Grading System' : 'New Grading System'}
      size="lg"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="System Name" 
            placeholder="e.g. Standard 8-4-4, Mathematics Grade 4" 
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
          <Select 
            label="Curriculum" 
            value={formData.curriculum_id}
            onChange={e => handleCurriculumChange(e.target.value)}
          >
            <option value="">Select Curriculum</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {!isCBC && !formData.is_overall && (
            <>
              <Select 
                label="Subject (Optional)" 
                value={formData.subject_id}
                onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                error={formData.curriculum_id && filteredSubjects.length === 0 ? "No subjects found for this curriculum." : undefined}
              >
                <option value="">All Subjects (Curriculum Wide)</option>
                {filteredSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Select 
                label="Class Level (Optional)" 
                value={formData.class_id}
                onChange={e => setFormData({ ...formData, class_id: e.target.value })}
              >
                <option value="">All Classes</option>
                {classes.filter(c => !formData.curriculum_id || c.curriculum_id === formData.curriculum_id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              {formData.curriculum_id && filteredSubjects.length === 0 && (
                <div className="md:col-span-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                   <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-amber-600 font-medium">
                     No subjects found for {curriculums.find(c => c.id === formData.curriculum_id)?.name}. 
                     Go to Subjects settings to assign subjects to this curriculum first.
                   </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <h3 className="text-sm font-black uppercase tracking-widest opacity-60">Grade Levels & Score Ranges</h3>
          <Button size="sm" variant="outline" onClick={addRow}><Plus size={14} className="mr-2" /> Add Level</Button>
        </div>

        {isCBC && (
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
            <Info size={16} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-primary font-medium">
              CBC Detected: Auto-loaded EE, ME, AE, BE standards. You can still customize the score ranges below.
            </p>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--input)]">
          <table className="w-full text-xs">
            <thead className="bg-black/5">
              <tr>
                 <th className="p-3 text-left">Grade</th>
                 <th className="p-3 text-left">Min Score</th>
                 <th className="p-3 text-left">Max Score</th>
                 <th className="p-3 text-left">Points</th>
                 <th className="p-3 text-left">Remarks</th>
                 <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {scales.map((s, i) => (
                <tr key={i}>
                  <td className="p-2"><input className="w-16 bg-transparent outline-none font-bold" value={s.grade} onChange={e => updateScale(i, 'grade', e.target.value.toUpperCase())} placeholder="A" /></td>
                  <td className="p-2"><input type="number" className="w-16 bg-transparent outline-none" value={s.min_score} onChange={e => updateScale(i, 'min_score', Number(e.target.value))} /></td>
                  <td className="p-2"><input type="number" className="w-16 bg-transparent outline-none" value={s.max_score} onChange={e => updateScale(i, 'max_score', Number(e.target.value))} /></td>
                  <td className="p-2"><input type="number" className="w-16 bg-transparent outline-none" value={s.points} onChange={e => updateScale(i, 'points', Number(e.target.value))} /></td>
                  <td className="p-2"><input className="w-full bg-transparent outline-none italic" value={s.remarks} onChange={e => updateScale(i, 'remarks', e.target.value)} placeholder="Excellent" /></td>
                  <td className="p-2 text-right">
                    <button onClick={() => removeRow(i)} className="p-1.5 text-danger hover:bg-danger/5 rounded-lg"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-[var(--card-border)]">
           <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={formData.is_default} 
                   onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                   className="w-4 h-4 rounded accent-primary"
                 />
                 <span className="text-xs font-bold">Set as default for this curriculum</span>
              </label>

              {!isCBC && (
                <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="checkbox" 
                     checked={formData.is_overall} 
                     onChange={e => setFormData({ ...formData, is_overall: e.target.checked, subject_id: '', class_id: '' })}
                     className="w-4 h-4 rounded accent-primary"
                   />
                   <span className="text-xs font-bold text-amber-600">This is the Overall Mean Grade system</span>
                </label>
              )}
           </div>
           
           <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={save} isLoading={loading}>Save Grading System</Button>
           </div>
        </div>
      </div>
    </Modal>
  )
}
