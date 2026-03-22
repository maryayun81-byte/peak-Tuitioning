'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Pause, Play, X, Music, 
  Volume2, FastForward, CheckCircle2,
  Sparkles, Coffee, AlertCircle, Target, ChevronRight,
  Trophy, Award, Heart, Star
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface FocusModeProps {
  session: any
  onComplete: () => void
  onCancel: () => void
}

const MUSIC_TRACKS = [
  { name: 'Lo-Fi Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, // Placeholder
  { name: 'Piano Calm', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { name: 'Forest Rain', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
]

export const FocusMode = ({ session, onComplete, onCancel }: FocusModeProps) => {
  const supabase = getSupabaseBrowserClient()
  
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem(`focus_time_${session.id}`)
    return saved ? parseInt(saved, 10) : session.duration_minutes * 60
  })
  const [isActive, setIsActive] = useState(true)
  const [interruptions, setInterruptions] = useState(() => {
    const saved = localStorage.getItem(`focus_int_${session.id}`)
    return saved ? parseInt(saved, 10) : 0
  })
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [showMusicList, setShowMusicList] = useState(false)
  const [showVictory, setShowVictory] = useState(false)
  const [showLevelComplete, setShowLevelComplete] = useState(false)
  const [earnedBadge, setEarnedBadge] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<any>(null)

  // Sound Effects
  const playSound = (type: 'start' | 'end') => {
    const url = type === 'start' 
      ? 'https://www.soundjay.com/buttons/sounds/button-3.mp3' 
      : 'https://www.soundjay.com/buttons/sounds/button-10.mp3'
    const audio = new Audio(url)
    audio.volume = 0.5
    audio.play().catch(() => {})
  }

  useEffect(() => {
    playSound('start')
    return () => {
      // Logic for saving state on unmount if session not complete
      if (timeLeft > 0) {
        localStorage.setItem(`focus_time_${session.id}`, timeLeft.toString())
        localStorage.setItem(`focus_int_${session.id}`, interruptions.toString())
      }
    }
  }, [])

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          const next = t - 1
          localStorage.setItem(`focus_time_${session.id}`, next.toString())
          return next
        })
      }, 1000)
    } else if (timeLeft === 0) {
      handleFinished()
    }
    return () => clearInterval(timerRef.current)
  }, [isActive, timeLeft])

  useEffect(() => {
    localStorage.setItem(`focus_int_${session.id}`, interruptions.toString())
  }, [interruptions])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = ((session.duration_minutes * 60 - timeLeft) / (session.duration_minutes * 60)) * 100

  const handleFinished = async () => {
    setIsActive(false)
    playSound('end')
    const toastId = toast.loading('Recording your focus achievement...')
    try {
      // 1. Mark session as completed
      const { error: sessError } = await supabase
        .from('study_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id)
      
      if (sessError) throw sessError
      
      // 2. Create focus log
      const { error: logError } = await supabase.from('focus_logs').insert({
        session_id: session.id,
        actual_focus_minutes: session.duration_minutes,
        interruption_count: interruptions,
        focus_score: Math.max(0, 100 - (interruptions * 5)),
        started_at: new Date(Date.now() - session.duration_minutes * 60000).toISOString(),
        ended_at: new Date().toISOString()
      })

      if (logError) throw logError

      // 3. Check for Plan Completion (using plan_id)
      if (session.plan_id) {
        const { data: planSessions, error: fetchError } = await supabase
          .from('study_sessions')
          .select('status')
          .eq('plan_id', session.plan_id)

        if (fetchError) throw fetchError

        const total = planSessions?.length || 0
        const completed = planSessions?.filter(s => s.status === 'completed').length || 0

        // If this plan is now 100% complete
        if (total > 0 && completed === total) {
          // Award Badge
          const { error: badgeError } = await supabase.from('study_badges').insert({
            student_id: session.student_id,
            badge_type: 'weekly_mastery',
            metadata: { plan_id: session.plan_id, session_count: total }
          })
          
          if (badgeError) throw badgeError

          // Notify Parent & Student
          const { data: studentData } = await supabase
            .from('students')
            .select('full_name, user_id, parent_id')
            .eq('id', session.student_id)
            .single()
          
          if (studentData) {
            await supabase.from('notifications').insert({
              user_id: studentData.user_id,
              title: '🏆 Plan Mastered!',
              body: `Amazing consistency! You completed all ${total} missions in your roadmap!`,
              type: 'achievement'
            })

            if (studentData.parent_id) {
              const { data: parentData } = await supabase.from('parents').select('user_id').eq('id', studentData.parent_id).single()
              if (parentData) {
                await supabase.from('notifications').insert({
                  user_id: parentData.user_id,
                  title: `🌟 ${studentData.full_name.split(' ')[0]} Finished a Roadmap!`,
                  body: `${studentData.full_name} has just successfully completed their entire study plan! 🏆`,
                  type: 'achievement'
                })
              }
            }
          }
          setEarnedBadge('Roadmap Master')
          setShowVictory(true)
          toast.success('Mastery Badge Unlocked!', { id: toastId })
        } else {
          setShowLevelComplete(true)
          toast.dismiss(toastId)
          setTimeout(() => onComplete(), 3000)
        }
      } else {
        // Fallback for sessions without a plan
        setShowLevelComplete(true)
        toast.dismiss(toastId)
        setTimeout(() => onComplete(), 3000)
      }

      localStorage.removeItem(`focus_time_${session.id}`)
      localStorage.removeItem(`focus_int_${session.id}`)

    } catch (err: any) {
      console.error('Focus completion error:', err)
      toast.error('Failed to save session: ' + err.message, { id: toastId })
      // Even on error, we might want to allow them to continue to reflection?
      // For now, let's keep the error visible so they don't lose progress silently.
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col items-center justify-center p-4 sm:p-12 overflow-hidden">
      {/* Dynamic Background Animations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <motion.div 
           animate={{ 
             scale: [1, 1.2, 1],
             rotate: [0, 90, 0],
             opacity: [0.05, 0.15, 0.05]
           }}
           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
           className="absolute -top-1/4 -left-1/4 w-full h-full bg-[radial-gradient(circle_at_center,var(--primary),transparent)] blur-[120px]" 
         />
         <motion.div 
           animate={{ 
             scale: [1.2, 1, 1.2],
             rotate: [0, -90, 0],
             opacity: [0.05, 0.1, 0.05]
           }}
           transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
           className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-[radial-gradient(circle_at_center,var(--indigo-500),transparent)] blur-[120px]" 
         />
         
         {/* Particle Effect */}
         {[...Array(20)].map((_, i) => (
           <motion.div
             key={i}
             initial={{ 
               x: Math.random() * 2000 - 1000, 
               y: Math.random() * 2000 - 1000,
               opacity: Math.random() * 0.5 
             }}
             animate={{ 
               y: [null, -2000],
               rotate: [0, 360]
             }}
             transition={{ 
               duration: 10 + Math.random() * 20, 
               repeat: Infinity, 
               ease: "linear",
               delay: Math.random() * 10
             }}
             className="absolute w-1 h-1 bg-white rounded-full"
           />
         ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 sm:top-8 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between z-20">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
               <Target size={18} />
            </div>
            <div>
               <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-60">Focusing On</h2>
               <p className="text-sm sm:text-xl font-bold truncate max-w-[150px] sm:max-w-none">{session.subject?.name || 'Self-Study'}</p>
            </div>
         </div>
         <Button variant="secondary" className="rounded-2xl text-xs px-4" onClick={onCancel}><X size={16} /> Exit Focus</Button>
      </div>

      {/* Main Focus Area */}
      <div className="relative text-center space-y-8 sm:space-y-12 max-w-2xl w-full z-10 px-4">
         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
            <h1 className="text-[80px] sm:text-[180px] font-black tracking-tighter tabular-nums leading-none">
               {formatTime(timeLeft)}
            </h1>
            <div className="flex items-center justify-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] sm:text-sm">
               <Sparkles size={16} className="animate-pulse" /> Deep Work In Progress
            </div>
         </motion.div>

         {/* Level Progress Bar */}
         <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-40">
               <span>Level Progress</span>
               <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-3 sm:h-4 w-full bg-[var(--input)] rounded-full border border-[var(--card-border)] p-0.5 sm:p-1 overflow-hidden shadow-inner">
               <motion.div 
                 initial={{ width: 0 }} 
                 animate={{ width: `${progress}%` }} 
                 className="h-full bg-gradient-to-r from-primary via-indigo-500 to-primary rounded-full relative"
               >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[slide_1s_linear_infinite]" />
               </motion.div>
            </div>
         </div>

         {/* Goals Preview */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {session.goals?.[0] && (
               <Card className="p-4 sm:p-6 bg-[var(--input)] border-none text-left space-y-2">
                  <h4 className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-40">Main Goal</h4>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed italic">“{session.goals[0].objective}”</p>
               </Card>
            )}
            <Card className="p-4 sm:p-6 bg-[var(--input)] border-none text-left space-y-2 group cursor-pointer hover:bg-amber-500/10 transition-colors" onClick={() => setInterruptions(i => i + 1)}>
               <div className="flex items-center justify-between">
                  <h4 className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-40">Interruptions</h4>
                  <Badge variant="warning">{interruptions}</Badge>
               </div>
               <p className="text-[8px] sm:text-[10px] opacity-40">Tap here if you got distracted. Stay honest!</p>
            </Card>
         </div>

         {/* Controls */}
         <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 sm:pt-8">
            <Button size="lg" className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white text-black hover:bg-slate-100 shadow-2xl" onClick={() => setIsActive(!isActive)}>
               {isActive ? <Pause size={28} /> : <Play size={28} />}
            </Button>
            
            <div className="flex flex-col items-center gap-3 relative">
               <div className="flex items-center gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-3xl bg-[var(--card)] border border-[var(--card-border)] shadow-xl">
                  <button className={`text-[var(--text-muted)] hover:text-primary transition-colors ${isMuted ? 'opacity-30' : ''}`} onClick={() => setIsMuted(!isMuted)}>
                     <Volume2 size={24} />
                  </button>
                  <div className="w-px h-6 bg-[var(--card-border)]" />
                  <div className="flex flex-col text-left min-w-[100px] sm:min-w-[120px] cursor-pointer" onClick={() => setShowMusicList(!showMusicList)}>
                     <span className="text-[8px] sm:text-[10px] uppercase font-black opacity-40 tracking-widest">Ambient Music</span>
                     <span className="text-xs font-bold truncate flex items-center gap-2">
                        {MUSIC_TRACKS[currentTrack].name} <ChevronRight size={12} className={showMusicList ? 'rotate-90' : ''} />
                     </span>
                  </div>
               </div>

               {/* Music Selection Overlay */}
               <AnimatePresence>
                  {showMusicList && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-4 w-full bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-2 shadow-2xl z-50 overflow-hidden"
                    >
                       <div className="max-h-[200px] overflow-y-auto space-y-1">
                          {MUSIC_TRACKS.map((track, i) => (
                            <button
                              key={i}
                              onClick={() => { setCurrentTrack(i); setShowMusicList(false) }}
                              className={`w-full text-left p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${currentTrack === i ? 'bg-primary/10 text-primary' : 'hover:bg-[var(--input)]'}`}
                            >
                               {track.name}
                               {currentTrack === i && <Sparkles size={12} />}
                            </button>
                          ))}
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>
         </div>
      </div>

      {/* Break Advice Footer */}
      <AnimatePresence>
        {!isActive && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="absolute bottom-8 sm:bottom-12 max-w-sm sm:max-w-md text-center bg-amber-500/10 border border-amber-500/20 p-4 sm:p-6 rounded-3xl backdrop-blur-xl z-20 mx-4">
             <div className="flex flex-col items-center gap-3">
                <Coffee className="text-amber-500" size={32} />
                <h4 className="font-bold text-sm sm:text-base">Taking a short break?</h4>
                <p className="text-[10px] sm:text-xs opacity-60">Deep focus can be tiring. Reset your mind for 5 minutes before jumping back in. You're doing great!</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Level Complete Celebration Overlay */}
      <AnimatePresence>
        {showLevelComplete && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             className="fixed inset-0 z-[150] bg-primary/20 backdrop-blur-md flex items-center justify-center p-6"
           >
              <motion.div 
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="bg-[var(--card)] p-8 rounded-[3rem] text-center shadow-2xl border-4 border-primary/20 max-w-xs w-full space-y-4"
              >
                 <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center text-primary">
                    <CheckCircle2 size={48} />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Level Complete!</h3>
                    <p className="text-xs font-bold opacity-60">You're one step closer to victory! 🔥</p>
                 </div>
                 <Badge variant="primary" className="py-2 px-4 rounded-xl">+100 XP Earned</Badge>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Victory Celebration Overlay */}
      <AnimatePresence>
        {showVictory && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6"
           >
              {/* Confetti-like background particles */}
              <div className="absolute inset-0 pointer-events-none">
                 {[...Array(30)].map((_, i) => (
                   <motion.div 
                     key={i}
                     initial={{ x: 0, y: 0, opacity: 1 }}
                     animate={{ 
                       x: Math.random() * 1000 - 500, 
                       y: Math.random() * 1000 - 500,
                       rotate: 360,
                       opacity: 0 
                     }}
                     transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                     className={`absolute w-3 h-3 rounded-sm ${['bg-amber-400', 'bg-primary', 'bg-emerald-400', 'bg-rose-400'][i % 4]}`}
                     style={{ left: '50%', top: '50%' }}
                   />
                 ))}
              </div>

              <motion.div 
                initial={{ scale: 0.5, y: 100 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-md w-full text-center space-y-8 relative"
              >
                 <div className="relative">
                    <motion.div 
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="w-40 h-40 sm:w-56 sm:h-56 bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 rounded-[3rem] mx-auto flex items-center justify-center shadow-[0_0_80px_rgba(245,158,11,0.4)]"
                    >
                       <Trophy size={80} className="text-white drop-shadow-2xl" />
                    </motion.div>
                    
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -inset-8 bg-amber-500 rounded-full -z-10 blur-2xl"
                    />
                 </div>

                 <div className="space-y-4">
                    <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase">Ultimate Victory!</h2>
                    <p className="text-amber-200 font-bold tracking-widest text-sm uppercase">You've Earned the {earnedBadge} Badge</p>
                    <p className="text-white/60 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto">
                       Sensational work! You've completed every single session of your study plan. Your consistency is world-class! 🌟
                    </p>
                 </div>

                 <div className="pt-8">
                    <Button 
                      size="lg" 
                      className="w-full h-16 rounded-[2rem] bg-white text-black hover:bg-amber-50 font-black text-lg shadow-2xl transition-transform hover:scale-105 active:scale-95"
                      onClick={onComplete}
                    >
                       CLAIM MY BADGE <Sparkles className="ml-3 text-amber-500" />
                    </Button>
                 </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
