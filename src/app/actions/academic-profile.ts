'use server'

import { createClient } from '@/lib/supabase/server'

type StudentProfile = {
  subjects: Record<string, SubjectProfile>
  error_profile: ErrorProfile
  engagement: EngagementMetrics
}

type SubjectProfile = {
  status: 'critical' | 'developing' | 'strong' | 'uncovered'
  trajectory: 'improving' | 'plateauing' | 'declining' | 'volatile'
  topics: Record<string, TopicProfile>
}

type TopicProfile = {
  status: 'critical' | 'developing' | 'strong' | 'uncovered'
  trajectory: 'improving' | 'plateauing' | 'declining' | 'volatile'
  avg_score: number
  attempts: number
  last_tested: string | null
  error_types: string[]
}

type ErrorProfile = {
  conceptual: ErrorEntry[]
  procedural: ErrorEntry[]
  careless: ErrorEntry[]
  omission: ErrorEntry[]
}

type ErrorEntry = {
  subject: string
  topic: string
  count: number
  source: string
  description?: string
}

type EngagementMetrics = {
  sessions_7d: number
  sessions_30d: number
  subjects_initiated: string[]
  subjects_avoided: string[]
  avg_return_frequency_days: number
  last_active_days_ago: number
}

type ToastTrigger =
  | 'correct_after_previous_wrong'
  | 'repeated_error'
  | 'above_personal_average'
  | 'skipped_working'
  | 'stuck_on_concept'
  | 'three_correct_in_row'
  | 'app_vs_session_gap'

type Toast = {
  type: ToastTrigger
  text: string
  context: Record<string, any>
}

type Notification = {
  type: string
  title: string
  body: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  action_text?: string
  action_data?: Record<string, any>
}

// ─────────────── PROFILE BUILDER ───────────────

export async function analyzeStudentProfile(studentId: string): Promise<StudentProfile> {
  const supabase = await createClient()
  const profile: StudentProfile = {
    subjects: {},
    error_profile: { conceptual: [], procedural: [], careless: [], omission: [] },
    engagement: {
      sessions_7d: 0,
      sessions_30d: 0,
      subjects_initiated: [],
      subjects_avoided: [],
      avg_return_frequency_days: 0,
      last_active_days_ago: 0,
    },
  }

  // 1. Fetch all academic data sources
  const [submissions, quizAttempts, examMarks, errorLog, sessions] = await Promise.all([
    supabase.from('submissions').select('*, assignment:assignments(*)').eq('student_id', studentId),
    supabase.from('quiz_attempts').select('*, quiz:quizzes(*)').eq('student_id', studentId),
    supabase.from('exam_marks').select('*, subject:subjects(name)').eq('student_id', studentId),
    supabase.from('student_error_log').select('*').eq('student_id', studentId),
    supabase.from('ai_learning_logs').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
  ])

  // 2. Build subject topic maps
  const topicScores: Record<string, Record<string, number[]>> = {}
  const topicAttempts: Record<string, Record<string, number>> = {}
  const topicErrorTypes: Record<string, Record<string, string[]>> = {}

  // Process submissions
  for (const sub of submissions.data || []) {
    const subjectName = (sub.assignment as any)?.subject_id || 'unknown'
    const topic = (sub.assignment as any)?.title || 'General'
    const score = sub.marks ? Number(sub.marks) : undefined

    if (score !== undefined) {
      if (!topicScores[subjectName]) topicScores[subjectName] = {}
      if (!topicScores[subjectName][topic]) topicScores[subjectName][topic] = []
      topicScores[subjectName][topic].push(score)
    }
  }

  // Process quiz attempts
  for (const qa of quizAttempts.data || []) {
    const subjectName = (qa.quiz as any)?.subject_id || 'unknown'
    const topic = (qa.quiz as any)?.title || 'General'
    const score = qa.percentage || 0

    if (!topicScores[subjectName]) topicScores[subjectName] = {}
    if (!topicScores[subjectName][topic]) topicScores[subjectName][topic] = []
    topicScores[subjectName][topic].push(score)
  }

  // Process exam marks
  for (const em of examMarks.data || []) {
    const subjectName = (em.subject as any)?.name || 'unknown'
    const topic = 'Exam'

    if (!topicScores[subjectName]) topicScores[subjectName] = {}
    if (!topicScores[subjectName][topic]) topicScores[subjectName][topic] = []
    topicScores[subjectName][topic].push(Number(em.marks))
  }

  // Process error logs for error profile
  const errorMap: Record<string, ErrorEntry[]> = {
    conceptual: [], procedural: [], careless: [], omission: [],
  }
  for (const err of errorLog.data || []) {
    const entry: ErrorEntry = {
      subject: err.subject,
      topic: err.topic,
      count: 1,
      source: err.source,
      description: err.description,
    }
    if (errorMap[err.error_type]) {
      const existing = errorMap[err.error_type].find(
        e => e.subject === err.subject && e.topic === err.topic,
      )
      if (existing) {
        existing.count++
      } else {
        errorMap[err.error_type].push(entry)
      }
    }
  }
  profile.error_profile = errorMap as ErrorProfile

  // 3. Build subject/topic profiles
  for (const [subjectId, topics] of Object.entries(topicScores)) {
    const subjectProfile: SubjectProfile = {
      status: 'uncovered',
      trajectory: 'plateauing',
      topics: {},
    }

    let allScores: number[] = []
    for (const [topic, scores] of Object.entries(topics)) {
      allScores = allScores.concat(scores)
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      const trajectory = computeTrajectory(scores)

      const topicProfile: TopicProfile = {
        status: avg < 50 ? 'critical' : avg < 70 ? 'developing' : 'strong',
        trajectory,
        avg_score: Math.round(avg),
        attempts: scores.length,
        last_tested: null,
        error_types: (errorMap.conceptual.filter(e => e.topic === topic)
          .concat(errorMap.procedural.filter(e => e.topic === topic))
          .concat(errorMap.careless.filter(e => e.topic === topic))
          .concat(errorMap.omission.filter(e => e.topic === topic))
        ).map(e => e.topic),
      }
      subjectProfile.topics[topic] = topicProfile
    }

    const overallAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length
    subjectProfile.status = overallAvg < 50 ? 'critical' : overallAvg < 70 ? 'developing' : 'strong'
    subjectProfile.trajectory = computeTrajectory(allScores)

    profile.subjects[subjectId] = subjectProfile
  }

  // 4. Build engagement metrics
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const allSessionDates = (sessions.data || []).map(s => new Date(s.created_at))
  profile.engagement.sessions_7d = allSessionDates.filter(d => d >= sevenDaysAgo).length
  profile.engagement.sessions_30d = allSessionDates.filter(d => d >= thirtyDaysAgo).length

  if (allSessionDates.length > 0) {
    const mostRecent = allSessionDates.sort((a, b) => b.getTime() - a.getTime())[0]
    profile.engagement.last_active_days_ago = Math.floor(
      (now.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000),
    )

    if (allSessionDates.length > 1) {
      const sorted = allSessionDates.sort((a, b) => a.getTime() - b.getTime())
      let totalGap = 0
      for (let i = 1; i < sorted.length; i++) {
        totalGap += sorted[i].getTime() - sorted[i - 1].getTime()
      }
      profile.engagement.avg_return_frequency_days =
        Math.round((totalGap / (sorted.length - 1)) / (24 * 60 * 60 * 1000) * 10) / 10
    }
  }

  // Detect avoided subjects (subjects with lowest scores across app data)
  const subjectScores: Record<string, number[]> = {}
  for (const em of examMarks.data || []) {
    const name = (em.subject as any)?.name || 'unknown'
    if (!subjectScores[name]) subjectScores[name] = []
    subjectScores[name].push(Number(em.marks))
  }

  const subjectAverages = Object.entries(subjectScores).map(([name, scores]) => ({
    name,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  })).sort((a, b) => a.avg - b.avg)

  profile.engagement.subjects_avoided = subjectAverages.slice(0, 2).map(s => s.name)
  profile.engagement.subjects_initiated = Object.keys(profile.subjects)
    .filter(s => profile.subjects[s].status !== 'uncovered')

  // 5. Persist to DB
  await supabase.from('student_academic_profiles').upsert({
    student_id: studentId,
    profile_data: profile as any,
    last_analyzed_at: now.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: 'student_id' })

  return profile
}

// ─────────────── TOAST GENERATION ───────────────

export async function generateInSessionToast(
  studentId: string,
  trigger: ToastTrigger,
  context: Record<string, any>,
): Promise<Toast | null> {
  const supabase = await createClient()

  const toastMap: Record<ToastTrigger, Toast> = {
    correct_after_previous_wrong: {
      type: 'correct_after_previous_wrong',
      text: `That's the first clean answer you've given on this concept across all your sessions. That's a real shift.`,
      context,
    },
    repeated_error: {
      type: 'repeated_error',
      text: `This is the exact same slip from earlier. This one needs specific attention — slow down.`,
      context,
    },
    above_personal_average: {
      type: 'above_personal_average',
      text: `That's your best score on this topic since you started. The work is showing.`,
      context,
    },
    skipped_working: {
      type: 'skipped_working',
      text: `The working matters — marks are awarded for method even when the final answer is wrong. Don't leave those marks on the table.`,
      context,
    },
    stuck_on_concept: {
      type: 'stuck_on_concept',
      text: `This topic has come up multiple times now and it's not clicking the same way. Let's try a completely different approach.`,
      context,
    },
    three_correct_in_row: {
      type: 'three_correct_in_row',
      text: `Three clean answers in a row — that's not luck, that's understanding.`,
      context,
    },
    app_vs_session_gap: {
      type: 'app_vs_session_gap',
      text: `Your quiz score on this was strong but you're finding it harder here in session. Let's find out what's different.`,
      context,
    },
  }

  const toast = toastMap[trigger]
  if (!toast) return null

  // Log toast delivery
  await supabase.from('student_toast_log').insert({
    student_id: studentId,
    toast_type: trigger,
    toast_text: toast.text,
    context: toast.context,
    session_id: context.session_id || null,
  })

  return toast
}

// ─────────────── NOTIFICATION GENERATION ───────────────

export async function generateNotifications(studentId: string): Promise<Notification[]> {
  const supabase = await createClient()
  const notifications: Notification[] = []

  const { data: profile } = await supabase
    .from('student_academic_profiles')
    .select('profile_data')
    .eq('student_id', studentId)
    .single()

  if (!profile) return []

  const data = profile.profile_data as any
  const subjects = data?.subjects || {}
  const engagement = data?.engagement || {}

  // Check for inactivity
  if (engagement.last_active_days_ago >= 3) {
    const weakest = Object.entries(subjects)
      .filter(([, s]: any) => (s as any).status === 'critical')
      .sort(([, a]: any, [, b]: any) => (a as any).avg_score - (b as any).avg_score)

    if (weakest.length > 0) {
      notifications.push({
        type: 'inactivity',
        title: 'You\'ve been away',
        body: `You've been away for ${engagement.last_active_days_ago} days. Your weakest topic right now is ${weakest[0][0]}. Even 10 minutes today moves the needle.`,
        priority: 'normal',
        action_text: 'Start a session',
        action_data: { subject: weakest[0][0] },
      })
    }
  }

  // Check for critical weak areas not touched in 5+ days
  for (const [subject, s] of Object.entries(subjects)) {
    const subj = s as any
    if (subj.status === 'critical' && subj.topics) {
      for (const [topic, t] of Object.entries(subj.topics)) {
        const tp = t as any
        if (tp.last_tested) {
          const lastTested = new Date(tp.last_tested)
          const daysSince = Math.floor((Date.now() - lastTested.getTime()) / (24 * 60 * 60 * 1000))
          if (daysSince >= 5) {
            notifications.push({
              type: 'critical_unaddressed',
              title: 'Red zone alert',
              body: `${topic} is still a red zone in your profile and you haven't revisited it since ${lastTested.toLocaleDateString()}. That's the one that will cost you.`,
              priority: 'high',
              action_text: 'Review now',
              action_data: { subject, topic },
            })
          }
        }
      }
    }
  }

  // Weekly performance summary
  if (engagement.sessions_7d >= 5) {
    const improving = Object.entries(subjects).filter(([, s]: any) => (s as any).trajectory === 'improving').map(([n]) => n)
    const declining = Object.entries(subjects).filter(([, s]: any) => (s as any).trajectory === 'declining').map(([n]) => n)
    const critical = Object.entries(subjects).filter(([, s]: any) => (s as any).status === 'critical').map(([n]) => n)

    notifications.push({
      type: 'weekly_summary',
      title: 'Your week in review',
      body: [
        improving.length ? `${improving.join(', ')} is improving.` : '',
        declining.length ? `${declining.join(', ')} needs attention.` : '',
        critical.length ? `${critical.join(', ')} is your biggest risk right now.` : '',
      ].filter(Boolean).join(' ') || 'Solid week. Keep the momentum.',
      priority: 'normal',
      action_text: 'See full breakdown',
    })
  }

  // Look up the auth user_id from the students table
  const { data: student } = await supabase
    .from('students')
    .select('user_id')
    .eq('id', studentId)
    .single()

  const userId = student?.user_id
  if (!userId) return notifications

  // Save to the main notifications table for realtime delivery
  for (const n of notifications) {
    await supabase.from('notifications').insert({
      user_id: userId,
      title: n.title,
      body: n.body,
      type: n.type,
      data: {
        priority: n.priority,
        action_text: n.action_text,
        action_data: n.action_data,
        source: 'academic_profile',
      },
    })
  }

  return notifications
}

// ─────────────── PROFILE SUMMARY FOR AI CONTEXT ───────────────

export async function getStudentProfileSummary(studentId: string): Promise<string> {
  try {
    const supabase = await createClient()

    const { data: profileData } = await supabase
      .from('student_academic_profiles')
      .select('profile_data')
      .eq('student_id', studentId)
      .single()

    if (!profileData) return ''

    const profile = profileData.profile_data as any
    const subjects = profile?.subjects || {}
    const errors = profile?.error_profile || {}
    const engagement = profile?.engagement || {}

    let summary = ''

    // Critical weaknesses
    const critical = Object.entries(subjects).filter(([, s]: any) => (s as any).status === 'critical')
    if (critical.length > 0) {
      summary += `CRITICAL WEAKNESSES: ${critical.map(([n]) => n).join(', ')}.\n`
    }

    // Trajectory
    const declining = Object.entries(subjects).filter(([, s]: any) => (s as any).trajectory === 'declining')
    if (declining.length > 0) {
      summary += `DECLINING: ${declining.map(([n]) => n).join(', ')}.\n`
    }

    // Error patterns
    const allErrors = [...(errors.conceptual || []), ...(errors.procedural || []), ...(errors.careless || []), ...(errors.omission || [])]
    if (allErrors.length > 0) {
      const topErrors = allErrors.sort((a: any, b: any) => b.count - a.count).slice(0, 3)
      summary += `COMMON ERRORS: ${topErrors.map((e: any) => `${e.subject}/${e.topic} (${e.count}x ${e.type || 'conceptual'})`).join(', ')}.\n`
    }

    // Engagement
    if (engagement.last_active_days_ago > 2) {
      summary += `INACTIVITY: ${engagement.last_active_days_ago} days since last session.\n`
    }

    return summary.trim()
  } catch {
    return ''
  }
}

// ─────────────── POST-SUBMISSION ANALYSIS TRIGGER ───────────────

export async function triggerPostSubmissionAnalysis(studentId: string) {
  await analyzeStudentProfile(studentId)
  await generateNotifications(studentId)
}

// ─────────────── DAILY ANALYSIS ───────────────

export async function runDailyAnalysis() {
  const supabase = await createClient()

  const { data: activeStudents } = await supabase
    .from('students')
    .select('id, user_id')
    .not('user_id', 'is', null)

  if (!activeStudents?.length) return { analyzed: 0 }

  let count = 0
  for (const s of activeStudents) {
    if (!s.user_id || !s.id) continue
    await analyzeStudentProfile(s.id)
    await generateNotifications(s.id)
    count++
  }

  return { analyzed: count }
}

// ─────────────── WEEKLY DEEP ANALYSIS ───────────────

export async function runWeeklyAnalysis() {
  const supabase = await createClient()

  const { data: activeStudents } = await supabase
    .from('students')
    .select('id, user_id')
    .not('user_id', 'is', null)

  if (!activeStudents?.length) return { analyzed: 0 }

  let count = 0
  for (const s of activeStudents) {
    if (!s.user_id || !s.id) continue
    await analyzeStudentProfile(s.id)

    const { data: profile } = await supabase
      .from('student_academic_profiles')
      .select('profile_data')
      .eq('student_id', s.id)
      .single()

    if (!profile) continue

    const data = profile.profile_data as any
    const subjects = data?.subjects || {}

    const improving = Object.entries(subjects).filter(([, s]: any) => (s as any).trajectory === 'improving').map(([n]) => n)
    const declining = Object.entries(subjects).filter(([, s]: any) => (s as any).trajectory === 'declining').map(([n]) => n)
    const critical = Object.entries(subjects).filter(([, s]: any) => (s as any).status === 'critical').map(([n]) => n)

    let body = ''
    if (improving.length) body += `Improving: ${improving.join(', ')}. `
    if (declining.length) body += `Needs work: ${declining.join(', ')}. `
    if (critical.length) body += `Biggest risk: ${critical.join(', ')}. `
    if (!body) body = 'Solid week across the board. Keep the momentum.'

    await supabase.from('notifications').insert({
      user_id: s.user_id,
      title: 'Your Peak Weekly Report',
      body: body.trim(),
      type: 'weekly_summary',
      data: { priority: 'normal', source: 'academic_profile', action_text: 'See full breakdown' },
    })

    count++
  }

  return { analyzed: count }
}

// ─────────────── UTILITY ───────────────

function computeTrajectory(scores: number[]): 'improving' | 'plateauing' | 'declining' | 'volatile' {
  if (scores.length < 2) return 'plateauing'

  const recent = scores.slice(-3)
  const mid = recent[Math.floor(recent.length / 2)]
  const last = recent[recent.length - 1]

  if (last > mid + 10) return 'improving'
  if (last < mid - 10) return 'declining'

  const variance = scores.reduce((sum, s) => sum + Math.abs(s - (scores.reduce((a, b) => a + b, 0) / scores.length)), 0) / scores.length
  if (variance > 20) return 'volatile'

  return 'plateauing'
}
