import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    const supabase = await createAdminClient()

    const { action } = await req.json()

    if (action === 'analyze') {
      // Find students with inconsistent onboarding flags
      const { data: inconsistentStudents, error } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          full_name,
          onboarded,
          user_id,
          profiles!inner (has_onboarded)
        `)
        .or('onboarded.neq.profiles.has_onboarded')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        count: inconsistentStudents?.length || 0,
        students: inconsistentStudents || []
      })
    }

    if (action === 'fix') {
      // Fix inconsistent onboarding flags by setting both to false (safest approach)
      const { data: inconsistentStudents, error } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          admission_number,
          onboarded,
          profiles!inner (has_onboarded)
        `)
        .or('onboarded.neq.profiles.has_onboarded')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const fixes = []
      for (const student of inconsistentStudents || []) {
        // Reset both flags to false to force onboarding
        const { error: studentError } = await supabase
          .from('students')
          .update({ onboarded: false })
          .eq('id', student.id)

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ has_onboarded: false })
          .eq('id', student.user_id)

        if (!studentError && !profileError) {
          fixes.push({
            studentId: student.id,
            admissionNumber: student.admission_number,
            fixed: true
          })
        }
      }

      return NextResponse.json({
        success: true,
        fixed: fixes.length,
        fixes
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Fix onboarding flags error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
