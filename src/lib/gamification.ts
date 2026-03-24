export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 1000, title: 'Brave Adventurer' },
  { level: 2, xp: 1800, title: 'Elite Scholar' },
  { level: 3, xp: 2600, title: 'Master Mind' },
  { level: 4, xp: 3400, title: 'Legendary Hero' },
  { level: 5, xp: 4000, title: 'Peak Perfectionist' }
]

export function calculateLevel(xp: number) {
  let level = 0
  let title = 'Prospect / Novice Explorer'
  let currentMilestone = 0
  let nextMilestone = 1000

  // Search from highest to lowest
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = LEVEL_THRESHOLDS[i]
    if (xp >= t.xp) {
      level = t.level
      title = t.title
      currentMilestone = t.xp
      nextMilestone = LEVEL_THRESHOLDS[i + 1]?.xp || (t.xp + 1000) // Default to +1000 for max level
      break
    }
  }

  const progressProgress = xp - currentMilestone
  const range = nextMilestone - currentMilestone
  const progressPercent = Math.min(100, Math.floor((progressProgress / range) * 100))

  return {
    level,
    title,
    currentMilestone,
    nextMilestone,
    progressPercent,
    isProspect: level === 0
  }
}
