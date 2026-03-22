'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle2, BookOpen, AlertCircle, 
  ChevronRight, Sparkles, Star, ExternalLink, Library, Target, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface ReflectionSystemProps {
  session: any
  onComplete: () => void
}

export const ReflectionSystem = ({ session, onComplete }: ReflectionSystemProps) => {
  const supabase = getSupabaseBrowserClient()
  
  const [reflection, setReflection] = useState({
    completed: '',
    learned: '',
    difficult: ''
  })
  const [saving, setSaving] = useState(false)
  const [showPractice, setShowPractice] = useState(false)
  const [resources, setResources] = useState<any[]>([])
  const [loadingResources, setLoadingResources] = useState(false)

  const saveReflection = async () => {
    setSaving(true)
    const toastId = toast.loading('Preserving your insights...')
    try {
      const { error } = await supabase.from('study_reflections').insert({
        session_id: session.id,
        completed_summary: reflection.completed,
        learned_summary: reflection.learned,
        difficulty_summary: reflection.difficult
      })

      if (error) throw error

      // Grant 30 XP for completing a session
      const { data: studentData } = await supabase
        .from('students')
        .select('xp')
        .eq('id', session.student_id)
        .single()
      await supabase
        .from('students')
        .update({ xp: (studentData?.xp || 0) + 30 })
        .eq('id', session.student_id)

      toast.success('Session complete! +30 XP earned 🌟', { id: toastId })
      
      // Check for practice resources with fallback to general resources
      setLoadingResources(true)
      let { data: res } = await supabase
        .from('resources')
        .select('*')
        .eq('subject_id', session.subject_id)
        .eq('is_practice', true)
      
      if (!res || res.length === 0) {
        // Fallback: Get any resources for this subject
        const { data: generalRes } = await supabase
          .from('resources')
          .select('*')
          .eq('subject_id', session.subject_id)
          .limit(10)
        res = generalRes
      }
      
      if (res && res.length > 0) {
        setResources(res)
        setShowPractice(true)
      } else {
        // Even if no resources, we can show the "Go to Bank" button
        setShowPractice(true)
      }
    } catch (err: any) {
      toast.error('Failed to save reflection: ' + err.message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-[var(--bg)]/95 backdrop-blur-3xl flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-2xl w-full">
         <Card className="p-8 sm:p-12 border-none shadow-2xl space-y-8 relative overflow-hidden bg-[var(--card)]">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Sparkles size={120} className="text-primary" />
            </div>

            <div className="text-center space-y-4 relative z-10">
               <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto text-success border border-success/20">
                  <Star size={32} className="fill-success" />
               </div>
               <h1 className="text-3xl font-black">Mission Accomplished!</h1>
               <p className="text-[var(--text-muted)]">Take a moment to reflect on your journey today. Growth happens in the quiet moments.</p>
            </div>

            <div className="space-y-6 relative z-10">
               <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                     <CheckCircle2 size={14} /> What did I complete?
                  </label>
                  <Textarea 
                    placeholder="Summarize your achievements for this session..." 
                    className="bg-[var(--input)] border-none rounded-2xl p-4 min-h-[100px]"
                    value={reflection.completed}
                    onChange={e => setReflection({...reflection, completed: e.target.value})}
                  />
               </div>

               <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                     <BookOpen size={14} /> What did I learn?
                  </label>
                  <Textarea 
                    placeholder="Capture any new concepts or realizations..." 
                    className="bg-[var(--input)] border-none rounded-2xl p-4 min-h-[100px]"
                    value={reflection.learned}
                    onChange={e => setReflection({...reflection, learned: e.target.value})}
                  />
               </div>

               <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                     <AlertCircle size={14} /> What was difficult?
                  </label>
                  <Textarea 
                    placeholder="Be honest about any challenges you faced..." 
                    className="bg-[var(--input)] border-none rounded-2xl p-4 min-h-[100px]"
                    value={reflection.difficult}
                    onChange={e => setReflection({...reflection, difficult: e.target.value})}
                  />
               </div>
            </div>

            <div className="pt-8 flex flex-col items-center gap-4 relative z-10">
               <Button size="lg" className="w-full rounded-2xl h-14 font-black text-lg" onClick={saveReflection} disabled={saving}>
                  Store in Journal <ChevronRight className="ml-2" />
               </Button>
               <p className="text-[10px] opacity-40 uppercase tracking-widest font-black">Reflection builds real discipline</p>
            </div>
         </Card>
      </motion.div>

      {/* Practice Selection Modal/Overlay */}
      {showPractice && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto">
           <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-4xl w-full space-y-8">
              <div className="text-center space-y-4">
                 <Badge variant="primary" className="py-1 px-4 text-[10px] bg-primary/20 text-primary border-primary/30">PRACTICE PHASE</Badge>
                 <h2 className="text-4xl font-black text-white">Apply Your Learning</h2>
                 <p className="text-white/60 text-lg">Select a chapter from your teacher's Resource Bank to start practicing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {(() => {
                    const chapters = Array.from(new Set(resources.map(r => r.chapter || 'General')))
                    return chapters.map((chap, idx) => (
                       <Card key={chap} className="p-6 bg-white/5 border-white/10 hover:border-primary/50 transition-all group overflow-hidden relative">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Library size={80} className="text-primary" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-4 relative z-10">{chap}</h3>
                          <div className="space-y-3 relative z-10">
                             {resources.filter(r => (r.chapter || 'General') === chap).map(r => (
                                <a 
                                  key={r.id} 
                                  href={r.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group/item"
                                >
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                         <Target size={16} />
                                      </div>
                                      <span className="text-xs font-bold text-white/80 group-hover/item:text-white transition-colors">{r.title}</span>
                                   </div>
                                   <ChevronRight size={14} className="text-white/20 group-hover/item:text-primary transition-colors" />
                                </a>
                             ))}
                          </div>
                       </Card>
                    ))
                 })()}
              </div>

              <div className="pt-8 flex flex-col items-center gap-4">
                 <Button 
                   className="bg-primary text-white hover:bg-primary/90 px-12 py-6 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
                   onClick={() => window.location.href = `/student/resources?subjectId=${session.subject_id}`}
                 >
                    OPEN RESOURCE BANK <ArrowRight className="ml-2" />
                 </Button>
                 <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-white/10 px-12" onClick={onComplete}>
                    I'll practice later
                 </Button>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  )
}
