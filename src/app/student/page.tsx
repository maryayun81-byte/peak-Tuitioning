'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Trophy, Target, Clock, 
  ArrowRight, Play, CheckCircle2,
  Calendar, Award, MessageSquare,
  Sparkles, Flame, Rocket, ChevronRight
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import { ExamEventBanner } from '@/components/dashboard/ExamEventBanner'
import { TuitionEventBanner } from '@/components/dashboard/TuitionEventBanner'
import { TimetableWidget } from '@/components/dashboard/TimetableWidget'
import Link from 'next/link'
import { OnboardingModal, type OnboardingStep } from '@/components/ui/OnboardingModal'
import { calculateLevel } from '@/lib/gamification'

interface LeaderboardEntry {
  full_name: string
  xp: number
  avatar_url?: string
  class?: {
    name: string
  }
}

interface Quest {
  id: string
  title: string
  description?: string
  subject?: {
    name: string
  }
}

interface Intel {
  id: string
  title: string
  body: string
  type: string
}

// ── Typing animation helper ──────────────────────────────────────────────
function TypingText({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [speed, setSpeed] = useState(150)

  useEffect(() => {
    const handleTyping = () => {
      const currentPhrase = phrases[index % phrases.length]
      if (isDeleting) { setDisplayText(currentPhrase.substring(0, displayText.length - 1)); setSpeed(50) }
      else { setDisplayText(currentPhrase.substring(0, displayText.length + 1)); setSpeed(100) }
      if (!isDeleting && displayText === currentPhrase) setTimeout(() => setIsDeleting(true), 2000)
      else if (isDeleting && displayText === '') { setIsDeleting(false); setIndex(p => p + 1) }
    }
    const timer = setTimeout(handleTyping, speed)
    return () => clearTimeout(timer)
  }, [displayText, isDeleting, index, phrases, speed])

  return (
    <span className="inline-block min-h-[1.5em] text-primary">
      {displayText}<span className="ml-1 border-r-2 border-primary animate-pulse" />
    </span>
  )
}

// ── Inline SVG Visuals ───────────────────────────────────────────────────
function WelcomeStudentVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <ellipse cx="100" cy="78" rx="20" ry="34" fill="white" fillOpacity="0.85"/>
      <polygon points="100,18 82,60 118,60" fill="white"/>
      <circle cx="100" cy="68" r="9" fill="none" stroke="rgba(16,185,129,0.8)" strokeWidth="2.5"/>
      <circle cx="100" cy="68" r="4" fill="rgba(16,185,129,0.6)"/>
      <polygon points="80,86 68,112 88,105" fill="white" fillOpacity="0.7"/>
      <polygon points="120,86 132,112 112,105" fill="white" fillOpacity="0.7"/>
      <ellipse cx="100" cy="116" rx="13" ry="16" fill="#FBBF24" fillOpacity="0.8"/>
      <ellipse cx="100" cy="119" rx="7" ry="11" fill="#F97316" fillOpacity="0.9"/>
      {[[38,22],[165,28],[172,87],[32,96],[58,52],[158,62]].map(([cx,cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} fill="white" fillOpacity={0.3 + i * 0.08}/>
      ))}
    </svg>
  )
}

function StudyPlannerVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <rect x="15" y="8" width="170" height="114" rx="14" fill="white" fillOpacity="0.12"/>
      <rect x="15" y="8" width="170" height="30" rx="14" fill="white" fillOpacity="0.22"/>
      <circle cx="42" cy="23" r="7" fill="white" fillOpacity="0.6"/>
      <rect x="56" y="18" width="55" height="9" rx="4.5" fill="white" fillOpacity="0.45"/>
      {[0,1,2,3,4].map(i => (
        <g key={i}>
          <rect x={22 + i*32} y="48" width="24" height={36 + (i % 3)*16} rx="7" fill="white" fillOpacity={0.13 + i*0.06}/>
          <rect x={22 + i*32} y="48" width="24" height="10" rx="5" fill="white" fillOpacity="0.45"/>
        </g>
      ))}
      <circle cx="174" cy="108" r="12" fill="white" fillOpacity="0.28"/>
      <circle cx="174" cy="108" r="9" stroke="white" strokeWidth="1.8"/>
      <line x1="174" y1="102" x2="174" y2="108" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="174" y1="108" x2="178" y2="111" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="32" cy="108" r="7" fill="#10B981"/>
      <path d="M29 108 L31.5 110.5 L35 106" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function FocusModeVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <circle cx="100" cy="65" r="50" stroke="white" strokeOpacity="0.12" strokeWidth="2" strokeDasharray="5 4"/>
      <circle cx="100" cy="65" r="42" stroke="white" strokeOpacity="0.1" strokeWidth="9"/>
      <circle cx="100" cy="65" r="42" stroke="white" strokeOpacity="0.75" strokeWidth="9" strokeLinecap="round"
        strokeDasharray="264 264" strokeDashoffset="66" transform="rotate(-90 100 65)"/>
      <circle cx="100" cy="65" r="29" fill="white" fillOpacity="0.13"/>
      <rect x="83" y="57" width="34" height="9" rx="4.5" fill="white" fillOpacity="0.8"/>
      <rect x="89" y="71" width="22" height="6" rx="3" fill="white" fillOpacity="0.4"/>
      <path d="M35 74 Q35 48 60 48" stroke="white" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <rect x="26" y="70" width="12" height="17" rx="6" fill="white" fillOpacity="0.38"/>
      <path d="M165 74 Q165 48 140 48" stroke="white" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <rect x="162" y="70" width="12" height="17" rx="6" fill="white" fillOpacity="0.38"/>
      {[[22,26],[178,22],[183,103],[14,103]].map(([cx,cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} fill="white" fillOpacity={0.4 + i*0.1}/>
      ))}
    </svg>
  )
}

function LeaderboardVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <rect x="22" y="68" width="46" height="54" rx="11" fill="white" fillOpacity="0.18"/>
      <circle cx="45" cy="55" r="16" fill="white" fillOpacity="0.28"/>
      <rect x="30" y="76" width="30" height="7" rx="3.5" fill="white" fillOpacity="0.38"/>
      <text x="45" y="61" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold" opacity="0.9">2</text>
      <rect x="77" y="44" width="46" height="78" rx="11" fill="white" fillOpacity="0.32"/>
      <circle cx="100" cy="30" r="20" fill="white" fillOpacity="0.38"/>
      <path d="M89 19 L94 10 L100 17 L106 10 L111 19 Z" fill="#FBBF24"/>
      <text x="100" y="37" textAnchor="middle" fontSize="16" fill="white" fontWeight="bold" opacity="0.95">1</text>
      <rect x="85" y="52" width="30" height="7" rx="3.5" fill="white" fillOpacity="0.45"/>
      <rect x="132" y="84" width="46" height="38" rx="11" fill="white" fillOpacity="0.14"/>
      <circle cx="155" cy="72" r="15" fill="white" fillOpacity="0.22"/>
      <text x="155" y="78" textAnchor="middle" fontSize="13" fill="white" fontWeight="bold" opacity="0.85">3</text>
      <rect x="140" y="92" width="30" height="7" rx="3.5" fill="white" fillOpacity="0.28"/>
    </svg>
  )
}

function XPRewardsVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <rect x="25" y="50" width="150" height="16" rx="8" fill="white" fillOpacity="0.14"/>
      <rect x="25" y="50" width="128" height="16" rx="8" fill="white" fillOpacity="0.55"/>
      <rect x="25" y="32" width="46" height="12" rx="6" fill="white" fillOpacity="0.38"/>
      <rect x="78" y="32" width="28" height="12" rx="6" fill="white" fillOpacity="0.2"/>
      <circle cx="55" cy="97" r="17" fill="white" fillOpacity="0.18"/>
      <text x="55" y="103" textAnchor="middle" fontSize="17">⭐</text>
      <circle cx="100" cy="101" r="21" fill="white" fillOpacity="0.22"/>
      <text x="100" y="109" textAnchor="middle" fontSize="22">🏅</text>
      <circle cx="148" cy="97" r="17" fill="white" fillOpacity="0.18"/>
      <text x="148" y="103" textAnchor="middle" fontSize="17">⚡</text>
      {[[26,18],[178,26],[190,90]].map(([cx,cy], i) => (
        <g key={i}>
          <line x1={cx} y1={cy-5} x2={cx} y2={cy+5} stroke="white" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1={cx-5} y1={cy} x2={cx+5} y2={cy} stroke="white" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round"/>
        </g>
      ))}
    </svg>
  )
}

const STUDENT_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Peak Performance!',
    subtitle: 'Your journey begins',
    description: "You've joined an elite academic platform where every focus session, goal, and assignment counts. We track your cognitive growth in real-time. Let's get you ready for absolute mastery.",
    visual: <WelcomeStudentVisual />,
    accent: 'emerald',
  },
  {
    title: 'Precision Study Planner',
    subtitle: 'Your path to A*',
    description: 'Mastery requires a plan. Navigate to Study → Planner to create your subjects and weekly layout. Add specific revision blocks and drag them into place. Every planned hour is a step toward your academic goals.',
    visual: <StudyPlannerVisual />,
    accent: 'indigo',
  },
  {
    title: 'Deep Focus Engine',
    subtitle: 'Enter the flow state',
    description: 'Need to crush a revision session? Start Focus Mode. Choose your subject, set a timer (25-50m is best), and pick your background soundscape. Avoid switching tabs — the engine tracks your focus stability and awards XP for every focused minute.',
    visual: <FocusModeVisual />,
    accent: 'violet',
  },
  {
    title: 'Global Leaderboards',
    subtitle: 'Compete with the best',
    description: "Every action you take earns you XP. Compare your weekly and monthly performance against your class and the entire school. Top performers earn 'Hall of Fame' status and rare digital artifacts to decorate their profile.",
    visual: <LeaderboardVisual />,
    accent: 'amber',
  },
  {
    title: 'The XP Economy',
    subtitle: 'Rewards for effort',
    description: 'Earn +20 XP for every assignment submitted, +10 XP for every 25m of Focus, and +50 XP for hitting a weekly study goal. High XP unlocks Level-Up Badges, Certificates of Excellence, and exclusive Focus soundscapes!',
    visual: <XPRewardsVisual />,
    accent: 'rose',
  },
]

let cachedDashboardData: any = null

export default function StudentDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, student } = useAuthStore()
  const [loading, setLoading] = useState(!cachedDashboardData)
  
  const [activeQuests, setActiveQuests] = useState<Quest[]>(cachedDashboardData?.activeQuests || [])
  const [nextClass, setNextClass] = useState<any>(null)
  const [intel, setIntel] = useState<Intel[]>(cachedDashboardData?.intel || [])
  const [stats, setStats] = useState(cachedDashboardData?.stats || { tasks: 0, awards: 0, attendance: 98 })
  const [showWelcome, setShowWelcome] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(cachedDashboardData?.leaderboard || [])
  const [studentRank, setStudentRank] = useState<number | null>(cachedDashboardData?.studentRank || null)
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false)
  
  useEffect(() => {
    if (student && student.onboarded === false) {
       setShowWelcome(true)
    }
  }, [student?.onboarded])

  const handleCloseWelcome = async () => {
    setShowWelcome(false)
    if (student?.id) {
       await supabase.from('students').update({ onboarded: true }).eq('id', student.id)
    }
  }
  
  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
       if (mounted && loading && !student) setLoading(false)
    }, 2000)
    if (student && profile) loadDashboard()
    return () => { mounted = false; clearTimeout(timer) }
  }, [student, profile])

  const loadDashboard = async () => {
    if (!student || !profile) return
    setLoading(true)

    // Daily XP Reward Logic
    const today = new Date().toISOString().split('T')[0]
    if (student.last_login_xp_at !== today) {
      let newXP = (student.xp || 0) + 10
      let newStreak = (student.streak_count || 0)
      
      const lastActive = student.last_active_at ? student.last_active_at : null
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      if (lastActive === yesterdayStr) {
         newStreak += 1
      } else if (!lastActive || lastActive < yesterdayStr) {
         newStreak = 1
      }
      
      await supabase.from('students').update({
        xp: newXP,
        last_login_xp_at: today,
        last_active_at: today,
        streak_count: newStreak
      }).eq('id', student.id)
      
      useAuthStore.setState({ student: {
        ...student,
        xp: newXP,
        streak_count: newStreak,
        last_login_xp_at: today,
        last_active_at: today
      }})
      
      toast.success('Daily Reward: +10 XP earned! 🔥', {
        icon: '🚀',
        duration: 5000,
        style: {
          background: 'var(--card)',
          color: 'var(--text)',
          border: '1px solid var(--primary)',
        }
      })
    }

    try {
      const { data: subData } = await supabase
        .from('student_subjects').select('subject_id').eq('student_id', student.id)
      const subjectIds = subData?.map(s => s.subject_id) || []

      const [aRes] = await Promise.all([
        supabase.from('assignments').select('*, subject:subjects(name)')
          .in('subject_id', subjectIds).eq('status', 'published')
          .order('created_at', { ascending: false }).limit(3),
      ])

      const { data: nData } = await supabase.from('notifications').select('*')
        .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(3)

      const [subsCount, certsCount, badgesCount] = await Promise.all([
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('student_id', student.id),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('student_id', student.id),
        supabase.from('study_badges').select('*', { count: 'exact', head: true }).eq('student_id', student.id)
      ])

      let freshLeaderboard: LeaderboardEntry[] = []
      let freshRank: number | null = null

      try {
        const { data: lbData } = await supabase.from('students').select('full_name, xp, class:classes(name)').order('xp', { ascending: false }).limit(20)
        if (lbData) {
          freshLeaderboard = (lbData as any[]).map(item => ({
            ...item,
            class: Array.isArray(item.class) ? item.class[0] : item.class
          }))
        }
      } catch (e) {
        console.log('Leaderboard fetch fallback')
      }

      try {
        const rankRes = await supabase.rpc('get_student_rank', { input_student_id: student.id })
        if (rankRes.data) {
          freshRank = rankRes.data
        } else {
          const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).gt('xp', student.xp)
          freshRank = (count || 0) + 1
        }
      } catch (e) {
        console.log('Rank fetch fallback')
      }

      const fetchedStats = { 
        tasks: subsCount.count || 0, 
        awards: (certsCount.count || 0) + (badgesCount.count || 0), 
        attendance: 98 
      }

      const mappedQuests = (aRes.data ?? []).map((q: any) => ({
        ...q,
        subject: Array.isArray(q.subject) ? q.subject[0] : q.subject
      }))

      setActiveQuests(mappedQuests)
      setIntel(nData ?? [])
      setStats(fetchedStats)
      setLeaderboard(freshLeaderboard)
      setStudentRank(freshRank)
      
      cachedDashboardData = {
        activeQuests: mappedQuests,
        intel: nData ?? [],
        stats: fetchedStats,
        leaderboard: freshLeaderboard,
        studentRank: freshRank
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-8 pb-12 relative overflow-hidden min-h-screen">
      {/* Subtle Background Radial */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
         <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
         <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      <OnboardingModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        steps={STUDENT_STEPS}
        finishLabel="Start My Journey 🚀"
      />

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
         <div className="space-y-1">
            <h1 className="text-4xl font-black flex items-center gap-3 tracking-tighter" style={{ color: 'var(--text)' }}>
               Ready to soar, {profile?.full_name.split(' ')[0]}? <Rocket className="text-primary animate-float-slow" />
            </h1>
             <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
               {(() => {
                 const { level, isProspect } = calculateLevel(student?.xp || 0)
                 const xp = student?.xp || 0
                 return `You have ${xp.toLocaleString()} XP. ${!isProspect ? `Level ${level}` : 'Prospect'}`
               })()}
             </p>
         </div>
          <div className="flex gap-4">
            <div className="p-4 rounded-3xl bg-[var(--card)] border border-[var(--card-border)] flex items-center gap-4 shadow-2xl glass-card-elite">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                   <Flame size={24} className="fill-amber-500 animate-pulse" />
                </div>
                <div>
                   <div className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{student?.streak_count || 0} Days</div>
                   <div className="text-[10px] uppercase font-bold text-muted tracking-widest opacity-60">Fire Streak</div>
                </div>
            </div>
         </div>
      </div>

       <div className="space-y-3 relative z-10">
          <ExamEventBanner />
          <TuitionEventBanner />
       </div>

      <Card className="p-8 relative overflow-hidden group glass-card-elite border-none">
         <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[80px] group-hover:bg-primary/10 transition-all duration-700" />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="space-y-4">
               {(() => {
                 const { level, progressPercent, nextMilestone, isProspect } = calculateLevel(student?.xp || 0)
                 const xp = student?.xp || 0
                 
                 return (
                    <>
                      <div className="flex justify-between items-end mb-1">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-70 mb-1">{!isProspect ? `Level ${level}` : 'Prospect'}</span>
                            <span className="text-2xl font-black tracking-tighter">{calculateLevel(student?.xp || 0).title.split(' ')[0]}</span>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-primary drop-shadow-[0_0_8px_var(--primary)]">{progressPercent}% to Level Up</span>
                            <Badge variant="primary" className="text-[9px] mt-1 bg-primary/20 text-primary border-primary/30">Rank #{studentRank || '?'}</Badge>
                         </div>
                      </div>
                      <div className="h-4 bg-[var(--input)]/50 rounded-full overflow-hidden border border-[var(--card-border)] backdrop-blur-sm p-0.5">
                         <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 1.5, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-primary to-accent rounded-full relative" style={{ boxShadow: '0 0 15px var(--primary)' }}>
                            <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse" />
                         </motion.div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                         <Sparkles size={12} className="text-amber-400" /> {nextMilestone - xp} more XP to reach the next horizon!
                      </div>
                    </>
                 )
               })()}
            </div>
            <div className="flex items-center justify-around col-span-2 border-l border-[var(--card-border)] pl-8">
               <div className="text-center">
                  <div className="text-2xl font-black text-primary">{stats.awards}</div>
                  <div className="text-[10px] uppercase font-bold text-muted">Awards</div>
               </div>
               <div className="text-center">
                  <div className="text-2xl font-black text-secondary">{stats.tasks}</div>
                  <div className="text-[10px] uppercase font-bold text-muted">Tasks Done</div>
               </div>
               <div className="text-center">
                  <div className="text-2xl font-black text-emerald-500">{stats.attendance}%</div>
                  <div className="text-[10px] uppercase font-bold text-muted">Attendance</div>
               </div>
            </div>
         </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Target size={20} className="text-primary" /> Daily Quests
               </h2>
               <Link href="/student/assignments" className="text-xs font-bold text-primary hover:underline">View All Quests</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {activeQuests.length === 0 ? (
                  <div className="col-span-full p-8 text-center rounded-3xl border-2 border-dashed border-[var(--card-border)] bg-[var(--card)]/50">
                     <Target size={40} className="mx-auto text-muted opacity-30 mb-3" />
                     <h3 className="text-sm font-bold opacity-70" style={{ color: 'var(--text)' }}>No Active Quests</h3>
                     <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--text-muted)' }}>You're all caught up! Take a break or start a Focus session.</p>
                  </div>
               ) : (
                 activeQuests.map((q, i) => (
                 <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className="p-6 flex flex-col h-full border-none shadow-2xl glass-card-elite hover:scale-[1.02] transition-all group/quest">
                       <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-2xl ${i % 2 === 0 ? 'bg-indigo-500/15 text-indigo-400' : 'bg-rose-500/15 text-rose-400'} shadow-inner`}>
                             <Award size={22} className="group-hover/quest:animate-bounce" />
                          </div>
                          <Badge className="text-[9px] bg-white/5 border-white/10 uppercase tracking-widest font-black">{q.subject?.name}</Badge>
                       </div>
                       <h3 className="font-black text-lg mb-2 leading-tight" style={{ color: 'var(--text)' }}>{q.title}</h3>
                       <p className="text-xs mb-8 line-clamp-2 leading-relaxed opacity-60" style={{ color: 'var(--text-muted)' }}>{q.description || 'Complete this task to earn XP and master the topic.'}</p>
                       <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                             <Zap size={14} className="fill-amber-400" /> +20 XP
                          </div>
                          <Link href={`/student/assignments/${q.id}`}>
                             <Button size="sm" className="bg-white/5 hover:bg-white/10 border-white/10 text-xs font-bold px-6">Enter Quest</Button>
                          </Link>
                       </div>
                    </Card>
                 </motion.div>
                 ))
               )}
            </div>
         </div>

         <div className="space-y-6">
            <TimetableWidget role="student" />
            <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
               <MessageSquare size={20} className="text-secondary" /> Recent Intel
            </h2>
            <div className="space-y-3">
               {intel.map((n) => (
                 <Card key={n.id} className="p-4 border-none shadow-md">
                    <div className="flex gap-3">
                       <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: n.type === 'award' ? '#10B981' : n.type === 'info' ? '#3B82F6' : '#F59E0B' }} />
                       <div>
                          <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text)' }}>{n.title}</p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{n.body}</p>
                       </div>
                    </div>
                 </Card>
               ))}
               {intel.length === 0 && <p className="text-[10px] text-center p-4 italic opacity-50">No recent intel found.</p>}
            </div>

            <Card className="p-6 text-center space-y-4 glass-card-elite border-none">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto border-4 border-primary/20 shadow-xl overflow-hidden relative group/avatar">
                   {student?.avatar_url ? (
                      <img src={student.avatar_url} alt="You" className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" />
                   ) : (
                      <Trophy size={36} className="text-amber-500 animate-glow-pulse" />
                   )}
                   <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                </div>
                <div>
                   <h4 className="font-black text-base tracking-tight" style={{ color: 'var(--text)' }}>Global Rank</h4>
                   <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                      {studentRank ? <span className="text-primary">Position #{studentRank} </span> : 'Calculating... '}
                      {student?.class?.name ? <span className="opacity-60">in {student.class.name}</span> : ''}
                   </p>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs font-bold hover:bg-white/5" onClick={() => setShowFullLeaderboard(true)}>View Hall of Fame</Button>
             </Card>

            <Link href="/student/transcripts">
              <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg hover:scale-105 transition-all cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                       <Award size={24} />
                    </div>
                    <div>
                       <h4 className="font-bold text-sm">My Transcripts</h4>
                       <p className="text-[10px] opacity-80">View Academic Reports</p>
                    </div>
                 </div>
              </Card>
            </Link>
         </div>
      </div>

      <Modal isOpen={showFullLeaderboard} onClose={() => setShowFullLeaderboard(false)} title="Peak Authority Leaderboard 🏆" size="lg">
         <div className="space-y-6 py-2 pb-6">
            <div className="flex items-center justify-between p-6 rounded-3xl bg-primary/10 border border-primary/20 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] rounded-full group-hover:scale-150 transition-transform" />
               <div className="flex items-center gap-5 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black text-3xl shadow-inner border border-primary/20">
                     #{studentRank || '?'}
                  </div>
                  <div>
                     <div className="font-black text-xl tracking-tighter" style={{ color: 'var(--text)' }}>Your Standing</div>
                     <div className="text-xs font-black text-primary uppercase tracking-widest">{student?.xp?.toLocaleString()} XP Earned</div>
                  </div>
               </div>
              <div className="text-right relative z-10">
                 <Badge variant="primary" className="mb-1 bg-primary text-white border-none px-4 py-1 font-black">Level {calculateLevel(student?.xp || 0).level || 1}</Badge>
              </div>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
               {leaderboard.map((entry, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${entry.full_name === profile?.full_name ? 'bg-primary/15 border border-primary/30 shadow-2xl glass-card-elite translate-x-1' : 'hover:bg-white/5 border border-transparent hover:border-white/5'}`}>
                     <div className="flex items-center gap-5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-lg ${i === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-white animate-bounce shadow-amber-500/20' : i === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-white' : i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' : 'bg-white/5 text-muted'}`}>
                           {i + 1}
                        </div>
                        <div className="relative">
                           <Avatar url={entry.avatar_url} name={entry.full_name} size="md" />
                           {i < 3 && <div className="absolute -top-1 -right-1 text-xs">👑</div>}
                        </div>
                        <div>
                           <div className="text-base font-black tracking-tight" style={{ color: 'var(--text)' }}>{entry.full_name}</div>
                           <div className="text-[10px] font-bold text-muted opacity-60 uppercase tracking-widest">{entry.class?.name || 'Vanguard Scholar'}</div>
                        </div>
                     </div>
                     <div className="text-right px-2">
                        <div className="text-lg font-black text-primary tracking-tighter">{entry.xp.toLocaleString()}</div>
                        <div className="text-[9px] font-black text-muted uppercase tracking-widest opacity-60">Total XP</div>
                     </div>
                  </div>
               ))}
            </div>
            <p className="text-[10px] text-center text-muted italic">Leaderboard updates in real-time as you earn XP from quests and focus sessions.</p>
         </div>
      </Modal>
    </div>
  )
}
