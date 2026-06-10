import { AccessToken, TrackSource } from "livekit-server-sdk"
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
    .select('id, status, teacher_id, class_id, room_name')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    console.error('[generateLiveKitToken] Session fetch error:', sessionError)
    throw new Error("Session not found")
  }

  // Use stored room_name from DB, falling back to deterministic pattern
  const storedRoomName = session.room_name || `peak_v1_${sessionId}`

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
    // For students: verify they have a student profile AND belong to this session's class
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, class_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (studentError) {
      console.error('[generateLiveKitToken] Student lookup error:', studentError)
      throw new Error("Student profile not found")
    }

    if (!student) {
      console.error('[generateLiveKitToken] No student profile for user:', user.id)
      throw new Error("Student profile not found")
    }

    // Verify student belongs to the session's class
    if (student.class_id !== session.class_id) {
      console.error(`[generateLiveKitToken] Student ${student.id} not in session class ${session.class_id}`)
      throw new Error("You are not enrolled in this session's class")
    }

    participantName = user.email?.split('@')[0] || 'Student'
  }

  // 3. Generate LiveKit Token with room name from DB
  const roomName = storedRoomName
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    metadata: JSON.stringify({ role, sessionId }),
    ttl: '4h', // 4-hour token validity
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,        // Both teachers and students can publish (audio/video)
    canSubscribe: true,      // Both can receive streams
    canPublishData: true,    // Both can send data channel messages (chat, etc.)
    canPublishSources: [
      TrackSource.CAMERA,
      TrackSource.MICROPHONE,
      TrackSource.SCREEN_SHARE,
      TrackSource.SCREEN_SHARE_AUDIO,
    ],
    canUpdateOwnMetadata: true,
  })

  const token = await at.toJwt()
  console.log(`[generateLiveKitToken] Token generated for ${role} ${participantIdentity} in room ${roomName}`)

  return { token, room: roomName, identity: participantIdentity }
}
