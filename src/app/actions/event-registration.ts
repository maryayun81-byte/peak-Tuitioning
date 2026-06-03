'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { generateAdmissionNumber, generateTempPassword } from '@/lib/utils'
import { createStudentUser } from '@/app/actions/student'

export async function processPublicRegistration(formData: FormData) {
  try {
    const adminClient = await createAdminClient()
    
    // Parse form data
    const fullName = formData.get('full_name') as string
    const email = formData.get('email') as string || '' // Optional, we will auto-gen if missing
    const phone = formData.get('phone') as string || ''
    const curriculumId = formData.get('curriculum_id') as string
    const classId = formData.get('class_id') as string
    const eventId = formData.get('event_id') as string
    const centerId = formData.get('center_id') as string || null
    const subjectsStr = formData.get('subjects') as string
    const subjects: string[] = subjectsStr ? JSON.parse(subjectsStr) : []
    const avatarFile = formData.get('avatar') as File | null

    if (!fullName || !curriculumId || !classId || !eventId) {
      return { success: false, error: 'Missing required fields' }
    }

    // 1. Generate Admission Number
    const year = new Date().getFullYear()
    const { data: lastStudents } = await adminClient
      .from('students')
      .select('admission_number')
      .like('admission_number', `PPT-${year}-%`)
      .order('admission_number', { ascending: false })
      .limit(1)

    let currentNum = 1
    if (lastStudents && lastStudents.length > 0) {
      const parts = lastStudents[0].admission_number.split('-')
      const lastSeq = parseInt(parts[parts.length - 1])
      if (!isNaN(lastSeq)) currentNum = lastSeq + 1
    }

    let finalAdmissionNumber = ''
    let found = false

    // Find free admission number
    for (let attempt = 0; attempt < 100; attempt++) {
      finalAdmissionNumber = generateAdmissionNumber(currentNum)
      const { data: existing } = await adminClient
        .from('students')
        .select('id')
        .eq('admission_number', finalAdmissionNumber)
        .maybeSingle()

      if (existing) {
        currentNum++
        continue
      }
      found = true
      break
    }

    if (!found) {
      return { success: false, error: 'Could not generate admission number' }
    }

    // 2. Create Auth User
    const studentEmail = email || `${finalAdmissionNumber.toLowerCase()}@student.peak.edu`
    const tempPwd = generateTempPassword()

    const authProvision = await createStudentUser(
      finalAdmissionNumber,
      studentEmail,
      tempPwd,
      fullName
    )

    if (!authProvision.success) {
      return { success: false, error: authProvision.error }
    }

    const userId = authProvision.user_id

    // 3. Upload Avatar if provided
    let avatarUrl = null
    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split('.').pop()
      const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from('avatars')
        .upload(filePath, avatarFile)
        
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = adminClient.storage.from('avatars').getPublicUrl(filePath)
        avatarUrl = publicUrlData.publicUrl
      }
    }

    // 4. Create Student Record
    const { data: studentRecord, error: insertError } = await adminClient.from('students').insert({
      user_id: userId,
      full_name: fullName,
      class_id: classId,
      curriculum_id: curriculumId,
      tuition_center_id: centerId,
      admission_number: finalAdmissionNumber,
      temp_password: tempPwd,
      onboarded: true, // Auto onboard since we have everything
      created_by_admin: false,
      avatar_url: avatarUrl // Assume the schema allows this, else it will drop safely or fail
    }).select('id').single()

    if (insertError || !studentRecord) {
      return { success: false, error: insertError?.message || 'Failed to create student profile' }
    }

    // 5. Register for Event
    await adminClient.from('event_registrations').insert({
      student_name: fullName,
      tuition_event_id: eventId,
      class_id: classId,
      tuition_center_id: centerId,
      status: 'pending' // Let admin approve it or finance mark as paid
    })

    // 6. Assign Subjects
    if (subjects.length > 0) {
      const subjectRecords = subjects.map(subId => ({
        student_id: studentRecord.id,
        subject_id: subId
      }))
      await adminClient.from('student_subjects').insert(subjectRecords)
    }

    return { 
      success: true, 
      admission_number: finalAdmissionNumber,
      password: tempPwd
    }

  } catch (error: any) {
    console.error('Registration Error:', error)
    return { success: false, error: error.message || 'Server error occurred' }
  }
}
