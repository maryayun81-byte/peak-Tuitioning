'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { normalizeName } from '@/lib/admin/credentials'
import { generateAdmissionNumber, generateTempPassword } from '@/lib/utils'

function resolvePublicPosterUrl(rawValue: unknown) {
  const raw = String(rawValue || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  const cleanPath = raw
    .replace(/^event-posters\//, '')
    .replace(/^public\//, '')
    .replace(/^\/+/, '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!supabaseUrl) return raw
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/event-posters/${cleanPath}`
}

export async function getPublicTuitionEvents() {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from('tuition_events')
      .select('*')
      .in('status', ['active', 'upcoming'])
      .order('start_date', { ascending: true })
      .limit(3)

    if (error) return { success: false, events: [], error: error.message }

    const events = (data || []).map((event: any) => ({
      ...event,
      posterUrl: resolvePublicPosterUrl(event.banner_url || event.poster_url || event.image_url),
    }))

    return { success: true, events }
  } catch (error: any) {
    console.error('Public Tuition Events Error:', error)
    return { success: false, events: [], error: error.message || 'Server error occurred' }
  }
}

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
      .select('event_id, curriculum_id, class_id, capacity, charge_amount, charge_currency, charge_frequency, charge_unit_label, pricing_note, curriculum:curriculums(name), class:classes(name)')
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
        chargeAmount: slot.charge_amount == null ? null : Number(slot.charge_amount),
        chargeCurrency: slot.charge_currency || 'KES',
        chargeFrequency: slot.charge_frequency || null,
        chargeUnitLabel: slot.charge_unit_label || null,
        pricingNote: slot.pricing_note || null,
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
    const hasStudentAccount = String(formData.get('has_student_account') || 'no').trim().toLowerCase() === 'yes'
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
      .select('id, curriculum_id')
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

    const normalizedFullName = normalizeName(fullName)
    let accountResult: {
      status: 'created' | 'linked' | 'existing_requested' | 'skipped'
      studentId?: string
      admissionNumber?: string
      email?: string
      password?: string
      note?: string
    } = { status: 'skipped' }

    if (classRow?.id && curriculumRow?.id) {
      const { data: existingStudents } = await adminClient
        .from('students')
        .select('id, full_name, admission_number, user_id')
        .eq('normalized_name', normalizedFullName)
        .order('created_at', { ascending: true })
        .limit(1)

      const existingStudent = existingStudents?.[0]

      if (existingStudent?.id) {
        accountResult = {
          status: 'linked',
          studentId: existingStudent.id,
          admissionNumber: existingStudent.admission_number,
          note: 'Existing Peak student account linked to this registration.',
        }
      } else if (hasStudentAccount) {
        accountResult = {
          status: 'existing_requested',
          note: 'Learner indicated they already have a Peak student account. Admin should link the account if it is under a different name spelling.',
        }
      } else {
        const year = new Date().getFullYear()
        const { data: lastStudents } = await adminClient
          .from('students')
          .select('admission_number')
          .like('admission_number', `PPT-${year}-%`)
          .order('admission_number', { ascending: false })
          .limit(1)

        let currentCount = 0
        const match = lastStudents?.[0]?.admission_number?.match(/-(\d+)$/)
        if (match) currentCount = parseInt(match[1], 10)

        let admissionNumber = ''
        let foundUniqueNumber = false
        while (!foundUniqueNumber) {
          currentCount += 1
          admissionNumber = generateAdmissionNumber(currentCount)
          const { data: existingAdmission } = await adminClient
            .from('students')
            .select('id')
            .eq('admission_number', admissionNumber)
            .maybeSingle()
          if (!existingAdmission) foundUniqueNumber = true
        }

        const password = generateTempPassword()
        const email = `${admissionNumber.toLowerCase()}@peak.edu`
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, role: 'student' },
        })

        if (authError || !authUser?.user?.id) {
          accountResult = {
            status: 'skipped',
            note: authError?.message || 'Student account could not be created automatically. Admin can create it manually.',
          }
        } else {
          const { data: newStudent, error: studentError } = await adminClient
            .from('students')
            .insert({
              user_id: authUser.user.id,
              full_name: fullName,
              admission_number: admissionNumber,
              class_id: classRow.id,
              curriculum_id: curriculumRow.id,
              school_name: schoolName,
              created_by_admin: true,
              temp_password: password,
            })
            .select('id, admission_number')
            .single()

          if (studentError || !newStudent?.id) {
            await adminClient.auth.admin.deleteUser(authUser.user.id)
            accountResult = {
              status: 'skipped',
              note: studentError?.message || 'Student profile could not be created automatically. Admin can create it manually.',
            }
          } else {
            await adminClient.from('profiles').upsert({
              id: authUser.user.id,
              email,
              full_name: fullName,
              role: 'student',
            })

            const selectedSubjectNames = cleanSubjectResults.map((item: any) => item.subjectName)
            const { data: selectedSubjects } = await adminClient
              .from('subjects')
              .select('id, name, class_id')
              .in('name', selectedSubjectNames)
              .eq('curriculum_id', curriculumRow.id)

            const subjectPayload = (selectedSubjects || [])
              .filter((subject: any) => !subject.class_id || subject.class_id === classRow.id)
              .map((subject: any) => ({
                student_id: newStudent.id,
                subject_id: subject.id,
                class_id: classRow.id,
              }))

            if (subjectPayload.length > 0) {
              await adminClient.from('student_subjects').upsert(subjectPayload, { onConflict: 'student_id,subject_id' })
            }

            const { data: batch } = await adminClient
              .from('credential_batches')
              .insert({ total_processed: 1, total_created: 1, total_linked: 0, total_flagged: 0 })
              .select('id')
              .single()

            if (batch?.id) {
              await adminClient.from('generated_credentials').insert({
                student_id: newStudent.id,
                batch_id: batch.id,
                plain_password: password,
              })
            }

            accountResult = {
              status: 'created',
              studentId: newStudent.id,
              admissionNumber: admissionNumber,
              email,
              password,
              note: 'A new Peak student account was created and selected subjects were prefilled.',
            }
          }
        }
      }
    }

    const { data: registration, error } = await adminClient.from('event_registrations').insert({
      student_name: fullName,
      student_id: accountResult.studentId || null,
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
    }).select('id').single()

    if (error) return { success: false, error: error.message }

    return { 
      success: true, 
      message: accountResult.status === 'created'
        ? 'Registration received and a Peak student account has been created.'
        : 'Registration received successfully. Peak Performance will review your academic details and contact you with the next steps.',
      whatsappSummary,
      registrationId: registration?.id,
      account: accountResult.status === 'created'
        ? {
            created: true,
            admissionNumber: accountResult.admissionNumber,
            email: accountResult.email,
            password: accountResult.password,
            note: accountResult.note,
          }
        : {
            created: false,
            status: accountResult.status,
            admissionNumber: accountResult.admissionNumber,
            note: accountResult.note,
          },
    }

  } catch (error: any) {
    console.error('Registration Error:', error)
    return { success: false, error: error.message || 'Server error occurred' }
  }
}

type AdminRegistrationRow = {
  studentName: string
  parentName?: string
  parentPhone?: string
  studentPhone?: string
  schoolName?: string
  curriculumId: string
  classId: string
  tuitionEventId: string
  tuitionCenterId?: string
  preferredMode?: string
  hasStudentAccount?: boolean
}

async function createOrLinkStudentForRegistration(adminClient: any, input: {
  fullName: string
  classId: string
  curriculumId: string
  schoolName?: string
  hasStudentAccount?: boolean
}) {
  const normalizedFullName = normalizeName(input.fullName)
  const { data: existingStudents } = await adminClient
    .from('students')
    .select('id, full_name, admission_number, user_id')
    .eq('normalized_name', normalizedFullName)
    .order('created_at', { ascending: true })
    .limit(1)

  const existingStudent = existingStudents?.[0]
  if (existingStudent?.id) {
    return {
      status: 'linked' as const,
      studentId: existingStudent.id,
      admissionNumber: existingStudent.admission_number,
      note: 'Existing Peak student account linked.',
    }
  }

  if (input.hasStudentAccount) {
    return {
      status: 'existing_requested' as const,
      note: 'Admin indicated this learner already has an account, but no exact name match was found.',
    }
  }

  const year = new Date().getFullYear()
  const { data: lastStudents } = await adminClient
    .from('students')
    .select('admission_number')
    .like('admission_number', `PPT-${year}-%`)
    .order('admission_number', { ascending: false })
    .limit(1)

  let currentCount = 0
  const match = lastStudents?.[0]?.admission_number?.match(/-(\d+)$/)
  if (match) currentCount = parseInt(match[1], 10)

  let admissionNumber = ''
  let foundUniqueNumber = false
  while (!foundUniqueNumber) {
    currentCount += 1
    admissionNumber = generateAdmissionNumber(currentCount)
    const { data: existingAdmission } = await adminClient
      .from('students')
      .select('id')
      .eq('admission_number', admissionNumber)
      .maybeSingle()
    if (!existingAdmission) foundUniqueNumber = true
  }

  const password = generateTempPassword()
  const email = `${admissionNumber.toLowerCase()}@peak.edu`
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: 'student' },
  })

  if (authError || !authUser?.user?.id) {
    return {
      status: 'skipped' as const,
      note: authError?.message || 'Student auth account could not be created.',
    }
  }

  const { data: newStudent, error: studentError } = await adminClient
    .from('students')
    .insert({
      user_id: authUser.user.id,
      full_name: input.fullName,
      admission_number: admissionNumber,
      class_id: input.classId,
      curriculum_id: input.curriculumId,
      school_name: input.schoolName || null,
      created_by_admin: true,
      temp_password: password,
    })
    .select('id, admission_number')
    .single()

  if (studentError || !newStudent?.id) {
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    return {
      status: 'skipped' as const,
      note: studentError?.message || 'Student profile could not be created.',
    }
  }

  await adminClient.from('profiles').upsert({
    id: authUser.user.id,
    email,
    full_name: input.fullName,
    role: 'student',
  })

  const { data: batch } = await adminClient
    .from('credential_batches')
    .insert({ total_processed: 1, total_created: 1, total_linked: 0, total_flagged: 0 })
    .select('id')
    .single()

  if (batch?.id) {
    await adminClient.from('generated_credentials').insert({
      student_id: newStudent.id,
      batch_id: batch.id,
      plain_password: password,
    })
  }

  return {
    status: 'created' as const,
    studentId: newStudent.id,
    admissionNumber,
    password,
    note: 'Student account created.',
  }
}

export async function adminRegisterEventStudents(input: { rows: AdminRegistrationRow[] }) {
  try {
    const adminClient = await createAdminClient()
    const rows = Array.isArray(input.rows) ? input.rows : []
    if (rows.length === 0) return { success: false, error: 'Add at least one student row.' }

    const results: any[] = []
    for (const row of rows) {
      const fullName = String(row.studentName || '').trim()
      if (!fullName || !row.tuitionEventId || !row.curriculumId || !row.classId) {
        results.push({ studentName: fullName || 'Unnamed student', status: 'failed', error: 'Missing student, event, curriculum or class.' })
        continue
      }

      const [{ data: eventRow }, { data: curriculumRow }, { data: classRow }] = await Promise.all([
        adminClient.from('tuition_events').select('id, name').eq('id', row.tuitionEventId).maybeSingle(),
        adminClient.from('curriculums').select('id, name').eq('id', row.curriculumId).maybeSingle(),
        adminClient.from('classes').select('id, name, curriculum_id').eq('id', row.classId).maybeSingle(),
      ])

      if (!eventRow?.id || !curriculumRow?.id || !classRow?.id) {
        results.push({ studentName: fullName, status: 'failed', error: 'Selected event, curriculum or class no longer exists.' })
        continue
      }

      const account = await createOrLinkStudentForRegistration(adminClient, {
        fullName,
        classId: classRow.id,
        curriculumId: curriculumRow.id,
        schoolName: row.schoolName,
        hasStudentAccount: Boolean(row.hasStudentAccount),
      })

      const { error } = await adminClient.from('event_registrations').insert({
        student_name: fullName,
        student_id: account.studentId || null,
        tuition_event_id: eventRow.id,
        tuition_center_id: row.tuitionCenterId || null,
        class_id: classRow.id,
        status: 'active',
        parent_name: row.parentName || null,
        parent_phone: row.parentPhone || null,
        student_phone: row.studentPhone || null,
        school_name: row.schoolName || null,
        curriculum_label: curriculumRow.name,
        class_level: classRow.name,
        programme_selected: eventRow.name,
        preferred_mode: row.preferredMode || 'Physical',
        overall_grade: 'Not provided',
        subject_results: [],
        notes: 'Admin-created event registration. Weaknesses intentionally not captured at registration.',
      })

      if (error) {
        results.push({ studentName: fullName, status: 'failed', error: error.message })
      } else {
        results.push({
          studentName: fullName,
          status: account.status,
          admissionNumber: account.admissionNumber,
          password: account.password,
          note: account.note,
        })
      }
    }

    return {
      success: true,
      results,
      created: results.filter((item) => item.status === 'created').length,
      linked: results.filter((item) => item.status === 'linked').length,
      failed: results.filter((item) => item.status === 'failed').length,
    }
  } catch (error: any) {
    console.error('Admin event registration error:', error)
    return { success: false, error: error.message || 'Could not register students.' }
  }
}
