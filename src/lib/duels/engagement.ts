import type { Difficulty, DuelType, PowerUp, Question } from '@/types/duels'

export type DuelAudience = 'cbc' | 'junior' | 'senior'

export interface DuelSeason {
  id: string
  title: string
  weekStart: string
  weekEnd: string
  resetLabel: string
  titles: string[]
  rewards: string[]
}

export interface BossPhase {
  phase: number
  name: string
  hpFrom: number
  hpTo: number
  difficulty: Difficulty
  instruction: string
}

export interface TerritoryBonus {
  territoryId: string
  realmName: string
  subject: string
  xpMultiplier: number
  pointBonus: number
  label: string
}

export interface DuelQuest {
  id: string
  title: string
  description: string
  duelType: DuelType
  target: number
  rewardXp: number
  rewardTitle: string
}

export interface DuelModeExperience {
  type: DuelType
  start: 'instant' | 'matchmaking' | 'waiting-room'
  title: string
  promise: string
  recommendedDifficulty: Difficulty
  rewardHook: string
  powerUps: PowerUp[]
}

export interface DuelEngagementMeta {
  audience: DuelAudience
  season: DuelSeason
  mode: DuelModeExperience
  bossPhase?: BossPhase
  territoryBonus?: TerritoryBonus
  quests: DuelQuest[]
  cbcHook?: string
}

const DAY = 24 * 60 * 60 * 1000

export function getCurrentDuelSeason(now = new Date()): DuelSeason {
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + diffToMonday)

  const end = new Date(start.getTime() + 6 * DAY)
  const weekNumber = Math.ceil((((start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) / DAY) + 1) / 7)
  const seasonCode = `${start.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`

  return {
    id: seasonCode,
    title: `House War ${seasonCode}`,
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
    resetLabel: 'Resets every Monday',
    titles: ['Realm Scout', 'Banner Guard', 'House Captain', 'Crown Scholar'],
    rewards: ['Coins', 'House points', 'Profile title', 'Territory push'],
  }
}

export const BOSS_PHASES: BossPhase[] = [
  {
    phase: 1,
    name: 'Opening Guard',
    hpFrom: 100,
    hpTo: 71,
    difficulty: 'medium',
    instruction: 'Foundation ideas, one clear trap, quick confidence build.',
  },
  {
    phase: 2,
    name: 'Pressure Round',
    hpFrom: 70,
    hpTo: 41,
    difficulty: 'hard',
    instruction: 'Multi-step reasoning, linked concepts and stronger distractors.',
  },
  {
    phase: 3,
    name: 'Final Stand',
    hpFrom: 40,
    hpTo: 0,
    difficulty: 'challenge',
    instruction: 'Examiner-level synthesis, calculations, graphs, data or explanation.',
  },
]

export const TERRITORY_BONUSES: TerritoryBonus[] = [
  {
    territoryId: 'coast',
    realmName: 'Pearl Coast',
    subject: 'Chemistry',
    xpMultiplier: 1.05,
    pointBonus: 2,
    label: '+5% Chemistry XP',
  },
  {
    territoryId: 'valley',
    realmName: 'Scholar Valley',
    subject: 'Mathematics',
    xpMultiplier: 1.05,
    pointBonus: 2,
    label: '+5% Mathematics XP',
  },
  {
    territoryId: 'mountains',
    realmName: 'Ironspine Range',
    subject: 'Geography',
    xpMultiplier: 1.05,
    pointBonus: 2,
    label: '+5% Geography XP',
  },
  {
    territoryId: 'islands',
    realmName: 'Oracle Isles',
    subject: 'Integrated Science',
    xpMultiplier: 1.08,
    pointBonus: 3,
    label: '+8% CBC Science XP',
  },
]

export const DUEL_QUESTS: DuelQuest[] = [
  {
    id: 'calculus-climb',
    title: 'Calculus Climb',
    description: 'Win 3 duels with Form 4 differentiation or turning points questions.',
    duelType: 'quick',
    target: 3,
    rewardXp: 250,
    rewardTitle: 'Gradient Breaker',
  },
  {
    id: 'boss-breaker',
    title: 'Boss Breaker',
    description: 'Clear one boss battle with at least 70% accuracy.',
    duelType: 'boss',
    target: 1,
    rewardXp: 300,
    rewardTitle: 'Boss Breaker',
  },
  {
    id: 'cbc-discovery-run',
    title: 'Discovery Run',
    description: 'Complete 5 CBC-friendly duels with visuals, stories or real-life scenarios.',
    duelType: 'daily',
    target: 5,
    rewardXp: 180,
    rewardTitle: 'Discovery Hero',
  },
]

export const DUEL_MODE_EXPERIENCE: Record<DuelType, DuelModeExperience> = {
  quick: {
    type: 'quick',
    start: 'matchmaking',
    title: 'Quick Duel',
    promise: 'Fast ranked match with another learner near your level.',
    recommendedDifficulty: 'medium',
    rewardHook: 'Rating movement, house points and quest progress.',
    powerUps: ['fifty_fifty', 'time_freeze', 'hint'],
  },
  friend: {
    type: 'friend',
    start: 'waiting-room',
    title: 'Friend Challenge',
    promise: 'Create a challenge linkable from the open duel list.',
    recommendedDifficulty: 'medium',
    rewardHook: 'Friendly rivalry, rematch loop and accuracy review.',
    powerUps: ['fifty_fifty', 'time_freeze', 'double_xp', 'hint'],
  },
  coach: {
    type: 'coach',
    start: 'instant',
    title: 'Peak Coach Duel',
    promise: 'Solo adaptive battle tuned to class level and weak areas.',
    recommendedDifficulty: 'hard',
    rewardHook: 'Training XP, streaks and immediate review.',
    powerUps: ['hint', 'time_freeze', 'fifty_fifty'],
  },
  team: {
    type: 'team',
    start: 'waiting-room',
    title: 'Team Battle',
    promise: 'Group challenge where the room stays open for more learners.',
    recommendedDifficulty: 'medium',
    rewardHook: 'Team pride, shared house pressure and open-room participation.',
    powerUps: ['fifty_fifty', 'time_freeze', 'shield', 'hint'],
  },
  classwar: {
    type: 'classwar',
    start: 'waiting-room',
    title: 'Class War',
    promise: 'Class-versus-class pressure round for rankings and house territory.',
    recommendedDifficulty: 'hard',
    rewardHook: 'House points and class bragging rights.',
    powerUps: ['fifty_fifty', 'time_freeze', 'shield'],
  },
  teacher: {
    type: 'teacher',
    start: 'waiting-room',
    title: 'Teacher Challenge',
    promise: 'Teacher benchmark challenge with strict topic focus.',
    recommendedDifficulty: 'hard',
    rewardHook: 'Teacher-set XP and review-ready answers.',
    powerUps: ['hint', 'time_freeze'],
  },
  boss: {
    type: 'boss',
    start: 'instant',
    title: 'Boss Battle',
    promise: 'Three-phase topic boss with harder questions as HP drops.',
    recommendedDifficulty: 'challenge',
    rewardHook: 'Boss title, coins, XP and territory pressure.',
    powerUps: ['fifty_fifty', 'hint', 'time_freeze'],
  },
  tournament: {
    type: 'tournament',
    start: 'waiting-room',
    title: 'Tournament',
    promise: 'Bracket-style room for competitive learners.',
    recommendedDifficulty: 'hard',
    rewardHook: 'Hall of fame, title chase and season points.',
    powerUps: ['fifty_fifty', 'hint', 'time_freeze'],
  },
  daily: {
    type: 'daily',
    start: 'instant',
    title: 'Daily Duel',
    promise: 'Short streak-preserving challenge with a clean win condition.',
    recommendedDifficulty: 'medium',
    rewardHook: 'Daily streak, quick XP and quest progress.',
    powerUps: ['hint', 'fifty_fifty'],
  },
  weekly: {
    type: 'weekly',
    start: 'instant',
    title: 'Weekly Championship',
    promise: 'Season-scored weekly challenge for house titles.',
    recommendedDifficulty: 'hard',
    rewardHook: 'Weekly title ladder and house war contribution.',
    powerUps: ['fifty_fifty', 'time_freeze', 'hint'],
  },
}

export function getDuelAudience(classLevel?: number | null, className?: string | null): DuelAudience {
  const normalized = (className || '').toLowerCase()
  if (normalized.includes('grade') || (classLevel && classLevel <= 9)) return 'cbc'
  if (normalized.includes('form 1') || normalized.includes('form 2')) return 'junior'
  return 'senior'
}

export function getCbcHook(audience: DuelAudience, duelType: DuelType) {
  if (audience !== 'cbc') return undefined
  if (duelType === 'boss') return 'Story boss with hints, visual clues and short victory loops.'
  if (duelType === 'daily') return 'A tiny mission that feels quick, colourful and achievable.'
  return 'Fast feedback, scenario questions and visible progress every round.'
}

export function pickBossPhase(questionIndex: number, totalQuestions: number): BossPhase {
  const ratio = totalQuestions <= 1 ? 1 : questionIndex / (totalQuestions - 1)
  if (ratio >= 0.67) return BOSS_PHASES[2]
  if (ratio >= 0.34) return BOSS_PHASES[1]
  return BOSS_PHASES[0]
}

export function pickTerritoryBonus(questions: Question[]): TerritoryBonus | undefined {
  const subjects = questions.map(q => q.subject?.toLowerCase() || '')
  return TERRITORY_BONUSES.find(bonus =>
    subjects.some(subject => subject.includes(bonus.subject.toLowerCase()))
  )
}

export function attachDuelEngagement(
  questions: Question[],
  options: {
    duelType: DuelType
    classLevel?: number | null
    className?: string | null
  }
): Question[] {
  const audience = getDuelAudience(options.classLevel, options.className)
  const season = getCurrentDuelSeason()
  const mode = DUEL_MODE_EXPERIENCE[options.duelType]
  const territoryBonus = pickTerritoryBonus(questions)
  const quests = DUEL_QUESTS.filter(q => q.duelType === options.duelType || q.duelType === 'daily').slice(0, 2)

  return questions.map((question, index) => {
    const bossPhase = options.duelType === 'boss' ? pickBossPhase(index, questions.length) : undefined
    const meta: DuelEngagementMeta = {
      audience,
      season,
      mode,
      bossPhase,
      territoryBonus,
      quests,
      cbcHook: getCbcHook(audience, options.duelType),
    }

    return {
      ...question,
      duelEngagement: meta,
      difficulty: bossPhase?.difficulty || question.difficulty,
    } as Question
  })
}

export function getEngagementFromQuestion(question?: Question): DuelEngagementMeta | undefined {
  return (question as any)?.duelEngagement
}

export function getTerritoryPointAward(basePoints: number, questions?: Question[]) {
  const bonus = questions?.length ? pickTerritoryBonus(questions) : undefined
  return basePoints + (bonus?.pointBonus || 0)
}

export function getXpWithTerritoryBonus(baseXp: number, questions?: Question[]) {
  const bonus = questions?.length ? pickTerritoryBonus(questions) : undefined
  return Math.round(baseXp * (bonus?.xpMultiplier || 1))
}
