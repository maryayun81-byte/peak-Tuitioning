'use server'

import { createAdminClient } from '@/lib/supabase/server'
import {
  getAuthUser,
  getStudentForUser,
  verifyEnrollmentAccess,
  verifyStudentOwnership,
  logHomeschoolAudit,
} from './homeschooling'

function getUserRole(user: any): string {
  return user.user_metadata?.role || user.app_metadata?.role || 'student'
}

// ============================================================
// PEAK CAMPUS HOMESCHOOLING — LEARNING ENGINE ACTIONS
// Evidence → Error intelligence → Mastery → Retention.
// Rules: teacher owns curriculum & assessment; platform owns
// progression & evidence; AI never declares mastery alone.
// ============================================================

// ── ENTITLEMENTS (§07) ───────────────────────────────────────

export async function ensureHomeschoolEntitlement(studentId: string, source = 'ENROLLMENT') {
  const admin = await createAdminClient()
  const { error } = await admin.from('student_entitlements').upsert(
    {
      student_id: studentId,
      feature: 'HOMESCHOOLING',
      status: 'ACTIVE',
      source,
      starts_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,feature' }
  )
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function setEntitlementStatus(studentId: string, feature: string, status: string) {
  const { user } = await getAuthUser()
  const admin = await createAdminClient()
  const before = await admin
    .from('student_entitlements')
    .select('*')
    .eq('student_id', studentId)
    .eq('feature', feature)
    .maybeSingle()
  const { error } = await admin
    .from('student_entitlements')
    .update({ status, ends_at: status === 'ACTIVE' ? null : new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('feature', feature)
  if (error) throw new Error(error.message)
  await logHomeschoolAudit(user.id, 'entitlement', studentId, studentId, before.data || null, { status }, { feature })
  return { success: true }
}

export async function getStudentEntitlements(studentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role === 'student') await verifyStudentOwnership(studentId, user.id)
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('student_entitlements')
      .select('*')
      .eq('student_id', studentId)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── TEACHER AVAILABILITY (§09) ───────────────────────────────

export async function setTeacherAvailability(
  teacherId: string,
  slots: Array<{ day: string; start_time: string; end_time: string; is_available: boolean; note?: string }>
) {
  try {
    const { user } = await getAuthUser()
    const admin = await createAdminClient()
    await admin.from('teacher_availability').delete().eq('teacher_id', teacherId)
    if (slots.length > 0) {
      const { error } = await admin.from('teacher_availability').insert(
        slots.map((s) => ({ teacher_id: teacherId, ...s }))
      )
      if (error) throw error
    }
    await logHomeschoolAudit(user.id, 'availability', teacherId, teacherId, null, { slots: slots.length })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getTeacherAvailability(teacherId: string) {
  try {
    await getAuthUser()
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('start_time')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── PREPARATION STATES (§17) ─────────────────────────────────
// EMPTY → DRAFT → READY → PUBLISHED → COMPLETED (derived + stored)

export async function getSessionPreparation(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    const admin = await createAdminClient()
    const { data: session } = await admin
      .from('learning_sessions')
      .select('id, enrollment_id, status')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) throw new Error('Session not found.')
    await verifyEnrollmentAccess(session.enrollment_id, user.id, role)

    const [{ data: objectives }, { data: activities }, { data: questions }] = await Promise.all([
      admin.from('learning_objectives').select('id').eq('session_id', sessionId),
      admin.from('learning_activities').select('id,status').eq('session_id', sessionId),
      admin.from('learning_questions').select('id,status').eq('session_id', sessionId),
    ])
    const objCount = (objectives || []).length
    const pubActs = (activities || []).filter((a: any) => a.status === 'PUBLISHED').length
    const pubQs = (questions || []).filter((q: any) => q.status === 'PUBLISHED').length

    let derived: string = session.status === 'COMPLETED' ? 'COMPLETED' : 'EMPTY'
    if (objCount > 0 || (activities || []).length > 0) derived = 'DRAFT'
    if (objCount > 0 && ((activities || []).length > 0 || (questions || []).length > 0)) derived = 'READY'
    if (pubActs > 0 || pubQs > 0) derived = 'PUBLISHED'

    return {
      success: true,
      data: {
        state: derived,
        objectives: objCount,
        activities: (activities || []).length,
        publishedActivities: pubActs,
        questions: (questions || []).length,
        publishedQuestions: pubQs,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Publish a mission: snapshot immutable versions, flip states (§109, §41)
export async function publishMission(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'admin' && role !== 'teacher') throw new Error('Access denied.')
    const admin = await createAdminClient()

    const { data: session } = await admin
      .from('learning_sessions')
      .select('id, enrollment_id, mission_version')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) throw new Error('Session not found.')
    await verifyEnrollmentAccess(session.enrollment_id, user.id, role)

    const [{ data: mission }, { data: objectives }] = await Promise.all([
      admin.from('learning_missions').select('*').eq('session_id', sessionId).maybeSingle(),
      admin.from('learning_objectives').select('*').eq('session_id', sessionId).order('order_index'),
    ])
    if (!objectives || objectives.length === 0) throw new Error('Add at least one objective before publishing.')

    const nextVersion = (session.mission_version || 1)

    if (mission) {
      await admin.from('learning_mission_versions').insert({
        mission_id: mission.id,
        session_id: sessionId,
        version_number: nextVersion,
        snapshot: mission,
        published_by: user.id,
      })
    }
    for (const o of objectives as any[]) {
      await admin.from('learning_objective_versions').insert({
        objective_id: o.id,
        session_id: sessionId,
        version_number: nextVersion,
        snapshot: o,
        published_by: user.id,
      })
    }
    await admin
      .from('learning_activities')
      .update({ status: 'PUBLISHED' })
      .eq('session_id', sessionId)
      .eq('status', 'DRAFT')
    await admin
      .from('learning_questions')
      .update({ status: 'PUBLISHED' })
      .eq('session_id', sessionId)
      .eq('status', 'DRAFT')

    const { error } = await admin
      .from('learning_sessions')
      .update({ preparation_state: 'PUBLISHED', mission_version: nextVersion + 1 })
      .eq('id', sessionId)
    if (error) throw error

    await logHomeschoolAudit(user.id, 'publish', 'mission', sessionId, { version: nextVersion - 1 }, { version: nextVersion }, {
      objectives: objectives.length,
    })
    return { success: true, data: { version: nextVersion, objectives: objectives.length } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── ACTIVITIES & QUESTIONS (teacher authoring, §27-34) ───────

async function assertTeacherSession(sessionId: string, userId: string, role: string) {
  const admin = await createAdminClient()
  const { data: session } = await admin
    .from('learning_sessions')
    .select('id, enrollment_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) throw new Error('Session not found.')
  await verifyEnrollmentAccess(session.enrollment_id, userId, role)
  return { admin, session }
}

export async function createActivity(input: {
  session_id: string
  objective_id?: string
  activity_type: string
  interaction_type?: string
  assessment_mode?: string
  support_mode?: string
  submission_mode?: string
  mastery_mode?: string
  workspace_id?: string
  title: string
  instructions?: string
  config?: any
}) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'admin' && role !== 'teacher') throw new Error('Access denied.')
    const { admin, session } = await assertTeacherSession(input.session_id, user.id, role)
    const { count } = await admin
      .from('learning_activities')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', input.session_id)
    const { data, error } = await admin
      .from('learning_activities')
      .insert({
        session_id: input.session_id,
        enrollment_id: session.enrollment_id,
        objective_id: input.objective_id || null,
        activity_type: input.activity_type,
        interaction_type: input.interaction_type || 'GENERIC',
        assessment_mode: input.assessment_mode || 'SYSTEM',
        support_mode: input.support_mode || 'PEAK_COACH',
        submission_mode: input.submission_mode || 'DIGITAL',
        mastery_mode: input.mastery_mode || 'AUTOMATIC',
        workspace_id: input.workspace_id || null,
        title: input.title,
        instructions: input.instructions || null,
        config: input.config || {},
        order_index: count || 0,
        created_by: user.id,
      })
      .select()
      .single()
    if (error) throw error
    await admin
      .from('learning_sessions')
      .update({ preparation_state: 'DRAFT' })
      .eq('id', input.session_id)
      .eq('preparation_state', 'EMPTY')
    await logHomeschoolAudit(user.id, 'create', 'activity', data.id, null, data)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createQuestion(input: {
  session_id: string
  activity_id?: string
  objective_id?: string
  question_type?: string
  prompt: string
  instructions?: string
  interaction_type?: string
  workspace_id?: string
  expected_answer?: any
  answer_model?: any
  validation_model?: any
  marks?: number
  difficulty?: string
  expected_skill?: string
  working_required?: boolean
  explanation_required?: boolean
  mastery_relevant?: boolean
  peak_coach_enabled?: boolean
  teacher_review_required?: boolean
  source?: string
}) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'admin' && role !== 'teacher') throw new Error('Access denied.')
    if (input.source === 'ai_generated' && !input.prompt) throw new Error('AI questions require teacher review before saving.')
    const { admin, session } = await assertTeacherSession(input.session_id, user.id, role)
    const { data, error } = await admin
      .from('learning_questions')
      .insert({
        session_id: input.session_id,
        enrollment_id: session.enrollment_id,
        activity_id: input.activity_id || null,
        objective_id: input.objective_id || null,
        question_type: input.question_type || 'short_answer',
        prompt: input.prompt,
        instructions: input.instructions || null,
        interaction_type: input.interaction_type || 'GENERIC',
        workspace_id: input.workspace_id || null,
        expected_answer: input.expected_answer ?? null,
        answer_model: input.answer_model ?? null,
        validation_model: input.validation_model ?? null,
        marks: input.marks ?? 1,
        difficulty: input.difficulty || 'standard',
        expected_skill: input.expected_skill || null,
        working_required: input.working_required ?? false,
        explanation_required: input.explanation_required ?? false,
        mastery_relevant: input.mastery_relevant ?? true,
        peak_coach_enabled: input.peak_coach_enabled ?? true,
        teacher_review_required: input.teacher_review_required ?? false,
        source: input.source || 'manual',
        created_by: user.id,
      })
      .select()
      .single()
    if (error) throw error
    await logHomeschoolAudit(user.id, 'create', 'question', data.id, null, { prompt: input.prompt })
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getSessionActivities(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    const admin = await createAdminClient()
    const { data: session } = await admin
      .from('learning_sessions')
      .select('enrollment_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) throw new Error('Session not found.')
    await verifyEnrollmentAccess(session.enrollment_id, user.id, role)
    let q = admin
      .from('learning_activities')
      .select(`
        *,
        questions:learning_questions(*)
      `)
      .eq('session_id', sessionId)
      .order('order_index')
    if (role === 'student') q = q.eq('status', 'PUBLISHED')
    const { data, error } = await q
    if (error) throw error
    let standalone: any[] = []
    if (role !== 'student' || true) {
      let sq = admin
        .from('learning_questions')
        .select('*')
        .eq('session_id', sessionId)
        .is('activity_id', null)
        .order('order_index')
      if (role === 'student') sq = sq.eq('status', 'PUBLISHED')
      const { data: sdata } = await sq
      standalone = sdata || []
    }
    return { success: true, data: { activities: data || [], standalone } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getQuestionAttempts(questionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    const admin = await createAdminClient()
    const { data: question } = await admin
      .from('learning_questions')
      .select('id, session_id, enrollment_id')
      .eq('id', questionId)
      .maybeSingle()
    if (!question) throw new Error('Question not found.')
    await verifyEnrollmentAccess((question as any).enrollment_id, user.id, role)
    let q = admin
      .from('question_attempts')
      .select('*')
      .eq('question_id', questionId)
      .order('attempt_number')
    if (role === 'student') {
      const student = await getStudentForUser(user.id)
      q = q.eq('student_id', student.id)
    }
    const { data, error } = await q
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── OBJECTIVE PROGRESSION (§24-25) ────────────────────────────
export type ObjectiveState =
  | 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'ASSESSMENT_READY'
  | 'UNDER_REVIEW' | 'NEEDS_REINFORCEMENT' | 'CORRECTIONS_REQUIRED' | 'MASTERED'

export async function getObjectiveStates(sessionId: string, studentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role === 'student') await verifyStudentOwnership(studentId, user.id)
    const admin = await createAdminClient()

    const { data: objectives } = await admin
      .from('learning_objectives')
      .select('id, title, order_index, is_locked')
      .eq('session_id', sessionId)
      .order('order_index')
    const list = (objectives || []) as any[]
    if (list.length === 0) return { success: true, data: [] }

    const { data: records } = await admin
      .from('objective_mastery_records')
      .select('objective_id, status')
      .eq('student_id', studentId)
      .in('objective_id', list.map((o) => o.id))
    const recordByObj = new Map((records || []).map((r: any) => [r.objective_id, r.status]))

    const { data: attempts } = await admin
      .from('question_attempts')
      .select('objective_id')
      .eq('student_id', studentId)
      .in('objective_id', list.map((o) => o.id))
    const attempted = new Set((attempts || []).map((a: any) => a.objective_id))

    let reached = true
    const states = list.map((o) => {
      let state: ObjectiveState
      const rec = recordByObj.get(o.id)
      if (rec === 'MASTERED') {
        state = 'MASTERED'
      } else if (o.is_locked) {
        state = 'LOCKED'
      } else if (!reached) {
        state = 'LOCKED'
      } else if (rec === 'CORRECTIONS_REQUIRED') {
        state = 'CORRECTIONS_REQUIRED'
      } else if (rec === 'UNDER_REVIEW') {
        state = 'UNDER_REVIEW'
      } else if (rec === 'NEEDS_REINFORCEMENT') {
        state = 'NEEDS_REINFORCEMENT'
      } else if (attempted.has(o.id)) {
        state = 'IN_PROGRESS'
      } else {
        state = 'AVAILABLE'
      }
      // Sequential gate: the first non-mastered, unlocked objective stays
      // reachable; everything after it locks until it is mastered.
      if (state !== 'MASTERED') reached = false
      return { objective_id: o.id, title: o.title, state }
    })

    // Recompute the gate cleanly: first index that is not MASTERED stays reachable
    const firstOpen = states.findIndex((s) => s.state !== 'MASTERED')
    const gated = states.map((s, i) => {
      if (s.state === 'MASTERED') return s
      if (s.state === 'LOCKED') return s
      if (i === firstOpen || firstOpen === -1) return s
      return { ...s, state: 'LOCKED' as ObjectiveState }
    })

    return { success: true, data: gated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── ATTEMPTS (§74, §131) + ERROR INTELLIGENCE (§75-78) ────────

function autoScore(expected: any, given: any): { score: number; is_correct: boolean } | null {
  try {
    const norm = (v: any): string => {
      if (v === null || v === undefined) return ''
      if (typeof v === 'object') return JSON.stringify(v).toLowerCase().trim()
      return String(v).toLowerCase().trim().replace(/\s+/g, ' ')
    }
    if (expected === null || expected === undefined) return null
    if (typeof expected === 'object' && !Array.isArray(expected) && 'value' in (expected as any)) {
      const ok = norm((expected as any).value) === norm(given)
      return { score: ok ? 1 : 0, is_correct: ok }
    }
    const ok = norm(expected) === norm(given)
    return { score: ok ? 1 : 0, is_correct: ok }
  } catch {
    return null
  }
}

export async function submitQuestionAttempt(input: {
  question_id?: string
  session_id: string
  objective_id?: string
  activity_id?: string
  final_answer?: any
  working?: any
  steps?: any[]
  idempotency_key: string
}) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students submit attempts.')
    const student = await getStudentForUser(user.id)
    const admin = await createAdminClient()

    const { data: session } = await admin
      .from('learning_sessions')
      .select('id, enrollment_id')
      .eq('id', input.session_id)
      .maybeSingle()
    if (!session) throw new Error('Session not found.')
    await verifyEnrollmentAccess(session.enrollment_id, user.id, role)

    // Idempotent: same key returns the original attempt (§117)
    const { data: existing } = await admin
      .from('question_attempts')
      .select('*')
      .eq('idempotency_key', input.idempotency_key)
      .maybeSingle()
    if (existing) return { success: true, data: existing, deduped: true }

    let question: any = null
    if (input.question_id) {
      const { data } = await admin
        .from('learning_questions')
        .select('id, marks, expected_answer, mastery_relevant, teacher_review_required')
        .eq('id', input.question_id)
        .maybeSingle()
      question = data
    }

    let attemptNumber = 1
    if (input.question_id) {
      const { data: prior } = await admin
        .from('question_attempts')
        .select('attempt_number')
        .eq('student_id', student.id)
        .eq('question_id', input.question_id)
        .order('attempt_number', { ascending: false })
        .limit(1)
      attemptNumber = ((prior as any[])?.[0]?.attempt_number || 0) + 1
    }

    let score: number | null = null
    let isCorrect: boolean | null = null
    if (question?.expected_answer && !question?.teacher_review_required) {
      const auto = autoScore(question.expected_answer, input.final_answer)
      if (auto) {
        score = auto.score * (question.marks || 1)
        isCorrect = auto.is_correct
      }
    }

    const { data: attempt, error } = await admin
      .from('question_attempts')
      .insert({
        student_id: student.id,
        enrollment_id: session.enrollment_id,
        session_id: input.session_id,
        objective_id: input.objective_id || null,
        activity_id: input.activity_id || null,
        question_id: input.question_id || null,
        attempt_number: attemptNumber,
        final_answer: input.final_answer ?? null,
        working: input.working || {},
        steps: input.steps || [],
        mastery_relevant: question?.mastery_relevant ?? true,
        score,
        max_score: question?.marks ?? null,
        is_correct: isCorrect,
        idempotency_key: input.idempotency_key,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error

    // Background: mastery evaluation + signal detection (never blocks submit)
    try {
      if (input.objective_id) {
        await evaluateObjectiveMastery(input.objective_id, student.id)
        await detectAttemptSignals({
          studentId: student.id,
          enrollmentId: session.enrollment_id,
          sessionId: input.session_id,
          objectiveId: input.objective_id,
          attempt,
        })
      }
    } catch (e) {
      console.error('[learning-engine] post-attempt pipeline failed:', (e as any)?.message)
    }

    return { success: true, data: attempt }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function classifyAttemptError(input: {
  attempt_id: string
  category: string
  note?: string
}) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student' && role !== 'teacher' && role !== 'admin') throw new Error('Access denied.')
    const admin = await createAdminClient()
    const { data: attempt } = await admin
      .from('question_attempts')
      .select('id, student_id, session_id, enrollment_id')
      .eq('id', input.attempt_id)
      .maybeSingle()
    if (!attempt) throw new Error('Attempt not found.')
    if (role === 'student') {
      const student = await getStudentForUser(user.id)
      if (attempt.student_id !== student.id) throw new Error('Access denied.')
    }
    const { data, error } = await admin
      .from('error_classifications')
      .insert({
        attempt_id: input.attempt_id,
        student_id: attempt.student_id,
        session_id: attempt.session_id,
        enrollment_id: attempt.enrollment_id,
        category: input.category,
        student_note: input.note || null,
        confirmed_by: role === 'student' ? 'student' : role,
      })
      .select()
      .single()
    if (error) throw error
    await admin
      .from('question_attempts')
      .update({ error_category: input.category })
      .eq('id', input.attempt_id)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── MASTERY ENGINE (§86-89) ───────────────────────────────────
// Evidence-based. AI signals are advisory only — this function applies
// teacher-defined rules. teacher_approval rules resolve to UNDER_REVIEW.

export async function evaluateObjectiveMastery(objectiveId: string, studentId: string) {
  try {
    const admin = await createAdminClient()
    const { data: objective } = await admin
      .from('learning_objectives')
      .select('id, session_id')
      .eq('id', objectiveId)
      .maybeSingle()
    if (!objective) throw new Error('Objective not found.')

    const { data: session } = await admin
      .from('learning_sessions')
      .select('enrollment_id')
      .eq('id', objective.session_id)
      .maybeSingle()

    const { data: rule } = await admin
      .from('mastery_rules')
      .select('*')
      .eq('objective_id', objectiveId)
      .maybeSingle()
    const ruleType = (rule as any)?.rule_type || 'combined'
    const config = (rule as any)?.config || { threshold: 80, independent_attempts: 2 }

    const { data: attempts } = await admin
      .from('question_attempts')
      .select('id, is_correct, score, max_score, support_level, hints_used')
      .eq('student_id', studentId)
      .eq('objective_id', objectiveId)
      .eq('mastery_relevant', true)
      .order('submitted_at', { ascending: true })

    const list = (attempts || []) as any[]
    const relevant = list.filter((a) => a.is_correct !== null && a.is_correct !== undefined)

    let status = 'IN_PROGRESS'
    const evidence: any = { attempts: list.length, correct: relevant.filter((a) => a.is_correct).length }

    if (ruleType === 'teacher_approval') {
      status = relevant.length > 0 ? 'UNDER_REVIEW' : 'IN_PROGRESS'
    } else if (ruleType === 'completion') {
      const { data: questions } = await admin
        .from('learning_questions')
        .select('id')
        .eq('objective_id', objectiveId)
        .eq('status', 'PUBLISHED')
        .eq('mastery_relevant', true)
      const attemptedQ = new Set(list.map((a) => a.question_id).filter(Boolean))
      const required = (questions || []).map((q: any) => q.id)
      evidence.required = required.length
      evidence.attempted = required.filter((id) => attemptedQ.has(id)).length
      status = required.length > 0 && evidence.attempted >= required.length ? 'MASTERED' : 'IN_PROGRESS'
    } else if (ruleType === 'independent_attempts') {
      const need = config.independent_attempts || 2
      const independent = relevant.filter((a) => a.is_correct && (a.support_level || 0) <= 1).length
      evidence.independent_correct = independent
      evidence.required = need
      status = independent >= need ? 'MASTERED' : 'IN_PROGRESS'
    } else {
      // score_threshold + combined (default): ≥threshold with an independent demonstration
      const threshold = config.threshold || 80
      const totalScore = relevant.reduce((s, a) => s + Number(a.score || 0), 0)
      const totalMax = relevant.reduce((s, a) => s + Number(a.max_score || 1), 0)
      const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
      const independent = relevant.some((a) => a.is_correct && (a.support_level || 0) <= 1)
      evidence.score_percent = pct
      evidence.threshold = threshold
      evidence.independent = independent
      status = relevant.length > 0 && pct >= threshold && (ruleType === 'score_threshold' || independent)
        ? 'MASTERED'
        : 'IN_PROGRESS'
    }

    const { data: prev } = await admin
      .from('objective_mastery_records')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('objective_id', objectiveId)
      .maybeSingle()

    // Never auto-downgrade MASTERED (corrections flow handles regression explicitly)
    if ((prev as any)?.status === 'MASTERED' && status !== 'MASTERED') {
      return { success: true, data: { status: 'MASTERED', unchanged: true } }
    }

    let recordId = (prev as any)?.id
    if (!recordId) {
      const { data: created, error } = await admin
        .from('objective_mastery_records')
        .insert({
          student_id: studentId,
          enrollment_id: session?.enrollment_id,
          session_id: objective.session_id,
          objective_id: objectiveId,
          status,
          evidence,
          evaluated_at: new Date().toISOString(),
          evaluated_by: 'system',
        })
        .select()
        .single()
      if (error) throw error
      recordId = created.id
    } else if ((prev as any).status !== status) {
      await admin
        .from('objective_mastery_records')
        .update({ status, evidence, evaluated_at: new Date().toISOString(), evaluated_by: 'system' })
        .eq('id', recordId)
    }

    await admin.from('mastery_evaluations').insert({
      mastery_record_id: recordId,
      triggered_by: 'attempt',
      result: status,
      detail: evidence,
    })

    // Fresh mastery schedules a Keep-It-Fresh retrieval (§99)
    if (status === 'MASTERED' && (prev as any)?.status !== 'MASTERED') {
      const due = new Date()
      due.setDate(due.getDate() + 3)
      await admin.from('spaced_retrieval_items').insert({
        student_id: studentId,
        enrollment_id: session?.enrollment_id,
        objective_id: objectiveId,
        session_id: objective.session_id,
        status: 'scheduled',
        due_at: due.toISOString(),
      })
    }

    return { success: true, data: { status, evidence } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function overrideObjectiveMastery(input: {
  objective_id: string
  student_id: string
  status: string
  reason: string
}) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'teacher' && role !== 'admin') throw new Error('Only teachers can override mastery.')
    const admin = await createAdminClient()
    const { data: record } = await admin
      .from('objective_mastery_records')
      .select('id, status')
      .eq('student_id', input.student_id)
      .eq('objective_id', input.objective_id)
      .maybeSingle()
    if (!record) throw new Error('No mastery record yet for this objective.')
    const before = { ...(record as any) }
    const { error } = await admin
      .from('objective_mastery_records')
      .update({
        status: input.status,
        override_by: user.id,
        override_reason: input.reason,
        evaluated_at: new Date().toISOString(),
        evaluated_by: role,
      })
      .eq('id', (record as any).id)
    if (error) throw error
    await admin.from('mastery_evaluations').insert({
      mastery_record_id: (record as any).id,
      triggered_by: `${role}_override`,
      result: input.status,
      detail: { reason: input.reason },
    })
    await logHomeschoolAudit(user.id, 'mastery_override', 'objective', input.objective_id, before, { status: input.status }, { reason: input.reason })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getMasteryStatus(studentId: string, enrollmentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role === 'student') await verifyStudentOwnership(studentId, user.id)
    const admin = await createAdminClient()
    const { data: records } = await admin
      .from('objective_mastery_records')
      .select(`
        status, evaluated_at,
        objective:learning_objectives(id, title, session_id,
          session:learning_sessions(subject:subjects(name)))
      `)
      .eq('student_id', studentId)
      .eq('enrollment_id', enrollmentId)
      .order('evaluated_at', { ascending: false })
    const list = (records || []) as any[]
    const canNow = list.filter((r) => r.status === 'MASTERED')
    const strengthening = list.filter((r) =>
      ['IN_PROGRESS', 'NEEDS_REINFORCEMENT', 'CORRECTIONS_REQUIRED', 'UNDER_REVIEW'].includes(r.status)
    )
    return {
      success: true,
      data: {
        canNow: canNow.map((r) => ({
          title: r.objective?.title || 'Objective',
          subject: r.objective?.session?.subject?.name || null,
        })),
        strengthening: strengthening.map((r) => ({
          title: r.objective?.title || 'Objective',
          subject: r.objective?.session?.subject?.name || null,
          status: r.status,
        })),
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── LEARNING SIGNALS (§96-97) ─────────────────────────────────

async function recentSignalExists(
  admin: any,
  studentId: string,
  objectiveId: string | null,
  type: string
) {
  const since = new Date()
  since.setHours(since.getHours() - 24)
  const { data } = await admin
    .from('learning_signals')
    .select('id')
    .eq('student_id', studentId)
    .eq('signal_type', type)
    .eq('status', 'new')
    .gte('created_at', since.toISOString())
    .limit(1)
  void objectiveId
  return (data || []).length > 0
}

async function detectAttemptSignals(args: {
  studentId: string
  enrollmentId: string
  sessionId: string
  objectiveId: string
  attempt: any
}) {
  const admin = await createAdminClient()
  const { studentId, enrollmentId, sessionId, objectiveId, attempt } = args

  const { data: recent } = await admin
    .from('question_attempts')
    .select('is_correct, support_level, submitted_at, started_at, working')
    .eq('student_id', studentId)
    .eq('objective_id', objectiveId)
    .order('submitted_at', { ascending: false })
    .limit(6)
  const list = (recent || []) as any[]
  const wrong = list.filter((a) => a.is_correct === false)

  const emit = async (type: string, severity: string, title: string, detail: string, evidence: any) => {
    if (await recentSignalExists(admin, studentId, objectiveId, type)) return
    await admin.from('learning_signals').insert({
      enrollment_id: enrollmentId,
      student_id: studentId,
      session_id: sessionId,
      objective_id: objectiveId,
      signal_type: type,
      severity,
      title,
      detail,
      evidence,
    })
  }

  if (wrong.length >= 3) {
    await emit(
      'repeated_error', 'watch',
      'Repeated difficulty on an objective',
      `The student has ${wrong.length} incorrect attempts on this objective. Consider a short reinforcement.`,
      { wrong: wrong.length }
    )
  }
  const highSupport = list.filter((a) => (a.support_level || 0) >= 4)
  if (list.length >= 3 && highSupport.length >= 3) {
    await emit(
      'high_support_dependence', 'watch',
      'Substantial support needed recently',
      'The student needed high-level support on most recent attempts. Consider a teacher-led reinforcement session.',
      { highSupport: highSupport.length, of: list.length }
    )
  }
  const lightning = list.filter((a) => {
    try {
      const ms = new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()
      const empty = !a.working || Object.keys(a.working).length === 0
      return a.is_correct === false && ms < 10000 && empty
    } catch {
      return false
    }
  })
  if (lightning.length >= 2) {
    await emit(
      'fast_guessing', 'info',
      'Possible rushing detected',
      'Recent attempts were submitted very quickly without working shown. A gentle nudge to slow down may help.',
      { count: lightning.length }
    )
  }
  void attempt
}

export async function getLearningSignals(enrollmentId: string, status = 'new') {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    await verifyEnrollmentAccess(enrollmentId, user.id, role)
    const admin = await createAdminClient()
    let q = admin
      .from('learning_signals')
      .select(`
        *,
        student:students(id, full_name),
        objective:learning_objectives(id, title)
      `)
      .eq('enrollment_id', enrollmentId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (status !== 'all') q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function acknowledgeSignal(signalId: string, status: 'acknowledged' | 'resolved') {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'teacher' && role !== 'admin') throw new Error('Access denied.')
    const admin = await createAdminClient()
    const { error } = await admin
      .from('learning_signals')
      .update({ status })
      .eq('id', signalId)
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── RETENTION — "Keep It Fresh" (§99-100) ─────────────────────

export async function getDueRetrievals(studentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role === 'student') await verifyStudentOwnership(studentId, user.id)
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('spaced_retrieval_items')
      .select(`
        *,
        objective:learning_objectives(id, title),
        question:learning_questions(id, prompt, question_type, expected_answer, marks)
      `)
      .eq('student_id', studentId)
      .in('status', ['due', 'scheduled'])
      .lte('due_at', new Date().toISOString())
      .order('due_at')
      .limit(5)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function answerRetrieval(retrievalId: string, correct: boolean) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students answer retrieval checks.')
    const admin = await createAdminClient()
    const { data: item } = await admin
      .from('spaced_retrieval_items')
      .select('*')
      .eq('id', retrievalId)
      .maybeSingle()
    if (!item) throw new Error('Retrieval not found.')
    const student = await getStudentForUser(user.id)
    if ((item as any).student_id !== student.id) throw new Error('Access denied.')

    const streak = correct ? ((item as any).streak || 0) + 1 : 0
    const next = new Date()
    // 3 days → 7 days → 14 days on repeated success; back to tomorrow on lapse
    next.setDate(next.getDate() + (correct ? (streak >= 3 ? 14 : streak >= 2 ? 7 : 3) : 1))
    await admin
      .from('spaced_retrieval_items')
      .update({
        status: correct ? 'scheduled' : 'due',
        last_result: correct,
        streak,
        due_at: next.toISOString(),
      })
      .eq('id', retrievalId)

    if (!correct) {
      const { data: existing } = await admin
        .from('learning_signals')
        .select('id')
        .eq('student_id', student.id)
        .eq('objective_id', (item as any).objective_id)
        .eq('signal_type', 'retention_decline')
        .eq('status', 'new')
        .limit(1)
      if (!existing || (existing as any[]).length === 0) {
        await admin.from('learning_signals').insert({
          enrollment_id: (item as any).enrollment_id,
          student_id: student.id,
          session_id: (item as any).session_id,
          objective_id: (item as any).objective_id,
          signal_type: 'retention_decline',
          severity: 'info',
          title: 'Retention check missed',
          detail: 'A previously mastered skill was not retained in a retrieval check. Light reinforcement suggested.',
          evidence: { retrieval_id: retrievalId },
        })
      }
    }
    return { success: true, data: { correct, streak, next_due: next.toISOString() } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── TEACHER DIGEST — today + upcoming + pending review ───────
// Powers the teacher dashboard widget and timetable strips: only
// sessions allocated to THIS teacher, never the whole school.

const DIGEST_DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export async function getTeacherHomeschoolDigest() {
  try {
    const { user } = await getAuthUser()
    const admin = await createAdminClient()
    const { data: teacher } = await admin
      .from('teachers')
      .select('id, full_name')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!teacher) return { success: true, data: null }

    const { data: assignments } = await admin
      .from('homeschool_teacher_assignments')
      .select(`
        enrollment_id,
        enrollment:homeschool_enrollments(id, status, student:students(id, full_name))
      `)
      .eq('teacher_id', (teacher as any).id)
    const enrollments = ((assignments || []) as any[])
      .map((a) => a.enrollment)
      .filter((e) => e && e.status === 'ACTIVE')
    if (enrollments.length === 0) return { success: true, data: { today: [], upcoming: [], pendingReview: [], students: 0 } }

    const enrollmentIds = enrollments.map((e) => e.id)
    const { data: sessions } = await admin
      .from('learning_sessions')
      .select(`
        id, day, start_time, end_time, learning_mode, topic, status, student_status,
        enrollment_id,
        subject:subjects(id, name),
        enrollment:homeschool_enrollments(student:students(id, full_name))
      `)
      .in('enrollment_id', enrollmentIds)
      .eq('teacher_id', (teacher as any).id)
      .neq('status', 'CANCELLED')
      .order('start_time')

    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const todayIdx = DIGEST_DAY_ORDER.indexOf(todayName)
    const list = (sessions || []) as any[]
    const withStudent = list.map((s) => ({
      ...s,
      student_name: s.enrollment?.student?.full_name || 'Student',
      student_id: s.enrollment?.student?.id || null,
    }))
    const today = withStudent
      .filter((s) => s.day === todayName)
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
    const upcoming = withStudent
      .map((s) => ({ ...s, distance: (DIGEST_DAY_ORDER.indexOf(s.day) - todayIdx + 7) % 7 }))
      .filter((s) => s.distance > 0)
      .sort((a, b) => a.distance - b.distance || String(a.start_time).localeCompare(String(b.start_time)))
      .slice(0, 4)

    // Pending review: submitted work on my sessions' linked assignments
    const sessionIds = list.map((s) => s.id)
    let pendingReview: any[] = []
    if (sessionIds.length > 0) {
      const { data: linked } = await admin
        .from('assignments')
        .select('id')
        .in('session_id', sessionIds)
      const assignmentIds = ((linked || []) as any[]).map((a) => a.id)
      if (assignmentIds.length > 0) {
        const { data: subs } = await admin
          .from('submissions')
          .select('id, submitted_at, student:students(id, full_name), assignment:assignments(id, title)')
          .in('assignment_id', assignmentIds)
          .eq('status', 'submitted')
          .order('submitted_at')
          .limit(6)
        pendingReview = (subs || []) as any[]
      }
    }

    return {
      success: true,
      data: {
        today,
        upcoming: upcoming.map(({ distance, ...s }) => ({
          ...s,
          day_label: distance === 1 ? 'Tomorrow' : s.day,
        })),
        pendingReview,
        students: new Set(enrollments.map((e) => e.student?.id).filter(Boolean)).size,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── PARENT WEEKLY STORY (§106) ────────────────────────────────
// Deterministic narrative grounded ONLY in database facts.
// The database is the source of truth; this function summarizes.

export async function generateWeeklyStory(enrollmentId: string, weekId: string) {
  try {
    const { user } = await getAuthUser()
    const admin = await createAdminClient()
    const { data: week } = await admin
      .from('homeschool_weeks')
      .select('id, title, week_number, enrollment_id, status')
      .eq('id', weekId)
      .maybeSingle()
    if (!week || (week as any).enrollment_id !== enrollmentId) throw new Error('Week not found.')

    const { data: sessions } = await admin
      .from('learning_sessions')
      .select(`
        id, topic, status, student_status,
        subject:subjects(name),
        objectives:learning_objectives(id, title, is_completed)
      `)
      .eq('week_id', weekId)
      .neq('status', 'CANCELLED')
    const list = (sessions || []) as any[]
    const completed = list.filter((s) => s.student_status === 'COMPLETED' || s.status === 'COMPLETED')
    const corrections = list.filter((s) => s.status === 'CORRECTIONS_REQUIRED')

    const { data: attempts } = await admin
      .from('question_attempts')
      .select('is_correct')
      .eq('enrollment_id', enrollmentId)
      .in('session_id', list.map((s) => s.id))
    const attList = (attempts || []) as any[]

    const { data: errors } = await admin
      .from('error_classifications')
      .select('category')
      .eq('enrollment_id', enrollmentId)
      .in('session_id', list.map((s) => s.id))
      .limit(20)
    const topError = (() => {
      const counts = new Map<string, number>()
      for (const e of (errors || []) as any[]) counts.set(e.category, (counts.get(e.category) || 0) + 1)
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      return top ? top[0].replace(/_/g, ' ') : null
    })()

    const sentences: string[] = []
    const weekTitle = (week as any).title || `Week ${(week as any).week_number}`
    if (list.length === 0) {
      sentences.push(`${weekTitle} has no scheduled sessions yet.`)
    } else {
      const subjects = [...new Set(list.map((s) => s.subject?.name).filter(Boolean))]
      sentences.push(
        `${weekTitle} covered ${list.length} session${list.length === 1 ? '' : 's'}` +
          (subjects.length ? ` across ${subjects.join(', ')}` : '') +
          `, with ${completed.length} completed.`
      )
    }
    if (attList.length > 0) {
      const right = attList.filter((a) => a.is_correct).length
      sentences.push(`${right} of ${attList.length} recorded attempts were correct.`)
    }
    if (topError) sentences.push(`The most common difficulty was ${topError}.`)
    if (corrections.length > 0) {
      sentences.push(`${corrections.length} session${corrections.length === 1 ? ' needs' : 's need'} correction — each correction is evidence of growth.`)
    } else if (completed.length === list.length && list.length > 0) {
      sentences.push('Everything scheduled was completed — strong consistency this week.')
    }

    void user
    return { success: true, data: { story: sentences.join(' ') } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
