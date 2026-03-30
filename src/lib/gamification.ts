export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 1000, title: 'Brave Adventurer' },
  { level: 2, xp: 1800, title: 'Elite Scholar' },
  { level: 3, xp: 2600, title: 'Master Mind' },
  { level: 4, xp: 3400, title: 'Legendary Hero' },
  { level: 5, xp: 4000, title: 'Peak Perfectionist' },
  { level: 6, xp: 5000, title: 'Rising Star' },
  { level: 7, xp: 6200, title: 'Knowledge Seeker' },
  { level: 8, xp: 7500, title: 'Keen Observer' },
  { level: 9, xp: 8900, title: 'Dedicated Pupil' },
  { level: 10, xp: 10500, title: 'Adept Learner' },
  { level: 11, xp: 12200, title: 'Academic Warrior' },
  { level: 12, xp: 14000, title: 'Fierce Competitor' },
  { level: 13, xp: 16000, title: 'Logic Master' },
  { level: 14, xp: 18200, title: 'Trivia Champion' },
  { level: 15, xp: 20600, title: 'Quiz Conqueror' },
  { level: 16, xp: 23200, title: 'Mind Explorer' },
  { level: 17, xp: 26000, title: 'Brainiac' },
  { level: 18, xp: 29000, title: 'Intellect Prime' },
  { level: 19, xp: 32200, title: 'Erudite Soul' },
  { level: 20, xp: 35600, title: 'Silver Scholar' },
  { level: 21, xp: 39200, title: 'Golden Scholar' },
  { level: 22, xp: 43000, title: 'Platinum Scholar' },
  { level: 23, xp: 47000, title: 'Diamond Scholar' },
  { level: 24, xp: 51200, title: 'Epic Savant' },
  { level: 25, xp: 55600, title: 'Mythic Genius' },
  { level: 26, xp: 60200, title: 'Grandmaster' },
  { level: 27, xp: 65000, title: 'Supreme Thinker' },
  { level: 28, xp: 70000, title: 'Oracle of Wisdom' },
  { level: 29, xp: 75200, title: 'Luminous Mind' },
  { level: 30, xp: 80600, title: 'Astral Intellect' },
  { level: 31, xp: 86200, title: 'Celestial Sage' },
  { level: 32, xp: 92000, title: 'Galactic Scholar' },
  { level: 33, xp: 98000, title: 'Universal Mind' },
  { level: 34, xp: 104200, title: 'Cosmic Genius' },
  { level: 35, xp: 110600, title: 'Omniscient Being' },
  { level: 36, xp: 117200, title: 'Titan of Knowledge' },
  { level: 37, xp: 124000, title: 'Apex Intellectual' },
  { level: 38, xp: 131000, title: 'Legend of Peak' },
  { level: 39, xp: 138200, title: 'Immortal Scholar' },
  { level: 40, xp: 150000, title: 'God of Wisdom' }
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
