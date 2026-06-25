import type { PowerUp, Question } from '@/types/duels'

export type DuelGradeBand = 6 | 7 | 8 | 9

export interface DuelAdaptiveProfile {
  grade: DuelGradeBand
  label: string
  stage: 'explorer' | 'bridge' | 'scholar' | 'academy'
  visualStyle: string
  languageTone: string
  diagramStyle: string
  rewardStyle: string
  questionFormats: string[]
  diagramPrompts: Record<string, string[]>
  timeMultiplier: number
  allowedPowerUps: PowerUp[]
  cardClassName: string
  accentColor: string
  shouldCelebrate: boolean
}

export interface DuelAdaptiveQuestionMeta {
  grade: DuelGradeBand
  visualStyle: string
  languageTone: string
  diagramStyle: string
  rewardStyle: string
  questionFormats: string[]
  recommendedFormat: string
  diagramSuggestions: string[]
  cognitiveLoad: 'supported' | 'reasoning' | 'analysis' | 'case-study'
}

type QuestionWithAdaptiveMeta = Question & { adaptive?: DuelAdaptiveQuestionMeta }

const SUBJECT_DIAGRAMS: Record<string, string[]> = {
  mathematics: ['number line', 'bar model', 'coordinate grid', 'graph', '3D solid'],
  science: ['system diagram', 'lab apparatus', 'food chain', 'cell diagram', 'circuit'],
  'integrated science': ['human body system', 'plant structure', 'food web', 'lab setup', 'microscope view'],
  social: ['Kenya map', 'timeline', 'climate graph', 'settlement map', 'population chart'],
  agriculture: ['farm layout', 'soil profile', 'crop rotation diagram', 'irrigation setup', 'pest life cycle'],
  'pre-technical': ['tool diagram', 'workshop layout', 'safety symbol', 'electrical component', 'engineering sketch'],
}

export const DUEL_ADAPTIVE_PROFILES: Record<DuelGradeBand, DuelAdaptiveProfile> = {
  6: {
    grade: 6,
    label: 'Grade 6 Explorer',
    stage: 'explorer',
    visualStyle: 'adventurous, colorful, interactive, friendly',
    languageTone: 'warm, encouraging, story-led, concrete',
    diagramStyle: 'bright illustrated diagrams with simple labels',
    rewardStyle: 'collectible badges, bright achievement cards, energetic sounds',
    questionFormats: ['mcq', 'image-mcq', 'diagram-label', 'matching', 'sequencing', 'story-scenario'],
    diagramPrompts: SUBJECT_DIAGRAMS,
    timeMultiplier: 1.2,
    allowedPowerUps: ['fifty_fifty', 'time_freeze', 'hint', 'revive', 'skip'],
    cardClassName: 'bg-gradient-to-br from-amber-50 via-sky-50 to-emerald-50 border-amber-200',
    accentColor: '#f59e0b',
    shouldCelebrate: true,
  },
  7: {
    grade: 7,
    label: 'Grade 7 Challenger',
    stage: 'bridge',
    visualStyle: 'modern illustrated textbook, lively but less cartoonish',
    languageTone: 'supportive, reasoning-led, lightly playful',
    diagramStyle: 'infographics, cross-sections, maps, charts, timelines',
    rewardStyle: 'achievement cards, skill badges, purposeful streak feedback',
    questionFormats: ['mcq', 'image-mcq', 'diagram-label', 'matching', 'sequencing', 'reasoning-scenario'],
    diagramPrompts: SUBJECT_DIAGRAMS,
    timeMultiplier: 1.1,
    allowedPowerUps: ['fifty_fifty', 'time_freeze', 'hint', 'revive', 'skip'],
    cardClassName: 'bg-gradient-to-br from-cyan-50 via-white to-lime-50 border-cyan-200',
    accentColor: '#0891b2',
    shouldCelebrate: true,
  },
  8: {
    grade: 8,
    label: 'Grade 8 Scholar',
    stage: 'scholar',
    visualStyle: 'clean junior secondary learning interface',
    languageTone: 'clear, structured, analytical',
    diagramStyle: 'realistic diagrams, lab equipment, graphs and data tables',
    rewardStyle: 'clean achievement animation, rankings, mastery badges',
    questionFormats: ['mcq', 'image-mcq', 'diagram-label', 'sequencing', 'data-analysis', 'structured-response'],
    diagramPrompts: SUBJECT_DIAGRAMS,
    timeMultiplier: 1,
    allowedPowerUps: ['fifty_fifty', 'time_freeze', 'hint', 'shield'],
    cardClassName: 'bg-white border-slate-200',
    accentColor: '#2563eb',
    shouldCelebrate: false,
  },
  9: {
    grade: 9,
    label: 'Grade 9 Academy',
    stage: 'academy',
    visualStyle: 'premium junior secondary platform, focused and mature',
    languageTone: 'precise, independent, exam-ready',
    diagramStyle: 'professional scientific diagrams, graphs, circuits, maps and case evidence',
    rewardStyle: 'league promotions, skill badges, certificates, analytics',
    questionFormats: ['mcq', 'image-mcq', 'diagram-label', 'graph-interpretation', 'data-analysis', 'case-study'],
    diagramPrompts: SUBJECT_DIAGRAMS,
    timeMultiplier: 0.9,
    allowedPowerUps: ['fifty_fifty', 'time_freeze', 'hint', 'shield'],
    cardClassName: 'bg-slate-950 border-slate-700 text-white',
    accentColor: '#6366f1',
    shouldCelebrate: false,
  },
}

export function getDuelGradeBand(level?: number | null, className?: string | null): DuelGradeBand {
  const nameMatch = className?.match(/\b(?:grade|class|g)\s*(6|7|8|9)\b/i)
  const parsed = nameMatch ? Number(nameMatch[1]) : Number(level)
  if (parsed === 6 || parsed === 7 || parsed === 8 || parsed === 9) return parsed
  if (parsed && parsed < 7) return 6
  if (parsed && parsed > 9) return 9
  return 8
}

export function getAdaptiveDuelProfile(level?: number | null, className?: string | null) {
  return DUEL_ADAPTIVE_PROFILES[getDuelGradeBand(level, className)]
}

export function getAdaptiveTime(baseSeconds: number, profile: DuelAdaptiveProfile) {
  return Math.max(8, Math.round(baseSeconds * profile.timeMultiplier))
}

export function getAdaptivePowerUps(basePowerUps: PowerUp[], profile: DuelAdaptiveProfile) {
  return basePowerUps.filter(powerUp => profile.allowedPowerUps.includes(powerUp))
}

export function getDiagramSuggestions(subject?: string, profile?: DuelAdaptiveProfile) {
  const normalized = (subject || '').toLowerCase()
  const key = Object.keys(SUBJECT_DIAGRAMS).find(name => normalized.includes(name))
  const suggestions = key ? SUBJECT_DIAGRAMS[key] : ['diagram', 'chart', 'map', 'table']
  if (!profile) return suggestions
  if (profile.grade <= 7) return suggestions.slice(0, 3)
  return suggestions
}

export function adaptDuelQuestions(questions: Question[], profile: DuelAdaptiveProfile): QuestionWithAdaptiveMeta[] {
  return questions.map((question, index) => {
    const preferredFormat = profile.questionFormats[index % profile.questionFormats.length]
    const cognitiveLoad: DuelAdaptiveQuestionMeta['cognitiveLoad'] =
      profile.grade === 6 ? 'supported' :
      profile.grade === 7 ? 'reasoning' :
      profile.grade === 8 ? 'analysis' :
      'case-study'

    return {
      ...question,
      adaptive: {
        grade: profile.grade,
        visualStyle: profile.visualStyle,
        languageTone: profile.languageTone,
        diagramStyle: profile.diagramStyle,
        rewardStyle: profile.rewardStyle,
        questionFormats: profile.questionFormats,
        recommendedFormat: preferredFormat,
        diagramSuggestions: getDiagramSuggestions(question.subject, profile),
        cognitiveLoad,
      },
    }
  })
}

export function getProfileFromQuestion(question?: QuestionWithAdaptiveMeta) {
  const grade = question?.adaptive?.grade
  return DUEL_ADAPTIVE_PROFILES[grade || 8]
}
