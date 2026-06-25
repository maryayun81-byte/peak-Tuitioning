export const HOUSES = [
  { id: 'peak', name: 'Peak', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', emoji: '🗻', motto: 'Reach the Summit' },
  { id: 'valor', name: 'Valor', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', emoji: '⚔️', motto: 'Brave the Battle' },
  { id: 'apex', name: 'Apex', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', emoji: '🦅', motto: 'Soar Above' },
  { id: 'onyx', name: 'Onyx', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)', emoji: '💎', motto: 'Unyielding Spirit' },
] as const

export type HouseId = (typeof HOUSES)[number]['id']

export interface Territory {
  id: string
  name: string
  owner: HouseId | null
  points: number
  threshold: number
  adjacent: string[]
}

export interface HouseStanding {
  houseId: HouseId
  territoryCount: number
  totalPoints: number
  memberCount: number
  weeklyWins: number
}

export interface DuelStreak {
  current: number
  longest: number
  lastDuelDate: string
  freezesAvailable: number
}
