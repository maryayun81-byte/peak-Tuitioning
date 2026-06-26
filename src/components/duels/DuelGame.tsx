'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Clock, Zap, Flame, Shield, MapPinned } from 'lucide-react'
import type { Duel, DuelParticipantWithStudent, PowerUp, Question } from '@/types/duels'
import { PowerUpBar } from './PowerUpBar'
import { ReactionBar } from './ReactionBar'
import { getProfileFromQuestion } from '@/lib/duels/adaptiveProfile'
import { getEngagementFromQuestion } from '@/lib/duels/engagement'

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

function duelSubjectIsCbcLike(question: Question) {
  return question.examStandard === 'cbc_standard' ||
    /cbc|kpsea|kjsea|integrated science|science\s*&\s*technology|pre-technical|agriculture\s*&\s*nutrition|social studies/i.test(`${question.subject} ${question.topic}`)
}

function composeDuelVisualScene(question: Question, grade: number) {
  const subject = `${question.subject} ${question.topic}`.toLowerCase()
  const style = grade <= 6
    ? 'Grade 6 colourful guided illustration'
    : grade === 7
      ? 'Grade 7 educational textbook style'
      : grade === 9
        ? 'Grade 9 professional clean academy style'
        : 'Grade 8 semi-realistic classroom style'
  const common = {
    style,
    interactionType: 'mcq',
    visualPrompt: `Display this duel as a quick CBC scene with labelled clues, a visible working area and answer choices.\n\n${question.excerpt || question.question}`,
  }

  if (/math/.test(subject)) {
    const qText = subject + question.question.toLowerCase()
    const isCircle = /circle|radius|diameter|chord|circumference/.test(qText)
    return {
      ...common,
      sceneType: 'Mathematics Duel Blackboard',
      background: 'Blackboard with graph paper and a formula corner',
      objects: isCircle ? ['compass', 'ruler', 'graph paper', 'formula card'] : ['calculator', 'ruler', 'protractor', 'chalk arrows'],
      diagram: isCircle ? 'circle diagram with radius, chord and diameter labels' : /graph|coordinate|geometry|angle|measurement|statistics/.test(qText) ? 'grid, graph or geometry sketch' : 'calculation board',
      workingTools: ['formula helper', 'working area', 'answer box'],
    }
  }

  if (/science|technology|biology|chemistry|physics/.test(subject)) {
    return {
      ...common,
      sceneType: 'Science Duel Laboratory',
      background: 'Lab bench with investigation board',
      objects: ['beaker', 'circuit board', 'microscope', 'safety goggles'],
      diagram: 'apparatus sketch or investigation table',
      workingTools: ['observation clue', 'unit reminder', 'answer box'],
    }
  }

  if (/social/.test(subject)) {
    return {
      ...common,
      sceneType: 'Kenya Map Duel Room',
      background: 'Map wall with chart evidence',
      objects: ['Kenya map', 'globe', 'timeline', 'weather chart'],
      diagram: 'map, timeline or data chart',
      workingTools: ['map key', 'evidence clue', 'answer box'],
    }
  }

  if (/kiswahili/.test(subject)) {
    return {
      ...common,
      sceneType: 'Darasa Duel la Kiswahili',
      background: 'Ubao wa msamiati na fasihi',
      objects: ['ubao', 'daftari', 'shairi board', 'kadi za msamiati'],
      diagram: 'matini au mazungumzo kwenye ubao',
      workingTools: ['kidokezo', 'ushahidi wa matini', 'jibu'],
    }
  }

  if (/english|literacy/.test(subject)) {
    return {
      ...common,
      sceneType: 'Reading Duel Corner',
      background: 'Library board with reading evidence',
      objects: ['storybook', 'newspaper', 'dictionary', 'notice board'],
      diagram: 'reading extract board',
      workingTools: ['vocabulary clue', 'evidence note', 'answer box'],
    }
  }

  return {
    ...common,
    sceneType: 'CBC Duel Studio',
    background: 'Smart classroom board',
    objects: ['blackboard', 'notebook', 'label cards'],
    diagram: 'labelled learning scene',
    workingTools: ['thinking clue', 'answer box'],
  }
}

function duelVisualSceneFitsQuestion(question: Question, scene?: Question['visualScene']) {
  if (!scene) return false
  const subject = `${question.subject || ''}`.toLowerCase()
  const sceneText = `${scene.sceneType || ''} ${scene.background || ''} ${scene.diagram || ''} ${(scene.objects || []).join(' ')} ${scene.visualPrompt || ''}`.toLowerCase()
  const questionText = `${question.topic || ''} ${question.question || ''} ${question.excerpt || ''}`.toLowerCase()
  if (/math/.test(subject) && /(physics|laboratory|lab|beaker|microscope|circuit|chemistry|biology)/.test(sceneText)) return false
  if (/circle|radius|diameter|chord|circumference/.test(questionText) && /speed|velocity|acceleration|car|motion/.test(sceneText)) return false
  if (/speed|velocity|acceleration|distance|time/.test(questionText) && /circle|radius|diameter|chord/.test(sceneText)) return false
  return true
}

function VisualScenePanel({ question, accentColor, grade }: { question: Question; accentColor: string; grade: number }) {
  const scene = duelVisualSceneFitsQuestion(question, question.visualScene)
    ? question.visualScene
    : (duelSubjectIsCbcLike(question) ? composeDuelVisualScene(question, grade) : undefined)
  const visualText = scene ? `${scene.sceneType || ''} ${scene.background || ''} ${scene.diagram || ''} ${scene.visualPrompt || ''}`.toLowerCase() : ''
  const isMath = /math|graph|coordinate|measurement|speed|velocity|acceleration|geometry|circle|radius|diameter|chord/.test(visualText)
  const isCircle = /circle|radius|diameter|chord|circumference/.test(visualText)
  const isScience = /science|lab|circuit|microscope|apparatus|beaker/.test(visualText)
  const isMap = /map|kenya|globe|social|weather|population|timeline/.test(visualText)
  const isLanguage = /library|reading|english|kiswahili|darasa|ubao|fasihi|shairi|storybook/.test(visualText)
  const chips = scene ? Array.from(new Set([
    ...(scene.workingTools || []).slice(0, 3),
  ].filter(Boolean) as string[])) : []

  if (!scene && !question.excerpt) return null

  return (
    <div className="mb-4 overflow-hidden rounded-xl border" style={{ borderColor: `${accentColor}66`, background: 'rgba(15,23,42,0.88)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" style={{ background: `${accentColor}1f` }}>
        <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: accentColor }}>
          {scene?.sceneType || 'Smart Blackboard'}
        </div>
        {(scene?.style || scene?.background) && (
          <div className="text-[8px] font-black uppercase tracking-widest text-slate-200">
            {scene.style || scene.background}
          </div>
        )}
      </div>
      <div className="px-3 py-3">
        <div className="relative mb-3 h-36 overflow-hidden rounded-lg border border-white/10 bg-slate-950">
          <div className="absolute inset-3 rounded-md border-2 border-amber-900 bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="absolute left-3 top-2 text-[8px] font-black uppercase tracking-widest text-slate-300">{scene?.background || 'CBC scene'}</div>
            {isMath && (
              <div className="absolute inset-5 top-7 rounded bg-white">
                <div className="absolute inset-1 opacity-50" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                {isCircle ? (
                  <>
                    <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-4" style={{ borderColor: accentColor }} />
                    <div className="absolute left-1/2 top-1/2 h-0.5 w-10 origin-left" style={{ background: accentColor }} />
                    <div className="absolute left-[calc(50%-34px)] top-[calc(50%+20px)] h-0.5 w-16 -rotate-12 bg-rose-500" />
                    <div className="absolute bottom-2 left-4 text-[8px] font-black text-slate-700">d = 2r</div>
                  </>
                ) : (
                  <>
                    <div className="absolute bottom-5 left-5 right-5 h-0.5 bg-slate-800" />
                    <div className="absolute bottom-5 left-5 top-4 w-0.5 bg-slate-800" />
                    <div className="absolute bottom-5 left-5 h-16 w-28" style={{ clipPath: 'polygon(0 100%, 100% 18%, 100% 28%, 0 100%)', background: accentColor }} />
                    <div className="absolute bottom-6 left-6 h-3 w-7 rounded-sm bg-rose-500">
                      <div className="absolute -bottom-1 left-1 h-2 w-2 rounded-full bg-slate-900" />
                      <div className="absolute -bottom-1 right-1 h-2 w-2 rounded-full bg-slate-900" />
                    </div>
                  </>
                )}
              </div>
            )}
            {isScience && !isMath && (
              <div className="absolute inset-x-6 bottom-5 top-8">
                <div className="absolute bottom-0 left-0 right-0 h-6 rounded bg-amber-800" />
                <div className="absolute bottom-6 left-6 h-14 w-10 rounded-b-lg border-2 border-cyan-200 bg-cyan-300/40" />
                <div className="absolute bottom-6 left-24 h-14 w-20 rounded border border-white/30 bg-slate-950">
                  <div className="absolute left-3 top-6 h-1 w-14 bg-yellow-300" />
                  <div className="absolute left-3 top-6 h-6 w-1 bg-yellow-300" />
                  <div className="absolute right-3 top-6 h-6 w-1 bg-yellow-300" />
                </div>
              </div>
            )}
            {isMap && !isMath && !isScience && (
              <div className="absolute inset-5 top-8 rounded bg-emerald-50">
                <div className="absolute left-8 top-5 h-20 w-16 rotate-12 rounded-[45%] border-4 border-emerald-600 bg-emerald-200" />
                <div className="absolute right-7 top-7 h-14 w-20 rounded bg-white shadow">
                  <div className="m-2 h-2 w-14 rounded bg-sky-400" />
                  <div className="mx-2 h-2 w-10 rounded bg-amber-400" />
                  <div className="mx-2 mt-1 h-2 w-16 rounded bg-rose-400" />
                </div>
              </div>
            )}
            {isLanguage && !isMath && !isScience && !isMap && (
              <div className="absolute inset-5 top-8 grid grid-cols-[1fr_70px] gap-2">
                <div className="rounded bg-amber-50 p-3">
                  <div className="mb-1 h-1.5 w-3/4 rounded bg-slate-500" />
                  <div className="mb-1 h-1.5 w-5/6 rounded bg-slate-400" />
                  <div className="h-1.5 w-2/3 rounded bg-slate-400" />
                </div>
                <div className="rounded bg-orange-100">
                  <div className="ml-5 mt-5 h-16 w-8 rounded bg-orange-500" />
                </div>
              </div>
            )}
          </div>
          <div className="absolute bottom-2 left-1/2 h-1.5 w-28 -translate-x-1/2 rounded bg-amber-900" />
        </div>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {chips.map((chip, index) => (
            <span key={`${chip}-${index}`} className="rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-wider" style={{ background: `${accentColor}22`, color: '#e2e8f0' }}>
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
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
  const adaptiveProfile = getProfileFromQuestion(currentQ)
  const engagement = getEngagementFromQuestion(currentQ)
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
  const adaptiveCue = streak >= 3
    ? adaptiveProfile.grade >= 8 ? 'Multi-step reasoning unlocked' : 'You are on a roll'
    : streak === 0 && currentIndex > 0
      ? adaptiveProfile.grade >= 8 ? 'Read the evidence carefully' : 'Look for the clue first'
      : adaptiveProfile.grade >= 8 ? 'Precision round' : 'Focus round'

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
            <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{adaptiveCue}</span>
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

        {(engagement?.bossPhase || engagement?.cbcHook || engagement?.territoryBonus) && (
          <div className="grid gap-2 md:grid-cols-3">
            {engagement?.bossPhase && (
              <div className="rounded-xl border p-3" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: '#F59E0B' }}>
                  <Shield size={13} /> Boss Phase {engagement.bossPhase.phase}
                </div>
                <div className="text-xs font-black" style={{ color: 'var(--text)' }}>{engagement.bossPhase.name}</div>
                <div className="mt-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>HP {engagement.bossPhase.hpFrom}-{engagement.bossPhase.hpTo}</div>
              </div>
            )}
            {engagement?.cbcHook && (
              <div className="rounded-xl border p-3 md:col-span-1" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: '#10B981' }}>
                  <Zap size={13} /> Mission
                </div>
                <div className="text-xs font-semibold leading-snug" style={{ color: 'var(--text)' }}>{engagement.cbcHook}</div>
              </div>
            )}
            {engagement?.territoryBonus && (
              <div className="rounded-xl border p-3" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: '#38BDF8' }}>
                  <MapPinned size={13} /> Realm Bonus
                </div>
                <div className="text-xs font-black" style={{ color: 'var(--text)' }}>{engagement.territoryBonus.realmName}</div>
                <div className="mt-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>{engagement.territoryBonus.label}</div>
              </div>
            )}
          </div>
        )}

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className={`p-5 rounded-2xl border ${adaptiveProfile.cardClassName}`}
            style={{ borderColor: adaptiveProfile.accentColor }}
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider shrink-0 px-2 py-0.5 rounded-lg"
                style={{ background: `${adaptiveProfile.accentColor}22`, color: adaptiveProfile.accentColor }}>
                {currentQ.subject}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70" style={{ color: adaptiveProfile.grade === 9 ? '#cbd5e1' : 'var(--text-muted)' }}>
                {adaptiveProfile.label}
              </span>
            </div>
            <VisualScenePanel question={currentQ} accentColor={adaptiveProfile.accentColor} grade={adaptiveProfile.grade} />
            <p className="text-sm font-bold leading-relaxed" style={{ color: adaptiveProfile.grade === 9 ? '#f8fafc' : 'var(--text)' }}>{currentQ.question}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(new Set([currentQ.adaptive?.recommendedFormat, currentQ.adaptive?.cognitiveLoad, currentQ.adaptive?.diagramSuggestions?.[0]]
                .filter(Boolean) as string[]))
                .map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider"
                    style={{
                      background: adaptiveProfile.grade === 9 ? 'rgba(255,255,255,0.08)' : `${adaptiveProfile.accentColor}18`,
                      color: adaptiveProfile.grade === 9 ? '#e2e8f0' : adaptiveProfile.accentColor,
                    }}
                  >
                    {item}
                  </span>
                ))}
            </div>
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
              <Zap size={12} /> {adaptiveProfile.shouldCelebrate ? `${comboCount + 2}x Combo!` : `${comboCount + 2}x Mastery Streak`} +{comboCount * 5} bonus
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
