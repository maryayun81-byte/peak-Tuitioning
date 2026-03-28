'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, ChevronLeft, Crown, Medal, Clock,
  CheckCircle2, XCircle, Timer, Users, ArrowRight, Zap,
  Download, Award, Star, Share2, Rocket
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'

const AWARD_TYPES = {
  QUICKEST: { label: 'Quickest Draw', description: 'Lowest average response time!', icon: <Timer className="text-amber-500" /> },
  STREAK: { label: 'Unstoppable Streak', description: 'Highest question combo!', icon: <Zap className="text-orange-500" /> },
  COMEBACK: { label: 'Comeback King', description: 'Best performance in the final stretch!', icon: <Rocket className="text-blue-500" /> }
}

interface Question {
  id: string; text: string; marks: number
  options: { id: string; text: string }[]
  correct_option_id: string
}
interface Group {
  id: string; name: string
  avatar_url: string | null
  members: { student: { full_name: string; id: string } | null }[]
}
interface Submission {
  id: string; score: number; correct_count: number; wrong_count: number
  time_taken_seconds: number; auto_submitted: boolean
  group_name?: string
  group_avatar?: string | null
  max_streak?: number
  answers: Record<string, string | null>
  question_timings: Record<string, { time_taken_s: number; timed_out: boolean }>
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

export default function StudentTriviaResultsPage() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [myGroup, setMyGroup] = useState<Group | null>(null)
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])
  const [totalMarks, setTotalMarks] = useState(0)
  const [showCertificate, setShowCertificate] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => { if (sessionId && student?.id) load() }, [sessionId, student?.id])

  const load = async () => {
    setLoading(true)
    try {
      const [qRes, gRes, subRes, allRes] = await Promise.all([
        supabase.from('trivia_questions').select('*').eq('session_id', sessionId).order('position'),
        supabase.from('trivia_groups').select('*, members:trivia_group_members(student:students(full_name, id))').eq('session_id', sessionId),
        supabase.from('trivia_submissions').select('*').eq('session_id', sessionId),
        supabase.from('trivia_submissions').select('*, group:trivia_groups(name, avatar_url)').eq('session_id', sessionId)
      ])

      const myGroupId = (gRes.data ?? []).find(g => 
          (g.members ?? []).some((m: any) => m.student?.id === student!.id)
      )?.id

      const foundGroup = (gRes.data ?? []).find(g => g.id === myGroupId)
      const foundSub = (subRes.data ?? []).find(s => s.group_id === myGroupId)

      if (!foundSub) {
        toast.error('No mission record found.')
        router.push(`/student/trivia/${sessionId}`)
        return
      }

      setQuestions(qRes.data ?? [])
      setMyGroup(foundGroup)
      setMySubmission(foundSub)
      
      const subs = (allRes.data ?? []).map((s: any) => ({
         ...s,
         group_name: s.group?.name || 'Unknown Squad',
         group_avatar: s.group?.avatar_url,
         avg_time_per_correct: s.correct_count > 0 ? (s.time_taken_seconds / s.correct_count) : 999
      }))
      setAllSubmissions(subs)
      setTotalMarks((qRes.data ?? []).reduce((a, q) => a + q.marks, 0))
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const downloadCertificate = async () => {
    const cert = document.getElementById('victory-certificate')
    if (!cert) return
    setIsDownloading(true)
    try {
      // Convert external images to Data URIs to prevent html2canvas CORS crashes
      const imgs = cert.querySelectorAll('img')
      const originalSrcs: string[] = []
      for (let i = 0; i < imgs.length; i++) {
         const img = imgs[i]
         originalSrcs.push(img.src)
         if (img.src.startsWith('http')) {
            try {
               const res = await fetch(img.src, { mode: 'cors' })
               const blob = await res.blob()
               const dataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader()
                  reader.onloadend = () => resolve(reader.result as string)
                  reader.readAsDataURL(blob)
               })
               img.src = dataUrl
               // Force wait for image to load the new data URI
               await new Promise((resolve) => { img.onload = resolve; setTimeout(resolve, 100); })
            } catch (e) {
               console.warn('Failed to convert image for snapshot', e)
            }
         }
      }

      const canvas = await html2canvas(cert, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
      
      // Restore original sources
      for (let i = 0; i < imgs.length; i++) {
         imgs[i].src = originalSrcs[i]
      }

      const link = document.createElement('a')
      link.download = `${myGroup?.name || 'Squad'}_Champion_Certificate.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Snapshot error:', err)
      toast.error('Snapshot failed: Could not render image.')
    } finally {
      setIsDownloading(false)
    }
  }

  const leaderboard = useMemo(() => {
    return [...allSubmissions].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.time_taken_seconds ?? 99999) - (b.time_taken_seconds ?? 99999)
    })
  }, [allSubmissions])

  const awards = useMemo(() => {
    if (allSubmissions.length < 2) return []
    const quickest = [...allSubmissions].sort((a, b) => a.avg_time_per_correct - b.avg_time_per_correct)[0]
    const streak = [...allSubmissions].sort((a, b) => (b.max_streak || 0) - (a.max_streak || 0))[0]
    
    const results = []
    if (quickest) results.push({ type: 'QUICKEST', winner: quickest })
    if (streak && (streak.max_streak || 0) > 3) results.push({ type: 'STREAK', winner: streak })
    return results
  }, [allSubmissions])

  const myRank = leaderboard.findIndex(s => s.group_id === myGroup?.id) + 1
  const isWinner = myRank === 1
  // Celebration only if they didn't time out the whole session (user request)
  const shouldCelebrate = isWinner && !mySubmission?.auto_submitted

  if (loading) return <div className="p-10 text-center font-black uppercase text-[var(--text-muted)]">Syncing Leaderboard...</div>

  return (
    <div className="p-4 md:p-6 pb-20 max-w-2xl mx-auto space-y-8 relative overflow-hidden bg-[var(--bg)] min-h-screen">
      
      {/* Celebration Effects */}
      {shouldCelebrate && (
         <div className="fixed inset-0 pointer-events-none z-0">
            {[...Array(20)].map((_, i) => (
               <motion.div
                  key={i}
                  initial={{ y: -50, x: Math.random() * 100 + '%', opacity: 1 }}
                  animate={{ y: '110vh', rotate: 360, opacity: 0 }}
                  transition={{ duration: Math.random() * 3 + 3, repeat: Infinity, ease: 'linear', delay: Math.random() * 5 }}
                  className="absolute text-3xl"
               >
                  {['✨', '🏆', '🎉', '🌟', '🥇'][i % 5]}
               </motion.div>
            ))}
         </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
         <Button variant="ghost" size="sm" onClick={() => router.push('/student/trivia')} className="text-[var(--text-muted)] hover:text-primary">
            <ChevronLeft size={18} />
         </Button>
         <h1 className="text-xl font-black uppercase tracking-tighter italic" style={{ color: 'var(--text)' }}>Session Record</h1>
         <div className="w-10" />
      </div>

      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 relative z-10">
         <div className="inline-flex flex-col items-center">
            {shouldCelebrate ? (
               <motion.div 
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} 
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
                  className="w-24 h-24 rounded-[2rem] bg-[var(--card)] border-4 border-[var(--primary)] flex items-center justify-center p-3 shadow-2xl shadow-[var(--primary)]/30 relative mb-4"
               >
                   <img src={myGroup?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=Winner'} alt="" className="w-full h-full object-contain" />
                   <div className="absolute -bottom-2 bg-[var(--primary)] text-[var(--bg)] px-4 py-1 rounded-full text-[10px] font-black shadow-lg border-2 border-[var(--card)] uppercase italic">Elite #1</div>
               </motion.div>
            ) : (
               <div className="w-24 h-24 rounded-[2rem] bg-[var(--input)] border-2 border-[var(--card-border)] flex items-center justify-center p-4 mb-4 shadow-xl">
                  <img src={myGroup?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=Squad'} alt="" className="w-full h-full object-contain" />
               </div>
            )}
            <h2 className="text-3xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
               {shouldCelebrate ? 'Mastery Attained!' : isWinner ? 'Top Rank Achieved' : 'Record Finalized'}
            </h2>
            <p className="text-xs font-black text-primary uppercase tracking-[0.3em] mt-1">
               {myGroup?.name}
            </p>
         </div>

         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="p-4 flex flex-col items-center justify-center border-b-4 border-primary/50 bg-[var(--card)]/50">
               <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Global Pos</div>
               <div className="text-3xl font-black text-primary">#{myRank}</div>
               <div className="text-[10px] font-bold text-[var(--text-muted)]">OF {leaderboard.length}</div>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center border-b-4 border-emerald-500/50 bg-[var(--card)]/50">
               <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Academic Score</div>
               <div className="text-3xl font-black text-emerald-500">{mySubmission?.score}</div>
               <div className="text-[10px] font-bold text-[var(--text-muted)]">PT TOTAL {totalMarks}</div>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center border-b-4 border-amber-500/50 bg-[var(--card)]/50">
               <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Response Velocity</div>
               <div className="text-xl font-black text-amber-500">
                  {mySubmission ? fmtDuration(mySubmission.time_taken_seconds) : '—'}
               </div>
               <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Session Clock</div>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center border-b-4 border-orange-500/50 bg-[var(--card)]/50 col-span-full">
               <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Academy Synchronicity</div>
               <div className="text-2xl font-black text-orange-500 flex items-center gap-3">
                  <Zap size={24} className="fill-orange-500" /> {mySubmission?.max_streak ?? 0} BEST STREAK
               </div>
            </Card>
         </div>

         {shouldCelebrate && (
            <Button 
               onClick={() => setShowCertificate(true)}
               className="w-full h-16 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 border-0 text-black font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/30 gap-3"
            >
               <Award size={24} /> Mint Academy Scroll
            </Button>
         )}
      </motion.div>

      {/* Certificate Modal */}
      {/* Certificate Modal */}
      <AnimatePresence>
         {showCertificate && (
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl p-4 flex flex-col items-center justify-center pt-20"
            >
               <div className="w-full flex justify-center overflow-hidden">
                  <div className="origin-top scale-[0.35] sm:scale-[0.55] md:scale-[0.75] lg:scale-90 transition-transform duration-500">
                     {/* Theme-Aware Premium Certificate */}
                     <div id="victory-certificate" className="w-[1000px] aspect-[1.414/1] p-[2px] relative shadow-2xl shrink-0 overflow-hidden font-sans uppercase rounded-sm" style={{ background: 'var(--card-border)' }}>
                        
                        {/* Dynamic Background with Theme Accents */}
                        <div className="absolute inset-0" style={{ background: 'var(--bg)' }} />
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--primary) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                        
                        {/* Metallic Theme Border */}
                        <div className="absolute inset-4 border-[1px]" style={{ borderColor: 'var(--primary)', opacity: 0.3 }} />
                        <div className="absolute inset-8 border-[4px]" style={{ borderColor: 'var(--primary)', opacity: 0.1 }} />
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent pointer-events-none" />

                        {/* Main Content Area */}
                        <div className="absolute inset-4 flex flex-col items-center p-16 text-center" style={{ color: 'var(--text)' }}>
                           
                           {/* Decorative Glass Elements */}
                           <div className="absolute top-0 left-0 w-32 h-32 opacity-20" style={{ background: 'radial-gradient(circle at 0 0, var(--primary), transparent 70%)' }} />
                           <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20" style={{ background: 'radial-gradient(circle at 100% 100%, var(--primary), transparent 70%)' }} />

                           {/* Top Badge Section */}
                           <div className="mb-10 relative">
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} className="absolute -inset-10 opacity-10">
                                 <div className="w-40 h-40 border-2 border-dashed rounded-full" style={{ borderColor: 'var(--primary)' }} />
                              </motion.div>
                              <div className="relative p-6 rounded-[2.5rem] shadow-2xl border-2" style={{ background: 'var(--primary)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
                                 <Award size={64} className="filter drop-shadow-lg" />
                              </div>
                              <h2 className="mt-8 text-xs font-black tracking-[1em] uppercase opacity-70">Academy Excellence Scroll</h2>
                              <div className="h-px w-64 mx-auto mt-4 opacity-30" style={{ background: 'linear-gradient(to right, transparent, var(--primary), transparent)' }} />
                           </div>

                           {/* Student Name */}
                           <div className="flex-1 flex flex-col items-center justify-center w-full">
                              <p className="font-black italic tracking-[0.3em] text-[10px] mb-4 opacity-50">Official Recognition of Scholarly Grit</p>
                              <h1 className="text-8xl font-black tracking-tighter italic leading-tight drop-shadow-2xl" style={{ color: 'var(--text)' }}>
                                 {student?.full_name}
                              </h1>
                              <div className="h-2 w-32 mt-6 rounded-full" style={{ background: 'var(--primary)' }} />
                              
                              <div className="mt-12 space-y-2">
                                 <p className="text-lg font-bold opacity-40 italic tracking-tight">Distinguished Vanguard of</p>
                                 <h3 className="text-6xl font-black tracking-tighter italic drop-shadow-xl" style={{ color: 'var(--primary)' }}>
                                    {myGroup?.name}
                                 </h3>
                              </div>
                           </div>

                           {/* Metadata Footer */}
                           <div className="w-full grid grid-cols-3 items-end mt-12">
                              <div className="text-left space-y-1">
                                 <div className="font-black text-3xl italic tracking-tighter" style={{ color: 'var(--text)' }}>#{myRank}</div>
                                 <div className="text-[10px] font-black tracking-widest opacity-40 uppercase">Academy Rank</div>
                              </div>

                              <div className="flex flex-col items-center gap-4">
                                 <div className="relative">
                                    <div className="w-24 h-24 rounded-full p-1 shadow-2xl border-2" style={{ background: 'var(--input)', borderColor: 'var(--primary)' }}>
                                       <div className="w-full h-full rounded-full flex items-center justify-center p-3 overflow-hidden">
                                          <img src={myGroup?.avatar_url || ''} alt="" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                       </div>
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-white text-[8px] font-black px-4 py-1 rounded-full shadow-lg whitespace-nowrap uppercase tracking-widest" style={{ background: 'var(--primary)' }}>
                                       Verified Win
                                    </div>
                                 </div>
                                 {myGroup?.members && myGroup.members.length > 1 && (
                                    <div className="text-[9px] font-black opacity-40 tracking-tighter text-center max-w-[200px]">
                                       <span className="opacity-50">SQUAD COHORT:</span><br/>
                                       {myGroup.members.filter(m => m.student?.id !== student?.id).map(m => m.student?.full_name?.split(' ')[0]).join(' / ')}
                                    </div>
                                 )}
                              </div>

                              <div className="text-right space-y-1">
                                 <div className="font-black text-3xl italic tracking-tighter" style={{ color: 'var(--text)' }}>
                                    {mySubmission?.score}
                                 </div>
                                 <div className="text-[10px] font-black tracking-widest opacity-40 uppercase">Excellence Points</div>
                              </div>
                           </div>

                           {/* ID Block */}
                           <div className="absolute bottom-6 right-6 opacity-20">
                              <div className="text-[8px] font-black tracking-[0.3em]" style={{ color: 'var(--text)' }}>ARENA_ID_{sessionId.slice(-8).toUpperCase()}</div>
                           </div>
                           <div className="absolute bottom-6 left-6 opacity-20">
                              <div className="text-[8px] font-black tracking-[0.3em]" style={{ color: 'var(--text)' }}>PEAK_PERFORMANCE_TUTORING_VERIFIED</div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Action Bar */}
               <div className="fixed bottom-12 flex gap-4 w-full max-w-sm px-6 z-[110]">
                  <Button 
                     variant="outline" 
                     className="flex-1 h-14 border-white/20 text-white hover:bg-white/10 font-bold" 
                     style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}
                     onClick={() => setShowCertificate(false)}
                  >
                     Escape
                  </Button>
                  <Button 
                     onClick={downloadCertificate} 
                     isLoading={isDownloading}
                     className="flex-1 h-14 bg-amber-400 hover:bg-amber-500 border-0 text-black font-black uppercase tracking-widest shadow-2xl shadow-amber-500/40"
                     style={{ backgroundColor: '#fbbf24', color: '#000000' }}
                  >
                     <Download size={20} className="mr-2" /> Snapshot
                  </Button>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Review & Rankings */}
      <div className="space-y-8 relative z-10">
         
         {/* Question Analytics */}
         <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2 text-primary">
               <CheckCircle2 size={16} /> Excellence Analytics
            </h3>
            <div className="space-y-3">
               {questions.map((q, i) => {
                  const ansId = mySubmission?.answers[q.id]
                  const timing = mySubmission?.question_timings[q.id]
                  const isCorrect = ansId === q.correct_option_id
                  const isTimedOut = timing?.timed_out
                  const chosenOpt = q.options.find(o => o.id === ansId)
                  
                  return (
                     <Card key={q.id} className={`p-5 rounded-2xl border-2 shadow-none transition-all ${isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : isTimedOut ? 'border-amber-500/20 bg-amber-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                        <div className="flex items-start gap-4">
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-sm ${isCorrect ? 'bg-emerald-500 text-white' : isTimedOut ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                              {i + 1}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-black leading-tight uppercase tracking-tighter mb-2" style={{ color: 'var(--text)' }}>{q.text}</p>
                              <div className="flex flex-wrap items-center gap-3">
                                 {isTimedOut ? (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-1 rounded-lg font-black uppercase flex items-center gap-1"><Timer size={12} /> TIMEOUT</span>
                                 ) : isCorrect ? (
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-2 py-1 rounded-lg font-black uppercase flex items-center gap-1"><CheckCircle2 size={12} /> {chosenOpt?.text}</span>
                                 ) : (
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-1 rounded-lg font-black uppercase flex items-center gap-1"><XCircle size={12} /> {chosenOpt?.text || 'EMPTY'}</span>
                                       <span className="text-[10px] text-emerald-600 font-black uppercase">Correct: {q.options.find(o => o.id === q.correct_option_id)?.text}</span>
                                    </div>
                                 )}
                                 <span className="text-[10px] font-black text-[var(--text-muted)] flex items-center gap-1 ml-auto uppercase tracking-widest"><Clock size={12} /> {timing?.time_taken_s}s</span>
                              </div>
                           </div>
                        </div>
                     </Card>
                  )
               })}
            </div>
         </div>

         {/* Mini Leaderboard */}
         <div className="space-y-4 pb-10">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2 text-primary">
               <Medal size={16} /> Global Standings
            </h3>
            <Card className="divide-y divide-[var(--card-border)] overflow-hidden rounded-[2rem] border-2" style={{ borderColor: 'var(--card-border)' }}>
               {leaderboard.slice(0, 5).map((entry, idx) => {
                  const isMe = entry.group_id === myGroup?.id
                  return (
                     <div key={entry.group_id} className={`p-4 flex items-center gap-4 transition-all ${isMe ? 'bg-primary/10' : ''}`}>
                        <div className="w-8 text-center text-sm font-black" style={{ color: idx === 0 ? '#F59E0B' : 'var(--text-muted)' }}>
                           {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[var(--input)] border-2 border-[var(--card-border)] p-1 shrink-0 overflow-hidden box-content">
                           <img src={entry.group_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.group_name}`} alt="" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="font-black text-sm truncate uppercase tracking-tighter" style={{ color: isMe ? 'var(--primary)' : 'var(--text)' }}>
                              {entry.group_name}
                              {isMe && <span className="ml-2 text-[8px] px-2 py-0.5 rounded-full bg-primary text-white font-black uppercase animate-pulse">YOU</span>}
                           </div>
                           <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{fmtDuration(entry.time_taken_seconds)} response time</div>
                        </div>
                        <div className="text-right">
                           <div className="text-lg font-black italic tracking-tighter text-primary">{entry.score}</div>
                           <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">PTS</div>
                        </div>
                     </div>
                  )
               })}
            </Card>
            <Button className="w-full h-14 font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary-hover shadow-xl shadow-primary/20" onClick={() => router.push('/student/trivia')}>
               Return to Academy <ArrowRight size={20} className="ml-2" />
            </Button>
         </div>
      </div>
    </div>
  )
}
