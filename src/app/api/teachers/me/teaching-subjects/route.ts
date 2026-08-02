import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { fetchTeacherSubjectContext, validateTeachingSelections } from '@/lib/teacherSubjectsServer'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const selections = Array.isArray(body?.selections) ? body.selections : []
    if (selections.length === 0) {
      return NextResponse.json({ success: true, registeredCount: 0, rows: [] })
    }

    const admin = await createAdminClient()
    const { data: teachers, error } = await admin
      .from('teachers')
      .select('id, onboarded')
      .eq('user_id', user.id)

    if (error) throw error
    const onboardedTeachers = (teachers || []).filter((t: any) => t.onboarded === true)
    if (onboardedTeachers.length === 0) {
      return NextResponse.json({ error: 'No active teaching profile found' }, { status: 404 })
    }
    const teacherIds = onboardedTeachers.map((t: any) => t.id)
    const primaryTeacherId = teacherIds[0]

    const ctx = await fetchTeacherSubjectContext(admin, teacherIds)
    const valid = validateTeachingSelections(selections, ctx)
    if (valid.length === 0) {
      return NextResponse.json({ success: true, registeredCount: 0, rows: [] })
    }

    const { error: upsertError } = await admin
      .from('teacher_subject_classes')
      .upsert(
        valid.map((row) => ({ teacher_id: primaryTeacherId, ...row, status: 'active' })),
        { onConflict: 'teacher_id,subject_id,class_id', ignoreDuplicates: true }
      )

    if (upsertError) throw upsertError

    return NextResponse.json({ success: true, registeredCount: valid.length, rows: valid })
  } catch (err: any) {
    console.error('[teaching-subjects] Error:', err?.message || err)
    return NextResponse.json({ error: 'Could not register teaching subjects', message: String(err?.message || err) }, { status: 500 })
  }
}
