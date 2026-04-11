'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Rocket, Star, ChevronRight, CheckCircle2, BookOpen, School, GraduationCap, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const AVATARS = [
  { id: '1', emoji: '🚀', label: 'Explorer', color: 'from-blue-500 to-cyan-400' },
  { id: '2', emoji: '🎨', label: 'Creator', color: 'from-purple-500 to-pink-400' },
  { id: '3', emoji: '🧠', label: 'Thinker', color: 'from-emerald-500 to-teal-400' },
  { id: '4', emoji: '🦁', label: 'Leader', color: 'from-orange-500 to-amber-400' },
  { id: '5', emoji: '🦄', label: 'Dreamer', color: 'from-rose-500 to-red-400' },
  { id: '6', emoji: '⚡', label: 'Speedster', color: 'from-yellow-400 to-amber-500' },
]

export default function StudentOnboarding() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { profile, student, setStudent } = useAuthStore()
  
  const [step, setStep] = useState(1)
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [schoolName, setSchoolName] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [meta, setMeta] = useState<any>(null)

  // Block access if already onboarded
  useEffect(() => {
    if (student && student.onboarded === true) {
      router.replace('/student')
    }
  }, [student?.onboarded])

  // Fetch student meta + subjects
  useEffect(() => {
    if (!student?.id) return

    const fetchData = async () => {
      // Fetch fresh student row with joined relations
      const { data: freshStudent } = await supabase
        .from('students')
        .select('*, class:classes(id, name), curriculum:curriculums(id, name)')
        .eq('id', student.id)
        .single()

      if (!freshStudent) return
      setMeta(freshStudent)

      setLoadingSubjects(true)
      try {
        // Try curriculum_id first (most accurate)
        const curriculumId = freshStudent.curriculum_id || freshStudent.curriculum?.id
        const classId = freshStudent.class_id || freshStudent.class?.id

        let sData: any[] = []

        if (curriculumId) {
          const { data } = await supabase
            .from('subjects')
            .select('id, name, code')
            .eq('curriculum_id', curriculumId)
            .order('name')
          sData = data ?? []
        }

        // Fallback: if no curriculum subjects, try class-scoped subjects
        if (sData.length === 0 && classId) {
          const { data: classSubjects } = await supabase
            .from('class_subjects')
            .select('subject:subjects(id, name, code)')
            .eq('class_id', classId)
          sData = (classSubjects ?? [])
            .map((cs: any) => cs.subject)
            .filter(Boolean)
            .filter((s: any, i: number, arr: any[]) => 
              arr.findIndex(x => x.id === s.id) === i) // deduplicate
        }

        // Ultimate fallback: list all subjects in the system
        if (sData.length === 0) {
          const { data: allSubjects } = await supabase
            .from('subjects')
            .select('id, name, code')
            .order('name')
            .limit(30)
          sData = allSubjects ?? []
        }

        setSubjects(sData)
      } finally {
        setLoadingSubjects(false)
      }
    }

    fetchData()
  }, [student?.id])

  const finish = async () => {
    if (!student) return
    // School name is optional — just warn if empty but continue
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject to continue')
      return
    }
    
    setLoading(true)
    try {
      // 1. Upsert student subjects
      const payload = selectedSubjects.map(subId => ({
        student_id: student.id,
        subject_id: subId,
        class_id: student.class_id,
      }))

      const { error: subError } = await supabase
        .from('student_subjects')
        .upsert(payload, { onConflict: 'student_id,subject_id' })

      // Non-fatal — subjects can be updated later in settings
      if (subError) {
        console.warn('[Onboarding] student_subjects upsert error:', subError)
      }

      // 2. Update onboarded flag + school name
      const updatePayload: any = { onboarded: true }
      if (schoolName.trim()) updatePayload.school_name = schoolName.trim()

      const { data: updatedStudent, error: updateError } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', student.id)
        .select('*, class:classes(*), curriculum:curriculums(*)')
        .single()

      if (updateError) throw updateError
      if (!updatedStudent) throw new Error('Could not confirm profile update. Please try again.')

      // 3. Update avatar (optional — fire-and-forget)
      if (selectedAvatar) {
        const avatar = AVATARS.find(a => a.id === selectedAvatar)
        if (avatar) {
          supabase.from('profiles')
            .update({ avatar_url: avatar.emoji })
            .eq('id', student.user_id)
            .then(() => {})
        }
      }

      // 4. Write to Zustand FIRST (wins race vs background re-fetch)
      setStudent({ ...updatedStudent, onboarded: true } as any)

      // 5. Sync auth metadata fire-and-forget
      supabase.auth.updateUser({ data: { onboarded: true } }).catch(() => {})

      toast.success('Welcome to Peak Performance! Your journey starts now 🚀', {
        id: 'onboarding-success',
        duration: 4000,
      })

      // 6. Short settle then navigate
      await new Promise(r => setTimeout(r, 200))
      router.replace('/student')
    } catch (e: any) {
      console.error('[Onboarding] finish error:', e)
      toast.error(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="text-center space-y-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-2xl shadow-primary/40 relative z-10">
                  <Rocket size={64} className="text-white" />
                </div>
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-primary blur-3xl opacity-10" />
              </div>
              
              <div className="space-y-3">
                <h1 className="text-4xl font-black" style={{ color: 'var(--text)' }}>
                  Welcome to Peak!
                </h1>
                <p className="text-sm px-8" style={{ color: 'var(--text-muted)' }}>
                  Let&apos;s get you set up in under a minute.
                </p>
                {meta && (
                  <div className="flex gap-3 justify-center pt-2 flex-wrap">
                    {meta.curriculum?.name && (
                      <Badge variant="info" className="px-4 py-2 rounded-xl flex items-center gap-2">
                        <GraduationCap size={14} /> {meta.curriculum.name}
                      </Badge>
                    )}
                    {meta.class?.name && (
                      <Badge variant="muted" className="px-4 py-2 rounded-xl flex items-center gap-2">
                        <School size={14} /> {meta.class.name}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <Button className="w-full py-8 text-xl font-black rounded-[2rem] shadow-xl shadow-primary/20" onClick={() => setStep(2)}>
                Start My Legend <ChevronRight className="ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ── Step 2: Avatar ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Who are you?</h2>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Pick an identity that represents your learning style</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {AVATARS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAvatar(a.id)}
                    className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-3 ${selectedAvatar === a.id ? 'border-primary bg-[var(--input)] scale-110 shadow-xl' : 'border-transparent bg-[var(--card)] hover:bg-[var(--input)] opacity-60 hover:opacity-100 hover:scale-105'}`}
                  >
                    <div className={`w-14 h-14 rounded-3xl bg-gradient-to-br ${a.color} flex items-center justify-center text-3xl shadow-lg`}>
                      {a.emoji}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>{a.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <Button variant="secondary" className="flex-1 py-6 rounded-3xl" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-[2] py-6 rounded-3xl" onClick={() => setStep(3)}>
                  {selectedAvatar ? 'Looking Good! ' : 'Skip '}<CheckCircle2 className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: School (optional) ── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <School size={40} />
              </div>
              <div>
                <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Where do you study?</h2>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Enter your school name (optional)</p>
              </div>
              <Input 
                placeholder="e.g. Nairobi Academy" 
                value={schoolName} 
                onChange={e => setSchoolName(e.target.value)} 
                className="text-center text-lg py-8 rounded-3xl"
              />
              <div className="flex gap-4">
                <Button variant="secondary" className="flex-1 py-6 rounded-3xl" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-[2] py-6 rounded-3xl" onClick={() => setStep(4)}>Next Step</Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Subjects ── */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Your Subjects</h2>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Choose the subjects you&apos;ll be studying.</p>
              </div>

              {loadingSubjects ? (
                <div className="flex items-center justify-center py-12 gap-3" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-medium">Loading your subjects…</span>
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    No subjects found for your class/curriculum yet.
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    You can add subjects later in Settings. Click &ldquo;Continue&rdquo; to proceed.
                  </p>
                  <Button className="mt-4 px-8 py-4 rounded-3xl" onClick={async () => {
                    // Allow completing onboarding without subjects
                    setLoading(true)
                    try {
                      const { data: updatedStudent, error } = await supabase
                        .from('students')
                        .update({ onboarded: true, ...(schoolName.trim() ? { school_name: schoolName.trim() } : {}) })
                        .eq('id', student!.id)
                        .select('*, class:classes(*), curriculum:curriculums(*)')
                        .single()
                      if (error) throw error
                      setStudent({ ...updatedStudent, onboarded: true } as any)
                      supabase.auth.updateUser({ data: { onboarded: true } }).catch(() => {})
                      toast.success('Welcome to Peak! 🚀')
                      await new Promise(r => setTimeout(r, 200))
                      router.replace('/student')
                    } catch (e: any) {
                      toast.error(e.message || 'Error completing setup')
                    } finally {
                      setLoading(false)
                    }
                  }} isLoading={loading}>
                    Continue Anyway →
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
                  {subjects.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (selectedSubjects.includes(s.id)) setSelectedSubjects(selectedSubjects.filter(id => id !== s.id))
                        else setSelectedSubjects([...selectedSubjects, s.id])
                      }}
                      className={`p-5 rounded-3xl border-2 transition-all flex items-center justify-between ${selectedSubjects.includes(s.id) ? 'border-primary bg-primary/5 shadow-inner' : 'border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--input)]'}`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={`p-3 rounded-2xl ${selectedSubjects.includes(s.id) ? 'bg-primary text-white' : 'bg-[var(--input)]'}`}>
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <span className="font-bold text-sm block" style={{ color: 'var(--text)' }}>{s.name}</span>
                          {s.code && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.code}</span>}
                        </div>
                      </div>
                      {selectedSubjects.includes(s.id) && <CheckCircle2 size={20} className="text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {subjects.length > 0 && (
                <div className="flex gap-4">
                  <Button variant="secondary" className="flex-1 py-6 rounded-3xl" onClick={() => setStep(3)}>Back</Button>
                  <Button 
                    className="flex-[2] py-6 rounded-3xl" 
                    isLoading={loading} 
                    onClick={finish}
                    disabled={selectedSubjects.length === 0 || loading}
                  >
                    {loading ? 'Setting up…' : 'Launch My Journey! 🚀'}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
