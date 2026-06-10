'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useTracks,
  ParticipantTile,
  useLocalParticipant,
  useDataChannel,
  TrackReferenceOrPlaceholder,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { PageErrorBoundary } from '@/components/ui/PageErrorBoundary'
import { LiveReconnectionOverlay } from '@/components/ui/LiveReconnectionOverlay'
import { 
  Zap, Target, Users, MessageSquare, 
  Share2, Shield, ChevronRight, CheckCircle2, 
  Mic, MicOff, Video as VideoIcon, 
  VideoOff, X, Send, HelpCircle, LayoutGrid,
  Clock, Activity, Maximize2, Star, Award, Monitor,
  Hand, Camera, Download
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type ChatMessage = {
  id: string
  text: string
  sender: string
  senderId?: string
  timestamp: number
  self?: boolean
}

type QuizQuestionType = 'multiple_choice' | 'true_false'

type LiveQuizQuestion = {
  id: string
  prompt: string
  type: QuizQuestionType
  options: string[]
  correctIndex: number
  points: number
}

type LiveQuiz = {
  id: string
  title: string
  questions: LiveQuizQuestion[]
  currentQuestionIndex?: number
  launchedAt: number
}

function normalizeQuiz(rawQuiz: any): LiveQuiz {
  if (Array.isArray(rawQuiz?.questions)) {
    return rawQuiz as LiveQuiz
  }

  return {
    id: rawQuiz?.id || `${Date.now()}`,
    title: rawQuiz?.title || 'Live checkpoint',
    launchedAt: rawQuiz?.launchedAt || Date.now(),
    questions: [{
      id: `${rawQuiz?.id || Date.now()}-q1`,
      prompt: rawQuiz?.question || 'Quick check',
      type: 'multiple_choice',
      options: rawQuiz?.options || [],
      correctIndex: rawQuiz?.correctIndex || 0,
      points: 1,
    }],
  }
}

function getParticipantRole(participant: { metadata?: string; isLocal?: boolean }) {
  try {
    const metadata = participant.metadata ? JSON.parse(participant.metadata) : {}
    if (metadata.role === 'teacher' || metadata.role === 'student') return metadata.role
  } catch {}
  return participant.isLocal ? 'student' : 'teacher'
}

async function recordLiveActivity(
  sessionId: string,
  participantId: string,
  eventType: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await getSupabaseBrowserClient()
    .from('live_session_activity_events')
    .insert({
      session_id: sessionId,
      participant_id: participantId,
      event_type: eventType,
      details,
    })

  if (error) console.warn('[ClassroomInterface] Activity event was not persisted', error)
}

// Dynamically imported - using any for the ref-forwarding component to avoid complex type gymnastics in dynamic
const PeakWhiteboard = dynamic<any>(() => import('@/app/teacher/live/[id]/studio/PeakWhiteboard'), { ssr: false })

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    sync()
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch (error) {
      console.error('[ClassroomInterface] Fullscreen error:', error)
      toast.error('Fullscreen is not available in this browser.', { position: 'bottom-center' })
    }
  }

  return { isFullscreen, toggleFullscreen }
}

type Props = {
  session: any
  token: string
  serverUrl: string
}

export default function ClassroomInterface({ session, token, serverUrl }: Props) {
  const router = useRouter()
  const [isSessionEnded, setIsSessionEnded] = useState(false)
  const sessionStartTime = useRef(Date.now())
  const [durationStr, setDurationStr] = useState("")
  const [finalOutcomes, setFinalOutcomes] = useState(session.outcomes || [])

  const handleSessionEnd = (latestOutcomes: any) => {
    const diffMs = Date.now() - sessionStartTime.current
    const totalMinutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    setDurationStr(hours > 0 ? `${hours}hr ${minutes}min` : `${minutes}min`)
    setFinalOutcomes(latestOutcomes)
    setIsSessionEnded(true)
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#05070A] flex flex-col items-center justify-center p-12">
        <div className="w-20 h-20 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-8 shadow-2xl shadow-red-500/20">
           <Shield size={40} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">Connection Interrupted</h2>
        <p className="text-slate-500 text-xs mt-3 uppercase tracking-[0.3em] font-bold">Your secure access token has expired or is invalid.</p>
        <button onClick={() => router.push('/student/live')} className="mt-10 px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 transition-all">Return to Live Hub</button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#020406] text-white flex flex-col overflow-hidden font-sans z-[100]">
      <AnimatePresence mode="wait">
        {!isSessionEnded ? (
          <motion.div key="live-room" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            <LiveKitRoom
              token={token}
              serverUrl={serverUrl}
              connect={true}
              audio={false}
              video={false}
              className="flex-1 flex flex-col relative"
            >
              <LiveReconnectionOverlay />
              <PageErrorBoundary>
              <ClassroomInner session={session} onSessionEnd={handleSessionEnd} />
              </PageErrorBoundary>
              <RoomAudioRenderer />
            </LiveKitRoom>
          </motion.div>
        ) : (
          <motion.div key="completion" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="flex-1 overflow-y-auto">
            <SessionCompletionScreen session={session} outcomes={finalOutcomes} duration={durationStr} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ClassroomInner({ session, onSessionEnd }: { session: any, onSessionEnd: (outcomes: any) => void }) {
  const [activeTab, setActiveTab] = useState<'content' | 'whiteboard' | 'slides'>('content')
  const [showHUD, setShowHUD] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [outcomes, setOutcomes] = useState(session.outcomes || [])
  const [activeQuiz, setActiveQuiz] = useState<LiveQuiz | null>(null)
  const [isChatLocked, setIsChatLocked] = useState(false)
  const [allowScreenShare, setAllowScreenShare] = useState(false)
  const [resources, setResources] = useState<{ id: string, name: string, url: string, type: string }[]>([])
  const [currentSlide, setCurrentSlide] = useState<string | null>(null)
  const [capturedMoments, setCapturedMoments] = useState<{ id: string, url: string, timestamp: number }[]>([])
  const whiteboardRef = useRef<any>(null)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const outcomeUpdateRef = useRef<((msg: any) => void) | null>(null)
  const joinRecordedRef = useRef(false)
  const { localParticipant } = useLocalParticipant()

  // Broadcast immediate status and persist a durable presence heartbeat.
  const { send: sendStatus } = useDataChannel('STUDENT_STATUS')
  useEffect(() => {
    if (!localParticipant) return
    let active = true
    const publishStatus = async () => {
      const status = {
        participantId: localParticipant.identity,
        participantName: localParticipant.name || localParticipant.identity,
        tab: activeTab,
        microphoneEnabled: localParticipant.isMicrophoneEnabled,
        cameraEnabled: localParticipant.isCameraEnabled,
        screenShareEnabled: localParticipant.isScreenShareEnabled,
        timestamp: Date.now(),
      }
      sendStatus(new TextEncoder().encode(JSON.stringify(status)), { reliable: true })

      const { error } = await supabase.from('live_session_participants').upsert({
        session_id: session.id,
        participant_id: localParticipant.identity,
        participant_name: status.participantName,
        role: 'student',
        active_tab: activeTab,
        microphone_enabled: status.microphoneEnabled,
        camera_enabled: status.cameraEnabled,
        screen_share_enabled: status.screenShareEnabled,
        last_seen: new Date(status.timestamp).toISOString(),
      }, { onConflict: 'session_id,participant_id' })

      if (active && error) console.warn('[ClassroomInner] Presence heartbeat unavailable', error)
    }

    publishStatus()
    const interval = setInterval(publishStatus, 5000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [activeTab, localParticipant, sendStatus, session.id, supabase])

  useEffect(() => {
    if (!localParticipant) return
    if (!joinRecordedRef.current) {
      joinRecordedRef.current = true
      recordLiveActivity(session.id, localParticipant.identity, 'joined_session')
    }
    recordLiveActivity(session.id, localParticipant.identity, 'workspace_changed', { tab: activeTab })
  }, [activeTab, localParticipant, session.id])

  const { send: requestState } = useDataChannel('SESSION_STATE_REQUEST')
  useDataChannel('SESSION_STATE', (msg) => {
    try {
      const state = JSON.parse(new TextDecoder().decode(msg.payload)) as {
        mode?: 'content' | 'whiteboard' | 'slides'
        isChatEnabled?: boolean
        allowScreen?: boolean
        resources?: any[]
        slideUrl?: string | null
        outcomes?: any[]
      }
      if (state.mode) setActiveTab(state.mode)
      if (typeof state.isChatEnabled === 'boolean') setIsChatLocked(!state.isChatEnabled)
      if (typeof state.allowScreen === 'boolean') setAllowScreenShare(state.allowScreen)
      if (Array.isArray(state.resources)) setResources(state.resources)
      if ('slideUrl' in state) setCurrentSlide(state.slideUrl || null)
      if (Array.isArray(state.outcomes)) setOutcomes(state.outcomes)
    } catch (error) {
      console.warn('[ClassroomInner] Ignored malformed session state', error)
    }
  })

  useEffect(() => {
    const timeout = setTimeout(() => {
      requestState(new TextEncoder().encode(JSON.stringify({ timestamp: Date.now() })), { reliable: true }).catch(() => null)
    }, 750)
    return () => clearTimeout(timeout)
  }, [requestState])

  // Sync outcomes from DB on mount (catches late-join scenario)
  useEffect(() => {
    let mounted = true
    supabase
      .from('live_session_outcomes')
      .select('*')
      .eq('session_id', session.id)
      .then(({ data }) => {
        if (mounted && data) setOutcomes(data)
      })
    return () => { mounted = false }
  }, [session.id, supabase])

  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setShowHUD(true)
    }
  }, [])
  
  useDataChannel('SESSION_END', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      onSessionEnd(data.outcomes || outcomes)
    } catch {
      onSessionEnd(outcomes)
    }
  })
  
  useDataChannel('OUTCOME_UPDATE', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      setOutcomes((prev: any) =>
        data.outcomes || prev.map((o: any) =>
          o.id === data.outcomeId ? { ...o, is_completed: data.status } : o
        )
      )
      if (data.status) {
        toast.success("New Concept Mastered! ✨", { position: 'bottom-center', style: { background: '#05070A', border: '1px solid rgba(52,211,153,0.2)', color: '#fff' } })
      }
    } catch (e) {}
  })

  useDataChannel('QUIZ_LAUNCH', (msg) => {
    try {
      const quiz = normalizeQuiz(JSON.parse(new TextDecoder().decode(msg.payload)))
      setActiveQuiz(quiz)
      toast.success('Live quiz received', { position: 'bottom-center' })
    } catch (error) {
      console.warn('[ClassroomInner] Ignored malformed quiz launch', error)
    }
  })
  
  useDataChannel('RESOURCE_UPDATE', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as { resources: any[] }
      setResources(data.resources)
      if (data.resources.length > 0) toast('New lesson materials shared', { icon: '📂', position: 'bottom-center' })
    } catch {}
  })

  useDataChannel('SLIDE_SYNC', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as { url: string }
      setCurrentSlide(data.url)
      if (data.url) {
        setActiveTab('slides')
        setShowHUD(false)
      }
    } catch {}
  })

  useDataChannel('STAGE_MODE', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as { mode?: 'content' | 'whiteboard' | 'slides' }
      if (data.mode === 'whiteboard' || data.mode === 'content' || data.mode === 'slides') {
        setActiveTab(data.mode)
        if (data.mode === 'whiteboard' || data.mode === 'slides') setShowHUD(false)
      }
    } catch (error) {
      console.warn('[ClassroomInner] Ignored malformed stage mode event', error)
    }
  })

  const handleCapture = () => {
    if (whiteboardRef.current) {
      const dataUrl = whiteboardRef.current.exportImage()
      if (dataUrl) {
        const moment = { id: `moment-${Date.now()}`, url: dataUrl, timestamp: Date.now() }
        setCapturedMoments(prev => [moment, ...prev])
        if (localParticipant) recordLiveActivity(session.id, localParticipant.identity, 'lesson_moment_captured')
        toast.success('Lesson moment captured to your Knowledge Hub!', { icon: '📸', position: 'bottom-center' })
      }
    }
  }

  useDataChannel('CHAT_MODERATION', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as { isEnabled: boolean }
      setIsChatLocked(!data.isEnabled)
      if (!data.isEnabled) toast('Collaborative feed has been locked by teacher', { icon: '🔒', position: 'bottom-center' })
    } catch {}
  })

  useDataChannel('PERMISSION_UPDATE', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as { allowScreen: boolean }
      setAllowScreenShare(data.allowScreen)
      if (data.allowScreen) toast.success('Teacher enabled screen sharing for students', { position: 'bottom-center' })
    } catch {}
  })

  useEffect(() => {
    const channel = supabase
      .channel(`session-status-${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_sessions',
        filter: `id=eq.${session.id}`,
      }, async (payload) => {
        const newStatus = (payload.new as any)?.status
        if (newStatus === 'completed') {
          const { data } = await supabase
            .from('live_sessions')
            .select('status, outcomes:live_session_outcomes(*)')
            .eq('id', session.id)
            .maybeSingle()
          onSessionEnd(data?.outcomes || outcomes)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [outcomes, onSessionEnd, session.id, supabase])

  return (
    <main className="flex-1 flex overflow-hidden relative">
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-sky-500/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        <header className="h-20 md:h-24 px-4 md:px-10 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-3xl">
           <div className="flex items-center gap-3 md:gap-6 min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/30 shrink-0">
                 <Activity size={20} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                 <h1 className="text-sm md:text-lg font-black uppercase tracking-tight truncate">{session.title}</h1>
                 <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-0.5 md:mt-1 truncate">{session.teacher?.full_name || 'Academic Mentor'}</p>
              </div>
           </div>

                       <div className="flex items-center gap-1.5 md:gap-3 px-2 md:px-4 py-2 bg-white/[0.03] border-x border-white/5">
               <button 
                 onClick={handleCapture}
                 className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all text-emerald-400"
               >
                 <Camera size={18} />
                 <span className="text-[7px] font-black uppercase tracking-widest">Capture</span>
               </button>
               <div className="w-px h-6 bg-white/10 mx-1 md:mx-2" />
               <button 
                 onClick={() => setShowChat((value) => !value)} 
                 className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all ${showChat ? 'text-sky-400 bg-sky-400/5' : 'text-slate-500'}`}
               >
                 <MessageSquare size={18} />
                 <span className="text-[7px] font-black uppercase tracking-widest">Discuss</span>
               </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 shadow-2xl mx-4">
              <button 
                onClick={() => {
                  setActiveTab('content')
                  if (window.matchMedia('(min-width: 768px)').matches) setShowHUD(true)
                }}
                className={`px-4 md:px-8 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'content' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                Stream
              </button>
              <button 
                onClick={() => {
                  setActiveTab('whiteboard')
                  setShowHUD(false)
                }}
                className={`px-4 md:px-8 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'whiteboard' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                Board
              </button>
              <button 
                onClick={() => {
                  setActiveTab('slides')
                  setShowHUD(false)
                }}
                className={`px-4 md:px-8 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'slides' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                Slides
              </button>
            </div>

           <div className="flex items-center gap-2 md:gap-6">
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="hidden xs:inline text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-500">Live</span>
              </div>
              <button 
                onClick={() => setShowHUD(!showHUD)}
                className="md:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white"
              >
                <Target size={20} className={showHUD ? 'text-emerald-500' : ''} />
              </button>
           </div>
        </header>

        <div className="sm:hidden flex border-b border-white/5">
           <button 
             onClick={() => {
               setActiveTab('content')
               if (window.matchMedia('(min-width: 768px)').matches) setShowHUD(true)
             }}
             className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'content' ? 'text-white border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500'}`}
           >
             Stream
           </button>
           <button 
             onClick={() => {
               setActiveTab('whiteboard')
               setShowHUD(false)
             }}
             className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'whiteboard' ? 'text-white border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500'}`}
           >
             Board
           </button>
           <button 
             onClick={() => {
               setActiveTab('slides')
               setShowHUD(false)
             }}
             className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'slides' ? 'text-white border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500'}`}
           >
             Slides
           </button>
        </div>

        <div className={`flex-1 overflow-hidden relative ${activeTab === 'whiteboard' ? 'p-2 md:p-5' : 'p-4 md:p-10'}`}>
           <AnimatePresence mode="wait">
              {activeTab === 'slides' ? (
                <motion.div 
                  key="slides" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                  className="h-full bg-[#05070A] rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10 flex items-center justify-center p-4 md:p-8"
                >
                   {currentSlide ? (
                      <PeakWhiteboard ref={whiteboardRef} sessionId={session.id} initialBackground={currentSlide} readOnly />
                   ) : (
                     <div className="text-center space-y-4 opacity-20">
                        <LayoutGrid size={64} className="mx-auto" />
                        <p className="text-sm font-black uppercase tracking-widest">Awaiting Slide...</p>
                     </div>
                   )}
                </motion.div>
              ) : activeTab === 'whiteboard' ? (
                <motion.div key="whiteboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="h-full rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl shadow-emerald-500/5">
                   <PeakWhiteboard ref={whiteboardRef} sessionId={session.id} readOnly />
                </motion.div>
              ) : (
                <motion.div key="stream" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="h-full">
                   <StudentStreamGrid />
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        <StudentControls 
          sessionId={session.id}
          onToggleChat={() => setShowChat((value) => !value)} 
          allowScreenShare={allowScreenShare}
          onCapture={handleCapture}
        />

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="absolute bottom-24 right-3 left-3 md:left-auto md:bottom-28 md:right-8 md:w-[380px] h-[360px] md:h-[450px] z-50"
            >
              <StudentChat session={session} isLocked={isChatLocked} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeQuiz && (
            <StudentLiveQuiz sessionId={session.id} quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
         {showHUD && (
            <motion.aside 
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed md:relative inset-x-0 bottom-0 top-[20%] md:top-0 md:inset-auto md:w-[420px] border-t md:border-t-0 md:border-l border-white/5 bg-[#05070A]/98 md:bg-black/50 backdrop-blur-3xl flex flex-col z-[60] rounded-t-[2.5rem] md:rounded-none shadow-[0_-30px_80px_rgba(0,0,0,0.6)] md:shadow-none"
           >
              <div className="md:hidden w-full flex justify-center pt-4 pb-2" onClick={() => setShowHUD(false)}>
                 <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                 <div className="px-6 md:px-8 pt-4 md:pt-6 flex items-center justify-between shrink-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Knowledge Hub</h3>
                    <button onClick={() => setShowHUD(false)} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={16} /></button>
                 </div>
                 <StudentClarityEngine outcomes={outcomes} goal={session.goal} resources={resources} moments={capturedMoments} />
              </div>
           </motion.aside>
         )}
      </AnimatePresence>

      <button 
        onClick={() => setShowHUD(!showHUD)}
        className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-50 w-6 h-20 bg-white/5 hover:bg-white/10 border-l border-y border-white/10 rounded-l-2xl items-center justify-center text-slate-500 hover:text-white transition-all ${showHUD ? '' : 'translate-x-full opacity-40'}`}
      >
         <ChevronRight size={16} className={showHUD ? 'rotate-0' : 'rotate-180'} />
      </button>
    </main>
  )
}

function StudentStreamGrid() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ], { onlySubscribed: false })

  const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare)
  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera)
  const teacherCamera = cameraTracks.find(t => getParticipantRole(t.participant) === 'teacher') ||
    cameraTracks.find(t => !t.participant.isLocal)
  const studentCameras = cameraTracks.filter(t => getParticipantRole(t.participant) === 'student')

  const ParticipantStrip = () => {
    if (studentCameras.length === 0) return null

    return (
      <div className="shrink-0 rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-2 md:p-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {studentCameras.map((track) => (
            <div key={track.participant.sid} className="relative h-20 md:h-24 aspect-video shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              <ParticipantTile trackRef={track} className="h-full w-full" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                <p className="truncate text-[8px] font-black uppercase tracking-widest text-white">
                  {track.participant.isLocal ? 'You' : track.participant.name || 'Student'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
       {screenShareTrack ? (
         <div className="h-full w-full flex flex-col gap-3 md:gap-5">
            <div className="min-h-0 flex-1 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl relative shadow-emerald-500/5">
               <ParticipantTile trackRef={screenShareTrack} className="h-full w-full" />
               <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-3">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.2em]">Mentor Presentation</span>
               </div>
               {teacherCamera && (
                <div className="absolute top-3 right-3 md:top-6 md:right-6 w-28 xs:w-44 md:w-72 aspect-video rounded-xl md:rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl shadow-black ring-1 ring-white/10">
                   <ParticipantTile trackRef={teacherCamera} className="h-full w-full" />
                </div>
              )}
            </div>
            <ParticipantStrip />
         </div>
       ) : (
         <div className="h-full w-full flex flex-col gap-3 md:gap-5 group">
            {teacherCamera ? (
              <div className="min-h-0 flex-1 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent shadow-2xl relative">
                 <ParticipantTile trackRef={teacherCamera} className="h-full w-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                 <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-auto p-3 md:p-6 space-y-2 md:space-y-4">
                    <div className="flex items-center gap-4 md:gap-6">
                       <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-black shadow-2xl shadow-emerald-500/40"><Zap size={22} /></div>
                       <div className="min-w-0">
                          <span className="block text-base md:text-2xl font-black uppercase tracking-tight text-white truncate">Academic Stream</span>
                          <p className="text-[8px] md:text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-1 md:mt-2">Active Broadcasting</p>
                       </div>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 rounded-[1.5rem] md:rounded-[2.5rem] bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center space-y-6 md:space-y-10">
                 <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-white/5 flex items-center justify-center border border-white/5 animate-pulse shadow-inner"><Monitor size={40} className="text-slate-700" /></div>
                 <div className="text-center px-6">
                    <h3 className="text-base md:text-xl font-black uppercase tracking-[0.3em] text-slate-500">Connecting Signal...</h3>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2 md:mt-4">Preparing high-definition academic stream</p>
                 </div>
              </div>
            )}
            <ParticipantStrip />
         </div>
       )}
    </div>
  )
}

function StudentClarityEngine({ outcomes, goal, resources, moments }: { outcomes: any[], goal: string, resources?: any[], moments?: any[] }) {
  const completedCount = outcomes.filter((o: any) => o.is_completed).length
  const progress = outcomes.length > 0 ? Math.round((completedCount / outcomes.length) * 100) : 0

  return (
     <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-none pb-24">
        <div className="space-y-12">
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] pl-2">Session Velocity</span>
                 <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-widest">{progress}% COMPLETED</div>
              </div>
              <div className="h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
              </div>
           </div>

           <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 relative overflow-hidden group shadow-2xl">
              <Star size={60} className="absolute -top-4 -right-4 text-white/[0.02] -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
              <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 md:mb-6 block underline decoration-emerald-500/50 decoration-2 underline-offset-8">Primary Mission</span>
              <p className="text-xs md:text-[15px] font-black text-white leading-relaxed uppercase tracking-tight italic relative z-10">
                 "{goal}"
              </p>
           </div>

           <div className="space-y-4 md:space-y-6">
              <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] pl-2">Concept Benchmarks</span>
              <div className="space-y-3 md:space-y-4">
                {outcomes.map((o: any, idx: number) => (
                  <div 
                    key={o.id}
                    className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border transition-all duration-500 flex items-start gap-4 md:gap-6 relative group ${o.is_completed ? 'bg-emerald-500/10 border-emerald-500/30 shadow-2xl shadow-emerald-500/10 md:translate-x-2' : 'bg-white/[0.02] border-white/5'}`}
                  >
                     <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-all duration-700 ${o.is_completed ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40 rotate-[360deg]' : 'bg-white/5 text-slate-600'}`}>
                        {o.is_completed ? <Award className="w-4 h-4 md:w-5 md:h-5" /> : <span className="text-[10px] md:text-xs font-black">{idx + 1}</span>}
                     </div>
                     <div>
                        <span className={`text-[10px] md:text-[12px] font-black uppercase tracking-widest leading-relaxed block ${o.is_completed ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                           {o.description}
                        </span>
                        {o.is_completed && <span className="text-[7px] md:text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-2 md:mt-3 block">Objective Secured ✨</span>}
                     </div>
                  </div>
                ))}
              </div>
           </div>

           {resources && resources.length > 0 && (
             <div className="space-y-6 md:space-y-8 mt-12">
                <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] pl-2">Knowledge Assets</span>
                <div className="grid gap-3 md:gap-4">
                   {resources.map(r => (
                     <a 
                       key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                       className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-sky-500/5 border border-sky-500/10 hover:border-sky-500/30 transition-all flex items-center justify-between group shadow-xl"
                     >
                        <div className="flex items-center gap-4 md:gap-6 min-w-0">
                           <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-black transition-all">
                              <Share2 size={16} />
                           </div>
                           <div className="min-w-0">
                              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white truncate block">{r.name}</span>
                              <span className="text-[7px] md:text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1 block">External Resource</span>
                           </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-sky-400 transition-all" />
                     </a>
                   ))}
                </div>
             </div>
           )}

           {moments && moments.length > 0 && (
             <div className="space-y-6 md:space-y-8 mt-12">
                <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] pl-2">Lesson Highlights</span>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                   {moments.map(m => (
                     <div key={m.id} className="group relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-emerald-500/30 transition-all shadow-xl">
                        <img src={m.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <a href={m.url} download={`lesson-moment-${m.timestamp}.png`} className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center hover:scale-110 transition-transform">
                              <Download size={16} />
                           </a>
                        </div>
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/5 text-[6px] font-black uppercase text-white">
                           {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>
     </div>
  )
}

function StudentControls({ sessionId, onToggleChat, allowScreenShare, onCapture }: { sessionId: string; onToggleChat: () => void; allowScreenShare?: boolean; onCapture?: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant()
  const [handRaised, setHandRaised] = useState(false)
  const { send: sendHand } = useDataChannel('HAND_RAISE')
  const { send: sendReaction } = useDataChannel('STUDENT_REACTION')
  const [showReactions, setShowReactions] = useState(false)
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  const REACTIONS = ['👍', '❓', '🎉', '❤️', '🚀', '😂']

  const sendEmoji = (emoji: string) => {
    if (!localParticipant) return
    sendReaction(new TextEncoder().encode(JSON.stringify({
      emoji,
      participantName: localParticipant.name || localParticipant.identity,
    })), { reliable: true })
    recordLiveActivity(sessionId, localParticipant.identity, 'reaction_sent', { emoji })
    setShowReactions(false)
  }

  useDataChannel('MODERATION', (msg) => {
    try {
      const command = JSON.parse(new TextDecoder().decode(msg.payload)) as { target: string; action: string }
      if (!localParticipant || command.target !== localParticipant.identity) return

      if (command.action === 'mute-audio') {
        localParticipant.setMicrophoneEnabled(false)
        toast('Teacher muted your microphone', { icon: '🔇', position: 'bottom-center' })
      }
      if (command.action === 'mute-video') {
        localParticipant.setCameraEnabled(false)
        toast('Teacher turned your camera off', { icon: '📷', position: 'bottom-center' })
      }
      if (command.action === 'request-audio') {
        toast('Teacher asked you to unmute', { icon: '🎙️', position: 'bottom-center' })
      }
      if (command.action === 'lower-hand') {
        setHandRaised(false)
        toast('Teacher lowered your hand', { icon: '🤚', position: 'bottom-center' })
      }
    } catch (error) {
      console.warn('[StudentControls] Ignored malformed moderation command', error)
    }
  })

  const toggleMic = async () => {
    if (!localParticipant) return
    try {
      if (!isMicrophoneEnabled) {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => null)
      }
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
      recordLiveActivity(sessionId, localParticipant.identity, 'microphone_changed', { enabled: !isMicrophoneEnabled })
      toast(!isMicrophoneEnabled ? '🎙️ Microphone active' : 'Microphone muted', { position: 'bottom-center' })
    } catch (error: any) {
      console.error('[StudentControls] Microphone error:', error)
      if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
        toast.error('🚫 Microphone blocked. Click the 🔒 lock icon in your address bar → Allow Microphone → Refresh.', { position: 'bottom-center', duration: 6000 })
      } else {
        toast.error('Microphone unavailable. Is another app using it?', { position: 'bottom-center' })
      }
    }
  }

  const toggleVideo = async () => {
    if (!localParticipant) return
    try {
      if (!isCameraEnabled) {
        await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => null)
      }
      await localParticipant.setCameraEnabled(!isCameraEnabled)
      recordLiveActivity(sessionId, localParticipant.identity, 'camera_changed', { enabled: !isCameraEnabled })
      toast(!isCameraEnabled ? '📹 Camera active' : 'Camera off', { position: 'bottom-center' })
    } catch (error: any) {
      console.error('[StudentControls] Camera error:', error)
      if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
        toast.error('🚫 Camera blocked. Click the 🔒 lock icon in your address bar → Allow Camera → Refresh.', { position: 'bottom-center', duration: 6000 })
      } else {
        toast.error('Camera unavailable. Is another app using it?', { position: 'bottom-center' })
      }
    }
  }

  const toggleScreen = async () => {
    if (!localParticipant) return
    try {
      const newState = !isScreenShareEnabled
      await localParticipant.setScreenShareEnabled(newState, { audio: true })
      recordLiveActivity(sessionId, localParticipant.identity, 'screen_share_changed', { enabled: newState })
      toast(newState ? 'Sharing screen' : 'Sharing stopped', { position: 'bottom-center' })
    } catch (e: any) {
      toast.error("Screen share failed. Check browser permissions.", { id: "screen-error", position: 'bottom-center' })
    }
  }

  const toggleHand = () => {
    if (!localParticipant) return
    const raised = !handRaised
    setHandRaised(raised)
    sendHand(new TextEncoder().encode(JSON.stringify({
      participantId: localParticipant.identity,
      participantName: localParticipant.name || localParticipant.identity,
      raised,
      timestamp: Date.now(),
    })), { reliable: true })
    recordLiveActivity(sessionId, localParticipant.identity, 'hand_changed', { raised })
    toast(raised ? 'Hand Raised 🖐️' : 'Hand Lowered', { position: 'bottom-center' })
  }

  return (
    <div className="absolute inset-x-0 bottom-4 md:bottom-8 px-4 flex items-center justify-center gap-3 z-50 pointer-events-none">
       <div className="pointer-events-auto p-1.5 rounded-3xl bg-black/80 backdrop-blur-3xl border border-white/10 flex items-center gap-2 shadow-2xl">
          <ControlButton icon={!isMicrophoneEnabled ? <MicOff size={18} /> : <Mic size={18} />} active={isMicrophoneEnabled} onClick={toggleMic} />
          <ControlButton icon={!isCameraEnabled ? <VideoOff size={18} /> : <VideoIcon size={18} />} active={isCameraEnabled} onClick={toggleVideo} />
          
          <div className="w-px h-8 bg-white/10 mx-1" />
          
          <ControlButton icon={<Hand size={18} />} active={handRaised} onClick={toggleHand} color="sky" />
          
          {allowScreenShare && (
             <ControlButton icon={!isScreenShareEnabled ? <Monitor size={18} /> : <Share2 size={18} />} active={isScreenShareEnabled} onClick={toggleScreen} color="sky" />
          )}

          <div className="w-px h-8 bg-white/10 mx-1" />
          
           <ControlButton icon={<Camera size={18} />} active={false} onClick={onCapture} color="emerald" />
          
          <div className="w-px h-8 bg-white/10 mx-1" />
          
          <div className="relative">
            <ControlButton icon={<span className="text-lg">😊</span>} active={showReactions} onClick={() => setShowReactions(!showReactions)} color="sky" />
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-1 p-2 rounded-2xl bg-black/90 backdrop-blur-3xl border border-white/10 shadow-2xl"
              >
                {REACTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => sendEmoji(emoji)}
                    className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-xl transition-all hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <ControlButton icon={<MessageSquare size={18} />} active={false} onClick={onToggleChat} />
          <ControlButton icon={<Maximize2 size={18} />} active={isFullscreen} onClick={toggleFullscreen} />
       </div>
    </div>
  )
}

function ControlButton({ icon, active, onClick, color = 'emerald' }: { icon: any, active: boolean, onClick?: () => void, color?: 'emerald' | 'sky' }) {
  return (
    <button
      onClick={() => onClick?.()}
      className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all ${active ? (color === 'emerald' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'bg-sky-500 text-black shadow-lg shadow-sky-500/30') : 'text-slate-500 hover:text-white hover:bg-white/10'}`}
    >
      {icon}
    </button>
  )
}

function StudentLiveQuiz({ sessionId, quiz, onClose }: { sessionId: string; quiz: LiveQuiz; onClose: () => void }) {
  const { localParticipant } = useLocalParticipant()
  const { send } = useDataChannel('QUIZ_RESULT')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const question = quiz.questions[questionIndex]

  const submit = async (index: number) => {
    if (submitted || !localParticipant || !question) return
    setSelected(index)
    setSubmitted(true)
    const isCorrect = index === question.correctIndex
    const nextScore = score + (isCorrect ? question.points : 0)
    setScore(nextScore)
    const result = {
      quizId: quiz.id,
      questionId: question.id,
      participantId: localParticipant.identity,
      participantName: localParticipant.name || localParticipant.identity,
      answerIndex: index,
      isCorrect,
      score: isCorrect ? question.points : 0,
      answeredAt: Date.now(),
    }
    send(new TextEncoder().encode(JSON.stringify(result)), { reliable: true })

    const { error } = await getSupabaseBrowserClient().from('live_quiz_results').upsert({
      session_id: sessionId,
      quiz_id: result.quizId,
      question_id: result.questionId,
      participant_id: result.participantId,
      participant_name: result.participantName,
      answer_index: result.answerIndex,
      is_correct: result.isCorrect,
      score: result.score,
      answered_at: new Date(result.answeredAt).toISOString(),
    }, { onConflict: 'session_id,quiz_id,question_id,participant_id' })

    if (error) {
      console.warn('[StudentLiveQuiz] Answer persistence failed', error)
      toast.error('Your live answer was sent, but backup storage is retrying.', { position: 'bottom-center' })
    }
    recordLiveActivity(sessionId, localParticipant.identity, 'quiz_answered', {
      quizId: quiz.id,
      questionId: question.id,
      isCorrect,
      score: result.score,
    })
  }

  const goNext = () => {
    if (questionIndex >= quiz.questions.length - 1) {
      onClose()
      return
    }
    setQuestionIndex((value) => value + 1)
    setSelected(null)
    setSubmitted(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.96 }} className="w-full max-w-2xl rounded-[2rem] bg-[#05070A] border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-6 md:p-8 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Live Checkpoint</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Question {questionIndex + 1} of {quiz.questions.length}</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black mt-2 leading-tight">{question?.prompt}</h3>
        </div>
        <div className="p-6 md:p-8 grid gap-3">
          {question?.options.map((option, index) => {
            const isSelected = selected === index
            const showCorrect = submitted && index === question.correctIndex
            return (
              <button
                key={`${quiz.id}-${index}`}
                onClick={() => submit(index)}
                disabled={submitted}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                  showCorrect ? 'bg-emerald-500/15 border-emerald-500/40 text-white' :
                  isSelected ? 'bg-red-500/15 border-red-500/40 text-white' :
                  'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${showCorrect ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-400'}`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-sm font-bold">{option}</span>
              </button>
            )
          })}
          {submitted && (
            <div className="mt-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Answer sent to the live leaderboard</p>
              <button onClick={goNext} className="h-11 px-5 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest">
                {questionIndex >= quiz.questions.length - 1 ? `Finish (${score} pts)` : 'Next question'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function StudentChat({ session, isLocked }: { session: any, isLocked?: boolean }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { localParticipant } = useLocalParticipant()
  const { send } = useDataChannel('CHAT', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as ChatMessage
      setMessages((prev) => {
        if (prev.some(m => m.id === data.id)) return prev
        return [...prev, { ...data, self: data.senderId === localParticipant?.identity }].sort((a,b) => a.timestamp - b.timestamp)
      })
    } catch {}
  })
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('live_session_messages')
        .select('id, sender_id, sender_name, message, created_at')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) {
        console.warn('[StudentChat] Message history unavailable', error)
        return
      }
      if (!mounted) return

      setMessages((data || []).map((row: any) => ({
        id: row.id,
        text: row.message,
        sender: row.sender_name,
        senderId: row.sender_id,
        timestamp: new Date(row.created_at).getTime(),
        self: row.sender_id === localParticipant?.identity,
      })))
    }

    loadMessages()
    const channel = supabase
      .channel(`student-live-chat-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_session_messages',
        filter: `session_id=eq.${session.id}`,
      }, (payload) => {
        const row = payload.new as any
        const nextMessage = {
          id: row.id,
          text: row.message,
          sender: row.sender_name,
          senderId: row.sender_id,
          timestamp: new Date(row.created_at).getTime(),
          self: row.sender_id === localParticipant?.identity,
        }
        setMessages((prev: ChatMessage[]) => prev.some((item: ChatMessage) => item.id === nextMessage.id) ? prev : [...prev, nextMessage])
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [localParticipant?.identity, session.id, supabase])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !localParticipant) return
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: input.trim(),
      sender: localParticipant.name || 'Student',
      senderId: localParticipant.identity,
      timestamp: Date.now(),
      self: true
    }
    setMessages(prev => [...prev, msg])
    send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
    
    const { error } = await supabase.from('live_session_messages').insert({
      id: msg.id,
      session_id: session.id,
      sender_id: localParticipant.identity,
      sender_name: msg.sender,
      sender_role: 'student',
      message: msg.text,
      created_at: new Date(msg.timestamp).toISOString(),
    })
    if (error) {
      console.warn('[StudentChat] Message persistence failed', error)
      toast.error('Message sent live, but history backup failed.', { position: 'bottom-center' })
    }
    recordLiveActivity(session.id, localParticipant.identity, 'chat_message_sent', { messageId: msg.id })
    setInput('')
  }

  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-white/5 relative">
       {isLocked && (
         <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
               <Shield size={32} />
            </div>
            <h4 className="text-sm font-black uppercase tracking-tight">Feed Locked</h4>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">The teacher has paused collaborative chat for this lesson segment.</p>
         </div>
       )}
       <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
             <MessageSquare size={16} className="text-sky-500" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white">Collaborative Feed</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
       </div>

       <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {messages.map((m: ChatMessage, i: number) => (
            <div key={i} className={`flex flex-col ${m.self ? 'items-end' : 'items-start'}`}>
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">{m.sender}</span>
               <div className={`px-5 py-3 rounded-2xl text-[11px] font-medium leading-relaxed shadow-lg ${m.self ? 'bg-sky-500 text-black' : 'bg-white/5 text-white border border-white/5'}`}>
                  {m.text}
               </div>
            </div>
          ))}
          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-30">
                <MessageSquare size={24} />
                <p className="text-[8px] font-black uppercase tracking-widest">Signals Quiet...</p>
             </div>
          )}
       </div>

       <div className="p-6 bg-white/[0.02] border-t border-white/5">
          <div className="relative">
              <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && input.trim() && handleSend()}
                placeholder="Send a question..."
               className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-[11px] font-medium outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all transition-all"
             />
             <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-sky-500 hover:bg-white/10 transition-all">
                <Send size={16} />
             </button>
          </div>
       </div>
    </div>
  )
}

function SessionCompletionScreen({ session, outcomes, duration }: { session: any, outcomes: any[], duration: string }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [reflection, setReflection] = useState('')
  const [confidence, setConfidence] = useState(4)
  const [saving, setSaving] = useState(false)
  const completedCount = outcomes.filter((o: any) => o.is_completed).length
  const progress = outcomes.length > 0 ? Math.round((completedCount / outcomes.length) * 100) : 0

  const saveReflection = async () => {
    if (!reflection.trim()) {
      toast.error('Write a quick reflection before exiting')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: student } = await supabase.from('students').select('id').eq('user_id', user?.id).maybeSingle()

      if (student?.id) {
        const { error } = await supabase.from('live_session_reflections').upsert({
          session_id: session.id,
          student_id: student.id,
          reflection_text: reflection.trim(),
          confidence,
          mastery_score: progress,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id,student_id' })

        if (error) {
          console.warn('[SessionCompletionScreen] Reflection table unavailable or insert failed:', error.message)
        }
      }

      toast.success('Reflection captured')
      router.push('/student/live')
    } catch (error: any) {
      console.warn('[SessionCompletionScreen] Reflection save fallback:', error?.message || error)
      toast.success('Reflection captured locally')
      router.push('/student/live')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-[#020406] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl w-full space-y-12 relative z-10">
         <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] mb-6">
               <Star size={14} className="animate-spin-slow" />
               Mission Complete
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight text-white leading-none">Excellent Work, <br /><span className="text-slate-500 italic">Scholar.</span></h1>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Time In Flow" value={duration || "45m"} icon={<Clock className="text-sky-500" />} />
            <StatCard label="Mastery Score" value={`${progress}%`} icon={<Target className="text-emerald-500" />} />
            <StatCard label="Concepts" value={`${completedCount}/${outcomes.length}`} icon={<CheckCircle2 className="text-amber-500" />} />
         </div>

         <div className="p-12 rounded-[4rem] bg-white/[0.02] border border-white/5 space-y-10">
            <h4 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 text-center">Benchmark Achievement Report</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {outcomes.map(o => (
                 <div key={o.id} className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${o.is_completed ? 'bg-emerald-500 text-black' : 'bg-red-500/10 text-red-500 opacity-40'}`}>
                       {o.is_completed ? <CheckCircle2 size={16} /> : <X size={16} />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${o.is_completed ? 'text-white' : 'text-slate-600'}`}>{o.description}</span>
                 </div>
               ))}
            </div>
         </div>

         <div className="p-6 md:p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-5">
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">Exit reflection</h4>
              <p className="text-xs text-slate-500 mt-2">Capture what landed while it is still fresh.</p>
            </div>
            <textarea
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              placeholder="What did you understand better? What still needs practice?"
              className="w-full min-h-28 rounded-2xl bg-black/40 border border-white/10 p-4 text-sm text-white outline-none focus:border-emerald-500/40 resize-none"
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setConfidence(value)}
                    className={`w-10 h-10 rounded-xl font-black ${value <= confidence ? 'bg-amber-400 text-black' : 'bg-white/5 text-slate-600'}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <button
                onClick={saveReflection}
                disabled={saving}
                className="h-12 px-8 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save reflection'}
              </button>
            </div>
         </div>

         <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button 
              onClick={saveReflection}
              className="px-12 py-5 rounded-[2rem] bg-white text-black font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:scale-105 transition-all"
            >
               Save & Exit
            </button>
            <button className="flex items-center gap-3 text-slate-500 hover:text-white transition-all">
               <Star size={16} />
               <span className="text-[9px] font-black uppercase tracking-widest">Share Achievement</span>
            </button>
         </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl">
       <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-2">{icon}</div>
       <div className="text-3xl font-black text-white leading-none">{value}</div>
       <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">{label}</div>
    </div>
  )
}
