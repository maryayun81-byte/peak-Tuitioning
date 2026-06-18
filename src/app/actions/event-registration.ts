'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function processPublicRegistration(formData: FormData) {
  try {
    const adminClient = await createAdminClient()
    
    const fullName = String(formData.get('student_full_name') || '').trim()
    const parentName = String(formData.get('parent_name') || '').trim()
    const parentPhone = String(formData.get('parent_phone') || '').trim()
    const studentPhone = String(formData.get('student_phone') || '').trim()
    const schoolName = String(formData.get('school_name') || '').trim()
    const curriculum = String(formData.get('curriculum') || '').trim()
    const classLevel = String(formData.get('class_level') || '').trim()
    const eventId = formData.get('event_id') as string
    const programmeSelected = String(formData.get('programme_selected') || '').trim()
    const preferredMode = String(formData.get('preferred_mode') || '').trim()
    const overallGrade = String(formData.get('overall_grade') || '').trim()
    const subjectResults = JSON.parse(String(formData.get('subject_results') || '[]'))

    if (!fullName || !parentName || !parentPhone || !schoolName || !curriculum || !classLevel || !eventId || !programmeSelected || !preferredMode || !overallGrade) {
      return { success: false, error: 'Missing required fields' }
    }

    const cleanSubjectResults = Array.isArray(subjectResults)
      ? subjectResults
          .filter((item: any) => item?.subjectName)
          .map((item: any) => ({
            subjectName: String(item.subjectName || '').trim(),
            grade: String(item.grade || '').trim(),
            struggle: String(item.struggle || '').trim(),
          }))
      : []

    if (cleanSubjectResults.length === 0) {
      return { success: false, error: 'Please add at least one subject result.' }
    }

    const whatsappSummary = [
      'New Programme Registration',
      '',
      `Student: ${fullName}`,
      `Programme: ${programmeSelected}`,
      `Class/Form/Grade: ${classLevel}`,
      `Curriculum: ${curriculum}`,
      `Overall Grade: ${overallGrade}`,
      '',
      'Subject Performance:',
      ...cleanSubjectResults.map((item: any) => `${item.subjectName}: ${item.grade} — ${item.struggle || 'No struggle provided'}`),
      '',
      `Parent Phone: ${parentPhone}`,
    ].join('\n')

    const { error } = await adminClient.from('event_registrations').insert({
      student_name: fullName,
      tuition_event_id: eventId,
      status: 'active',
      parent_name: parentName,
      parent_phone: parentPhone,
      student_phone: studentPhone || null,
      school_name: schoolName,
      curriculum_label: curriculum,
      class_level: classLevel,
      programme_selected: programmeSelected,
      preferred_mode: preferredMode,
      overall_grade: overallGrade,
      subject_results: cleanSubjectResults,
      whatsapp_summary: whatsappSummary,
      notes: `Academic intake submitted for ${programmeSelected}`,
    })

    if (error) return { success: false, error: error.message }

    return { 
      success: true, 
      message: 'Registration received successfully. Peak Performance will review your academic details and contact you with the next steps.',
      whatsappSummary,
    }

  } catch (error: any) {
    console.error('Registration Error:', error)
    return { success: false, error: error.message || 'Server error occurred' }
  }
}
