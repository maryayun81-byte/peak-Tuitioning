export type BrainGymBand = 'grade6' | 'grade7' | 'grade8' | 'grade9' | 'form1' | 'form2' | 'form3' | 'form4'

export interface BrainGymAdaptiveProfile {
  band: BrainGymBand
  label: string
  visualStyle: string
  languageTone: string
  questionDemand: string
  rewardTone: string
  minimumQualityScore: number
  difficultyMix: string[]
  cardClassName: string
  accentColor: string
}

const PROFILES: Record<BrainGymBand, BrainGymAdaptiveProfile> = {
  grade6: {
    band: 'grade6',
    label: 'Grade 6 Explorer Gym',
    visualStyle: 'bright, guided and practical',
    languageTone: 'warm, simple and confidence-building',
    questionDemand: 'concrete scenarios, visual clues, short reasoning',
    rewardTone: 'badge-style progress and encouraging celebrations',
    minimumQualityScore: 3,
    difficultyMix: ['4 easy, 4 medium, 2 hard', '3 easy, 5 medium, 2 hard'],
    cardClassName: 'bg-gradient-to-br from-amber-50 via-sky-50 to-emerald-50 border-amber-200',
    accentColor: '#f59e0b',
  },
  grade7: {
    band: 'grade7',
    label: 'Grade 7 Challenger Gym',
    visualStyle: 'modern illustrated textbook',
    languageTone: 'supportive, curious and reasoning-led',
    questionDemand: 'practical reasoning, diagrams, maps, charts and short explanations',
    rewardTone: 'skill badges and purposeful streak feedback',
    minimumQualityScore: 4,
    difficultyMix: ['2 easy, 5 medium, 3 hard', '3 easy, 4 medium, 3 hard'],
    cardClassName: 'bg-gradient-to-br from-cyan-50 via-white to-lime-50 border-cyan-200',
    accentColor: '#0891b2',
  },
  grade8: {
    band: 'grade8',
    label: 'Grade 8 Scholar Gym',
    visualStyle: 'clean junior secondary interface',
    languageTone: 'clear, structured and analytical',
    questionDemand: 'data interpretation, structured reasoning and realistic diagrams',
    rewardTone: 'mastery badges and clean achievement feedback',
    minimumQualityScore: 5,
    difficultyMix: ['1 easy, 5 medium, 4 hard', '2 easy, 4 medium, 4 hard'],
    cardClassName: 'bg-white border-slate-200',
    accentColor: '#2563eb',
  },
  grade9: {
    band: 'grade9',
    label: 'Grade 9 Academy Gym',
    visualStyle: 'premium, mature and focused',
    languageTone: 'precise, independent and exam-ready',
    questionDemand: 'case evidence, graph interpretation, data analysis and multi-step reasoning',
    rewardTone: 'analytics, league progress and subject mastery feedback',
    minimumQualityScore: 5,
    difficultyMix: ['1 easy, 4 medium, 5 hard', '1 easy, 3 medium, 6 hard'],
    cardClassName: 'bg-slate-950 border-slate-700 text-white',
    accentColor: '#6366f1',
  },
  form1: {
    band: 'form1',
    label: 'Form 1 KCSE Foundation',
    visualStyle: 'clean secondary-school revision',
    languageTone: 'accurate, structured and syllabus-specific',
    questionDemand: 'foundation concepts tested through reasoning, calculations and observations',
    rewardTone: 'topic mastery and exam readiness',
    minimumQualityScore: 5,
    difficultyMix: ['2 easy, 5 medium, 3 hard', '1 easy, 6 medium, 3 hard'],
    cardClassName: 'bg-white border-slate-200',
    accentColor: '#0f766e',
  },
  form2: {
    band: 'form2',
    label: 'Form 2 KCSE Builder',
    visualStyle: 'focused secondary-school revision',
    languageTone: 'precise and methodical',
    questionDemand: 'multi-step Form 1-2 calculations, experiments and common misconceptions',
    rewardTone: 'topic recovery and exam readiness',
    minimumQualityScore: 5,
    difficultyMix: ['1 easy, 5 medium, 4 hard', '1 easy, 4 medium, 5 hard'],
    cardClassName: 'bg-white border-slate-200',
    accentColor: '#1d4ed8',
  },
  form3: {
    band: 'form3',
    label: 'Form 3 KCSE Standard',
    visualStyle: 'serious KCSE preparation',
    languageTone: 'examiner-style, demanding and precise',
    questionDemand: 'KCSE B/A level reasoning, linked topics, data, graphs, equations and experiments',
    rewardTone: 'performance analytics and KCSE readiness',
    minimumQualityScore: 6,
    difficultyMix: ['0 easy, 4 medium, 6 hard', '1 easy, 3 medium, 6 hard'],
    cardClassName: 'bg-slate-950 border-slate-700 text-white',
    accentColor: '#7c3aed',
  },
  form4: {
    band: 'form4',
    label: 'Form 4 KCSE Drill',
    visualStyle: 'premium exam-room focus',
    languageTone: 'KCSE examiner-level, concise and challenging',
    questionDemand: 'cumulative Form 1-4, KCSE A-grade distractors, calculations, practicals and graph/data interpretation',
    rewardTone: 'KCSE readiness, weak-topic recovery and mastery analytics',
    minimumQualityScore: 6,
    difficultyMix: ['0 easy, 3 medium, 7 hard', '0 easy, 4 medium, 6 hard'],
    cardClassName: 'bg-slate-950 border-slate-700 text-white',
    accentColor: '#dc2626',
  },
}

export function getBrainGymBand(className?: string | null, level?: number | null): BrainGymBand {
  const raw = `${className || ''} ${level || ''}`.toLowerCase()
  const form = raw.match(/form\s*([1-4])/)?.[1]
  if (form === '1' || form === '2' || form === '3' || form === '4') return `form${form}` as BrainGymBand
  const grade = raw.match(/grade\s*(6|7|8|9)|\bg\s*(6|7|8|9)\b/)?.[1] || raw.match(/grade\s*(6|7|8|9)|\bg\s*(6|7|8|9)\b/)?.[2]
  if (grade === '6' || grade === '7' || grade === '8' || grade === '9') return `grade${grade}` as BrainGymBand
  if (level === 6 || level === 7 || level === 8 || level === 9) return `grade${level}` as BrainGymBand
  if (level === 10) return 'form2'
  if (level === 11) return 'form3'
  if (level === 12) return 'form4'
  return 'grade8'
}

export function getBrainGymAdaptiveProfile(className?: string | null, level?: number | null) {
  return PROFILES[getBrainGymBand(className, level)]
}

export function pickBrainGymDifficultyMix(profile: BrainGymAdaptiveProfile) {
  return profile.difficultyMix[Math.floor(Math.random() * profile.difficultyMix.length)]
}

