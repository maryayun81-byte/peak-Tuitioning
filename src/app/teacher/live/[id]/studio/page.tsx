import { createClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import StudioInterface from "@/app/teacher/live/[id]/studio/StudioInterface"
import { generateLiveKitToken } from "@/lib/livekit"

export default async function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // 1. Authenticate Request
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/auth/login')

  // 2. Fetch Session Data safely using Admin Client to bypass complex recursive RLS on outcomes table
  // Note: True authorization to enter this room is enforced securely by `generateLiveKitToken` below
  const adminClient = await createAdminClient()
  const { data: session, error } = await adminClient
    .from('live_sessions')
    .select(`
      *,
      subject:subjects(name),
      class:classes(name),
      outcomes:live_session_outcomes(*)
    `)
    .eq('id', id)
    .single()

  if (error || !session) redirect('/teacher/live')

  // 2. Generate LiveKit Token directly (no internal network fetch needed)
  try {
    const { token } = await generateLiveKitToken(id, 'teacher')
    
    return (
      <StudioInterface 
        session={session} 
        token={token} 
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!} 
      />
    )
  } catch (err: any) {
    console.error('Studio Token Error:', err)
    const errorCode = err.message === 'You are not authorized for this session' ? 'unauthorized' : 'token_failed'
    redirect(`/teacher/live?error=${errorCode}`)
  }
}
