export type DuelType = 'quick' | 'friend' | 'coach' | 'team' | 'classwar' | 'teacher' | 'boss' | 'tournament' | 'daily' | 'weekly'
export type DuelStatus = 'waiting' | 'active' | 'completed'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'challenge' | 'legendary'
export type CoachDifficulty = 'apprentice' | 'scholar' | 'master' | 'kcse_beast' | 'legend'
export type PowerUp = 'fifty_fifty' | 'time_freeze' | 'double_xp' | 'shield' | 'hint' | 'revive' | 'skip'
export type EmojiReaction = '🔥' | '👏' | '😲' | '💪' | '😂' | '❤️' | 'GG'
export type DuelResult = 'win' | 'loss' | 'draw'
export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster' | 'legend'

export interface Question {
  id: string
  subject: string
  topic: string
  difficulty: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export interface Duel {
  id: string
  class_id?: string
  status: DuelStatus
  questions: Question[]
  current_question_index: number
  created_at: string
  duel_type: DuelType
  difficulty: Difficulty
  subject_id?: string
  topic?: string
  time_per_question: number
  max_participants: number
  started_at?: string
  completed_at?: string
  winner_id?: string
  allowed_power_ups: PowerUp[]
  tournament_bracket?: any
  boss_id?: string
  coach_difficulty?: CoachDifficulty
  class_team_a_id?: string
  class_team_b_id?: string
  created_by?: string
  is_daily?: boolean
  participants?: DuelParticipantWithStudent[]
}

export interface DuelParticipant {
  id: string
  duel_id: string
  student_id: string
  score: number
  joined_at: string
  power_ups_used: PowerUpUsed[]
  answer_history: AnswerRecord[]
  elo_before?: number
  elo_after?: number
  disconnect_count: number
  total_time_spent: number
  max_streak: number
}

export interface DuelParticipantWithStudent extends DuelParticipant {
  student: {
    id: string
    full_name: string
    avatar_url?: string
    admission_number?: string
  }
}

export interface PowerUpUsed {
  type: PowerUp
  question_index: number
  used_at: string
}

export interface AnswerRecord {
  question_index: number
  selected_answer: string
  is_correct: boolean
  time_spent: number
  streak_at_time: number
}

export interface DuelReaction {
  id: string
  duel_id: string
  student_id: string
  emoji: EmojiReaction
  created_at: string
}

export interface DuelMessage {
  id: string
  duel_id: string
  student_id: string
  message: string
  created_at: string
}

export interface MatchmakingEntry {
  id: string
  student_id: string
  duel_type: DuelType
  subject_id?: string
  difficulty: Difficulty
  rating: number
  status: 'searching' | 'found' | 'cancelled'
  created_at: string
  matched_at?: string
}

export interface DuelResultRow {
  id: string
  duel_id: string
  student_id: string
  opponent_student_id?: string
  result: DuelResult
  score: number
  opponent_score: number
  xp_awarded: number
  created_at: string
  opponent?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

export interface DuelRatingHistory {
  id: string
  student_id: string
  duel_id: string
  rating_before: number
  rating_after: number
  change: number
  created_at: string
}

export interface PowerUpInventory {
  id: string
  student_id: string
  power_up: PowerUp
  quantity: number
  acquired_at: string
}

export interface DuelBoss {
  id: string
  name: string
  title: string
  subject_id?: string
  topic?: string
  difficulty: Difficulty
  icon_url?: string
  health: number
  stages: any[]
  questions: Question[]
  reward_xp: number
  reward_coins: number
  is_active: boolean
  created_at: string
}

export interface DuelAchievement {
  id: string
  code: string
  title: string
  description: string
  icon_url?: string
  category: string
  condition: any
  reward_xp: number
  reward_coins: number
}

export interface StudentDuelAchievement {
  id: string
  student_id: string
  achievement_id: string
  earned_at: string
  achievement?: DuelAchievement
}

export interface HallOfFameEntry {
  id: string
  season: string
  student_id: string
  rank: number
  total_wins: number
  total_points: number
  win_rate: number
  badge?: string
  created_at: string
  student?: {
    id: string
    full_name: string
    avatar_url?: string
    admission_number?: string
  }
}

export interface WeeklyChampionship {
  id: string
  week_start: string
  week_end: string
  subject_id?: string
  status: 'active' | 'completed' | 'cancelled'
  champion_id?: string
  created_at: string
}

export interface DuelLeaderboardEntry {
  student_id: string
  full_name: string
  admission_number?: string
  avatar_url?: string
  class_name?: string
  duel_rating: number
  duel_wins: number
  duel_losses: number
  duel_draws: number
  total_duels: number
  win_rate: number
}

export interface DuelStats {
  total_duels: number
  wins: number
  losses: number
  draws: number
  win_streak: number
  rating: number
  win_rate: number
  avg_score: number
  best_score: number
  total_xp: number
}

export interface CreateDuelInput {
  duel_type: DuelType
  class_id?: string
  subject_id?: string
  topic?: string
  difficulty?: Difficulty
  time_per_question?: number
  opponent_student_id?: string
  coach_difficulty?: CoachDifficulty
  boss_id?: string
  team_member_ids?: string[]
  team_name?: string
}

export const DUEL_TYPE_LABELS: Record<DuelType, string> = {
  quick: '⚔ Quick Duel',
  friend: '👫 Friend Challenge',
  coach: '🤖 Peak Coach',
  team: '👥 Team Battle',
  classwar: '🏫 Class War',
  teacher: '👨‍🏫 Teacher Challenge',
  boss: '🐉 Boss Battle',
  tournament: '🏆 Tournament',
  daily: '📅 Daily Duel',
  weekly: '📊 Weekly Championship',
}

export const DUEL_TYPE_DESCRIPTIONS: Record<DuelType, string> = {
  quick: 'Auto-match with a student of similar skill',
  friend: 'Challenge a specific friend',
  coach: 'Battle Peak Coach AI at your level',
  team: 'Team up with friends vs another team',
  classwar: 'Your class vs another class',
  teacher: 'Beat your teacher\'s benchmark',
  boss: 'Defeat a topic boss',
  tournament: 'Single elimination bracket',
  daily: 'Daily quick challenge with streak bonus',
  weekly: 'Weekly subject championship',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  challenge: 'Challenge',
  legendary: 'Legendary',
}

export const COACH_DIFFICULTY_LABELS: Record<CoachDifficulty, string> = {
  apprentice: 'Apprentice',
  scholar: 'Scholar',
  master: 'Master',
  kcse_beast: 'KCSE Beast',
  legend: 'Legend',
}

export const POWER_UP_LABELS: Record<PowerUp, string> = {
  fifty_fifty: '50-50',
  time_freeze: '⏸ Time Freeze',
  double_xp: '2× XP',
  shield: '🛡 Shield',
  hint: '💡 Hint',
  revive: '🔄 Revive',
  skip: '⏭ Skip',
}

export const POWER_UP_DESCRIPTIONS: Record<PowerUp, string> = {
  fifty_fifty: 'Remove two wrong answers',
  time_freeze: 'Add 15 seconds',
  double_xp: 'Double XP for this duel',
  shield: 'Protect trophies on loss',
  hint: 'Show a clue',
  revive: 'Second chance on wrong answer',
  skip: 'Skip this question',
}

export const EMOJIS: EmojiReaction[] = ['🔥', '👏', '😲', '💪', '😂', '❤️', 'GG']

export const RANK_THRESHOLDS: { name: RankTier; minRating: number; color: string }[] = [
  { name: 'bronze',    minRating: 0,    color: '#CD7F32' },
  { name: 'silver',    minRating: 1100, color: '#C0C0C0' },
  { name: 'gold',      minRating: 1300, color: '#FFD700' },
  { name: 'platinum',  minRating: 1500, color: '#E5E4E2' },
  { name: 'diamond',   minRating: 1700, color: '#B9F2FF' },
  { name: 'master',    minRating: 1900, color: '#DF00FF' },
  { name: 'grandmaster', minRating: 2100, color: '#FF4500' },
  { name: 'legend',    minRating: 2400, color: '#FFD700' },
]

export function getRank(rating: number): RankTier {
  let rank: RankTier = 'bronze'
  for (const r of RANK_THRESHOLDS) {
    if (rating >= r.minRating) rank = r.name
  }
  return rank
}

export function getRankColor(rating: number): string {
  return RANK_THRESHOLDS.find(r => r.name === getRank(rating))?.color || '#CD7F32'
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
