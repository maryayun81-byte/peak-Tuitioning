'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'
import { spotlightData } from '@/lib/spotlight'
import { sendPushNotification } from '@/app/actions/push'

export interface ExamScriptIntake {
  studentId: string
  photoUrls: string[]
}

export interface IntakeExamScriptsInput {
  examEventId: string
  classId: string
  subjectId: string
  teacherId: string
  totalMarks: number
  title?: string
  scripts: ExamScriptIntake[]
}

/**
 * Admin script intake: photographed physical exam scripts become a workbook
 * assignment linked to the exam event, with one submitted submission per
 * student — so the assigned teacher marks remotely in the normal marking
 * workspace, and marks later flow into exam_marks via the marking bridge.
 */
export async function intakeExamScripts(input: IntakeExamScriptsInput) {
  try {
    await requireAdmin()
    const admin = await createAdminClient()

    const { examEventId, classId, subjectId, teacherId } = input
    const totalMarks = Math.max(1, Math.round(Number(input.totalMarks) || 0))
    if (!examEventId || !classId || !subjectId || !teacherId) {
      throw new Error('Exam, class, subject and marking teacher are all required.')
    }
    const scripts = (input.scripts || []).filter(
      (s) => s?.studentId && Array.isArray(s.photoUrls) && s.photoUrls.length > 0
    )
    if (scripts.length === 0) throw new Error('Upload at least one photo for at least one student.')

    const [{ data: exam }, { data: cls }, { data: subject }, { data: teacher }] = await Promise.all([
      admin.from('exam_events').select('id, name').eq('id', examEventId).maybeSingle(),
      admin.from('classes').select('id, name').eq('id', classId).maybeSingle(),
      admin.from('subjects').select('id, name').eq('id', subjectId).maybeSingle(),
      admin.from('teachers').select('id, full_name, user_id').eq('id', teacherId).maybeSingle(),
    ])
    if (!exam) throw new Error('Exam event not found.')
    if (!teacher) throw new Error('Marking teacher not found.')

    const studentIds = scripts.map((s) => s.studentId)
    const { data: students } = await admin
      .from('students')
      .select('id, full_name, class_id, tuition_center_id')
      .in('id', studentIds)
    const byId = new Map(((students || []) as any[]).map((s: any) => [s.id, s]))
    const valid = scripts.filter((s) => byId.has(s.studentId))
    if (valid.length === 0) throw new Error('None of the selected students were found.')

    const title =
      input.title?.trim() ||
      `${(exam as any).name} – ${(subject as any)?.name || 'Paper'} (${(cls as any)?.name || 'Class'}) – Scripts`
    const centerId = (([...byId.values()][0] as any)?.tuition_center_id as string | null) || null

    const baseRow: Record<string, any> = {
      title,
      class_id: classId,
      subject_id: subjectId,
      tuition_center_id: centerId,
      status: 'published',
      teacher_id: teacherId,
      worksheet: [],
      content: '[]',
      total_marks: totalMarks,
      max_marks: totalMarks,
      is_workbook: true,
      audience: 'selected_students',
      selected_student_ids: valid.map((s) => s.studentId),
      lock_after_deadline: false,
    }

    // exam_event_id exists after the Phase A migration; older DBs fall back
    // to an unlinked workbook (marking still works, marks bridge skips).
    let assignment: any = null
    {
      const { data, error } = await admin
        .from('assignments')
        .insert({ ...baseRow, exam_event_id: examEventId })
        .select('id')
        .single()
      if (error && /exam_event_id/i.test(error.message || '')) {
        console.warn('[ExamIntake] exam_event_id column missing — run the Phase A migration. Creating unlinked assignment.')
        const retry = await admin.from('assignments').insert(baseRow).select('id').single()
        if (retry.error) throw retry.error
        assignment = retry.data
      } else if (error) {
        throw error
      } else {
        assignment = data
      }
    }

    const rows = valid.map((s) => ({
      assignment_id: assignment.id,
      student_id: s.studentId,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      worksheet_answers: {
        __workbook_photos__: s.photoUrls,
        __workbook_photo__: s.photoUrls[0],
      },
      question_marks: {},
      marks: 0,
    }))
    const { error: subError } = await admin
      .from('submissions')
      .upsert(rows, { onConflict: 'assignment_id,student_id' })
    if (subError) throw subError

    // Notify the marking teacher with a snapshot card + push.
    try {
      const teacherUserId = (teacher as any)?.user_id
      if (teacherUserId) {
        await admin.from('notifications').insert({
          user_id: teacherUserId,
          type: 'scripts_ready',
          title: '📸 Exam scripts ready to mark',
          body: `${valid.length} script${valid.length === 1 ? '' : 's'} for "${title}" are waiting in your marking queue.`,
          data: {
            assignment_id: assignment.id,
            exam_event_id: examEventId,
            ...spotlightData('scripts_ready', `/teacher/marking?assignment_id=${assignment.id}`, {
              title,
              exam: (exam as any).name,
              subject: (subject as any)?.name || null,
              scripts: `${valid.length} script${valid.length === 1 ? '' : 's'}`,
            }),
          },
        })
        await sendPushNotification([teacherUserId], {
          title: '📸 Exam scripts ready',
          body: `${valid.length} script${valid.length === 1 ? '' : 's'} for "${title}" are waiting.`,
          href: `/teacher/marking?assignment_id=${assignment.id}`,
        })
      }
    } catch (notifyErr) {
      console.warn('[ExamIntake] Teacher notification failed:', notifyErr)
    }

    return { success: true, data: { assignmentId: assignment.id, scripts: valid.length } }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Script intake failed.' }
  }
}
