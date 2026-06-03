'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, CheckCircle, GraduationCap, Building, Loader2, Sparkles, Copy, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { processPublicRegistration } from '@/app/actions/event-registration'
import type { TuitionEvent, Curriculum, Class, Subject } from '@/types/database'
import Image from 'next/image'

export default function EventRegistrationPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Data
  const [events, setEvents] = useState<TuitionEvent[]>([])
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  // Form State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    event_id: '',
    curriculum_id: '',
    class_id: '',
    center_id: '',
  })
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  
  // Success State
  const [successData, setSuccessData] = useState<{ admission_number: string, password: string } | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (formData.curriculum_id && formData.class_id) {
      loadSubjects(formData.curriculum_id, formData.class_id)
    } else {
      setSubjects([])
      setSelectedSubjects([])
    }
  }, [formData.curriculum_id, formData.class_id])

  const loadInitialData = async () => {
    try {
      const [evtRes, currRes, clsRes, cenRes] = await Promise.all([
        supabase.from('tuition_events').select('*').eq('status', 'active').order('start_date'),
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('tuition_centers').select('*').order('name')
      ])

      setEvents(evtRes.data || [])
      setCurriculums(currRes.data || [])
      setClasses(clsRes.data || [])
      setCenters(cenRes.data || [])
      
      // Auto-select event if passed in URL (Optional feature)
      const urlParams = new URLSearchParams(window.location.search)
      const eventId = urlParams.get('eventId')
      if (eventId && evtRes.data?.find(e => e.id === eventId)) {
        setFormData(prev => ({ ...prev, event_id: eventId }))
      }
    } catch (err) {
      toast.error('Failed to load form data')
    } finally {
      setLoading(false)
    }
  }

  const loadSubjects = async (currId: string, clsId: string) => {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('curriculum_id', currId)
      // Note: Ideally we filter by class_id if schema supports it, for now we load all for curriculum
    
    if (data) setSubjects(data)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB')
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const toggleSubject = (subId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name || !formData.event_id || !formData.curriculum_id || !formData.class_id) {
      toast.error('Please fill all required fields')
      return
    }

    setSubmitting(true)
    
    const formPayload = new FormData()
    formPayload.append('full_name', formData.full_name)
    formPayload.append('email', formData.email)
    formPayload.append('phone', formData.phone)
    formPayload.append('event_id', formData.event_id)
    formPayload.append('curriculum_id', formData.curriculum_id)
    formPayload.append('class_id', formData.class_id)
    if (formData.center_id) formPayload.append('center_id', formData.center_id)
    formPayload.append('subjects', JSON.stringify(selectedSubjects))
    if (avatarFile) formPayload.append('avatar', avatarFile)

    const result = await processPublicRegistration(formPayload)
    
    if (result.success && result.admission_number && result.password) {
      setSuccessData({ admission_number: result.admission_number, password: result.password })
      toast.success('Registration Complete!')
    } else {
      toast.error(result.error || 'Registration failed')
    }
    
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
    </div>
  )

  const filteredClasses = formData.curriculum_id 
    ? classes.filter((c: any) => c.curriculum_id === formData.curriculum_id)
    : classes

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0A0A0A] py-12 px-4 sm:px-6 relative selection:bg-emerald-500/30">
      <Link href="/" className="fixed top-6 left-6 z-50 flex items-center gap-2 text-sm font-bold opacity-50 hover:opacity-100 transition-opacity text-black dark:text-white">
         <ArrowLeft size={16} /> Back
      </Link>
      
      <div className="max-w-2xl mx-auto relative z-10">
        
        <AnimatePresence mode="wait">
          {!successData ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
              className="bg-white dark:bg-[#121212] rounded-[32px] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-black/5 dark:border-white/5 relative overflow-hidden"
            >
              {/* Paper texture overlay (subtle) */}
              <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none mix-blend-multiply dark:mix-blend-screen" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>
              
              <div className="text-center mb-10 relative z-10">
                <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4">
                  <Sparkles size={24} />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Tuition Application Form</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Please fill out this physical form accurately for enrollment.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                
                {/* Photo Dropzone - Top Center */}
                <div className="flex flex-col items-center justify-center mb-8">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-32 h-32 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center cursor-pointer overflow-hidden group transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  >
                    {avatarPreview ? (
                      <Image src={avatarPreview} alt="Preview" fill className="object-cover" />
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-400 group-hover:text-emerald-500 mb-2 transition-colors" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-emerald-500 transition-colors">Add Photo</span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold">Change</span>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <div className="space-y-6">
                  {/* Event Selection */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Event Details</label>
                    <Select 
                      value={formData.event_id}
                      onChange={e => setFormData({...formData, event_id: e.target.value})}
                      className="bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 shadow-sm font-semibold"
                      required
                    >
                      <option value="">Select Tuition Event...</option>
                      {events.map(e => <option key={e.id} value={e.id}>{e.name} — {new Date(e.start_date).toLocaleDateString()}</option>)}
                    </Select>
                  </div>

                  {/* Personal Details */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Applicant Details</label>
                    <Input 
                      placeholder="Student Full Name" 
                      value={formData.full_name}
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                      className="bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 shadow-sm font-semibold text-lg py-6"
                      required
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input 
                        placeholder="Email (Optional)" 
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 shadow-sm"
                      />
                      <Input 
                        placeholder="Phone (Optional)" 
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Academic Profile */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Academic Profile</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select 
                        value={formData.curriculum_id}
                        onChange={e => setFormData({...formData, curriculum_id: e.target.value, class_id: ''})}
                        className="bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 shadow-sm font-semibold"
                        required
                      >
                        <option value="">Select Curriculum...</option>
                        {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                      <Select 
                        value={formData.class_id}
                        onChange={e => setFormData({...formData, class_id: e.target.value})}
                        className="bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 shadow-sm font-semibold"
                        required
                        disabled={!formData.curriculum_id}
                      >
                        <option value="">Select Class...</option>
                        {filteredClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                    </div>
                    
                    <Select 
                      value={formData.center_id}
                      onChange={e => setFormData({...formData, center_id: e.target.value})}
                      className="bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 shadow-sm font-semibold"
                    >
                      <option value="">Select Tuition Center (Optional)...</option>
                      {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </div>

                  {/* Dynamic Subjects Selection */}
                  <AnimatePresence>
                    {subjects.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-500/20"
                      >
                        <label className="block text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 mb-4">Select Target Subjects</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {subjects.map(sub => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => toggleSubject(sub.id)}
                              className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                                selectedSubjects.includes(sub.id) 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                                  : 'bg-white dark:bg-[#1A1A1A] border-emerald-200 dark:border-emerald-500/30 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedSubjects.includes(sub.id) ? 'border-white' : 'border-emerald-300'}`}>
                                {selectedSubjects.includes(sub.id) && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <span className="text-sm font-bold truncate">{sub.name}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 text-lg font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 rounded-xl"
                  isLoading={submitting}
                >
                  Submit Application
                </Button>
              </form>
            </motion.div>
          ) : (
            /* ADMISSION SUCCESS MODAL / LETTER */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white dark:bg-[#121212] rounded-[32px] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-emerald-500/30 relative overflow-hidden"
            >
              {/* Confetti / Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-emerald-500/20 blur-[100px] pointer-events-none" />

              <div className="text-center relative z-10">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 border-4 border-white dark:border-[#121212]">
                  <CheckCircle size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Application Approved</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Welcome to Peak Performance. Your student profile has been created.</p>

                <div className="bg-slate-50 dark:bg-white/[0.02] p-8 rounded-2xl border border-slate-200 dark:border-white/10 mb-8 space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Official Admission Number</p>
                    <div className="flex items-center justify-center gap-3">
                      <code className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                        {successData.admission_number}
                      </code>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(successData.admission_number); toast.success('Copied!') }}
                        className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-emerald-600 dark:text-emerald-400"
                      >
                        <Copy size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-200 dark:bg-white/10" />

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Temporary Login Password</p>
                    <div className="flex items-center justify-center gap-3">
                      <code className="text-xl font-bold text-slate-700 dark:text-slate-300 tracking-widest px-4 py-2 bg-white dark:bg-[#1A1A1A] rounded-xl border border-slate-200 dark:border-white/10">
                        {successData.password}
                      </code>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(successData.password); toast.success('Copied!') }}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-500"
                      >
                        <Copy size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    className="flex-1 font-black uppercase tracking-widest h-14 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                    onClick={() => router.push('/auth/login?role=student')}
                  >
                    Proceed to Login
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="lg" 
                    className="flex-1 font-black uppercase tracking-widest h-14 border-slate-200 dark:border-white/10"
                    onClick={() => setSuccessData(null)}
                  >
                    Register Another
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
