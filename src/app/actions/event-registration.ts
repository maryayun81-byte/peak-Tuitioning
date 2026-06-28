'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function getPublicRegistrationCounts() {
  try {
    const adminClient = await createAdminClient()
    const { data: registrationData, error: registrationError } = await adminClient
      .from('event_registrations')
      .select('tuition_event_id, curriculum_label, class_level, status')
      .neq('status', 'cancelled')

    if (registrationError) return { success: false, counts: [], slots: [], error: registrationError.message }

    const grouped = new Map<string, { eventId: string; curriculum: string; classLevel: string; count: number }>()
    ;(registrationData || []).forEach((item: any) => {
      const eventId = String(item.tuition_event_id || '')
      const curriculum = String(item.curriculum_label || '').trim()
      const classLevel = String(item.class_level || '').trim()
      if (!eventId || !curriculum || !classLevel) return
      const key = `${eventId}|${curriculum}|${classLevel}`
      const existing = grouped.get(key)
      if (existing) existing.count += 1
      else grouped.set(key, { eventId, curriculum, classLevel, count: 1 })
    })

    const { data: slotData, error: slotError } = await adminClient
      .from('tuition_event_class_slots')
      .select('event_id, curriculum_id, class_id, capacity, curriculum:curriculums(name), class:classes(name)')
      .gt('capacity', 0)

    if (slotError) {
      return { success: true, counts: Array.from(grouped.values()), slots: [] }
    }

    const slots = (slotData || []).map((slot: any) => {
      const curriculum = String(slot.curriculum?.name || '').trim()
      const classLevel = String(slot.class?.name || '').trim()
      const registered = grouped.get(`${slot.event_id}|${curriculum}|${classLevel}`)?.count || 0
      const capacity = Number(slot.capacity) || 0
      return {
        eventId: String(slot.event_id),
        curriculum,
        curriculumId: String(slot.curriculum_id),
        classLevel,
        classId: String(slot.class_id),
        capacity,
        registered,
        remaining: Math.max(0, capacity - registered),
      }
    })

    return { success: true, counts: Array.from(grouped.values()), slots }
  } catch (error: any) {
    console.error('Registration Counts Error:', error)
    return { success: false, counts: [], slots: [], error: error.message || 'Server error occurred' }
  }
}

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

    const { data: curriculumRow } = await adminClient
      .from('curriculums')
      .select('id')
      .eq('name', curriculum)
      .maybeSingle()

    const { data: classRow } = await adminClient
      .from('classes')
      .select('id')
      .eq('name', classLevel)
      .eq('curriculum_id', curriculumRow?.id || '00000000-0000-0000-0000-000000000000')
      .maybeSingle()

    if (curriculumRow?.id && classRow?.id) {
      const { data: slot } = await adminClient
        .from('tuition_event_class_slots')
        .select('capacity')
        .eq('event_id', eventId)
        .eq('class_id', classRow.id)
        .maybeSingle()

      if (slot && Number(slot.capacity) > 0) {
        const { count, error: countError } = await adminClient
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('tuition_event_id', eventId)
          .eq('curriculum_label', curriculum)
          .eq('class_level', classLevel)
          .neq('status', 'cancelled')

        if (!countError && (count || 0) >= Number(slot.capacity)) {
          return { success: false, error: `${curriculum} ${classLevel} is already full for this programme. Please choose another programme or contact Peak Performance.` }
        }
      }
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
