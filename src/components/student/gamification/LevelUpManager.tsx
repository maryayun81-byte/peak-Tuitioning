'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Sparkles, Zap, Award, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { playGeneratedSound } from '@/lib/sounds'
import toast from 'react-hot-toast'
import { LEVEL_THRESHOLDS } from '@/lib/gamification'

export function LevelUpManager() {
  const { student, profile, setStudent } = useAuthStore()
  const supabase = getSupabaseBrowserClient()
  
  const [showCelebration, setShowCelebration] = useState(false)
  const [currentLevelUp, setCurrentLevelUp] = useState<any>(null)
  const [isPioneer, setIsPioneer] = useState(false)
  
  // Track previous XP to detect crossing thresholds
  const prevXpRef = useRef<number | null>(null)

  useEffect(() => {
    if (!student) return
    
    const xp = student.xp || 0
    
    // Initialize prevXp on first load
    if (prevXpRef.current === null) {
      prevXpRef.current = xp
      return
    }

    const prevXp = prevXpRef.current
    prevXpRef.current = xp

    // Check if we crossed any new thresholds
    const newMilestone = LEVEL_THRESHOLDS.find(t => xp >= t.xp && prevXp < t.xp)
    
    if (newMilestone) {
      handleLevelUp(newMilestone)
    }
  }, [student?.xp])

  const handleLevelUp = async (milestone: any) => {
    if (!student || !profile) return

    try {
      // 0. Check notification preferences
      const { preferences } = useNotificationStore.getState()
      
      // 1. Check if student is the PIONEER for this level
      // Badge types: level_1_pioneer, level_1_conqueror, etc.
      const pioneerBadgeType = `level_${milestone.level}_pioneer`
      const conquerorBadgeType = `level_${milestone.level}_conqueror`

      const { count } = await supabase
        .from('study_badges')
        .select('*', { count: 'exact', head: true })
        .eq('badge_type', pioneerBadgeType)

      const reachedFirst = count === 0
      setIsPioneer(reachedFirst)
      
      const badgeType = reachedFirst ? pioneerBadgeType : conquerorBadgeType
      const badgeName = reachedFirst ? `Level ${milestone.level} Pioneer` : `Level ${milestone.level} Conqueror`

      // 2. Award Badge
      const { data: existingBadge } = await supabase
        .from('study_badges')
        .select('id')
        .eq('student_id', student.id)
        .eq('badge_type', badgeType)
        .maybeSingle()

      if (!existingBadge) {
        await supabase.from('study_badges').insert({
          student_id: student.id,
          badge_type: badgeType,
          metadata: { 
            level: milestone.level, 
            xp_reached: milestone.xp,
            is_pioneer: reachedFirst,
            reached_at: new Date().toISOString()
          }
        })

        // 3. Send Notification
        await supabase.from('notifications').insert({
          user_id: profile.id,
          title: reachedFirst ? '🏆 YOU ARE THE FIRST!' : '🎉 Level Completed!',
          body: reachedFirst 
            ? `Incredible! You are the FIRST student to complete Level ${milestone.level}! You've earned the unique Pioneer Badge.`
            : `Congratulations! You've completed Level ${milestone.level} and earned the Conqueror Badge. Keep pushing!`,
          type: 'achievement'
        })
      }

      // 4. Trigger Celebration UI if enabled
      if (preferences.levelUp) {
        setCurrentLevelUp(milestone)
        setShowCelebration(true)
        
        // Play synthesized sound
        if (preferences.soundEnabled) {
          playGeneratedSound('achievement', preferences.soundVariant)
        }
      }

    } catch (err) {
      console.error('Level up error:', err)
    }
  }

  return (
    <AnimatePresence>
      {showCelebration && currentLevelUp && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            onClick={() => setShowCelebration(false)}
          />

          {/* Celebration Card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3.5rem] p-8 sm:p-12 text-center shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-4 border-amber-400 overflow-hidden"
          >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
               {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{ 
                       opacity: [0, 1, 0], 
                       scale: [0, 1, 0.5],
                       x: (Math.random() - 0.5) * 400,
                       y: (Math.random() - 0.5) * 400
                    }}
                    transition={{ duration: 3, repeat: Infinity, delay: Math.random() * 2 }}
                    className="absolute top-1/2 left-1/2 text-xl"
                  >
                     {['🎊', '✨', '⭐', '🎈', '🔥'][i % 5]}
                  </motion.div>
               ))}
            </div>

            <div className="relative z-10 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] animate-bounce">
                <Sparkles size={14} fill="currentColor" /> Level Completed
              </div>

              <div className="relative">
                <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                   className="absolute -inset-8 border-4 border-dashed border-amber-400/30 rounded-full"
                />
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-white shadow-2xl relative
                  ${isPioneer 
                    ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 ring-8 ring-amber-400/20' 
                    : 'bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 ring-8 ring-indigo-500/20'}
                `}>
                  {isPioneer ? <Trophy size={64} className="drop-shadow-lg" /> : <Award size={64} className="drop-shadow-lg" />}
                  
                  {isPioneer && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                      className="absolute -top-2 -right-2 bg-white text-rose-600 px-3 py-1 rounded-full text-[10px] font-black border-2 border-rose-600 shadow-lg"
                    >
                      #1 FIRST
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                  LEVEL {currentLevelUp.level} CLEAR!
                </h2>
                <div className="space-y-1">
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">RANK EARNED</p>
                  <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                    {currentLevelUp.title}
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-2">
                 <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed italic">
                   "Success is not final, failure is not fatal: it is the courage to continue that counts."
                 </p>
                 <div className="flex items-center justify-center gap-4 pt-2">
                    <div className="flex items-center gap-1.5 text-amber-500 font-black text-[10px] uppercase">
                       <Zap size={14} fill="currentColor" /> {currentLevelUp.xp} XP Total
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="flex items-center gap-1.5 text-indigo-500 font-black text-[10px] uppercase">
                       <Star size={14} fill="currentColor" /> Unique Badge
                    </div>
                 </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => setShowCelebration(false)} 
                  className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-3xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                >
                  CONTINUE ADVENTURE
                </button>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Progressing to Next Milestone...
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
