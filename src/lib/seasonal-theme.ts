export type Season = 'summer' | 'autumn' | 'winter' | 'spring'

export interface SeasonTheme {
  season: Season
  label: string
  emoji: string
  bgGradient: string
  cardBg: string
  cardBorder: string
  cardGlow: string
  accent: string
  accentDim: string
  accentText: string
  animation: 'snowflakes' | 'petals' | 'leaves' | 'clouds'
  particleColor: string
  particleCount: number
  message: string
  messageIcon: string
}

export function getCurrentSeason(): Season {
  const month = new Date().getMonth()
  if (month >= 11 || month <= 1) return 'summer'
  if (month >= 2 && month <= 4) return 'autumn'
  if (month >= 5 && month <= 7) return 'winter'
  return 'spring'
}

const STORAGE_KEY = 'peak_season_override'

export function getSeasonOverride(): Season | null {
  if (typeof window === 'undefined') return null
  const val = localStorage.getItem(STORAGE_KEY)
  if (val && ['summer', 'autumn', 'winter', 'spring'].includes(val)) return val as Season
  return null
}

export function setSeasonOverride(season: Season | null) {
  if (typeof window === 'undefined') return
  if (season) localStorage.setItem(STORAGE_KEY, season)
  else localStorage.removeItem(STORAGE_KEY)
}

export function getReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('peak_reduced_motion') === 'true'
}

export function setReducedMotion(val: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem('peak_reduced_motion', val ? 'true' : 'false')
}

export function getSeasonTheme(season: Season): SeasonTheme {
  switch (season) {
    case 'winter':
      return {
        season: 'winter',
        label: 'Winter',
        emoji: '❄️',
        bgGradient: 'linear-gradient(180deg, #0B1120 0%, #1E293B 50%, #0F172A 100%)',
        cardBg: 'rgba(30, 41, 59, 0.6)',
        cardBorder: 'rgba(148, 163, 184, 0.15)',
        cardGlow: 'rgba(147, 197, 253, 0.08)',
        accent: '#60A5FA',
        accentDim: 'rgba(96, 165, 250, 0.12)',
        accentText: '#93C5FD',
        animation: 'snowflakes',
        particleColor: 'rgba(255,255,255,0.6)',
        particleCount: 30,
        message: 'Stay focused. Strong students are made during the cold seasons.',
        messageIcon: '❄️',
      }
    case 'spring':
      return {
        season: 'spring',
        label: 'Spring',
        emoji: '🌸',
        bgGradient: 'linear-gradient(180deg, #0F172A 0%, #1A2E2A 50%, #0F172A 100%)',
        cardBg: 'rgba(20, 45, 40, 0.5)',
        cardBorder: 'rgba(52, 211, 153, 0.15)',
        cardGlow: 'rgba(52, 211, 153, 0.08)',
        accent: '#34D399',
        accentDim: 'rgba(52, 211, 153, 0.12)',
        accentText: '#6EE7B7',
        animation: 'petals',
        particleColor: 'rgba(244, 114, 182, 0.5)',
        particleCount: 20,
        message: 'New season, new growth. Keep improving one lesson at a time.',
        messageIcon: '🌱',
      }
    case 'summer':
      return {
        season: 'summer',
        label: 'Summer',
        emoji: '☀️',
        bgGradient: 'linear-gradient(180deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)',
        cardBg: 'rgba(30, 58, 95, 0.4)',
        cardBorder: 'rgba(250, 204, 21, 0.15)',
        cardGlow: 'rgba(250, 204, 21, 0.08)',
        accent: '#FACC15',
        accentDim: 'rgba(250, 204, 21, 0.12)',
        accentText: '#FDE68A',
        animation: 'clouds',
        particleColor: 'rgba(255,255,255,0.15)',
        particleCount: 8,
        message: 'Shine through your effort. Today is another chance to improve.',
        messageIcon: '☀️',
      }
    case 'autumn':
      return {
        season: 'autumn',
        label: 'Autumn',
        emoji: '🍂',
        bgGradient: 'linear-gradient(180deg, #0F172A 0%, #2D1F1A 50%, #0F172A 100%)',
        cardBg: 'rgba(45, 31, 26, 0.5)',
        cardBorder: 'rgba(251, 146, 60, 0.15)',
        cardGlow: 'rgba(251, 146, 60, 0.08)',
        accent: '#FB923C',
        accentDim: 'rgba(251, 146, 60, 0.12)',
        accentText: '#FDBA74',
        animation: 'leaves',
        particleColor: 'rgba(251, 146, 60, 0.5)',
        particleCount: 18,
        message: 'Harvest the results of your consistency.',
        messageIcon: '🍂',
      }
  }
}

export function useSeason(): { season: Season; theme: SeasonTheme; reducedMotion: boolean; setReducedMotion: (v: boolean) => void } {
  const override = getSeasonOverride()
  const season = override || getCurrentSeason()
  const theme = getSeasonTheme(season)
  return { season, theme, reducedMotion: getReducedMotion(), setReducedMotion }
}
