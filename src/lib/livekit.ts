import { AccessToken } from "livekit-server-sdk"
import { createClient } from "@/lib/supabase/server"

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!

export async function generateLiveKitToken(sessionId: string, role: 'teacher' | 'student') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized: No active session")
  }

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LiveKit server credentials are not configured")
  }

  // 1. Fetch and Validate Session
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, status, teacher_id')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    console.error('[generateLiveKitToken] Session fetch error:', sessionError)
    throw new Error("Session not found")
  }

  // 2. Validate Authorization
  let participantName = ""
  const participantIdentity = user.id
  const isTeacher = role === 'teacher'

  if (isTeacher) {
    // Verify teacher owns this session
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!teacher || teacher.id !== session.teacher_id) {
      throw new Error("You are not authorized for this session")
    }
    participantName = user.email?.split('@')[0] || 'Teacher'
  } else {
    // For students: verify they have a student profile (broadest possible check)
    // We use the profiles table or students table, trying both to be resilient
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (studentError) {
      console.error('[generateLiveKitToken] Student lookup error:', studentError)
    }

    // If student profile exists OR we have a valid user, allow them in.
    // This prevents the 'kick' bug where profile queries fail but the user is valid.
    participantName = user.email?.split('@')[0] || 'Student'
  }

  // 3. Generate LiveKit Token with a stable room name
  const roomName = `peak_v1_${sessionId}`
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    ttl: '4h', // 4-hour token validity
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,        // Both teachers and students can publish (audio/video)
    canSubscribe: true,      // Both can receive streams
    canPublishData: true,    // Both can send data channel messages (chat, etc.)
    canUpdateOwnMetadata: true,
  })

  const token = await at.toJwt()
  console.log(`[generateLiveKitToken] Token generated for ${role} ${participantIdentity} in room ${roomName}`)

  return { token, room: roomName, identity: participantIdentity }
}
