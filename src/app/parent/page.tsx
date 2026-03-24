'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, GraduationCap, ClipboardList,
  TrendingUp, Award, Bell,
  ArrowRight, Download, CheckCircle2,
  AlertCircle, Wallet, Calendar, Users,
  Sparkles, Zap, BookOpen, ExternalLink, Search, Filter,
  ShieldCheck, ChevronRight, Bookmark, Star,
  BarChart3, Clock, Target, Flame, ArrowUpRight, Trophy as TrophyIcon
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { OnboardingModal, type OnboardingStep } from '@/components/ui/OnboardingModal'

// ── Parent Onboarding Visuals ────────────────────────────────────────────
function ParentWelcomeVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <circle cx="100" cy="55" r="32" fill="white" fillOpacity="0.25"/>
      <circle cx="100" cy="55" r="22" fill="white" fillOpacity="0.35"/>
      <circle cx="100" cy="50" r="12" fill="white" fillOpacity="0.7"/>
      <path d="M70 100 Q100 78 130 100" stroke="white" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <circle cx="52" cy="62" r="18" fill="white" fillOpacity="0.15"/>
      <circle cx="52" cy="57" r="9" fill="white" fillOpacity="0.4"/>
      <path d="M34 95 Q52 78 70 95" stroke="white" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <circle cx="148" cy="62" r="18" fill="white" fillOpacity="0.15"/>
      <circle cx="148" cy="57" r="9" fill="white" fillOpacity="0.4"/>
      <path d="M130 95 Q148 78 166 95" stroke="white" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {[[20,20],[175,18],[185,100],[18,108]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} fill="white" fillOpacity={0.3+i*0.1}/>
      ))}
    </svg>
  )
}
function ParentTranscriptVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <rect x="45" y="10" width="110" height="110" rx="14" fill="white" fillOpacity="0.2"/>
      <rect x="45" y="10" width="110" height="28" rx="14" fill="white" fillOpacity="0.3"/>
      <rect x="57" y="20" width="60" height="8" rx="4" fill="white" fillOpacity="0.7"/>
      <rect x="57" y="48" width="86" height="7" rx="3.5" fill="white" fillOpacity="0.45"/>
      <rect x="57" y="60" width="70" height="7" rx="3.5" fill="white" fillOpacity="0.35"/>
      <rect x="57" y="72" width="80" height="7" rx="3.5" fill="white" fillOpacity="0.35"/>
      <rect x="57" y="84" width="55" height="7" rx="3.5" fill="white" fillOpacity="0.25"/>
      <circle cx="145" cy="100" r="14" fill="#10B981" fillOpacity="0.8"/>
      <path d="M139 100 L143 104 L151 96" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="57" y="100" width="35" height="7" rx="3.5" fill="white" fillOpacity="0.2"/>
    </svg>
  )
}
function ParentStudyVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <rect x="20" y="20" width="160" height="90" rx="14" fill="white" fillOpacity="0.12"/>
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x="32" y={35 + i*26} width="100" height="14" rx="7" fill="white" fillOpacity="0.12"/>
          <rect x="32" y={35 + i*26} width={60 + i*20} height="14" rx="7" fill="white" fillOpacity={0.35 + i*0.09}/>
          <circle cx="162" cy={42 + i*26} r="8" fill="white" fillOpacity={0.25 + i*0.08}/>
          <text x="162" y={47 + i*26} textAnchor="middle" fontSize="9" fill="white" opacity="0.8">{["A","B+","A-"][i]}</text>
        </g>
      ))}
      <rect x="20" y="10" width="70" height="14" rx="7" fill="white" fillOpacity="0.35"/>
      <rect x="96" y="10" width="50" height="14" rx="7" fill="white" fillOpacity="0.2"/>
    </svg>
  )
}
function ParentAttendanceVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <rect x="20" y="15" width="160" height="100" rx="14" fill="white" fillOpacity="0.12"/>
      <rect x="20" y="15" width="160" height="28" rx="14" fill="white" fillOpacity="0.2"/>
      <rect x="32" y="22" width="50" height="10" rx="5" fill="white" fillOpacity="0.6"/>
      {[0,1,2,3,4].map(col => (
        [0,1,2,3].map(row => {
          const present = (col + row) % 5 !== 0
          return (
            <rect key={`${col}-${row}`}
              x={32 + col*28} y={52 + row*18} width="20" height="12" rx="4"
              fill={present ? "white" : "rgba(251,113,133,0.6)"}
              fillOpacity={present ? 0.35 : 0.8}
            />
          )
        })
      ))}
    </svg>
  )
}
function ParentPaymentVisual() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
      <rect x="20" y="28" width="160" height="90" rx="18" fill="white" fillOpacity="0.2"/>
      <rect x="20" y="28" width="160" height="40" rx="18" fill="white" fillOpacity="0.28"/>
      <rect x="35" y="42" width="36" height="12" rx="6" fill="white" fillOpacity="0.6"/>
      <rect x="80" y="44" width="20" height="8" rx="4" fill="white" fillOpacity="0.35"/>
      <circle cx="155" cy="48" r="10" fill="white" fillOpacity="0.3"/>
      <circle cx="163" cy="48" r="10" fill="#FBBF24" fillOpacity="0.7"/>
      <rect x="35" y="76" width="60" height="8" rx="4" fill="white" fillOpacity="0.4"/>
      <rect x="35" y="90" width="44" height="8" rx="4" fill="white" fillOpacity="0.25"/>
      <rect x="120" y="76" width="45" height="28" rx="8" fill="#10B981" fillOpacity="0.6"/>
      <rect x="128" y="83" width="29" height="7" rx="3.5" fill="white" fillOpacity="0.7"/>
    </svg>
  )
}

const PARENT_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome, Partner in Education!',
    subtitle: "Let's get you set up",
    description: "Your portal gives you real-time visibility into your child's academic life — from transcripts to attendance, study habits, and billing. Here's a quick walkthrough.",
    visual: <ParentWelcomeVisual />,
    accent: 'emerald',
  },
  {
    title: 'Academic Transcripts',
    subtitle: 'Certified records',
    description: "Go to Academics → Transcripts to view official report cards, grouped by tuition period. You can open any transcript for a detailed view and download it as a PDF.",
    visual: <ParentTranscriptVisual />,
    accent: 'indigo',
  },
  {
    title: 'Track Study Plans',
    subtitle: 'Independent learning',
    description: "Visit Academics → Study to see your child's study timetable, focus session history, goals progress, and weekly reflections — all in one live view.",
    visual: <ParentStudyVisual />,
    accent: 'violet',
  },
  {
    title: 'Attendance Insights',
    subtitle: 'Never miss a pattern',
    description: "The Attendance page shows daily presence records, period-by-period trends, and a summary of sessions attended vs. missed — with behavioural insights.",
    visual: <ParentAttendanceVisual />,
    accent: 'sky',
  },
  {
    title: 'Billing & Payments',
    subtitle: 'Stay on top of fees',
    description: "Head to Billing to view your payment history, outstanding balances, and upcoming fees. All transactions are logged and accessible at any time.",
    visual: <ParentPaymentVisual />,
    accent: 'amber',
  },
]

function TypingText({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [speed, setSpeed] = useState(150)

  useEffect(() => {
    const handleTyping = () => {
      const currentPhrase = phrases[index % phrases.length]
      
      if (isDeleting) {
        setDisplayText(currentPhrase.substring(0, displayText.length - 1))
        setSpeed(50)
      } else {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1))
        setSpeed(100)
      }

      if (!isDeleting && displayText === currentPhrase) {
        setTimeout(() => setIsDeleting(true), 2000)
      } else if (isDeleting && displayText === '') {
        setIsDeleting(false)
        setIndex((prev) => prev + 1)
      }
    }

    const timer = setTimeout(handleTyping, speed)
    return () => clearTimeout(timer)
  }, [displayText, isDeleting, index, phrases, speed])

  return (
    <span className="inline-block min-h-[1.2em] text-emerald-500">
      {displayText}
      <span className="ml-1 border-r-2 border-emerald-500 animate-pulse" />
    </span>
  )
}

export default function ParentDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent, selectedStudent, setSelectedStudent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  
  const [students, setStudents] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [latestTranscript, setLatestTranscript] = useState<any>(null)
  const [activeStudyPlan, setActiveStudyPlan] = useState<any>(null)
  const [studyProgress, setStudyProgress] = useState(0)
  const [showParentWelcome, setShowParentWelcome] = useState(false)
  
  const [stats, setStats] = useState({
    totalBalance: 0,
    avgAttendance: 0,
    meanGrade: 'N/A',
    notifications: 0,
    studyGrit: 'Stable'
  })

  useEffect(() => {
    // Session-level guard + Multi-flag check (Parent + Profile)
    // This provides multiple layers of protection against re-appearing modals.
    const sessionDismissed = sessionStorage.getItem('parent-onboarding-dismissed')
    
    const isActuallyOnboarded = parent?.onboarded === true || profile?.has_onboarded === true

    if (parent && !isActuallyOnboarded && !sessionDismissed) {
       setShowParentWelcome(true)
    }
  }, [parent?.onboarded, profile?.has_onboarded])

  const handleCloseParentWelcome = async () => {
    setShowParentWelcome(false)
    sessionStorage.setItem('parent-onboarding-dismissed', 'true')
    
    if (parent?.id && profile?.id) {
       // 1. Optimistic update of local store to prevent modal re-appearing 
       // during the current session / before the next full sync.
       useAuthStore.setState({ 
         parent: { ...parent, onboarded: true },
         profile: { ...profile, has_onboarded: true }
       })
       
       // 2. Update ALL parent profiles for this user to resolve duplicate record staleness
       const parentUpdate = supabase
         .from('parents')
         .update({ onboarded: true })
         .eq('user_id', profile.id)

       // 3. Update the global profile record as a master flag
       const profileUpdate = supabase
         .from('profiles')
         .update({ has_onboarded: true })
         .eq('id', profile.id)

       const results = await Promise.all([parentUpdate, profileUpdate])
       const error = results.find(r => r.error)?.error

       if (error) {
         console.error('[Dashboard] Onboarding sync failed:', error)
         toast.error('Sync failed, but modal is hidden for this session.')
       }
    }
  }

  useEffect(() => {
    if (profile && parent) loadDashboard()
  }, [profile, parent])

  useEffect(() => {
    if (selectedStudent?.id) {
       loadStudentSnapshots()
    }
  }, [selectedStudent])

  const loadDashboard = async () => {
    if (!parent?.id) {
       setLoading(false)
       return
    }
    
    setLoading(true)
    try {
      const { data: linkData } = await supabase
        .from('parent_student_links')
        .select(`
          student:students(
            *, 
            class:classes(name), 
            attendance(present, date),
            marks:exam_marks(marks)
          )
        `)
        .eq('parent_id', parent.id)
      
      const fetchedStudents = linkData?.map((l: any) => l.student).filter(Boolean) ?? []
      
      // If we have students, but none is selected (or selected one is not in the list anymore), 
      // set the first one as selected.
      if (fetchedStudents.length > 0) {
         setStudents(fetchedStudents)
         if (!selectedStudent || !fetchedStudents.find(s => s.id === selectedStudent.id)) {
            setSelectedStudent(fetchedStudents[0])
         }
      } else {
         setStudents([])
      }

      const [pRes, nRes] = await Promise.all([
        supabase.from('payments').select('*').limit(3).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', profile?.id).limit(4).order('created_at', { ascending: false })
      ])
      
      setRecentPayments(pRes.data ?? [])
      setNotifications(nRes.data ?? [])

      // Calculate aggregate stats across ALL students
      let totalAttRecords = 0
      let presentCount = 0
      let allMarks: number[] = []
      
      fetchedStudents.forEach(s => {
         const att = s.attendance || []
         totalAttRecords += att.length
         presentCount += att.filter((a: any) => a.present).length
         const m = s.marks?.map((mk: any) => mk.marks) || []
         allMarks = [...allMarks, ...m]
      })

      const avgAtt = totalAttRecords > 0 ? (presentCount / totalAttRecords) * 100 : 96
      const avgScore = allMarks.length > 0 ? allMarks.reduce((a, b) => a + b, 0) / allMarks.length : 85

      setStats({
         totalBalance: 0, 
         avgAttendance: avgAtt,
         meanGrade: getGrade(avgScore),
         notifications: nRes.data?.length || 0,
         studyGrit: avgAtt > 90 ? 'Mastery' : 'Stable'
      })
    } catch (err) {
      console.error('[ParentDashboard] Fatal load error:', err)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentSnapshots = async () => {
     if (!selectedStudent?.id) return
     
     try {
        const [tRes, sRes] = await Promise.all([
           supabase
             .from('transcripts')
             .select('*')
             .eq('student_id', selectedStudent.id)
             .eq('is_published', true)
             .order('published_at', { ascending: false })
             .limit(1)
             .maybeSingle(),
           supabase
             .from('study_plans')
             .select('*, sessions:study_sessions(status)')
             .eq('student_id', selectedStudent.id)
             .eq('is_active', true)
             .order('created_at', { ascending: false })
             .limit(1)
             .maybeSingle()
        ])

        setLatestTranscript(tRes.data)
        setActiveStudyPlan(sRes.data)
        
        if (sRes.data?.sessions) {
           const sessions = sRes.data.sessions
           const completed = sessions.filter((s: any) => s.status === 'completed').length
           setStudyProgress(sessions.length > 0 ? Math.round((completed / sessions.length) * 100) : 0)
        }
     } catch (err) {
        console.error('Error loading snapshots:', err)
     }
  }

  const getGrade = (score: number) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B+'
    if (score >= 60) return 'B'
    return 'C'
  }

  if (loading) return <SkeletonDashboard />

  if (students.length === 0) {
    return (
      <div className="p-4 sm:p-6 min-h-[85vh] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl p-8 sm:p-16 rounded-[3rem] border-2 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden text-center space-y-10"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
        >
          <div className="absolute top-0 right-0 w-80 h-80 rounded-bl-full -z-10 transition-transform hover:scale-110 duration-1000 opacity-10" style={{ background: 'var(--primary)' }} />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-tr-full -z-10 opacity-5" style={{ background: 'var(--primary)' }} />

          <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto text-white shadow-2xl shadow-emerald-500/30">
            <GraduationCap size={56} className="drop-shadow-lg" />
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight uppercase italic" style={{ color: 'var(--text)' }}>
              Empowering Your <br />
              <TypingText phrases={['Growth Journey', 'Parental Insight', 'Child\'s Success']} />
            </h2>
            <p className="text-sm sm:text-lg font-bold max-w-md mx-auto uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Welcome to the executive portal. Link your student to begin tracking real-time academic evolution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              { step: '01', text: 'Secure Admission ID', icon: <ShieldCheck size={18} /> },
              { step: '02', text: 'Retrieve Access PIN', icon: <Zap size={18} /> },
              { step: '03', text: 'Unlock Intelligence', icon: <BarChart3 size={18} /> },
            ].map((s) => (
              <div key={s.step} className="p-6 rounded-3xl border group transition-all duration-500 shadow-sm" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                   <div className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg">STEP {s.step}</div>
                   <div className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">{s.icon}</div>
                </div>
                <div className="text-xs font-black leading-tight uppercase tracking-tight" style={{ color: 'var(--text)' }}>{s.text}</div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Link href="/parent/link">
              <Button className="w-full sm:w-auto px-12 h-20 text-xl font-black rounded-3xl bg-slate-900 hover:bg-emerald-600 text-white shadow-2xl transition-all hover:scale-105 active:scale-95 group">
                LINK STUDENT NOW <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center justify-center gap-8 opacity-40" style={{ color: 'var(--text-muted)' }}>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><ShieldCheck size={12} /> Encrypted</div>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Clock size={12} /> 24/7 Monitoring</div>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Target size={12} /> Precision Tracking</div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Final safety check for selectedStudent
  if (!selectedStudent) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-10 pb-40">
      {/* ── First-login onboarding ── */}
      <AnimatePresence>
        {showParentWelcome && (
          <OnboardingModal
            isOpen={showParentWelcome}
            onClose={handleCloseParentWelcome}
            steps={PARENT_STEPS}
            finishLabel="Begin Supervision 🛡️"
          />
        )}
      </AnimatePresence>

      {/* Dynamic Greet Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
         <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 w-fit">
               <Star size={14} fill="currentColor" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Academic Executive</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
               Welcome, {profile?.full_name.split(' ')[0]}
            </h1>
            <p className="font-bold text-sm uppercase tracking-wide max-w-xl" style={{ color: 'var(--text-muted)' }}>
               Monitoring performance for <span className="text-indigo-600">{students.length} student{students.length > 1 ? 's' : ''}</span>. All systems optimized.
            </p>
         </div>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Attendance" 
          value={`${stats.avgAttendance.toFixed(1)}%`} 
          icon={<ClipboardList size={20} />} 
          change="+2.4%"
          changeType="up"
          className="border-none shadow-xl shadow-slate-200/5"
        />
        <StatCard 
          title="Mean Grade" 
          value={stats.meanGrade} 
          icon={<Target size={20} />} 
          className="border-none shadow-xl shadow-emerald-50/5"
        />
        <StatCard 
          title="Active Study" 
          value={stats.studyGrit} 
          icon={<Flame size={20} />} 
          className="border-none shadow-xl shadow-orange-50/5"
        />
        <StatCard 
          title="New Alerts" 
          value={stats.notifications} 
          icon={<Bell size={20} />} 
          className="border-none shadow-xl shadow-indigo-50/5"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         {/* Main Content (Left) */}
         <div className="lg:col-span-8 space-y-10">
            
            {/* Student Selector / Overview */}
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                     <Target size={16} /> Individual Perspectives
                  </h3>
                  <div className="flex items-center gap-2 p-1 rounded-2xl" style={{ background: 'var(--input)' }}>
                     {students.map(s => (
                        <button 
                          key={s.id}
                          onClick={() => setSelectedStudent(s)}
                          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStudent?.id === s.id ? 'bg-[var(--card)] text-emerald-600 shadow-md ring-1 ring-black/5' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                        >
                           {s.full_name.split(' ')[0]}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Selected Student Spotlight Card */}
               <Card className="relative overflow-hidden border-none shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] bg-slate-900 text-white p-8 sm:p-12 rounded-[3.5rem] group min-h-[320px] flex flex-col justify-between">
                  {/* Visual Background Elements */}
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-emerald-500/30 to-indigo-600/30 blur-3xl opacity-40 group-hover:scale-125 transition-transform duration-1000" />
                  <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-2xl" />
                  
                  <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-8">
                     <div className="space-y-6 max-w-md">
                        <div className="flex items-center gap-3">
                           <div className="w-16 h-16 rounded-[1.8rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black shadow-xl overflow-hidden">
                              {selectedStudent?.avatar_url ? (
                                <img src={selectedStudent.avatar_url} className="w-full h-full object-cover" />
                              ) : selectedStudent?.full_name[0]}
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Status</span>
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                              </div>
                              <h2 className="text-3xl font-black uppercase tracking-tight leading-none mt-1">{selectedStudent?.full_name}</h2>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Class Assignment</p>
                              <p className="text-sm font-black text-emerald-300 uppercase truncate">{selectedStudent?.class?.name || 'Pending'}</p>
                           </div>
                           <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">XP Progression</p>
                              <div className="flex items-center gap-1">
                                 <TrendingUp size={12} className="text-indigo-400" />
                                 <p className="text-sm font-black text-indigo-300">{selectedStudent?.xp || 0} Points</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col gap-3 w-full sm:w-auto mt-auto">
                        <Link href={`/parent/students/`} className="w-full">
                           <Button className="w-full h-14 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-xl gap-2">
                              Full Profile <ChevronRight size={16} />
                           </Button>
                        </Link>
                        <Link href={`/parent/academics/study`} className="w-full">
                           <Button variant="secondary" className="w-full h-14 bg-white/10 text-white border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 backdrop-blur-md gap-2">
                              Study Roadmap <ArrowRight size={16} />
                           </Button>
                        </Link>
                     </div>
                  </div>

                  <div className="relative z-10 pt-8 border-t border-white/10 mt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                     <div className="flex items-center gap-8">
                        <div>
                           <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 text-center sm:text-left">Attendance</p>
                           <p className="text-xl font-black text-white tracking-tight">{(selectedStudent.attendance?.length ?? 0) > 0 ? ((selectedStudent.attendance?.filter((a:any)=>a.present).length ?? 0) / (selectedStudent.attendance?.length ?? 1) * 100).toFixed(0) : 98}%</p>
                        </div>
                        <div className="w-px h-8 bg-white/10 hidden sm:block" />
                        <div>
                           <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 text-center sm:text-left">Mean Grade</p>
                           <p className="text-xl font-black text-emerald-400 tracking-tight">
                              {(selectedStudent.marks?.length ?? 0) > 0 ? getGrade((selectedStudent.marks?.reduce((a:any,b:any)=>a+b.marks,0) ?? 0) / (selectedStudent.marks?.length ?? 1)) : 'A-'}
                           </p>
                        </div>
                     </div>
                     <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] hidden md:block italic">Intelligence Stream Verified</p>
                  </div>
               </Card>
            </div>

            {/* Snapshots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Transcript Snapshot */}
               <Link href="/parent/academics/transcripts" className="block p-8 sm:p-10 rounded-[3rem] border shadow-sm hover:shadow-2xl hover:border-indigo-500/20 transition-all duration-700 relative overflow-hidden group" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-700" />
                   
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-10">
                      <div className="flex items-center gap-6">
                         <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-xl group-hover:rotate-6 transition-transform">
                            <GraduationCap size={32} />
                         </div>
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Verified Result</span>
                            </div>
                            <h4 className="text-2xl font-black uppercase tracking-tighter italic" style={{ color: 'var(--text)' }}>Latest Transcript</h4>
                         </div>
                      </div>
                      <Badge className="bg-[var(--input)] text-[var(--text-muted)] border-none font-black text-[10px] uppercase px-4 py-2 rounded-xl">
                         Season 2026
                      </Badge>
                   </div>
                   
                   {latestTranscript ? (
                     <div className="space-y-6">
                        <div className="flex justify-between items-end border-b pb-6" style={{ borderColor: 'var(--card-border)' }}>
                           <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Main Assessment</p>
                              <h5 className="text-xl font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>{latestTranscript.title}</h5>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Aggregate</p>
                              <p className="text-4xl font-black text-indigo-600 italic tracking-tighter leading-none">{latestTranscript.overall_grade}</p>
                           </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] pt-2 group-hover:text-indigo-600 transition-colors" style={{ color: 'var(--text-muted)' }}>
                           <span>Enter Full Dossier Control</span>
                           <ArrowUpRight size={18} />
                        </div>
                     </div>
                   ) : (
                      <div className="py-10 text-center space-y-4">
                         <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No published transcripts detected.</p>
                         <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Transcripts appear here after official academic board verification.</p>
                      </div>
                   )}
                </Link>

               {/* Study Roadmap Snapshot */}
               <Card className="group p-8 border-none shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden flex flex-col justify-between" style={{ background: 'var(--card)' }}>
                   <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                     <BookOpen size={80} style={{ color: 'var(--text)' }} />
                  </div>
                  <div>
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-6">Active Study Intelligence</h3>
                     {activeStudyPlan ? (
                        <div className="space-y-6">
                           <h4 className="text-xl font-black leading-tight uppercase line-clamp-1 italic" style={{ color: 'var(--text)' }}>{activeStudyPlan.name}</h4>
                           <div className="space-y-4">
                              <div className="flex justify-between items-end mb-2">
                                 <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Mastery Progress</span>
                                 <span className="text-sm font-black text-emerald-600">{studyProgress}%</span>
                              </div>
                              <div className="h-3 w-full rounded-full overflow-hidden p-0.5 border" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${studyProgress}%` }}
                                   className="h-full bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"
                                 />
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                 <Clock size={12} /> Ends {new Date(activeStudyPlan.end_date).toLocaleDateString()}
                              </div>
                           </div>
                        </div>
                     ) : (
                        <div className="py-10 text-center space-y-4">
                           <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                              <BookOpen size={24} />
                           </div>
                           <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No Active Roadmaps</p>
                        </div>
                     )}
                  </div>
                  <Link href="/parent/academics/study" className="mt-8">
                     <Button variant="secondary" className="w-full rounded-2xl h-14 bg-[var(--input)] border-none font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-md" style={{ color: 'var(--text)' }}>
                        ENTER LIVE JOURNEY <ArrowRight size={14} className="ml-2" />
                     </Button>
                  </Link>
               </Card>
            </div>
         </div>

         {/* Sidebar (Right) */}
         <div className="lg:col-span-4 space-y-10">
            {/* Real-time Ledger */}
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                   <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                     <CreditCard size={16} /> Financial Stream
                  </h3>
                  <Link href="/parent/billing" className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest">View All</Link>
               </div>
               <div className="space-y-4">
                  {recentPayments.length === 0 ? (
                     <div className="p-8 text-center rounded-3xl border-2 border-dashed" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No Recent Transactions</p>
                     </div>
                  ) : (
                     recentPayments.map((p, i) => (
                        <motion.div 
                          key={p.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center justify-between p-4 rounded-3xl border shadow-sm hover:border-emerald-500/20 transition-all"
                          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                        >
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-orange-500" style={{ background: 'var(--input)' }}>
                                 <CreditCard size={20} />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-xs font-black uppercase tracking-tight truncate" style={{ color: 'var(--text)' }}>Tuition Settlement</p>
                                 <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{formatDate(p.created_at, 'short')}</p>
                              </div>
                           </div>
                           <p className="text-sm font-black text-emerald-600">-{formatCurrency(p.amount)}</p>
                        </motion.div>
                     ))
                  )}
               </div>
            </div>

            {/* Notifications / Intelligence */}
            <div className="space-y-6">
               <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-2">
                     <Bell size={16} className="text-indigo-500" /> Intelligence Feed
                  </div>
                  {notifications.filter(n=>!n.read).length > 0 && <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />}
               </h3>
               <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center rounded-3xl" style={{ background: 'var(--input)' }}>
                       <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Clear Intelligence Stream</p>
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <Link href="/parent/notifications" key={n.id}>
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: i * 0.1 }}
                           className="p-5 border rounded-3xl hover:shadow-md transition-all group relative overflow-hidden"
                           style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                         >
                            <div className="flex gap-4 relative z-10">
                               <div className="p-3 rounded-2xl h-fit text-indigo-500" style={{ background: 'var(--input)' }}>
                                  {n.type === 'achievement' ? <TrophyIcon size={16} /> : n.type === 'alert' ? <AlertCircle size={16} /> : <Sparkles size={16} />}
                               </div>
                               <div className="min-w-0">
                                  <p className="text-[10px] font-black uppercase tracking-tight truncate" style={{ color: 'var(--text)' }}>{n.title}</p>
                                  <p className="text-[9px] mt-1 font-medium line-clamp-1 uppercase tracking-tight" style={{ color: 'var(--text-muted)' }}>{n.body}</p>
                                  <p className="text-[8px] mt-2 font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{formatDate(n.created_at, 'short')}</p>
                               </div>
                            </div>
                         </motion.div>
                      </Link>
                    ))
                  )}
               </div>
            </div>

            {/* Support Elite Card */}
            <Card className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white space-y-6 rounded-[3rem] relative overflow-hidden shadow-2xl shadow-indigo-500/30 border-none">
               <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
               <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md shadow-xl border border-white/20">
                  <ShieldCheck size={32} />
               </div>
               <div>
                  <h4 className="font-black text-sm uppercase tracking-[0.2em] mb-2 leading-tight">Executive Concierge</h4>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-relaxed">
                     Technical or academic support is available 24/7 for our premium parents.
                  </p>
               </div>
               <Button className="w-full h-14 bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl border-none">
                  INITIATE SECURE CHAT
               </Button>
            </Card>
         </div>
      </div>
    </div>
  )
}
