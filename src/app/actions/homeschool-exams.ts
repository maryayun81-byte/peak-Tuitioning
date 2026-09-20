'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'

/**
 * Homeschool + tuition unified exam control plane.
 * Single result engine: exam_marks with result_status
 * submitted -> marked -> verified -> published.
 * Grades always come from grading_systems/grading_scales.
 */

export async function getExamControlCenter(examEventId: string) {
  try {
    await requireAdmin()
    const admin = await createAdminClient()

    const [{ data: event }, { data: subjects }, { data: timetable }, { data: marks }, { data: papers }] =
      await Promise.all([
        admin.from('exam_events').select('*, curriculum:curriculums(name)').eq('id', examEventId).maybeSingle(),
        admin.from('exam_event_subjects').select('*, subject:subjects(name), teacher:teachers(full_name)').eq('exam_event_id', examEventId).order('created_at'),
        admin.from('exam_timetable').select('*, subject:subjects(name)').eq('exam_event_id', examEventId).order('starts_at'),
        admin.from('exam_marks').select('id, student_id, subject_id, marks, max_marks, grade, result_status, teacher_comment').eq('exam_event_id', examEventId),
        admin.from('exam_physical_papers').select('id, student_id, subject_id, status, assigned_teacher_id').eq('exam_event_id', examEventId),
      ])

    if (!event) throw new Error('Exam event not found.')

    const bySubject: Record<string, { total: number; marked: number; verified: number; published: number }> = {}
    for (const m of (marks || []) as any[]) {
      const k = m.subject_id || 'unknown'
      bySubject[k] = bySubject[k] || { total: 0, marked: 0, verified: 0, published: 0 }
      bySubject[k].total += 1
      if (['marked', 'verified', 'published'].includes(m.result_status)) bySubject[k].marked += 1
      if (['verified', 'published'].includes(m.result_status)) bySubject[k].verified += 1
      if (m.result_status === 'published') bySubject[k].published += 1
    }

    const attention: string[] = []
    for (const s of (subjects || []) as any[]) {
      const st = bySubject[s.subject_id] || { total: 0, marked: 0, verified: 0, published: 0 }
      if (s.delivery_mode !== 'online' && st.total === 0) {
        const pending = ((papers || []) as any[]).filter(p => p.subject_id === s.subject_id && !['marked', 'returned', 'verified', 'published'].includes(p.status))
        if (pending.length > 0) attention.push(`${s.subject?.name || 'Subject'}: ${pending.length} paper(s) awaiting marking`)
        else attention.push(`${s.subject?.name || 'Subject'}: no results submitted yet`)
      }
      if (st.total > 0 && st.verified < st.total) attention.push(`${s.subject?.name || 'Subject'}: ${st.total - st.verified} result(s) awaiting verification`)
    }

    return { success: true, data: { event, subjects: subjects || [], timetable: timetable || [], marks: marks || [], papers: papers || [], bySubject, attention } }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to load control center.' }
  }
}

export async function upsertExamSubject(input: {
  id?: string
  exam_event_id: string
  subject_id: string
  class_id?: string | null
  teacher_id?: string | null
  delivery_mode: 'online' | 'physical' | 'hybrid'
  exam_id?: string | null
  total_marks?: number
  time_allowed_minutes?: number | null
}) {
  try {
    await requireAdmin()
    const admin = await createAdminClient()
    const row: any = {
      exam_event_id: input.exam_event_id,
      subject_id: input.subject_id,
      class_id: input.class_id || null,
      teacher_id: input.teacher_id || null,
      delivery_mode: input.delivery_mode,
      exam_id: input.exam_id || null,
      total_marks: input.total_marks || 100,
      time_allowed_minutes: input.time_allowed_minutes || null,
    }
    let res
    if (input.id) res = await admin.from('exam_event_subjects').update({ ...row, updated_at: new Date().toISOString() }).eq('id', input.id).select().single()
    else res = await admin.from('exam_event_subjects').insert(row).select().single()
    if (res.error) throw res.error
    return { success: true, data: res.data }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Save failed.' }
  }
}

export async function upsertTimetableEntry(input: {
  id?: string
  exam_event_id: string
  event_subject_id?: string | null
  subject_id?: string | null
  starts_at: string
  ends_at: string
}) {
  try {
    await requireAdmin()
    const admin = await createAdminClient()
    if (new Date(input.ends_at) <= new Date(input.starts_at)) throw new Error('End must be after start.')
    const row: any = {
      exam_event_id: input.exam_event_id,
      event_subject_id: input.event_subject_id || null,
      subject_id: input.subject_id || null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
    }
    let res
    if (input.id) res = await admin.from('exam_timetable').update(row).eq('id', input.id).select().single()
    else res = await admin.from('exam_timetable').insert(row).select().single()
    if (res.error) throw res.error
    return { success: true, data: res.data }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Timetable save failed.' }
  }
}

async function audit(admin: any, row: any) {
  try { await admin.from('exam_result_audit').insert(row) } catch { /* audit never blocks */ }
}

export async function verifyExamResults(examEventId: string, subjectId?: string | null) {
  try {
    const admin = await createAdminClient()
    const me = await requireAdmin()
    let q = admin.from('exam_marks').select('id, marks').eq('exam_event_id', examEventId).eq('result_status', 'marked')
    if (subjectId) q = q.eq('subject_id', subjectId)
    const { data, error } = await q
    if (error) throw error
    if (!data || data.length === 0) return { success: true, data: { verified: 0 } }
    const ids = data.map((m: any) => m.id)
    const { error: uErr } = await admin.from('exam_marks').update({ result_status: 'verified', verified_at: new Date().toISOString(), verified_by: (me as any)?.id || null }).in('id', ids)
    if (uErr) throw uErr
    for (const m of data as any[]) await audit(admin, { exam_event_id: examEventId, exam_mark_id: m.id, actor_role: 'admin', action: 'verified', new_marks: m.marks })
    return { success: true, data: { verified: ids.length } }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Verify failed.' }
  }
}

export async function publishExamResults(examEventId: string) {
  try {
    await requireAdmin()
    const admin = await createAdminClient()
    const { data: marks, error } = await admin.from('exam_marks').select('id, student_id, marks').eq('exam_event_id', examEventId).in('result_status', ['marked', 'verified'])
    if (error) throw error
    if (marks && marks.length > 0) {
      const ids = marks.map((m: any) => m.id)
      const { error: uErr } = await admin.from('exam_marks').update({ result_status: 'published', published_at: new Date().toISOString() }).in('id', ids)
      if (uErr) throw uErr
      for (const m of marks as any[]) await audit(admin, { exam_event_id: examEventId, exam_mark_id: m.id, student_id: m.student_id, actor_role: 'admin', action: 'published', new_marks: m.marks })
      // Notify students with published results
      try {
        const { data: students } = await admin.from('students').select('user_id').in('id', Array.from(new Set(marks.map((m: any) => m.student_id))))
        const uids = (students || []).map((s: any) => s.user_id).filter(Boolean)
        if (uids.length > 0) {
          await admin.from('notifications').insert(uids.map((uid: string) => ({
            user_id: uid,
            type: 'results_published',
            title: 'Exam Results Published',
            body: 'Your exam results have been published. Check your portal.',
            data: { exam_event_id: examEventId },
          })))
        }
      } catch { /* notify best-effort */ }
    }
    // Mark transcripts published where they exist for this event
    await admin.from('transcripts').update({ is_published: true, published_at: new Date().toISOString() }).eq('exam_event_id', examEventId)
    await admin.from('exam_events').update({ status: 'published' }).eq('id', examEventId)
    return { success: true, data: { published: marks?.length || 0 } }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Publish failed.' }
  }
}

export async function reopenExamResult(examMarkId: string, reason: string) {
  try {
    await requireAdmin()
    const admin = await createAdminClient()
    const { data: mark } = await admin.from('exam_marks').select('id, exam_event_id, student_id, subject_id, marks').eq('id', examMarkId).maybeSingle()
    if (!mark) throw new Error('Result not found.')
    const { error } = await admin.from('exam_marks').update({ result_status: 'marked' }).eq('id', examMarkId)
    if (error) throw error
    await audit(admin, { exam_event_id: (mark as any).exam_event_id, exam_mark_id: examMarkId, student_id: (mark as any).student_id, subject_id: (mark as any).subject_id, actor_role: 'admin', action: 'reopened', old_marks: (mark as any).marks, new_marks: (mark as any).marks, reason })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Reopen failed.' }
  }
}

/**
 * Generate / refresh transcript rows for an exam event from verified+
 * exam_marks, using grading_systems:
 * - per-subject grade already stored on exam_marks.grade
 * - overall average -> is_overall system -> overall_grade + points
 */
export async function generateExamReports(examEventId: string) {
  try {
    await requireAdmin()
    const admin = await createAdminClient()
    const { data: event } = await admin.from('exam_events').select('id, tuition_event_id, enrollment_id, curriculum_id').eq('id', examEventId).maybeSingle()
    if (!event) throw new Error('Exam event not found.')

    const { data: marks } = await admin
      .from('exam_marks')
      .select('id, student_id, subject_id, class_id, marks, max_marks, grade, grading_system_id, teacher_comment, subject:subjects(name)')
      .eq('exam_event_id', examEventId)
      .in('result_status', ['marked', 'verified', 'published'])
    if (!marks || marks.length === 0) throw new Error('No verified marks yet.')

    // Live paper totals (admin may correct totals after marking — the live
    // configured total wins over the snapshot stored at entry time).
    const { data: configuredSubjects } = await admin
      .from('exam_event_subjects')
      .select('subject_id, total_marks')
      .eq('exam_event_id', examEventId)
    const liveTotals: Record<string, number> = {}
    for (const s of (configuredSubjects || []) as any[]) {
      const t = Number(s.total_marks)
      if (s.subject_id && t > 0) liveTotals[s.subject_id] = t
    }
    const totalFor = (m: any) =>
      liveTotals[m.subject_id] || Number(m.max_marks) || 100

    // Heal stored snapshots so published rows stay consistent with live totals.
    // Grade is recomputed from the corrected percentage via the configured
    // grading system (same hierarchy as the teacher UI).
    const curriculumId = (event as any)?.curriculum_id || null
    for (const m of marks as any[]) {
      const t = totalFor(m)
      const pct = Math.round((Number(m.marks) / t) * 10000) / 100
      let grade = m.grade
      let systemId: string | null = (m as any).grading_system_id || null
      if (curriculumId) {
        try {
          const { data: g } = await admin.rpc('exam_grade_for_mark', {
            p_curriculum_id: curriculumId,
            p_mark: pct,
            p_subject_id: m.subject_id,
            p_class_id: (m as any).class_id || null,
          })
          const row = Array.isArray(g) ? g[0] : null
          if (row) { grade = row.grade; systemId = row.system_id || systemId }
        } catch { /* keep stored grade */ }
      }
      await admin.from('exam_marks').update({ max_marks: t, percentage: pct, grade, grading_system_id: systemId }).eq('id', m.id)
      m.max_marks = t
      m.grade = grade
    }

    // Overall grading system for this curriculum
    let overallSystem: any = null
    if ((event as any).curriculum_id) {
      const { data: systems } = await admin.from('grading_systems').select('id, scales:grading_scales(*)').eq('curriculum_id', (event as any).curriculum_id).eq('is_overall', true).limit(1)
      overallSystem = systems?.[0] || null
    }

    const byStudent: Record<string, any[]> = {}
    for (const m of marks as any[]) (byStudent[m.student_id] = byStudent[m.student_id] || []).push(m)

    let written = 0
    for (const [studentId, rows] of Object.entries(byStudent)) {
      const subject_results = rows.map((r: any) => {
        const t = totalFor(r)
        return {
          subject_id: r.subject_id,
          subject_name: r.subject?.name || 'Subject',
          marks: Number(r.marks),
          max_marks: t,
          percentage: Math.round((Number(r.marks) / t) * 10000) / 100,
          grade: r.grade || null,
          comment: r.teacher_comment || null,
        }
      })
      const avg = subject_results.reduce((s, r) => s + r.percentage, 0) / subject_results.length
      let overall_grade: string | null = null
      let overall_points: number | null = null
      let grading_system_id: string | null = null
      if (overallSystem) {
        const scale = (overallSystem.scales || []).find((s: any) => avg >= Number(s.min_score) && avg <= Number(s.max_score))
        if (scale) { overall_grade = scale.grade; overall_points = scale.points; grading_system_id = overallSystem.id }
      }
      const payload: any = {
        student_id: studentId,
        exam_event_id: examEventId,
        subject_results,
        overall_grade,
        overall_points,
        grading_system_id,
        remarks: `Average ${Math.round(avg * 100) / 100}% across ${subject_results.length} subject(s).`,
      }
      if ((event as any).tuition_event_id) payload.tuition_event_id = (event as any).tuition_event_id
      // transcripts.tuition_event_id is NOT NULL in base schema; homeschool
      // events carry enrollment_id instead — fall back to any active tuition
      // event row only to satisfy the constraint, real link is enrollment_id.
      if (!payload.tuition_event_id) {
        const { data: anyTuition } = await admin.from('tuition_events').select('id').limit(1).maybeSingle()
        if (!anyTuition) throw new Error('No tuition event row available for transcript constraint.')
        payload.tuition_event_id = (anyTuition as any).id
      }
      if ((event as any).enrollment_id) payload.enrollment_id = (event as any).enrollment_id
      const { error } = await admin.from('transcripts').upsert(payload, { onConflict: 'student_id,exam_event_id' })
      if (error) throw error
      written += 1
    }
    await admin.from('exam_events').update({ status: 'generated' }).eq('id', examEventId)
    return { success: true, data: { reports: written } }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Report generation failed.' }
  }
}
