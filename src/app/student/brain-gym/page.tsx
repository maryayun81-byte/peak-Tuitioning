'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Flame, Trophy, Play, CheckCircle2, XCircle, ChevronRight, Star, RotateCcw, Zap, BookOpen, TimerOff, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'
import { generateBrainGymQuestions, submitBrainGymScore, getBrainGymStreak, getStudentRegisteredSubjects, markBrainGymEssay } from '@/app/actions/brainGym'
import { KCSE_844_SET_BOOKS } from '@/lib/brainGym/setBooks'
import { sendPushNotification } from '@/app/actions/push'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

const SESSION_KEY = 'brain_gym_session'
const SEEN_KEY = 'brain_gym_seen_fingerprints'
const MAX_SEEN = 200
const ABANDON_TIMEOUT_MS = 10 * 60 * 1000

function loadSeenFingerprints(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSeenFingerprints(fps: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(fps.slice(-MAX_SEEN))) } catch {}
}

type Question = {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  subject?: string
  topic?: string
  subtopic?: string
  difficulty?: string
  examStandard?: string
  answerMode?: 'mcq' | 'essay'
  excerpt?: string
  sourceText?: string
  essayPrompt?: string
  markingRubric?: string[]
  maxMarks?: number
  visualScene?: {
    sceneType?: string
    background?: string
    style?: string
    objects?: string[]
    diagram?: string
    interactionType?: string
    workingTools?: string[]
    visualPrompt?: string
  }
  adaptive?: {
    profileLabel: string
    visualStyle: string
    languageTone: string
    questionDemand: string
    rewardTone: string
    accentColor: string
    cardClassName: string
  }
}

type VisualScene = NonNullable<Question['visualScene']>

type SavedSession = {
  questions: Question[]
  currentQIndex: number
  score: number
  answers: Record<number, string>
  startedAt: number
  studentId: string
  sessionKey?: string
}

type TrainingMode =
  | 'mixed'
  | 'setbook'
  | 'excerpt'
  | 'essay'
  | 'poetry'
  | 'ushairi'
  | 'biology_essay'
  | 'structured'
  | 'character_analysis'
  | 'theme_analysis'
  | 'style_analysis'
  | 'context_questions'
  | 'character_relationships'
  | 'plot_revision'
  | 'timed_mock'
  | 'kcse_prediction'
  | 'random_challenge'

const TRAINING_MODES: { id: TrainingMode; label: string; subjects?: RegExp; description: string }[] = [
  { id: 'mixed', label: 'Master Mix', description: 'Balanced mastery workout' },
  { id: 'structured', label: 'Structured Answers', description: 'Explain, calculate and reason' },
  { id: 'setbook', label: 'Set Books', subjects: /english|kiswahili|literature/i, description: 'KCSE text mastery' },
  { id: 'excerpt', label: 'Excerpts', subjects: /english|kiswahili|literature/i, description: 'Context and evidence' },
  { id: 'essay', label: 'Essays', subjects: /english|kiswahili|literature/i, description: 'Write and get marked' },
  { id: 'poetry', label: 'Poems', subjects: /english|literature/i, description: 'Poetry close reading' },
  { id: 'ushairi', label: 'Ushairi', subjects: /kiswahili/i, description: 'Shairi analysis' },
  { id: 'biology_essay', label: 'Biology Essays', subjects: /biology/i, description: 'KCSE structured essays' },
  { id: 'character_analysis', label: 'Characters', subjects: /english|kiswahili|literature/i, description: 'Traits and growth' },
  { id: 'theme_analysis', label: 'Themes', subjects: /english|kiswahili|literature/i, description: 'Themes with evidence' },
  { id: 'style_analysis', label: 'Style', subjects: /english|kiswahili|literature/i, description: 'Devices and effect' },
  { id: 'context_questions', label: 'Context', subjects: /english|kiswahili|literature/i, description: 'Before and after' },
  { id: 'character_relationships', label: 'Relationships', subjects: /english|kiswahili|literature/i, description: 'Conflict and ties' },
  { id: 'plot_revision', label: 'Plot', subjects: /english|kiswahili|literature/i, description: 'Sequence and meaning' },
  { id: 'timed_mock', label: 'Timed Mock', subjects: /english|kiswahili|literature/i, description: 'KCSE paper feel' },
  { id: 'kcse_prediction', label: 'Prediction', subjects: /english|kiswahili|literature/i, description: 'Likely examiner angles' },
  { id: 'random_challenge', label: 'Challenge', subjects: /english|kiswahili|literature/i, description: 'Mixed examiner test' },
]

function subjectIsCbcLike(value: string) {
  return /cbc|kpsea|kjsea|integrated science|science\s*&\s*technology|pre-technical|agriculture\s*&\s*nutrition|social studies|grade\s*[6-9]/i.test(value)
}

function visualSceneFitsQuestion(question: Question, scene?: VisualScene) {
  if (!scene) return false
  const subject = `${question.subject || ''}`.toLowerCase()
  const sceneText = `${scene.sceneType || ''} ${scene.background || ''} ${scene.diagram || ''} ${(scene.objects || []).join(' ')} ${scene.visualPrompt || ''}`.toLowerCase()
  const questionText = `${question.topic || ''} ${question.subtopic || ''} ${question.question || ''} ${question.excerpt || ''}`.toLowerCase()

  if (/math/.test(subject) && /(physics|laboratory|lab|beaker|microscope|circuit|chemistry|biology)/.test(sceneText)) return false
  if (/(science|chemistry|biology|physics)/.test(subject) && /(library|storybook|fasihi|darasa|map room|workshop)/.test(sceneText)) return false
  if (/kiswahili/.test(subject) && /(physics|laboratory|graph paper|calculator|science)/.test(sceneText)) return false
  if (/english/.test(subject) && /(physics|laboratory|calculator|circuit)/.test(sceneText)) return false
  if (/social/.test(subject) && /(physics|laboratory|calculator|circuit|microscope)/.test(sceneText)) return false

  if (/circle|radius|diameter|chord|circumference/.test(questionText) && /speed|velocity|acceleration|car|motion/.test(sceneText)) return false
  if (/speed|velocity|acceleration|distance|time/.test(questionText) && /circle|radius|diameter|chord/.test(sceneText)) return false

  return true
}

function extractGroupedTable(text: string) {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*:\s*(\d+)/g)]
  if (matches.length < 3) return null
  return matches.map(match => ({
    interval: `${match[1]}-${match[2]}`,
    frequency: match[3],
    midpoint: ((Number(match[1]) + Number(match[2])) / 2).toFixed(1).replace(/\.0$/, ''),
  }))
}

function buildWorkoutSteps(explanation: string) {
  const clean = explanation.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const parts = clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(part => part.trim())
    .filter(Boolean)

  if (parts.length <= 1) {
    return clean
      .split(/\s*(?:;|,\s*(?=(?:then|therefore|hence|so|which)\b))/i)
      .map(part => part.trim())
      .filter(Boolean)
  }

  return parts.slice(0, 5)
}

function getClientVisualEnvironment(question: Question, selectedContext: string): VisualScene {
  const subject = `${question.subject || ''} ${selectedContext}`.toLowerCase()
  const topic = `${question.topic || ''} ${question.subtopic || ''}`.toLowerCase()
  const gradeStyle = /grade\s*6/i.test(selectedContext)
    ? 'Grade 6 colourful guided illustration with big friendly icons'
    : /grade\s*7/i.test(selectedContext)
      ? 'Grade 7 educational textbook style with clear labelled visuals'
      : /grade\s*9/i.test(selectedContext)
        ? 'Grade 9 professional clean academy style, not childish'
        : 'Grade 8 semi-realistic modern classroom style'

  if (/math/.test(subject)) {
    const qText = topic + question.question.toLowerCase()
    const isCircle = /circle|radius|diameter|chord|circumference/.test(qText)
    const isGraph = /graph|statistics|data|histogram|bar|line|coordinate|transformation|geometry|angle|triangle|measurement|speed|distance|area|circle/.test(qText)
    return {
      sceneType: 'Mathematics Smart Classroom',
      background: isGraph ? 'Interactive graph paper beside a clean blackboard' : 'Clean blackboard with a working area',
      style: gradeStyle,
      objects: isCircle ? ['graph paper', 'compass', 'ruler', 'protractor', 'formula card'] : isGraph ? ['coordinate grid', 'ruler', 'protractor', 'calculator', 'chalk arrows'] : ['blackboard', 'mathematical notebook', 'calculator', 'chalk', 'formula card'],
      diagram: isCircle ? 'circle diagram with radius, chord and diameter labels' : isGraph ? 'coordinate grid, graph paper or labelled measurement sketch' : 'formula board and step-by-step working space',
      interactionType: question.answerMode === 'essay' ? 'short-working' : 'mcq',
      workingTools: ['formula helper', 'working area', 'answer box', 'unit reminder'],
      visualPrompt: `On the board, display the ${question.topic || 'Mathematics'} challenge with clear labels, values and a working area.\n\n${question.excerpt || question.question}`,
    }
  }

  if (/integrated science|science|technology|chemistry|biology|physics/.test(subject)) {
    return {
      sceneType: 'Integrated Science Laboratory',
      background: 'Laboratory bench with an investigation board',
      style: gradeStyle,
      objects: ['microscope', 'plant specimen', 'circuit board', 'beaker', 'safety goggles'],
      diagram: /circuit|current|voltage/.test(topic + question.question.toLowerCase()) ? 'labelled circuit diagram' : 'apparatus sketch or investigation table',
      interactionType: 'mcq',
      workingTools: ['observation table', 'formula helper', 'safety clue', 'answer box'],
      visualPrompt: `Set up a CBC science scene. Show the apparatus/data clearly, then let the learner answer from evidence.\n\n${question.excerpt || question.question}`,
    }
  }

  if (/social studies/.test(subject)) {
    return {
      sceneType: 'Kenya Map Room',
      background: 'Kenya map wall with chart board',
      style: gradeStyle,
      objects: ['Kenya map', 'globe', 'timeline strip', 'weather chart', 'population graph'],
      diagram: 'map, timeline or data chart',
      interactionType: 'mcq',
      workingTools: ['map key', 'evidence notes', 'answer box'],
      visualPrompt: `Display the Social Studies question as a map/chart evidence task with labels and a key.\n\n${question.excerpt || question.question}`,
    }
  }

  if (/kiswahili/.test(subject)) {
    return {
      sceneType: 'Darasa la Kiswahili',
      background: 'Ubao wa fasihi na msamiati',
      style: gradeStyle,
      objects: ['ubao', 'daftari', 'kadi za msamiati', 'shairi board', 'wahusika cards'],
      diagram: 'matini, mazungumzo au shairi kwenye ubao',
      interactionType: question.answerMode === 'essay' ? 'short-working' : 'mcq',
      workingTools: ['kidokezo cha msamiati', 'ushahidi wa matini', 'nafasi ya jibu'],
      visualPrompt: `Onyesha swali hili kwenye ubao wa darasa la Kiswahili likiwa na vidokezo vya matini na nafasi ya jibu.\n\n${question.excerpt || question.question}`,
    }
  }

  if (/english|literacy/.test(subject)) {
    return {
      sceneType: 'Library Reading Corner',
      background: 'Reading table with a notice board',
      style: gradeStyle,
      objects: ['storybook', 'newspaper', 'school magazine', 'dictionary', 'notice board'],
      diagram: 'reading extract board',
      interactionType: question.answerMode === 'essay' ? 'short-working' : 'mcq',
      workingTools: ['vocabulary clue', 'evidence notes', 'answer box'],
      visualPrompt: `Display the English task as a reading-corner board with the text evidence and answer area.\n\n${question.excerpt || question.question}`,
    }
  }

  if (/pre-technical|technical/.test(subject)) {
    return {
      sceneType: 'Pre-Technical Workshop',
      background: 'Workshop bench and engineering drawing board',
      style: gradeStyle,
      objects: ['measuring tape', 'ruler', 'spanner', 'safety sign', 'drawing board'],
      diagram: 'tool sketch, safety layout or measurement drawing',
      interactionType: 'mcq',
      workingTools: ['measurement helper', 'safety clue', 'answer box'],
      visualPrompt: `Render this as a workshop challenge with labelled tools, safety clues and an answer box.\n\n${question.excerpt || question.question}`,
    }
  }

  return {
    sceneType: 'CBC Interactive Learning Studio',
    background: 'Smart classroom board with labelled visual clues',
    style: gradeStyle,
    objects: ['smart board', 'notebook', 'label cards', 'teacher pointer'],
    diagram: 'labelled learning scene',
    interactionType: question.answerMode === 'essay' ? 'short-working' : 'mcq',
    workingTools: ['thinking clue', 'working area', 'answer box'],
    visualPrompt: `Turn this CBC question into a practical scene with labelled clues and a visible answer area.\n\n${question.excerpt || question.question}`,
  }
}

function saveSession(data: SavedSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch {}
}

function SceneIllustration({ scene, accentColor }: { scene: VisualScene; accentColor: string }) {
  const text = `${scene.sceneType || ''} ${scene.background || ''} ${scene.diagram || ''} ${scene.visualPrompt || ''}`.toLowerCase()
  const isMath = /math|graph|coordinate|measurement|speed|velocity|acceleration|geometry|circle|radius|diameter|chord|circumference/.test(text)
  const isCircle = /circle|radius|diameter|chord|circumference/.test(text)
  const isMotion = /speed|velocity|acceleration|car|motion/.test(text)
  const isStats = /statistics|histogram|bar graph|data handling|frequency|table/.test(text)
  const isScience = /science|laboratory|lab|circuit|microscope|apparatus|beaker/.test(text)
  const isMap = /map|kenya|globe|social|weather|population|timeline/.test(text)
  const isLanguage = /library|reading|english|kiswahili|darasa|ubao|fasihi|shairi|storybook/.test(text)
  const isWorkshop = /workshop|technical|tool|safety|drawing board|engineering/.test(text)
  const boardBg = /grade 6/i.test(scene.style || '')
    ? 'linear-gradient(135deg, #0f766e, #0369a1)'
    : 'linear-gradient(135deg, #0f172a, #1e293b)'

  return (
    <div className="relative min-h-[230px] overflow-hidden rounded-2xl border" style={{ borderColor: `${accentColor}66`, background: 'linear-gradient(135deg, rgba(226,232,240,0.92), rgba(248,250,252,0.98))' }}>
      <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(180deg, rgba(148,163,184,0.18), rgba(100,116,139,0.35))' }} />
      <div className="absolute left-4 top-4 right-4 bottom-10 rounded-xl border-4 shadow-2xl" style={{ borderColor: '#7c2d12', background: boardBg }}>
        <div className="absolute inset-3 rounded-lg border border-white/10" />
        <div className="absolute left-4 top-3 text-[10px] font-black uppercase tracking-widest text-slate-200">{scene.background || scene.sceneType}</div>

        {isMath && (
          <div className="absolute inset-8 top-9 rounded-lg bg-white/95 p-3 shadow-inner">
            <div className="absolute inset-3 opacity-50" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            {isCircle ? (
              <>
                <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-4" style={{ borderColor: accentColor }} />
                <div className="absolute left-1/2 top-1/2 h-0.5 w-16 origin-left" style={{ background: accentColor }} />
                <div className="absolute left-[calc(50%-50px)] top-[calc(50%+30px)] h-0.5 w-24 -rotate-12 bg-rose-500" />
                <div className="absolute left-[calc(50%+12px)] top-[calc(50%-13px)] text-[10px] font-black text-slate-700">r = 6 cm</div>
                <div className="absolute left-[calc(50%-62px)] top-[calc(50%+45px)] text-[10px] font-black text-rose-600">chord = 8 cm</div>
                <div className="absolute bottom-3 left-8 text-[10px] font-black text-slate-700">diameter = 2 x radius</div>
              </>
            ) : isStats ? (
              <>
                <div className="absolute bottom-8 left-8 right-8 h-0.5 bg-slate-800" />
                <div className="absolute bottom-8 left-8 top-8 w-0.5 bg-slate-800" />
                {[44, 82, 120, 158].map((left, index) => (
                  <div key={left} className="absolute bottom-8 w-8 rounded-t" style={{ left, height: 34 + index * 18, background: index % 2 ? accentColor : '#38bdf8' }} />
                ))}
                <div className="absolute bottom-3 left-9 text-[10px] font-black text-slate-700">data categories</div>
              </>
            ) : (
              <>
                <div className="absolute bottom-8 left-8 right-8 h-0.5 bg-slate-800" />
                <div className="absolute bottom-8 left-8 top-8 w-0.5 bg-slate-800" />
                <div className="absolute bottom-8 left-8 h-24 w-44 border-l-0 border-b-0" style={{ clipPath: isMotion ? 'polygon(0 100%, 100% 10%, 100% 18%, 0 100%)' : 'polygon(0 70%, 35% 25%, 70% 72%, 100% 36%, 100% 43%, 70% 80%, 35% 33%, 0 78%)', background: accentColor }} />
                <div className="absolute bottom-3 left-9 text-[10px] font-black text-slate-700">{isMotion ? 'time' : 'x-axis'}</div>
                <div className="absolute left-2 top-8 rotate-[-90deg] text-[10px] font-black text-slate-700">{isMotion ? 'velocity' : 'y-axis'}</div>
                {isMotion && (
                  <div className="absolute bottom-9 left-10 h-4 w-8 rounded-sm bg-rose-500 shadow-md">
                    <div className="absolute -top-2 left-1 h-2 w-5 rounded-t bg-rose-300" />
                    <div className="absolute -bottom-1 left-1 h-2 w-2 rounded-full bg-slate-800" />
                    <div className="absolute -bottom-1 right-1 h-2 w-2 rounded-full bg-slate-800" />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {isScience && !isMath && (
          <div className="absolute inset-x-8 bottom-8 top-12">
            <div className="absolute bottom-0 left-0 right-0 h-10 rounded bg-amber-800" />
            <div className="absolute bottom-10 left-7 h-20 w-14 rounded-b-xl border-4 border-cyan-200 bg-cyan-300/40" />
            <div className="absolute bottom-10 left-28 h-20 w-28 rounded-xl border border-white/30 bg-slate-900">
              <div className="absolute left-4 top-8 h-1 w-20 bg-yellow-300" />
              <div className="absolute left-4 top-8 h-8 w-1 bg-yellow-300" />
              <div className="absolute right-4 top-8 h-8 w-1 bg-yellow-300" />
            </div>
            <div className="absolute bottom-10 right-10 h-24 w-16 rounded-t-full border-4 border-slate-200">
              <div className="mx-auto mt-5 h-10 w-5 rounded bg-slate-200" />
            </div>
          </div>
        )}

        {isMap && !isMath && !isScience && (
          <div className="absolute inset-8 top-11 rounded-lg bg-emerald-50 p-4">
            <div className="absolute left-12 top-8 h-28 w-24 rotate-12 rounded-[45%] border-4 border-emerald-600 bg-emerald-200" />
            <div className="absolute left-28 top-16 h-16 w-12 rounded-[45%] border-4 border-emerald-600 bg-emerald-200" />
            <div className="absolute right-8 top-8 h-20 w-28 rounded-lg bg-white shadow">
              <div className="m-3 h-3 w-20 rounded bg-sky-400" />
              <div className="mx-3 h-3 w-14 rounded bg-amber-400" />
              <div className="mx-3 mt-2 h-3 w-24 rounded bg-rose-400" />
            </div>
          </div>
        )}

        {isLanguage && !isMath && !isScience && !isMap && (
          <div className="absolute inset-8 top-11 grid grid-cols-[1fr_120px] gap-4">
            <div className="rounded-lg bg-amber-50 p-4 shadow-inner">
              <div className="mb-2 h-2 w-3/4 rounded bg-slate-500" />
              <div className="mb-2 h-2 w-5/6 rounded bg-slate-400" />
              <div className="mb-2 h-2 w-2/3 rounded bg-slate-400" />
              <div className="h-2 w-4/5 rounded bg-slate-400" />
            </div>
            <div className="relative rounded-lg bg-orange-100 shadow">
              <div className="absolute left-7 top-8 h-24 w-14 rounded bg-orange-500" />
              <div className="absolute left-10 top-6 h-24 w-14 rounded bg-sky-500" />
              <div className="absolute left-4 top-12 h-24 w-14 rounded bg-emerald-500" />
            </div>
          </div>
        )}

        {isWorkshop && !isMath && !isScience && !isMap && !isLanguage && (
          <div className="absolute inset-8 top-11 rounded-lg bg-stone-100 p-4">
            <div className="absolute left-8 top-10 h-24 w-36 rounded border-2 border-slate-500 bg-white">
              <div className="absolute left-4 top-5 h-14 w-20 rotate-12 border-2 border-blue-500" />
              <div className="absolute left-8 bottom-5 h-1 w-24 bg-blue-500" />
            </div>
            <div className="absolute right-8 top-14 h-4 w-28 rotate-45 rounded bg-slate-700" />
            <div className="absolute right-16 bottom-12 h-12 w-12 rounded-full border-8 border-amber-500" />
          </div>
        )}
      </div>
      <div className="absolute bottom-4 left-1/2 h-2 w-48 -translate-x-1/2 rounded bg-amber-900" />
    </div>
  )
}

function VisualSceneCard({ scene, accentColor }: { scene: VisualScene; accentColor?: string }) {
  const accent = accentColor || '#2563eb'
  const groupedTable = extractGroupedTable(scene.visualPrompt || '')
  const toolChips = (scene.workingTools || []).slice(0, 3).filter(Boolean)

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border text-left" style={{ borderColor: `${accent}55`, background: 'var(--card)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--card-border)', background: `${accent}12` }}>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
            Learning scene
          </div>
          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>
            {scene.sceneType || 'CBC Visual Classroom'}
          </div>
        </div>
        {scene.style && (
          <span className="rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest" style={{ background: `${accent}18`, color: accent }}>
            {scene.style}
          </span>
        )}
      </div>
      <div className="p-4 pb-0">
        <SceneIllustration scene={scene} accentColor={accent} />
      </div>
      {groupedTable && (
        <div className="m-4 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--card-border)' }}>
          <div className="grid grid-cols-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest" style={{ background: `${accent}18`, color: accent }}>
            <span>Class interval</span>
            <span>Frequency</span>
            <span>Midpoint</span>
          </div>
          {groupedTable.map(row => (
            <div key={row.interval} className="grid grid-cols-3 px-3 py-2 text-xs font-bold" style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text)' }}>
              <span>{row.interval}</span>
              <span>{row.frequency}</span>
              <span>{row.midpoint}</span>
            </div>
          ))}
        </div>
      )}
      {toolChips.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {toolChips.map(chip => (
            <span key={chip} className="rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider" style={{ background: `${accent}14`, color: accent }}>
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function CoachWorkout({ explanation, correct, accentColor }: { explanation: string; correct: boolean; accentColor?: string }) {
  const accent = accentColor || '#0ea5e9'
  const steps = buildWorkoutSteps(explanation)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="mt-6 overflow-hidden rounded-2xl border text-left" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--card-border)', background: correct ? 'rgba(16,185,129,0.10)' : 'rgba(249,115,22,0.10)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: correct ? '#10B981' : '#f97316' }}>
          {correct ? 'Mastery workout' : 'Fix-it workout'}
        </div>
        <div className="mt-1 text-sm font-black" style={{ color: 'var(--text)' }}>
          {correct ? 'Strong answer. Here is the method to lock it in.' : 'This is how to rebuild the idea step by step.'}
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        {steps.length > 0 ? steps.map((step, index) => (
          <div key={`${index}-${step}`} className="flex gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--card-border)', background: 'var(--input)' }}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: accent }}>
              {index + 1}
            </div>
            <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>{step}</p>
          </div>
        )) : (
          <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>{explanation}</p>
        )}
      </div>
    </motion.div>
  )
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedSession
  } catch { return null }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

function buildSessionKey(studentId: string | undefined, subjects: string[], mode: TrainingMode, setBook: string) {
  return [
    studentId || 'guest',
    subjects.slice().sort().join('|') || 'none',
    mode,
    setBook || 'none',
  ].join('::')
}

export default function DailyBrainGym() {
  const { student } = useAuthStore()
  const [streakData, setStreakData] = useState<{ current_streak: number; highest_streak: number; last_played_date: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [gameState, setGameState] = useState<'idle' | 'resuming' | 'playing' | 'completed'>('idle')
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [essayDraft, setEssayDraft] = useState('')
  const [essayFeedback, setEssayFeedback] = useState<any>(null)
  const [markingEssay, setMarkingEssay] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null)
  const [allSubjects, setAllSubjects] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('mixed')
  const [selectedSetBook, setSelectedSetBook] = useState('')
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!student?.id) return
    Promise.all([
      getBrainGymStreak(student.id),
      getStudentRegisteredSubjects(student.id)
    ]).then(([streak, subjects]) => {
      setStreakData(streak)
      setAllSubjects(subjects)
      setSelectedSubjects(subjects.slice(0, 1))
      const saved = loadSession()
      const defaultSessionKey = buildSessionKey(student.id, subjects.slice(0, 1), 'mixed', '')
      if (saved && saved.studentId === student.id && saved.sessionKey === defaultSessionKey && saved.questions?.length > 0) {
        setSavedSession(saved)
        setGameState('resuming')
      } else if (saved && (!saved.sessionKey || saved.studentId !== student.id || saved.sessionKey !== defaultSessionKey)) {
        clearSession()
      }
      setLoading(false)
    })
  }, [student?.id])

  useEffect(() => {
    if (gameState !== 'playing' || !student?.id || questions.length === 0) return
    const session: SavedSession = {
      questions,
      currentQIndex,
      score,
      answers,
      startedAt: Date.now(),
      studentId: student.id,
      sessionKey: buildSessionKey(student.id, selectedSubjects, trainingMode, selectedSetBook),
    }
    saveSession(session)
  }, [currentQIndex, score, answers, gameState, questions, student?.id, selectedSubjects, trainingMode, selectedSetBook])

  useEffect(() => {
    const isAvailable = TRAINING_MODES.some(mode => {
      if (mode.id !== trainingMode) return false
      if (!mode.subjects || selectedSubjects.length === 0) return true
      return selectedSubjects.some(subject => mode.subjects!.test(subject))
    })
    if (!isAvailable) setTrainingMode('mixed')
  }, [selectedSubjects, trainingMode])

  useEffect(() => {
    if (!selectedSetBook) return
    const subjectText = selectedSubjects.map(subject => subject.toLowerCase()).join(' ')
    const stillAvailable = KCSE_844_SET_BOOKS.some(book => {
      if (book.title !== selectedSetBook) return false
      if (book.subject === 'English') return /english|literature/.test(subjectText)
      if (book.subject === 'Kiswahili') return /kiswahili/.test(subjectText)
      return false
    })
    if (!stillAvailable) setSelectedSetBook('')
  }, [selectedSubjects, selectedSetBook])

  const scheduleAbandonReminder = useCallback(() => {
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current)
    abandonTimerRef.current = setTimeout(async () => {
      toast('Your Brain Gym session is waiting! Come back and finish your workout to keep your streak alive! ??', {
        duration: 8000, icon: '??',
      })
      if (student?.id) {
        try {
          await sendPushNotification([student.id], {
            title: '?? Your Brain Gym session is waiting!',
            body: 'You left your daily workout halfway. Come back and keep your streak alive!',
            href: '/student/brain-gym',
            tag: 'brain-gym-abandon',
          })
        } catch {}
      }
    }, ABANDON_TIMEOUT_MS)
  }, [student?.id])

  const cancelAbandonReminder = useCallback(() => {
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current)
  }, [])

  useEffect(() => {
    if (gameState === 'playing') {
      scheduleAbandonReminder()
    } else {
      cancelAbandonReminder()
    }
    return () => { cancelAbandonReminder() }
  }, [gameState, scheduleAbandonReminder, cancelAbandonReminder])

  useEffect(() => {
    if (gameState !== 'playing') return
    const onVisibility = () => {
      if (document.hidden) { scheduleAbandonReminder() }
      else { cancelAbandonReminder() }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [gameState, scheduleAbandonReminder, cancelAbandonReminder])

  const resetAbandonTimer = useCallback(() => {
    if (gameState === 'playing') scheduleAbandonReminder()
  }, [gameState, scheduleAbandonReminder])

  const startGame = async (subjects?: string[]) => {
    clearSession()
    setSavedSession(null)
    setLoadingQuestions(true)
    setQuestions([])
    setCurrentQIndex(0)
    setScore(0)
    setAnswers({})
    setSelectedAnswer(null)
    setIsAnswered(false)
    setEssayDraft('')
    setEssayFeedback(null)
    try {
      const seen = loadSeenFingerprints()
      const q = await generateBrainGymQuestions(student?.id, 'brain_gym', subjects, seen, {
        trainingMode,
        selectedSetBook: getSelectedSetBookForRequest(),
      })
      setQuestions(q)
      const newFps = q.map(qq => {
        const text = (qq as any).question || ''
        return text.toLowerCase().replace(/\s+/g, '').slice(0, 120)
      }).filter(Boolean)
      saveSeenFingerprints([...seen, ...newFps])
      setGameState('playing')
      setCurrentQIndex(0)
      setScore(0)
      setAnswers({})
      setSelectedAnswer(null)
      setIsAnswered(false)
      setEssayDraft('')
      setEssayFeedback(null)
    } catch {
      toast.error('Failed to load questions. Please try again.')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const currentQuestion = questions[currentQIndex]
  const adaptive = currentQuestion?.adaptive
  const isEssayQuestion = currentQuestion?.answerMode === 'essay'
  const currentIsCorrect = Boolean(currentQuestion && answers[currentQIndex] === currentQuestion.correctAnswer)
  const writingPromptLabel = currentQuestion?.subject === 'Kiswahili'
    ? 'Maswali'
    : /poetry|poem/i.test(`${currentQuestion?.topic || ''} ${currentQuestion?.subtopic || ''}`)
      ? 'Questions'
      : 'Writing Task'
  const rubricLabel = currentQuestion?.subject === 'Kiswahili'
    ? 'Mgawanyo wa Alama'
    : 'KCSE Marking Criteria'
  const essayWordCount = essayDraft.trim().split(/\s+/).filter(Boolean).length
  const essayMinWords = currentQuestion?.maxMarks && currentQuestion.maxMarks >= 20 ? 120 : 60
  const selectedSubjectLabel = selectedSubjects.length === allSubjects.length
    ? 'Mixed session'
    : selectedSubjects.join(', ')
  const selectedSubjectText = selectedSubjects.join(' ')
  const allSubjectText = allSubjects.join(' ')
  const isCbcSelection = /cbc|kpsea|kjsea|grade\s*[1-9]|integrated science|science & technology|pre-technical|agriculture & nutrition|social studies/i.test(selectedSubjectText || allSubjectText)
  const currentIsCbcLike = Boolean(currentQuestion) && (
    isCbcSelection ||
    currentQuestion.examStandard === 'cbc_standard' ||
    subjectIsCbcLike(`${currentQuestion.subject || ''} ${currentQuestion.topic || ''}`)
  )
  const currentVisualScene = currentQuestion
    ? (visualSceneFitsQuestion(currentQuestion, currentQuestion.visualScene)
        ? currentQuestion.visualScene
        : (currentIsCbcLike ? getClientVisualEnvironment(currentQuestion, `${selectedSubjectText} ${allSubjectText} ${adaptive?.profileLabel || ''}`) : undefined))
    : undefined
  const hasKcseLanguageSelection = /^(?=.*(?:english|kiswahili|literature))(?!.*cbc).*/i.test(selectedSubjectText)
  const languageLaneIds: TrainingMode[] = [
    'setbook',
    'excerpt',
    'essay',
    'poetry',
    'ushairi',
    'character_analysis',
    'theme_analysis',
    'style_analysis',
    'context_questions',
    'character_relationships',
    'plot_revision',
    'timed_mock',
    'kcse_prediction',
    'random_challenge',
  ]
  const availableTrainingModes = TRAINING_MODES.filter(mode => {
    if (languageLaneIds.includes(mode.id)) return true
    if (!mode.subjects || selectedSubjects.length === 0) return true
    return selectedSubjects.some(subject => mode.subjects!.test(subject))
  })
  const coreTrainingModes = TRAINING_MODES.filter(mode =>
    ['mixed', 'structured'].includes(mode.id) ||
    (mode.id === 'biology_essay' && !isCbcSelection && /biology/i.test(selectedSubjectText))
  )
  const poetryStudios = TRAINING_MODES.filter(mode =>
    !isCbcSelection && ['poetry', 'ushairi'].includes(mode.id)
  )
  const setBookPracticeModes = TRAINING_MODES.filter(mode =>
    ['excerpt', 'essay', 'character_analysis', 'theme_analysis', 'style_analysis', 'context_questions', 'character_relationships', 'plot_revision', 'timed_mock'].includes(mode.id)
  )
  const setBookSubjects = selectedSubjects.map(subject => subject.toLowerCase()).join(' ')
  const availableSetBooks = KCSE_844_SET_BOOKS.filter(book => {
    if (isCbcSelection || !hasKcseLanguageSelection) return false
    if (!/english|kiswahili|literature/.test(setBookSubjects)) return true
    if (book.subject === 'English') return /english|literature/.test(setBookSubjects)
    if (book.subject === 'Kiswahili') return /kiswahili/.test(setBookSubjects)
    return false
  })
  const selectedBook = KCSE_844_SET_BOOKS.find(item => item.title === selectedSetBook)
  const usesSetBookLane = Boolean(selectedSetBook) && setBookPracticeModes.some(mode => mode.id === trainingMode)

  const pickSubjectForBook = (bookSubject: string) => {
    const existing = allSubjects.find(subject => new RegExp(bookSubject, 'i').test(subject))
    return existing || bookSubject
  }

  const activateLanguageLane = (mode: TrainingMode) => {
    if (gameState !== 'playing') {
      clearSession()
      setSavedSession(null)
    }
    setTrainingMode(mode)
    if (mode === 'ushairi') {
      setSelectedSetBook('')
      setSelectedSubjects([pickSubjectForBook('Kiswahili')])
    } else if (mode === 'poetry') {
      setSelectedSetBook('')
      setSelectedSubjects([pickSubjectForBook('English')])
    } else if (!/english|kiswahili|literature/i.test(selectedSubjects.join(' '))) {
      setSelectedSubjects([pickSubjectForBook('English')])
    }
  }

  const selectSetBook = (title: string, subject: string) => {
    if (gameState !== 'playing') {
      clearSession()
      setSavedSession(null)
    }
    setSelectedSetBook(title)
    setTrainingMode('excerpt')
    setSelectedSubjects([pickSubjectForBook(subject)])
  }

  const activateCoreLane = (mode: TrainingMode) => {
    if (gameState !== 'playing') {
      clearSession()
      setSavedSession(null)
    }
    setSelectedSetBook('')
    setTrainingMode(mode)
  }

  const getSessionSubjects = () => {
    if (usesSetBookLane && selectedSetBook) {
      const book = KCSE_844_SET_BOOKS.find(item => item.title === selectedSetBook)
      if (book) return [pickSubjectForBook(book.subject)]
    }

    if (languageLaneIds.includes(trainingMode) && !/english|kiswahili|literature/i.test(selectedSubjects.join(' '))) {
      if (trainingMode === 'ushairi') return [pickSubjectForBook('Kiswahili')]
      return [pickSubjectForBook('English')]
    }

    return selectedSubjects
  }

  const getSelectedSetBookForRequest = () => usesSetBookLane ? selectedSetBook : undefined

  const resumeSession = () => {
    if (!savedSession) return
    setQuestions(savedSession.questions)
    setCurrentQIndex(savedSession.currentQIndex)
    setScore(savedSession.score)
    setAnswers(savedSession.answers)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setEssayDraft('')
    setEssayFeedback(null)
    setGameState('playing')
    setSavedSession(null)
  }

  const discardAndRestart = () => {
    clearSession()
    setSavedSession(null)
    setGameState('idle')
  }

  const handleAnswer = (answer: string) => {
    if (isAnswered) return
    resetAbandonTimer()
    setSelectedAnswer(answer)
    setIsAnswered(true)
    setAnswers(prev => ({ ...prev, [currentQIndex]: answer }))
    const isCorrect = answer === questions[currentQIndex].correctAnswer
    if (isCorrect) {
      setScore(prev => prev + 1)
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#10B981', '#34D399'] })
    }
  }

  const nextQuestion = () => {
    resetAbandonTimer()
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setEssayDraft('')
      setEssayFeedback(null)
    } else {
      finishGame()
    }
  }

  const finishGame = async () => {
    if (!student?.id) return
    cancelAbandonReminder()
    clearSession()
    setGameState('completed')
    try {
      const masterySignals = questions.map((question, index) => {
        const chosen = answers[index]
        const isCorrect = chosen === question.correctAnswer
        const marksAvailable = Math.max(1, question.answerMode === 'essay' ? Math.round((question.maxMarks || 20) / 10) : 1)
        return {
          curriculum: question.examStandard?.includes('cbc') ? 'CBC' : '8-4-4/KCSE',
          subject: question.subject,
          topic: question.topic,
          subtopic: question.subtopic || question.sourceText,
          syllabusOutcome: [question.topic, question.subtopic || question.sourceText].filter(Boolean).join(': '),
          marksAvailable,
          marksEarned: isCorrect ? marksAvailable : 0,
        }
      })
      const result = await submitBrainGymScore(student.id, score, totalQuestions, masterySignals)
      setStreakData(prev => ({
        current_streak: result.streak,
        highest_streak: prev ? Math.max(prev.highest_streak, result.streak) : result.streak,
        last_played_date: new Date().toISOString().split('T')[0],
      }))
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ['#F59E0B', '#EF4444', '#3B82F6', '#10B981'] })
      toast.success(`+50 XP earned! Streak: ${result.streak} days${result.territoryPoints ? ` · +${result.territoryPoints} territory points` : ''}`)
    } catch (e) { console.error(e) }
  }

  const submitEssay = async () => {
    if (!currentQuestion || markingEssay || isAnswered) return
    if (essayWordCount < essayMinWords) {
      toast.error(`Write at least ${essayMinWords} words before submitting.`)
      return
    }
    setMarkingEssay(true)
    try {
      const feedback = await markBrainGymEssay({
        question: currentQuestion.essayPrompt || currentQuestion.question,
        essay: essayDraft,
        subject: currentQuestion.subject,
        rubric: currentQuestion.markingRubric,
        maxMarks: currentQuestion.maxMarks,
      })
      setEssayFeedback(feedback)
      setIsAnswered(true)
      const passed = feedback.percentage >= 50
      setAnswers(prev => ({ ...prev, [currentQIndex]: passed ? currentQuestion.correctAnswer : essayDraft }))
      if (passed) setScore(prev => prev + 1)
      toast.success(`Essay marked: ${feedback.marks}/${feedback.maxMarks} (${feedback.grade})`)
    } catch {
      toast.error('Failed to mark essay. Try again.')
    } finally {
      setMarkingEssay(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  )

  const totalQuestions = questions.length || 10

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto pb-32">
      {gameState !== 'playing' && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent flex items-center gap-3">
              Daily Brain Gym
              <BrainCircuit className="text-rose-500" size={36} />
            </h1>
            <p className="mt-2 text-lg font-bold" style={{ color: 'var(--text-muted)' }}>
              10 unique questions every session � earn XP � build streaks
            </p>
          </div>
          <Card className="px-6 py-4 flex flex-col items-center bg-orange-500/10 border-orange-500/20 shadow-xl shadow-orange-500/10">
            <div className="flex items-center gap-2">
              <Flame className={streakData?.current_streak ? 'text-orange-500' : 'text-gray-400'} size={24} />
              <span className={`text-2xl font-black ${streakData?.current_streak ? 'text-orange-500' : 'text-gray-400'}`}>
                {streakData?.current_streak || 0}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-500/70 mt-1">Day Streak</span>
          </Card>
        </div>
      )}

      <AnimatePresence mode="wait">

        {gameState === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center mt-12">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center mb-8 shadow-2xl shadow-rose-500/20">
              <BrainCircuit className="text-white" size={64} />
            </div>
            <h2 className="text-2xl font-black mb-4" style={{ color: 'var(--text)' }}>Brain Gym</h2>
            <p className="max-w-md mx-auto mb-6 font-bold" style={{ color: 'var(--text-muted)' }}>
              Train anytime with questions from your curriculum. Choose one subject for focused KCSE/CBC drills or use a mixed session.
            </p>

            {allSubjects.length > 0 && (
              <div className="w-full max-w-md mb-8">
                <div className="text-xs font-black text-left mb-3 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                  <BookOpen size={14} /> Subject focus
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => setSelectedSubjects(allSubjects)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedSubjects.length === allSubjects.length
                        ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                        : 'border-transparent bg-[var(--input)] text-[var(--text-muted)]'
                    }`}
                  >
                    Mixed session
                  </button>
                  {allSubjects.map(subject => {
                    const isSelected = selectedSubjects.length === 1 && selectedSubjects[0] === subject
                    return (
                      <button
                        key={subject}
                        onClick={() => setSelectedSubjects([subject])}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                            : 'border-transparent bg-[var(--input)] text-[var(--text-muted)]'
                        }`}
                      >
                        {subject}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="w-full max-w-4xl mb-8 space-y-5 text-left">
              <div>
                <div className="text-xs font-black mb-3 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                  <PenLine size={14} /> Core workout
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {coreTrainingModes.map(mode => {
                    const isSelected = trainingMode === mode.id && !selectedSetBook
                    return (
                      <button
                        key={mode.id}
                        onClick={() => activateCoreLane(mode.id)}
                        className={`min-h-[72px] rounded-2xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                            : 'border-[var(--card-border)] bg-[var(--card)] text-[var(--text)]'
                        }`}
                      >
                        <div className="text-xs font-black">{mode.label}</div>
                        <div className="mt-1 text-[10px] font-semibold" style={{ color: isSelected ? '#f97316' : 'var(--text-muted)' }}>
                          {mode.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {isCbcSelection && (
                <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                  <div className="text-xs font-black mb-2 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                    <Zap size={14} /> CBC visual gym
                  </div>
                  <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    This session uses KPSEA/KJSEA-style blackboard sketches, tables, maps, diagrams, practical scenarios and short reasoning from the registered CBC subjects.
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {['Blackboard working', 'Diagrams and tables', 'Competency reasoning'].map(item => (
                      <div key={item} className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {poetryStudios.length > 0 && (
              <div>
                <div className="text-xs font-black mb-3 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                  <BookOpen size={14} /> Poetry labs
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {poetryStudios.map(mode => {
                    const isSelected = trainingMode === mode.id
                    return (
                      <button
                        key={mode.id}
                        onClick={() => activateLanguageLane(mode.id)}
                        className={`min-h-[78px] rounded-2xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                            : 'border-[var(--card-border)] bg-[var(--card)] text-[var(--text)]'
                        }`}
                      >
                        <div className="text-xs font-black">{mode.label}</div>
                        <div className="mt-1 text-[10px] font-semibold" style={{ color: isSelected ? '#f97316' : 'var(--text-muted)' }}>
                          {mode.id === 'poetry'
                            ? 'Original 3-4 stanza English poem, then KCSE Paper 2 questions'
                            : 'Original 3-4 beti shairi, then vina, mizani, dhamira and mbinu questions'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              )}

              {availableSetBooks.length > 0 && (
                <div>
                  <div className="text-xs font-black mb-3 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                    <BookOpen size={14} /> Set book shelf
                  </div>
                  <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Pick one book first. Then choose the exact drill: excerpt, essay, characters, themes, style, context or mock.
                  </p>
                  <div className="grid gap-2 md:grid-cols-4">
                  {availableSetBooks.map(book => {
                    const isSelected = selectedSetBook === book.title
                    return (
                      <button
                        key={book.title}
                        onClick={() => selectSetBook(book.title, book.subject)}
                        className={`min-h-[82px] rounded-2xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                            : 'border-[var(--card-border)] bg-[var(--card)] text-[var(--text)]'
                        }`}
                      >
                        <div className="text-xs font-black">{book.title}</div>
                        <div className="mt-1 text-[10px] font-semibold" style={{ color: isSelected ? '#f97316' : 'var(--text-muted)' }}>
                          {book.author ? `${book.author} · ` : ''}{book.genre.replace('_', ' ')}
                        </div>
                      </button>
                    )
                  })}
                  </div>

                  {selectedBook && (
                    <div className="mt-4 rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{selectedBook.title}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                            {selectedBook.subject} set book studio
                          </div>
                        </div>
                        <div className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                          Active drill: {TRAINING_MODES.find(mode => mode.id === trainingMode)?.label || 'Excerpt'}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                        {setBookPracticeModes.map(mode => {
                          const isSelected = trainingMode === mode.id
                          return (
                            <button
                              key={mode.id}
                              onClick={() => setTrainingMode(mode.id)}
                              className={`rounded-xl border px-3 py-2 text-left text-[10px] font-black transition-all ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                                  : 'border-[var(--card-border)] bg-[var(--input)] text-[var(--text-muted)]'
                              }`}
                            >
                              {mode.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button size="lg"
              className="rounded-3xl px-12 py-6 text-lg shadow-xl shadow-primary/20 bg-gradient-to-r from-orange-500 to-rose-500 border-none hover:scale-105 transition-transform"
              onClick={() => startGame(getSessionSubjects())} disabled={loadingQuestions || getSessionSubjects().length === 0}>
              {loadingQuestions ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Generating {selectedSubjectLabel} questions...
                </div>
              ) : (
                <div className="flex items-center gap-2"><Play className="fill-current" /> Start Session</div>
              )}
            </Button>
          </motion.div>
        )}

        {gameState === 'resuming' && savedSession && (
          <motion.div key="resuming" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center mt-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/20">
              <Zap className="text-white" size={48} />
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>You left a session unfinished!</h2>
            <p className="max-w-sm mx-auto mb-2 font-bold" style={{ color: 'var(--text-muted)' }}>
              You were on question {savedSession.currentQIndex + 1} of {savedSession.questions.length} with {savedSession.score} correct.
            </p>
            <div className="w-full max-w-xs h-2.5 bg-[var(--input)] rounded-full overflow-hidden mb-8">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                style={{ width: `${(savedSession.currentQIndex / savedSession.questions.length) * 100}%` }} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button size="lg"
                className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 border-none text-white"
                onClick={resumeSession}>
                <RotateCcw size={16} className="mr-2" /> Resume Session
              </Button>
              <Button size="lg" variant="outline" className="flex-1 rounded-2xl" onClick={discardAndRestart}>
                Start Fresh
              </Button>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && questions.length > 0 && (
          <motion.div key="playing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto w-full">
            <div className="mb-6">
              <div className="flex justify-between text-sm font-black mb-2" style={{ color: 'var(--text-muted)' }}>
                <span>Question {currentQIndex + 1} of {totalQuestions}</span>
                <span className="text-emerald-500">{score} correct</span>
              </div>
              <div className="h-3 w-full bg-[var(--input)] rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-orange-400 to-rose-500"
                  animate={{ width: `${(currentQIndex / totalQuestions) * 100}%` }} transition={{ duration: 0.4 }} />
              </div>
              <div className="flex gap-1 mt-2 justify-center flex-wrap">
                {questions.map((q, i) => {
                  const done = i in answers
                  const correct = done && answers[i] === q.correctAnswer
                  return (
                    <div key={i} className="w-2 h-2 rounded-full transition-all" style={{
                      background: i === currentQIndex ? '#F97316' : correct ? '#10B981' : done ? '#EF4444' : 'var(--card-border)',
                      transform: i === currentQIndex ? 'scale(1.5)' : 'scale(1)',
                    }} />
                  )
                })}
              </div>
            </div>

            <Card className={`p-5 md:p-8 relative overflow-hidden shadow-2xl ${isEssayQuestion ? 'text-left' : 'text-center'} ${adaptive?.cardClassName || ''}`}>
              <div className="absolute top-0 left-0 w-full h-1" style={{ background: adaptive?.accentColor || '#f97316' }} />
              {adaptive && (
                <div className="mb-3 text-[10px] font-black uppercase tracking-widest" style={{ color: adaptive.accentColor }}>
                  {adaptive.profileLabel}
                </div>
              )}
              {(currentQuestion.subject || currentQuestion.difficulty) && (
                <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                  {currentQuestion.subject && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                      style={{ background: adaptive ? `${adaptive.accentColor}18` : 'var(--input)', color: adaptive?.accentColor || 'var(--text-muted)' }}>
                      {currentQuestion.subject}
                    </span>
                  )}
                  {currentQuestion.topic && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                      style={{ background: adaptive ? `${adaptive.accentColor}18` : 'var(--input)', color: adaptive?.accentColor || 'var(--text-muted)' }}>
                      {currentQuestion.topic}
                    </span>
                  )}
                  {currentQuestion.difficulty && (
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                      currentQuestion.difficulty === 'easy' ? 'bg-emerald-500/15 text-emerald-500' :
                      currentQuestion.difficulty === 'hard' ? 'bg-rose-500/15 text-rose-500' :
                      'bg-amber-500/15 text-amber-500'}`}>
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>
              )}
              {isEssayQuestion && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border p-3" style={{ background: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.25)' }}>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-orange-500">
                    <PenLine size={14} /> Writing practice
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    <TimerOff size={14} /> No speed timer
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {currentQuestion.maxMarks || 20} marks
                  </span>
                </div>
              )}
              {currentVisualScene && (
                <VisualSceneCard scene={currentVisualScene} accentColor={adaptive?.accentColor} />
              )}
              <h2 className={`${isEssayQuestion ? 'text-lg md:text-xl mb-5' : 'text-xl md:text-2xl mb-8 text-center'} font-black leading-snug`} style={{ color: adaptive?.cardClassName?.includes('slate-950') ? '#f8fafc' : 'var(--text)' }}>
                {currentQuestion.question}
              </h2>
              {(currentQuestion.excerpt || currentQuestion.sourceText) && (
                <div className="mb-6 rounded-2xl border p-5 text-left" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                  {currentQuestion.sourceText && (
                    <div className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: adaptive?.accentColor || '#f97316' }}>
                      {currentQuestion.sourceText}
                    </div>
                  )}
                  {currentQuestion.excerpt && (
                    <p className="whitespace-pre-line text-sm font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>
                      {currentQuestion.excerpt}
                    </p>
                  )}
                </div>
              )}
              {currentQuestion.answerMode === 'essay' ? (
                <div className="space-y-4 text-left">
                  {currentQuestion.essayPrompt && (
                    <div className="rounded-2xl border p-4" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest" style={{ color: adaptive?.accentColor || '#f97316' }}>
                        {writingPromptLabel}
                      </div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{currentQuestion.essayPrompt}</p>
                      {currentQuestion.maxMarks && (
                        <p className="mt-2 text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          {currentQuestion.maxMarks} marks
                        </p>
                      )}
                    </div>
                  )}
                  {currentQuestion.markingRubric && currentQuestion.markingRubric.length > 0 && (
                    <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                      <div className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: adaptive?.accentColor || '#f97316' }}>
                        {rubricLabel}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {currentQuestion.markingRubric.slice(0, 6).map(item => (
                          <div key={item} className="flex items-start gap-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <textarea
                    value={essayDraft}
                    onChange={event => setEssayDraft(event.target.value)}
                    disabled={isAnswered || markingEssay}
                    rows={16}
                    className="w-full min-h-[320px] resize-y rounded-2xl border-2 p-5 text-base font-semibold leading-relaxed outline-none transition-all focus:border-orange-500"
                    style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                    placeholder="Write your full response here. Use paragraphs, evidence and clear explanation..."
                  />
                  {!isAnswered && (
                    <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border p-3 backdrop-blur md:flex-row md:items-center md:justify-between" style={{ background: 'color-mix(in srgb, var(--card) 92%, transparent)', borderColor: 'var(--card-border)' }}>
                      <div className="text-xs font-black" style={{ color: essayWordCount >= essayMinWords ? '#10B981' : 'var(--text-muted)' }}>
                        {essayWordCount} words written · minimum {essayMinWords}
                      </div>
                      <Button onClick={submitEssay} disabled={markingEssay || essayWordCount < essayMinWords} size="lg" className="rounded-2xl px-8">
                        {markingEssay ? 'Marking...' : 'Submit Essay'}
                      </Button>
                    </div>
                  )}
                  {essayFeedback && (
                    <div className="rounded-2xl border p-5" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }}>
                      <div className="text-lg font-black text-emerald-500">{essayFeedback.marks}/{essayFeedback.maxMarks} · Grade {essayFeedback.grade}</div>
                      <p className="mt-2 text-sm font-bold" style={{ color: 'var(--text)' }}>{essayFeedback.feedback}</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-emerald-500">Strengths</div>
                          <ul className="space-y-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {essayFeedback.strengths?.map((item: string) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-orange-500">Improve</div>
                          <ul className="space-y-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {essayFeedback.improvements?.map((item: string) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                      </div>
                      {(essayFeedback.corrections?.length > 0 || essayFeedback.modelPoints?.length > 0) && (
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          {essayFeedback.corrections?.length > 0 && (
                            <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                              <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-rose-500">Corrections</div>
                              <ul className="space-y-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                                {essayFeedback.corrections.map((item: string) => <li key={item}>{item}</li>)}
                              </ul>
                            </div>
                          )}
                          {essayFeedback.modelPoints?.length > 0 && (
                            <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                              <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-sky-500">Model Points</div>
                              <ul className="space-y-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                                {essayFeedback.modelPoints.map((item: string) => <li key={item}>{item}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {essayFeedback.examinerReport?.length > 0 && (
                        <div className="mt-5 rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                          <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-emerald-500">KCSE Examiner&apos;s Report</div>
                          <div className="space-y-2">
                            {essayFeedback.examinerReport.map((item: any, index: number) => (
                              <div key={`${item.questionPart}-${index}`} className="rounded-xl p-3 text-xs font-semibold" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <span className="font-black" style={{ color: 'var(--text)' }}>{item.questionPart || `Part ${index + 1}`}</span>
                                  {Number(item.maxMarks) > 0 && (
                                    <span className="font-black text-emerald-500">{item.marksAwarded}/{item.maxMarks}</span>
                                  )}
                                </div>
                                {item.comment}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {essayFeedback.modelAnswer && (
                        <div className="mt-5 rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                          <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-sky-500">Model KCSE Answer</div>
                          <p className="whitespace-pre-line text-xs font-semibold leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {essayFeedback.modelAnswer}
                          </p>
                        </div>
                      )}
                      {essayFeedback.nextDrill && (
                        <div className="mt-4 rounded-2xl border p-4 text-xs font-black" style={{ background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.28)', color: '#f97316' }}>
                          Next drill: {essayFeedback.nextDrill}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.options.map((opt, i) => {
                    const isSelected = selectedAnswer === opt
                    const isCorrectAnswer = currentQuestion.correctAnswer === opt
                    let cls = 'bg-[var(--input)] hover:bg-[var(--card-border)]'
                    if (isAnswered) {
                      if (isCorrectAnswer) cls = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                      else if (isSelected) cls = 'bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-400'
                      else cls = 'bg-[var(--input)] opacity-40'
                    } else if (isSelected) { cls = 'bg-primary/20 border-primary' }
                    return (
                      <button key={i} disabled={isAnswered} onClick={() => handleAnswer(opt)}
                        className={`p-5 rounded-2xl border-2 border-transparent text-base font-bold transition-all text-left flex items-center justify-between ${cls}`}
                        style={{ color: !isAnswered ? 'var(--text)' : undefined }}>
                        <span className="mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black" style={{ background: 'var(--card-border)', color: 'var(--text-muted)' }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isAnswered && isCorrectAnswer && <CheckCircle2 className="text-emerald-500 shrink-0 ml-2" size={20} />}
                        {isAnswered && isSelected && !isCorrectAnswer && <XCircle className="text-rose-500 shrink-0 ml-2" size={20} />}
                      </button>
                    )
                  })}
                </div>
              )}
              {isAnswered && (
                <>
                  <CoachWorkout explanation={currentQuestion.explanation} correct={currentIsCorrect} accentColor={adaptive?.accentColor} />
                  <div className="mt-5 flex justify-end">
                    <Button onClick={nextQuestion} size="lg" className="rounded-2xl px-8 shadow-lg shadow-primary/20">
                      {currentQIndex < questions.length - 1 ? 'Next Question' : 'Finish Gym'}
                      <ChevronRight className="ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        )}

        {gameState === 'completed' && (
          <motion.div key="completed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center mt-12">
            <div className="w-32 h-32 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 border-4 border-emerald-500 relative">
              <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full animate-bounce">+50 XP</div>
              <Trophy className="text-emerald-500" size={56} />
            </div>
            <motion.h2 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              className="text-3xl font-black mb-2 text-emerald-500">
              Session Complete!
            </motion.h2>
            {score === totalQuestions ? (
              <p className="text-lg font-bold text-amber-500 mb-2">Perfect score! You're on fire!</p>
            ) : score >= Math.ceil(totalQuestions * 0.7) ? (
              <p className="text-lg font-bold text-emerald-500 mb-2">Excellent! Outstanding performance!</p>
            ) : score >= Math.ceil(totalQuestions * 0.5) ? (
              <p className="text-lg font-bold text-blue-500 mb-2">Good job! Keep pushing!</p>
            ) : (
              <p className="text-lg font-bold text-orange-500 mb-2">Great effort! Practice makes perfect!</p>
            )}
            <p className="text-sm font-bold mb-8" style={{ color: 'var(--text-muted)' }}>
              You earned +50 XP! Train again anytime to keep improving.
            </p>
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
              <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--card-border)] flex flex-col items-center">
                <Flame className="text-orange-500 mb-2" size={22} />
                <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{streakData?.current_streak || 1}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Streak</span>
              </div>
              <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--card-border)] flex flex-col items-center">
                <Star className="text-amber-500 mb-2 fill-current" size={22} />
                <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{score}/{totalQuestions}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Score</span>
              </div>
              <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--card-border)] flex flex-col items-center">
                <Trophy className="text-emerald-500 mb-2" size={22} />
                <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Accuracy</span>
              </div>
            </div>
            <Button size="lg" variant="outline" onClick={() => setGameState('idle')}
              className="rounded-2xl">
              <RotateCcw size={16} className="mr-2" /> Train Again
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
