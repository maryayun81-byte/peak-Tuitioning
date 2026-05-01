'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useTracks,
  ParticipantTile,
  useLocalParticipant,
  useDataChannel,
  ConnectionState,
  TrackReferenceOrPlaceholder,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { 
  Zap, Target, Users, MessageSquare, 
  Share2, Shield, ChevronRight, CheckCircle2, 
  Mic, MicOff, Video as VideoIcon, 
  VideoOff, X, Send, HelpCircle, LayoutGrid,
  Clock, Activity, Maximize2, Star, Award, Monitor
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

// Dynamically imported
const PeakWhiteboard = dynamic<{ sessionId: string }>(() => import('@/app/teacher/live/[id]/studio/PeakWhiteboard'), { ssr: false })

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
              audio={true}
              video={false}
              className="flex-1 flex flex-col relative"
            >
              <ClassroomInner session={session} onSessionEnd={handleSessionEnd} />
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
  const [activeTab, setActiveTab] = useState<'content' | 'whiteboard'>('content')
  const [showHUD, setShowHUD] = useState(true)
  const [outcomes, setOutcomes] = useState(session.outcomes || [])
  const [messages, setMessages] = useState<any[]>([])
  
  const { message: endMsg } = useDataChannel('SESSION_END')
  const { message: outcomeMsg } = useDataChannel('OUTCOME_UPDATE')
  const { message: chatMsg } = useDataChannel('CHAT')

  useEffect(() => {
    if (outcomeMsg) {
      try {
        const data = JSON.parse(new TextDecoder().decode(outcomeMsg.payload))
        setOutcomes((prev: any) => 
          prev.map((o: any) => o.id === data.outcomeId ? { ...o, is_completed: data.status } : o)
        )
        if (data.status) {
          toast.success("New Concept Mastered! ✨", { position: 'bottom-center', style: { background: '#05070A', border: '1px solid rgba(52,211,153,0.2)', color: '#fff' } })
        }
      } catch (e) {}
    }
  }, [outcomeMsg])

  useEffect(() => {
    if (chatMsg) {
      try {
        const data = JSON.parse(new TextDecoder().decode(chatMsg.payload))
        setMessages(prev => [...prev, data])
      } catch (e) {}
    }
  }, [chatMsg])

  useEffect(() => {
    if (endMsg) onSessionEnd(outcomes)
  }, [endMsg, onSessionEnd, outcomes])

  return (
    <main className="flex-1 flex overflow-hidden relative">
      {/* BACKGROUND ORBS */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-sky-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* STREAM AREA */}
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

           {/* Content Toggles — Compact on mobile */}
           <div className="hidden sm:flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 shadow-2xl mx-4">
              <button 
                onClick={() => setActiveTab('content')}
                className={`px-4 md:px-8 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'content' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                Stream
              </button>
              <button 
                onClick={() => setActiveTab('whiteboard')}
                className={`px-4 md:px-8 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'whiteboard' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                Board
              </button>
           </div>

           <div className="flex items-center gap-2 md:gap-6">
              <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="hidden xs:inline text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-500">Live</span>
              </div>
              {/* Mobile HUD Toggle */}
              <button 
                onClick={() => setShowHUD(!showHUD)}
                className="md:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white"
              >
                <Target size={20} className={showHUD ? 'text-emerald-500' : ''} />
              </button>
           </div>
        </header>

        {/* Tab Switcher for strictly mobile */}
        <div className="sm:hidden flex border-b border-white/5">
           <button 
             onClick={() => setActiveTab('content')}
             className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'content' ? 'text-white border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500'}`}
           >
             Stream
           </button>
           <button 
             onClick={() => setActiveTab('whiteboard')}
             className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'whiteboard' ? 'text-white border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500'}`}
           >
             Whiteboard
           </button>
        </div>

        <div className="flex-1 p-4 md:p-10 overflow-hidden relative">
           <AnimatePresence mode="wait">
              {activeTab === 'content' ? (
                <motion.div key="stream" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="h-full">
                   <StudentStreamGrid />
                </motion.div>
              ) : (
                <motion.div key="whiteboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="h-full rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl shadow-emerald-500/5">
                   <PeakWhiteboard sessionId={session.id} />
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* FLOATING CHAT OVERLAY — Adaptive positioning */}
        <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 w-[calc(100%-3rem)] xs:w-[350px] md:w-[380px] h-[350px] md:h-[450px] z-50 pointer-events-none">
           <div className="h-full w-full pointer-events-auto">
              <StudentChat messages={messages} />
           </div>
        </div>
      </div>

      {/* CLARITY HUD — Sidebar on Desktop, Overlay/Bottom-Sheet on Mobile */}
      <AnimatePresence>
         {showHUD && (
            <motion.aside 
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed md:relative inset-x-0 bottom-0 top-[20%] md:top-0 md:inset-auto md:w-[420px] border-t md:border-t-0 md:border-l border-white/5 bg-[#05070A]/98 md:bg-black/50 backdrop-blur-3xl flex flex-col z-[60] rounded-t-[2.5rem] md:rounded-none shadow-[0_-30px_80px_rgba(0,0,0,0.6)] md:shadow-none"
           >
              {/* Mobile Drag Handle */}
              <div className="md:hidden w-full flex justify-center pt-4 pb-2" onClick={() => setShowHUD(false)}>
                 <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                 <div className="md:hidden px-10 pt-4 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Knowledge Hub</h3>
                    <button onClick={() => setShowHUD(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500"><X size={16} /></button>
                 </div>
                 <StudentClarityEngine outcomes={outcomes} goal={session.goal} />
              </div>
           </motion.aside>
         )}
      </AnimatePresence>

      {/* Desktop Trigger */}
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
  const teacherCamera = tracks.find(t => t.source === Track.Source.Camera && !t.participant.identity.includes('student'))

  return (
    <div className="h-full w-full relative">
       {screenShareTrack ? (
         <div className="h-full w-full flex flex-col gap-4 md:gap-8">
            <div className="flex-1 rounded-[2rem] md:rounded-[4rem] overflow-hidden border border-white/10 bg-black shadow-2xl relative shadow-emerald-500/5">
               <ParticipantTile trackRef={screenShareTrack} className="h-full w-full" />
               <div className="absolute bottom-4 left-4 md:bottom-10 md:left-10 px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-[2rem] bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-3">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.2em]">Mentor Presentation</span>
               </div>
            </div>
            {teacherCamera && (
              <div className="absolute top-4 right-4 md:top-10 md:right-10 w-32 xs:w-48 md:w-80 aspect-video rounded-xl md:rounded-[2.5rem] overflow-hidden border border-white/20 bg-black shadow-2xl shadow-black ring-1 ring-white/10">
                 <ParticipantTile trackRef={teacherCamera} className="h-full w-full" />
              </div>
            )}
         </div>
       ) : (
         <div className="h-full w-full relative group">
            {teacherCamera ? (
              <div className="h-full w-full rounded-[2.5rem] md:rounded-[5rem] overflow-hidden border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent shadow-2xl relative">
                 <ParticipantTile trackRef={teacherCamera} className="h-full w-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                 <div className="absolute bottom-10 left-10 md:bottom-20 md:left-20 p-6 md:p-12 space-y-2 md:space-y-4">
                    <div className="flex items-center gap-4 md:gap-6">
                       <div className="w-10 h-10 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-emerald-500 flex items-center justify-center text-black shadow-2xl shadow-emerald-500/40"><Zap size={24} /></div>
                       <div>
                          <span className="text-xl md:text-3xl font-black uppercase tracking-tight text-white">Academic Stream</span>
                          <p className="text-[8px] md:text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-1 md:mt-2">Active Broadcasting</p>
                       </div>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="h-full w-full rounded-[2.5rem] md:rounded-[5rem] bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center space-y-6 md:space-y-10">
                 <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-white/5 flex items-center justify-center border border-white/5 animate-pulse shadow-inner"><Monitor size={40} className="text-slate-700" /></div>
                 <div className="text-center px-6">
                    <h3 className="text-base md:text-xl font-black uppercase tracking-[0.3em] text-slate-500">Connecting Signal...</h3>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2 md:mt-4">Preparing high-definition academic stream</p>
                 </div>
              </div>
            )}
         </div>
       )}
    </div>
  )
}

function StudentClarityEngine({ outcomes, goal }: { outcomes: any[], goal: string }) {
  const completedCount = outcomes.filter((o: any) => o.is_completed).length
  const progress = outcomes.length > 0 ? Math.round((completedCount / outcomes.length) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 md:space-y-16">
       <div className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
             <div className="space-y-1 md:space-y-2">
                <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-white">Knowledge Mastery</h3>
                <p className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest">Session Progress Hub</p>
             </div>
             <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center shadow-2xl shrink-0">
                <span className="text-lg md:text-2xl font-black text-emerald-500">{progress}%</span>
                <span className="text-[6px] md:text-[7px] font-black text-emerald-500/60 uppercase">Done</span>
             </div>
          </div>
          <div className="h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
             <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(52,211,153,0.6)]" />
          </div>
       </div>

       <div className="space-y-10 md:space-y-12">
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
       </div>
    </div>
  )
}

function StudentChat({ messages }: { messages: any[] }) {
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<any[]>([])
  const { send } = useDataChannel('CHAT')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, localMessages])

  const handleSend = () => {
    if (!input.trim()) return
    const msg = { text: input, sender: 'Student', timestamp: Date.now() }
    setLocalMessages(prev => [...prev, { ...msg, self: true }])
    send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
    setInput('')
  }

  const allMessages = [...messages, ...localMessages].sort((a, b) => a.timestamp - b.timestamp)

  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-white/5">
       <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
             <MessageSquare size={16} className="text-sky-500" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white">Collaborative Feed</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
       </div>

       <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {allMessages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.self ? 'items-end' : 'items-start'}`}>
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">{m.sender}</span>
               <div className={`px-5 py-3 rounded-2xl text-[11px] font-medium leading-relaxed shadow-lg ${m.self ? 'bg-sky-500 text-black' : 'bg-white/5 text-white border border-white/5'}`}>
                  {m.text}
               </div>
            </div>
          ))}
          {allMessages.length === 0 && (
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
               onKeyDown={e => e.key === 'Enter' && handleSend()}
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
  const completedCount = outcomes.filter((o: any) => o.is_completed).length
  const progress = outcomes.length > 0 ? Math.round((completedCount / outcomes.length) * 100) : 0

  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-[#020406] relative overflow-hidden">
      {/* GLOW EFFECTS */}
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

         <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button 
              onClick={() => router.push('/student/live')}
              className="px-12 py-5 rounded-[2rem] bg-white text-black font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:scale-105 transition-all"
            >
               Secure & Exit
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
