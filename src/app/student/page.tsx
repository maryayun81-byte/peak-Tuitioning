'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Trophy, Target, Clock, 
  ArrowRight, Play, CheckCircle2,
  Calendar, Award, MessageSquare,
  Sparkles, Flame, Rocket, ChevronRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import { ExamEventBanner } from '@/components/dashboard/ExamEventBanner'
import { TuitionEventBanner } from '@/components/dashboard/TuitionEventBanner'
import { TimetableWidget } from '@/components/dashboard/TimetableWidget'
import Link from 'next/link'
import { OnboardingModal, type OnboardingStep } from '@/components/ui/OnboardingModal'

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
      {/* 2nd */}
      <rect x="22" y="68" width="46" height="54" rx="11" fill="white" fillOpacity="0.18"/>
      <circle cx="45" cy="55" r="16" fill="white" fillOpacity="0.28"/>
      <rect x="30" y="76" width="30" height="7" rx="3.5" fill="white" fillOpacity="0.38"/>
      <text x="45" y="61" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold" opacity="0.9">2</text>
      {/* 1st */}
      <rect x="77" y="44" width="46" height="78" rx="11" fill="white" fillOpacity="0.32"/>
      <circle cx="100" cy="30" r="20" fill="white" fillOpacity="0.38"/>
      <path d="M89 19 L94 10 L100 17 L106 10 L111 19 Z" fill="#FBBF24"/>
      <text x="100" y="37" textAnchor="middle" fontSize="16" fill="white" fontWeight="bold" opacity="0.95">1</text>
      <rect x="85" y="52" width="30" height="7" rx="3.5" fill="white" fillOpacity="0.45"/>
      {/* 3rd */}
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

// ── Student Onboarding Steps ─────────────────────────────────────────────
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

export default function StudentDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, student } = useAuthStore()
  const [loading, setLoading] = useState(true)
  
  const [activeQuests, setActiveQuests] = useState<any[]>([])
  const [nextClass, setNextClass] = useState<any>(null)
  const [intel, setIntel] = useState<any[]>([])
  const [stats, setStats] = useState({ tasks: 0, awards: 0, attendance: 98 })
  const [showWelcome, setShowWelcome] = useState(false)
  
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

      const [subsCount, certsCount] = await Promise.all([
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('student_id', student.id),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('student_id', student.id)
      ])

      setActiveQuests(aRes.data ?? [])
      setIntel(nData ?? [])
      setStats({ tasks: subsCount.count || 0, awards: certsCount.count || 0, attendance: 98 })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-8 pb-12">
      {/* ── First-login onboarding ── */}
      <OnboardingModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        steps={STUDENT_STEPS}
        finishLabel="Start My Journey 🚀"
      />

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: 'var(--text)' }}>
               Ready to soar, {profile?.full_name.split(' ')[0]}? <Rocket className="text-primary animate-pulse" />
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
               You have <b>{student?.xp || 0} XP</b>. Level {Math.floor((student?.xp || 0) / 1000) + 1}
            </p>
         </div>
         <div className="flex gap-4">
            <div className="p-4 rounded-3xl bg-[var(--card)] border border-[var(--card-border)] flex items-center gap-4 shadow-xl shadow-amber-500/5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                   <Flame size={20} className="fill-amber-500" />
                </div>
                <div>
                   <div className="text-lg font-black" style={{ color: 'var(--text)' }}>{student?.streak_count || 0} Days</div>
                   <div className="text-[10px] uppercase font-bold text-muted">Fire Streak</div>
                </div>
            </div>
         </div>
      </div>

       {/* Event Banners */}
       <div className="space-y-3">
          <ExamEventBanner />
          <TuitionEventBanner />
       </div>

      {/* Progress Card */}
      <Card className="p-8 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors" />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-muted">Level {Math.floor((student?.xp || 0) / 1000) + 1}</span>
                  <span className="text-xs font-black text-primary">{Math.floor(((student?.xp || 0) % 1000) / 10)}% to Level Up</span>
               </div>
               <div className="h-4 bg-[var(--input)] rounded-full overflow-hidden border border-[var(--card-border)]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${((student?.xp || 0) % 1000) / 10}%` }} transition={{ duration: 1.5, ease: 'easeOut' }} className="h-full bg-primary" style={{ boxShadow: '0 0 12px var(--primary)' }} />
               </div>
               <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <Sparkles size={12} className="text-amber-500" /> {1000 - ((student?.xp || 0) % 1000)} more XP to reach the next horizon!
               </div>
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
         {/* Daily Quests */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Target size={20} className="text-primary" /> Daily Quests
               </h2>
               <Link href="/student/assignments" className="text-xs font-bold text-primary hover:underline">View All Quests</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {activeQuests.map((q, i) => (
                 <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className="p-5 flex flex-col h-full border-none shadow-xl shadow-slate-900/10 hover:shadow-primary/5 transition-all">
                       <div className="flex justify-between items-start mb-4">
                          <div className={`p-2.5 rounded-2xl ${i % 2 === 0 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-rose-500/10 text-rose-500'}`}>
                             <Award size={20} />
                          </div>
                          <Badge variant="muted" className="text-[9px]">{q.subject?.name}</Badge>
                       </div>
                       <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text)' }}>{q.title}</h3>
                       <p className="text-[10px] mb-6 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{q.description || 'Complete this task to earn XP and master the topic.'}</p>
                       <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500">
                             <Zap size={12} className="fill-amber-500" /> +20 XP Completion
                          </div>
                          <Link href={`/student/assignments/${q.id}`}>
                             <Button size="sm" variant="secondary">Start Quest <ArrowRight size={12} className="ml-1" /></Button>
                          </Link>
                       </div>
                    </Card>
                 </motion.div>
               ))}
            </div>
         </div>

         {/* Right Sidebar */}
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

            <Card className="p-6 text-center space-y-4">
               <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto border-4 border-white shadow-inner">
                  <Trophy size={32} className="text-amber-500" />
               </div>
               <div>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Leaderboard Ranking</h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Position #4 in Grade 8 Red</p>
               </div>
               <Button variant="ghost" size="sm" className="w-full text-xs">View Full Standings</Button>
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
    </div>
  )
}
