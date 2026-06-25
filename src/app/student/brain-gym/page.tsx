'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Flame, Trophy, Play, CheckCircle2, XCircle, ChevronRight, Star, RotateCcw, Zap, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'
import { generateBrainGymQuestions, submitBrainGymScore, getBrainGymStreak, getStudentRegisteredSubjects, markBrainGymEssay } from '@/app/actions/brainGym'
import { sendPushNotification } from '@/app/actions/push'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

const SESSION_KEY = 'brain_gym_session'
const SEEN_KEY = 'brain_gym_seen_fingerprints'
const MAX_SEEN = 200
const ABANDON_TIMEOUT_MS = 10 * 60 * 1000

function loadSeenFingerprints(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSeenFingerprints(fps: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(fps.slice(-MAX_SEEN))) } catch {}
}

type Question = {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  subject?: string
  topic?: string
  difficulty?: string
  answerMode?: 'mcq' | 'essay'
  excerpt?: string
  sourceText?: string
  essayPrompt?: string
  markingRubric?: string[]
  maxMarks?: number
  adaptive?: {
    profileLabel: string
    visualStyle: string
    languageTone: string
    questionDemand: string
    rewardTone: string
    accentColor: string
    cardClassName: string
  }
}

type SavedSession = {
  questions: Question[]
  currentQIndex: number
  score: number
  answers: Record<number, string>
  startedAt: number
  studentId: string
}

function saveSession(data: SavedSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch {}
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedSession
  } catch { return null }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

export default function DailyBrainGym() {
  const { student } = useAuthStore()
  const [streakData, setStreakData] = useState<{ current_streak: number; highest_streak: number; last_played_date: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [gameState, setGameState] = useState<'idle' | 'resuming' | 'playing' | 'completed'>('idle')
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [essayDraft, setEssayDraft] = useState('')
  const [essayFeedback, setEssayFeedback] = useState<any>(null)
  const [markingEssay, setMarkingEssay] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null)
  const [allSubjects, setAllSubjects] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!student?.id) return
    Promise.all([
      getBrainGymStreak(student.id),
      getStudentRegisteredSubjects(student.id)
    ]).then(([streak, subjects]) => {
      setStreakData(streak)
      setAllSubjects(subjects)
      setSelectedSubjects(subjects.slice(0, 1))
      const saved = loadSession()
      if (saved && saved.studentId === student.id && saved.questions?.length > 0) {
        setSavedSession(saved)
        setGameState('resuming')
      }
      setLoading(false)
    })
  }, [student?.id])

  useEffect(() => {
    if (gameState !== 'playing' || !student?.id || questions.length === 0) return
    const session: SavedSession = { questions, currentQIndex, score, answers, startedAt: Date.now(), studentId: student.id }
    saveSession(session)
  }, [currentQIndex, score, answers, gameState, questions, student?.id])

  const scheduleAbandonReminder = useCallback(() => {
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current)
    abandonTimerRef.current = setTimeout(async () => {
      toast('Your Brain Gym session is waiting! Come back and finish your workout to keep your streak alive! ??', {
        duration: 8000, icon: '??',
      })
      if (student?.id) {
        try {
          await sendPushNotification([student.id], {
            title: '?? Your Brain Gym session is waiting!',
            body: 'You left your daily workout halfway. Come back and keep your streak alive!',
            href: '/student/brain-gym',
            tag: 'brain-gym-abandon',
          })
        } catch {}
      }
    }, ABANDON_TIMEOUT_MS)
  }, [student?.id])

  const cancelAbandonReminder = useCallback(() => {
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current)
  }, [])

  useEffect(() => {
    if (gameState === 'playing') {
      scheduleAbandonReminder()
    } else {
      cancelAbandonReminder()
    }
    return () => { cancelAbandonReminder() }
  }, [gameState, scheduleAbandonReminder, cancelAbandonReminder])

  useEffect(() => {
    if (gameState !== 'playing') return
    const onVisibility = () => {
      if (document.hidden) { scheduleAbandonReminder() }
      else { cancelAbandonReminder() }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [gameState, scheduleAbandonReminder, cancelAbandonReminder])

  const resetAbandonTimer = useCallback(() => {
    if (gameState === 'playing') scheduleAbandonReminder()
  }, [gameState, scheduleAbandonReminder])

  const startGame = async (subjects?: string[]) => {
    clearSession()
    setSavedSession(null)
    setLoadingQuestions(true)
    try {
      const seen = loadSeenFingerprints()
      const q = await generateBrainGymQuestions(student?.id, 'brain_gym', subjects, seen)
      setQuestions(q)
      const newFps = q.map(qq => {
        const text = (qq as any).question || ''
        return text.toLowerCase().replace(/\s+/g, '').slice(0, 120)
      }).filter(Boolean)
      saveSeenFingerprints([...seen, ...newFps])
      setGameState('playing')
      setCurrentQIndex(0)
      setScore(0)
      setAnswers({})
      setSelectedAnswer(null)
      setIsAnswered(false)
    } catch {
      toast.error('Failed to load questions. Please try again.')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const currentQuestion = questions[currentQIndex]
  const adaptive = currentQuestion?.adaptive
  const selectedSubjectLabel = selectedSubjects.length === allSubjects.length
    ? 'Mixed session'
    : selectedSubjects.join(', ')

  const resumeSession = () => {
    if (!savedSession) return
    setQuestions(savedSession.questions)
    setCurrentQIndex(savedSession.currentQIndex)
    setScore(savedSession.score)
    setAnswers(savedSession.answers)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setEssayDraft('')
    setEssayFeedback(null)
    setGameState('playing')
    setSavedSession(null)
  }

  const discardAndRestart = () => {
    clearSession()
    setSavedSession(null)
    setGameState('idle')
  }

  const handleAnswer = (answer: string) => {
    if (isAnswered) return
    resetAbandonTimer()
    setSelectedAnswer(answer)
    setIsAnswered(true)
    setAnswers(prev => ({ ...prev, [currentQIndex]: answer }))
    const isCorrect = answer === questions[currentQIndex].correctAnswer
    if (isCorrect) {
      setScore(prev => prev + 1)
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#10B981', '#34D399'] })
    }
  }

  const nextQuestion = () => {
    resetAbandonTimer()
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setEssayDraft('')
      setEssayFeedback(null)
    } else {
      finishGame()
    }
  }

  const finishGame = async () => {
    if (!student?.id) return
    cancelAbandonReminder()
    clearSession()
    setGameState('completed')
    try {
      const result = await submitBrainGymScore(student.id, score, totalQuestions)
      setStreakData(prev => ({
        current_streak: result.streak,
        highest_streak: prev ? Math.max(prev.highest_streak, result.streak) : result.streak,
        last_played_date: new Date().toISOString().split('T')[0],
      }))
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ['#F59E0B', '#EF4444', '#3B82F6', '#10B981'] })
      toast.success(`+50 XP earned! Streak: ${result.streak} days${result.territoryPoints ? ` · +${result.territoryPoints} territory points` : ''}`)
    } catch (e) { console.error(e) }
  }

  const submitEssay = async () => {
    if (!currentQuestion || markingEssay || isAnswered) return
    if (essayDraft.trim().split(/\s+/).filter(Boolean).length < 25) {
      toast.error('Write a fuller answer before submitting.')
      return
    }
    setMarkingEssay(true)
    try {
      const feedback = await markBrainGymEssay({
        question: currentQuestion.essayPrompt || currentQuestion.question,
        essay: essayDraft,
        subject: currentQuestion.subject,
        rubric: currentQuestion.markingRubric,
        maxMarks: currentQuestion.maxMarks,
      })
      setEssayFeedback(feedback)
      setAnswers(prev => ({ ...prev, [currentQIndex]: essayDraft }))
      setIsAnswered(true)
      const passed = feedback.percentage >= 50
      if (passed) setScore(prev => prev + 1)
      toast.success(`Essay marked: ${feedback.marks}/${feedback.maxMarks} (${feedback.grade})`)
    } catch {
      toast.error('Failed to mark essay. Try again.')
    } finally {
      setMarkingEssay(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  )

  const totalQuestions = questions.length || 10

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto pb-32">
      {gameState !== 'playing' && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent flex items-center gap-3">
              Daily Brain Gym
              <BrainCircuit className="text-rose-500" size={36} />
            </h1>
            <p className="mt-2 text-lg font-bold" style={{ color: 'var(--text-muted)' }}>
              10 unique questions every session � earn XP � build streaks
            </p>
          </div>
          <Card className="px-6 py-4 flex flex-col items-center bg-orange-500/10 border-orange-500/20 shadow-xl shadow-orange-500/10">
            <div className="flex items-center gap-2">
              <Flame className={streakData?.current_streak ? 'text-orange-500' : 'text-gray-400'} size={24} />
              <span className={`text-2xl font-black ${streakData?.current_streak ? 'text-orange-500' : 'text-gray-400'}`}>
                {streakData?.current_streak || 0}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-500/70 mt-1">Day Streak</span>
          </Card>
        </div>
      )}

      <AnimatePresence mode="wait">

        {gameState === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center mt-12">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center mb-8 shadow-2xl shadow-rose-500/20">
              <BrainCircuit className="text-white" size={64} />
            </div>
            <h2 className="text-2xl font-black mb-4" style={{ color: 'var(--text)' }}>Brain Gym</h2>
            <p className="max-w-md mx-auto mb-6 font-bold" style={{ color: 'var(--text-muted)' }}>
              Train anytime with questions from your curriculum. Choose one subject for focused KCSE/CBC drills or use a mixed session.
            </p>

            {allSubjects.length > 0 && (
              <div className="w-full max-w-md mb-8">
                <div className="text-xs font-black text-left mb-3 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                  <BookOpen size={14} /> Subject focus
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => setSelectedSubjects(allSubjects)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedSubjects.length === allSubjects.length
                        ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                        : 'border-transparent bg-[var(--input)] text-[var(--text-muted)]'
                    }`}
                  >
                    Mixed session
                  </button>
                  {allSubjects.map(subject => {
                    const isSelected = selectedSubjects.length === 1 && selectedSubjects[0] === subject
                    return (
                      <button
                        key={subject}
                        onClick={() => setSelectedSubjects([subject])}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                            : 'border-transparent bg-[var(--input)] text-[var(--text-muted)]'
                        }`}
                      >
                        {subject}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <Button size="lg"
              className="rounded-3xl px-12 py-6 text-lg shadow-xl shadow-primary/20 bg-gradient-to-r from-orange-500 to-rose-500 border-none hover:scale-105 transition-transform"
              onClick={() => startGame(selectedSubjects)} disabled={loadingQuestions || selectedSubjects.length === 0}>
              {loadingQuestions ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Generating {selectedSubjectLabel} questions...
                </div>
              ) : (
                <div className="flex items-center gap-2"><Play className="fill-current" /> Start Session</div>
              )}
            </Button>
          </motion.div>
        )}

        {gameState === 'resuming' && savedSession && (
          <motion.div key="resuming" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center mt-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/20">
              <Zap className="text-white" size={48} />
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>You left a session unfinished!</h2>
            <p className="max-w-sm mx-auto mb-2 font-bold" style={{ color: 'var(--text-muted)' }}>
              You were on question {savedSession.currentQIndex + 1} of {savedSession.questions.length} with {savedSession.score} correct.
            </p>
            <div className="w-full max-w-xs h-2.5 bg-[var(--input)] rounded-full overflow-hidden mb-8">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                style={{ width: `${(savedSession.currentQIndex / savedSession.questions.length) * 100}%` }} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button size="lg"
                className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 border-none text-white"
                onClick={resumeSession}>
                <RotateCcw size={16} className="mr-2" /> Resume Session
              </Button>
              <Button size="lg" variant="outline" className="flex-1 rounded-2xl" onClick={discardAndRestart}>
                Start Fresh
              </Button>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && questions.length > 0 && (
          <motion.div key="playing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto w-full">
            <div className="mb-6">
              <div className="flex justify-between text-sm font-black mb-2" style={{ color: 'var(--text-muted)' }}>
                <span>Question {currentQIndex + 1} of {totalQuestions}</span>
                <span className="text-emerald-500">{score} correct</span>
              </div>
              <div className="h-3 w-full bg-[var(--input)] rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-orange-400 to-rose-500"
                  animate={{ width: `${(currentQIndex / totalQuestions) * 100}%` }} transition={{ duration: 0.4 }} />
              </div>
              <div className="flex gap-1 mt-2 justify-center flex-wrap">
                {questions.map((q, i) => {
                  const done = i in answers
                  const correct = done && answers[i] === q.correctAnswer
                  return (
                    <div key={i} className="w-2 h-2 rounded-full transition-all" style={{
                      background: i === currentQIndex ? '#F97316' : correct ? '#10B981' : done ? '#EF4444' : 'var(--card-border)',
                      transform: i === currentQIndex ? 'scale(1.5)' : 'scale(1)',
                    }} />
                  )
                })}
              </div>
            </div>

            <Card className={`p-8 md:p-12 text-center relative overflow-hidden shadow-2xl ${adaptive?.cardClassName || ''}`}>
              <div className="absolute top-0 left-0 w-full h-1" style={{ background: adaptive?.accentColor || '#f97316' }} />
              {adaptive && (
                <div className="mb-3 text-[10px] font-black uppercase tracking-widest" style={{ color: adaptive.accentColor }}>
                  {adaptive.profileLabel}
                </div>
              )}
              {(currentQuestion.subject || currentQuestion.difficulty) && (
                <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                  {currentQuestion.subject && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                      style={{ background: adaptive ? `${adaptive.accentColor}18` : 'var(--input)', color: adaptive?.accentColor || 'var(--text-muted)' }}>
                      {currentQuestion.subject}
                    </span>
                  )}
                  {currentQuestion.topic && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                      style={{ background: adaptive ? `${adaptive.accentColor}18` : 'var(--input)', color: adaptive?.accentColor || 'var(--text-muted)' }}>
                      {currentQuestion.topic}
                    </span>
                  )}
                  {currentQuestion.difficulty && (
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                      currentQuestion.difficulty === 'easy' ? 'bg-emerald-500/15 text-emerald-500' :
                      currentQuestion.difficulty === 'hard' ? 'bg-rose-500/15 text-rose-500' :
                      'bg-amber-500/15 text-amber-500'}`}>
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>
              )}
              <h2 className="text-xl md:text-2xl font-black mb-8 leading-snug" style={{ color: adaptive?.cardClassName?.includes('slate-950') ? '#f8fafc' : 'var(--text)' }}>
                {currentQuestion.question}
              </h2>
              {(currentQuestion.excerpt || currentQuestion.sourceText) && (
                <div className="mb-6 rounded-2xl border p-5 text-left" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                  {currentQuestion.sourceText && (
                    <div className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: adaptive?.accentColor || '#f97316' }}>
                      {currentQuestion.sourceText}
                    </div>
                  )}
                  {currentQuestion.excerpt && (
                    <p className="whitespace-pre-line text-sm font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>
                      {currentQuestion.excerpt}
                    </p>
                  )}
                </div>
              )}
              {currentQuestion.answerMode === 'essay' ? (
                <div className="space-y-4 text-left">
                  {currentQuestion.essayPrompt && (
                    <div className="rounded-2xl border p-4" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest" style={{ color: adaptive?.accentColor || '#f97316' }}>
                        Essay Prompt
                      </div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{currentQuestion.essayPrompt}</p>
                      {currentQuestion.maxMarks && (
                        <p className="mt-2 text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          {currentQuestion.maxMarks} marks
                        </p>
                      )}
                    </div>
                  )}
                  <textarea
                    value={essayDraft}
                    onChange={event => setEssayDraft(event.target.value)}
                    disabled={isAnswered || markingEssay}
                    rows={9}
                    className="w-full resize-none rounded-2xl border-2 p-4 text-sm font-semibold outline-none transition-all focus:border-orange-500"
                    style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                    placeholder="Write your answer here..."
                  />
                  {!isAnswered && (
                    <div className="flex justify-end">
                      <Button onClick={submitEssay} disabled={markingEssay} size="lg" className="rounded-2xl px-8">
                        {markingEssay ? 'Marking...' : 'Submit Essay'}
                      </Button>
                    </div>
                  )}
                  {essayFeedback && (
                    <div className="rounded-2xl border p-5" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }}>
                      <div className="text-lg font-black text-emerald-500">{essayFeedback.marks}/{essayFeedback.maxMarks} · Grade {essayFeedback.grade}</div>
                      <p className="mt-2 text-sm font-bold" style={{ color: 'var(--text)' }}>{essayFeedback.feedback}</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-emerald-500">Strengths</div>
                          <ul className="space-y-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {essayFeedback.strengths?.map((item: string) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-orange-500">Improve</div>
                          <ul className="space-y-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {essayFeedback.improvements?.map((item: string) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.options.map((opt, i) => {
                    const isSelected = selectedAnswer === opt
                    const isCorrectAnswer = currentQuestion.correctAnswer === opt
                    let cls = 'bg-[var(--input)] hover:bg-[var(--card-border)]'
                    if (isAnswered) {
                      if (isCorrectAnswer) cls = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                      else if (isSelected) cls = 'bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-400'
                      else cls = 'bg-[var(--input)] opacity-40'
                    } else if (isSelected) { cls = 'bg-primary/20 border-primary' }
                    return (
                      <button key={i} disabled={isAnswered} onClick={() => handleAnswer(opt)}
                        className={`p-5 rounded-2xl border-2 border-transparent text-base font-bold transition-all text-left flex items-center justify-between ${cls}`}
                        style={{ color: !isAnswered ? 'var(--text)' : undefined }}>
                        <span>{opt}</span>
                        {isAnswered && isCorrectAnswer && <CheckCircle2 className="text-emerald-500 shrink-0 ml-2" size={20} />}
                        {isAnswered && isSelected && !isCorrectAnswer && <XCircle className="text-rose-500 shrink-0 ml-2" size={20} />}
                      </button>
                    )
                  })}
                </div>
              )}
              {isAnswered && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-left">
                  <p className="text-sm font-bold text-sky-600 dark:text-sky-400">
                    <span className="font-black uppercase tracking-wider text-[10px] bg-sky-500 text-white px-2 py-1 rounded-md mr-2">Fact</span>
                    {currentQuestion.explanation}
                    {adaptive && (
                      <span className="block mt-3 text-[10px] font-black uppercase tracking-wider" style={{ color: adaptive.accentColor }}>
                        {adaptive.rewardTone}
                      </span>
                    )}
                  </p>
                  <div className="mt-5 flex justify-end">
                    <Button onClick={nextQuestion} size="lg" className="rounded-2xl px-8 shadow-lg shadow-primary/20">
                      {currentQIndex < questions.length - 1 ? 'Next Question' : 'Finish Gym'}
                      <ChevronRight className="ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}

        {gameState === 'completed' && (
          <motion.div key="completed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center mt-12">
            <div className="w-32 h-32 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 border-4 border-emerald-500 relative">
              <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full animate-bounce">+50 XP</div>
              <Trophy className="text-emerald-500" size={56} />
            </div>
            <motion.h2 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              className="text-3xl font-black mb-2 text-emerald-500">
              Session Complete!
            </motion.h2>
            {score === totalQuestions ? (
              <p className="text-lg font-bold text-amber-500 mb-2">Perfect score! You're on fire!</p>
            ) : score >= Math.ceil(totalQuestions * 0.7) ? (
              <p className="text-lg font-bold text-emerald-500 mb-2">Excellent! Outstanding performance!</p>
            ) : score >= Math.ceil(totalQuestions * 0.5) ? (
              <p className="text-lg font-bold text-blue-500 mb-2">Good job! Keep pushing!</p>
            ) : (
              <p className="text-lg font-bold text-orange-500 mb-2">Great effort! Practice makes perfect!</p>
            )}
            <p className="text-sm font-bold mb-8" style={{ color: 'var(--text-muted)' }}>
              You earned +50 XP! Train again anytime to keep improving.
            </p>
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
              <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--card-border)] flex flex-col items-center">
                <Flame className="text-orange-500 mb-2" size={22} />
                <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{streakData?.current_streak || 1}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Streak</span>
              </div>
              <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--card-border)] flex flex-col items-center">
                <Star className="text-amber-500 mb-2 fill-current" size={22} />
                <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{score}/{totalQuestions}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Score</span>
              </div>
              <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--card-border)] flex flex-col items-center">
                <Trophy className="text-emerald-500 mb-2" size={22} />
                <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Accuracy</span>
              </div>
            </div>
            <Button size="lg" variant="outline" onClick={() => setGameState('idle')}
              className="rounded-2xl">
              <RotateCcw size={16} className="mr-2" /> Train Again
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
