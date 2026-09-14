'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getAuthUser } from './homeschooling'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'
import { logHomeschoolAudit } from './homeschooling'

// ============================================================
// AI SUBMISSION MARKING — the model reads photos of student work
// and drafts annotations + corrections. A teacher must review and
// accept before anything reaches the student. Teacher judgment
// is final; AI output is always labeled as a draft.
// ============================================================

const MAX_IMAGES = 4

async function resolveTeacher(admin: any, userId: string) {
  const { data } = await admin
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

async function assertMarkingAccess(admin: any, userId: string, role: string, submission: any) {
  if (role === 'admin') return
  if (role !== 'teacher') throw new Error('Only teachers can use AI marking.')
  const teacher = await resolveTeacher(admin, userId)
  if (!teacher) throw new Error('Teacher profile not found.')

  // Homeschool path: assigned to the session's enrollment
  if (submission.session_id) {
    const { data: session } = await admin
      .from('learning_sessions')
      .select('enrollment_id')
      .eq('id', submission.session_id)
      .maybeSingle()
    if (session) {
      const { data: ta } = await admin
        .from('homeschool_teacher_assignments')
        .select('id')
        .eq('enrollment_id', session.enrollment_id)
        .eq('teacher_id', teacher.id)
        .maybeSingle()
      if (ta) return
    }
  }
  // Group-tuition path: assigned to the assignment's class + subject
  const { data: assignment } = await admin
    .from('assignments')
    .select('class_id, subject_id')
    .eq('id', submission.assignment_id)
    .maybeSingle()
  if (assignment?.class_id && assignment?.subject_id) {
    const { data: ta } = await admin
      .from('teacher_assignments')
      .select('id')
      .eq('class_id', assignment.class_id)
      .eq('subject_id', assignment.subject_id)
      .eq('teacher_id', teacher.id)
      .maybeSingle()
    if (ta) return
  }
  throw new Error('Access denied: not assigned to this submission.')
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > 12 * 1024 * 1024) return null
    return { base64: buf.toString('base64'), mimeType: contentType.split(';')[0] }
  } catch {
    return null
  }
}

function buildMarkingPrompt(input: {
  subject: string
  assignmentTitle: string
  maxMarks: number | null
  topic: string | null
  imageCount: number
}) {
  return `You are an expert teacher marking a student's handwritten work from a photo. Be fair, specific, and kind. Never invent work you cannot see.

Subject: ${input.subject}
Assignment: ${input.assignmentTitle}
Topic: ${input.topic || '—'}
Max marks: ${input.maxMarks ?? 'unknown'}
You are shown ${input.imageCount} photo(s) of the student's work, in order.

Return ONLY valid JSON with this exact shape:
{
  "annotations": [
    { "image_index": 0, "x": 50, "y": 30, "kind": "correct|error|info", "label": "Q1", "comment": "short note" }
  ],
  "findings": [
    { "ref": "Q1", "verdict": "correct|partial|incorrect|unclear", "comment": "what you see", "marks_awarded": 0, "marks_max": 1 }
  ],
  "suggested_marks": 0,
  "feedback_draft": "2-4 sentences for the student, warm and specific",
  "strengths_draft": "what was done well",
  "weaknesses_draft": "what to fix next",
  "corrections_draft": [ { "ref": "Q2", "instruction": "what to redo and how" } ]
}

Rules:
- x and y are 0-100 positions on the image where the annotation belongs.
- Only mark what is legible. If handwriting is unreadable, say so in the comment and use verdict "unclear" — never guess.
- suggested_marks must equal the sum of findings marks_awarded and not exceed max marks.
- corrections_draft only for items that genuinely need redoing.`
}

export async function requestAiMarking(submissionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = (user.user_metadata as any)?.role || (user.app_metadata as any)?.role || 'teacher'
    const admin = await createAdminClient()

    const { data: submission } = await admin
      .from('submissions')
      .select('id, assignment_id, student_id, content, status, session_id')
      .eq('id', submissionId)
      .maybeSingle()
    if (!submission) throw new Error('Submission not found.')
    await assertMarkingAccess(admin, user.id, role, submission)

    let content: any = {}
    try {
      content = JSON.parse((submission as any).content || '{}')
    } catch { /* ignore */ }
    const fileUrls: string[] = Array.isArray(content.files) ? content.files : []
    if (fileUrls.length === 0 && !content.text?.trim()) {
      throw new Error('Nothing to mark yet — no files or written answer submitted.')
    }

    const { data: assignment } = await admin
      .from('assignments')
      .select('id, title, max_marks, subject:subjects(name)')
      .eq('id', (submission as any).assignment_id)
      .maybeSingle()

    let topic: string | null = null
    let enrollmentId: string | null = null
    let sessionId: string | null = (submission as any).session_id || content.session_id || null
    if (sessionId) {
      const { data: session } = await admin
        .from('learning_sessions')
        .select('topic, enrollment_id')
        .eq('id', sessionId)
        .maybeSingle()
      topic = (session as any)?.topic || null
      enrollmentId = (session as any)?.enrollment_id || null
    }

    // Collect readable images (photos of handwritten work)
    const images: Array<{ base64: string; mimeType: string; url: string }> = []
    for (const url of fileUrls.slice(0, MAX_IMAGES)) {
      const img = await fetchImageAsBase64(url)
      if (img) images.push({ ...img, url })
    }

    if (images.length === 0) {
      throw new Error(
        content.text?.trim()
          ? 'No readable photos found — text-only work still needs teacher marking.'
          : 'No readable images found in this submission.'
      )
    }

    if (!hasGeminiToken()) throw new Error('AI marking is not configured (missing API key).')

    const subject = (assignment as any)?.subject?.name || 'General'
    const prompt = buildMarkingPrompt({
      subject,
      assignmentTitle: (assignment as any)?.title || 'Assignment',
      maxMarks: (assignment as any)?.max_marks ?? null,
      topic,
      imageCount: images.length,
    })

    const result = await callGeminiChat(
      [
        { role: 'system', content: 'You return only valid JSON. No markdown fences, no commentary.' },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.2,
        maxTokens: 4000,
        responseFormat: { type: 'json_object' },
        images: images.map(({ base64, mimeType }) => ({ base64, mimeType })),
      }
    )

    let parsed: any
    try {
      parsed = JSON.parse(result.content)
    } catch {
      throw new Error('The model returned an unreadable response. Try again.')
    }

    const annotations = Array.isArray(parsed.annotations) ? parsed.annotations.slice(0, 30) : []
    const findings = Array.isArray(parsed.findings) ? parsed.findings.slice(0, 30) : []
    const corrections = Array.isArray(parsed.corrections_draft) ? parsed.corrections_draft.slice(0, 20) : []
    const maxMarks = (assignment as any)?.max_marks ?? null
    let suggested = Number(parsed.suggested_marks)
    if (!Number.isFinite(suggested)) {
      suggested = findings.reduce((s: number, f: any) => s + (Number(f.marks_awarded) || 0), 0)
    }
    if (maxMarks != null) suggested = Math.min(suggested, Number(maxMarks))

    const { data: marking, error } = await admin
      .from('ai_submission_marks')
      .upsert(
        {
          submission_id: submissionId,
          enrollment_id: enrollmentId,
          session_id: sessionId,
          student_id: (submission as any).student_id,
          assignment_id: (submission as any).assignment_id,
          image_urls: images.map((i) => i.url),
          annotations,
          findings,
          suggested_marks: suggested,
          max_marks: maxMarks,
          feedback_draft: String(parsed.feedback_draft || ''),
          strengths_draft: String(parsed.strengths_draft || ''),
          weaknesses_draft: String(parsed.weaknesses_draft || ''),
          corrections_draft: corrections,
          model: result.model,
          status: 'pending_review',
          error: null,
          requested_by: user.id,
        },
        { onConflict: 'submission_id' }
      )
      .select()
      .single()
    if (error) throw error

    await logHomeschoolAudit(user.id, 'ai_mark', 'submission', submissionId, null, { marking_id: marking.id }, { model: result.model })
    return { success: true, data: marking }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getAiMarking(submissionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = (user.user_metadata as any)?.role || (user.app_metadata as any)?.role || 'teacher'
    const admin = await createAdminClient()
    const { data: submission } = await admin
      .from('submissions')
      .select('id, assignment_id, session_id')
      .eq('id', submissionId)
      .maybeSingle()
    if (!submission) throw new Error('Submission not found.')
    await assertMarkingAccess(admin, user.id, role, submission)
    const { data } = await admin
      .from('ai_submission_marks')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle()
    return { success: true, data: data || null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function acceptAiMarking(
  markingId: string,
  input: { marks?: number | null; feedback?: string; strengths?: string; weaknesses?: string; requestCorrections?: boolean }
) {
  try {
    const { user } = await getAuthUser()
    const role = (user.user_metadata as any)?.role || (user.app_metadata as any)?.role || 'teacher'
    const admin = await createAdminClient()
    const { data: marking } = await admin
      .from('ai_submission_marks')
      .select('*')
      .eq('id', markingId)
      .maybeSingle()
    if (!marking) throw new Error('AI marking not found.')
    const { data: submission } = await admin
      .from('submissions')
      .select('id, assignment_id, session_id')
      .eq('id', (marking as any).submission_id)
      .maybeSingle()
    await assertMarkingAccess(admin, user.id, role, submission)

    const teacher = role === 'admin' ? null : await resolveTeacher(admin, user.id)

    // Teacher-edited values win; AI draft is the starting point.
    const marks = input.marks ?? (marking as any).suggested_marks ?? null
    const feedback = (input.feedback ?? (marking as any).feedback_draft ?? '').toString()
    const strengths = (input.strengths ?? (marking as any).strengths_draft ?? '').toString()
    const weaknesses = (input.weaknesses ?? (marking as any).weaknesses_draft ?? '').toString()

    const { error: subError } = await admin
      .from('submissions')
      .update({
        marks,
        feedback: feedback || null,
        strengths: strengths || null,
        weaknesses: weaknesses || null,
        status: 'marked',
        marked_at: new Date().toISOString(),
      })
      .eq('id', (marking as any).submission_id)
    if (subError) throw subError

    // Persist accepted annotations onto the shared annotations canvas store
    // so they render wherever teacher annotations render.
    if (teacher && Array.isArray((marking as any).annotations) && (marking as any).annotations.length > 0) {
      await admin.from('annotations').upsert(
        {
          submission_id: (marking as any).submission_id,
          teacher_id: teacher.id,
          canvas_state_json: JSON.stringify({
            source: 'ai_accepted',
            marking_id: markingId,
            annotations: (marking as any).annotations,
          }),
        },
        { onConflict: 'submission_id' }
      )
    }

    await admin
      .from('ai_submission_marks')
      .update({ status: 'accepted', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', markingId)

    // If the teacher also wants corrections, route through the existing flow.
    if (input.requestCorrections && (marking as any).session_id) {
      await admin
        .from('learning_sessions')
        .update({ status: 'CORRECTIONS_REQUIRED' })
        .eq('id', (marking as any).session_id)
    }

    await logHomeschoolAudit(user.id, 'ai_mark_accept', 'submission', (marking as any).submission_id, { marking_id: markingId }, { marks })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function dismissAiMarking(markingId: string) {
  try {
    const { user } = await getAuthUser()
    const role = (user.user_metadata as any)?.role || (user.app_metadata as any)?.role || 'teacher'
    const admin = await createAdminClient()
    const { data: marking } = await admin
      .from('ai_submission_marks')
      .select('submission_id')
      .eq('id', markingId)
      .maybeSingle()
    if (!marking) throw new Error('AI marking not found.')
    const { data: submission } = await admin
      .from('submissions')
      .select('id, assignment_id, session_id')
      .eq('id', (marking as any).submission_id)
      .maybeSingle()
    await assertMarkingAccess(admin, user.id, role, submission)
    await admin
      .from('ai_submission_marks')
      .update({ status: 'dismissed', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', markingId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
