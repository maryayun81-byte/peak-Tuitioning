import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()
  
  try {
    // 1. Find the 844 curriculum
    // We try multiple variations to be safe
    const { data: curriculums, error: currError } = await supabase
      .from('curriculums')
      .select('id, name')

    if (currError) throw currError

    const targetCurr = curriculums?.find(c => 
      c.name.includes('844') || 
      c.name.includes('8-4-4') || 
      c.name.toLowerCase().includes('kcse')
    )

    if (!targetCurr) {
      return NextResponse.json({ 
        error: '844 Curriculum not found. Available: ' + curriculums?.map(c => c.name).join(', ') 
      }, { status: 404 })
    }

    console.log(`Found target curriculum: ${targetCurr.name} (${targetCurr.id})`)

    // 2. Get all subjects for this curriculum
    const { data: subjects, error: subjError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('curriculum_id', targetCurr.id)

    if (subjError) throw subjError

    if (!subjects || subjects.length === 0) {
      return NextResponse.json({ error: `No subjects found for ${targetCurr.name}` }, { status: 404 })
    }

    // 3. Find students in this curriculum
    const { data: students, error: studError } = await supabase
      .from('students')
      .select('id, full_name')
      .eq('curriculum_id', targetCurr.id)

    if (studError) throw studError

    if (!students || students.length === 0) {
      return NextResponse.json({ message: `No students found in ${targetCurr.name}` }, { status: 200 })
    }

    // 4. Find which students ALREADY have registered subjects
    const { data: existingRegs, error: regError } = await supabase
      .from('student_subjects')
      .select('student_id')
      .in('student_id', students.map(s => s.id))

    if (regError) throw regError

    const registeredStudentIds = new Set(existingRegs?.map(r => r.student_id))
    const eligibleStudents = students.filter(s => !registeredStudentIds.has(s.id))

    if (eligibleStudents.length === 0) {
      return NextResponse.json({ 
        message: 'All 844 students are already registered for subjects.',
        total_844_students: students.length
      }, { status: 200 })
    }

    // 5. Build bulk inserts
    // For each eligible student, register ALL subjects of the 844 curriculum
    const inserts: any[] = []
    eligibleStudents.forEach(student => {
      subjects.forEach(subject => {
        inserts.push({
          student_id: student.id,
          subject_id: subject.id,
          is_active: true
        })
      })
    })

    // 6. Execute bulk insert
    const { error: insertError } = await supabase
      .from('student_subjects')
      .insert(inserts)

    if (insertError) throw insertError

    return NextResponse.json({
      message: `Successfully backfilled subjects for 844 students.`,
      summary: {
        curriculum: targetCurr.name,
        total_844_students: students.length,
        students_backfilled: eligibleStudents.length,
        subjects_per_student: subjects.length,
        total_records_inserted: inserts.length,
        students: eligibleStudents.map(s => s.full_name)
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error('Backfill error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
