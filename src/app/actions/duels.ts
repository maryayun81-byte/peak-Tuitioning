'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateBrainGymQuestions, recordPeakCoachMasterySignals } from './brainGym'
import { getFallbackQuestions, questionFingerprint } from '@/lib/brainGymUtils'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from './push'
import { adaptDuelQuestions, getAdaptiveDuelProfile, getAdaptivePowerUps, getAdaptiveTime, getDuelGradeBand } from '@/lib/duels/adaptiveProfile'
import { attachDuelEngagement, getCurrentDuelSeason, getTerritoryPointAward, getXpWithTerritoryBonus } from '@/lib/duels/engagement'
import type {
  Duel, DuelType, DuelParticipantWithStudent, Difficulty, CoachDifficulty,
  DuelResultRow, DuelLeaderboardEntry, DuelStats, DuelBoss, DuelAchievement,
  StudentDuelAchievement, HallOfFameEntry, PowerUp, PowerUpInventory,
  DuelReaction, DuelMessage, CreateDuelInput, MatchmakingEntry, RankTier
} from '@/types/duels'

// ── HELPERS ───────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getQuestionCountForType(type: DuelType): number {
  if (type === 'daily') return 5
  return 10
}

function isInstantDuel(type: DuelType) {
  return type === 'coach' || type === 'boss' || type === 'daily' || type === 'weekly'
}

function getTimeForDifficulty(difficulty?: string): number {
  switch (difficulty) {
    case 'easy': return 30
    case 'medium': return 25
    case 'hard': return 25
    case 'challenge': return 30
    case 'legendary': return 35
    default: return 25
  }
}

function isDuelMcqQuestion(question: any) {
  if (!question || question.answerMode === 'essay') return false
  if (question.questionStyle === 'essay_response' || question.questionStyle === 'functional_writing') return false
  if (!Array.isArray(question.options) || question.options.length !== 4) return false
  if (!question.correctAnswer || !question.options.includes(question.correctAnswer)) return false
  return true
}

function normaliseSubject(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function subjectLooksCbc(subject: string) {
  return /cbc|kpsea|kjsea|integrated science|science\s*&\s*technology|pre-technical|agriculture\s*&\s*nutrition|social studies/i.test(subject)
}

function subjectMatchesRegistered(qSubject: string, subjects: string[]) {
  if (!subjects.length) return true
  const q = normaliseSubject(qSubject)
  return subjects.some(subject => {
    const s = normaliseSubject(subject)
    return q === s || q.includes(s) || s.includes(q) ||
      (s.includes('mathematics') && q.includes('mathematics')) ||
      (s.includes('english') && q.includes('english')) ||
      (s.includes('kiswahili') && q.includes('kiswahili')) ||
      (s.includes('integratedscience') && q.includes('integratedscience')) ||
      (s.includes('scienceandtechnology') && q.includes('scienceandtechnology')) ||
      (s.includes('socialstudies') && q.includes('socialstudies')) ||
      (s.includes('pretechnical') && q.includes('pretechnical')) ||
      (s.includes('agriculture') && q.includes('agriculture'))
  })
}

function getDuelVisualScene(question: any) {
  const subject = String(question.subject || '')
  const normalized = normaliseSubject(subject)
  const common = {
    interactionType: 'mcq',
    visualPrompt: `Display this CBC duel challenge on the board with all labels and clues: ${question.excerpt || question.question}`,
  }

  if (normalized.includes('math')) {
    return {
      ...common,
      sceneType: 'Mathematics Smart Blackboard',
      background: 'Blackboard with graph paper side panel',
      style: 'CBC visual duel scene',
      objects: ['ruler', 'calculator', 'chalk', 'coordinate grid'],
      diagram: 'calculation board or geometry sketch',
      workingTools: ['formula helper', 'working area', 'answer box'],
    }
  }

  if (normalized.includes('science')) {
    return {
      ...common,
      sceneType: 'Integrated Science Laboratory',
      background: 'Laboratory bench and investigation board',
      style: 'CBC visual duel scene',
      objects: ['beaker', 'circuit board', 'microscope', 'safety goggles'],
      diagram: 'apparatus sketch or investigation data',
      workingTools: ['observation clue', 'unit reminder', 'answer box'],
    }
  }

  if (normalized.includes('social')) {
    return {
      ...common,
      sceneType: 'Kenya Map Room',
      background: 'Map wall and evidence chart',
      style: 'CBC visual duel scene',
      objects: ['Kenya map', 'globe', 'timeline', 'weather chart'],
      diagram: 'map or chart evidence',
      workingTools: ['map key', 'evidence clue', 'answer box'],
    }
  }

  if (normalized.includes('kiswahili')) {
    return {
      ...common,
      sceneType: 'Darasa la Kiswahili',
      background: 'Ubao wa fasihi',
      style: 'CBC visual duel scene',
      objects: ['ubao', 'daftari', 'msamiati cards', 'shairi board'],
      diagram: 'matini au mazungumzo kwenye ubao',
      workingTools: ['kidokezo', 'ushahidi wa matini', 'jibu'],
    }
  }

  if (normalized.includes('english')) {
    return {
      ...common,
      sceneType: 'Library Reading Corner',
      background: 'Notice board and reading table',
      style: 'CBC visual duel scene',
      objects: ['storybook', 'newspaper', 'dictionary', 'notice board'],
      diagram: 'reading extract board',
      workingTools: ['vocabulary clue', 'evidence note', 'answer box'],
    }
  }

  return {
    ...common,
    sceneType: 'CBC Learning Studio',
    background: 'Smart classroom board',
    style: 'CBC visual duel scene',
    objects: ['blackboard', 'notebook', 'label cards'],
    diagram: 'labelled learning scene',
    workingTools: ['thinking clue', 'answer box'],
  }
}

async function getDuelLearnerContext(studentId: string) {
  const supabase = await createClient()
  let subjects: string[] = []
  let className = ''
  let curriculumName = ''
  let classLevel: number | null = null

  try {
    const { data: subjectRows } = await supabase
      .from('student_subjects')
      .select('subject:subjects(name)')
      .eq('student_id', studentId)

    subjects = (subjectRows || [])
      .map((row: any) => row?.subject?.name)
      .filter(Boolean)
  } catch {}

  try {
    const { data: student } = await supabase
      .from('students')
      .select('class:classes(name, level), curriculum:curriculums(name)')
      .eq('id', studentId)
      .single()

    className = (student as any)?.class?.name || ''
    classLevel = (student as any)?.class?.level ?? null
    curriculumName = (student as any)?.curriculum?.name || ''
  } catch {}

  const combined = `${curriculumName} ${className} ${subjects.join(' ')}`
  const isCbc = /cbc|kpsea|kjsea|grade\s*[1-9]|junior secondary|primary|jss/i.test(combined) ||
    subjects.some(subjectLooksCbc)

  if (isCbc && subjects.length === 0) {
    subjects = /grade\s*[1-6]|kpsea|primary/i.test(combined)
      ? ['Mathematics-CBC', 'English-CBC', 'Kiswahili-CBC', 'Science & Technology', 'Agriculture & Nutrition', 'Social Studies']
      : ['Mathematics-CBC', 'English-CBC', 'Kiswahili-CBC', 'Integrated Science', 'Social Studies', 'Pre-Technical Studies', 'Agriculture & Nutrition']
  }

  return { subjects, isCbc, className, curriculumName, classLevel }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function getFallbackDuelQuestions(count: number, subjects: string[] = [], isCbc = false) {
  let pool = getFallbackQuestions()
    .filter(isDuelMcqQuestion)
    .map(q => ({ ...q, fingerprint: q.fingerprint || questionFingerprint(q.question) }))

  if (isCbc) {
    pool = pool.filter(q => q.examStandard === 'cbc_standard' || subjectLooksCbc(q.subject))
  } else if (subjects.length > 0) {
    pool = pool.filter(q => !subjectLooksCbc(q.subject) && subjectMatchesRegistered(q.subject, subjects))
  }

  if (pool.length < count && isCbc) {
    pool = getFallbackQuestions()
      .filter(isDuelMcqQuestion)
      .map(q => ({ ...q, fingerprint: q.fingerprint || questionFingerprint(q.question) }))
      .filter(q => q.examStandard === 'cbc_standard' || subjectLooksCbc(q.subject))
  }

  return pool
    .map(q => isCbc ? ({ ...q, visualScene: q.visualScene || getDuelVisualScene(q) }) : q)
    .slice(0, count)
}

function filterDuelQuestionsForLearner(questions: any[], subjects: string[], isCbc: boolean) {
  return questions.filter(question => {
    if (!isDuelMcqQuestion(question)) return false
    if (isCbc) return question.examStandard === 'cbc_standard' || subjectLooksCbc(question.subject)
    if (subjectLooksCbc(question.subject) || question.examStandard === 'cbc_standard') return false
    return subjectMatchesRegistered(question.subject, subjects)
  })
}

async function getDuelQuestionSet(studentId: string, count: number) {
  let questions: any[] = []
  const learnerContext = await getDuelLearnerContext(studentId)
  const subjects = learnerContext.subjects.length > 0 ? learnerContext.subjects : undefined
  const options = learnerContext.isCbc
    ? {
        trainingMode: 'cbc_visual_duel' as any,
        className: learnerContext.className || undefined,
        classLevel: learnerContext.classLevel,
        curriculumName: learnerContext.curriculumName || undefined,
      }
    : {
        className: learnerContext.className || undefined,
        classLevel: learnerContext.classLevel,
        curriculumName: learnerContext.curriculumName || undefined,
      }

  const seen = new Set<string>()
  const markSeen = (q: any) => {
    const fp = q?.fingerprint || questionFingerprint(q?.question || '')
    if (fp) seen.add(fp)
  }
  const recentFingerprints = await getRecentDuelFingerprints(studentId)
  recentFingerprints.forEach(fp => seen.add(fp))

  try {
    const primary = await withTimeout(generateBrainGymQuestions(studentId, 'duel', subjects, recentFingerprints, options), 18000, 'Duel question generation')
    const filtered = filterDuelQuestionsForLearner(primary, learnerContext.subjects, learnerContext.isCbc).filter(q => {
      const fp = q?.fingerprint || questionFingerprint(q?.question || '')
      return !fp || !seen.has(fp)
    })
    filtered.forEach(markSeen)
    questions = filtered
  } catch (error: any) {
    console.error('[Duels] Using fallback questions:', error?.message)
    questions = getFallbackDuelQuestions(count, learnerContext.subjects, learnerContext.isCbc).filter(q => {
      const fp = q?.fingerprint || questionFingerprint(q?.question || '')
      return !fp || !seen.has(fp)
    })
    questions.forEach(markSeen)
  }

  if (questions.length < count) {
    try {
      const refill = await withTimeout(generateBrainGymQuestions(studentId, 'duel', subjects, Array.from(seen), options), 12000, 'Duel refill generation')
      const filtered = filterDuelQuestionsForLearner(refill, learnerContext.subjects, learnerContext.isCbc).filter(q => {
        const fp = q?.fingerprint || questionFingerprint(q?.question || '')
        return !fp || !seen.has(fp)
      })
      filtered.forEach(markSeen)
      questions = [...questions, ...filtered]
    } catch (error: any) {
      console.error('[Duels] Using fallback refill:', error?.message)
      const fallback = getFallbackDuelQuestions(count, learnerContext.subjects, learnerContext.isCbc).filter(q => {
        const fp = q?.fingerprint || questionFingerprint(q?.question || '')
        return !fp || !seen.has(fp)
      })
      fallback.forEach(markSeen)
      questions = [...questions, ...fallback]
    }
  }

  return questions.slice(0, count)
}

async function getRecentDuelFingerprints(studentId: string, limit = 40): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data: duels } = await supabase
      .from('classroom_duels')
      .select('questions, duel_type')
      .eq('created_by', studentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    const fps = new Set<string>()
    for (const duel of duels || []) {
      const rawQuestions = duel?.questions
      if (!Array.isArray(rawQuestions)) continue
      for (const q of rawQuestions) {
        const fp = q?.fingerprint || questionFingerprint(q?.question || q?.excerpt || '')
        if (fp) fps.add(fp)
      }
    }
    return Array.from(fps)
  } catch (error) {
    console.error('[Duels] recent fingerprints:', error)
    return []
  }
}

async function getStudentId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('students')
    .select('id, class:classes(level, name)')
    .eq('user_id', user.id)
    .single()
  if (!data) throw new Error('Student not found')
  return {
    studentId: data.id,
    userId: user.id,
    supabase,
    classLevel: (data.class as any)?.level as number | null | undefined,
    className: (data.class as any)?.name as string | null | undefined,
  }
}

// ── 1. CREATE DUEL ────────────────────────────────────────────────
export async function createDuel(input: CreateDuelInput) {
  const { studentId, userId, supabase, classLevel, className } = await getStudentId()
  const adaptiveProfile = getAdaptiveDuelProfile(classLevel, className)
  const count = getQuestionCountForType(input.duel_type)
  const timePerQ = Math.max(25, input.time_per_question || getAdaptiveTime(getTimeForDifficulty(input.difficulty), adaptiveProfile))

  let questions: any[]
  if (input.duel_type === 'boss' && input.boss_id) {
    const { data: boss } = await supabase.from('duel_bosses').select('questions, topic').eq('id', input.boss_id).single()
    questions = (boss?.questions && Array.isArray(boss.questions) && boss.questions.length >= count)
      ? boss.questions.filter(isDuelMcqQuestion)
      : await getDuelQuestionSet(studentId, count)
    if (questions.length < count) questions = await getDuelQuestionSet(studentId, count)
    if ((boss?.topic || input.topic) && Array.isArray(questions)) {
      questions = questions.map(q => ({ ...q, topic: q.topic || boss?.topic || input.topic }))
    }
  } else if (input.duel_type === 'coach') {
    questions = await getDuelQuestionSet(studentId, count)
  } else {
    questions = await getDuelQuestionSet(studentId, count)
  }

  questions = attachDuelEngagement(
    adaptDuelQuestions(shuffle(questions).slice(0, count), adaptiveProfile),
    { duelType: input.duel_type, classLevel, className }
  )

  const basePowerUps: PowerUp[] = input.duel_type === 'boss' || input.duel_type === 'tournament'
    ? ['fifty_fifty', 'hint', 'time_freeze']
    : ['fifty_fifty', 'time_freeze', 'double_xp', 'shield', 'hint', 'revive', 'skip']

  const { data: duel, error } = await supabase
    .from('classroom_duels')
    .insert({
      class_id: input.class_id || null,
      status: isInstantDuel(input.duel_type) ? 'active' : 'waiting',
      questions,
      current_question_index: 0,
      duel_type: input.duel_type,
      difficulty: input.difficulty || 'medium',
      subject_id: input.subject_id || null,
      topic: input.topic || null,
      time_per_question: timePerQ,
      max_participants: isInstantDuel(input.duel_type) ? 1 : input.duel_type === 'team' ? 10 : input.duel_type === 'tournament' ? 32 : 2,
      started_at: isInstantDuel(input.duel_type) ? new Date().toISOString() : null,
      created_by: studentId,
      coach_difficulty: input.coach_difficulty || null,
      boss_id: input.boss_id || null,
      allowed_power_ups: getAdaptivePowerUps(basePowerUps, adaptiveProfile),
    })
    .select()
    .single()

  if (error) throw error

  // Join creator
  await supabase.from('duel_participants').insert({ duel_id: duel.id, student_id: studentId })

  // Boss duel: solo activity (no AI opponent inserted — FK constraint requires real student)

  // Friend challenge: notify
  if (input.duel_type === 'friend' && input.opponent_student_id) {
    const { data: opponent } = await supabase.from('students').select('user_id, full_name').eq('id', input.opponent_student_id).single()
    if (opponent) {
      await supabase.from('notifications').insert({
        user_id: opponent.user_id,
        title: `⚔️ Duel Challenge!`,
        body: `You've been challenged to a duel!`,
        type: 'duel_challenge',
        data: { duel_id: duel.id, challenger_id: studentId, href: '/student/duels' },
      })
      await sendPushNotification([opponent.user_id], {
        title: '⚔️ Duel Challenge!',
        body: `You've been challenged to a duel!`,
        href: '/student/duels',
        tag: 'duel-challenge',
      })
    }
  }

  // Team battle: invite team members
  if (input.duel_type === 'team' && input.team_member_ids?.length) {
    const { data: members } = await supabase.from('students').select('id, user_id').in('id', input.team_member_ids)
    if (members) {
      for (const m of members) {
        await supabase.from('duel_participants').insert({ duel_id: duel.id, student_id: m.id })
        await supabase.from('notifications').insert({
          user_id: m.user_id,
          title: '👥 Team Battle Invite',
          body: `You've been invited to join a team battle!`,
          type: 'duel_challenge',
          data: { duel_id: duel.id, href: '/student/duels' },
        })
      }
    }
  }

  revalidatePath('/student/duels')
  return duel
}

// ── 2. JOIN DUEL ──────────────────────────────────────────────────
export async function joinDuel(duelId: string) {
  const { studentId, supabase } = await getStudentId()

  const { data: existing } = await supabase
    .from('duel_participants')
    .select('id')
    .eq('duel_id', duelId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (existing) return { alreadyJoined: true }

  const { error } = await supabase
    .from('duel_participants')
    .insert({ duel_id: duelId, student_id: studentId })

  if (error) throw error

  const { count } = await supabase
    .from('duel_participants')
    .select('*', { count: 'exact', head: true })
    .eq('duel_id', duelId)

  if (count && count >= 2) {
    await supabase.from('classroom_duels').update({
      status: 'active',
      started_at: new Date().toISOString(),
    }).eq('id', duelId)
  }

  revalidatePath('/student/duels')
  return { joined: true }
}

// ── 3. SUBMIT ANSWER ─────────────────────────────────────────────
export async function submitDuelAnswer(
  duelId: string,
  questionIndex: number,
  selectedAnswer: string,
  timeSpent: number,
  streakAtTime: number,
  powerUpsUsed?: string[]
) {
  const { studentId, supabase } = await getStudentId()

  const { data: duel } = await supabase
    .from('classroom_duels')
    .select('questions, difficulty, duel_type')
    .eq('id', duelId)
    .single()

  if (!duel) throw new Error('Duel not found')

  const question = duel.questions[questionIndex]
  if (!question) throw new Error('Question not found')

  const isCorrect = selectedAnswer === question.correctAnswer

  await recordPeakCoachMasterySignals(studentId, [{
    curriculum: question.examStandard?.includes('cbc') ? 'CBC' : '8-4-4/KCSE',
    subject: question.subject,
    topic: question.topic,
    subtopic: question.subtopic || question.sourceText,
    syllabusOutcome: [question.topic, question.subtopic || question.sourceText].filter(Boolean).join(': '),
    marksAvailable: 1,
    marksEarned: isCorrect ? 1 : 0,
  }])

  const baseScore = 100
  const difficultyMultiplier = duel.difficulty === 'easy' ? 1 : duel.difficulty === 'medium' ? 1.5 : duel.difficulty === 'hard' ? 2 : duel.difficulty === 'challenge' ? 2.5 : 3
  const speedBonus = Math.max(0, Math.floor((15 - timeSpent) * 2))
  const streakBonus = streakAtTime >= 3 ? streakAtTime * 5 : 0
  let score = Math.floor((baseScore + speedBonus + streakBonus) * difficultyMultiplier)

  const powerUps = powerUpsUsed || []
  if (powerUps.includes('double_xp')) score *= 2

  const { data: participant } = await supabase
    .from('duel_participants')
    .select('score, max_streak, answer_history, power_ups_used, total_time_spent')
    .eq('duel_id', duelId)
    .eq('student_id', studentId)
    .single()

  if (participant) {
    const newStreak = isCorrect ? Math.max(streakAtTime, participant.max_streak || 0) : participant.max_streak || 0
    const existingHistory = participant.answer_history || []
    const withoutDuplicate = existingHistory.filter((answer: any) => answer.question_index !== questionIndex)
    const history = [...withoutDuplicate, {
      question_index: questionIndex,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      time_spent: timeSpent,
      streak_at_time: streakAtTime,
    }].sort((a, b) => a.question_index - b.question_index)
    const puUsed = [...new Set([...(participant.power_ups_used || []), ...powerUps])]

    await supabase
      .from('duel_participants')
      .update({
        score: (participant.score || 0) + (isCorrect ? score : 0),
        max_streak: newStreak,
        answer_history: history,
        power_ups_used: puUsed,
        total_time_spent: ((participant as any).total_time_spent || 0) + timeSpent,
      } as any)
      .eq('duel_id', duelId)
      .eq('student_id', studentId)
  }

  return { isCorrect, score, speedBonus, streakBonus, total: isCorrect ? score : 0 }
}

// ── 4. ADVANCE QUESTION ──────────────────────────────────────────
export async function advanceDuelQuestion(duelId: string, currentIndex: number) {
  const supabase = await createClient()

  const { data: duel } = await supabase
    .from('classroom_duels')
    .select('current_question_index, questions, status')
    .eq('id', duelId)
    .single()

  if (!duel || duel.status !== 'active') return

  if (duel.current_question_index.toString() !== currentIndex.toString()) return

  if (duel.current_question_index >= duel.questions.length - 1) {
    await supabase
      .from('classroom_duels')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', duelId)

    await recordDuelResults(duelId)
    await checkDuelAchievements(duelId)
  } else {
    await supabase
      .from('classroom_duels')
      .update({ current_question_index: duel.current_question_index + 1 })
      .eq('id', duelId)
  }
}

// ── 5. RECORD RESULTS ────────────────────────────────────────────
async function recordDuelResults(duelId: string) {
  const admin = await createAdminClient()
  const { data: duel } = await admin.from('classroom_duels').select('duel_type, difficulty, questions').eq('id', duelId).single()
  if (!duel) return

  const { data: participants } = await admin
    .from('duel_participants')
    .select('*, student:students(duel_rating)')
    .eq('duel_id', duelId)
    .order('joined_at')

  if (!participants || participants.length === 0) return

  // Coach / solo duels — award XP based on performance
  if (participants.length < 2) {
    const solo = participants[0] as any
    const answers = solo.answer_history || []
    const correctCount = answers.filter((a: any) => a.is_correct).length
    const total = answers.length || 1
    const accuracy = correctCount / total
    const baseXp = duel.difficulty === 'legendary' ? 200 : duel.difficulty === 'hard' ? 120 : 80
    const accuracyBonus = Math.round(baseXp * accuracy)
    const streakBonus = Math.min((solo.max_streak || 0) * 5, 50)
    const xp = getXpWithTerritoryBonus(baseXp + accuracyBonus + streakBonus, duel.questions as any)

    await admin.from('duel_results').upsert({
      duel_id: duelId,
      student_id: solo.student_id,
      opponent_student_id: null,
      result: correctCount >= total * 0.5 ? 'win' : 'loss',
      score: solo.score || 0,
      opponent_score: null,
      xp_awarded: xp,
    }, { onConflict: 'duel_id,student_id' })

    await admin.from('students').update({
      xp: admin.rpc('increment', { amount: xp }) as any,
    } as any).eq('id', solo.student_id)

    const { data: student } = await admin.from('students').select('user_id').eq('id', solo.student_id).single()
    if (student) {
      await admin.from('notifications').insert({
        user_id: student.user_id,
        title: '🏋️ Coach Session Complete',
        body: `You earned +${xp} XP!`,
        type: 'duel_result',
        data: { duel_id: duelId, result: 'coach', xp, href: '/student/duels' },
      })
    }

    if (correctCount >= total * 0.5) {
      const { processDuelForHouses } = await import('./houses')
      await processDuelForHouses(solo.student_id, getTerritoryPointAward(10, duel.questions as any))
    }

    await admin.from('classroom_duels').update({ completed_at: new Date().toISOString() }).eq('id', duelId)
    return
  }

  const p1 = participants[0] as any
  const p2 = participants[1] as any

  const p1Result = p1.score > p2.score ? 'win' : p1.score < p2.score ? 'loss' : 'draw'
  const p2Result = p2.score > p1.score ? 'win' : p2.score < p1.score ? 'loss' : 'draw'

  const xpWin = duel.difficulty === 'legendary' ? 300 : duel.difficulty === 'hard' ? 200 : 150
  const xpDraw = Math.floor(xpWin / 2)
  const xpLoss = Math.floor(xpWin / 3)

  const p1Xp = getXpWithTerritoryBonus(p1Result === 'win' ? xpWin : p1Result === 'draw' ? xpDraw : xpLoss, duel.questions as any)
  const p2Xp = getXpWithTerritoryBonus(p2Result === 'win' ? xpWin : p2Result === 'draw' ? xpDraw : xpLoss, duel.questions as any)

  const p1EloBefore = p1.student?.duel_rating || 1000
  const p2EloBefore = p2.student?.duel_rating || 1000

  const eloK = 32
  const p1Expected = 1 / (1 + Math.pow(10, (p2EloBefore - p1EloBefore) / 400))
  const p2Expected = 1 / (1 + Math.pow(10, (p1EloBefore - p2EloBefore) / 400))
  const p1EloChange = Math.round(eloK * ((p1Result === 'win' ? 1 : p1Result === 'draw' ? 0.5 : 0) - p1Expected))
  const p2EloChange = Math.round(eloK * ((p2Result === 'win' ? 1 : p2Result === 'draw' ? 0.5 : 0) - p2Expected))

  for (const p of [p1, p2]) {
    const result = p.id === p1.id ? p1Result : p2Result
    const opp = p.id === p1.id ? p2 : p1
    const eloBefore = p.id === p1.id ? p1EloBefore : p2EloBefore
    const eloChange = p.id === p1.id ? p1EloChange : p2EloChange
    const xp = p.id === p1.id ? p1Xp : p2Xp

    await admin.from('duel_results').upsert({
      duel_id: duelId,
      student_id: p.student_id,
      opponent_student_id: opp.student_id,
      result,
      score: p.score,
      opponent_score: opp.score,
      xp_awarded: xp,
    }, { onConflict: 'duel_id,student_id' })

    await admin.from('duel_rating_history').insert({
      student_id: p.student_id,
      duel_id: duelId,
      rating_before: eloBefore,
      rating_after: eloBefore + eloChange,
      change: eloChange,
    })

    await admin.from('students').update({
      duel_wins: admin.rpc('increment_if', { condition: result === 'win', field: 'duel_wins' }) as any,
      duel_losses: admin.rpc('increment_if', { condition: result === 'loss', field: 'duel_losses' }) as any,
      duel_draws: admin.rpc('increment_if', { condition: result === 'draw', field: 'duel_draws' }) as any,
      duel_rating: Math.round(eloBefore + eloChange), // integer — avoids round(double precision, int) PG error
      duel_win_streak: admin.rpc('update_streak', { result, current_streak: 0 }) as any,
      xp: admin.rpc('increment', { amount: xp }) as any,
    } as any).eq('id', p.student_id)
  }

  // Notify participants
  for (const p of [p1, p2]) {
    const result = p.id === p1.id ? p1Result : p2Result
    const { data: student } = await admin.from('students').select('user_id, full_name').eq('id', p.student_id).single()
    if (student) {
      const title = result === 'win' ? '🏆 Duel Victory!' : result === 'draw' ? '🤝 Duel Draw' : '😔 Duel Lost'
      const body = result === 'win' ? `You won the duel! +${p.id === p1.id ? p1Xp : p2Xp} XP` : `The duel ended in a ${result}. +${p.id === p1.id ? p1Xp : p2Xp} XP`
      await admin.from('notifications').insert({
        user_id: student.user_id,
        title,
        body,
        type: 'duel_result',
        data: { duel_id: duelId, result, xp: p.id === p1.id ? p1Xp : p2Xp, href: '/student/duels' },
      })
    }
  }

  const winnerId = p1Result === 'win' ? p1.student_id : p2Result === 'win' ? p2.student_id : null

  await admin.from('classroom_duels').update({
    winner_id: winnerId,
    completed_at: new Date().toISOString(),
  }).eq('id', duelId)

  // Territory wars: award points to winner's house
  if (winnerId) {
    const { processDuelForHouses } = await import('./houses')
    await processDuelForHouses(winnerId, getTerritoryPointAward(10, duel.questions as any))
  }

  // Update streaks for all participants
  for (const p of [p1, p2]) {
    const { updateStreak } = await import('./houses')
    await updateStreak(p.student_id)
  }
}

// ── 6. CHECK ACHIEVEMENTS ────────────────────────────────────────
async function checkDuelAchievements(duelId: string) {
  const admin = await createAdminClient()
  const { data: participants } = await admin
    .from('duel_participants')
    .select('student_id')
    .eq('duel_id', duelId)

  if (!participants) return

  for (const p of participants) {
    const { data: stats } = await admin
      .from('duel_results')
      .select('result, xp_awarded')
      .eq('student_id', p.student_id)

    if (!stats) continue

    const wins = stats.filter(s => s.result === 'win').length
    const questionsAnswered = stats.length * 5 // approximate

    const achievements = await admin.from('duel_achievements').select('*')
    if (!achievements.data) continue

    for (const ach of achievements.data) {
      const { data: existing } = await admin
        .from('student_duel_achievements')
        .select('id')
        .eq('student_id', p.student_id)
        .eq('achievement_id', ach.id)
        .maybeSingle()

      if (existing) continue

      let earned = false
      if (ach.code === 'first_duel' && stats.length >= 1) earned = true
      else if (ach.code === 'ten_wins' && wins >= 10) earned = true
      else if (ach.code === 'fifty_wins' && wins >= 50) earned = true
      else if (ach.code === 'hundred_wins' && wins >= 100) earned = true

      if (earned) {
        await admin.from('student_duel_achievements').insert({
          student_id: p.student_id,
          achievement_id: ach.id,
        })
        await admin.from('students').update({
          xp: admin.rpc('increment', { amount: ach.reward_xp }) as any,
          total_coins: admin.rpc('increment', { amount: ach.reward_coins }) as any,
        } as any).eq('id', p.student_id)
      }
    }
  }
}

// ── 7. MATCHMAKING ────────────────────────────────────────────────
export async function joinMatchmaking(input: {
  duel_type?: DuelType
  subject_id?: string
  difficulty?: Difficulty
}) {
  const { studentId, supabase } = await getStudentId()

  const { data: existing } = await supabase
    .from('duel_matchmaking_queue')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'searching')
    .maybeSingle()

  if (existing) return { alreadyInQueue: true }

  const { data: student } = await supabase
    .from('students')
    .select('duel_rating, full_name')
    .eq('id', studentId)
    .single()

  const baseRating = student?.duel_rating || 1000

  // Clear any stale (non-searching) entries for this student first to avoid
  // unique-constraint violations from old found/cancelled rows
  await supabase
    .from('duel_matchmaking_queue')
    .delete()
    .eq('student_id', studentId)
    .neq('status', 'searching')

  const { data: entry, error: insertError } = await supabase
    .from('duel_matchmaking_queue')
    .upsert(
      {
        student_id: studentId,
        duel_type: input.duel_type || 'quick',
        subject_id: input.subject_id || null,
        difficulty: input.difficulty || 'medium',
        rating: baseRating,
        status: 'searching',
      },
      { onConflict: 'student_id' }
    )
    .select()
    .single()

  if (insertError || !entry) {
    console.error('[Matchmaking] Queue upsert failed:', insertError?.message)
    return { error: 'Failed to join queue', matched: false }
  }

  // Progressive range expansion — start tight, widen over retries
  const ranges = [100, 200, 400, 800]
  let match: any = null

  for (const range of ranges) {
    // Priority 1: Same duel_type + same subject + rating range
    const { data: sameSubject } = await supabase
      .from('duel_matchmaking_queue')
      .select('*, student:students(id, full_name, avatar_url, duel_rating)')
      .eq('status', 'searching')
      .eq('duel_type', input.duel_type || 'quick')
      .eq('subject_id', input.subject_id || null)
      .neq('student_id', studentId)
      .gte('rating', baseRating - range)
      .lte('rating', baseRating + range)
      .limit(1)

    if (sameSubject && sameSubject.length > 0) { match = sameSubject[0] as any; break }

    // Priority 2: Same duel_type only + rating range
    const { data: sameType } = await supabase
      .from('duel_matchmaking_queue')
      .select('*, student:students(id, full_name, avatar_url, duel_rating)')
      .eq('status', 'searching')
      .eq('duel_type', input.duel_type || 'quick')
      .neq('student_id', studentId)
      .gte('rating', baseRating - range)
      .lte('rating', baseRating + range)
      .limit(1)

    if (sameType && sameType.length > 0) { match = sameType[0] as any; break }

    // Priority 3: Any duel_type + rating range
    const { data: anyType } = await supabase
      .from('duel_matchmaking_queue')
      .select('*, student:students(id, full_name, avatar_url, duel_rating)')
      .eq('status', 'searching')
      .neq('student_id', studentId)
      .gte('rating', baseRating - range)
      .lte('rating', baseRating + range)
      .limit(1)

    if (anyType && anyType.length > 0) { match = anyType[0] as any; break }
  }

  if (match) {
    try {
      const duel = await createDuel({
        duel_type: input.duel_type || 'quick',
        difficulty: input.difficulty || 'medium',
        subject_id: input.subject_id,
      })

      await joinDuel(duel.id)

      // Update both queue entries separately (can't match two different IDs with one filter)
      await supabase.from('duel_matchmaking_queue')
        .update({ status: 'found', matched_at: new Date().toISOString() })
        .eq('id', entry.id)

      await supabase.from('duel_matchmaking_queue')
        .update({ status: 'found', matched_at: new Date().toISOString() })
        .eq('id', match.id)

      return { matched: true, duel, opponent: match.student }
    } catch (err: any) {
      console.error('[Matchmaking] createDuel failed:', err?.message)
      // Stay in queue, let polling retry
      return { matched: false, inQueue: true, estimatedRange: 400 }
    }
  }

  return { matched: false, inQueue: true, estimatedRange: ranges[ranges.length - 1] }
}

export async function checkMatchmakingStatus() {
  const { studentId, supabase } = await getStudentId()
  const { data: entry } = await supabase
    .from('duel_matchmaking_queue')
    .select('id, status, matched_at')
    .eq('student_id', studentId)
    .eq('status', 'searching')
    .maybeSingle()

  if (!entry) return { inQueue: false }

  return { inQueue: true, queueId: entry.id }
}

export async function leaveMatchmaking() {
  const { studentId, supabase } = await getStudentId()
  await supabase.from('duel_matchmaking_queue').update({ status: 'cancelled' }).eq('student_id', studentId).eq('status', 'searching')
}

export async function retryMatchmaking(input: {
  duel_type?: DuelType
  subject_id?: string
  difficulty?: Difficulty
}) {
  const { studentId, supabase } = await getStudentId()

  const { data: student } = await supabase
    .from('students')
    .select('duel_rating')
    .eq('id', studentId)
    .single()

  const baseRating = student?.duel_rating || 1000

  const { data: entry } = await supabase
    .from('duel_matchmaking_queue')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'searching')
    .maybeSingle()

  if (!entry) return { matched: false, inQueue: false }

  // Progressive search with wider ranges
  const ranges = [200, 400, 800]
  let match: any = null

  for (const range of ranges) {
    const { data: candidates } = await supabase
      .from('duel_matchmaking_queue')
      .select('*, student:students(id, full_name, avatar_url, duel_rating)')
      .eq('status', 'searching')
      .neq('student_id', studentId)
      .gte('rating', baseRating - range)
      .lte('rating', baseRating + range)
      .limit(1)

    if (candidates && candidates.length > 0) { match = candidates[0] as any; break }
  }

  if (match) {
    const duel = await createDuel({
      duel_type: input.duel_type || 'quick',
      difficulty: input.difficulty || 'medium',
      subject_id: input.subject_id,
    })

    await joinDuel(duel.id)

    // Update both queue entries separately
    await supabase.from('duel_matchmaking_queue')
      .update({ status: 'found', matched_at: new Date().toISOString() })
      .eq('id', entry.id)

    await supabase.from('duel_matchmaking_queue')
      .update({ status: 'found', matched_at: new Date().toISOString() })
      .eq('id', match.id)

    return { matched: true, duel, opponent: match.student }
  }

  return { matched: false, inQueue: true, estimatedRange: ranges[ranges.length - 1] }
}

// ── 8. GET ACTIVE DUELS ──────────────────────────────────────────
export async function getActiveDuels(classId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('classroom_duels')
    .select('*, participants:duel_participants(*, student:students(full_name, avatar_url))')
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })

  if (classId) query = query.eq('class_id', classId)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as Duel[]
}

// ── 9. GET DUEL BY ID ────────────────────────────────────────────
export async function getDuelById(duelId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classroom_duels')
    .select('*, participants:duel_participants(*, student:students(full_name, avatar_url, admission_number))')
    .eq('id', duelId)
    .single()

  if (error) throw error
  return data as unknown as Duel
}

// ── 10. GET DUEL HISTORY ─────────────────────────────────────────
export async function getDuelHistory(studentId?: string) {
  const supabase = await createClient()
  let sid = studentId
  if (!sid) {
    const s = await getStudentId()
    sid = s.studentId
  }

  const { data, error } = await supabase
    .from('duel_results')
    .select('*, opponent:opponent_student_id(id, full_name, avatar_url)')
    .eq('student_id', sid)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data as unknown as DuelResultRow[]
}

// ── 11. GET LEADERBOARD ──────────────────────────────────────────
export async function getDuelLeaderboard(limit = 50, offset = 0) {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .rpc('get_duel_leaderboard', { p_limit: limit, p_offset: offset })
    if (error) throw error
    return data as DuelLeaderboardEntry[]
  } catch (err: any) {
    console.error('[Leaderboard] RPC error:', err?.message)
    // Fallback: return top students by duel_rating directly
    const { data } = await supabase
      .from('students')
      .select('id, full_name, avatar_url, admission_number, duel_rating, duel_wins, duel_losses, duel_draws')
      .order('duel_rating', { ascending: false })
      .limit(limit)
    return (data || []).map((s: any, i: number) => {
      const wins = s.duel_wins || 0
      const losses = s.duel_losses || 0
      const draws = s.duel_draws || 0
      const total_duels = wins + losses + draws
      return {
        student_id: s.id,
        full_name: s.full_name,
        avatar_url: s.avatar_url,
        admission_number: s.admission_number,
        duel_rating: Math.round(s.duel_rating || 1000),
        duel_wins: wins,
        duel_losses: losses,
        duel_draws: draws,
        total_duels,
        win_rate: total_duels > 0 ? Math.round((wins / total_duels) * 100) : 0,
      }
    }) as DuelLeaderboardEntry[]
  }
}

// ── 12. GET STUDENT DUEL STATS ───────────────────────────────────
export async function getStudentDuelStats(studentId?: string) {
  const supabase = await createClient()
  let sid = studentId
  if (!sid) {
    const s = await getStudentId()
    sid = s.studentId
  }

  try {
    const { data, error } = await supabase
      .rpc('get_student_duel_stats', { p_student_id: sid })
    if (error) throw error
    return (data?.[0] || null) as DuelStats | null
  } catch (err: any) {
    console.error('[DuelStats] RPC error:', err?.message)
    // Fallback: compute stats directly from tables
    const { data: student } = await supabase
      .from('students')
      .select('duel_rating, duel_wins, duel_losses, duel_draws, duel_win_streak')
      .eq('id', sid)
      .single()
    const { data: results } = await supabase
      .from('duel_results')
      .select('result, xp_awarded, created_at')
      .eq('student_id', sid)
      .order('created_at', { ascending: false })
      .limit(100)
    const wins = student?.duel_wins || 0
    const losses = student?.duel_losses || 0
    const draws = student?.duel_draws || 0
    const total = wins + losses + draws
    const scores = (results || []).map(r => (r as any).score || 0)
    return {
      student_id: sid,
      rating: Math.round(student?.duel_rating || 1000),
      wins, losses, draws,
      total_duels: total,
      win_rate: total > 0 ? Math.round((wins / total) * 100) : 0,
      win_streak: student?.duel_win_streak || 0,
      avg_score: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0,
      best_score: scores.length > 0 ? Math.max(...scores) : 0,
      total_xp: (results || []).reduce((s, r) => s + ((r as any).xp_awarded || 0), 0),
    } as DuelStats
  }
}

// ── 13. GET BOSSES ────────────────────────────────────────────────
export async function getActiveBosses() {
  const { supabase, classLevel, className } = await getStudentId()
  const isCbcLearner = /grade|jss|junior|primary|kpsea|kjsea/i.test(className || '') || Boolean(classLevel && classLevel <= 9)
  const { data, error } = await supabase
    .from('duel_bosses')
    .select('*, subject:subject_id(name)')
    .eq('is_active', true)

  if (error) throw error
  const bosses = (data || []) as any[]

  if (!isCbcLearner) return bosses

  const grade = getDuelGradeBand(classLevel, className)
  return [
    {
      id: 'cbc-data-dragon',
      is_virtual: true,
      name: grade >= 9 ? 'Data Dragon' : 'Data Guardian',
      topic: 'Data handling',
      difficulty: grade >= 8 ? 'hard' : 'medium',
      health: grade >= 9 ? 160 : 120,
      subject: { name: 'Mathematics-CBC' },
    },
    {
      id: 'cbc-geometry-golem',
      is_virtual: true,
      name: grade >= 9 ? 'Geometry Golem' : 'Shape Guardian',
      topic: 'Geometry',
      difficulty: grade >= 8 ? 'hard' : 'medium',
      health: grade >= 9 ? 150 : 110,
      subject: { name: 'Mathematics-CBC' },
    },
    {
      id: 'cbc-ratio-ranger',
      is_virtual: true,
      name: 'Ratio Ranger',
      topic: 'Ratios and proportions',
      difficulty: 'medium',
      health: 120,
      subject: { name: 'Mathematics-CBC' },
    },
    {
      id: 'cbc-measurement-mech',
      is_virtual: true,
      name: grade >= 9 ? 'Measurement Mech' : 'Measurement Master',
      topic: 'Measurement',
      difficulty: grade >= 8 ? 'hard' : 'medium',
      health: grade >= 9 ? 150 : 110,
      subject: { name: 'Mathematics-CBC' },
    },
  ]
}

// ── 14. GET ACHIEVEMENTS ─────────────────────────────────────────
export async function getDuelAchievements() {
  const { studentId, supabase } = await getStudentId()

  const [achRes, earnedRes] = await Promise.all([
    supabase.from('duel_achievements').select('*').order('reward_xp'),
    supabase.from('student_duel_achievements').select('*, achievement:achievement_id(*)').eq('student_id', studentId),
  ])

  return {
    all: (achRes.data || []) as DuelAchievement[],
    earned: (earnedRes.data || []) as StudentDuelAchievement[],
  }
}

// ── 15. GET HALL OF FAME ─────────────────────────────────────────
export async function getHallOfFame(season?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('duel_hall_of_fame')
    .select('*, student:student_id(id, full_name, avatar_url, admission_number)')
    .order('rank', { ascending: true })
    .limit(20)

  if (season) query = query.eq('season', season)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as HallOfFameEntry[]
}

// ── 16. SEND REACTION ────────────────────────────────────────────
export async function sendDuelReaction(duelId: string, emoji: string) {
  const { studentId, supabase } = await getStudentId()
  await supabase.from('duel_reactions').insert({
    duel_id: duelId,
    student_id: studentId,
    emoji,
  })
}

// ── 17. SEND DUEL MESSAGE ────────────────────────────────────────
export async function sendDuelMessage(duelId: string, message: string) {
  const { studentId, supabase } = await getStudentId()
  await supabase.from('duel_messages').insert({
    duel_id: duelId,
    student_id: studentId,
    message,
  })
}

// ── 18. GET REACTIONS ────────────────────────────────────────────
export async function getDuelReactions(duelId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('duel_reactions')
    .select('*, student:student_id(full_name, avatar_url)')
    .eq('duel_id', duelId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data || []) as any[]
}

// ── 19. BUY POWER-UP ─────────────────────────────────────────────
export async function buyPowerUp(powerUp: PowerUp) {
  const { studentId, supabase } = await getStudentId()
  const costMap: Record<PowerUp, number> = {
    fifty_fifty: 50, time_freeze: 100, double_xp: 150,
    shield: 80, hint: 30, revive: 200, skip: 60,
  }

  const { data: student } = await supabase.from('students').select('total_coins').eq('id', studentId).single()
  if (!student || (student.total_coins || 0) < costMap[powerUp]) {
    throw new Error('Not enough coins')
  }

  const { error } = await supabase.from('duel_power_up_inventory').insert({
    student_id: studentId,
    power_up: powerUp,
  })

  if (error) throw error
  await supabase.from('students').update({ total_coins: (student.total_coins || 0) - costMap[powerUp] }).eq('id', studentId)
}

// ── 20. GET POWER-UP INVENTORY ───────────────────────────────────
export async function getPowerUpInventory() {
  const { studentId, supabase } = await getStudentId()
  const { data } = await supabase
    .from('duel_power_up_inventory')
    .select('*')
    .eq('student_id', studentId)
    .gte('quantity', 1)

  return (data || []) as PowerUpInventory[]
}

// ── 21. USE POWER-UP ─────────────────────────────────────────────
export async function usePowerUp(duelId: string, powerUp: PowerUp) {
  const { studentId, supabase } = await getStudentId()

  const { data: inv } = await supabase
    .from('duel_power_up_inventory')
    .select('id, quantity')
    .eq('student_id', studentId)
    .eq('power_up', powerUp)
    .gte('quantity', 1)
    .limit(1)

  if (!inv || inv.length === 0) throw new Error('Power-up not available')

  await supabase.from('duel_power_up_inventory').update({ quantity: inv[0].quantity - 1 }).eq('id', inv[0].id)

  const { data: part } = await supabase
    .from('duel_participants')
    .select('power_ups_used')
    .eq('duel_id', duelId)
    .eq('student_id', studentId)
    .single()

  const used = [...new Set([...(part?.power_ups_used || []).map((p: any) => typeof p === 'string' ? p : p.type), powerUp])]
  await supabase.from('duel_participants').update({ power_ups_used: used as any }).eq('duel_id', duelId).eq('student_id', studentId)
}

// ── 22. TEACHER: CREATE CHALLENGE ────────────────────────────────
export async function createTeacherChallenge(input: {
  title: string
  class_id: string
  subject_id?: string
  topic?: string
  question_ids?: string[]
  time_limit: number
  reward_xp: number
}) {
  const { studentId: teacherStudentId, supabase } = await getStudentId()

  const questions = input.question_ids?.length
    ? []
    : await getDuelQuestionSet(teacherStudentId, 10)

  const { data: duel, error } = await supabase
    .from('classroom_duels')
    .insert({
      class_id: input.class_id,
      status: 'waiting',
      questions,
      duel_type: 'teacher',
      difficulty: 'medium',
      subject_id: input.subject_id || null,
      topic: input.topic || null,
      time_per_question: Math.max(25, input.time_limit),
      created_by: teacherStudentId,
    })
    .select()
    .single()

  if (error) throw error

  const { data: students } = await supabase
    .from('students')
    .select('user_id')
    .eq('class_id', input.class_id)

  if (students) {
    const userIds = students.map(s => s.user_id).filter(Boolean) as string[]
    await supabase.from('notifications').insert(userIds.map(uid => ({
      user_id: uid,
      title: `👨‍🏫 Teacher Challenge: ${input.title}`,
      body: `Your teacher has posted a new challenge! ${input.reward_xp} XP reward.`,
      type: 'duel_challenge',
      data: { duel_id: duel.id, href: '/student/duels' },
    })))

    await sendPushNotification(userIds, {
      title: `👨‍🏫 Teacher Challenge`,
      body: `Your teacher posted a challenge: ${input.title}`,
      href: '/student/duels',
      tag: 'teacher-challenge',
    })
  }

  return duel
}

// ── 23. GENERATE DAILY DUELS ─────────────────────────────────────
export async function generateDailyDuels(classId?: string) {
  const { studentId, supabase, classLevel, className } = await getStudentId()
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from('daily_duels')
    .select('id')
    .eq('date', today)
    .limit(1)

  if (existing && existing.length > 0) {
    return getDuelById(existing[0].id)
  }

  const adaptiveProfile = getAdaptiveDuelProfile(classLevel, className)
  const questions = attachDuelEngagement(
    adaptDuelQuestions(((await getDuelQuestionSet(studentId, 5)).slice(0, 5) as any), adaptiveProfile),
    { duelType: 'daily', classLevel, className }
  )
  const { data: duel } = await supabase
    .from('classroom_duels')
    .insert({
      class_id: classId || null,
      status: 'active',
      questions,
      duel_type: 'daily',
      difficulty: 'medium',
      time_per_question: Math.max(25, getAdaptiveTime(20, adaptiveProfile)),
      is_daily: true,
      created_by: studentId,
      max_participants: 1,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (duel) {
    await supabase.from('duel_participants').insert({ duel_id: duel.id, student_id: studentId })
    await supabase.from('daily_duels').insert({ duel_id: duel.id, date: today })
    return getDuelById(duel.id)
  }

  return null
}

// ── 24. GET DUEL STATISTICS ──────────────────────────────────────
export async function getDuelAnalytics(studentId?: string) {
  const supabase = await createClient()
  let sid = studentId
  if (!sid) {
    const s = await getStudentId()
    sid = s.studentId
  }

  const { data: history } = await supabase
    .from('duel_results')
    .select('*')
    .eq('student_id', sid)
    .order('created_at', { ascending: true })

  if (!history || history.length === 0) return null

  return {
    total: history.length,
    wins: history.filter(h => h.result === 'win').length,
    losses: history.filter(h => h.result === 'loss').length,
    draws: history.filter(h => h.result === 'draw').length,
    totalXp: history.reduce((s, h) => s + (h.xp_awarded || 0), 0),
    avgScore: Math.round(history.reduce((s, h) => s + (h.score || 0), 0) / history.length),
    bestScore: Math.max(...history.map(h => h.score || 0)),
    recentResults: history.slice(-10),
    chartData: history.map(h => ({
      date: h.created_at?.slice(0, 10),
      score: h.score,
      result: h.result,
    })),
  }
}

// ── 25. CANCEL DUEL ──────────────────────────────────────────────
export async function cancelDuel(duelId: string) {
  const { studentId, supabase } = await getStudentId()
  await supabase.from('classroom_duels').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', duelId).eq('created_by', studentId)
}

// ── 26. GET WEEKL Y CHAMPIONSHIP ──────────────────────────────────
export async function getActiveWeeklyChampionship() {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from('weekly_championships')
      .select('*')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (data) return data as any
  } catch (err: any) {
    console.error('[WeeklyChampionship] fallback season:', err?.message)
  }

  const season = getCurrentDuelSeason()
  return {
    id: season.id,
    week_start: season.weekStart,
    week_end: season.weekEnd,
    status: 'active',
    title: season.title,
    rewards: season.rewards,
    titles: season.titles,
  }
}

// ── 27. TOURNAMENT: CREATE ───────────────────────────────────────
export async function startWeeklyHouseWarSeason() {
  const supabase = await createClient()
  const season = getCurrentDuelSeason()
  const payload = {
    id: season.id,
    week_start: season.weekStart,
    week_end: season.weekEnd,
    status: 'active',
    title: season.title,
    rewards: season.rewards,
    titles: season.titles,
    started_at: new Date().toISOString(),
  }

  try {
    await supabase
      .from('weekly_championships')
      .update({ status: 'completed' })
      .eq('status', 'active')
      .neq('id', season.id)

    const { data, error } = await supabase
      .from('weekly_championships')
      .upsert(payload as any, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw error
    revalidatePath('/student/duels')
    revalidatePath('/teacher/duels')
    return data as any
  } catch (err: any) {
    console.error('[WeeklyChampionship] start fallback:', err?.message)
    return payload
  }
}

export async function createTournament(input: {
  title: string
  class_id: string
  subject_id?: string
  max_participants?: number
}) {
  const supabase = await createClient()
  const { studentId } = await getStudentId()
  const questions = await getDuelQuestionSet(studentId, getQuestionCountForType('tournament'))

  const rounds = input.max_participants || 32
  const bracket = Array.from({ length: Math.log2(rounds) }, (_, i) => ({
    round: i + 1,
    matches: Array.from({ length: rounds / Math.pow(2, i + 1) }, () => ({
      duel_id: null,
      participants: [] as string[],
      winner_id: null,
    })),
  }))

  const { data: duel, error } = await supabase
    .from('classroom_duels')
    .insert({
      class_id: input.class_id,
      status: 'waiting',
      questions,
      duel_type: 'tournament',
      max_participants: rounds,
      subject_id: input.subject_id || null,
      tournament_bracket: bracket,
    })
    .select()
    .single()

  if (error) throw error
  return duel
}

// ── 28. GET RANKING INFO ─────────────────────────────────────────
export async function getStudentRank(studentId?: string) {
  const supabase = await createClient()
  let sid = studentId
  if (!sid) {
    const s = await getStudentId()
    sid = s.studentId
  }

  const { data: student } = await supabase
    .from('students')
    .select('duel_rating, duel_wins, duel_losses, duel_draws, duel_win_streak')
    .eq('id', sid)
    .single()

  if (!student) return null

  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .gte('duel_rating', student.duel_rating)

  return {
    ...student,
    rank: count || 0,
    total: student.duel_wins + student.duel_losses + student.duel_draws,
  }
}
