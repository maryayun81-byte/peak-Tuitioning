'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import 'katex/dist/katex.min.css'
import {
  Trophy, Clock, Timer, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Save, Zap, HelpCircle, Star, AlertTriangle, Volume2, VolumeX
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface Question {
  id: string
  text: string
  options: { id: string; text: string }[]
  correct_option_id: string
  marks: number
  time_seconds: number
  image_url: string | null
}

interface TriviaSession {
  id: string
  title: string
  duration_minutes: number | null
  subject?: { name: string } | null
}

const SOUNDS = {
  CORRECT: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c3523a4111.mp3', // Success Chime
  WRONG: 'https://cdn.pixabay.com/audio/2022/03/24/audio_03d276b262.mp3',   // Dark Error
  TICK: 'https://cdn.pixabay.com/audio/2022/03/15/audio_820c6a5a94.mp3',   // Sharp Ticker
  BUZZER: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b06394fc.mp3',// High-Freq Buzzer
  COMBO: 'https://cdn.pixabay.com/audio/2022/03/10/audio_502758f1f8.mp3', // Multi-Chime
  GOLD: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625693e50.mp3',   // Shining Sound
  TENSION: 'https://cdn.pixabay.com/audio/2021/11/24/audio_34b6b69038.mp3',// Heartbeat Tension
  MILESTONE: 'https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e02f9.mp3' // Achievement
}

export default function StudentTriviaAttemptPage() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  // State
  const [session, setSession] = useState<TriviaSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [myGroupId, setMyGroupId] = useState<string | null>(null)
  
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [timings, setTimings] = useState<Record<string, { time_taken_s: number; timed_out: boolean }>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false)
  
  // Combos & Streaks
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [showCombo, setShowCombo] = useState(false)

  // Immersive Features
  const [milestone, setMilestone] = useState<string | null>(null)
  const [shouts, setShouts] = useState<{ id: number; emoji: string; x: number }[]>([])
  const shoutIdRef = useRef(0)
  
  // Audio Engine
  const [audioEnabled, setAudioEnabled] = useState(true) // Default to true
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})
  const bgMusicRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const activeOscsRef = useRef<OscillatorNode[]>([])

  const silenceOscillators = useCallback(() => {
    activeOscsRef.current.forEach(osc => {
      try { osc.stop() } catch (e) {}
    })
    activeOscsRef.current = []
  }, [])

  useEffect(() => {
    // Preload sounds
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url)
      audio.preload = 'auto'
      audio.oncanplaythrough = () => console.log(`Audio [${key}] primed.`)
      audio.onerror = () => console.error(`Audio [${key}] link failure: ${url}`)
      if (key === 'TENSION') {
        audio.loop = true
        bgMusicRef.current = audio
      }
      audioRefs.current[key] = audio
    })

    return () => {
      // Hard Cleanup
      bgMusicRef.current?.pause()
      if (bgMusicRef.current) bgMusicRef.current.src = ''
      Object.values(audioRefs.current).forEach(a => {
        a.pause()
        a.src = ''
      })
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(e => console.warn('Audio context close deferred', e))
      }
      console.log('Arena soundscapes decommissioned.')
    }
  }, [])

  // Manage Background Tension
  useEffect(() => {
    if (!audioUnlocked || !audioEnabled || !bgMusicRef.current || isSubmitting) {
       bgMusicRef.current?.pause()
       return
    }
    
    bgMusicRef.current.volume = 0.15
    bgMusicRef.current.play().catch(e => {
       console.warn('Audio play deferred', e)
    })
  }, [audioUnlocked, audioEnabled, isSubmitting])

  const unlockAudio = () => {
    console.log('Unlocking Arena Soundscapes...')
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    setAudioUnlocked(true)
    setAudioEnabled(true)
    
    // Play/Pause all sounds to pre-warm the browser's audio context
    Object.values(audioRefs.current).forEach(a => {
        a.play().then(() => {
            a.pause()
            a.currentTime = 0
        }).catch(e => console.warn('Silent unlock failed', e))
    })
  }

  const playSound = useCallback((key: keyof typeof SOUNDS, volume = 0.5) => {
    if (!audioEnabled || !audioUnlocked) return
    try {
      // Use Web Audio API for highly reliable urgency
      if (key === 'TICK' && audioCtxRef.current) {
        const ctx = audioCtxRef.current
        if (ctx.state === 'suspended') ctx.resume()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05)
        gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.05)
        activeOscsRef.current.push(osc)
        return
      }
      
      if (key === 'BUZZER' && audioCtxRef.current) {
        const ctx = audioCtxRef.current
        if (ctx.state === 'suspended') ctx.resume()
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()
        osc1.type = 'sawtooth'
        osc2.type = 'square'
        osc1.frequency.setValueAtTime(120, ctx.currentTime)
        osc2.frequency.setValueAtTime(125, ctx.currentTime)
        gain.gain.setValueAtTime(volume, ctx.currentTime)
        // Sharper, quicker buzzer to prevent bleeding
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)
        osc1.start(); osc2.start();
        osc1.stop(ctx.currentTime + 0.4); osc2.stop(ctx.currentTime + 0.4)
        activeOscsRef.current.push(osc1, osc2)
        return
      }

      const audio = audioRefs.current[key]
      if (audio && key !== 'TICK' && key !== 'BUZZER') {
        const clone = audio.cloneNode() as HTMLAudioElement
        clone.volume = volume
        clone.play().catch(() => {})
      }
    } catch (e) {
      console.error('Audio engine fault', e)
    }
  }, [audioEnabled, audioUnlocked])

  // Real-Time Rank
  const [currentRank, setCurrentRank] = useState<number | null>(null)
  const [gapToLeader, setGapToLeader] = useState<number | null>(null)

  const updateLiveRank = async (projectedScore: number) => {
    try {
      const { data: submissions } = await supabase
        .from('trivia_submissions')
        .select('score')
        .eq('session_id', sessionId)
        .order('score', { ascending: false })
      
      const scores = (submissions ?? []).map(s => s.score)
      const rank = scores.findIndex(s => projectedScore >= s) + 1
      const actualRank = rank === 0 ? (scores.length + 1) : rank
      
      if (currentRank && actualRank < currentRank) {
         toast.success(`RANK UP! You're now #${actualRank}!`, { icon: '🚀' })
         playSound('MILESTONE', 0.4)
      } else if (actualRank === 1 && currentRank !== 1 && scores.length > 0) {
         toast.success("YOU'RE IN THE LEAD!", { icon: '👑' })
         playSound('MILESTONE', 0.6)
      }
      
      setCurrentRank(actualRank)
      if (scores[0] && scores[0] > projectedScore) {
         setGapToLeader(scores[0] - projectedScore)
      } else {
         setGapToLeader(null)
      }
    } catch (e) {
      console.error('Rank update failed', e)
    }
  }

  const triggerShout = (emoji: string) => {
    if (!audioUnlocked) unlockAudio()
    const id = ++shoutIdRef.current
    setShouts(prev => [...prev, { id, emoji, x: Math.random() * 80 + 10 }])
    setTimeout(() => {
      setShouts(prev => prev.filter(s => s.id !== id))
    }, 2000)
    playSound('TICK', 0.1)
  }

  // Milestone Check (Fixed: Don't show if auto-submitting)
  useEffect(() => {
    if (isAutoSubmitting || isSubmitting) return
    const pct = (currentIdx / (questions.length || 1)) * 100
    if (pct >= 50 && pct < 60 && !milestone?.includes('Halfway')) {
      setMilestone('Halfway Legend!')
      playSound('MILESTONE', 0.5)
      setTimeout(() => setMilestone(null), 3000)
    } else if (pct >= 90 && pct < 100 && !milestone?.includes('Final')) {
      setMilestone('Final Stretch!')
      playSound('MILESTONE', 0.5)
      setTimeout(() => setMilestone(null), 3000)
    }
  }, [currentIdx, questions.length, isAutoSubmitting, isSubmitting, playSound])

  const goldQIdx = questions.length > 0 ? (sessionId.split('').reduce((a,b) => a + b.charCodeAt(0), 0) % questions.length) : -1
  const isGoldQ = currentIdx === goldQIdx

  useEffect(() => {
      if (isGoldQ && !loading && questions.length > 0) {
         playSound('GOLD', 0.6)
         toast('🏆 EXCELLENCE BONUS! Double XP!', {
            style: { background: '#fbbf24', color: '#000', fontWeight: 'bold' }
         })
      }
  }, [currentIdx, isGoldQ, loading, questions.length, playSound])

  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(30)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const startTimeRef = useRef<number>(Date.now())

  const activeQ = questions[currentIdx]

  useEffect(() => { if (sessionId && student?.id) loadData() }, [sessionId, student?.id])

  const loadData = async () => {
    setLoading(true)
    try {
       const [sRes, qRes, gRes] = await Promise.all([
         supabase.from('trivia_sessions').select('id, title, duration_minutes, created_at, subject:subjects(name)').eq('id', sessionId).single(),
         supabase.from('trivia_questions').select('*').eq('session_id', sessionId).order('position'),
         supabase.from('trivia_group_members').select('group_id').eq('student_id', student!.id)
       ])

       if (sRes.error || !sRes.data) { toast.error('Session not found'); router.push('/student/trivia'); return }
       
       const groupIds = (gRes.data ?? []).map((m: any) => m.group_id)
       const { data: myGroup } = await supabase.from('trivia_groups')
         .select('*')
         .eq('session_id', sessionId)
         .in('id', groupIds)
         .maybeSingle()
       
       if (!myGroup) {
         toast.error('Squad required to enter.')
         router.push(`/student/trivia/${sessionId}`)
         return
       }

       const { data: groupSub } = await supabase.from('trivia_submissions')
         .select('id')
         .eq('group_id', myGroup.id)
         .maybeSingle()

       if (groupSub) {
         router.push(`/student/trivia/${sessionId}/results`)
         return
       }

       if (myGroup.attempt_started_by && myGroup.attempt_started_by !== student?.id) {
          toast.error('Session Synchronized to teammate device.')
          router.push(`/student/trivia/${sessionId}`)
          return
       }

       setSession(sRes.data as any)
       setQuestions(qRes.data ?? [])
       setMyGroupId(myGroup.id)
       
       if (qRes.data?.[0]) setQuestionTimeLeft(qRes.data[0].time_seconds)

       setLoading(false)
       setQuestionStartTime(Date.now())
       startTimeRef.current = Date.now()
    } catch (e) {
       console.error('Data load failed', e)
       toast.error('Link failure. Reloading recommended.')
    }
  }

  const handleSubmit = useCallback(async (auto = false) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    if (auto) setIsAutoSubmitting(true)

    // Halt all audio immediately
    bgMusicRef.current?.pause()
    Object.values(audioRefs.current).forEach(a => { a.pause(); a.currentTime = 0; })

    let score = 0
    let correct = 0
    let wrong = 0
    let currentS = 0
    
    questions.forEach((q, i) => {
      const ans = answers[q.id]
      if (ans === q.correct_option_id) {
        currentS++
        const multiplier = currentS >= 5 ? 1.5 : currentS >= 3 ? 1.2 : 1.0
        const isThisGold = i === goldQIdx
        score += Math.round(q.marks * multiplier * (isThisGold ? 2 : 1))
        correct++
      } else {
        currentS = 0
        if (ans !== null) wrong++
      }
    })

    const payload = {
      session_id: sessionId,
      group_id: myGroupId,
      answers,
      question_timings: {
          ...timings,
          [activeQ.id]: {
              time_taken_s: Math.floor((Date.now() - questionStartTime) / 1000),
              timed_out: auto
          }
      },
      score,
      total_questions: questions.length,
      correct_count: correct,
      wrong_count: wrong,
      time_taken_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      auto_submitted: auto,
      max_streak: maxStreak
    }

    const { error } = await supabase.from('trivia_submissions').insert(payload)
    
    if (error) {
      toast.error('Sync failure. Contact Academy Board.')
      setIsSubmitting(false)
    } else {
      if (!auto) toast.success('Assignment Complete!')
      router.push(`/student/trivia/${sessionId}/results`)
    }
  }, [sessionId, myGroupId, questions, answers, timings, activeQ, questionStartTime, isSubmitting, maxStreak, supabase, router, goldQIdx])

  const handleNext = useCallback(async (auto = false) => {
      silenceOscillators()
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000)
      const currentAns = answers[activeQ.id]
      const isCorrect = currentAns === activeQ.correct_option_id

      if (isCorrect && !auto) {
        setStreak(prev => {
          const next = prev + 1
          if (next === 3 || next === 5) {
            playSound('COMBO', 0.6)
            setShowCombo(true)
          } else if (next > 3) {
            setShowCombo(true)
          }
          if (next > maxStreak) setMaxStreak(next)
          return next
        })
      } else {
        setStreak(0)
        setShowCombo(false)
      }

      let currentProjectedScore = 0
      let tempStreak = 0
      questions.slice(0, currentIdx + 1).forEach((q, i) => {
         const ans = answers[q.id]
         if (ans === q.correct_option_id) {
            tempStreak++
            const mult = tempStreak >= 5 ? 1.5 : tempStreak >= 3 ? 1.2 : 1.0
            const isThisGold = i === goldQIdx
            currentProjectedScore += Math.round(q.marks * mult * (isThisGold ? 2 : 1))
         } else if (ans !== null) {
            tempStreak = 0
         }
      })
      updateLiveRank(currentProjectedScore)

      setTimings(prev => ({
        ...prev,
        [activeQ.id]: {
          time_taken_s: timeSpent,
          timed_out: auto
        }
      }))

      if (currentIdx < questions.length - 1) {
        const nextQ = questions[currentIdx + 1]
        setCurrentIdx(prev => prev + 1)
        setQuestionTimeLeft(nextQ.time_seconds)
        setQuestionStartTime(Date.now())
      } else {
        handleSubmit(auto)
      }
  }, [currentIdx, questions, activeQ, questionStartTime, answers, maxStreak, handleSubmit, playSound, goldQIdx])

  // Question Timer Effect
  useEffect(() => {
    if (loading || isSubmitting || !activeQ) return
    const timer = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          playSound('BUZZER', 1.0)
          handleNext(true)
          return 0
        }
        // Tick sound in final 10 seconds, increasing frequency
        if (prev <= 11 && prev > 1) {
          playSound('TICK', 0.2 + (11 - prev) * 0.05)
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [activeQ, loading, isSubmitting, handleNext, playSound])

  const selectOption = (optId: string) => {
    if (isSubmitting) return
    if (!audioUnlocked) unlockAudio()
    const isCorrect = optId === activeQ.correct_option_id
    if (isCorrect) {
      playSound('CORRECT', 0.4)
    } else {
      playSound('WRONG', 0.3)
    }
    setAnswers(prev => ({ ...prev, [activeQ.id]: optId }))
  }

  if (loading || !session || !activeQ) return <div className="p-10 text-center font-black uppercase flex flex-col items-center gap-4">
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
      <Zap size={40} className="text-primary" />
    </motion.div>
    Entering the Excellence Hub...
  </div>

  const progress = (currentIdx / questions.length) * 100
  const qTimerPct = (questionTimeLeft / (activeQ?.time_seconds || 30)) * 100
  const subjectName = session.subject?.name?.toLowerCase() || ''

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] pb-20 select-none">
      
      {/* Audio Unlock Overlay */}
      <AnimatePresence>
        {!audioUnlocked && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="max-w-xs space-y-6"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-primary flex items-center justify-center mx-auto shadow-2xl shadow-primary/40 animate-pulse">
                <Volume2 size={40} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Arena of Excellence</h2>
                <p className="text-xs font-bold text-white/60 mt-2 uppercase tracking-widest">Enable immersive audio for the full academic challenge.</p>
              </div>
              <Button 
                onClick={unlockAudio}
                className="w-full h-16 text-lg font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary-hover text-white rounded-3xl"
              >
                Join with Sound
              </Button>
              <button 
                onClick={() => { setAudioUnlocked(true); setAudioEnabled(false); }}
                className="text-[10px] font-black uppercase text-white/40 hover:text-white"
              >
                Continue in Silence
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subject-Themed Background Arena */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute inset-0 opacity-10 ${subjectName.includes('science') ? 'bg-emerald-500' : subjectName.includes('math') ? 'bg-blue-500' : 'bg-primary'}`} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Floating Shouts */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {shouts.map(s => (
            <motion.div
              key={s.id}
              initial={{ y: '100vh', opacity: 0, scale: 0.5 }}
              animate={{ y: '-10vh', opacity: [0, 1, 1, 0], scale: [1, 1.5, 1.2] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              style={{ left: `${s.x}%` }}
              className="absolute text-4xl"
            >
              {s.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Milestone Overlay */}
      <AnimatePresence>
        {milestone && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-primary/20 backdrop-blur-md"
          >
            <div className="bg-[var(--card)] p-8 rounded-[3rem] shadow-2xl border-8 border-primary text-center">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
                <Trophy size={80} className="text-primary mx-auto mb-4" />
              </motion.div>
              <h2 className="text-4xl font-black italic tracking-tighter text-primary uppercase">{milestone}</h2>
              <p className="text-sm font-black mt-2 text-primary/60 uppercase tracking-[0.2em]">Excellence Detected</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="sticky top-0 z-50 bg-[var(--card)]/80 backdrop-blur-xl border-b border-[var(--card-border)] p-3 md:p-4 shadow-xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
           <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0">
                       Inquiry {currentIdx + 1}/{questions.length}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/20 shrink-0" />
                    {currentRank && (
                       <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="px-2 py-0.5 rounded-full bg-primary text-white text-[8px] font-black uppercase flex items-center gap-1 shadow-lg shadow-primary/20 truncate"
                       >
                          <Trophy size={8} /> #{currentRank}
                       </motion.div>
                    )}
                 </div>
                 <button 
                    onClick={() => {
                      if (!audioUnlocked) unlockAudio()
                      else setAudioEnabled(!audioEnabled)
                    }} 
                    className="p-1.5 rounded-lg bg-[var(--input)] text-primary transition-all hover:scale-110 active:scale-95 shadow-inner"
                  >
                    {audioEnabled && audioUnlocked ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </button>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--input)] overflow-hidden">
                 <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${progress}%` }} 
                    className="h-full bg-primary"
                 />
              </div>
           </div>
           <Button variant="ghost" size="sm" className="h-10 text-[10px] font-black text-rose-500 uppercase" onClick={() => { if(confirm('Exit Session? Progress will be lost.')) router.push(`/student/trivia/${sessionId}`) }}>Exit</Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 mt-4 relative z-10">
         <AnimatePresence mode="wait">
            <motion.div
               key={activeQ.id}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="space-y-6"
            >
               {/* Question Card */}
               <Card className={`p-5 md:p-8 relative overflow-hidden transition-all duration-500 border-2 ${isGoldQ ? 'border-amber-400 ring-8 ring-amber-400/10 bg-amber-400/5' : streak >= 3 ? 'border-primary ring-8 ring-primary/5' : 'border-[var(--card-border)] shadow-xl'}`}>
                  
                  <div className="absolute top-4 right-4 flex items-center gap-3">
                     {isGoldQ && (
                        <motion.div 
                           animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity }}
                           className="bg-amber-400 text-black px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 shadow-lg"
                        >
                           <Star size={12} className="fill-current" /> 2X XP
                        </motion.div>
                     )}
                     
                     <div className="relative w-14 h-14 flex items-center justify-center bg-[var(--input)] rounded-2xl shadow-inner border border-[var(--card-border)]">
                        <svg className="w-14 h-14 transform -rotate-90">
                           <circle cx="28" cy="28" r="24" stroke="var(--input)" strokeWidth="4" fill="transparent" />
                           <motion.circle 
                              cx="28" cy="28" r="24" stroke={questionTimeLeft < 5 ? 'var(--destructive)' : 'var(--primary)'} strokeWidth="4" fill="transparent"
                              strokeDasharray={151}
                              strokeDashoffset={151 - (151 * qTimerPct / 100)}
                           />
                        </svg>
                        <span className={`absolute text-sm font-black ${questionTimeLeft < 5 ? 'text-[var(--destructive)] animate-pulse' : 'text-primary'}`}>{questionTimeLeft}</span>
                     </div>
                  </div>

                  <div className="space-y-6 pr-16 md:pr-20">
                      <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest border border-primary/10">
                             Stage {currentIdx + 1}
                          </div>
                          {streak > 0 && (
                             <motion.div key={streak} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1 text-[10px] font-black text-amber-500 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/10">
                                🔥 {streak} COMBO
                             </motion.div>
                          )}
                      </div>
                      <div 
                         className="prose prose-sm md:prose-base max-w-none text-xl md:text-2xl font-black leading-tight tracking-tight" 
                         style={{ color: 'var(--text)' }}
                         dangerouslySetInnerHTML={{ __html: activeQ.text }}
                      />
                      
                      {activeQ.image_url && (
                        <div className="rounded-[2rem] overflow-hidden border border-[var(--card-border)] aspect-video bg-white shadow-2xl relative">
                           <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                           <img src={activeQ.image_url} alt="Quest visual" className="w-full h-full object-contain cursor-zoom-in hover:scale-105 transition-transform duration-500" onClick={() => window.open(activeQ.image_url!, '_blank')} />
                        </div>
                      )}
                  </div>
               </Card>

               {/* Options List */}
               <div className="grid grid-cols-1 gap-4">
                  {activeQ.options.map((opt, i) => {
                     const isSelected = answers[activeQ.id] === opt.id
                     return (
                        <motion.button
                           key={opt.id}
                           whileTap={{ scale: 0.96 }}
                           onClick={() => selectOption(opt.id)}
                           className={`p-5 rounded-[2rem] border-4 text-left transition-all flex items-center gap-5 relative overflow-hidden ${isSelected ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' : 'border-[var(--card-border)] bg-[var(--card)] hover:border-primary/50'}`}
                        >
                           <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-all shadow-md ${isSelected ? 'bg-primary text-white rotate-3' : 'bg-[var(--input)] text-[var(--text-muted)]'}`}>
                              {String.fromCharCode(65 + i)}
                           </div>
                           <span className="text-base font-black flex-1 uppercase tracking-tighter" style={{ color: isSelected ? 'var(--primary)' : 'var(--text)' }}>
                              {opt.text}
                           </span>
                           {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-primary"><CheckCircle2 size={24} /></motion.div>}
                        </motion.button>
                     )
                  })}
               </div>

               {/* Action Footer */}
               <div className="flex gap-4 pt-6">
                  {currentIdx < questions.length - 1 ? (
                     <Button className="flex-1 h-16 text-lg font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30" onClick={() => handleNext(false)}>
                        Advance <ChevronRight size={24} className="ml-2" />
                     </Button>
                  ) : (
                     <Button className="flex-1 h-16 text-lg font-black uppercase tracking-[0.2em] bg-emerald-500 hover:bg-emerald-600 border-0 shadow-2xl shadow-emerald-500/30" onClick={() => handleSubmit(false)} isLoading={isSubmitting}>
                        Finalize <Save size={24} className="ml-2" />
                     </Button>
                  )}
               </div>
            </motion.div>
         </AnimatePresence>
      </div>

      {/* Emoji Shout Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 bg-[var(--card)]/80 backdrop-blur-xl border-2 border-[var(--card-border)] rounded-[2rem] shadow-2xl z-50">
         {['🔥', '🚀', '🧠', '⭐', '💯'].map(emoji => (
            <button
               key={emoji}
               onClick={() => { triggerShout(emoji); if(!audioEnabled) setAudioEnabled(true); }}
               className="w-12 h-12 flex items-center justify-center text-2xl hover:scale-150 active:scale-95 transition-all"
            >
               {emoji}
            </button>
         ))}
      </div>

    </div>
  )
}
