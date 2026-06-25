'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Clock, Zap, Trophy, Flame } from 'lucide-react'
import type { Duel, DuelParticipantWithStudent, PowerUp, Question, EmojiReaction, AnswerRecord } from '@/types/duels'
import { PowerUpBar } from './PowerUpBar'
import { ReactionBar } from './ReactionBar'

interface Props {
  duel: Duel
  participants: DuelParticipantWithStudent[]
  myStudentId: string
  onAnswer: (index: number) => void
  onTimeUp: () => void
  onPowerUp: (pu: PowerUp) => void
  onReact: (emoji: string) => void
  reactions: any[]
  availablePowerUps: PowerUp[]
  isAdvancing: boolean
}

export function DuelGame({
  duel, participants, myStudentId,
  onAnswer, onTimeUp, onPowerUp, onReact,
  reactions, availablePowerUps, isAdvancing
}: Props) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [timeLeft, setTimeLeft] = useState(duel.time_per_question)
  const [streak, setStreak] = useState(0)
  const [comboCount, setComboCount] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef(Date.now())
  const questionStartRef = useRef(Date.now())
  const timeUpFiredRef = useRef(false)

  const currentIndex = duel.current_question_index
  const currentQ: Question | undefined = duel.questions[currentIndex]
  const isLastQuestion = currentIndex >= duel.questions.length - 1
  const me = participants.find(p => p.student_id === myStudentId)
  const opponent = participants.find(p => p.student_id !== myStudentId)

  useEffect(() => {
    timeUpFiredRef.current = false
    setSelectedAnswer(null)
    setShowResult(false)
    setTimeLeft(duel.time_per_question)
    questionStartRef.current = Date.now()

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentIndex])

  useEffect(() => {
    if (timeLeft <= 0 && !timeUpFiredRef.current && !showResult) {
      timeUpFiredRef.current = true
      onTimeUp()
    }
  }, [timeLeft, showResult, onTimeUp])

  const handleAnswer = useCallback((index: number) => {
    if (selectedAnswer !== null || showResult || isAdvancing) return
    setSelectedAnswer(index)
    const correct = currentQ?.options[index] === currentQ?.correctAnswer
    setIsCorrect(correct)
    setShowResult(true)

    if (correct) {
      setStreak(s => s + 1)
      if (streak >= 2) setComboCount(c => c + 1)
    } else {
      setStreak(0)
      setComboCount(0)
    }

    if (timerRef.current) clearInterval(timerRef.current)
    onAnswer(index)
  }, [selectedAnswer, showResult, isAdvancing, currentQ, streak, onAnswer])

  const timePercent = (timeLeft / duel.time_per_question) * 100
  const timeColor = timePercent > 50 ? '#10B981' : timePercent > 25 ? '#F59E0B' : '#EF4444'

  if (!currentQ) return null

  return (
    <div className="flex flex-col h-full">
      {/* HUD Bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
        <div className="text-center">
          <div className="text-lg font-black" style={{ color: me ? '#10B981' : 'var(--text-muted)' }}>{me?.score || 0}</div>
          <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>You</div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Flame size={14} className={streak >= 3 ? 'text-orange-500' : 'text-slate-400'} />
            <span className="text-xs font-black" style={{ color: 'var(--text)' }}>Streak {streak}</span>
          </div>
          <div className="text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>
            Q{currentIndex + 1}/{duel.questions.length}
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-black" style={{ color: opponent ? '#EF4444' : 'var(--text-muted)' }}>{opponent?.score || 0}</div>
          <div className="text-[9px] font-black uppercase tracking-wider truncate max-w-[80px]" style={{ color: 'var(--text-muted)' }}>
            {opponent?.student?.full_name?.split(' ')[0] || 'AI'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="shrink-0 h-1.5" style={{ background: 'var(--input)' }}>
        <motion.div
          className="h-full"
          style={{ background: 'var(--primary)' }}
          initial={{ width: `${((currentIndex) / duel.questions.length) * 100}%` }}
          animate={{ width: `${((currentIndex + 1) / duel.questions.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Timer */}
        <div className="flex items-center gap-2 justify-center">
          <Clock size={14} style={{ color: timeColor }} />
          <div className="h-2 flex-1 max-w-xs rounded-full overflow-hidden" style={{ background: 'var(--input)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: timeColor }}
              animate={{ width: `${timePercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs font-black w-6 text-right" style={{ color: timeColor }}>{timeLeft}s</span>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="p-5 rounded-2xl border"
            style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider shrink-0 px-2 py-0.5 rounded-lg"
                style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                {currentQ.subject}
              </span>
              <span className="text-[10px] font-medium opacity-50" style={{ color: 'var(--text-muted)' }}>{currentQ.topic}</span>
            </div>
            <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--text)' }}>{currentQ.question}</p>
          </motion.div>
        </AnimatePresence>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2">
          {currentQ.options.map((opt, i) => {
            const isSelected = selectedAnswer === i
            const isCorrectOpt = opt === currentQ.correctAnswer
            let bg = 'var(--input)'
            let border = 'var(--card-border)'
            let text = 'var(--text)'

            if (showResult) {
              if (isCorrectOpt) { bg = 'rgba(16,185,129,0.15)'; border = '#10B981'; text = '#10B981' }
              else if (isSelected && !isCorrectOpt) { bg = 'rgba(239,68,68,0.15)'; border = '#EF4444'; text = '#EF4444' }
            } else if (isSelected) {
              bg = 'rgba(99,102,241,0.15)'; border = '#6366f1'; text = '#6366f1'
            }

            return (
              <motion.button
                key={i}
                whileHover={!showResult ? { scale: 1.01 } : undefined}
                whileTap={!showResult ? { scale: 0.99 } : undefined}
                onClick={() => handleAnswer(i)}
                disabled={showResult || isAdvancing}
                className="flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all"
                style={{ background: bg, borderColor: border }}
              >
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                  style={{
                    background: isSelected ? border : 'var(--card-border)',
                    color: isSelected ? 'white' : 'var(--text-muted)'
                  }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm font-medium flex-1" style={{ color: text }}>{opt}</span>
                {showResult && isCorrectOpt && <Check size={16} className="text-green-500 shrink-0" />}
                {showResult && isSelected && !isCorrectOpt && <X size={16} className="text-red-500 shrink-0" />}
              </motion.button>
            )
          })}
        </div>

        {/* Combo / Streak indicator */}
        {comboCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              <Zap size={12} /> {comboCount + 2}x Combo! +{comboCount * 5} bonus
            </span>
          </motion.div>
        )}

        {/* Power-ups */}
        <PowerUpBar availablePowerUps={availablePowerUps} onUse={onPowerUp} disabled={showResult || isAdvancing} />

        {/* Reactions */}
        <ReactionBar duelId={duel.id} onReact={onReact} reactions={reactions} myStudentId={myStudentId} />
      </div>
    </div>
  )
}
