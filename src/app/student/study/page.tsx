'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Sparkles, ChevronRight, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { StudyDashboard } from '@/components/student/study/StudyDashboard'
import { StudyPlanner } from '@/components/student/study/StudyPlanner'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'

export default function StudyHub() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { student } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [isPlanning, setIsPlanning] = useState(false)

  useEffect(() => {
    if (student) loadPlans()
  }, [student])

  const loadPlans = async () => {
    setLoading(true)
    try {
      const { data: studyPlans } = await supabase
        .from('study_plans')
        .select('*')
        .eq('student_id', student?.id)
        .order('created_at', { ascending: false })

      setPlans(studyPlans || [])
      
      if (studyPlans && studyPlans.length > 0) {
        // Default to the first active plan or the most recent one
        const active = studyPlans.find(p => p.is_active) || studyPlans[0]
        setSelectedPlanId(active.id)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  const currentPlan = plans.find(p => p.id === selectedPlanId)

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--card)] p-8 rounded-[2.5rem] border border-[var(--card-border)] shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <BrainCircuit size={120} className="text-primary" />
         </div>
         
         <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
               <BrainCircuit size={32} />
            </div>
            <div>
               <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                  Study Hub
               </h1>
               <p className="text-sm opacity-60 font-medium">Personalized focus ecosystem for measurable growth.</p>
            </div>
         </div>

         <div className="relative z-10 flex flex-wrap items-center gap-4">
            {plans.length > 0 && (
               <div className="flex items-center gap-3 p-2 bg-[var(--input)] rounded-2xl border border-[var(--card-border)]">
                  <span className="pl-3 text-[10px] font-black uppercase tracking-widest opacity-40">Active Plan</span>
                  <select 
                    value={selectedPlanId || ''} 
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 font-bold text-sm pr-10 min-w-[150px]"
                  >
                     {plans.map(p => (
                        <option key={p.id} value={p.id}>
                           {p.name} {p.is_active ? '✨' : ''}
                        </option>
                     ))}
                  </select>
               </div>
            )}
            
            <Button 
               className="rounded-2xl h-14 px-8 font-black shadow-xl shadow-primary/20 bg-primary text-white border-none hover:scale-105 transition-transform" 
               onClick={() => setIsPlanning(true)}
            >
               <Plus size={18} className="mr-2" /> New Strategy
            </Button>
         </div>
      </div>

      <AnimatePresence mode="wait">
        {plans.length > 0 ? (
          <motion.div key={selectedPlanId || 'dashboard'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
             <StudyDashboard planId={selectedPlanId} onPlanUpdate={loadPlans} />
          </motion.div>
        ) : (
          <motion.div key="no-plan" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
             <Card className="p-20 text-center space-y-8 border-none shadow-2xl bg-gradient-to-br from-primary/5 via-transparent to-indigo-500/5 relative overflow-hidden group rounded-[3rem]">
                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:scale-110 transition-transform duration-700">
                   <Sparkles size={250} className="text-primary fill-primary" />
                </div>
                
                <div className="space-y-6 max-w-lg mx-auto relative z-10">
                   <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto text-primary">
                      <BrainCircuit size={48} />
                   </div>
                   <h2 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text)' }}>No active study plan found.</h2>
                   <p className="text-lg opacity-60 leading-relaxed font-medium">Success isn't accidental—it's planned. Let's build your goal-oriented roadmap and start focusing like a master.</p>
                </div>
                
                <div className="flex justify-center relative z-10 pt-4">
                   <Button size="lg" className="px-16 rounded-full h-20 text-lg font-black bg-slate-900 shadow-2xl shadow-primary/30 text-white" onClick={() => setIsPlanning(true)}>
                      Enter Guided Planning <ChevronRight className="ml-2" />
                   </Button>
                </div>
             </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {isPlanning && (
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-[120] bg-[var(--bg)] p-8 overflow-y-auto">
               <div className="max-w-4xl mx-auto py-12">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-black">Plan Your Focus</h2>
                     <Button variant="secondary" className="rounded-xl px-6" onClick={() => setIsPlanning(false)}>Close</Button>
                  </div>
                  <StudyPlanner onComplete={() => { setIsPlanning(false); loadPlans() }} />
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  )
}

