'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useTracks,
  ParticipantTile,
  TrackReferenceOrPlaceholder,
  useLocalParticipant,
  useDataChannel,
} from '@livekit/components-react'
import { Track, ConnectionState } from 'livekit-client'
import { 
  Zap, Target, Users, MessageSquare, 
  LayoutGrid, PenTool, Share2, Shield, 
  ChevronRight, CheckCircle2, Clock, 
  Maximize2, Mic, MicOff, Video as VideoIcon, 
  VideoOff, X, MoreVertical, Send,
  Play, Square, HelpCircle, Activity,
  Settings, Monitor, BarChart3, Radio
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateOutcomeStatus, completeLiveSession } from '@/app/actions/live-sessions'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

// Dynamically imported to prevent Konva SSR issues
const PeakWhiteboard = dynamic<{ sessionId: string }>(() => import('@/app/teacher/live/[id]/studio/PeakWhiteboard'), { ssr: false })

type Props = {
  session: any
  token: string
  serverUrl: string
}

export default function StudioInterface({ session, token, serverUrl }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'content' | 'whiteboard'>('content')
  const [rightPanel, setRightPanel] = useState<'outcomes' | 'chat' | 'participants'>('outcomes')
  const [showRightPanel, setShowRightPanel] = useState(true)

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
        audio={true}
        video={true}
        className="flex-1 flex flex-col relative"
      >
        {/* --- ULTRA PREMIUM HEADER --- */}
        <header className="h-20 md:h-24 border-b border-white/5 px-4 md:px-10 flex items-center justify-between bg-black/40 backdrop-blur-3xl z-50">
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

          <div className="flex items-center gap-3 md:gap-6">
             <div className="hidden lg:flex items-center gap-8 mr-4">
                <StatItem label="Audience" value="0" icon={<Users size={14} />} color="sky" />
                <StatItem label="Clarity" value="0%" icon={<Activity size={14} />} color="emerald" />
                <StatItem label="Uptime" value="00:00" icon={<Clock size={14} />} color="slate" />
             </div>
             {/* Mobile Stats Toggle/Indicator */}
             <div className="lg:hidden flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <Users size={12} className="text-sky-500" />
                <span className="text-[10px] font-black text-white">0</span>
             </div>
             <div className="hidden md:block h-10 w-px bg-white/10" />
             <EndSessionButton session={session} />
          </div>
        </header>

        {/* --- MAIN WORKSPACE --- */}
        <main className="flex-1 flex overflow-hidden relative">
           {/* CONTENT AREA */}
           <div className="flex-1 relative flex flex-col min-w-0">
              {/* INTERACTIVE HUD OVERLAY — Responsive positioning */}
              <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 z-40 p-1 md:p-1.5 rounded-xl md:rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex gap-1 shadow-2xl">
                 <button 
                   onClick={() => setActiveTab('content')}
                   className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'content' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                 >
                   <Monitor size={12} className="md:w-[14px] md:h-[14px]" />
                   Stream
                 </button>
                 <button 
                   onClick={() => setActiveTab('whiteboard')}
                   className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'whiteboard' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                 >
                   <PenTool size={12} className="md:w-[14px] md:h-[14px]" />
                   Board
                 </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                 <AnimatePresence mode="wait">
                    {activeTab === 'content' ? (
                      <motion.div 
                        key="stream" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                        className="flex-1 p-4 md:p-8"
                      >
                         <TeacherGrid />
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="whiteboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                        className="flex-1"
                      >
                         <PeakWhiteboard sessionId={session.id} />
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              {/* FLOATING CONTROL DOCK — Full width on mobile */}
              <StudioControls onToggleChat={() => { setRightPanel('chat'); setShowRightPanel(true); }} />
           </div>


            {/* Desktop panel collapse/expand toggle */}
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
           {/* SIDEBAR SYSTEM — Responsive */}
           <AnimatePresence>
              {showRightPanel && (
                <motion.aside
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="fixed md:relative inset-x-0 bottom-0 top-[18%] md:top-0 md:inset-auto md:w-[380px] border-t md:border-t-0 md:border-l border-white/5 bg-[#05070A]/98 md:bg-black/50 backdrop-blur-3xl flex flex-col z-[60] rounded-t-[2.5rem] md:rounded-none shadow-[0_-30px_80px_rgba(0,0,0,0.6)] md:shadow-none"
                >
                   {/* Mobile Drag Handle */}
                   <div className="md:hidden w-full flex justify-center pt-4 pb-1" onClick={() => setShowRightPanel(false)}>
                      <div className="w-10 h-1 rounded-full bg-white/20" />
                   </div>

                   {/* SIDEBAR TABS + CLOSE */}
                   <div className="flex items-center border-b border-white/5 p-2 gap-1">
                      {[
                        { id: 'outcomes', icon: <Target size={13} />, label: 'HUD' },
                        { id: 'chat', icon: <MessageSquare size={13} />, label: 'Chat' },
                        { id: 'participants', icon: <Users size={13} />, label: 'Crew' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setRightPanel(tab.id as any)}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${rightPanel === tab.id ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                           {tab.icon}
                           <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                      ))}
                      {/* Close button — visible on ALL screens */}
                      <button
                        onClick={() => setShowRightPanel(false)}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shrink-0 ml-1"
                      >
                        <X size={16} />
                      </button>
                   </div>

                   <div className="flex-1 overflow-hidden flex flex-col">
                      {rightPanel === 'outcomes' && <ClarityEngine session={session} />}
                      {rightPanel === 'chat' && <StudioChat session={session} />}
                      {rightPanel === 'participants' && <ParticipantPanel />}
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

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
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

function StudioControls({ onToggleChat }: { onToggleChat: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant()

  const toggleMic = async () => {
    if (!localParticipant) return
    const newState = !isMicrophoneEnabled
    await localParticipant.setMicrophoneEnabled(newState)
    toast(newState ? 'Microphone Active' : 'Microphone Muted', { icon: newState ? '🎙️' : '🔇' })
  }

  const toggleVideo = async () => {
    if (!localParticipant) return
    const newState = !isCameraEnabled
    await localParticipant.setCameraEnabled(newState)
    toast(newState ? 'Camera Active' : 'Camera Muted', { icon: newState ? '📷' : '🚫' })
  }

  const toggleScreen = async () => {
    if (!localParticipant) return
    try {
       const newState = !isScreenShareEnabled
       await localParticipant.setScreenShareEnabled(newState)
       toast(newState ? 'Sharing Screen' : 'Sharing Stopped', { icon: '📺' })
    } catch (e: any) {
       toast.error("Screen share failed. Check browser permissions.", { id: 'screen-error' })
       console.error("Screen share error:", e)
    }
  }

  const { send: sendQuiz } = useDataChannel('QUIZ_LAUNCH')

  const launchQuiz = () => {
    sendQuiz(new TextEncoder().encode(JSON.stringify({ status: 'launched', timestamp: Date.now() })), { reliable: true })
    toast.success("Global Quiz Launched", { style: { background: '#05070A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } })
  }

  return (
    <div className="h-28 md:h-32 px-4 md:px-12 flex items-center justify-between z-50">
       {/* AV DOCK */}
       <div className="p-1 md:p-2 rounded-2xl md:rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center gap-1 md:gap-2 shadow-2xl">
          <ControlButton icon={!isMicrophoneEnabled ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />} active={isMicrophoneEnabled} onClick={toggleMic} color="emerald" />
          <ControlButton icon={!isCameraEnabled ? <VideoOff className="w-4 h-4 md:w-5 md:h-5" /> : <VideoIcon className="w-4 h-4 md:w-5 md:h-5" />} active={isCameraEnabled} onClick={toggleVideo} color="emerald" />
          <div className="w-px h-8 md:h-10 bg-white/10 mx-1 md:mx-2" />
          <ControlButton icon={<Share2 className="w-4 h-4 md:w-5 md:h-5" />} active={isScreenShareEnabled} onClick={toggleScreen} label="Present" color="sky" />
       </div>

       {/* TOOL DOCK — Hidden on small mobile */}
       <div className="hidden sm:flex p-1 md:p-2 rounded-2xl md:rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 items-center gap-1 shadow-2xl">
          <ToolButton icon={<LayoutGrid className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="View" />
          <ToolButton icon={<MessageSquare className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="Chat" onClick={onToggleChat} />
          <ToolButton icon={<PenTool className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="Draw" />
          <div className="hidden md:block w-px h-8 bg-white/10 mx-3" />
          <div className="hidden md:flex"><ToolButton icon={<BarChart3 className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="Stats" /></div>
          <div className="hidden md:flex"><ToolButton icon={<Settings className="w-4 h-4 md:w-[18px] md:h-[18px]" />} label="Prefs" /></div>
       </div>

       {/* Mobile-only chat toggle if Tool dock is hidden */}
       <div className="sm:hidden">
          <ToolButton icon={<MessageSquare size={20} />} label="Chat" onClick={onToggleChat} />
       </div>

       {/* ACTION DOCK */}
       <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={launchQuiz}
            className="group relative px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl overflow-hidden shadow-2xl shrink-0"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 group-hover:from-white group-hover:to-white transition-all duration-500" />
             <span className="relative text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-black transition-colors whitespace-nowrap">Quiz</span>
          </button>
       </div>
    </div>
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

function ClarityEngine({ session }: { session: any }) {
  const { send } = useDataChannel('OUTCOME_UPDATE')
  const [outcomes, setOutcomes] = useState(session.outcomes || [])

  const toggleOutcome = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    try {
      await updateOutcomeStatus(id, newStatus)
      setOutcomes(outcomes.map((o: any) => o.id === id ? { ...o, is_completed: newStatus } : o))
      send(new TextEncoder().encode(JSON.stringify({ outcomeId: id, status: newStatus })), { reliable: true })
      toast.success(newStatus ? "Objective Mastered" : "Objective Reopened", { icon: newStatus ? '🎯' : '♻️' })
    } catch (e) {
      toast.error("Sync interruption detected")
    }
  }

  const completedCount = outcomes.filter((o: any) => o.is_completed).length
  const progress = outcomes.length > 0 ? Math.round((completedCount / outcomes.length) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-12">
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
                   className={`w-full p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] border transition-all text-left flex items-start gap-4 md:gap-5 group ${o.is_completed ? 'bg-emerald-500/10 border-emerald-500/30 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                 >
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${o.is_completed ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-slate-600 group-hover:text-white'}`}>
                       {o.is_completed ? <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <span className="text-[10px] md:text-[11px] font-black">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-relaxed ${o.is_completed ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                       {o.description}
                    </span>
                 </button>
               ))}
             </div>
          </div>
       </div>
    </div>
  )
}

function StudioChat({ session }: { session: any }) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const { send } = useDataChannel('CHAT')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const msg = { text: input, sender: 'Teacher', timestamp: Date.now() }
    setMessages(prev => [...prev, { ...msg, self: true }])
    send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
    setInput('')
  }

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
       <div className="flex items-center gap-3 mb-8 px-2">
          <MessageSquare size={16} className="text-sky-500" />
          <h3 className="text-xs font-black uppercase tracking-widest">Global Comms</h3>
       </div>

       <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
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

       <div className="mt-8 relative">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Broadcast a message..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-[11px] font-medium placeholder:text-slate-600 outline-none focus:border-sky-500/50 transition-all"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-sky-500 hover:bg-white/10 transition-all"
          >
             <Send size={16} />
          </button>
       </div>
    </div>
  )
}

function ParticipantPanel() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }])
  const students = tracks.filter(t => t.participant.identity.includes('student')) 

  return (
    <div className="flex-1 flex flex-col p-10 overflow-hidden">
       <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-4 text-slate-400">
             <Users size={18} />
             <span className="text-xs font-black uppercase tracking-widest">Active Audience</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-sky-500/10 text-sky-500 text-[10px] font-black">{students.length}</div>
       </div>

       <div className="flex-1 overflow-y-auto space-y-4 pr-4">
          {students.map(s => (
            <div key={s.participant.sid} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase border border-white/10">
                     {s.participant.identity.substring(0, 2)}
                  </div>
                  <div>
                     <div className="text-[10px] font-black uppercase tracking-tight text-white">{s.participant.identity.split('_')[0]}</div>
                     <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Connected</div>
                  </div>
               </div>
               <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-600 group-hover:text-white transition-all opacity-0 group-hover:opacity-100">
                  <MoreVertical size={14} />
               </button>
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

function EndSessionButton({ session }: { session: any }) {
  const router = useRouter()
  const [isEnding, setIsEnding] = useState(false)
  const { send: sendEndSession } = useDataChannel('SESSION_END')

  return (
    <button 
      disabled={isEnding}
      onClick={async () => {
        if (confirm("Permanently close this live session for all students?")) {
          setIsEnding(true)
          try {
             sendEndSession(new TextEncoder().encode(JSON.stringify({ status: 'ended', timestamp: Date.now() })), { reliable: true })
             await new Promise(r => setTimeout(r, 800))
             await completeLiveSession(session.id)
             toast.success('Session Concluded Successfully')
             router.push('/teacher/live')
          } catch (e) {
             toast.error("Session wrap-up interrupted")
             setIsEnding(false)
          }
        }
      }}
      className="px-8 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-black transition-all shadow-lg hover:shadow-red-500/20 disabled:opacity-50"
    >
      {isEnding ? 'Wrapping Up...' : 'Terminate Session'}
    </button>
  )
}
