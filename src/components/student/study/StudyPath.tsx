'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Lock, Play, Star, Trophy, X, ArrowRight, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { Avatar } from '@/components/ui/Avatar'

interface StudyPathProps {
  sessions: any[]
  readOnly?: boolean
  planName?: string
  planRange?: string
}

export const StudyPath = ({ 
  sessions, 
  readOnly = false,
  planName = "Study Roadmap",
  planRange
}: StudyPathProps) => {
  const router = useRouter()
  
  // 1. Sort and Group sessions by date into "Levels"
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.start_time.localeCompare(b.start_time)
  })

  const groupedByDate = sortedSessions.reduce((acc: any, session: any) => {
    const date = session.date
    if (!acc[date]) acc[date] = []
    acc[date].push(session)
    return acc
  }, {})

  const days = Object.keys(groupedByDate).sort().map(date => ({
    date,
    sessions: groupedByDate[date],
    isCompleted: groupedByDate[date].every((s: any) => s.status === 'completed'),
    subjects: Array.from(new Set(groupedByDate[date].map((s: any) => s.subject?.name || 'Self-Study'))) as string[]
  }))

  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [celebrating, setCelebrating] = useState(false)
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [hasAwarded, setHasAwarded] = useState(false) // Local flag to prevent re-running

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 2. Identify Active Level
  let activeLevelIdx = days.findIndex(d => !d.isCompleted)
  if (activeLevelIdx === -1 && days.length > 0) activeLevelIdx = days.length // All done!

  const isAllComplete = activeLevelIdx === days.length && days.length > 0

  const { profile } = useAuthStore()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const handleAwardRewards = async () => {
      // Awarding rewards is ONLY for students in active mode
      if (isAllComplete && !hasAwarded && profile?.id && !readOnly) {
         setHasAwarded(true)
         
         try {
            const studentId = sessions[0]?.student_id
            if (!studentId) return

            // ── 1. Check if Badge Already Exists ────────────────────────
            const planId = sessions[0]?.study_plan_id ?? 'general'
            const { data: existing } = await supabase
              .from('study_badges')
              .select('id')
              .eq('student_id', studentId)
              .eq('badge_type', 'map_master')
              .eq('metadata->>plan_id', planId)
              .limit(1)

            // If badge exists, they've already received the rewards
            if (existing && existing.length > 0) return

            // Show the modal
            setCelebrating(true)

            // ── 2. Grant 100 XP ──────────────────────────────────────────────
            const { data: studentRow } = await supabase
              .from('students')
              .select('xp, user_id')
              .eq('id', studentId)
              .single()
            
            await supabase
              .from('students')
              .update({ xp: (studentRow?.xp || 0) + 100 })
              .eq('id', studentId)

            // ── 3. Award Badge ───────────────────────────────────────────────
            await supabase.from('study_badges').insert({
              student_id: studentId,
              badge_type: 'map_master',
              metadata: { plan_id: planId, plan_name: planName }
            })

            // ── 4. Notify the Student themselves ─────────────────────────────
            if (studentRow?.user_id) {
              await supabase.from('notifications').insert({
                user_id: studentRow.user_id,
                title: '🏆 Roadmap Mastered!',
                body: `You completed every level in "${planName}"! +100 XP & a Roadmap Master badge have been awarded.`,
                type: 'achievement'
              })
            }

            // ── 5. Notify linked Parents ───────────────────────────────────
            const { data: links } = await supabase
              .from('parent_student_links')
              .select('parent:parents(user_id)')
              .eq('student_id', studentId)

            if (links && links.length > 0) {
               for (const link of links) {
                  const parentUserId = (link.parent as any)?.user_id
                  if (parentUserId) {
                     await supabase.from('notifications').insert({
                       user_id: parentUserId,
                       title: '🌟 Proud Parent Moment!',
                       body: `${profile.full_name} has just completed all levels in "${planName}" and earned a Roadmap Master badge! 🎖️`,
                       type: 'achievement'
                     })
                  }
               }
            }

            toast.success('Study Plan Mastered! +100 XP & a badge earned! 🎓', {
               duration: 6000,
               icon: '🔥'
            })
         } catch (err) {
            console.error('Reward error:', err)
         }
      }
    }

    handleAwardRewards()
  }, [isAllComplete, profile?.id, readOnly, hasAwarded])

  const getDayMotivationalMessage = (idx: number, total: number) => {
     if (idx === 0) return "Day 1: The Adventure Begins! 🌟"
     if (idx === total - 1) return "The Grand Finale! You're almost there! 🏆"
     const progress = (idx / total) * 100
     if (progress < 50) return `Day ${idx + 1}: Stay Strong! 💪`
     return `Day ${idx + 1}: You're Crushing it! 🔥`
  }

  // Path logic helpers
  const getDayPosition = (idx: number, currentWidth: number) => {
    const isMobile = currentWidth < 640
    const centerX = isMobile ? (currentWidth - 32) / 2 : 200 // Adjust for padding
    const xOffset = Math.sin(idx * 1.5) * (isMobile ? 60 : 90)
    return { x: centerX + xOffset, y: idx * 200 + 60 }
  }

  return (
    <div className="relative min-h-screen bg-transparent overflow-hidden py-20 px-4">
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
         <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
         <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto flex flex-col items-center">
         {/* Plan Header Metadata */}
         <div className="mb-16 text-center space-y-3 relative z-20">
            <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]"
            >
               <Sparkles size={14} fill="currentColor" /> Active Roadmap
            </motion.div>
            <h1 className="text-2xl sm:text-5xl font-black tracking-tighter uppercase italic line-clamp-2 max-w-[95%] mx-auto leading-tight break-words" style={{ color: 'var(--text)' }}>
               {planName}
            </h1>
            {planRange && (
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-100/80 px-4 py-1.5 rounded-full inline-block mt-2">
                  {planRange}
               </p>
            )}
         </div>

         {/* The Canvas for Nodes */}
         <div className="relative flex flex-col items-center w-full" style={{ height: `${(days.length + 1) * 200 + 100}px` }}>
            {/* Candy Crush Path SVG */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none opacity-40" 
              style={{ overflow: 'visible' }}
            >
              <motion.path 
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: 1 }}
                 d={(() => {
                    const isMobile = width < 640
                    const centerX = isMobile ? (width - 32) / 2 : 200
                    let d = `M ${centerX} 0`
                    
                    const pathSteps = days.map((_, i) => getDayPosition(i, width))
                    
                    // Final move to Victory Valley
                    const lastPos = getDayPosition(days.length - 1, width)
                    const victoryPos = { x: centerX, y: days.length * 200 + 150 }
                    pathSteps.push(victoryPos)

                    pathSteps.forEach((step, idx) => {
                       if (idx === 0) {
                          d += ` L ${step.x} ${step.y}`
                          return
                       }
                       const prev = pathSteps[idx - 1]
                       const cpOffset = isMobile ? 50 : 100
                       const cpX = (prev.x + step.x) / 2 + (idx % 2 === 0 ? cpOffset : -cpOffset)
                       const cpY = (prev.y + step.y) / 2
                       d += ` Q ${cpX} ${cpY} ${step.x} ${step.y}`
                    })
                    return d
                 })()}
                 fill="none" 
                 stroke="url(#candyGradient)" 
                 strokeWidth={width < 640 ? "16" : "20"}
                 strokeLinecap="round"
                 strokeDasharray="1, 30"
              />
              <defs>
                 <linearGradient id="candyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f59e0b" />
                 </linearGradient>
              </defs>
            </svg>

            {days.map((day, idx) => {
               const pos = getDayPosition(idx, width)
               const isCompleted = day.isCompleted
               const isActive = idx === activeLevelIdx
               const isLocked = idx > activeLevelIdx
               
               return (
                  <motion.div 
                    key={day.date}
                    initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                    style={{ position: 'absolute', top: pos.y, left: pos.x }}
                    className="z-10"
                  >
                     {/* Motivational Speech Bubble */}
                      {isActive && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ 
                             opacity: 1,
                             y: [0, -5, 0] 
                          }}
                           transition={{ 
                              opacity: { duration: 0.5 },
                              y: { duration: 3, repeat: Infinity } 
                           }}
                           style={{ 
                              left: '50%',
                              x: '-50%',
                              // Viewport clamping to ensure the bubble stays on screen
                              translateX: width < 640 
                                ? Math.max(10 - pos.x, Math.min(width - 42 - pos.x, 0)) 
                                : 0
                           }}
                          className="absolute -top-32 sm:-top-40 bg-white border-2 border-primary/20 p-4 sm:p-6 rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] w-[180px] sm:w-[280px] z-[50] ring-8 ring-primary/5"
                        >
                           <p className="text-[8px] sm:text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-2 text-center">CURRENT FOCUS</p>
                           <p className="text-xs sm:text-base font-black text-slate-800 text-center uppercase leading-tight line-clamp-4">
                              {getDayMotivationalMessage(idx, days.length)}
                           </p>
                           <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-white rotate-45 border-b-2 border-r-2 border-primary/10" />
                        </motion.div>
                     )}

                      <button 
                        onClick={() => setSelectedDay(day)}
                        className={`
                          w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 relative group
                          ${isCompleted 
                            ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-[0_15px_30px_-5px_rgba(16,185,129,0.4)] border-4 border-white' 
                            : isActive 
                              ? 'bg-gradient-to-br from-primary via-indigo-600 to-violet-700 text-white shadow-[0_20px_40px_-5px_rgba(var(--primary-rgb),0.5)] scale-110 ring-[12px] ring-primary/10 border-4 border-white' 
                              : 'bg-white text-slate-300 shadow-xl border-4 border-slate-100 hover:border-slate-200'
                          }
                          ${isLocked ? 'opacity-50 cursor-not-allowed grayscale-[0.5] scale-90' : 'hover:scale-115 active:scale-95'}
                        `}
                        disabled={isLocked}
                      >
                        {isCompleted ? <Check size={40} strokeWidth={4} /> : 
                         isLocked ? <Lock size={32} /> : 
                         <div className="relative w-full h-full flex items-center justify-center">
                            {/* Pulsing Avatar for Active Node */}
                            {isActive && (profile?.avatar_url || (profile as any)?.avatar_metadata) ? (
                               <div className="relative">
                                  <motion.div 
                                     animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                     transition={{ duration: 2, repeat: Infinity }}
                                     className="absolute -inset-4 bg-primary/30 rounded-full blur-md"
                                  />
                                  <Avatar 
                                    url={(profile as any)?.avatar_url} 
                                    metadata={(profile as any)?.avatar_metadata}
                                    name={profile?.full_name} 
                                    size="lg" 
                                    className="border-4 border-white shadow-2xl relative z-10"
                                  />
                               </div>
                            ) : (
                               <>
                                  <Play size={44} fill="currentColor" className="ml-1" />
                                  <motion.div 
                                     animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                                     transition={{ duration: 1.5, repeat: Infinity }}
                                     className="absolute -inset-8 bg-primary/30 rounded-full -z-10"
                                  />
                               </>
                            )}
                         </div>}

                        {!isLocked && (
                           <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest bg-[var(--card)] border-2 border-[var(--primary)]/20 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-[var(--text)]">
                              <Star size={12} className="fill-amber-400 text-amber-400" /> {day.sessions.length} Missions
                           </div>
                        )}
                     </button>
                  </motion.div>
               )
            })}

            {/* Final Victory Level */}
            <motion.div 
              style={{ 
                 position: 'absolute', 
                 top: (days.length * 200 + 150), 
                 left: (width < 640 ? (width - 32) / 2 : 200),
                 x: '-50%',
                 y: '-50%'
              }}
              className="z-10 flex flex-col items-center"
            >
               <motion.div 
                 animate={{ 
                    scale: isAllComplete ? [1, 1.1, 1] : 1,
                    rotate: isAllComplete ? [0, 5, -5, 0] : 0 
                 }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className={`
                    w-32 h-32 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center shadow-2xl relative
                    ${isAllComplete 
                      ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 scale-125 shadow-amber-500/40 text-white' 
                      : 'bg-slate-100 text-slate-400 opacity-50'}
                 `}
               >
                  <Trophy size={48} className={isAllComplete ? 'drop-shadow-lg' : ''} />
                  <span className="text-[10px] font-black uppercase mt-1 tracking-widest">Victory</span>
                  {isAllComplete && (
                     <>
                        <motion.div 
                          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.4, 0.1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="absolute -inset-12 bg-amber-400 rounded-full -z-10"
                        />
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                          className="absolute -inset-4 border-4 border-dashed border-amber-500 rounded-full"
                        />
                     </>
                  )}
               </motion.div>
               <div className="mt-20 text-center w-[200px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Elite Milestone</p>
                  <p className="text-xs font-black text-slate-900 leading-tight uppercase">Journey Master Badge</p>
               </div>
            </motion.div>
         </div>
      </div>

      {/* Day Missions Overlay */}
      <AnimatePresence>
         {selectedDay && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
              onClick={() => setSelectedDay(null)}
            >
               <motion.div 
                 initial={{ y: 100, scale: 0.9 }}
                 animate={{ y: 0, scale: 1 }}
                 exit={{ y: 100, scale: 0.9 }}
                 onClick={(e) => e.stopPropagation()}
                 className="w-full max-w-lg bg-[var(--card)] rounded-[3rem] shadow-2xl overflow-hidden"
               >
                  <div className="p-8 sm:p-10 space-y-8">
                     <div className="flex items-center justify-between">
                        <div className="space-y-1">
                           <h3 className="text-2xl font-black tracking-tight uppercase" style={{ color: 'var(--text)' }}>
                              Day {days.findIndex(d => d.date === selectedDay.date) + 1} Missions
                           </h3>
                           <p className="text-[10px] font-black tracking-widest text-primary uppercase">
                              {new Date(selectedDay.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                           </p>
                        </div>
                        <button 
                          onClick={() => setSelectedDay(null)}
                          className="p-3 hover:bg-[var(--input)] rounded-2xl transition-colors"
                        >
                           <X size={24} style={{ color: 'var(--text-muted)' }} />
                        </button>
                     </div>

                      <div className="space-y-4">
                         {selectedDay.sessions.map((s: any, i: number) => (
                           <div 
                             key={s.id}
                             className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col gap-6 group
                               ${s.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[var(--bg)] border-[var(--card-border)] hover:border-primary/30'}
                             `}
                           >
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110
                                       ${s.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-[var(--card)] text-primary'}
                                    `}>
                                       {s.status === 'completed' ? <Check size={28} strokeWidth={3} /> : <Play size={24} fill="currentColor" />}
                                    </div>
                                    <div className="space-y-1">
                                       <p className="text-[10px] font-black tracking-[0.2em] uppercase leading-none" style={{ color: 'var(--text-muted)' }}>{s.subject?.name || 'Self-Study'}</p>
                                       <p className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>{s.start_time} - {s.end_time}</p>
                                    </div>
                                 </div>

                                 {s.status !== 'completed' ? (
                                    <button 
                                      onClick={() => !readOnly && router.push(`/student/study/focus/${s.id}`)}
                                      disabled={readOnly}
                                      className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2
                                        ${readOnly 
                                          ? 'bg-[var(--input)] text-[var(--text-muted)] border border-[var(--card-border)] shadow-sm' 
                                          : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xl hover:scale-105'}
                                      `}
                                    >
                                       {readOnly ? (
                                         <>
                                           <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">Ready to Focus</span>
                                           <Lock size={12} className="ml-1 opacity-40" />
                                         </>
                                       ) : <span className="flex items-center gap-2">START MISSION <ArrowRight size={14} /></span>}
                                    </button>
                                 ) : (
                                    <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-[10px] uppercase tracking-widest bg-white/60 px-4 py-2 rounded-xl shadow-sm border border-emerald-100">
                                       CLEARED <Check size={14} strokeWidth={3} />
                                    </div>
                                 )}
                              </div>

                              {/* Detailed Telemetry: Goals & Reflections */}
                              {(s.goals?.length > 0 || s.reflections?.length > 0) && (
                                <div className="pt-6 border-t border-[var(--card-border)] space-y-6">
                                   {s.goals?.length > 0 && (
                                      <div className="space-y-3">
                                         <p className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                            <Star size={10} fill="currentColor" className="text-amber-400" /> Strategic Milestones
                                         </p>
                                         <div className="grid grid-cols-1 gap-2">
                                            {s.goals.map((goal: any) => (
                                               <div key={goal.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--card-border)] shadow-sm">
                                                  <div className={`w-4 h-4 rounded-md flex items-center justify-center border-2 ${goal.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--card-border)]'}`}>
                                                     {goal.is_completed && <Check size={10} strokeWidth={4} />}
                                                  </div>
                                                  <p className={`text-[11px] font-bold ${goal.is_completed ? 'line-through opacity-40' : ''}`} style={{ color: 'var(--text)' }}>
                                                     {goal.objective}
                                                  </p>
                                               </div>
                                            ))}
                                         </div>
                                      </div>
                                   )}

                                   {s.reflections?.length > 0 && (
                                      <div className="space-y-3">
                                         <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Sparkles size={10} fill="currentColor" /> Session Reflection
                                         </p>
                                         <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 italic">
                                            <p className="text-xs font-bold leading-relaxed" style={{ color: 'var(--text)' }}>
                                               "{(s.reflections[0].learned_summary || s.reflections[0].completed_summary)?.substring(0, 150)}..."
                                            </p>
                                         </div>
                                      </div>
                                   )}
                                </div>
                              )}
                           </div>
                         ))}
                      </div>

                     <div className="pt-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                           {selectedDay.isCompleted ? "Level Cleared! Awesome work. ✅" : readOnly ? "Student is currently working on this level." : "Complete all missions to unlock next level! 🚀"}
                        </p>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Grand Celebration Overlay */}
      <AnimatePresence>
         {celebrating && isAllComplete && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            >
               <motion.div 
                  initial={{ opacity: 0, scale: 0.5, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-[var(--card)] p-8 sm:p-12 rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-4 border-amber-400 text-center space-y-6 max-w-sm pointer-events-auto"
               >
                  <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full mx-auto flex items-center justify-center text-white shadow-2xl relative">
                     <Star size={48} fill="white" />
                     <motion.div 
                       animate={{ rotate: 360 }}
                       transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                       className="absolute -inset-3 border-2 border-dashed border-amber-400/50 rounded-full"
                     />
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>Roadmap Complete!</h2>
                  <p className="font-bold max-w-xs uppercase text-[10px] tracking-widest leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                     "Consistency is the foundation of excellence. You have successfully conquered every challenge."
                  </p>
                  <button 
                    onClick={() => setCelebrating(false)} 
                    className="w-full py-4 rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  >
                     CONTINUE JOURNEY
                  </button>
               </motion.div>
               
               {/* Confetti (Simple emoji burst) */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ 
                         opacity: [0, 1, 0], 
                         scale: [0, 1.5, 0.5],
                         x: Math.cos(i * 30 * Math.PI / 180) * 300,
                         y: Math.sin(i * 30 * Math.PI / 180) * 300
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: Math.random() }}
                      className="text-4xl absolute"
                    >
                       {['🎊', '✨', '⭐', '🎈', '🔥'][i % 5]}
                    </motion.div>
                  ))}
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  )
}
