import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { computeEligibleTeacherPendingSubjects } from '@/lib/teacherPendingSubjects'
import { fetchTeacherSubjectContext } from '@/lib/teacherSubjectsServer'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await createAdminClient()
    const { data: teachers, error } = await admin
      .from('teachers')
      .select('id, onboarded')
      .eq('user_id', user.id)

    if (error) throw error
    const onboardedTeachers = (teachers || []).filter((t: any) => t.onboarded === true)
    if (onboardedTeachers.length === 0) {
      return NextResponse.json({ subjects: [], hasPending: false })
    }
    const teacherIds = onboardedTeachers.map((t: any) => t.id)

    const ctx = await fetchTeacherSubjectContext(admin, teacherIds)
    const subjects = computeEligibleTeacherPendingSubjects({
      teacherClasses: ctx.teacherClasses,
      curriculumSubjects: ctx.curriculumSubjects,
      classLinkSubjects: ctx.classLinkSubjects,
      assignedSubjects: ctx.assignedSubjects,
      registeredKeys: ctx.registeredKeys,
    })

    return NextResponse.json({ subjects, hasPending: subjects.length > 0 })
  } catch (err: any) {
    console.error('[pending-subjects] Error:', err?.message || err)
    return NextResponse.json({ error: 'Could not load pending subjects', message: String(err?.message || err) }, { status: 500 })
  }
}
