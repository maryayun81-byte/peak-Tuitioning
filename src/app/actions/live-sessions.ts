'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { RoomServiceClient } from "livekit-server-sdk"

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_HOST = process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace('ws://', 'http://').replace('wss://', 'https://')

export type CreateSessionInput = {
  title: string
  subject_id?: string | null
  class_id: string
  tuition_center_id: string
  session_type: 'subject' | 'class'
  goal: string
  outcomes: string[]
  scheduled_at: string
  duration_mins: number
}

export async function createLiveSession(input: CreateSessionInput) {
  try {
    console.log('[createLiveSession] Initializing with:', { 
      title: input.title, 
      type: input.session_type,
      class: input.class_id,
      center: input.tuition_center_id 
    })
    
    // Use regular client ONLY to verify user identity
    const authClient = await createClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) throw new Error("Authentication failed")

    // Switch to admin client for all DB writes — bypasses RLS recursion entirely
    // Security is maintained because we verify user identity above before any write
    const supabase = await createAdminClient()

    // 1. Fetch Teacher ID
    const { data: teacher, error: teacherFetchError } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (teacherFetchError || !teacher) {
      console.error('[createLiveSession] Teacher lookup failed:', teacherFetchError)
      throw new Error("Teacher profile not found")
    }

    // 2. Insert Session
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .insert({
        teacher_id: teacher.id,
        title: input.title,
        subject_id: input.subject_id || null,
        class_id: input.class_id,
        tuition_center_id: input.tuition_center_id,
        session_type: input.session_type,
        goal: input.goal,
        room_name: `peak_v1_${Date.now()}`, // placeholder, updated below
        scheduled_at: input.scheduled_at,
        duration_mins: input.duration_mins,
        status: 'scheduled'
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('[createLiveSession] DB Insert Error:', sessionError)
      throw new Error(sessionError?.message || "Database insertion failed")
    }

    // Update room_name with deterministic session-based pattern
    const roomName = `peak_v1_${session.id}`
    await supabase
      .from('live_sessions')
      .update({ room_name: roomName })
      .eq('id', session.id)

    // 3. Insert Outcomes
    if (input.outcomes && input.outcomes.length > 0) {
      const outcomesData = input.outcomes
        .filter(o => !!o.trim())
        .map(desc => ({
          session_id: session.id,
          description: desc,
          is_completed: false
        }))

      if (outcomesData.length > 0) {
        const { error: outcomesError } = await supabase
          .from('live_session_outcomes')
          .insert(outcomesData)

        if (outcomesError) console.error('[createLiveSession] Outcomes Error:', outcomesError)
      }
    }

    // 5. Notify Students
    try {
      const { data: students } = await supabase
        .from('students')
        .select('user_id')
        .eq('class_id', input.class_id)

      if (students && students.length > 0) {
        const notifications = students.map(s => ({
          user_id: s.user_id,
          title: 'New Live Session Scheduled 📅',
          body: `Your instructor has scheduled "${input.title}". Be ready to peak! 🏔️`,
          type: 'alert',
          data: { session_id: session.id, type: 'live_session_scheduled', href: '/student/live' }
        }))

        await supabase.from('notifications').insert(notifications)
        const userIds = students.map(s => s.user_id).filter(Boolean) as string[]
        const { sendPushNotification } = await import('./push')
        await sendPushNotification(userIds, {
          title: 'New Live Session Scheduled 📅',
          body: `Your instructor has scheduled "${input.title}". Be ready to peak! 🏔️`,
          href: '/student/live',
          tag: 'live-session-scheduled',
        })
      }
    } catch (notifErr) {
      console.error('[createLiveSession] Notification Warning:', notifErr)
    }

    // 6. Revalidate
    try {
      revalidatePath('/teacher/live')
      revalidatePath('/student/live')
    } catch (revalErr) {
      console.error('[createLiveSession] Revalidation Warning:', revalErr)
    }

    return { success: true, sessionId: session.id }
  } catch (globalErr: any) {
    console.error('[createLiveSession] FATAL ERROR:', globalErr)
    throw new Error(globalErr.message || "An unexpected error occurred during session creation")
  }
}

/**
 * Dispatch reminders for sessions starting in the next 10 minutes.
 * This should ideally be called by a cron job or background worker.
 */
export async function dispatchLiveSessionReminders() {
  try {
    const supabase = await createClient()
    const now = new Date()

    // Define reminder phases
    const phases = [
      { label: '10 minutes', mins: 10, type: 'live_reminder_10m' },
      { label: '5 minutes', mins: 5, type: 'live_reminder_5m' },
      { label: '2 minutes', mins: 2, type: 'live_reminder_2m' }
    ]

    let totalNotifs = 0

    for (const phase of phases) {
      const targetTime = new Date(now.getTime() + phase.mins * 60000)
      const windowStart = new Date(targetTime.getTime() - 30000).toISOString() // 30 sec window
      const windowEnd = new Date(targetTime.getTime() + 30000).toISOString()

      const { data: sessions } = await supabase
        .from('live_sessions')
        .select('*, class_id, tuition_center_id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', windowEnd)
        .gte('scheduled_at', windowStart)

      if (sessions && sessions.length > 0) {
        for (const session of sessions) {
          // IDEMPOTENCY CHECK: Check if we already sent this phase reminder for this session
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .contains('data', { session_id: session.id, type: phase.type })
            .limit(1)

          if (existing && existing.length > 0) continue // Skip if already sent

          // Fetch students
          const { data: students } = await supabase
            .from('students')
            .select('user_id')
            .eq('class_id', session.class_id)
            .eq('tuition_center_id', session.tuition_center_id)

          if (students && students.length > 0) {
            const reminders = students.map(s => ({
              user_id: s.user_id,
              title: `Session Starts in ${phase.label}! ⚡`,
              body: `Your session "${session.title}" is about to begin. Join the Live Campus now!`,
              type: 'alert',
              data: { session_id: session.id, type: phase.type, href: '/student/live' }
            }))

            await supabase.from('notifications').insert(reminders)
            const userIds = students.map(s => s.user_id).filter(Boolean) as string[]
            const { sendPushNotification } = await import('./push')
            await sendPushNotification(userIds, {
              title: `Session Starts in ${phase.label}! ⚡`,
              body: `Your session "${session.title}" is about to begin. Join the Live Campus now!`,
              href: '/student/live',
              tag: `live-session-${phase.type}`,
            })
            totalNotifs += reminders.length
          }
        }
      }
    }

    return { success: true, count: totalNotifs }
  } catch (error: any) {
    // Fire-and-forget heartbeat (SessionHeartbeat runs it on every student page).
    // A transient failure must never surface as an unhandled 500 to the client.
    console.error('[dispatchLiveSessionReminders] failed:', error?.message || error)
    return { success: false, count: 0 }
  }
}

export async function updateOutcomeStatus(outcomeId: string, isCompleted: boolean) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('live_session_outcomes')
    .update({ 
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null
    })
    .eq('id', outcomeId)

  if (error) throw new Error("Failed to update outcome")
  
  return { success: true }
}

export async function startLiveSession(sessionId: string) {
  const supabase = await createClient()

  // Fetch session to get room_name
  const { data: session, error: fetchError } = await supabase
    .from('live_sessions')
    .select('room_name')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) throw new Error("Session not found")

  // Create/ensure room exists on LiveKit server
  try {
    if (LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_HOST) {
      const roomService = new RoomServiceClient(LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
      const roomName = session.room_name || `peak_v1_${sessionId}`
      await roomService.createRoom({ name: roomName })
      console.log(`[startLiveSession] LiveKit room created: ${roomName}`)
    }
  } catch (roomErr: any) {
    // If room already exists, that's fine — log and continue
    if (!roomErr.message?.includes('already exists')) {
      console.error('[startLiveSession] LiveKit room creation warning:', roomErr)
    }
  }

  const { error } = await supabase
    .from('live_sessions')
    .update({ status: 'live' })
    .eq('id', sessionId)

  if (error) throw new Error("Failed to start session")
  
  revalidatePath('/teacher/live')
  revalidatePath('/student/live')
  revalidatePath(`/student/live/${sessionId}`)
  return { success: true }
}

export async function completeLiveSession(sessionId: string) {
  const supabase = await createAdminClient()

  // 1. Mark session as completed
  const { data: session, error } = await supabase
    .from('live_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)
    .select('title, class_id')
    .single()

  if (error) throw new Error("Failed to complete session")

  // 2. Notify students of the session wrap-up and summary availability
  try {
    const { data: students } = await supabase
      .from('students')
      .select('user_id')
      .eq('class_id', session.class_id)

    if (students && students.length > 0) {
      const notifications = students.map(s => ({
        user_id: s.user_id,
        title: 'Session Summary Ready 📝',
        body: `"${session.title}" has concluded. Your personalized summary and reflection are now available.`,
        type: 'alert',
        data: { session_id: sessionId, type: 'live_session_completed' }
      }))

      await supabase.from('notifications').insert(notifications)
    }
  } catch (notifErr) {
    console.error('[completeLiveSession] Summary notification failed:', notifErr)
  }

  revalidatePath('/teacher/live')
  revalidatePath('/student/live')
  revalidatePath(`/student/live/${sessionId}`)
  
  return { success: true }
}
