import { createClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ClassroomInterface from "@/app/student/live/[id]/ClassroomInterface"
import { generateLiveKitToken } from "@/lib/livekit"

export default async function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // 1. Authenticate Request
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/auth/login')

  // 2. Fetch Session Data safely using Admin Client to bypass recursive RLS on outcomes
  // Note: True authorization to enter this room is enforced securely by `generateLiveKitToken`
  const adminClient = await createAdminClient()
  const { data: session, error } = await adminClient
    .from('live_sessions')
    .select(`
      *,
      subject:subjects(name),
      teacher:teachers(full_name),
      outcomes:live_session_outcomes(*)
    `)
    .eq('id', id)
    .single()

  if (error || !session) {
    console.error('[StudentClassroomPage] Session not found:', error)
    redirect('/student/live?error=session_not_found')
  }
  
  // Check session status — only allow entry to live sessions
  if (session.status !== 'live') {
    console.warn(`[StudentClassroomPage] Session ${id} is not live (status: ${session.status})`)
    redirect(`/student/live?error=not_live&status=${session.status}`)
  }

  // 2. Generate LiveKit Token
  let token: string
  let serverUrl: string
  
  try {
    const result = await generateLiveKitToken(id, 'student')
    token = result.token
    serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!
    
    if (!serverUrl) {
      throw new Error("LiveKit server URL is not configured")
    }
  } catch (err: any) {
    console.error('[StudentClassroomPage] Token generation failed:', err.message)
    redirect(`/student/live?error=token_failed&reason=${encodeURIComponent(err.message)}`)
  }

  return (
    <ClassroomInterface 
      session={session} 
      token={token!} 
      serverUrl={serverUrl!} 
    />
  )
}
