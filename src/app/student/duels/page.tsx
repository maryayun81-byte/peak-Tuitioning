'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Trophy, Medal, TrendingUp, Zap, UserPlus, Users, Clock, Award, BarChart3, Star, Shield, Map } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import type { Duel, DuelParticipantWithStudent, DuelType, PowerUp, EmojiReaction, DuelStats } from '@/types/duels'
import { DUEL_TYPE_LABELS, getRank, getRankColor, POWER_UP_LABELS, EMOJIS } from '@/types/duels'
import {
  getActiveDuels, getDuelById, getStudentDuelStats, getActiveBosses,
  joinMatchmaking, leaveMatchmaking, retryMatchmaking, getDuelReactions, sendDuelReaction,
  getPowerUpInventory, usePowerUp, buyPowerUp,
  getDuelLeaderboard, getStudentRank, getDuelHistory, getDuelAnalytics,
  getDuelAchievements, getHallOfFame, getActiveWeeklyChampionship,
  createTournament, generateDailyDuels, cancelDuel, startWeeklyHouseWarSeason
} from '@/app/actions/duels'
import { createDuel, joinDuel, submitDuelAnswer, advanceDuelQuestion } from '@/app/actions/duels'
import { DuelTypeSelector } from '@/components/duels/DuelTypeSelector'
import { DuelGame } from '@/components/duels/DuelGame'
import { DuelResult } from '@/components/duels/DuelResult'
import { MatchmakingModal } from '@/components/duels/MatchmakingModal'
import { PowerUpBar } from '@/components/duels/PowerUpBar'
import { DuelLeaderboard } from '@/components/duels/DuelLeaderboard'
import { DuelHistory } from '@/components/duels/DuelHistory'
import { DuelAchievements } from '@/components/duels/DuelAchievements'
import { HallOfFame } from '@/components/duels/HallOfFame'
import { DuelStats as DuelStatsComponent } from '@/components/duels/DuelStats'
import { TerritoryMap } from '@/components/duels/TerritoryMap'
import { HouseStandings } from '@/components/duels/HouseStandings'
import { StreakDisplay } from '@/components/duels/StreakDisplay'
import { HouseSelectModal } from '@/components/duels/HouseSelectModal'
import { DuelAudio } from '@/components/duels/DuelAudio'
import { DuelCampaignPanel } from '@/components/duels/DuelCampaignPanel'
import { getMyHouse } from '@/app/actions/houses'

type View = 'lobby' | 'type_selector' | 'matchmaking' | 'waiting' | 'duel' | 'result'
type Tab = 'duels' | 'territory' | 'leaderboard' | 'history' | 'achievements' | 'halloffame' | 'stats'

export default function DuelsPage() {
  const supabase = getSupabaseBrowserClient()
  const { student, profile } = useAuthStore()
  const studentId = student?.id

  const [view, setView] = useState<View>('lobby')
  const [tab, setTab] = useState<Tab>('duels')
  const [duels, setDuels] = useState<Duel[]>([])
  const [activeDuel, setActiveDuel] = useState<Duel | null>(null)
  const [participants, setParticipants] = useState<DuelParticipantWithStudent[]>([])
  const [myStats, setMyStats] = useState<DuelStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [startingMode, setStartingMode] = useState<DuelType | null>(null)
  const [reactions, setReactions] = useState<any[]>([])
  const [availablePowerUps, setAvailablePowerUps] = useState<PowerUp[]>([])
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [opponentName, setOpponentName] = useState('')
  const [rankInfo, setRankInfo] = useState<any>(null)
  const [bosses, setBosses] = useState<any[]>([])
  const [showHouseSelect, setShowHouseSelect] = useState(false)
  const questionStartRef = useRef(Date.now())
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(undefined)
  const [duelResult, setDuelResult] = useState<'victory' | 'defeat' | 'draw' | null>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const duelActionRef = useRef(0)

  // Track question start time when question index changes
  useEffect(() => {
    questionStartRef.current = Date.now()
  }, [activeDuel?.current_question_index])

  // Total duel countdown timer
  useEffect(() => {
    if (view !== 'duel' || !activeDuel || activeDuel.status !== 'active') {
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null }
      setTimeRemaining(undefined)
      return
    }
    const totalSeconds = activeDuel.time_per_question * activeDuel.questions.length
    const start = activeDuel.started_at ? new Date(activeDuel.started_at).getTime() : Date.now()

    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const remaining = Math.max(0, totalSeconds - elapsed)
      setTimeRemaining(remaining)
    }

    tick()
    timerIntervalRef.current = setInterval(tick, 1000)
    return () => { if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null } }
  }, [view, activeDuel?.id, activeDuel?.status])

  // Derive result when duel completes
  useEffect(() => {
    if (view !== 'result' || !activeDuel) { setDuelResult(null); return }
    const me = participants.find(p => p.student_id === studentId)
    const opponent = participants.find(p => p.student_id !== studentId)
    if (!opponent || !me) { setDuelResult(null); return }
    if (me.score > opponent.score) setDuelResult('victory')
    else if (me.score < opponent.score) setDuelResult('defeat')
    else setDuelResult('draw')
  }, [view, activeDuel?.id, participants, studentId])

  // Check if user has joined a house
  useEffect(() => {
    if (!studentId) return
    getMyHouse().then(house => {
      if (!house) setShowHouseSelect(true)
    })
  }, [studentId])

  // Load initial data
  useEffect(() => {
    if (!studentId) return
    Promise.all([
      getActiveDuels(),
      getStudentDuelStats(studentId),
      getStudentRank(studentId),
      getActiveBosses(),
      getPowerUpInventory(),
    ]).then(([d, s, r, b, p]) => {
      setDuels(d)
      setMyStats(s)
      setRankInfo(r)
      setBosses(b)
      setAvailablePowerUps(p.map(i => i.power_up))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [studentId])

  // Realtime subscription
  useEffect(() => {
    if (!activeDuel || view !== 'duel') return
    const channel = supabase
      .channel(`duel-${activeDuel.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_participants', filter: `duel_id=eq.${activeDuel.id}` },
        () => refreshDuel()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_duels', filter: `id=eq.${activeDuel.id}` },
        (payload) => {
          const updated = payload.new as any
          if (updated.status === 'completed') setView('result')
          else setActiveDuel(prev => prev ? { ...prev, ...updated } : prev)
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duel_reactions', filter: `duel_id=eq.${activeDuel.id}` },
        () => refreshReactions()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeDuel?.id, view])

  const refreshDuel = async () => {
    if (!activeDuel) return
    const updated = await getDuelById(activeDuel.id)
    setActiveDuel(updated)
    setParticipants(updated.participants || [])
    if (updated.status === 'completed') setView('result')
  }

  const refreshReactions = async () => {
    if (!activeDuel) return
    getDuelReactions(activeDuel.id).then(setReactions)
  }

  // ── DUEL TYPE SELECTION ───────────────────────────────
  const handleSelectType = async (type: DuelType) => {
    if (!studentId) return
    const actionId = ++duelActionRef.current
    cancelledRef.current = type === 'quick' ? false : true
    stopPolling()
    if (type !== 'quick') {
      void leaveMatchmaking().catch(() => {})
      setSearching(false)
      setSearchTime(0)
    }
    setShowTypeSelector(false)
    setStartingMode(type)

    if (type === 'quick') {
      cancelledRef.current = false
      setSearching(true)
      setView('matchmaking')
      const result = await joinMatchmaking({ duel_type: 'quick' })
      if (actionId !== duelActionRef.current || cancelledRef.current) return
      if ('error' in result && result.error) {
        toast.error(result.error)
        setSearching(false)
        setView('lobby')
        setStartingMode(null)
        return
      }
      if (result.matched && result.duel) {
        if (actionId !== duelActionRef.current || cancelledRef.current) return
        setActiveDuel(result.duel)
        setParticipants(result.duel.participants || [])
        setOpponentName(result.opponent?.full_name || 'Opponent')
        setView('duel')
        setSearching(false)
        setStartingMode(null)
        toast.success('Match found!')
      } else {
        startPolling(actionId)
      }
    } else if (type === 'daily') {
      const duel = await generateDailyDuels()
      if (actionId !== duelActionRef.current) return
      if (duel) {
        setActiveDuel(duel)
        setParticipants(duel.participants || [])
        setView('duel')
        setStartingMode(null)
      } else {
        toast.success('Daily duel ready!')
        getActiveDuels().then(setDuels)
        setStartingMode(null)
      }
    } else if (type === 'boss') {
      try {
        setView('waiting')
        setOpponentName('Preparing boss battle...')
        const selectedBoss = bosses[0]
        const duel = await createDuel({
          duel_type: 'boss',
          boss_id: selectedBoss?.is_virtual ? undefined : selectedBoss?.id,
          topic: selectedBoss?.topic,
          difficulty: selectedBoss?.difficulty || 'challenge',
        })
        const full = await getDuelById(duel.id)
        if (actionId !== duelActionRef.current) return
        setActiveDuel(full)
        setParticipants(full.participants || [])
        setView('duel')
        setStartingMode(null)
        toast.success(selectedBoss ? `Boss battle: ${selectedBoss.name}` : 'Boss battle started')
      } catch (e: any) {
        if (actionId !== duelActionRef.current) return
        setView('lobby')
        setStartingMode(null)
        toast.error(e.message || 'Failed to start boss battle')
      }
    } else if (type === 'weekly') {
      try {
        setView('waiting')
        setOpponentName('Preparing weekly championship...')
        await startWeeklyHouseWarSeason()
        const duel = await createDuel({
          duel_type: 'weekly',
          difficulty: 'hard',
        })
        const full = await getDuelById(duel.id)
        if (actionId !== duelActionRef.current) return
        setActiveDuel(full)
        setParticipants(full.participants || [])
        setView('duel')
        setStartingMode(null)
        toast.success('Weekly championship started')
      } catch (e: any) {
        if (actionId !== duelActionRef.current) return
        setView('lobby')
        setStartingMode(null)
        toast.error(e.message || 'Failed to start weekly championship')
      }
    } else {
      try {
        setView('waiting')
        setOpponentName(type === 'coach' ? 'Preparing Peak Coach...' : 'Creating duel room...')
        const duel = await createDuel({
          duel_type: type,
          difficulty: type === 'classwar' || type === 'tournament' || type === 'teacher' ? 'hard' : 'medium',
        })
        if (actionId !== duelActionRef.current) return
        setActiveDuel(duel)
        setParticipants(duel.participants || [])
        setStartingMode(null)
        if (type === 'coach') {
          setView('duel')
        } else {
          setView('waiting')
          setOpponentName(type === 'friend'
            ? 'Friend challenge created in Open Duels'
            : type === 'team'
              ? 'Team room created in Open Duels'
              : type === 'classwar'
                ? 'Class war room created in Open Duels'
                : type === 'tournament'
                  ? 'Tournament bracket room created'
                  : 'Waiting for opponent...')
        }
      } catch (e: any) {
        if (actionId !== duelActionRef.current) return
        setView('lobby')
        setStartingMode(null)
        toast.error(e.message)
      }
    }
  }

  // ── JOIN DUEL ─────────────────────────────────────────
  const handleJoin = async (duelId: string) => {
    if (!studentId) return
    try {
      const result = await joinDuel(duelId)
      if (result.joined || result.alreadyJoined) {
        const duel = await getDuelById(duelId)
        setActiveDuel(duel)
        setParticipants(duel.participants || [])
        setView('duel')
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ── ANSWER ────────────────────────────────────────────
  const handleAnswer = useCallback(async (answerIndex: number) => {
    if (!activeDuel || !studentId) return
    const currentQ = activeDuel.questions[activeDuel.current_question_index]
    if (!currentQ) return

    const selectedAnswer = currentQ.options[answerIndex]
    const timeSpent = Math.min(activeDuel.time_per_question, Math.round((Date.now() - questionStartRef.current) / 1000) + 1)

    try {
      await submitDuelAnswer(activeDuel.id, activeDuel.current_question_index, selectedAnswer, timeSpent, 0)

      setIsAdvancing(true)
      await advanceDuelQuestion(activeDuel.id, activeDuel.current_question_index)
      setIsAdvancing(false)
      await refreshDuel()
    } catch (e: any) {
      toast.error('Failed to submit answer')
      setIsAdvancing(false)
    }
  }, [activeDuel?.id, activeDuel?.current_question_index, studentId])

  const handleTimeUp = useCallback(async () => {
    if (!activeDuel || !studentId) return
    const current = activeDuel.current_question_index
    setIsAdvancing(true)
    await submitDuelAnswer(activeDuel.id, current, '__TIME_UP__', activeDuel.time_per_question, 0)
    await advanceDuelQuestion(activeDuel.id, current)
    setIsAdvancing(false)
    await refreshDuel()
  }, [activeDuel?.id, activeDuel?.current_question_index, studentId])

  // ── POWER-UP ──────────────────────────────────────────
  const handlePowerUp = async (pu: PowerUp) => {
    if (!activeDuel) return
    try {
      await usePowerUp(activeDuel.id, pu)
      toast.success(`${POWER_UP_LABELS[pu]} activated!`)
      setAvailablePowerUps(prev => prev.filter(p => p !== pu))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ── REACTION ──────────────────────────────────────────
  const handleReact = async (emoji: string) => {
    if (!activeDuel) return
    await sendDuelReaction(activeDuel.id, emoji)
    refreshReactions()
  }

  // ── CANCEL MATCHMAKING ───────────────────────────────
  const cancelledRef = useRef(false)
  const matchmakingPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [searchTime, setSearchTime] = useState(0)

  const startPolling = (actionId: number) => {
    if (matchmakingPollRef.current) clearInterval(matchmakingPollRef.current)
    let elapsed = 0
    setSearchTime(0)
    matchmakingPollRef.current = setInterval(async () => {
      elapsed += 5
      setSearchTime(elapsed)
      if (actionId !== duelActionRef.current || cancelledRef.current) return
      if (!studentId) return
      const result = await retryMatchmaking({ duel_type: 'quick' })
      if (actionId !== duelActionRef.current || cancelledRef.current) return
      if (result.matched && result.duel) {
        if (matchmakingPollRef.current) clearInterval(matchmakingPollRef.current)
        matchmakingPollRef.current = null
        setActiveDuel(result.duel)
        setParticipants(result.duel.participants || [])
        setOpponentName(result.opponent?.full_name || 'Opponent')
        setView('duel')
        setSearching(false)
        setStartingMode(null)
        toast.success('Match found!')
      }
    }, 5000)
  }

  const stopPolling = () => {
    if (matchmakingPollRef.current) {
      clearInterval(matchmakingPollRef.current)
      matchmakingPollRef.current = null
    }
  }

  const handleCancelSearch = async () => {
    duelActionRef.current += 1
    cancelledRef.current = true
    stopPolling()
    setSearching(false)
    setStartingMode(null)
    setSearchTime(0)
    setView('lobby')
    void leaveMatchmaking().catch(() => {})
  }

  // ── RETURN TO LOBBY ──────────────────────────────────
  const handleReturn = () => {
    duelActionRef.current += 1
    cancelledRef.current = true
    stopPolling()
    setActiveDuel(null)
    setParticipants([])
    setStartingMode(null)
    setView('lobby')
    getActiveDuels().then(setDuels)
    if (studentId) getStudentDuelStats(studentId).then(setMyStats)
  }

  // ── RENDER ────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 border-b" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Swords size={18} style={{ color: 'var(--primary)' }} />
            <h1 className="text-sm font-black" style={{ color: 'var(--text)' }}>Classroom Duels</h1>
          </div>
          {rankInfo && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-dim)', color: getRankColor(rankInfo.duel_rating) }}>
                {getRank(rankInfo.duel_rating)}
              </span>
              <span className="text-xs font-black" style={{ color: getRankColor(rankInfo.duel_rating) }}>{rankInfo.duel_rating}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'duels' as Tab, label: 'Duels', icon: <Swords size={12} /> },
            { id: 'territory' as Tab, label: 'Territory', icon: <Shield size={12} /> },
            { id: 'leaderboard' as Tab, label: 'Rankings', icon: <Medal size={12} /> },
            { id: 'history' as Tab, label: 'History', icon: <Clock size={12} /> },
            { id: 'achievements' as Tab, label: 'Awards', icon: <Award size={12} /> },
            { id: 'halloffame' as Tab, label: 'Hall of Fame', icon: <Star size={12} /> },
            { id: 'stats' as Tab, label: 'Analytics', icon: <BarChart3 size={12} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${tab === t.id ? 'bg-primary text-white' : ''}`}
              style={{ background: tab === t.id ? 'var(--primary)' : 'var(--input)', color: tab === t.id ? 'white' : 'var(--text-muted)' }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'leaderboard' && (
          <motion.div key="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
            <DuelLeaderboard />
          </motion.div>
        )}
        {tab === 'history' && (
          <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
            <DuelHistory />
          </motion.div>
        )}
        {tab === 'achievements' && (
          <motion.div key="ach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
            <DuelAchievements />
          </motion.div>
        )}
        {tab === 'halloffame' && (
          <motion.div key="hof" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
            <HallOfFame />
          </motion.div>
        )}
        {tab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
            <DuelStatsComponent />
          </motion.div>
        )}

        {tab === 'territory' && (
          <motion.div key="terr" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-xs font-black mb-1 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                  <Map size={14} style={{ color: '#8B5CF6' }} /> Territory Map
                </h3>
                <p className="text-[9px] mb-3" style={{ color: 'var(--text-muted)' }}>
                  Each duel win earns territory points for your house. Capture enemy territories by accumulating points.
                </p>
                <TerritoryMap />
              </div>
              <div>
                <h3 className="text-xs font-black mb-2 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                  <Shield size={14} style={{ color: '#F59E0B' }} /> House Standings
                </h3>
                <HouseStandings />
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'duels' && (
          <motion.div key="duels" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats row */}
            {myStats && (
              <div className="grid grid-cols-4 gap-2 p-4 pb-0">
                {[
                  { label: 'Wins', value: myStats.wins, color: '#10B981' },
                  { label: 'Losses', value: myStats.losses, color: '#EF4444' },
                  { label: 'Draws', value: myStats.draws, color: '#F59E0B' },
                  { label: 'Streak', value: myStats.win_streak, color: '#8B5CF6' },
                ].map(s => (
                  <div key={s.label} className="p-2.5 rounded-xl text-center" style={{ background: 'var(--input)' }}>
                    <div className="text-base font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Streak & House */}
            <div className="px-4 pt-3">
              <StreakDisplay />
            </div>

            {/* Game view */}
            {view === 'duel' && activeDuel && (
              <div className="h-[calc(100dvh-120px)]">
                {activeDuel.status === 'active' ? (
                  <DuelGame
                    duel={activeDuel}
                    participants={participants}
                    myStudentId={studentId!}
                    onAnswer={handleAnswer}
                    onTimeUp={handleTimeUp}
                    onPowerUp={handlePowerUp}
                    onReact={handleReact}
                    reactions={reactions}
                    availablePowerUps={availablePowerUps}
                    isAdvancing={isAdvancing}
                  />
                ) : (
                  <DuelResult
                    duel={activeDuel}
                    participants={participants}
                    myStudentId={studentId!}
                    onReturn={handleReturn}
                    onRematch={() => handleSelectType('quick')}
                  />
                )}
              </div>
            )}

            {view === 'result' && activeDuel && (
              <div className="p-4">
                <DuelResult
                  duel={activeDuel}
                  participants={participants}
                  myStudentId={studentId!}
                  onReturn={handleReturn}
                  onRematch={() => handleSelectType('quick')}
                />
              </div>
            )}

            {view === 'waiting' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Users size={48} style={{ color: 'var(--primary)' }} />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>
                    {startingMode && !activeDuel
                      ? startingMode === 'coach'
                        ? 'Preparing Peak Coach...'
                        : startingMode === 'boss'
                          ? 'Preparing Boss Battle...'
                          : startingMode === 'weekly'
                            ? 'Preparing Weekly Duel...'
                            : 'Creating Duel...'
                      : 'Waiting for Opponent...'}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{opponentName}</p>
                </div>
                <motion.div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: 'var(--primary)' }}
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
                <button
                  onClick={() => {
                    if (activeDuel?.id) void cancelDuel(activeDuel.id).catch(() => {})
                    handleReturn()
                  }}
                  className="text-xs font-black uppercase tracking-wider hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {startingMode && !activeDuel ? 'Back' : 'Cancel'}
                </button>
              </div>
            )}

            {/* Lobby */}
            {view === 'lobby' && tab === 'duels' && (
              <div className="p-4 space-y-4">
                <DuelCampaignPanel onStartMode={handleSelectType} />

                {/* Boss battles */}
                {bosses.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black mb-2 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                      <Trophy size={14} style={{ color: '#8B5CF6' }} /> Boss Battles
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {bosses.slice(0, 4).map(boss => (
                        <motion.button
                          key={boss.id}
                          whileHover={{ scale: 1.02 }}
                          onClick={async () => {
                            try {
                              const duel = await createDuel({
                                duel_type: 'boss',
                                boss_id: boss.is_virtual ? undefined : boss.id,
                                topic: boss.topic,
                                difficulty: boss.difficulty,
                              })
                              if (!duel.questions || duel.questions.length === 0) {
                                toast.error('This boss has no questions configured yet')
                                return
                              }
                              const full = await getDuelById(duel.id)
                              setActiveDuel(full)
                              setParticipants(full.participants || [])
                              setView('duel')
                            } catch (e: any) {
                              toast.error(e.message || 'Failed to start boss battle')
                            }
                          }}
                          className="p-3 rounded-xl border-2 text-left transition-all hover:border-purple-500"
                          style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}
                        >
                          <div className="text-lg mb-1">🐉</div>
                          <div className="text-[11px] font-black truncate" style={{ color: 'var(--text)' }}>{boss.name}</div>
                          <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{boss.difficulty} · ❤️ {boss.health}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active duels */}
                <div>
                  <h3 className="text-xs font-black mb-2 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                    <Zap size={14} style={{ color: '#10B981' }} /> Open Duels
                  </h3>
                  {duels.filter(d => d.status === 'waiting' && !d.is_daily).length === 0 ? (
                    <div className="p-6 rounded-xl text-center" style={{ background: 'var(--input)' }}>
                      <Swords size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No open duels right now. Start one!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {duels.filter(d => d.status === 'waiting' && !d.is_daily).map(duel => {
                        const host = duel.participants?.[0]
                        return (
                          <motion.div
                            key={duel.id}
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center gap-3 p-3 rounded-xl border"
                            style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                          >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                              style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                              {host?.student?.full_name?.[0] || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                                {host?.student?.full_name || 'Unknown'}
                              </div>
                              <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                {DUEL_TYPE_LABELS[duel.duel_type]} · {duel.difficulty} · {duel.questions.length} Qs
                              </div>
                            </div>
                            <button
                              onClick={() => handleJoin(duel.id)}
                              disabled={duel.participants && duel.participants.length >= duel.max_participants}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                              style={{ background: 'var(--primary)', color: 'white', opacity: duel.participants && duel.participants.length >= duel.max_participants ? 0.5 : 1 }}
                            >
                              Join
                            </button>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectType('quick')}
                    className="p-4 rounded-2xl text-left border-2 transition-all"
                    style={{ background: 'var(--card)', borderColor: 'var(--primary)' }}
                  >
                    <Zap size={24} style={{ color: 'var(--primary)' }} />
                    <div className="text-sm font-black mt-1" style={{ color: 'var(--text)' }}>Quick Duel</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Auto-match now</div>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowTypeSelector(true)}
                    className="p-4 rounded-2xl text-left border-2 transition-all"
                    style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                  >
                    <UserPlus size={24} style={{ color: '#8B5CF6' }} />
                    <div className="text-sm font-black mt-1" style={{ color: 'var(--text)' }}>More Modes</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>All duel types</div>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectType('daily')}
                    className="p-4 rounded-2xl text-left border-2 transition-all"
                    style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                  >
                    <CalendarIcon size={24} style={{ color: '#F59E0B' }} />
                    <div className="text-sm font-black mt-1" style={{ color: 'var(--text)' }}>Daily Duel</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+ streak bonus</div>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectType('coach')}
                    className="p-4 rounded-2xl text-left border-2 transition-all"
                    style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                  >
                    <BrainIcon size={24} style={{ color: '#10B981' }} />
                    <div className="text-sm font-black mt-1" style={{ color: 'var(--text)' }}>Peak Coach</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Practice with AI</div>
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      {showTypeSelector && (
        <DuelTypeSelector onSelect={handleSelectType} onClose={() => setShowTypeSelector(false)} />
      )}
      <MatchmakingModal searching={searching} onCancel={handleCancelSearch} searchTime={searchTime} />
      <HouseSelectModal open={showHouseSelect} onComplete={() => setShowHouseSelect(false)} onClose={() => setShowHouseSelect(false)} />
      <DuelAudio mode={view === 'duel' || view === 'result' ? 'battle' : view === 'lobby' ? 'lobby' : 'matchmaking'} timeRemaining={timeRemaining} result={duelResult} />
    </div>
  )
}

function CalendarIcon(props: any) {
  // Inline svg for Calendar to avoid import issue
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function BrainIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a6 6 0 0 0-6 6c0 2.5 2 4 2 4v2h8v-2s2-1.5 2-4a6 6 0 0 0-6-6z" />
      <path d="M9 21h6" />
      <path d="M12 17v4" />
    </svg>
  )
}
