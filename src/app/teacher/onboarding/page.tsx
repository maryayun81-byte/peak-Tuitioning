'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Layers,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import type { Curriculum, Subject, Class } from '@/types/database'
import { cn } from '@/lib/utils'

type Step = 'welcome' | 'curriculum' | 'subjects' | 'mapping'

export default function TeacherOnboarding() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile, setProfile } = useAuthStore()
  
  const [step, setStep] = useState<Step>('welcome')
  const [loading, setLoading] = useState(false)
  const [loadingBase, setLoadingBase] = useState(false)
  const [baseError, setBaseError] = useState<string | null>(null)

  // Data from DB
  const [dbCurriculums, setDbCurriculums] = useState<Curriculum[]>([])
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([])
  const [dbClasses, setDbClasses] = useState<Class[]>([])

  // Selection state
  const [selectedCurriculums, setSelectedCurriculums] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [subjectClassMap, setSubjectClassMap] = useState<Record<string, string[]>>({})
  
  // UI State
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  useEffect(() => {
    loadBaseData()
  }, [])

  const loadBaseData = async () => {
    setLoadingBase(true)
    setBaseError(null)
    try {
      const [currRes, subRes, classRes] = await Promise.all([
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('classes').select('*').order('name'),
      ])
      
      if (currRes.error) throw currRes.error
      if (subRes.error) throw subRes.error
      if (classRes.error) throw classRes.error

      setDbCurriculums(currRes.data || [])
      setDbSubjects(subRes.data || [])
      setDbClasses(classRes.data || [])

      if (!currRes.data || currRes.data.length === 0) {
        console.warn('No curriculums found in database')
      }
    } catch (err: any) {
      console.error('Failed to load onboarding metadata:', err)
      setBaseError(err.message || 'Failed to sync with server')
      toast.error('Sync Error: Could not load teaching metadata')
    } finally {
      setLoadingBase(false)
    }
  }

  const handleSkip = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          has_onboarded: true, 
          onboarding_skipped: true 
        })
        .eq('id', profile.id)
      
      if (error) throw error
      
      setProfile({ ...profile, has_onboarded: true })
      toast.success('Onboarding skipped. You can set up your profile later.')
      router.push('/teacher')
    } catch (err) {
      console.error('Skip failed:', err)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!profile) return
    
    // Validate at least one mapping
    const totalMappings = Object.values(subjectClassMap).flat().length
    if (totalMappings === 0) {
      toast.error('Please map at least one class to a subject')
      return
    }

    setLoading(true)
    try {
      // 1. Look up the teacher row ID (teachers.id ≠ profiles.id / auth uid)
      // Check for user_id match
      let { data: teacherRow, error: teacherErr } = await supabase
        .from('teachers')
        .select('id, user_id, email')
        .eq('user_id', profile.id)
        .maybeSingle()
      
      // 2. If not found by user_id, try finding by email (for invited teachers)
      if (!teacherRow && profile.email) {
        const { data: inviteRow } = await supabase
          .from('teachers')
          .select('id, user_id, email')
          .eq('email', profile.email)
          .is('user_id', null)
          .maybeSingle()
        
        if (inviteRow) {
          console.log('Claiming invited teacher record:', inviteRow.id)
          const { data: updatedRow, error: updateErr } = await supabase
            .from('teachers')
            .update({ user_id: profile.id })
            .eq('id', inviteRow.id)
            .select()
            .single()
          
          if (!updateErr) teacherRow = updatedRow
        }
      }

      // 3. If still not found, create a new teacher record (self-registered)
      if (!teacherRow) {
        console.log('Creating new teacher record for:', profile.id)
        const { data: newRow, error: createErr } = await supabase
          .from('teachers')
          .insert({
            user_id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            onboarded: false
          })
          .select()
          .single()
        
        if (createErr) {
          toast.error('Could not create your teacher profile. Please contact admin.')
          console.error('Teacher creation failed:', createErr.message)
          setLoading(false)
          return
        }
        teacherRow = newRow
      }

      if (!teacherRow) {
        toast.error('Teacher record not found. Please contact your admin.')
        return
      }

      const teacherId = teacherRow.id

      // 2. Build mappings using the teachers table ID (not profile/auth UID)
      const mappings: { teacher_id: string; curriculum_id: string; subject_id: string; class_id: string }[] = []
      for (const subjectId of selectedSubjects) {
        const classesForSubject = subjectClassMap[subjectId] || []
        const subject = dbSubjects.find(s => s.id === subjectId)
        if (!subject) continue

        for (const classId of classesForSubject) {
          mappings.push({
            teacher_id: teacherId,
            curriculum_id: subject.curriculum_id,
            subject_id: subjectId,
            class_id: classId
          })
        }
      }

      // 3. Upsert mappings (safe on retry — won't fail if row already exists)
      const { error: mapError } = await supabase
        .from('teacher_teaching_map')
        .upsert(mappings, { onConflict: 'teacher_id,subject_id,class_id' })
      
      if (mapError) {
        console.error('Map insert error:', mapError.message, mapError.code, mapError.details)
        toast.error(`Could not save teaching map: ${mapError.message || 'Unknown error'}`)
        return
      }

      // 4. Also mark the teacher row as onboarded
      await supabase.from('teachers').update({ onboarded: true }).eq('id', teacherId)

      // 5. Mark profile as onboarded
      const { error: profError } = await supabase
        .from('profiles')
        .update({ has_onboarded: true })
        .eq('id', profile.id)
      
      if (profError) {
        console.error('Profile update error:', profError.message, profError.code)
        toast.error(`Could not update profile: ${profError.message || 'Unknown error'}`)
        return
      }

      setProfile({ ...profile, has_onboarded: true })
      toast.success('🎉 Onboarding complete! Welcome to Peak Tuitioning.')
      router.push('/teacher')
    } catch (err: any) {
      const msg = err?.message || err?.error_description || JSON.stringify(err)
      console.error('Completion failed:', msg)
      toast.error(`Failed to save preferences: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  // Derived filtered data
  const filteredSubjects = dbSubjects.filter(s => selectedCurriculums.includes(s.curriculum_id))
  
  const toggleCurriculum = (id: string) => {
    setSelectedCurriculums(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev => {
      const isSelected = prev.includes(id)
      if (isSelected) {
        // Remove from map too
        const nextMap = { ...subjectClassMap }
        delete nextMap[id]
        setSubjectClassMap(nextMap)
        return prev.filter(x => x !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const toggleClassForSubject = (subjectId: string, classId: string) => {
    setSubjectClassMap(prev => {
      const current = prev[subjectId] || []
      const next = current.includes(classId)
        ? current.filter(x => x !== classId)
        : [...current, classId]
      return { ...prev, [subjectId]: next }
    })
  }

  const stepIndex = {
    welcome: 1,
    curriculum: 2,
    subjects: 3,
    mapping: 4
  }[step]

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white flex flex-col">
       {/* Background Decoration */}
       <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
       </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-8 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <GraduationCap className="text-primary" size={20} />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-white/40">Onboarding</div>
            <div className="text-sm font-bold tracking-tight">Step {stepIndex} of 4</div>
          </div>
        </div>

        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === stepIndex ? "w-8 bg-primary shadow-[0_0_12px_rgba(79,140,255,0.5)]" : i < stepIndex! ? "w-3 bg-primary/40" : "w-3 bg-white/10"
              )}
            />
          ))}
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col justify-center text-center"
            >
              <motion.div 
                initial={{ scale: 0.8 }} 
                animate={{ scale: 1 }}
                className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-primary/20"
              >
                <Sparkles className="text-white" size={44} />
              </motion.div>
              <h1 className="text-5xl font-black mb-6 tracking-tight leading-tight">
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Peak Tuitioning</span>
              </h1>
              <p className="text-xl text-white/50 mb-12 leading-relaxed font-medium">
                Hello, {profile?.full_name?.split(' ')[0]}! Let&apos;s personalize your experience by setting up your teaching profile.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="px-10 h-16 text-lg rounded-2xl group" 
                  onClick={() => setStep('curriculum')}
                >
                  Get Started 
                  <ArrowRight size={20} className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="px-8 h-16 text-lg rounded-2xl text-white/40 hover:text-white"
                  onClick={handleSkip}
                  isLoading={loading}
                >
                  Skip setup
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'curriculum' && (
            <motion.div
              key="curriculum"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-10">
                <h2 className="text-3xl font-black mb-3">Which Curriculum(s) do you teach?</h2>
                <p className="text-white/50 text-lg font-medium">Select all that apply to your expertise.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-10">
                {loadingBase ? (
                   <div className="py-20 flex flex-col items-center justify-center space-y-4">
                      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Syncing Curriculums...</p>
                   </div>
                ) : baseError ? (
                   <div className="py-12 bg-rose-500/5 border border-rose-500/20 rounded-3xl text-center space-y-4">
                      <p className="text-rose-400 font-medium">Something went wrong while fetching data.</p>
                      <Button variant="outline" size="sm" onClick={loadBaseData}>Try Again</Button>
                   </div>
                ) : dbCurriculums.length === 0 ? (
                   <div className="py-20 text-center space-y-4 bg-white/5 rounded-3xl border border-white/10">
                      <Layers className="mx-auto text-white/20" size={48} />
                      <div className="space-y-1">
                        <p className="text-white/60 font-bold">No curriculums available yet.</p>
                        <p className="text-white/30 text-sm max-w-xs mx-auto">This usually means the platform is still being set up by the administrator.</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={loadBaseData} className="text-primary hover:text-primary hover:bg-primary/10">Check Again</Button>
                   </div>
                ) : (
                  dbCurriculums.map(cur => (
                    <button
                      key={cur.id}
                      onClick={() => toggleCurriculum(cur.id)}
                      className={cn(
                        "flex items-center justify-between p-6 rounded-2xl transition-all duration-300 border-2 text-left group",
                        selectedCurriculums.includes(cur.id)
                          ? "bg-primary/10 border-primary shadow-lg shadow-primary/5"
                          : "bg-white/5 border-transparent hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                          selectedCurriculums.includes(cur.id) ? "bg-primary text-white" : "bg-white/10 text-white/40"
                        )}>
                          <BookOpen size={24} />
                        </div>
                        <span className="text-xl font-bold">{cur.name}</span>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        selectedCurriculums.includes(cur.id) ? "bg-primary border-primary" : "border-white/10"
                      )}>
                        {selectedCurriculums.includes(cur.id) && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-auto flex gap-4">
                <Button variant="outline" size="lg" className="h-14 px-8 rounded-xl" onClick={() => setStep('welcome')}>Back</Button>
                <Button 
                  size="lg" 
                  className="h-14 flex-1 rounded-xl" 
                  disabled={selectedCurriculums.length === 0}
                  onClick={() => setStep('subjects')}
                >
                  Continue <ChevronRight size={18} />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'subjects' && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-10">
                <h2 className="text-3xl font-black mb-3">What Subjects do you teach?</h2>
                <p className="text-white/50 text-lg font-medium">Select the subjects you are comfortable handling.</p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 mb-10 space-y-3 custom-scrollbar">
                {filteredSubjects.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => toggleSubject(sub.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-5 rounded-2xl transition-all border-2 text-left",
                      selectedSubjects.includes(sub.id)
                        ? "bg-primary/10 border-primary"
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedSubjects.includes(sub.id) ? "bg-primary text-white" : "bg-white/10 text-white/40"
                      )}>
                        <Layers size={20} />
                      </div>
                      <div>
                        <div className="font-bold">{sub.name}</div>
                        <div className="text-xs text-white/30 uppercase tracking-wider">{sub.code}</div>
                      </div>
                    </div>
                    {selectedSubjects.includes(sub.id) && <Check size={18} className="text-primary" strokeWidth={3} />}
                  </button>
                ))}
              </div>

              <div className="mt-auto flex gap-4">
                <Button variant="outline" size="lg" className="h-14 px-8 rounded-xl" onClick={() => setStep('curriculum')}>Back</Button>
                <Button 
                  size="lg" 
                  className="h-14 flex-1 rounded-xl" 
                  disabled={selectedSubjects.length === 0}
                  onClick={() => setStep('mapping')}
                >
                  Set Class Mapping <ChevronRight size={18} />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'mapping' && (
            <motion.div
              key="mapping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Which levels can you teach?</h2>
                <p className="text-white/50 text-lg font-medium">Map each subject to the specific classes you teach.</p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 mb-8 space-y-4 custom-scrollbar">
                {selectedSubjects.map(subId => {
                  const subject = dbSubjects.find(s => s.id === subId)
                  if (!subject) return null
                  const isExpanded = expandedSubject === subId
                  const classesForCurr = dbClasses.filter(c => c.curriculum_id === subject.curriculum_id)
                  const mappedCount = (subjectClassMap[subId] || []).length

                  return (
                    <div key={subId} className="group">
                      <button
                        onClick={() => setExpandedSubject(isExpanded ? null : subId)}
                        className={cn(
                          "w-full flex items-center justify-between p-5 rounded-2xl transition-all duration-300 border-2",
                          isExpanded ? "bg-white/10 border-white/20" : "bg-white/5 border-transparent hover:bg-white/10",
                          mappedCount > 0 && !isExpanded && "border-primary/20 bg-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-10 h-10 rounded-lg flex items-center justify-center",
                             mappedCount > 0 ? "bg-primary text-white" : "bg-white/10 text-white/40"
                           )}>
                              <Layers size={20} />
                           </div>
                           <div className="text-left">
                              <div className="font-bold text-lg">{subject.name}</div>
                              <div className="text-xs text-primary font-bold uppercase tracking-wider">
                                {mappedCount} {mappedCount === 1 ? 'class' : 'classes'} mapped
                              </div>
                           </div>
                        </div>
                        {isExpanded ? <ChevronUp size={20} className="text-white/40" /> : <ChevronDown size={20} className="text-white/40" />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {classesForCurr.map(cls => (
                                <button
                                  key={cls.id}
                                  onClick={() => toggleClassForSubject(subId, cls.id)}
                                  className={cn(
                                    "px-3 py-3 rounded-xl text-sm font-bold transition-all border-2",
                                    subjectClassMap[subId]?.includes(cls.id)
                                      ? "bg-primary text-white border-primary"
                                      : "bg-white/5 text-white/40 border-transparent hover:bg-white/10"
                                  )}
                                >
                                  {cls.name}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>

              <div className="mt-auto flex gap-4">
                <Button variant="outline" size="lg" className="h-14 px-8 rounded-xl" onClick={() => setStep('subjects')}>Back</Button>
                <Button 
                  size="lg" 
                  className="h-14 flex-1 rounded-xl shadow-xl shadow-primary/20" 
                  isLoading={loading}
                  onClick={handleComplete}
                >
                  Finish Setup <Check size={18} className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Styles for scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
