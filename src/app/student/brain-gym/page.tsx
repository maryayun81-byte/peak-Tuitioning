'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Flame, Trophy, Play, CheckCircle2, XCircle, ChevronRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'
import { generateBrainGymQuestions, submitBrainGymScore, getBrainGymStreak } from '@/app/actions/brainGym'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

type Question = {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export default function DailyBrainGym() {
  const { student } = useAuthStore()
  const [streakData, setStreakData] = useState<{ current_streak: number, highest_streak: number, last_played_date: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'completed'>('idle')
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  useEffect(() => {
    if (student?.id) {
      getBrainGymStreak(student.id).then(data => {
        setStreakData(data)
        const today = new Date().toISOString().split('T')[0]
        if (data?.last_played_date === today) {
          setGameState('completed')
        }
        setLoading(false)
      })
    }
  }, [student?.id])

  const startGame = async () => {
    setLoadingQuestions(true)
    try {
      const q = await generateBrainGymQuestions(student?.id)
      setQuestions(q)
      setGameState('playing')
      setCurrentQIndex(0)
      setScore(0)
      setSelectedAnswer(null)
      setIsAnswered(false)
    } catch (e) {
      toast.error('Failed to load questions. Please try again.')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleAnswer = (answer: string) => {
    if (isAnswered) return
    setSelectedAnswer(answer)
    setIsAnswered(true)

    const isCorrect = answer === questions[currentQIndex].correctAnswer
    if (isCorrect) {
      setScore(prev => prev + 1)
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10B981', '#34D399']
      })
    }
  }

  const nextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
    } else {
      finishGame()
    }
  }

  const finishGame = async () => {
    if (!student?.id) return
    
    // Optimistically show completion
    setGameState('completed')
    
    try {
      const result = await submitBrainGymScore(student.id, score)
      setStreakData(prev => ({
        current_streak: result.streak,
        highest_streak: prev ? Math.max(prev.highest_streak, result.streak) : result.streak,
        last_played_date: new Date().toISOString().split('T')[0]
      }))
      
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#F59E0B', '#EF4444', '#3B82F6']
      })
      toast.success(`You earned +50 XP and kept your streak alive!`)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  )

  const isTodayCompleted = streakData?.last_played_date === new Date().toISOString().split('T')[0]

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto pb-32">
      {/* Header section always visible unless actually playing */}
      {gameState !== 'playing' && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent flex items-center gap-3">
              Daily Brain Gym
              <BrainCircuit className="text-rose-500" size={36} />
            </h1>
            <p className="mt-2 text-lg font-bold" style={{ color: 'var(--text-muted)' }}>
              A 5-minute daily workout for your mind.
            </p>
          </div>

          <div className="flex gap-4">
            <Card className="px-6 py-4 flex flex-col items-center bg-orange-500/10 border-orange-500/20 shadow-xl shadow-orange-500/10">
              <div className="flex items-center gap-2">
                <Flame className={streakData?.current_streak ? "text-orange-500" : "text-gray-400"} size={24} />
                <span className={`text-2xl font-black ${streakData?.current_streak ? 'text-orange-500' : 'text-gray-400'}`}>
                  {streakData?.current_streak || 0}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-500/70 mt-1">Day Streak</span>
            </Card>
          </div>
        </div>
      )}

      {/* States */}
      <AnimatePresence mode="wait">
        {gameState === 'idle' && !isTodayCompleted && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center mt-12"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center mb-8 shadow-2xl shadow-rose-500/20">
              <BrainCircuit className="text-white" size={64} />
            </div>
            <h2 className="text-2xl font-black mb-4" style={{ color: 'var(--text)' }}>
              Ready for today's challenge?
            </h2>
            <p className="max-w-md mx-auto mb-8 font-bold" style={{ color: 'var(--text-muted)' }}>
              Answer 5 questions drawn from your curriculum. Keep your streak alive to earn XP multipliers!
            </p>
            <Button 
              size="lg" 
              className="rounded-3xl px-12 py-6 text-lg shadow-xl shadow-primary/20 bg-gradient-to-r from-orange-500 to-rose-500 border-none hover:scale-105 transition-transform"
              onClick={startGame}
              disabled={loadingQuestions}
            >
              {loadingQuestions ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Generating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Play className="fill-current" /> Let's Go
                </div>
              )}
            </Button>
          </motion.div>
        )}

        {gameState === 'playing' && questions.length > 0 && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto w-full"
          >
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm font-black mb-2" style={{ color: 'var(--text-muted)' }}>
                <span>Question {currentQIndex + 1} of 5</span>
                <span className="text-emerald-500">{score} Correct</span>
              </div>
              <div className="h-3 w-full bg-[var(--input)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-500"
                  style={{ width: `${((currentQIndex) / 5) * 100}%` }}
                />
              </div>
            </div>

            <Card className="p-8 md:p-12 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-rose-500" />
              
              <h2 className="text-2xl md:text-3xl font-black mb-10 leading-snug" style={{ color: 'var(--text)' }}>
                {questions[currentQIndex].question}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questions[currentQIndex].options.map((opt, i) => {
                  const isSelected = selectedAnswer === opt
                  const isCorrectAnswer = questions[currentQIndex].correctAnswer === opt
                  
                  let btnStateClass = 'bg-[var(--input)] hover:bg-[var(--card-border)]'
                  if (isAnswered) {
                    if (isCorrectAnswer) btnStateClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                    else if (isSelected) btnStateClass = 'bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-400'
                    else btnStateClass = 'bg-[var(--input)] opacity-50'
                  } else if (isSelected) {
                    btnStateClass = 'bg-primary/20 border-primary'
                  }

                  return (
                    <button
                      key={i}
                      disabled={isAnswered}
                      onClick={() => handleAnswer(opt)}
                      className={`p-6 rounded-2xl border-2 border-transparent text-lg font-bold transition-all text-left flex items-center justify-between group ${btnStateClass}`}
                      style={{ color: !isAnswered ? 'var(--text)' : undefined }}
                    >
                      {opt}
                      {isAnswered && isCorrectAnswer && <CheckCircle2 className="text-emerald-500" />}
                      {isAnswered && isSelected && !isCorrectAnswer && <XCircle className="text-rose-500" />}
                    </button>
                  )
                })}
              </div>

              {isAnswered && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-left"
                >
                  <p className="text-sm font-bold text-sky-600 dark:text-sky-400">
                    <span className="font-black uppercase tracking-wider text-[10px] bg-sky-500 text-white px-2 py-1 rounded-md mr-2">Fact</span>
                    {questions[currentQIndex].explanation}
                  </p>
                  <div className="mt-6 flex justify-end">
                    <Button onClick={nextQuestion} size="lg" className="rounded-2xl px-8 shadow-lg shadow-primary/20">
                      {currentQIndex < 4 ? 'Next Question' : 'Finish Gym'} <ChevronRight className="ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}

        {(gameState === 'completed' || isTodayCompleted) && (
          <motion.div 
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center mt-12"
          >
            <div className="w-32 h-32 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 border-4 border-emerald-500 relative">
              <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full animate-bounce">
                +50 XP
              </div>
              <Trophy className="text-emerald-500" size={56} />
            </div>
            
            <h2 className="text-3xl font-black mb-2 text-emerald-500">Gym Completed!</h2>
            <p className="text-lg font-bold mb-8" style={{ color: 'var(--text-muted)' }}>
              You've completed your daily brain workout. Come back tomorrow!
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--card-border)] flex flex-col items-center">
                <Flame className="text-orange-500 mb-2" size={24} />
                <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{streakData?.current_streak || 1}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Current Streak</span>
              </div>
              <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--card-border)] flex flex-col items-center">
                <Star className="text-amber-500 mb-2 fill-current" size={24} />
                <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{score || '-'}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Today's Score</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
