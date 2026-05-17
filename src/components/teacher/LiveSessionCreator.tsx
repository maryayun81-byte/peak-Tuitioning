'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, Award, Plus, Trash2, Calendar, Clock, 
  BookOpen, Users, MapPin, ChevronRight, X,
  CheckCircle2, Sparkles, Zap
} from 'lucide-react'
import { createLiveSession, CreateSessionInput } from '@/app/actions/live-sessions'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

type Props = {
  subjects: { id: string, name: string }[]
  assignments: any[]
  centers: { id: string, name: string }[]
  onClose: () => void
  onSessionCreated?: () => void
}

export default function LiveSessionCreator({ subjects, assignments, centers, onClose, onSessionCreated }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateSessionInput>(() => {
    // Attempt to recover draft from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('peak_session_draft')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('[LiveSessionCreator] Failed to parse draft')
        }
      }
    }
    return {
      title: '',
      subject_id: '',
      class_id: '',
      tuition_center_id: '',
      session_type: 'subject',
      goal: '',
      outcomes: [''],
      scheduled_at: new Date().toISOString().slice(0, 16),
      duration_mins: 60
    }
  })

  // Persist to localStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem('peak_session_draft', JSON.stringify(formData))
  }, [formData])

  // Hierarchical Filtering Logic
  // 1. Get centers teacher is assigned to
  const assignedCenterIds = new Set(assignments.map(a => a.tuition_center_id))
  const filteredCenters = centers.filter(c => assignedCenterIds.has(c.id))

  // 2. Get classes in selected center
  const filteredClasses = assignments
    .filter(a => a.tuition_center_id === formData.tuition_center_id)
    .reduce((acc: any[], curr) => {
      if (!acc.find(item => item.id === curr.class.id)) {
        acc.push({ 
          id: curr.class.id, 
          name: curr.class.name,
          isPrimary: curr.is_class_teacher 
        })
      }
      return acc
    }, [])

  // 3. Get subjects in selected class
  const filteredSubjects = assignments
    .filter(a => a.tuition_center_id === formData.tuition_center_id && a.class_id === formData.class_id)
    .reduce((acc: any[], curr) => {
      if (curr.subject && !acc.find(item => item.id === curr.subject.id)) {
        acc.push({ id: curr.subject.id, name: curr.subject.name })
      }
      return acc
    }, [])

  const addOutcome = () => setFormData({ ...formData, outcomes: [...formData.outcomes, ''] })
  const removeOutcome = (index: number) => {
    const newOutcomes = formData.outcomes.filter((_, i) => i !== index)
    setFormData({ ...formData, outcomes: newOutcomes.length ? newOutcomes : [''] })
  }
  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...formData.outcomes]
    newOutcomes[index] = value
    setFormData({ ...formData, outcomes: newOutcomes })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.tuition_center_id) return toast.error("Please select a Tuition Center")
    if (!formData.class_id) return toast.error("Please select a Class")
    if (formData.session_type === 'subject' && !formData.subject_id) return toast.error("Please select a Subject")
    if (!formData.goal) return toast.error("Session Goal is mandatory")
    if (formData.outcomes.some(o => !o)) return toast.error("All outcomes must be defined")

    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        subject_id: formData.session_type === 'class' ? null : (formData.subject_id || null),
        // Convert datetime-local (local time) → UTC ISO string for correct DB storage
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
      }
      const result = await createLiveSession(payload)
      if (result.success) {
        localStorage.removeItem('peak_session_draft')
        toast.success("Session Scheduled Successfully")
        onSessionCreated?.()  // Instantly refresh the sessions list on the parent
        onClose()
      }
    } catch (error: any) {
      console.error('[LiveSessionCreator] Submit Error:', error)
      toast.error(error.message || "Failed to schedule session")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper for dropdown styling
  const dropdownStyle = {
    backgroundColor: '#0A0C10',
    color: 'white'
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center p-0 sm:p-4 lg:p-8 bg-black/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
        className="relative w-full max-w-5xl h-[100dvh] sm:h-[92dvh] bg-[#0A0C10] border border-white/5 rounded-none sm:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-white/5 flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/5 to-transparent shrink-0">
          <div className="flex items-center gap-4 min-w-0">
             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/20 shrink-0">
                <Zap size={24} />
             </div>
             <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white leading-tight">Create Live Session</h2>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Intelligent Session Engine</p>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
             <X size={20} />
          </button>
        </div>

        <form id="live-session-create-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10">
          {/* Step 1: Destination Selection */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-emerald-500" />
              <h3 className="text-lg font-black uppercase tracking-tight">Destination Context</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Tuition Center</label>
                <select 
                  required 
                  value={formData.tuition_center_id} 
                  onChange={e => {
                    setFormData({...formData, tuition_center_id: e.target.value, class_id: '', subject_id: ''})
                  }}
                  className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white focus:border-emerald-500/50 outline-none appearance-none cursor-pointer"
                  style={dropdownStyle}
                >
                  <option value="" style={dropdownStyle}>Select Center</option>
                  {filteredCenters.map(c => (
                    <option key={c.id} value={c.id} style={dropdownStyle}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Class</label>
                <select 
                  required 
                  disabled={!formData.tuition_center_id}
                  value={formData.class_id} 
                  onChange={e => {
                    setFormData({...formData, class_id: e.target.value, subject_id: ''})
                  }}
                  className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white focus:border-emerald-500/50 outline-none appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  style={dropdownStyle}
                >
                  <option value="" style={dropdownStyle}>Select Class</option>
                  {filteredClasses.map(c => (
                    <option key={c.id} value={c.id} style={dropdownStyle}>
                      {c.name} {c.isPrimary ? '⭐️ (Your Class)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Session Scope</label>
                <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/5 h-14">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, session_type: 'subject'})}
                    className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.session_type === 'subject' ? 'bg-emerald-500 text-black' : 'text-slate-500 hover:text-white'}`}
                  >
                    Subject
                  </button>
                  <button 
                    type="button"
                    disabled={!filteredClasses.find(c => c.id === formData.class_id)?.isPrimary}
                    onClick={() => setFormData({...formData, session_type: 'class', subject_id: ''})}
                    className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20 ${formData.session_type === 'class' ? 'bg-emerald-500 text-black' : 'text-slate-500 hover:text-white'}`}
                    title={!filteredClasses.find(c => c.id === formData.class_id)?.isPrimary ? "Only available for your primary class" : ""}
                  >
                    Entire Class
                  </button>
                </div>
              </div>
            </div>

            {formData.session_type === 'subject' && (
              <div className="space-y-2 max-w-md">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Target Subject</label>
                <select 
                  required 
                  disabled={!formData.class_id}
                  value={formData.subject_id || ''} 
                  onChange={e => setFormData({...formData, subject_id: e.target.value})}
                  className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white focus:border-emerald-500/50 outline-none appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  style={dropdownStyle}
                >
                  <option value="" style={dropdownStyle}>Select Subject</option>
                  {filteredSubjects.map(s => (
                    <option key={s.id} value={s.id} style={dropdownStyle}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="h-px bg-white/5" />

          {/* Step 2: Time & Duration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Scheduled Start Time</label>
                  <div className="relative">
                    <Calendar className="absolute left-6 top-4 text-emerald-500" size={20} />
                    <input 
                      type="datetime-local" 
                      required 
                      value={formData.scheduled_at} 
                      onChange={e => setFormData({...formData, scheduled_at: e.target.value})}
                      className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Session Duration</label>
                  <div className="relative flex items-center gap-4">
                    <div className="relative flex-1">
                      <Clock className="absolute left-6 top-4 text-emerald-500" size={20} />
                      <select 
                        value={formData.duration_mins} 
                        onChange={e => setFormData({...formData, duration_mins: parseInt(e.target.value)})}
                        className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white focus:border-emerald-500/50 outline-none appearance-none cursor-pointer"
                        style={dropdownStyle}
                      >
                        <option value={30} style={dropdownStyle}>30 Minutes</option>
                        <option value={60} style={dropdownStyle}>60 Minutes (Standard)</option>
                        <option value={90} style={dropdownStyle}>90 Minutes</option>
                        <option value={120} style={dropdownStyle}>120 Minutes (Intensive)</option>
                        <option value={180} style={dropdownStyle}>180 Minutes (Marathon)</option>
                      </select>
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Mission Title</label>
                <input 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Exam Revision: Calculus Part 1"
                  className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder:text-slate-600 focus:border-emerald-500/50 transition-all outline-none"
                />
              </div>
              <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                    Automated reminders will be dispatched to students 10, 5, and 2 minutes before launch.
                  </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Goal & Outcomes */}
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Target size={20} className="text-emerald-500" />
                <h3 className="text-lg font-black uppercase tracking-tight">Mission Goal</h3>
              </div>
              <textarea 
                required 
                value={formData.goal} 
                onChange={e => setFormData({...formData, goal: e.target.value})}
                placeholder="What should students achieve by the end? e.g., Solve 10 high-level integration problems."
                className="w-full h-24 p-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder:text-slate-600 focus:border-emerald-500/50 transition-all outline-none resize-none"
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Target Outcomes</label>
                <button type="button" onClick={addOutcome} className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-2">
                   <Plus size={14} /> Add Outcome
                </button>
              </div>
              <div className="space-y-4">
                {formData.outcomes.map((outcome, idx) => (
                  <div key={idx} className="flex items-center gap-3 sm:gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                      {idx + 1}
                    </div>
                    <input 
                      required 
                      value={outcome} 
                      onChange={e => updateOutcome(idx, e.target.value)}
                      placeholder={`Measurable Outcome (e.g., Identify 3 types of equations)`}
                      className="min-w-0 flex-1 h-12 px-4 sm:px-6 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-white placeholder:text-slate-700 focus:border-emerald-500/30 outline-none"
                    />
                    <button type="button" onClick={() => removeOutcome(idx)} className="w-10 h-10 rounded-xl bg-red-500/5 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all">
                       <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/20 shrink-0">
          <div className="space-y-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">
               Targeting: <span className="text-emerald-500">{formData.session_type === 'class' ? 'Entire Class' : 'Subject Group'}</span>
            </p>
            <p className="text-[8px] opacity-40 font-bold uppercase tracking-widest">LiveKit Node Deployment: Auto-Scaling</p>
          </div>
          <div className="flex items-center justify-end gap-3 sm:gap-6">
             <button type="button" onClick={onClose} className="h-11 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
               Cancel
             </button>
             <button 
               type="submit"
               form="live-session-create-form"
               disabled={isSubmitting}
               className="h-11 sm:h-12 px-5 sm:px-8 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 hover:text-white transition-all shadow-xl disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
             >
               {isSubmitting ? (
                 <><Loader2 className="animate-spin" size={14} /> Initializing...</>
               ) : (
                 'Finalize Mission'
               )}
             </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
