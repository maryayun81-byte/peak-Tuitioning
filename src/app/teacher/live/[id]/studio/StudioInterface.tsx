'use client'

import { useState, useEffect, useMemo, useRef, useCallback, type Dispatch, type SetStateAction } from 'react'
import dynamic from 'next/dynamic'
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useTracks,
  ParticipantTile,
  TrackReferenceOrPlaceholder,
  useLocalParticipant,
  useDataChannel,
  useParticipants,
} from '@livekit/components-react'
import { Track, ConnectionState } from 'livekit-client'
import { PageErrorBoundary } from '@/components/ui/PageErrorBoundary'
import { LiveReconnectionOverlay } from '@/components/ui/LiveReconnectionOverlay'
import Link from 'next/link'
import { 
  Zap, Target, Users, MessageSquare, 
  LayoutGrid, PenTool, Share2, Shield, 
  ChevronRight, CheckCircle2, Clock, 
  Maximize2, Mic, MicOff, Video as VideoIcon, 
  VideoOff, X, MoreVertical, Send,
  Play, Square, HelpCircle, Activity,
  Settings, Monitor, BarChart3, Radio, Plus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateOutcomeStatus, completeLiveSession } from '@/app/actions/live-sessions'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// Dynamically imported to prevent Konva SSR issues
const PeakWhiteboard = dynamic<any>(() => import('@/app/teacher/live/[id]/studio/PeakWhiteboard'), { ssr: false })

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

type QuizResult = {
  quizId: string
  questionId: string
  participantId: string
  participantName: string
  answerIndex: number
  isCorrect: boolean
  score: number
  answeredAt: number
}

type QuizDraft = {
  title: string
  questions: LiveQuizQuestion[]
}

type StudentActivity = {
  tab: string
  lastSeen: number
  microphoneEnabled?: boolean
  cameraEnabled?: boolean
  screenShareEnabled?: boolean
  handRaised?: boolean
  lastAction?: string
  lastActionAt?: number
}

const createQuizQuestion = (type: QuizQuestionType = 'multiple_choice'): LiveQuizQuestion => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  prompt: '',
  type,
  options: type === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
  correctIndex: 0,
  points: 1,
})

function getParticipantRole(participant: { metadata?: string; isLocal?: boolean }) {
  try {
    const metadata = participant.metadata ? JSON.parse(participant.metadata) : {}
    if (metadata.role === 'teacher' || metadata.role === 'student') return metadata.role
  } catch {}
  return participant.isLocal ? 'teacher' : 'student'
}

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
      console.error('[StudioInterface] Fullscreen error:', error)
      toast.error('Fullscreen is not available in this browser.')
    }
  }

  return { isFullscreen, toggleFullscreen }
}

type Props = {
  session: any
  token: string
  serverUrl: string
}

export default function StudioInterface({ session, token, serverUrl }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'content' | 'whiteboard' | 'slides'>('content')
  const [rightPanel, setRightPanel] = useState<'outcomes' | 'chat' | 'participants' | 'resources'>('outcomes')
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [sessionOutcomes, setSessionOutcomes] = useState(session.outcomes || [])
  const [isChatEnabled, setIsChatEnabled] = useState(true)
  const [allowStudentScreen, setAllowStudentScreen] = useState(false)
  const [resources, setResources] = useState<{ id: string, name: string, url: string, type: string }[]>([])
  const [currentSlide, setCurrentSlide] = useState<string | null>(null)
  const [studentActivity, setStudentActivity] = useState<Record<string, StudentActivity>>({})
  const [lastQuizResults, setLastQuizResults] = useState<{ results: QuizResult[], quiz: LiveQuiz | null }>({ results: [], quiz: null })
  const [reactions, setReactions] = useState<{ id: string, emoji: string, participant: string, x: number, y: number }[]>([])
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  useEffect(() => {
    let mounted = true
    const mergePresence = (row: any) => {
      if (!mounted || !row?.participant_id) return
      setStudentActivity((previous) => ({
        ...previous,
        [row.participant_id]: {
          tab: row.active_tab || 'content',
          lastSeen: new Date(row.last_seen || Date.now()).getTime(),
          microphoneEnabled: Boolean(row.microphone_enabled),
          cameraEnabled: Boolean(row.camera_enabled),
          screenShareEnabled: Boolean(row.screen_share_enabled),
          handRaised: Boolean(row.hand_raised),
        },
      }))
    }

    supabase
      .from('live_session_participants')
      .select('*')
      .eq('session_id', session.id)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[StudioInterface] Participant history unavailable', error)
          return
        }
        data?.forEach(mergePresence)
      })

    const channel = supabase
      .channel(`teacher-live-presence-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_session_participants',
        filter: `session_id=eq.${session.id}`,
      }, (payload) => mergePresence(payload.new))
      .subscribe()

    const mergeEvent = (row: any) => {
      if (!mounted || !row?.participant_id) return
      setStudentActivity((previous) => {
        const existing = previous[row.participant_id]
        const actionTime = new Date(row.created_at || Date.now()).getTime()
        if (existing?.lastActionAt && existing.lastActionAt > actionTime) return previous
        return {
          ...previous,
          [row.participant_id]: {
            ...existing,
            tab: existing?.tab || 'content',
            lastSeen: existing?.lastSeen || actionTime,
            lastAction: String(row.event_type || '').replaceAll('_', ' '),
            lastActionAt: actionTime,
          },
        }
      })
    }

    supabase
      .from('live_session_activity_events')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[StudioInterface] Activity timeline unavailable', error)
          return
        }
        data?.slice().reverse().forEach(mergeEvent)
      })

    const activityChannel = supabase
      .channel(`teacher-live-activity-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_session_activity_events',
        filter: `session_id=eq.${session.id}`,
      }, (payload) => mergeEvent(payload.new))
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
      supabase.removeChannel(activityChannel)
    }
  }, [session.id, supabase])

  if (!token) {
    return (
      <div className="fixed inset-0 bg-[#05070A] flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
           <Radio size={32} className="animate-pulse" />
        </div>
        <div className="text-center">
           <h2 className="text-xl font-black uppercase tracking-tight">Studio Link Failed</h2>
           <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Unable to establish a secure connection.</p>
        </div>
        <button onClick={() => router.push('/teacher/live')} className="px-8 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px]">Return to Dashboard</button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#020406] text-white flex flex-col overflow-hidden font-sans z-[100]">
      {/* BACKGROUND ORB EFFECTS */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />

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
        <StageModeBroadcaster mode={activeTab} />
        <ChatModerationBroadcaster isEnabled={isChatEnabled} />
        <StudentPermissionBroadcaster allowScreen={allowStudentScreen} />
        <ResourceBroadcaster resources={resources} />
        <SlideBroadcaster url={currentSlide} />
        <SessionStateBroadcaster
          mode={activeTab}
          isChatEnabled={isChatEnabled}
          allowScreen={allowStudentScreen}
          resources={resources}
          slideUrl={currentSlide}
          outcomes={sessionOutcomes}
        />
        <HardwareDoctor />
        <StudentJoinNotifier />
        <StudentActivityTracker onActivity={(id, activity) => setStudentActivity(prev => ({ ...prev, [id]: { ...prev[id], ...activity, lastSeen: Date.now() } }))} />
        <HandRaiseNotifier />
        <ReactionOverlay reactions={reactions} setReactions={setReactions} />
        {/* --- ULTRA PREMIUM HEADER --- */}
        <header className="min-h-20 md:min-h-24 border-b border-white/5 px-4 md:px-10 py-3 flex items-center justify-between gap-4 bg-black/40 backdrop-blur-3xl z-50">
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
               <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black shadow-[0_0_30px_rgba(52,211,153,0.3)] shrink-0">
                  <Radio size={20} className="animate-pulse" />
               </div>
               <div className="min-w-0">
                  <div className="flex items-center gap-2">
                     <h1 className="text-xs md:text-sm font-black uppercase tracking-[0.15em] leading-none truncate">{session.title}</h1>
                     <span className="hidden xs:inline-block px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[7px] md:text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Live</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 md:mt-1.5 truncate">
                     <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{session.subject?.name}</span>
                     <div className="hidden xs:block w-1 h-1 rounded-full bg-white/10" />
                     <span className="hidden xs:block text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{session.class?.name}</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 md:gap-4 shrink-0">
             <div className="hidden lg:flex items-center gap-8 mr-4">
                 <LiveAudienceStat />
                 <LiveUpstreamStat />
                 <SessionUptime />
              </div>
             <MobileAudienceStat />
             <Link
               href="/teacher/live"
               target="_blank"
               className="hidden sm:flex px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-[9px] font-black uppercase tracking-widest"
             >
               Schedule Next
             </Link>
             <div className="hidden md:block h-10 w-px bg-white/10" />
             <EndSessionButton session={session} outcomes={sessionOutcomes} />
          </div></header>

        {/* --- MAIN WORKSPACE --- */}
        <main className="flex-1 flex overflow-hidden relative">
           {/* CONTENT AREA */}
           <div className="flex-1 relative flex flex-col min-w-0">
              {/* INTERACTIVE HUD OVERLAY — Responsive positioning */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 md:top-5 z-40 p-1 md:p-1.5 rounded-xl md:rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 flex gap-1 shadow-2xl max-w-[calc(100vw-1.5rem)] overflow-x-auto">
                 <button 
                   onClick={() => setActiveTab('content')}
                   className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'content' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                 >
                   <Monitor size={12} className="md:w-[14px] md:h-[14px]" />
                   Stream
                 </button>
                 <button 
                   onClick={() => setActiveTab('whiteboard')}
                   className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'whiteboard' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                 >
                   <PenTool size={12} className="md:w-[14px] md:h-[14px]" />
                   Board
                 </button>
                 <button 
                   onClick={() => setActiveTab('slides')}
                   className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'slides' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                 >
                   <LayoutGrid size={12} className="md:w-[14px] md:h-[14px]" />
                   Slides
                 </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                 <AnimatePresence mode="wait">
                     {activeTab === 'slides' ? (
                       <SlideStudio 
                         currentSlide={currentSlide} 
                         onSlideChange={setCurrentSlide} 
                         sessionId={session.id}
                       />
                     ) : activeTab === 'whiteboard' ? (
                       <motion.div 
                        key="whiteboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                        className="flex-1"
                      >
                         <PeakWhiteboard sessionId={session.id} />
                      </motion.div>
                     ) : (
                       <motion.div 
                        key="stream" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                        className="flex-1 p-4 md:p-8"
                      >
                         <TeacherGrid />
                      </motion.div>
                     )}
                 </AnimatePresence>
              </div>

              {/* FLOATING CONTROL DOCK — Full width on mobile */}
              <StudioControls sessionId={session.id} onToggleChat={() => { setRightPanel('chat'); setShowRightPanel(true); }} />
           </div>


            {/* Desktop panel collapse/expand toggle — always visible including fullscreen */}
            <button
              onClick={() => setShowRightPanel(p => !p)}
              title={showRightPanel ? 'Collapse panel' : 'Expand Panel'}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-[70] w-8 h-24 bg-black/70 hover:bg-emerald-500/10 border-l border-y border-white/10 hover:border-emerald-500/30 rounded-l-2xl flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-400 transition-all duration-300 backdrop-blur-xl"
            >
              <ChevronRight size={14} className={`transition-transform duration-300 ${showRightPanel ? 'rotate-0' : 'rotate-180'}`} />
              {!showRightPanel && (
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                </div>
              )}
            </button>
            {/* Fullscreen-safe panel toggle — fixed position so it's reachable in fullscreen */}
            {/* Fullscreen-safe panel toggle — fixed position so it's reachable in fullscreen */}
            {!showRightPanel && (
              <button
                onClick={() => setShowRightPanel(true)}
                className="fixed right-3 top-1/2 -translate-y-1/2 z-[120] flex flex-col items-center gap-2 px-3 py-6 rounded-2xl bg-sky-500 text-black hover:bg-white transition-all duration-300 shadow-[0_0_40px_rgba(14,165,233,0.4)] group"
                title="Open Studio Panel"
              >
                <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[8px] font-black uppercase tracking-widest" style={{writingMode:'vertical-rl'}}>Open Studio Panel</span>
              </button>
            )}

           {/* SIDEBAR SYSTEM — Responsive */}
           <AnimatePresence>
              {showRightPanel && (
                <motion.aside
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="fixed md:relative inset-x-0 bottom-0 top-[18%] md:top-0 md:inset-auto md:w-[390px] xl:w-[420px] border-t md:border-t-0 md:border-l border-white/5 bg-[#05070A]/98 md:bg-black/50 backdrop-blur-3xl flex flex-col z-[60] rounded-t-[2.5rem] md:rounded-none shadow-[0_-30px_80px_rgba(0,0,0,0.6)] md:shadow-none"
                >
                   {/* Mobile Drag Handle */}
                   <div className="md:hidden w-full flex justify-center pt-4 pb-1" onClick={() => setShowRightPanel(false)}>
                      <div className="w-10 h-1 rounded-full bg-white/20" />
                   </div>

                   {/* SIDEBAR TABS + CLOSE */}
                   {/* SIDEBAR TABS + CLOSE */}
                   <div className="flex items-center border-b border-white/5 p-3 gap-2">
                      {[
                        { id: 'outcomes', icon: <Target size={14} />, label: 'HUD' },
                        { id: 'participants', icon: <Users size={14} />, label: 'Classroom' },
                        { id: 'chat', icon: <MessageSquare size={14} />, label: 'Chat' },
                        { id: 'resources', icon: <Share2 size={14} />, label: 'Assets' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setRightPanel(tab.id as any)}
                          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all ${rightPanel === tab.id ? 'bg-white text-black shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                        >
                           {tab.icon}
                           <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => setShowRightPanel(false)}
                        className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all shrink-0"
                      >
                        <X size={20} />
                      </button>
                   </div>

                   <div className="flex-1 overflow-hidden flex flex-col">
                      {rightPanel === 'outcomes' && <ClarityEngine session={session} outcomes={sessionOutcomes} onOutcomesChange={setSessionOutcomes} />}
                      {rightPanel === 'chat' && (
                        <StudioChat 
                          session={session} 
                          isLocked={!isChatEnabled} 
                          onToggleLock={() => setIsChatEnabled(!isChatEnabled)} 
                        />
                      )}
                      {rightPanel === 'participants' && (
                        <ParticipantPanel 
                          allowStudentScreen={allowStudentScreen} 
                          onToggleStudentScreen={() => setAllowStudentScreen(!allowStudentScreen)}
                          studentActivity={studentActivity}
                        />
                      )}
                      {rightPanel === 'resources' && (
                        <ResourcePanel 
                          resources={resources} 
                          onUpdate={setResources} 
                        />
                      )}
                   </div>
                </motion.aside>
              )}
           </AnimatePresence>

            {/* Mobile toggle — bottom sheet trigger, only on small screens */}
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="md:hidden absolute right-4 bottom-36 z-[70] w-12 h-12 rounded-2xl bg-black/70 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all backdrop-blur-xl shadow-2xl"
            >
              <ChevronRight size={18} className={`transition-transform duration-300 ${showRightPanel ? 'rotate-90' : '-rotate-90'}`} />
            </button>
        </main>

        </PageErrorBoundary>
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}

function StageModeBroadcaster({ mode }: { mode: 'content' | 'whiteboard' | 'slides' }) {
  const { send } = useDataChannel('STAGE_MODE')

  useEffect(() => {
    send(new TextEncoder().encode(JSON.stringify({ mode, timestamp: Date.now() })), { reliable: true }).catch((error) => {
      console.warn('[StageModeBroadcaster] Mode sync failed', error)
    })
  }, [mode, send])

  return null
}

function ChatModerationBroadcaster({ isEnabled }: { isEnabled: boolean }) {
  const { send } = useDataChannel('CHAT_MODERATION')
  useEffect(() => {
    send(new TextEncoder().encode(JSON.stringify({ isEnabled, timestamp: Date.now() })), { reliable: true }).catch(() => null)
  }, [isEnabled, send])
  return null
}

function SessionStateBroadcaster({
  mode,
  isChatEnabled,
  allowScreen,
  resources,
  slideUrl,
  outcomes,
}: {
  mode: 'content' | 'whiteboard' | 'slides'
  isChatEnabled: boolean
  allowScreen: boolean
  resources: any[]
  slideUrl: string | null
  outcomes: any[]
}) {
  const { send } = useDataChannel('SESSION_STATE')
  const snapshot = useMemo(() => ({
    mode,
    isChatEnabled,
    allowScreen,
    resources,
    slideUrl,
    outcomes,
    timestamp: Date.now(),
  }), [allowScreen, isChatEnabled, mode, outcomes, resources, slideUrl])

  const sendSnapshot = useCallback(() => {
    send(new TextEncoder().encode(JSON.stringify(snapshot)), { reliable: true }).catch((error) => {
      console.warn('[SessionStateBroadcaster] State sync failed', error)
    })
  }, [send, snapshot])

  useDataChannel('SESSION_STATE_REQUEST', sendSnapshot)

  useEffect(() => {
    sendSnapshot()
  }, [sendSnapshot])

  return null
}

function StudentPermissionBroadcaster({ allowScreen }: { allowScreen: boolean }) {
  const { send } = useDataChannel('PERMISSION_UPDATE')
  useEffect(() => {
    send(new TextEncoder().encode(JSON.stringify({ allowScreen, timestamp: Date.now() })), { reliable: true }).catch(() => null)
  }, [allowScreen, send])
  return null
}

function ResourceBroadcaster({ resources }: { resources: any[] }) {
  const { send } = useDataChannel('RESOURCE_UPDATE')
  useEffect(() => {
    send(new TextEncoder().encode(JSON.stringify({ resources, timestamp: Date.now() })), { reliable: true }).catch(() => null)
  }, [resources, send])
  return null
}

function StatItem({ label, value, icon, color }: { label: string, value: string, icon: any, color: string }) {
  const colorMap: any = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    sky: 'text-sky-400 bg-sky-500/10',
    slate: 'text-slate-400 bg-white/5'
  }
  return (
    <div className="flex items-center gap-3">
       <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
       <div>
          <div className="text-[10px] font-black uppercase tracking-tight leading-none text-white">{value}</div>
          <div className="text-[7px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">{label}</div>
       </div>
    </div>
  )
}

function LiveAudienceStat() {
  const participants = useParticipants()
  const studentCount = participants.filter((p) => getParticipantRole(p) === 'student').length
  return <StatItem label="Students" value={studentCount.toString()} icon={<Users size={14} />} color="sky" />
}

function LiveUpstreamStat() {
  const { localParticipant } = useLocalParticipant()
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    if (!localParticipant) return
    const updateStats = () => {
      const camera = localParticipant.isCameraEnabled
      const mic = localParticipant.isMicrophoneEnabled
      const screen = localParticipant.isScreenShareEnabled
      setActiveCount([camera, mic, screen].filter(Boolean).length)
    }
    const interval = setInterval(updateStats, 1000)
    updateStats()
    return () => clearInterval(interval)
  }, [localParticipant])

  return <StatItem label="Upstream" value={`${activeCount}/3`} icon={<Activity size={14} />} color={activeCount > 0 ? 'emerald' : 'slate'} />
}

function SessionUptime() {
  const [uptime, setUptime] = useState('00:00')
  const startRef = useRef(Date.now())
  useEffect(() => {
    const t = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const m = Math.floor(elapsed / 60000)
      const s = Math.floor((elapsed % 60000) / 1000)
      setUptime(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(t)
  }, [])
  return <StatItem label="Uptime" value={uptime} icon={<Clock size={14} />} color="slate" />
}

function HardwareDoctor() {
  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) {
          toast.error('This browser does not expose camera and microphone controls.')
          return
        }
        const devices = await navigator.mediaDevices.enumerateDevices()
        const hasAudio = devices.some((device) => device.kind === 'audioinput')
        const hasVideo = devices.some((device) => device.kind === 'videoinput')
        
        if (!hasAudio || !hasVideo) {
          toast.error(`Hardware check: ${!hasAudio ? 'No microphone detected.' : ''} ${!hasVideo ? 'No camera detected.' : ''}`.trim(), { 
            duration: 8000,
            icon: '🛡️',
            style: { background: '#05070A', border: '1px solid rgba(239,68,68,0.2)', color: '#fff', fontSize: '11px', fontWeight: 'bold' }
          })
        }
      } catch (e) {
        console.warn('[HardwareDoctor] Probe failed', e)
      }
    }
    setTimeout(runDiagnostics, 3000)
  }, [])
  return null
}

function StudentJoinNotifier() {
  const participants = useParticipants()
  const prevCount = useRef(0)

  useEffect(() => {
    const students = participants.filter(p => getParticipantRole(p) === 'student')
    if (students.length > prevCount.current) {
      const latest = students[students.length - 1]
      toast.success(`${latest.name || 'A student'} has entered the studio`, {
        icon: '🎓',
        position: 'top-right',
        style: { background: '#05070A', border: '1px solid rgba(52,211,153,0.2)', color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }
      })
    }
    prevCount.current = students.length
  }, [participants])

  return null
}

function MobileAudienceStat() {
  const participants = useParticipants()
  const studentCount = participants.filter((p) => getParticipantRole(p) === 'student').length
  return (
    <div className="lg:hidden flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
      <Users size={12} className="text-sky-500" />
      <span className="text-[10px] font-black text-white">{studentCount}</span>
    </div>
  )
}

function TeacherGrid() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ], { onlySubscribed: false })

  const screenShareTrack = tracks.find((t: TrackReferenceOrPlaceholder) => t.source === Track.Source.ScreenShare)
  const cameraTracks = tracks.filter((t: TrackReferenceOrPlaceholder) => t.source === Track.Source.Camera)

  return (
    <div className="h-full w-full relative">
       {screenShareTrack ? (
         <div className="h-full w-full flex flex-col gap-4 md:gap-6">
            <div className="flex-1 rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10 bg-black shadow-2xl relative group">
               <ParticipantTile trackRef={screenShareTrack} className="h-full w-full" />
               <div className="absolute top-4 left-4 md:top-8 md:left-8 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-3">
                  <Monitor size={14} className="md:w-[18px] md:h-[18px] text-emerald-500" />
                  <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-white">Broadcasting Screen</span>
               </div>
            </div>
            <div className="h-[120px] md:h-[220px] flex gap-4 md:gap-6 overflow-x-auto pb-2 scrollbar-none">
               {cameraTracks.map(t => (
                 <div key={t.participant.identity} className="aspect-video h-full rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-white/10 bg-black relative shadow-2xl shrink-0">
                    <ParticipantTile trackRef={t} className="h-full w-full" />
                    <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 px-3 py-1.5 rounded-lg md:rounded-xl bg-black/60 backdrop-blur-md text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/10">
                       {t.participant.name || 'Broadcaster'}
                    </div>
                 </div>
               ))}
            </div>
         </div>
       ) : (
         <div className="h-full w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {cameraTracks.map(t => (
              <div key={t.participant.identity} className="relative rounded-[2.5rem] md:rounded-[4rem] overflow-hidden border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent shadow-2xl group">
                 <ParticipantTile trackRef={t} className="h-full w-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                 <div className="absolute inset-x-0 bottom-0 p-6 md:p-12">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/30 shrink-0"><VideoIcon className="w-4 h-4 md:w-5 md:h-5" /></div>
                       <div>
                          <span className="text-lg md:text-xl font-black uppercase tracking-tight text-white">{t.participant.name || 'Broadcaster'}</span>
                          <div className="flex items-center gap-2 mt-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[8px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Signal</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            ))}
            {cameraTracks.length === 0 && (
              <div className="col-span-full h-full flex flex-col items-center justify-center space-y-6 md:space-y-8 text-slate-700 bg-white/[0.01] rounded-[3rem] md:rounded-[5rem] border border-dashed border-white/10">
                 <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shadow-inner"><VideoOff className="w-10 h-10 md:w-16 md:h-16" /></div>
                 <div className="text-center px-6">
                    <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.4em] text-slate-500">Signal Offline</p>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2 md:mt-4">Initialize your camera to start broadcasting</p>
                 </div>
              </div>
            )}
         </div>
       )}
    </div>
  )
}

function StudioControls({ sessionId, onToggleChat }: { sessionId: string; onToggleChat: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant()
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const [activeQuiz, setActiveQuiz] = useState<LiveQuiz | null>(null)
  const [quizDraft, setQuizDraft] = useState<QuizDraft>({
    title: 'Live checkpoint',
    questions: [{
      ...createQuizQuestion(),
      prompt: 'What is the main idea from this lesson segment?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
    }],
  })
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])

  const toggleMic = async () => {
    if (!localParticipant) return
    try {
      // Pre-request permission so the browser prompt appears correctly
      if (!isMicrophoneEnabled) {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => null)
      }
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
      toast(!isMicrophoneEnabled ? '🎙️ Microphone active' : 'Microphone muted')
    } catch (error: any) {
      console.error('[StudioControls] Microphone error:', error)
      if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
        toast.error('🚫 Microphone blocked. Click the 🔒 lock icon in your browser address bar → Allow Microphone → Refresh.', { duration: 6000 })
      } else {
        toast.error('Microphone unavailable. Is another app using it?')
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
      toast(!isCameraEnabled ? 'Camera active' : 'Camera off')
    } catch (error: any) {
      console.error('[StudioControls] Camera error:', error)
      if (error?.name === "NotAllowedError" || error?.message?.includes("Permission")) {
        toast.error("Camera blocked. Click the lock icon in your address bar -> Allow Camera -> Refresh.", { duration: 6000 })
      } else {
        toast.error("Camera unavailable. Is another app using it?")
      }
    }
  }

  const toggleScreen = async () => {
    if (!localParticipant) return
    try {
      const newState = !isScreenShareEnabled
      await localParticipant.setScreenShareEnabled(newState, { audio: true })
      toast(newState ? 'Sharing screen' : 'Sharing stopped')
    } catch (e: any) {
      toast.error("Screen share failed. Check browser permissions.", { id: "screen-error" })
      console.error('Screen share error:', e)
    }
  }

  const { send: sendQuiz } = useDataChannel('QUIZ_LAUNCH')
  const supabaseResults = useMemo(() => getSupabaseBrowserClient(), [])

  useEffect(() => {
    let mounted = true
    const mapResult = (row: any): QuizResult => ({
      quizId: row.quiz_id,
      questionId: row.question_id,
      participantId: row.participant_id,
      participantName: row.participant_name,
      answerIndex: row.answer_index,
      isCorrect: row.is_correct,
      score: row.score,
      answeredAt: new Date(row.answered_at).getTime(),
    })
    const mergeResult = (result: QuizResult) => {
      if (!mounted) return
      setQuizResults((previous) => [
        ...previous.filter((item) =>
          item.participantId !== result.participantId
          || item.quizId !== result.quizId
          || item.questionId !== result.questionId
        ),
        result,
      ].sort((a, b) => b.score - a.score || a.answeredAt - b.answeredAt))
    }

    supabaseResults
      .from('live_quiz_results')
      .select('*')
      .eq('session_id', sessionId)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[StudioControls] Quiz history unavailable', error)
          return
        }
        data?.map(mapResult).forEach(mergeResult)
      })

    const channel = supabaseResults
      .channel(`teacher-live-quiz-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_quiz_results',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new) mergeResult(mapResult(payload.new))
      })
      .subscribe()

    return () => {
      mounted = false
      supabaseResults.removeChannel(channel)
    }
  }, [sessionId, supabaseResults])

  useDataChannel('QUIZ_RESULT', (msg) => {
    try {
      const result = JSON.parse(new TextDecoder().decode(msg.payload)) as QuizResult
      setQuizResults((prev) => {
        const withoutDuplicate = prev.filter((item) => item.participantId !== result.participantId || item.quizId !== result.quizId || item.questionId !== result.questionId)
        return [...withoutDuplicate, result].sort((a, b) => b.score - a.score || a.answeredAt - b.answeredAt)
      })
    } catch (error) {
      console.warn('[StudioControls] Ignored malformed quiz result', error)
    }
  })

  const launchQuiz = () => {
    const questions = quizDraft.questions.map((question) => ({
      ...question,
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()).filter(Boolean),
      points: Math.max(1, Number(question.points) || 1),
      correctIndex: Math.max(0, Math.min(question.correctIndex, question.options.length - 1)),
    }))

    if (questions.some((question) => !question.prompt)) {
      toast.error('Every quiz question needs text')
      return
    }

    if (questions.some((question) => question.options.length < 2)) {
      toast.error('Each question needs at least two answer options')
      return
    }

    const quiz: LiveQuiz = {
      id: `${Date.now()}`,
      title: quizDraft.title.trim() || 'Live checkpoint',
      questions,
      currentQuestionIndex: 0,
      launchedAt: Date.now(),
    }

    setActiveQuiz(quiz)
    setQuizResults([])
    sendQuiz(new TextEncoder().encode(JSON.stringify(quiz)), { reliable: true })
    toast.success('Live quiz launched')
  }

  return (
    <>
    <div className="absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-[max(1rem,env(safe-area-inset-bottom))] px-3 flex items-center justify-center gap-2 md:gap-3 z-50 pointer-events-none max-w-full">
       <div className="pointer-events-auto max-w-[min(96vw,1180px)] overflow-x-auto flex items-center justify-center gap-2 md:gap-3">
       {/* AV DOCK */}
       <div className="pointer-events-auto p-1 md:p-2 rounded-2xl md:rounded-3xl bg-black/70 backdrop-blur-2xl border border-white/10 flex items-center gap-1 md:gap-2 shadow-2xl">
          <ControlButton icon={!isMicrophoneEnabled ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />} active={isMicrophoneEnabled} onClick={toggleMic} color="emerald" />
          <ControlButton icon={!isCameraEnabled ? <VideoOff className="w-4 h-4 md:w-5 md:h-5" /> : <VideoIcon className="w-4 h-4 md:w-5 md:h-5" />} active={isCameraEnabled} onClick={toggleVideo} color="emerald" />
          <div className="w-px h-8 md:h-10 bg-white/10 mx-1 md:mx-2" />
          <ControlButton icon={<Share2 className="w-4 h-4 md:w-5 md:h-5" />} active={isScreenShareEnabled} onClick={toggleScreen} label="Present" color="sky" />
       </div>

       {/* TOOL DOCK — Hidden on small mobile */}
       <div className="pointer-events-auto hidden lg:flex p-1 md:p-2 rounded-2xl md:rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 items-center gap-1 shadow-2xl">
          <ToolButton icon={<LayoutGrid className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="View" />
          <ToolButton icon={<MessageSquare className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="Chat" onClick={onToggleChat} />
          <ToolButton icon={<PenTool className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="Draw" />
          <div className="hidden md:block w-px h-8 bg-white/10 mx-3" />
          <ToolButton icon={<Maximize2 className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label={isFullscreen ? 'Window' : 'Full'} onClick={toggleFullscreen} />
          <div className="hidden md:flex"><ToolButton icon={<BarChart3 className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="Stats" /></div>
          <div className="hidden md:flex"><ToolButton icon={<Settings className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="Prefs" /></div>
       </div>

       {/* Mobile-only chat toggle if Tool dock is hidden */}
       <div className="pointer-events-auto lg:hidden">
          <div className="flex gap-2">
            <ToolButton icon={<MessageSquare size={18} />} label="Chat" onClick={onToggleChat} />
            <ToolButton icon={<Maximize2 size={18} />} label={isFullscreen ? 'Window' : 'Full'} onClick={toggleFullscreen} />
          </div>
       </div>

       {/* ACTION DOCK */}
       <div className="pointer-events-auto flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setIsQuizOpen(true)}
            className="group relative px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl overflow-hidden shadow-2xl shrink-0"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 group-hover:from-white group-hover:to-white transition-all duration-500" />
             <span className="relative text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-black transition-colors whitespace-nowrap">Quiz</span>
          </button>
       </div>
       </div>
    </div>
    <AnimatePresence>
      {isQuizOpen && (
        <EnhancedLiveQuizModal
          draft={quizDraft}
          setDraft={setQuizDraft}
          onClose={() => setIsQuizOpen(false)}
          onLaunch={launchQuiz}
          activeQuiz={activeQuiz}
          results={quizResults}
        />
      )}
    </AnimatePresence>
    </>
  )
}

function EnhancedLiveQuizModal({
  draft,
  setDraft,
  onClose,
  onLaunch,
  activeQuiz,
  results,
}: {
  draft: QuizDraft
  setDraft: Dispatch<SetStateAction<QuizDraft>>
  onClose: () => void
  onLaunch: () => void
  activeQuiz: LiveQuiz | null
  results: QuizResult[]
}) {
  const updateQuestion = (id: string, patch: Partial<LiveQuizQuestion>) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((question) => question.id === id ? { ...question, ...patch } : question),
    }))
  }

  const setQuestionType = (id: string, type: QuizQuestionType) => {
    updateQuestion(id, {
      type,
      options: type === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
      correctIndex: 0,
    })
  }

  const removeQuestion = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.length > 1 ? prev.questions.filter((question) => question.id !== id) : prev.questions,
    }))
  }

  const totalsByStudent = results.reduce<Record<string, { name: string; score: number; answers: number }>>((acc, result) => {
    const existing = acc[result.participantId] || { name: result.participantName, score: 0, answers: 0 }
    acc[result.participantId] = {
      name: existing.name,
      score: existing.score + result.score,
      answers: existing.answers + 1,
    }
    return acc
  }, {})
  const leaderboard = Object.entries(totalsByStudent)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.score - a.score || b.answers - a.answers)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xl flex items-center justify-center p-3 md:p-6">
      <motion.div initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.96 }} className="w-full max-w-6xl h-[94dvh] md:h-[88vh] overflow-hidden rounded-[1.5rem] md:rounded-[2rem] border border-white/10 bg-[#05070A] shadow-2xl grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-0 overflow-y-auto p-5 md:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Live checkpoint</p>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight mt-1">Build and launch quiz</h3>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 text-slate-400 hover:text-white shrink-0">
              <X size={18} className="mx-auto" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quiz title</label>
            <input
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full h-12 rounded-2xl bg-white/[0.03] border border-white/10 px-4 text-sm outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-4">
            {draft.questions.map((question, questionIndex) => (
              <div key={question.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center text-xs font-black">{questionIndex + 1}</div>
                    <select
                      value={question.type}
                      onChange={(event) => setQuestionType(question.id, event.target.value as QuizQuestionType)}
                      className="h-10 rounded-xl bg-black border border-white/10 px-3 text-[10px] font-black uppercase tracking-widest outline-none"
                    >
                      <option value="multiple_choice">Multiple choice</option>
                      <option value="true_false">True / False</option>
                    </select>
                  </div>
                  <button onClick={() => removeQuestion(question.id)} className="self-start sm:self-auto h-10 px-3 rounded-xl bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest disabled:opacity-30" disabled={draft.questions.length === 1}>
                    Remove
                  </button>
                </div>

                <textarea
                  value={question.prompt}
                  onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                  placeholder="Ask a clear checkpoint question..."
                  className="w-full min-h-24 rounded-2xl bg-black/40 border border-white/10 p-4 text-sm outline-none focus:border-emerald-500/50 resize-none"
                />

                <div className="grid gap-3">
                  {question.options.map((option, optionIndex) => (
                    <div key={`${question.id}-${optionIndex}`} className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => updateQuestion(question.id, { correctIndex: optionIndex })}
                        className={`w-12 rounded-xl border font-black shrink-0 ${question.correctIndex === optionIndex ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/10 bg-white/5 text-slate-500'}`}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </button>
                      <input
                        value={option}
                        disabled={question.type === 'true_false'}
                        onChange={(event) => {
                          const next = [...question.options]
                          next[optionIndex] = event.target.value
                          updateQuestion(question.id, { options: next })
                        }}
                        className="min-w-0 flex-1 h-12 rounded-xl bg-black/40 border border-white/10 px-4 text-sm outline-none focus:border-emerald-500/50 disabled:opacity-70"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, questions: [...prev.questions, createQuizQuestion()] }))}
              className="h-12 px-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10"
            >
              Add question
            </button>
            <button onClick={onLaunch} className="h-12 px-6 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors sm:ml-auto">
              Launch to students
            </button>
          </div>
        </div>

        <div className="min-h-0 border-t lg:border-t-0 lg:border-l border-white/10 p-5 md:p-8 bg-white/[0.02] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Live leaderboard</h4>
            <span className="text-[10px] font-black text-emerald-500">{results.length} answers</span>
          </div>
          {activeQuiz && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Active now</p>
              <p className="text-xs font-bold leading-relaxed">{activeQuiz.title}</p>
              <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-500">{activeQuiz.questions.length} questions</p>
            </div>
          )}
          <div className="space-y-3">
            {leaderboard.map((result, index) => (
              <div key={result.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black bg-emerald-500 text-black">{index + 1}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{result.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{result.answers} answers</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{result.score} pts</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="h-48 flex items-center justify-center text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">
                Waiting for student answers
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ControlButton({ icon, active, onClick, label, color = 'emerald' }: { icon: any, active: boolean, onClick: () => void, label?: string, color?: string }) {
  const activeStyles: any = {
    emerald: 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(52,211,153,0.3)]',
    sky: 'bg-sky-500 text-black shadow-[0_0_20px_rgba(14,165,233,0.3)]'
  }
  return (
    <button 
      onClick={onClick}
      className={`group relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all duration-500 ${active ? activeStyles[color] : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
    >
       {icon}
       {label && (
         <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-all pointer-events-none hidden md:block px-4 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
            {label}
         </div>
       )}
    </button>
  )
}

function ToolButton({ icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all gap-0.5 md:gap-1 group"
    >
       <div className="group-hover:scale-110 transition-transform">{icon}</div>
       <span className="text-[6px] md:text-[7px] font-black uppercase tracking-widest text-slate-600 group-hover:text-white">{label}</span>
    </button>
  )
}

function ClarityEngine({ session, outcomes, onOutcomesChange }: { session: any; outcomes: any[]; onOutcomesChange: (outcomes: any[]) => void }) {
  const { send } = useDataChannel('OUTCOME_UPDATE')
  const activeOutcome = outcomes.find((outcome: any) => !outcome.is_completed)

  const toggleOutcome = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    try {
      await updateOutcomeStatus(id, newStatus)
      const nextOutcomes = outcomes.map((o: any) => o.id === id ? { ...o, is_completed: newStatus } : o)
      onOutcomesChange(nextOutcomes)
      send(new TextEncoder().encode(JSON.stringify({ outcomeId: id, status: newStatus, outcomes: nextOutcomes })), { reliable: true })
      toast.success(newStatus ? "Objective Mastered" : "Objective Reopened", { icon: newStatus ? '🎯' : '♻️' })
    } catch (e) {
      toast.error("Sync interruption detected")
    }
  }

  const completedCount = outcomes.filter((o: any) => o.is_completed).length
  const progress = outcomes.length > 0 ? Math.round((completedCount / outcomes.length) * 100) : 0

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-10">
       {/* PROGRESS HUD */}
       <div className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                   <Target className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.1em]">Clarity Core</h3>
             </div>
             <div className="text-right">
                <span className="text-lg md:text-xl font-black text-emerald-500 leading-none">{progress}%</span>
                <div className="text-[6px] md:text-[7px] font-black text-slate-600 uppercase tracking-widest mt-1">Mastery</div>
             </div>
          </div>
          <div className="h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden">
             <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
          </div>
       </div>

       <div className="space-y-8 md:space-y-10">
          {/* PRIMARY GOAL */}
          <div className="p-6 md:p-8 rounded-2xl md:rounded-[2rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group shadow-xl">
             <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[30px] rounded-full" />
             <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 md:mb-4 block">Session Goal</span>
             <p className="text-[11px] md:text-[13px] font-black text-white leading-relaxed uppercase tracking-tight italic relative z-10">
                "{session.goal}"
             </p>
          </div>

          {/* OUTCOMES LIST */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2 mb-4 md:mb-6">
                <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Critical Benchmarks</span>
                <span className="text-[7px] md:text-[8px] font-bold text-slate-600 uppercase tracking-widest">{outcomes.length} Total</span>
             </div>
             
             <div className="space-y-3">
               {outcomes.map((o: any, idx: number) => (
                 <button 
                   key={o.id} onClick={() => toggleOutcome(o.id, o.is_completed)}
                   className={`w-full p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] border transition-all text-left flex items-start gap-4 md:gap-5 group ${o.is_completed ? 'bg-emerald-500/10 border-emerald-500/30 shadow-xl' : activeOutcome?.id === o.id ? 'bg-sky-500/10 border-sky-500/40 shadow-xl shadow-sky-500/10' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                 >
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${o.is_completed ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-slate-600 group-hover:text-white'}`}>
                       {o.is_completed ? <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <span className="text-[10px] md:text-[11px] font-black">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-relaxed ${o.is_completed ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                       {o.description}
                       {!o.is_completed && activeOutcome?.id === o.id && (
                         <span className="block mt-2 text-[7px] text-sky-400 tracking-[0.25em]">CURRENT FOCUS</span>
                       )}
                    </span>
                 </button>
               ))}
             </div>
          </div>
       </div>
    </div>
  )
}

function StudioChat({ session, isLocked, onToggleLock }: { session: any; isLocked?: boolean; onToggleLock?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const { localParticipant } = useLocalParticipant()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const mergeMessage = (message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev
      return [...prev, message].sort((a, b) => a.timestamp - b.timestamp)
    })
  }
  const { send } = useDataChannel('CHAT', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as ChatMessage
      mergeMessage({ ...data, self: data.senderId === localParticipant?.identity })
    } catch (error) {
      console.warn('[StudioChat] Ignored malformed chat message', error)
    }
  })
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
        console.warn('[StudioChat] Message history unavailable', error)
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
      .channel(`live-chat-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_session_messages',
        filter: `session_id=eq.${session.id}`,
      }, (payload) => {
        const row = payload.new as any
        mergeMessage({
          id: row.id,
          text: row.message,
          sender: row.sender_name,
          senderId: row.sender_id,
          timestamp: new Date(row.created_at).getTime(),
          self: row.sender_id === localParticipant?.identity,
        })
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

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!input.trim()) return
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: input.trim(),
      sender: localParticipant?.name || 'Teacher',
      senderId: localParticipant?.identity,
      timestamp: Date.now(),
    }
    mergeMessage({ ...msg, self: true })
    send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true }).catch((error) => {
      console.warn('[StudioChat] Live message send failed', error)
    })
    if (localParticipant?.identity) {
      const { error } = await supabase.from('live_session_messages').insert({
        id: msg.id,
        session_id: session.id,
        sender_id: localParticipant.identity,
        sender_name: msg.sender,
        sender_role: 'teacher',
        message: msg.text,
        created_at: new Date(msg.timestamp).toISOString(),
      })
      if (error) console.warn('[StudioChat] Message persistence failed', error)
    }
    setInput('')
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col p-5 md:p-7 overflow-hidden">
       <div className="flex items-center justify-between mb-5 px-2 shrink-0">
          <div className="flex items-center gap-3">
             <MessageSquare size={16} className="text-sky-500" />
             <h3 className="text-xs font-black uppercase tracking-widest">Global Comms</h3>
          </div>
          {onToggleLock && (
            <button 
              onClick={onToggleLock}
              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${isLocked ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
              {isLocked ? 'Chat Locked' : 'Lock Chat'}
            </button>
          )}
       </div>

       <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-3 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
               <MessageSquare size={32} />
               <p className="text-[9px] font-black uppercase tracking-widest">Waiting for engagement...</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.self ? 'items-end' : 'items-start'}`}>
               <span className="text-[7px] font-black uppercase tracking-widest text-slate-500 mb-2">{m.sender}</span>
               <div className={`px-5 py-3 rounded-2xl text-[11px] font-medium leading-relaxed ${m.self ? 'bg-sky-500 text-black' : 'bg-white/5 text-white'}`}>
                  {m.text}
               </div>
            </div>
          ))}
       </div>

       <form onSubmit={handleSend} className="mt-4 pt-4 border-t border-white/5 relative shrink-0">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Broadcast a message..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-[11px] font-medium placeholder:text-slate-600 outline-none focus:border-sky-500/50 transition-all"
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-sky-500 hover:bg-white/10 transition-all"
          >
             <Send size={16} />
          </button>
       </form>
    </div>
  )
}

function ParticipantPanel({ allowStudentScreen, onToggleStudentScreen, studentActivity }: { allowStudentScreen?: boolean; onToggleStudentScreen?: () => void; studentActivity?: Record<string, StudentActivity> }) {
  const participants = useParticipants()
  // Robust grouping: fallback to student if role metadata is missing
  const students = participants.filter((p) => {
    const role = getParticipantRole(p)
    return role === 'student' || (!p.isLocal && !role)
  })
  const teachers = participants.filter((p) => getParticipantRole(p) === 'teacher')
  const [hands, setHands] = useState<Record<string, boolean>>({})
  const { send } = useDataChannel('MODERATION')

  useDataChannel('HAND_RAISE', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as { participantId: string; raised: boolean }
      setHands((prev) => ({ ...prev, [data.participantId]: data.raised }))
    } catch (error) {
      console.warn('[ParticipantPanel] Ignored malformed hand raise event', error)
    }
  })

  const sendCommand = (target: string, action: 'mute-audio' | 'mute-video' | 'request-audio' | 'lower-hand') => {
    send(new TextEncoder().encode(JSON.stringify({ target, action, timestamp: Date.now() })), { reliable: true })
    toast.success(action === 'request-audio' ? 'Unmute request sent' : 'Student command sent')
    if (action === 'lower-hand') {
      setHands((prev) => ({ ...prev, [target]: false }))
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 overflow-hidden">
       <div className="flex flex-col gap-6 md:gap-8 mb-6 md:mb-10 px-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-slate-400">
               <Users size={18} />
               <span className="text-xs font-black uppercase tracking-widest">Active Audience</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-sky-500/10 text-sky-500 text-[10px] font-black">{students.length}</div>
          </div>
          
          {onToggleStudentScreen && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-tight">Student Presenting</p>
                  <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">Enable screen share for all students</p>
               </div>
               <button 
                 onClick={onToggleStudentScreen}
                 className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${allowStudentScreen ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-slate-500 hover:text-white'}`}
               >
                 {allowStudentScreen ? 'Enabled' : 'Disabled'}
               </button>
            </div>
          )}
       </div>

       <div className="flex-1 overflow-y-auto space-y-4 pr-4">
          {teachers.map((teacher) => (
            <div key={teacher.sid} className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black uppercase">
                  {(teacher.name || teacher.identity).substring(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-tight text-white truncate">{teacher.name || 'Teacher'}</div>
                  <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Host connected</div>
                </div>
              </div>
              <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-black">Host</span>
            </div>
          ))}
          {students.map(s => (
            <div key={s.sid} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 group hover:bg-white/5 transition-all">
               <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase border border-white/10">
                     {(s.name || s.identity).substring(0, 2)}
                  </div>
                  <div className="min-w-0">
                     <div className="text-[10px] font-black uppercase tracking-tight text-white truncate">{s.name || s.identity}</div>
                     <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                       {s.isSpeaking ? 'Speaking' : 'Connected'} {hands[s.identity] ? '• Hand raised' : ''}
                       {studentActivity?.[s.identity] && (
                         <span className="text-sky-400 ml-1">• {studentActivity[s.identity].tab}</span>
                       )}
                     </div>
                     {studentActivity?.[s.identity] && (
                       <div className="flex flex-wrap gap-1.5 mt-2">
                         <PresenceBadge label="Mic" active={studentActivity[s.identity].microphoneEnabled} />
                         <PresenceBadge label="Camera" active={studentActivity[s.identity].cameraEnabled} />
                         <PresenceBadge label="Sharing" active={studentActivity[s.identity].screenShareEnabled} />
                         <span className="px-2 py-1 rounded-md bg-white/5 text-[7px] font-black uppercase tracking-widest text-slate-500">
                           Seen {Math.max(0, Math.floor((Date.now() - studentActivity[s.identity].lastSeen) / 1000))}s ago
                         </span>
                       </div>
                     )}
                     {studentActivity?.[s.identity]?.lastAction && (
                       <p className="mt-2 text-[7px] font-black uppercase tracking-widest text-amber-400">
                         Latest: {studentActivity[s.identity].lastAction}
                       </p>
                     )}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${hands[s.identity] ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-500'}`}>
                  {hands[s.identity] ? 'Hand' : 'Ready'}
                </div>
               </div>
               <div className="grid grid-cols-3 gap-2">
                 <button onClick={() => sendCommand(s.identity, 'mute-audio')} className="h-9 rounded-xl bg-white/5 hover:bg-red-500/10 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400">Mute mic</button>
                 <button onClick={() => sendCommand(s.identity, 'request-audio')} className="h-9 rounded-xl bg-white/5 hover:bg-emerald-500/10 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-400">Ask mic</button>
                 {hands[s.identity] ? (
                   <button onClick={() => sendCommand(s.identity, 'lower-hand')} className="h-9 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-[8px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/20">Lower hand</button>
                 ) : (
                   <button onClick={() => sendCommand(s.identity, 'mute-video')} className="h-9 rounded-xl bg-white/5 hover:bg-red-500/10 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400">Camera off</button>
                 )}
               </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-20 py-20">
               <Users size={40} />
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center">No participants detected in the secure stream.</p>
            </div>
          )}
       </div>
    </div>
  )
}

function PresenceBadge({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={`px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest ${active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-slate-600'}`}>
      {label} {active ? 'on' : 'off'}
    </span>
  )
}

function EndSessionButton({ session, outcomes }: { session: any; outcomes: any[] }) {
  const router = useRouter()
  const [isEnding, setIsEnding] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const { send: sendEndSession } = useDataChannel('SESSION_END')
  const incompleteOutcomes = outcomes.filter((outcome: any) => !outcome.is_completed)

  const finishSession = async () => {
    setIsEnding(true)
    try {
       sendEndSession(new TextEncoder().encode(JSON.stringify({ status: 'ended', outcomes, timestamp: Date.now() })), { reliable: true })
       await new Promise(r => setTimeout(r, 1200))
       await completeLiveSession(session.id)
       toast.success('Session concluded successfully')
       router.push('/teacher/live')
    } catch (e) {
       toast.error("Session wrap-up interrupted")
       setIsEnding(false)
    }
  }

  return (
    <>
      <button
        disabled={isEnding}
        onClick={() => incompleteOutcomes.length > 0 ? setShowWarning(true) : finishSession()}
        className="px-4 md:px-8 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.16em] md:tracking-[0.2em] hover:bg-red-500 hover:text-black transition-all shadow-lg hover:shadow-red-500/20 disabled:opacity-50"
      >
        {isEnding ? 'Wrapping Up...' : 'Terminate Session'}
      </button>

      <AnimatePresence>
        {showWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ y: 18, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, scale: 0.96 }} className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-red-500/20 bg-[#08090C] p-6 md:p-8 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                  <Target size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Outcomes still open</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    Students will receive a summary with these items marked incomplete. Continue only if the lesson really needs to end now.
                  </p>
                </div>
              </div>
              <div className="mt-6 max-h-48 overflow-y-auto space-y-2">
                {incompleteOutcomes.map((outcome: any, index: number) => (
                  <div key={outcome.id} className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {index + 1}. {outcome.description}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button onClick={() => setShowWarning(false)} className="h-12 px-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px]">
                  Continue Teaching
                </button>
                <button onClick={finishSession} disabled={isEnding} className="h-12 px-5 rounded-2xl bg-red-500 text-black font-black uppercase tracking-widest text-[10px] disabled:opacity-50">
                  End Anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function ResourcePanel({ resources, onUpdate }: { resources: any[], onUpdate: (r: any[]) => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const addResource = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !url) return
    const newRes = { id: Math.random().toString(36).slice(2), name, url, type: 'link' }
    onUpdate([...resources, newRes])
    setName('')
    setUrl('')
  }

  const removeResource = (id: string) => {
    onUpdate(resources.filter(r => r.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 overflow-hidden">
       <div className="flex items-center gap-3 mb-8 px-2">
          <Share2 size={16} className="text-emerald-400" />
          <h3 className="text-xs font-black uppercase tracking-widest">Session Materials</h3>
       </div>

       <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6">
          {resources.map(r => (
            <div key={r.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4">
               <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-tight text-white truncate">{r.name}</p>
                  <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1 truncate">{r.url}</p>
               </div>
               <button onClick={() => removeResource(r.id)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-black transition-all flex items-center justify-center shrink-0">
                  <X size={14} />
               </button>
            </div>
          ))}
          {resources.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
               <Share2 size={32} />
               <p className="text-[9px] font-black uppercase tracking-widest">No shared resources</p>
            </div>
          )}
       </div>

       <form onSubmit={addResource} className="p-5 rounded-[1.5rem] bg-emerald-500/5 border border-emerald-500/10 space-y-3 shrink-0">
          <input 
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Document Name (e.g. Lesson Slides)" 
            className="w-full h-10 px-4 rounded-xl bg-black/40 border border-white/10 text-[10px] font-medium outline-none focus:border-emerald-500/50"
          />
          <input 
            value={url} onChange={e => setUrl(e.target.value)}
            placeholder="Public Link (Google Drive, Dropbox...)" 
            className="w-full h-10 px-4 rounded-xl bg-black/40 border border-white/10 text-[10px] font-medium outline-none focus:border-emerald-500/50"
          />
          <button type="submit" className="w-full h-11 rounded-xl bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all">
             Share with Students
          </button>
       </form>
    </div>
  )
}

function SlideBroadcaster({ url }: { url: string | null }) {
  const { send } = useDataChannel('SLIDE_SYNC')
  useEffect(() => {
    if (url) {
      send(new TextEncoder().encode(JSON.stringify({ url, timestamp: Date.now() })), { reliable: true }).catch(() => null)
    }
  }, [url, send])
  return null
}

function StudentActivityTracker({ onActivity }: { onActivity: (participantId: string, activity: StudentActivity) => void }) {
  useDataChannel('STUDENT_STATUS', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as {
        participantId: string
        tab: string
        microphoneEnabled?: boolean
        cameraEnabled?: boolean
        screenShareEnabled?: boolean
        handRaised?: boolean
      }
      onActivity(data.participantId, {
        tab: data.tab,
        lastSeen: Date.now(),
        microphoneEnabled: data.microphoneEnabled,
        cameraEnabled: data.cameraEnabled,
        screenShareEnabled: data.screenShareEnabled,
        handRaised: data.handRaised,
      })
    } catch {}
  })
  return null
}

function HandRaiseNotifier() {
  const toastShown = useRef<Record<string, number>>({})
  useDataChannel('HAND_RAISE', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as { participantId: string; participantName: string; raised: boolean; timestamp: number }
      if (data.raised) {
        const last = toastShown.current[data.participantId] || 0
        if (Date.now() - last > 5000) {
          toastShown.current[data.participantId] = Date.now()
          toast.success(`✋ ${data.participantName || 'A student'} raised their hand`, {
            position: 'top-right',
            duration: 4000,
            style: { background: '#05070A', border: '1px solid rgba(245,158,11,0.3)', color: '#fff', fontSize: '10px', fontWeight: '900' }
          })
        }
      }
    } catch {}
  })
  return null
}

type FloatingReaction = { id: string; emoji: string; participant: string; x: number; y: number }

function ReactionOverlay({ reactions, setReactions }: { reactions: FloatingReaction[]; setReactions: (r: any) => void }) {
  useDataChannel('STUDENT_REACTION', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as { emoji: string; participantName: string }
      const id = `${Date.now()}-${Math.random()}`
      const newR = { id, emoji: data.emoji, participant: data.participantName, x: Math.random() * 60 + 20, y: Math.random() * 40 + 10 }
      setReactions((prev: any) => [...prev.slice(-10), newR])
      setTimeout(() => setReactions((prev: any) => prev.filter((r: any) => r.id !== id)), 3000)
    } catch {}
  })
  if (reactions.length === 0) return null
  return (
    <div className="fixed inset-0 pointer-events-none z-[180] overflow-hidden">
      {reactions.map((r) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 1, y: 0, scale: 0.5 }}
          animate={{ opacity: 0, y: -100, scale: 1.2 }}
           transition={{ duration: 2.5, ease: 'easeOut' }}
          className="absolute text-3xl"
          style={{ left: `${r.x}%`, top: `${r.y}%` }}
        >
          {r.emoji}
        </motion.div>
      ))}
    </div>
  )
}

function SlideStudio({ currentSlide, onSlideChange, sessionId }: { currentSlide: string | null; onSlideChange: (url: string) => void; sessionId: string }) {
  const [slides, setSlides] = useState<string[]>([])
  const [input, setInput] = useState('')

  const addSlide = () => {
    if (!input) return
    setSlides([...slides, input])
    if (!currentSlide) onSlideChange(input)
    setInput('')
  }

  return (
    <div className="h-full w-full bg-black flex flex-col relative overflow-hidden rounded-[2.5rem] border border-white/10">
       <div className="flex-1 relative overflow-hidden bg-[#05070A]">
          {currentSlide ? (
            <PeakWhiteboard sessionId={sessionId} initialBackground={currentSlide} />
          ) : (
            <div className="h-full flex items-center justify-center text-center space-y-4 opacity-20">
               <LayoutGrid size={64} className="mx-auto text-slate-500" />
               <p className="text-sm font-black uppercase tracking-widest text-slate-500">No Slide Active</p>
            </div>
          )}
       </div>

       <div className="absolute bottom-6 inset-x-6 flex items-center justify-between pointer-events-none z-20">
          <div className="pointer-events-auto flex gap-2 overflow-x-auto pr-4 scrollbar-none max-w-[50%]">
             {slides.map((s, i) => (
               <button 
                 key={i} 
                 onClick={() => onSlideChange(s)}
                 className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center text-[10px] font-black transition-all ${currentSlide === s ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/30' : 'bg-black/60 backdrop-blur-xl border-white/10 text-white hover:bg-white/10'}`}
               >
                 {i + 1}
               </button>
             ))}
          </div>

          <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl bg-black/60 backdrop-blur-3xl border border-white/10 shrink-0">
             <input 
               value={input} onChange={e => setInput(e.target.value)}
               placeholder="Slide Image URL..." 
               className="w-48 h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-medium outline-none focus:border-emerald-500/30"
             />
             <button onClick={addSlide} className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center hover:bg-white transition-all">
                <Plus size={18} />
             </button>
          </div>
       </div>
    </div>
  )
}
