'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Trophy, Target, Clock, 
  ArrowRight, Play, CheckCircle2,
  Calendar, Award, MessageSquare,
  Sparkles, Flame, Rocket, ChevronRight,
  BookOpen, Lightbulb, GraduationCap,
  Library as LibraryIcon
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { 
  Skeleton,
  SkeletonDashboard, 
  SkeletonQuest, 
  SkeletonIntel 
} from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import { ExamEventBanner } from '@/components/dashboard/ExamEventBanner'
import { TuitionEventBanner } from '@/components/dashboard/TuitionEventBanner'
import { TimetableWidget } from '@/components/dashboard/TimetableWidget'
import Link from 'next/link'
import { OnboardingModal, type OnboardingStep } from '@/components/ui/OnboardingModal'
import { calculateLevel, LEVEL_THRESHOLDS } from '@/lib/gamification'
import { 
  useStudentStats, 
  useStudentQuests, 
  useStudentIntel, 
  useLeaderboardData,
  useKnowledgeFeed
} from '@/hooks/useDashboardData'
import { 
  SectionErrorBoundary, 
  EmptyState, 
  ErrorState, 
  TimeoutState 
} from '@/components/ui/PageStates'
import { PeakAIAssistant } from '@/components/student/PeakAIAssistant'
import { InsightTrigger } from '@/components/student/InsightTrigger'

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

// (Hardcoded datasets removed — now fetched from Supabase app_knowledge_base)

const RECOMMENDED_BOOKS = [
  { title: "Atomic Habits", author: "James Clear", genre: "Self-Improvement" },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", genre: "Psychology" },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Classic Fiction" },
]

function ConfettiPiece({ delay = 0 }) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 1, scale: 0 }}
      animate={{ 
        y: [null, 400 + Math.random() * 200],
        x: [null, (Math.random() - 0.5) * 300],
        rotate: [0, 360 * 2],
        opacity: [1, 1, 0],
        scale: [0, 1.2, 0.8]
      }}
      transition={{ duration: 3 + Math.random() * 2, delay, ease: "easeOut" }}
      className="absolute w-2 h-2 rounded-sm"
      style={{ 
        background: ['#FBBF24', '#3B82F6', '#10B981', '#F43F5E', '#8B5CF6'][Math.floor(Math.random() * 5)],
        left: `${Math.random() * 100}%`
      }}
    />
  )
}

export default function StudentDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile, student, setStudent } = useAuthStore()
  
  const [showWelcome, setShowWelcome] = useState(false)
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false)
  const [selectedIntel, setSelectedIntel] = useState<Intel | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)

  // Tracking level for celebration
  const lastLevelRef = useRef<number | null>(null)

  // ── High Performance Data Streams ─────────────────────────────────────
  const { 
    data: qData, 
    status: qStatus, 
    refetch: qRefetch 
  } = useStudentQuests(student?.id)
  
  const { 
    data: iData, 
    status: iStatus, 
    refetch: iRefetch 
  } = useStudentIntel(profile?.id)
  
  const { 
    data: sData, 
    status: sStatus, 
    refetch: sRefetch 
  } = useStudentStats(student?.id)
  
  const { 
    data: lData, 
    status: lStatus, 
    refetch: lRefetch 
  } = useLeaderboardData(student?.id, student?.xp)

  const {
    data: kData,
    status: kStatus
  } = useKnowledgeFeed()

  useEffect(() => {
    if (student && student.onboarded === false) {
       setShowWelcome(true)
    }
  }, [student?.onboarded])

  const handleCloseWelcome = async () => {
    setShowWelcome(false)
    if (student?.id) {
      await supabase.from('students').update({ onboarded: true }).eq('id', student.id)
      // CRITICAL: Sync the Zustand store immediately so the layout guard in layout.tsx
      // sees onboarded=true and does NOT re-redirect to /student/onboarding.
      setStudent({ ...student, onboarded: true })
    }
  }
  

  // ── Daily XP Reward (One-time check per day) ──────────────────────────
  useEffect(() => {
    if (!student?.id || !profile?.id) return

    const checkDailyXP = async () => {
      const today = new Date().toISOString().split('T')[0]
      if ((student as any).last_login_xp_at === today) return

      try {
        const newXP = (student.xp || 0) + 10
        let newStreak = student.streak_count || 0
        const lastActive = (student as any).last_active_at ?? null
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        if (lastActive === yesterdayStr) newStreak += 1
        else if (!lastActive || lastActive < yesterdayStr) newStreak = 1

        // Fire-and-forget DB update
        supabase.from('students').update({
          xp: newXP,
          last_login_xp_at: today,
          last_active_at: today,
          streak_count: newStreak
        }).eq('id', student.id).then(({ error }) => {
          if (!error) {
            const current = useAuthStore.getState().student
            if (current?.id === student.id) {
              useAuthStore.setState({ 
                student: { ...current, xp: newXP, streak_count: newStreak, last_login_xp_at: today, last_active_at: today } as any 
              })
            }
          }
        })

        toast.success('Daily Reward: +10 XP earned! 🔥', {
          id: 'daily-xp',
          icon: '🚀',
          duration: 5000
        })
      } catch (e) {
        console.warn('[Dashboard] XP reward failure:', e)
      }
    }

    checkDailyXP()
  }, [student?.id, profile?.id])

// ─── Daily motivational quotes ────────────────────────────────────────────────
const DAILY_QUOTES = [
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { quote: "Great things never come from comfort zones.", author: "Neil Strauss" },
  { quote: "Dream big. Start small. Act now.", author: "Robin Sharma" },
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { quote: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Terry Mark" },
  { quote: "Don't stop when you're tired. Stop when you're done.", author: "Marilyn Monroe" },
  { quote: "Wake up with determination. Go to bed with satisfaction.", author: "George Lorimer" },
  { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { quote: "Work hard in silence. Let your success make the noise.", author: "Frank Ocean" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { quote: "The beautiful thing about learning is no one can take it away from you.", author: "B.B. King" },
  { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { quote: "The mind is not a vessel to be filled but a fire to be kindled.", author: "Plutarch" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas Edison" },
  { quote: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "A.A. Milne" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { quote: "Strive for progress, not perfection.", author: "Kim Collins" },
  { quote: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { quote: "Push yourself, because no one else is going to do it for you.", author: "Roy T. Bennett" },
  { quote: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
]

function getDailyQuote() {
  const day = new Date().getDay() + new Date().getDate()
  return DAILY_QUOTES[day % DAILY_QUOTES.length]
}

function getGreeting(name: string) {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name}! ☀️`
  if (h < 17) return `Good afternoon, ${name}! 🌤️`
  if (h < 21) return `Good evening, ${name}! 🌆`
  return `Studying late, ${name}? 🌙`
}

  const { level, progressPercent, nextMilestone, isProspect, title: levelTitle } = calculateLevel(student?.xp || 0)

  // ── Level Up Celebration Logic ────────────────────────────────────────
  useEffect(() => {
    if (level > 0) {
      if (lastLevelRef.current !== null && level > lastLevelRef.current) {
        setShowLevelUp(true)
      }
      lastLevelRef.current = level
    }
  }, [level])

  const xp = student?.xp || 0
  const streak = student?.streak_count || 0

  // 6-hour rotation logic (now backed by DB feed)
  const now = new Date()
  const dailyWord = kData?.word || { word: "Elevate", type: "Verb", def: "To lift up or improve.", ex: "Always strive to elevate your mindset." }
  const dailyFact = kData?.fact || { text: "Consistency is key to mastering any new skill." }
  const book = RECOMMENDED_BOOKS[Math.floor(now.getTime() / (1000 * 60 * 60 * 6)) % RECOMMENDED_BOOKS.length]

  const quote = getDailyQuote()
  const firstName = profile?.full_name?.split(' ')[0] || 'Scholar'

  return (
    <div className="pb-12 relative overflow-hidden min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Confetti Overlay */}
      {showLevelUp && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => <ConfettiPiece key={i} delay={i * 0.05} />)}
        </div>
      )}

      {/* Level Up Modal */}
      <Modal isOpen={showLevelUp} onClose={() => setShowLevelUp(false)} title="LEVEL UP! 🚀" size="md">
        <div className="text-center space-y-6 py-8">
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
            className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-amber-500/20"
          >
            ⭐
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>You reached Level {level}!</h2>
            <p className="text-lg font-bold text-primary">{levelTitle}</p>
          </div>
          <p className="text-sm px-6" style={{ color: 'var(--text-muted)' }}>
            Your dedication to mastery is paying off. Keep pushing boundaries, and you&apos;ll be a Peak Legend in no time!
          </p>
          <Button onClick={() => setShowLevelUp(false)} className="w-full py-6 text-lg">Continue My Journey</Button>
        </div>
      </Modal>

      {/* Intel Detail Modal */}
      <Modal isOpen={!!selectedIntel} onClose={() => setSelectedIntel(null)} title={selectedIntel?.title || 'System Message'} size="md">
        <div className="space-y-6 py-4">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className={`w-2 h-12 rounded-full shrink-0 ${
              selectedIntel?.type === 'award' ? 'bg-emerald-500' : selectedIntel?.type === 'assignment_returned' ? 'bg-amber-500' : 'bg-primary'
            }`} />
            <div>
              <p className="text-base leading-relaxed" style={{ color: 'var(--text)' }}>{selectedIntel?.body}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {(selectedIntel as any)?.data?.assignment_id && (
              <Button onClick={() => router.push(`/student/assignments/${(selectedIntel as any).data.assignment_id}`)} className="w-full py-4 gap-2">
                <Play size={18} /> View Results & Feedback
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedIntel(null)} className="w-full py-4">Dismiss</Button>
          </div>
        </div>
      </Modal>

      {/* === Ambient Background === */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] animate-pulse" style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full opacity-10 blur-[100px]" style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[200px] rounded-full opacity-5 blur-[80px] rotate-12" style={{ background: 'var(--primary)' }} />
      </div>

      <OnboardingModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        steps={STUDENT_STEPS}
        finishLabel="Start My Journey 🚀"
      />

      <div className="relative z-10 p-4 sm:p-6 space-y-6">

        {/* === HERO SECTION === */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8" style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
        }}>
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />
          <div className="absolute top-4 right-4 text-white/10 text-[120px] font-black leading-none select-none pointer-events-none">✦</div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em]">Peak Performance Portal</p>
                <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mt-1">
                  {getGreeting(firstName)}
                </h1>
              </motion.div>

              {/* Daily Quote */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-2 max-w-lg"
              >
                <span className="text-white/40 text-2xl mt-0.5 leading-none">"</span>
                <div>
                  <p className="text-white/85 text-sm font-medium italic leading-relaxed">{quote.quote}"</p>
                  <p className="text-white/50 text-[10px] font-bold mt-1 uppercase tracking-wider">— {quote.author}</p>
                </div>
              </motion.div>

              {/* Typing motivation */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-2 pt-1">
                <div className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                  <TypingText phrases={[
                    "Today you level up! 🚀",
                    "Study hard. Play smart. 🎯",
                    "Your future self thanks you 💪",
                    "Champions are made in moments like this ✨",
                    `${streak > 0 ? `${streak}-day streak! Keep it burning 🔥` : 'Start your streak today! 🔥'}`,
                  ]} />
                </div>
              </motion.div>
            </div>

            {/* XP + Streak badges */}
            <div className="flex md:flex-col gap-3 shrink-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center">
                  <Flame size={22} className="text-amber-300 fill-amber-300" />
                </div>
                <div>
                  <div className="text-white font-black text-lg leading-none">{streak}</div>
                  <div className="text-white/60 text-[9px] uppercase tracking-widest font-bold">Day Streak</div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                  <Zap size={22} className="text-yellow-300 fill-yellow-300" />
                </div>
                <div>
                  <div className="text-white font-black text-lg leading-none">{xp.toLocaleString()}</div>
                  <div className="text-white/60 text-[9px] uppercase tracking-widest font-bold">Total XP</div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* XP Progress bar */}
          <div className="relative z-10 mt-6 pt-5 border-t border-white/15">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-[10px] uppercase tracking-widest font-bold">{isProspect ? 'Level 0 · Prospect' : `Level ${level}`}</span>
                {!isProspect && <span className="text-white/90 text-xs font-black">· {levelTitle}</span>}
              </div>
              <span className="text-white/80 text-[10px] font-bold">{progressPercent}% · {(nextMilestone - xp).toLocaleString()} XP to next level</span>
            </div>
            <div className="h-3 rounded-full bg-white/15 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                className="h-full rounded-full relative overflow-hidden"
                style={{ background: 'linear-gradient(90deg, #FCD34D, #FBBF24, #F59E0B)' }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse" />
              </motion.div>
            </div>
            <div className="flex justify-between text-white/40 text-[9px] mt-1 font-bold uppercase tracking-widest">
              <span>Rank #{lData?.studentRank || '?'}</span>
              <span>Next: Level {level + 1}{!isProspect ? ` · ${LEVEL_THRESHOLDS[level]?.title ?? ''}` : ' · Brave Adventurer'}</span>
            </div>
          </div>
        </div>

        {/* === EVENT BANNERS === */}
        <div className="space-y-3">
          <ExamEventBanner />
          <TuitionEventBanner />
        </div>

        {/* === STATS & EDUCATION ROW === */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Main Stats */}
          <div className="md:col-span-2 grid grid-cols-3 gap-3">
            {[
              { label: 'Tasks Done', value: sData?.tasks ?? 0, icon: '✅', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
              { label: 'Awards', value: sData?.awards ?? 0, icon: '🏅', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
              { label: 'Attendance', value: `${sData?.attendance ?? 98}%`, icon: '📊', color: 'var(--primary)', bg: 'rgba(0,0,0,0.04)' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-4 flex flex-col items-center text-center border relative overflow-hidden group hover:scale-[1.05] transition-all"
                style={{ background: s.bg, borderColor: `${s.color}20` }}
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-2xl mb-1">{s.icon}</span>
                <span className="text-xl font-black" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{s.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Word of the Day High-Impact Redesign */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="rounded-3xl p-6 border relative overflow-hidden group shadow-xl transition-all h-full flex flex-col justify-between"
            style={{ 
              background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Animated Shine Overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-[200%] h-full animate-shine" />
            </div>

            {kStatus === 'loading' ? (
              <div className="space-y-4 animate-pulse relative z-10">
                <div className="h-4 w-24 bg-white/10 rounded-full" />
                <div className="h-8 w-48 bg-white/20 rounded-xl" />
                <div className="h-16 w-full bg-white/5 rounded-2xl" />
              </div>
            ) : (
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 animate-float-mini">
                      <Lightbulb size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Word of the Day</span>
                  </div>
                  <Badge variant="secondary" className="text-[8px] border-indigo-500/30 text-indigo-300 font-black uppercase tracking-widest">{dailyWord.type}</Badge>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 leading-none">
                    {dailyWord.word}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-90 font-medium" style={{ color: 'var(--text)' }}>
                    “{dailyWord.def}”
                  </p>
                </div>
                
                <div className="pt-3 border-t border-white/10">
                  <p className="text-[10px] italic opacity-60 leading-relaxed" style={{ color: 'var(--text)' }}>
                    <span className="font-bold uppercase tracking-widest text-[8px] mr-1 opacity-40">EG:</span>
                    {dailyWord.ex || 'Use this word to level up your vocabulary today.'}
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Daily Fact Callout Redesign */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-6 border relative overflow-hidden group shadow-xl transition-all h-full flex flex-col justify-between"
            style={{ 
              background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.12))',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Sparkles size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Daily Fact</span>
              </div>
              
              {kStatus === 'loading' ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-full bg-white/10 rounded-full" />
                  <div className="h-4 w-3/4 bg-white/10 rounded-full" />
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed font-medium opacity-90" style={{ color: 'var(--text)' }}>
                  {dailyFact.text}
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* === MOTIVATION CARDS STRIP === */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: '🎯',
              title: 'Set Your Target',
              body: 'Define today\'s goal and crush it. One task at a time builds champions.',
              gradient: 'linear-gradient(135deg, var(--primary), var(--accent))',
              href: '/student/assignments',
              cta: 'Go to Quests',
            },
            {
              icon: '🧠',
              title: 'Deep Focus Now',
              body: `You've done ${sData?.tasks || 0} tasks already. Your brain is a muscle — keep training it.`,
              gradient: 'linear-gradient(135deg, var(--accent), var(--primary))',
              href: '/student/study',
              cta: 'Start Focus',
            },
            {
              icon: '🏆',
              title: streak >= 3 ? `${streak}-Day Legend!` : 'Build Your Streak',
              body: streak >= 3
                ? `You're on fire! Keep your ${streak}-day streak alive. Don't let it break now!`
                : 'Log in and study every day. Streaks multiply your XP rewards.',
              gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
              href: '/student/performance',
              cta: 'View Progress',
            },
          ].map((mc, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <Link href={mc.href}>
                <div
                  className="relative overflow-hidden rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all group"
                  style={{ background: mc.gradient }}
                >
                  <div className="absolute -top-6 -right-6 text-white/10 text-7xl font-black">{mc.icon}</div>
                  <div className="relative z-10">
                    <div className="text-2xl mb-2">{mc.icon}</div>
                    <h3 className="font-black text-white text-sm mb-1 leading-tight">{mc.title}</h3>
                    <p className="text-white/70 text-[10px] leading-relaxed mb-3">{mc.body}</p>
                    <div className="inline-flex items-center gap-1 text-white text-[10px] font-black uppercase tracking-wider bg-white/15 hover:bg-white/25 transition-all px-3 py-1.5 rounded-xl">
                      {mc.cta} <ChevronRight size={10} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* === MAIN CONTENT: Quests + Sidebar === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Active Quests */}
          <div className="lg:col-span-2 space-y-4">
            <SectionErrorBoundary title="Quests">
              {qStatus === 'loading' ? (
                <SkeletonQuest />
              ) : qStatus === 'error' || qStatus === 'timeout' ? (
                <ErrorState onRetry={qRefetch} message="Failed to load quests. The mission is still active, retry below." />
              ) : !qData || qData.length === 0 ? (
                <EmptyState 
                  title="All Caught Up, Legend!" 
                  description="No pending quests. Your teacher is probably brewing something powerful. Meanwhile, start a Focus session!"
                  icon={<div className="text-5xl">🎉</div>}
                  action={{ label: "🧠 Start Focus Session", onClick: () => window.location.href = "/student/study" }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {qData.map((q: any, i: number) => {
                    const colors = [
                      { icon: 'from-indigo-500 to-blue-600', badge: 'var(--primary)' },
                      { icon: 'from-rose-500 to-pink-600', badge: '#F43F5E' },
                      { icon: 'from-emerald-500 to-teal-600', badge: '#10B981' },
                    ]
                    const c = colors[i % colors.length]
                    return (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <Link href={`/student/assignments/${q.id}`}>
                          <div
                            className="group relative overflow-hidden rounded-2xl p-5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all border"
                            style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-all" style={{ background: c.badge }} />
                            <div className="flex items-start justify-between mb-3">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.icon} flex items-center justify-center text-white shadow-lg`}>
                                <Award size={18} />
                              </div>
                              <span className="text-[9px] font-black px-2 py-1 rounded-lg text-white uppercase tracking-wider" style={{ background: c.badge }}>
                                {q.subject?.name || 'Quest'}
                              </span>
                            </div>
                            <h3 className="font-black text-sm mb-1 leading-tight line-clamp-2" style={{ color: 'var(--text)' }}>{q.title}</h3>
                            <p className="text-[10px] leading-relaxed line-clamp-2 mb-4" style={{ color: 'var(--text-muted)' }}>
                              {q.description || 'Complete this quest and earn XP to level up!'}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-[10px] font-black text-amber-400">
                                <Zap size={11} className="fill-amber-400" /> +20 XP Reward
                              </div>
                              <span className="text-[10px] font-black text-primary flex items-center gap-0.5">
                                Enter Quest <ChevronRight size={10} />
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </SectionErrorBoundary>

            {/* Quick Action Grid */}
            <div>
              <h2 className="text-lg font-black flex items-center gap-2 mb-3" style={{ color: 'var(--text)' }}>
                <Rocket size={18} className="text-primary" /> Your Mission Control
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { emoji: '📝', label: 'Assignments', href: '/student/assignments', color: 'var(--primary)' },
                  { emoji: '⚡', label: 'Quizzes', href: '/student/quizzes', color: '#F59E0B' },
                  { emoji: '🏆', label: 'Trivia', href: '/student/trivia', color: '#EF4444' },
                  { emoji: '📚', label: 'Resources', href: '/student/resources', color: '#10B981' },
                  { emoji: '🎯', label: 'Focus Timer', href: '/student/study', color: 'var(--accent)' },
                  { emoji: '📅', label: 'Schedule', href: '/student/schedule', color: '#0EA5E9' },
                  { emoji: '🥇', label: 'My Progress', href: '/student/performance', color: '#F97316' },
                  { emoji: '🎖️', label: 'Awards', href: '/student/awards', color: '#FBBF24' },
                ].map((action, i) => (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300 }}
                  >
                    <Link href={action.href}>
                      <div
                        className="group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer hover:scale-105 active:scale-95 transition-all"
                        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110 group-hover:rotate-3"
                          style={{ background: `${action.color}15` }}
                        >
                          {action.emoji}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight" style={{ color: 'var(--text-muted)' }}>
                          {action.label}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-5">
            {/* Timetable */}
            <TimetableWidget role="student" />

            {/* Leaderboard Redesign */}
            <SectionErrorBoundary title="Leaderboard">
              <div
                className="relative overflow-hidden rounded-3xl p-6 cursor-pointer hover:scale-[1.01] transition-all border group"
                style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                onClick={() => setShowFullLeaderboard(true)}
              >
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: 'var(--primary)' }} />
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-black text-base flex items-center gap-2" style={{ color: 'var(--text)' }}>
                      🏆 Hall of Fame
                    </h3>
                    <p className="text-[10px] font-bold opacity-50" style={{ color: 'var(--text-muted)' }}>Top scholars this week</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:translate-x-1">
                    <ChevronRight size={18} />
                  </div>
                </div>

                {lStatus === 'loading' ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* PODIUM */}
                    <div className="flex items-end justify-center gap-2 pt-4 pb-2">
                      {[1, 0, 2].map((idx) => {
                        const entry = lData?.entries[idx]
                        if (!entry) return null
                        const heights = ['h-24', 'h-28', 'h-20']
                        const medals = ['🥈', '🥇', '🥉']
                        const colors = ['bg-slate-400', 'bg-amber-400', 'bg-amber-700']
                        
                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
                            <div className="relative">
                              <Avatar url={entry.avatar_url} name={entry.full_name} size={idx === 0 ? 'lg' : 'md'} className="border-4 border-card" />
                              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${colors[idx]} flex items-center justify-center text-[10px] font-bold text-white border-2 border-card`}>
                                {idx + 1}
                              </div>
                            </div>
                            <div className={`${heights[idx]} w-full rounded-t-xl opacity-20 flex flex-col items-center justify-center px-1 text-center`} style={{ background: 'var(--primary)' }}>
                              <span className="text-[7px] font-black truncate w-full" style={{ color: 'var(--text)' }}>{entry.full_name.split(' ')[0]}</span>
                              <span className="text-[8px] font-black text-primary">{entry.xp}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* YOUR RANK STACKED BAR */}
                    {lData?.studentRank && (
                      <div className="relative p-4 rounded-2xl overflow-hidden border border-primary/20 bg-primary/5">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/10 rounded-bl-full flex items-center justify-center text-lg">⭐</div>
                        <div className="flex items-center gap-4">
                          <div className="text-3xl font-black text-primary italic">#{lData.studentRank}</div>
                          <div>
                            <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>Your Global Rank</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Next award at rank #10</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SectionErrorBoundary>

            {/* Peak Library Hub */}
            <Link href="/student/library">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl p-5 border relative overflow-hidden group bg-gradient-to-br from-rose-500/5 to-orange-500/5 cursor-pointer"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <div className="absolute top-0 right-0 text-rose-500/10 text-6xl rotate-12 transition-transform group-hover:rotate-0">
                  <BookOpen size={64} />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                      <LibraryIcon size={16} className="text-rose-400" /> Peak Library
                    </h3>
                    <Badge variant="primary" className="text-[8px] tracking-widest bg-rose-500/10 text-rose-500 border-none">NEW HUB</Badge>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 mb-3 group-hover:bg-rose-500/5 transition-colors">
                    <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-0.5">Mindset & Growth</p>
                    <h4 className="text-xs font-black uppercase" style={{ color: 'var(--text)' }}>Start Your Next Chapter</h4>
                    <p className="text-[10px] opacity-60 mt-1" style={{ color: 'var(--text-muted)' }}>Earn 200+ XP per book reflection.</p>
                  </div>
                  <Button variant="outline" className="w-full text-[10px] h-8 gap-2 bg-transparent hover:bg-rose-500/10 border-rose-500/20 text-rose-500 transition-all pointer-events-none">
                    Enter Library <ArrowRight size={12} />
                  </Button>
                </div>
              </motion.div>
            </Link>

            {/* Recent Intel */}
            <SectionErrorBoundary title="Intel">
              <div className="space-y-4">
                <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <MessageSquare size={15} className="text-secondary" /> Latest Intel
                </h3>
                
                {iStatus === 'loading' ? (
                  <SkeletonIntel />
                ) : iStatus === 'error' || iStatus === 'timeout' ? (
                  <div className="p-4 rounded-xl bg-card border border-rose-500/20 text-center">
                    <p className="text-[10px] text-muted mb-2">Intel feed offline</p>
                    <button onClick={iRefetch} className="px-3 py-1 rounded-lg bg-input text-[10px] font-bold">Retry</button>
                  </div>
                ) : !iData || iData.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-card border border-dashed border-card-border">
                    <p className="text-[10px] text-muted">No new intel for you.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {iData.map((n: any) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 rounded-xl flex gap-3 border cursor-pointer hover:scale-[1.03] hover:shadow-lg transition-all group active:scale-95"
                        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                        onClick={() => setSelectedIntel(n)}
                      >
                        <div className="w-1.5 rounded-full shrink-0 group-hover:scale-y-110 transition-transform" style={{
                          background: n.type === 'award' ? '#10B981' : n.type === 'assignment_returned' ? '#F59E0B' : '#3B82F6',
                          minHeight: '24px'
                        }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[10px] font-black leading-tight" style={{ color: 'var(--text)' }}>{n.title}</p>
                            <ChevronRight size={10} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-[9px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{n.body}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </SectionErrorBoundary>

            {/* Transcript CTA */}
            <Link href="/student/transcripts">
              <div className="relative overflow-hidden rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all group">
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }} />
                <div className="absolute top-0 right-0 text-white/10 text-[80px] font-black leading-none">📜</div>
                <div className="relative z-10">
                  <div className="text-2xl mb-2">📜</div>
                  <h4 className="font-black text-sm text-white">Academic Transcript</h4>
                  <p className="text-white/60 text-[10px] mt-1">View your full academic history and certificates</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-white bg-white/15 px-3 py-1.5 rounded-xl">
                    Open Transcript <ChevronRight size={10} />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* === HALL OF FAME MODAL === */}
      <Modal isOpen={showFullLeaderboard} onClose={() => setShowFullLeaderboard(false)} title="Peak Authority Leaderboard 🏆" size="lg">
        <div className="space-y-6 py-2 pb-6">
          <div className="flex items-center justify-between p-6 rounded-3xl border relative overflow-hidden" style={{ background: 'color-mix(in oklch, var(--primary) 8%, transparent)', borderColor: 'color-mix(in oklch, var(--primary) 20%, transparent)' }}>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-inner" style={{ background: 'var(--primary)' }}>
                #{lData?.studentRank || '?'}
              </div>
              <div>
                <div className="font-black text-xl" style={{ color: 'var(--text)' }}>Your Standing</div>
                <div className="text-xs font-black text-primary uppercase tracking-widest">{xp.toLocaleString()} XP Earned</div>
              </div>
            </div>
            <Badge variant="primary" className="font-black">Level {level || 1}</Badge>
          </div>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {lData?.entries.map((entry: any, i: number) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${entry.full_name === profile?.full_name ? 'border-primary/30' : 'border-transparent hover:border-white/5'}`} style={{ background: entry.full_name === profile?.full_name ? 'color-mix(in oklch, var(--primary) 8%, transparent)' : 'var(--bg)' }}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow ${
                    i === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-white' :
                    i === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-white' :
                    i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                    'bg-white/5 text-[var(--text-muted)]'
                  }`}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                  </div>
                  <Avatar url={entry.avatar_url} name={entry.full_name} size="md" />
                  <div>
                    <div className="text-sm font-black" style={{ color: entry.full_name === profile?.full_name ? 'var(--primary)' : 'var(--text)' }}>
                      {entry.full_name}
                    </div>
                    <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {entry.class?.name || 'Scholar'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-primary">{entry.xp?.toLocaleString()}</div>
                  <div className="text-[9px] font-bold text-muted uppercase tracking-widest opacity-60">XP</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-center italic" style={{ color: 'var(--text-muted)' }}>Leaderboard updates as you earn XP from quests, focus sessions and trivia.</p>
        </div>
      </Modal>
      {/* ── PEAK AI ASSISTANT ── */}
      <PeakAIAssistant />
      <InsightTrigger />
    </div>
  )
}
