'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Plus, Users, Zap, Trophy, Timer, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'
import { getActiveDuels, createDuel, joinDuel, submitDuelAnswer, advanceDuelQuestion } from '@/app/actions/duels'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

const QUESTION_TIMER_SECONDS = 10

export default function ClassroomDuels() {
  const { student, profile } = useAuthStore()
  const [waitingDuels, setWaitingDuels] = useState<any[]>([])
  const [duelStats, setDuelStats] = useState({ wins: 0, losses: 0, draws: 0 })
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // Game State
  const [activeDuel, setActiveDuel] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMER_SECONDS)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (student?.id) loadDuels()
  }, [student?.id])

  const loadDuels = async () => {
    if (!student?.id) return
    try {
      const data = await getActiveDuels((student as any).class_id)
      setWaitingDuels(data)
      setDuelStats({
        wins: (student as any).duel_wins || 0,
        losses: (student as any).duel_losses || 0,
        draws: (student as any).duel_draws || 0,
      })
    } catch (e) {
      toast.error('Failed to load duels')
    } finally {
      setLoading(false)
    }
  }

  // Polling for lobby updates (if we are in the lobby list, not an active duel)
  useEffect(() => {
    if (!activeDuel && !loading) {
      const interval = setInterval(loadDuels, 5000)
      return () => clearInterval(interval)
    }
  }, [activeDuel, loading])

  // Realtime subscription for Active Duel
  useEffect(() => {
    if (!activeDuel?.id) return

    const supabase = getSupabaseBrowserClient()

    // 1. Listen for Duel State changes (Status, Current Question)
    const duelChannel = supabase.channel(`duel_${activeDuel.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classroom_duels', filter: `id=eq.${activeDuel.id}` }, (payload) => {
        const newData = payload.new
        setActiveDuel((prev: any) => ({ ...prev, status: newData.status, current_question_index: newData.current_question_index }))
        
        // If question changed, reset timer and answer state
        if (payload.old && newData.current_question_index !== payload.old.current_question_index) {
          resetQuestionState()
        }

        if (newData.status === 'completed') {
          handleDuelEnd()
        }
      })
      // 2. Listen for Participant changes (Joins, Score Updates)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_participants', filter: `duel_id=eq.${activeDuel.id}` }, async (payload) => {
        // Refetch participants to get updated scores and relations
        const { data } = await supabase.from('duel_participants').select('*, student:students(full_name, avatar_url)').eq('duel_id', activeDuel.id)
        if (data) setParticipants(data)
      })
      .subscribe()

    // Initial participant fetch
    supabase.from('duel_participants').select('*, student:students(full_name, avatar_url)').eq('duel_id', activeDuel.id).then(({ data }) => {
      if (data) setParticipants(data)
    })

    return () => {
      supabase.removeChannel(duelChannel)
    }
  }, [activeDuel?.id])

  // Timer Logic
  useEffect(() => {
    if (activeDuel?.status === 'active') {
      startTimer()
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeDuel?.status, activeDuel?.current_question_index])

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeLeft(QUESTION_TIMER_SECONDS)
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          // Time is up! If this is the creator/host, advance the question to avoid double advancement
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleTimeUp = () => {
    if (!hasAnswered) setHasAnswered(true)
    
    // Only one person needs to trigger the advance logic to prevent race conditions
    // We'll let the first participant (the creator) do it
    const creator = participants[0]
    if (creator && creator.student_id === student?.id) {
      setTimeout(() => {
        advanceDuelQuestion(activeDuel.id, activeDuel.current_question_index)
      }, 2000) // 2 second pause before next question
    }
  }

  const resetQuestionState = () => {
    setHasAnswered(false)
    setSelectedOption(null)
    startTimer()
  }

  const handleDuelEnd = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
    
    toast.success('Duel complete! XP and your win record have been updated.', { icon: '🏆' })
  }

  // Actions
  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const duel = await createDuel(student!.id, (student as any).class_id)
      setActiveDuel(duel)
    } catch (e) {
      toast.error('Failed to create duel. Try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoin = async (duelId: string) => {
    try {
      const { data: d } = await getSupabaseBrowserClient().from('classroom_duels').select('*').eq('id', duelId).single()
      setActiveDuel(d)
      await joinDuel(duelId, student!.id)
    } catch (e) {
      toast.error('Failed to join duel')
      setActiveDuel(null)
    }
  }

  const handleAnswer = async (index: number) => {
    if (hasAnswered) return
    setHasAnswered(true)
    setSelectedOption(index)

    const currentQ = activeDuel.questions[activeDuel.current_question_index]
    const isCorrect = index === currentQ.correctAnswer

    if (isCorrect) {
      // Small local confetti
      confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } })
      await submitDuelAnswer(activeDuel.id, student!.id, true)
    }
  }

  // --- RENDERS ---

  if (loading) return <div className="p-6 flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>

  // 1. ACTIVE DUEL (In Lobby or Playing or Finished)
  if (activeDuel) {
    const isHost = participants[0]?.student_id === student?.id
    const opponent = participants.find(p => p.student_id !== student?.id)
    const me = participants.find(p => p.student_id === student?.id) || { score: 0 }

    if (activeDuel.status === 'waiting') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-6">
          <Card className="p-12 text-center max-w-lg w-full relative overflow-hidden border-indigo-500/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="w-24 h-24 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 mb-6">
              <Swords size={48} />
            </motion.div>
            <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>Waiting for Opponent...</h2>
            <p className="text-sm font-bold text-muted mb-8">Share this screen with a classmate or tell them to check the lobby.</p>
            
            <div className="flex justify-center gap-8 items-center mb-8">
              <div className="text-center">
                <Avatar url={profile?.avatar_url} name={profile?.full_name} size="lg" className="mx-auto mb-2 ring-4 ring-indigo-500/30" />
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>You</p>
              </div>
              <div className="text-2xl font-black text-muted">VS</div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full border-4 border-dashed border-[var(--card-border)] flex items-center justify-center mb-2 mx-auto animate-pulse">
                  <Users size={24} className="text-muted" />
                </div>
                <p className="font-bold text-sm text-muted">Searching...</p>
              </div>
            </div>

            <Button variant="ghost" onClick={() => setActiveDuel(null)}>Cancel Duel</Button>
          </Card>
        </div>
      )
    }

    if (activeDuel.status === 'completed') {
      const winner = participants.reduce((prev, current) => (prev.score > current.score) ? prev : current)
      const isWinner = winner.student_id === student?.id
      const isTie = participants.length === 2 && participants[0].score === participants[1].score

      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-6">
          <Card className="p-12 text-center max-w-lg w-full relative border-t-8 border-t-amber-500">
            <Trophy size={64} className={`mx-auto mb-6 ${isWinner && !isTie ? 'text-amber-500' : 'text-slate-400'}`} />
            <h2 className="text-4xl font-black mb-2" style={{ color: 'var(--text)' }}>
              {isTie ? "It's a Tie!" : isWinner ? 'You Won!' : 'Good Effort!'}
            </h2>
            <p className="text-sm font-bold text-muted mb-8">
              {isTie ? "A battle of equals." : isWinner ? 'You dominated the duel.' : 'Better luck next time.'}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className={`p-4 rounded-2xl ${isWinner && !isTie ? 'bg-amber-500/10 border-amber-500/30 border ring-2 ring-amber-500' : 'bg-[var(--input)]'}`}>
                <Avatar url={profile?.avatar_url} name={profile?.full_name} size="md" className="mx-auto mb-2" />
                <p className="font-black text-xl" style={{ color: 'var(--text)' }}>{me?.score}</p>
                <p className="text-[10px] uppercase font-bold text-muted">Your Score</p>
              </div>
              <div className={`p-4 rounded-2xl ${!isWinner && !isTie ? 'bg-amber-500/10 border-amber-500/30 border ring-2 ring-amber-500' : 'bg-[var(--input)]'}`}>
                <Avatar url={opponent?.student?.avatar_url} name={opponent?.student?.full_name} size="md" className="mx-auto mb-2" />
                <p className="font-black text-xl" style={{ color: 'var(--text)' }}>{opponent?.score}</p>
                <p className="text-[10px] uppercase font-bold text-muted">Opponent</p>
              </div>
            </div>

            <Button size="lg" className="w-full rounded-2xl" onClick={() => { setActiveDuel(null); loadDuels(); }}>
              Return to Lobby
            </Button>
          </Card>
        </div>
      )
    }

    // Active Gameplay
    const currentQ = activeDuel.questions[activeDuel.current_question_index]
    const progressPct = ((activeDuel.current_question_index) / activeDuel.questions.length) * 100

    return (
      <div className="flex flex-col h-[calc(100vh-80px)]" style={{ background: 'var(--bg)' }}>
        {/* HUD */}
        <div className="bg-[var(--card)] border-b border-[var(--card-border)] px-6 py-4 flex items-center justify-between shadow-sm z-10 relative">
          <div className="absolute bottom-0 left-0 h-1 bg-[var(--input)] w-full">
            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>

          {/* My Score */}
          <div className="flex items-center gap-3">
            <Avatar url={profile?.avatar_url} name={profile?.full_name} size="sm" className="ring-2 ring-indigo-500" />
            <div>
              <p className="text-[10px] font-black uppercase text-muted">You</p>
              <p className="font-black text-lg text-indigo-500 leading-none">{me?.score}</p>
            </div>
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center">
            <p className="text-[10px] uppercase font-black text-muted tracking-widest mb-1">Q{activeDuel.current_question_index + 1} of {activeDuel.questions.length}</p>
            <div className={`text-3xl font-black tabular-nums flex items-center gap-2 ${timeLeft <= 3 ? 'text-rose-500 animate-pulse' : 'text-[var(--text)]'}`}>
              <Timer size={24} /> {timeLeft}s
            </div>
          </div>

          {/* Opponent Score */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-[10px] font-black uppercase text-muted line-clamp-1 max-w-[80px]">{opponent?.student?.full_name}</p>
              <p className="font-black text-lg text-rose-500 leading-none">{opponent?.score || 0}</p>
            </div>
            <Avatar url={opponent?.student?.avatar_url} name={opponent?.student?.full_name} size="sm" className="ring-2 ring-rose-500" />
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center justify-center relative">
          <div className="max-w-3xl w-full space-y-8 relative z-10">
            <h2 className="text-2xl md:text-4xl font-black text-center leading-tight" style={{ color: 'var(--text)' }}>
              {currentQ.question}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQ.options.map((opt: string, i: number) => {
                const isSelected = selectedOption === i
                const isCorrect = i === currentQ.correctAnswer
                const showResult = hasAnswered

                let btnClass = "bg-[var(--card)] border-2 border-[var(--card-border)] hover:border-indigo-500 hover:bg-indigo-500/5 text-[var(--text)]"
                
                if (showResult) {
                  if (isCorrect) btnClass = "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]"
                  else if (isSelected) btnClass = "bg-rose-500 border-rose-500 text-white opacity-80"
                  else btnClass = "bg-[var(--card)] border-[var(--card-border)] opacity-50"
                } else if (isSelected) {
                   btnClass = "bg-indigo-500 border-indigo-500 text-white scale-[1.02]"
                }

                return (
                  <button
                    key={i}
                    disabled={hasAnswered}
                    onClick={() => handleAnswer(i)}
                    className={`p-6 rounded-2xl text-left font-bold text-lg transition-all duration-200 ${btnClass}`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2. LOBBY
  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Classroom Duels</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Challenge your classmates to a real-time battle of wits.</p>
        </div>
        <Button onClick={handleCreate} disabled={isCreating} className="rounded-2xl shadow-lg shadow-indigo-500/20 bg-gradient-to-r from-indigo-500 to-purple-500 border-none hover:scale-105 transition-transform text-white px-8">
          {isCreating ? 'Creating...' : <><Swords size={16} className="mr-2" /> Host a Duel</>}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Wins', duelStats.wins, 'text-emerald-400'],
          ['Draws', duelStats.draws, 'text-amber-400'],
          ['Losses', duelStats.losses, 'text-rose-400'],
        ].map(([label, value, color]) => (
          <Card key={label} className="p-4 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {waitingDuels.map((duel: any) => {
          const host = duel.participants[0]
          return (
            <motion.div key={duel.id} whileHover={{ y: -5 }}>
              <Card className="p-6 h-full flex flex-col group border-t-4 border-t-indigo-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Swords size={64} />
                </div>
                
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <Avatar url={host?.student?.avatar_url} name={host?.student?.full_name} size="md" />
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500">Host</p>
                    <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{host?.student?.full_name}</p>
                  </div>
                </div>

                <div className="mt-auto space-y-4 relative z-10">
                  <div className="flex justify-between items-center text-sm font-bold text-muted">
                    <span>Status</span>
                    <span className="flex items-center gap-1 text-emerald-500 animate-pulse"><Zap size={14} /> Waiting for opponent</span>
                  </div>
                  
                  <Button className="w-full rounded-xl bg-[var(--input)] text-[var(--text)] hover:bg-indigo-500 hover:text-white transition-colors" onClick={() => handleJoin(duel.id)}>
                    Join Battle
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}

        {waitingDuels.length === 0 && (
          <Card className="col-span-full p-12 text-center border-dashed">
            <Swords size={48} className="mx-auto text-muted opacity-20 mb-4" />
            <h3 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No Active Duels</h3>
            <p className="text-sm text-muted font-bold mb-6 max-w-sm mx-auto">No one is currently waiting for a match in your class. Be the first to host one!</p>
            <Button onClick={handleCreate} disabled={isCreating} className="rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white border-none shadow-xl shadow-indigo-500/20">
              Host a Duel
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
