import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { normalizeName, similarityScore, isPartialMatch } from '@/lib/admin/credentials'
import { generateAdmissionNumber, generateTempPassword } from '@/lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import sharp from 'sharp'

// Add types for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()
  
  try {
    const { event_id } = await req.json()
    
    // 1. Fetch registrations needing accounts
    // 1. Fetch registrations needing accounts
    // We use a safer query that won't crash if normalized_name is missing (it will just be undefined in result)
    let regQuery = supabase
      .from('event_registrations')
      .select('id, student_name, class_id, tuition_center_id, tuition_event_id, status, class:classes(curriculum_id)')
      .is('student_id', null)
      .eq('status', 'active')

    // Try to include normalized_name if possible (schema might handle it but JS query might fail if column missing)
    // Actually, in many cases Supabase error will happen if column missing.
    // Let's do a more robust fetch
    const { data: rawRegistrations, error: regError } = await regQuery
    if (regError) throw regError
    
    // Enrich with normalized names locally to be safe
    const registrations = rawRegistrations.map((r: any) => ({
      ...r,
      normalized_name: normalizeName(r.student_name)
    }))

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ message: 'No registrations found needing accounts.', summary: { processed: 0 } })
    }

    // 2. Fetch all existing students for identity resolution
    // Fallback if normalized_name is missing
    const { data: students, error: studError } = await supabase
      .from('students')
      .select('id, full_name, admission_number')
    if (studError) throw studError

    const enrichedStudents = students.map((s: any) => ({
      ...s,
      normalized_name: s.normalized_name || normalizeName(s.full_name)
    }))

    // 3. Setup results tracking
    const results = {
      processed: 0,
      created: [] as any[],
      linked: [] as any[],
      flagged: [] as any[],
      failed: [] as any[]
    }

    // 4. Fetch the highest existing admission number to prevent collisions
    const year = new Date().getFullYear()
    const { data: lastStudents, error: countError } = await supabase
      .from('students')
      .select('admission_number')
      .like('admission_number', `PPT-${year}-%`)
      .order('admission_number', { ascending: false })
      .limit(1)
    
    if (countError) throw countError
    
    let lastIndex = 0
    if (lastStudents && lastStudents.length > 0) {
      const match = lastStudents[0].admission_number.match(/-(\d+)$/)
      if (match) lastIndex = parseInt(match[1])
    }
    
    let currentCount = lastIndex

    // 5. Processing Loop
    for (const reg of registrations) {
      results.processed++
      
      const regName = reg.normalized_name
      
      // Step A: Exact Match
      const exactMatch = enrichedStudents.find(s => s.normalized_name === regName)
      if (exactMatch) {
        await supabase.from('event_registrations').update({ student_id: exactMatch.id }).eq('id', reg.id)
        results.linked.push({ reg, student: exactMatch })
        continue
      }

      // Step B: Fuzzy/Partial Matching
      const possibleMatches = enrichedStudents.filter(s => {
        const score = similarityScore(s.full_name, reg.student_name)
        return score >= 0.7 || isPartialMatch(s.full_name, reg.student_name)
      })

      if (possibleMatches.length === 1) {
        await supabase.from('event_registrations').update({ student_id: possibleMatches[0].id }).eq('id', reg.id)
        results.linked.push({ reg, student: possibleMatches[0] })
        continue
      }

      if (possibleMatches.length > 1) {
        await supabase.from('duplicate_flags').upsert({
          registration_id: reg.id,
          possible_matches: possibleMatches,
          status: 'pending'
        }, { onConflict: 'registration_id' })
        results.flagged.push({ reg, matches: possibleMatches })
        continue
      }

      // Step C: Create or Recover Account
      let admissionNumber = ""
      let userId = ""
      let password = generateTempPassword()
      let isNewAccount = false

      // Loop to ensure admission number is truly unique in DB
      let foundUniqueNum = false
      while (!foundUniqueNum) {
        currentCount++
        admissionNumber = generateAdmissionNumber(currentCount)
        
        const { data: existing } = await supabase
          .from('students')
          .select('id')
          .eq('admission_number', admissionNumber)
          .single()
        
        if (!existing) foundUniqueNum = true
      }

      const email = `${admissionNumber.toLowerCase()}@peak.edu`

      // 1. Try to create Auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: reg.student_name, role: 'student' }
      })

      if (authError) {
        // RECOVERY: If email already exists, find the existing user
        if ((authError as any).status === 422 || authError.message.includes('already been registered')) {
          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const foundUser = existingUsers.users.find(u => u.email === email)
          
          if (foundUser) {
            userId = foundUser.id
            isNewAccount = false
            console.log(`Recovered existing Auth user for ${reg.student_name} (${email})`)
          } else {
            console.error(`Auth creation failed and recovery failed for ${reg.student_name}:`, authError)
            continue
          }
        } else {
          console.error(`Auth creation failed for ${reg.student_name}:`, authError)
          continue
        }
      } else {
        userId = authUser.user.id
        isNewAccount = true
      }

      // 2. Create/Link Student Record
      let studentId = ""
      
      // Check if student record for this user already exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single()
      
      if (existingStudent) {
        studentId = existingStudent.id
      } else {
        const { data: newStudent, error: studInsertError } = await supabase
          .from('students')
          .insert({
            user_id: userId,
            full_name: reg.student_name,
            admission_number: admissionNumber,
            class_id: reg.class_id,
            curriculum_id: (reg.class as any)?.curriculum_id, // Fetch from the joined class data
            created_by_admin: true,
            temp_password: password
          })
          .select()
          .single()

        if (studInsertError) {
          console.error(`Student record failed for ${reg.student_name}:`, studInsertError)
          results.failed.push({ name: reg.student_name, error: studInsertError.message })
          continue
        }
        studentId = newStudent.id
        results.created.push({ ...newStudent, plain_password: password })
      }

      // 3. Ensure Profile
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: reg.student_name,
        role: 'student'
      })

      // 4. Link Registration
      await supabase.from('event_registrations').update({ student_id: studentId }).eq('id', reg.id)
      
      if (!isNewAccount) {
        // If we recovered a user, we don't necessarily "create" a new PDF entry unless it was missing
        // For now, let's include it in results so the admin sees it succeeded
      }
    }

    // 5. Generate Batch Files if new/linked students were added to batch
    let imageUrl: string | null = null
    let pdfUrl: string | null = null
    let batchId: string | null = null

    if (results.created.length > 0) {
      const { data: batch, error: batchError } = await supabase
        .from('credential_batches')
        .insert({
          total_processed: results.processed,
          total_created: results.created.length,
          total_linked: results.linked.length,
          total_flagged: results.flagged.length,
          total_failed: results.failed.length
        })
        .select()
        .single()
      
      if (batchError) throw batchError
      batchId = batch.id

      await supabase.from('generated_credentials').insert(
        results.created.map(s => ({ student_id: s.id, batch_id: batchId, plain_password: s.plain_password }))
      )

      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text('Student Login Credentials', 14, 22)
      doc.setFontSize(10)
      doc.text(`Batch ID: ${batchId} | Date: ${new Date().toLocaleDateString()}`, 14, 30)

      autoTable(doc, {
        startY: 35,
        head: [['Student Name', 'Admission No.', 'Virtual Email', 'Temp Password']],
        body: results.created.map(s => [
          s.full_name,
          s.admission_number,
          `${s.admission_number.toLowerCase()}@peak.edu`,
          s.plain_password
        ]),
        theme: 'grid',
        headStyles: { fillColor: '#1E293B' },
      })

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
      const pdfPath = `${batchId}/credentials.pdf`
      await supabase.storage.from('credentials').upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' })
      pdfUrl = supabase.storage.from('credentials').getPublicUrl(pdfPath).data.publicUrl

      // Image generation...
      const imgHeight = 100 + (results.created.length * 40)
      let svg = `<svg width="800" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><text x="20" y="40" font-family="Arial" font-size="24" font-weight="bold">Peak Credentials</text>`
      results.created.forEach((s, i) => {
        const y = 80 + (i * 40)
        svg += `<text x="20" y="${y}" font-family="Arial" font-size="14">${s.full_name} | ${s.admission_number} | ${s.plain_password}</text>`
      })
      svg += `</svg>`
      
      const imgBuffer = await sharp(Buffer.from(svg)).png().toBuffer()
      const imgPath = `${batchId}/credentials.png`
      await supabase.storage.from('credentials').upload(imgPath, imgBuffer, { contentType: 'image/png' })
      imageUrl = supabase.storage.from('credentials').getPublicUrl(imgPath).data.publicUrl

      await supabase.from('credential_batches').update({ image_url: imageUrl, pdf_url: pdfUrl }).eq('id', batchId)
    }

    return NextResponse.json({
      message: 'Processing complete',
      batch_id: batchId,
      summary: {
        processed: results.processed,
        created: results.created.length,
        linked: results.linked.length,
        flagged: results.flagged.length,
        failed: results.failed.length
      },
      image_url: imageUrl,
      pdf_url: pdfUrl,
      errors: results.failed
    })

  } catch (error: any) {
    console.error('Credential generation error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

