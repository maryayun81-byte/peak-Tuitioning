'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Frown, BrainCircuit, Target, Clock, Zap, BookOpenCheck, Crown, MapPinned } from 'lucide-react'
import type { Duel, DuelParticipantWithStudent } from '@/types/duels'
import { getProfileFromQuestion } from '@/lib/duels/adaptiveProfile'
import { getEngagementFromQuestion } from '@/lib/duels/engagement'

interface Props {
  duel: Duel
  participants: DuelParticipantWithStudent[]
  myStudentId: string
  onReturn: () => void
  onRematch?: () => void
}

export function DuelResult({ duel, participants, myStudentId, onReturn, onRematch }: Props) {
  const me = participants.find(p => p.student_id === myStudentId)
  const opponent = participants.find(p => p.student_id !== myStudentId)

  if (!me) return null

  const isCoach = !opponent
  const isWin = opponent ? me.score > opponent.score : false
  const isDraw = opponent ? me.score === opponent.score : false
  const accuracy = me.answer_history?.length
    ? Math.round((me.answer_history.filter(a => a.is_correct).length / me.answer_history.length) * 100)
    : 0
  const avgTime = me.answer_history?.length
    ? Math.round(me.answer_history.reduce((s, a) => s + a.time_spent, 0) / me.answer_history.length)
    : 0
  const maxStreak = me.max_streak || 0
  const adaptiveProfile = getProfileFromQuestion(duel.questions?.[0])
  const engagement = getEngagementFromQuestion(duel.questions?.[0])
  const reviewItems = (me.answer_history || [])
    .map(answer => ({
      answer,
      question: duel.questions[answer.question_index],
    }))
    .filter(item => item.question)
  const missedItems = reviewItems.filter(item => !item.answer.is_correct).slice(0, 4)
  const slowItems = reviewItems
    .filter(item => item.answer.is_correct && item.answer.time_spent >= Math.max(8, duel.time_per_question * 0.75))
    .slice(0, 2)
  const resultTitle = isCoach
    ? adaptiveProfile.grade >= 8 ? 'Training Complete' : 'Practice Complete!'
    : isWin
      ? adaptiveProfile.grade >= 8 ? 'League Win' : 'Victory!'
      : isDraw
        ? 'Draw!'
        : adaptiveProfile.grade >= 8 ? 'Review Round' : 'Defeat'
  const resultBody = isCoach
    ? adaptiveProfile.grade >= 8 ? 'Your performance report is ready.' : 'Great work with Peak Coach!'
    : isWin
      ? adaptiveProfile.grade >= 8 ? 'Strong execution under pressure.' : 'Excellent performance!'
      : isDraw
        ? 'A hard-fought battle!'
        : adaptiveProfile.grade >= 8 ? 'Check the analytics and sharpen the next attempt.' : 'Keep practicing!'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center p-8 gap-6 min-h-[60vh]"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        {isCoach ? (
          <BrainCircuit size={80} style={{ color: '#8B5CF6' }} />
        ) : isWin ? (
          <Trophy size={80} style={{ color: '#F59E0B' }} />
        ) : isDraw ? (
          <Medal size={80} style={{ color: '#94A3B8' }} />
        ) : (
          <Frown size={80} style={{ color: '#EF4444' }} />
        )}
      </motion.div>

      {/* Result text */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h2 className="text-2xl font-black mb-1" style={{ color: isCoach ? '#8B5CF6' : isWin ? '#10B981' : isDraw ? '#F59E0B' : '#EF4444' }}>
          {resultTitle}
        </h2>
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">
          {resultBody}
        </p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-wider" style={{ color: adaptiveProfile.accentColor }}>
          {adaptiveProfile.rewardStyle}
        </p>
      </motion.div>

      {/* Scores */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-8 p-6 rounded-2xl border w-full max-w-sm justify-center"
        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
      >
        <div className="text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1" style={{ background: isCoach ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)' }}>
            <span className="text-lg font-black" style={{ color: isCoach ? '#8B5CF6' : '#10B981' }}>{me.score}</span>
          </div>
          <div className="text-[10px] font-black uppercase" style={{ color: 'var(--text-muted)' }}>You</div>
        </div>
        {opponent && (
          <>
            <div className="text-2xl font-black opacity-30" style={{ color: 'var(--text-muted)' }}>VS</div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <span className="text-lg font-black text-red-500">{opponent.score}</span>
              </div>
              <div className="text-[10px] font-black uppercase truncate max-w-[80px]" style={{ color: 'var(--text-muted)' }}>
                {opponent.student?.full_name?.split(' ')[0] || 'Opponent'}
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-3 gap-3 w-full max-w-sm"
      >
        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--input)' }}>
          <Target size={16} className="mx-auto mb-1" style={{ color: 'var(--primary)' }} />
          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{accuracy}%</div>
          <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Accuracy</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--input)' }}>
          <Clock size={16} className="mx-auto mb-1" style={{ color: '#F59E0B' }} />
          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{avgTime}s</div>
          <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Avg Time</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--input)' }}>
          <Zap size={16} className="mx-auto mb-1" style={{ color: '#8B5CF6' }} />
          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{maxStreak}</div>
          <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Best Streak</div>
        </div>
      </motion.div>

      {(engagement?.season || engagement?.territoryBonus || engagement?.quests?.length) && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="grid w-full max-w-2xl gap-3 md:grid-cols-3"
        >
          {engagement?.season && (
            <div className="rounded-xl p-3" style={{ background: 'var(--input)' }}>
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: '#F59E0B' }}>
                <Crown size={13} /> Season
              </div>
              <div className="text-xs font-black" style={{ color: 'var(--text)' }}>{engagement.season.title}</div>
              <div className="mt-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>{engagement.season.resetLabel}</div>
            </div>
          )}
          {engagement?.territoryBonus && (
            <div className="rounded-xl p-3" style={{ background: 'var(--input)' }}>
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: '#38BDF8' }}>
                <MapPinned size={13} /> Territory
              </div>
              <div className="text-xs font-black" style={{ color: 'var(--text)' }}>{engagement.territoryBonus.realmName}</div>
              <div className="mt-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>{engagement.territoryBonus.label}</div>
            </div>
          )}
          {engagement?.quests?.[0] && (
            <div className="rounded-xl p-3" style={{ background: 'var(--input)' }}>
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: '#10B981' }}>
                <Target size={13} /> Quest
              </div>
              <div className="text-xs font-black" style={{ color: 'var(--text)' }}>{engagement.quests[0].title}</div>
              <div className="mt-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>Reward: {engagement.quests[0].rewardTitle}</div>
            </div>
          )}
        </motion.div>
      )}

      {(missedItems.length > 0 || slowItems.length > 0) && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="w-full max-w-2xl rounded-2xl border p-4"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text)' }}>
            <BookOpenCheck size={16} style={{ color: '#10B981' }} /> Review Replay
          </div>
          <div className="space-y-3">
            {[...missedItems, ...slowItems].map(({ answer, question }) => {
              const phase = question.duelEngagement?.bossPhase
              const selected = answer.selected_answer === '__TIME_UP__' ? 'No answer' : answer.selected_answer
              return (
                <div key={`${answer.question_index}-${selected}`} className="rounded-xl p-3" style={{ background: 'var(--input)' }}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider" style={{ background: answer.is_correct ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)', color: answer.is_correct ? '#10B981' : '#EF4444' }}>
                      {answer.is_correct ? 'Slow correct' : 'Missed'}
                    </span>
                    {phase && (
                      <span className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider" style={{ background: 'rgba(245,158,11,0.14)', color: '#F59E0B' }}>
                        Phase {phase.phase}: {phase.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold leading-relaxed" style={{ color: 'var(--text)' }}>{question.question}</p>
                  <div className="mt-2 grid gap-2 text-[10px] md:grid-cols-2">
                    <div style={{ color: 'var(--text-muted)' }}>Your answer: <span className="font-black" style={{ color: answer.is_correct ? '#10B981' : '#EF4444' }}>{selected}</span></div>
                    <div style={{ color: 'var(--text-muted)' }}>Correct: <span className="font-black" style={{ color: '#10B981' }}>{question.correctAnswer}</span></div>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{question.explanation}</p>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.95 }}
        className="flex gap-3 w-full max-w-sm"
      >
        {onRematch && (
          <button
            onClick={onRematch}
            className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            <Zap size={14} className="inline mr-1" /> {isCoach ? (adaptiveProfile.grade >= 8 ? 'Train Again' : 'Practice Again') : 'Rematch'}
          </button>
        )}
        <button
          onClick={onReturn}
          className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:opacity-70"
          style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
        >
          Return to Lobby
        </button>
      </motion.div>
    </motion.div>
  )
}
