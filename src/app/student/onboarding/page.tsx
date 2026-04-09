'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Rocket, Sparkles, Smile, Star, 
  ChevronRight, Brain, Music, 
  Palette, Globe, Calculator, 
  CheckCircle2, Flame, BookOpen,
  School, GraduationCap
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
  const [meta, setMeta] = useState<any>(null)

  useEffect(() => {
    if (student) {
      supabase.from('students')
        .select('*, class:classes(name), curriculum:curriculums(name)')
        .eq('id', student.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setMeta(data)
            // Fetch subjects based on curriculum assigned by admin
            supabase.from('subjects')
              .select('*')
              .eq('curriculum_id', data.curriculum_id)
              .then(({ data: sData }) => {
                if (sData) setSubjects(sData)
              })
          }
        })
    }
  }, [student])

  const finish = async () => {
    if (!student) return
    if (!schoolName.trim()) { toast.error('Please enter your school name'); return }
    if (selectedSubjects.length === 0) { toast.error('Please select at least one subject'); return }
    
    setLoading(true)
    try {
      // 1. Submit registered subjects
      const payload = selectedSubjects.map(subId => ({
        student_id: student.id,
        subject_id: subId,
        class_id: student.class_id,
      }))
      const { error: subError } = await supabase
        .from('student_subjects')
        .upsert(payload, { onConflict: 'student_id,subject_id' })
      
      if (subError) throw subError

      // 2. Update student profile in DB
      const { data: updatedStudent, error: updateError } = await supabase
        .from('students')
        .update({
          onboarded: true,
          school_name: schoolName
        })
        .eq('id', student.id)
        .select('*, class:classes(*), curriculum:curriculums(*)')
        .single()

      if (updateError) throw updateError
      if (!updatedStudent) throw new Error('Failed to update student profile. Please try again.')

      // 3. Update avatar in profile (optional)
      if (selectedAvatar) {
        const avatar = AVATARS.find(a => a.id === selectedAvatar)
        if (avatar) {
          await supabase.from('profiles').update({ avatar_url: avatar.emoji }).eq('id', student.user_id)
        }
      }

      // 4. CRITICAL: Write onboarded=true to the Zustand store FIRST — before the
      //    auth.updateUser() call below. This ensures our confirmed value wins the
      //    race against the USER_UPDATED background re-fetch in AuthHandler, which
      //    would otherwise overwrite the store with potentially stale DB data.
      setStudent({ ...updatedStudent, onboarded: true } as any)
      
      // 5. Sync to auth metadata (fire-and-forget — don't let a metadata error
      //    block the user from completing onboarding)
      supabase.auth.updateUser({ data: { onboarded: true } }).catch((e) => {
        console.warn('[Onboarding] Auth metadata update failed (non-critical):', e)
      })

      toast.success('Your journey begins! Welcome to Peak Performance! 🚀')
      
      // 6. Short settle delay to let the store propagate before the layout
      //    guard's useEffect re-runs and sees onboarded=true.
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Use replace so Back button can't return to onboarding
      router.replace('/student')
    } catch (e: any) {
      console.error('Onboarding Error:', e)
      toast.error(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
       <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="text-center space-y-8">
                <div className="relative">
                   <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto shadow-2xl shadow-primary/40 relative z-10">
                      <Rocket size={64} className="text-white" />
                   </div>
                   <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-primary blur-3xl opacity-20" />
                </div>
                
                <div className="space-y-4">
                   <h1 className="text-4xl font-black" style={{ color: 'var(--text)' }}>Welcome to Peak!</h1>
                   <p className="text-sm px-8" style={{ color: 'var(--text-muted)' }}>Ready to unlock your full potential? Let&apos;s build your student legend.</p>
                   
                   {meta && (
                     <div className="flex gap-3 justify-center pt-4">
                        <Badge variant="info" className="px-4 py-2 rounded-xl flex items-center gap-2">
                           <GraduationCap size={14} /> {meta.curriculum?.name}
                        </Badge>
                        <Badge variant="muted" className="px-4 py-2 rounded-xl flex items-center gap-2">
                           <School size={14} /> {meta.class?.name}
                        </Badge>
                     </div>
                   )}
                </div>

                <Button className="w-full py-8 text-xl font-black rounded-[2rem] shadow-xl shadow-primary/20" onClick={() => setStep(2)}>
                   Start My Legend <ChevronRight className="ml-2" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="text-center">
                   <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Who are you?</h2>
                   <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pick an identity that represents your learning style</p>
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
                <Button className="w-full py-6 rounded-[2rem]" disabled={!selectedAvatar} onClick={() => setStep(3)}>
                   Looking Good! <CheckCircle2 className="ml-2" />
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 text-center">
                 <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                    <School size={40} />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Where do you learn?</h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tell us the name of your current school</p>
                 </div>
                 
                 <Input 
                   placeholder="Enter School Name" 
                   value={schoolName} 
                   onChange={e => setSchoolName(e.target.value)} 
                   className="text-center text-lg py-8 rounded-3xl"
                 />

                 <div className="flex gap-4">
                    <Button variant="secondary" className="flex-1 py-6 rounded-3xl" onClick={() => setStep(2)}>Back</Button>
                    <Button className="flex-[2] py-6 rounded-3xl" disabled={!schoolName.trim()} onClick={() => setStep(4)}>Next Step</Button>
                 </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="text-center">
                   <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Your Missions</h2>
                   <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose the subjects you&apos;ll be mastering this term.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2">
                   {subjects.length === 0 && <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>No subjects configured for your curriculum yet.</p>}
                   {subjects.map(s => (
                     <button
                        key={s.id}
                        onClick={() => {
                          if (selectedSubjects.includes(s.id)) setSelectedSubjects(selectedSubjects.filter(id => id !== s.id))
                          else setSelectedSubjects([...selectedSubjects, s.id])
                        }}
                        className={`p-5 rounded-3xl border-2 transition-all flex items-center justify-between mx-1 ${selectedSubjects.includes(s.id) ? 'border-primary bg-primary/5 shadow-inner' : 'border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--input)]'}`}
                     >
                        <div className="flex items-center gap-4 text-left">
                           <div className={`p-3 rounded-2xl ${selectedSubjects.includes(s.id) ? 'bg-primary text-white' : 'bg-[var(--input)] text-muted'}`}>
                              <BookOpen size={18} />
                           </div>
                           <div>
                              <span className="font-bold text-sm block" style={{ color: 'var(--text)' }}>{s.name}</span>
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.code}</span>
                           </div>
                        </div>
                        {selectedSubjects.includes(s.id) && <CheckCircle2 size={20} className="text-primary" />}
                     </button>
                   ))}
                </div>
                <div className="flex gap-4">
                   <Button variant="secondary" className="flex-1 py-6 rounded-3xl" onClick={() => setStep(3)}>Back</Button>
                   <Button className="flex-[2] py-6 rounded-3xl" isLoading={loading} onClick={finish}>Launch My Journey!</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
       </div>
    </div>
  )
}
