'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Map, Calendar, Check, Star, Trophy, Award, Medal, Shield, Target, Rocket, Zap, Lock } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { StudyPath } from '@/components/student/study/StudyPath'
import { Card } from '@/components/ui/Card'
import toast from 'react-hot-toast'

const BADGE_CONFIG: Record<string, { label: string; icon: any; color: string; description: string }> = {
  'map_master': {
    label: 'Roadmap Master',
    icon: <Trophy size={28} />,
    color: 'from-amber-400 to-orange-500',
    description: 'Completed every level in a study roadmap.',
  },
  'weekly_mastery': {
    label: 'Weekly Mastery',
    icon: <Target size={28} />,
    color: 'from-blue-400 to-indigo-600',
    description: 'Studied consistently across a study plan.',
  },
  'consistency_king': {
    label: 'Consistency King',
    icon: <Target size={28} />,
    color: 'from-blue-400 to-indigo-600',
    description: 'Studied for 7 days in a row.',
  },
  'early_bird': {
    label: 'Early Bird',
    icon: <Rocket size={28} />,
    color: 'from-emerald-400 to-teal-600',
    description: 'Started a focus session before 7:00 AM.',
  },
}

const ALL_BADGE_TYPES = Object.keys(BADGE_CONFIG)

export default function StudentProgressPage() {
  const { id } = useParams()
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'journey' | 'badges' | 'certificates'>('journey')
  const [showAllBadges, setShowAllBadges] = useState(false)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Student Details
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('full_name, id, xp')
          .eq('id', id)
          .single()
        if (studentError) throw studentError
        setStudent(studentData)

        // 2. Sessions
        const { data: sessionData, error: sessionError } = await supabase
          .from('study_sessions')
          .select('*, subject:subjects(name)')
          .eq('student_id', id)
          .order('date', { ascending: true })
        if (sessionError) throw sessionError
        setSessions(sessionData || [])

        // 3. Badges
        const { data: badgeData } = await supabase
          .from('study_badges')
          .select('*')
          .eq('student_id', id)
          .order('achieved_at', { ascending: false })
        setBadges(badgeData || [])

        // 4. Certificates
        const { data: certData } = await supabase
          .from('certificates')
          .select('*, event:tuition_events(title)')
          .eq('student_id', id)
          .order('generated_at', { ascending: false })
        setCertificates(certData || [])

      } catch (err: any) {
        console.error('Progress fetch error:', err)
        toast.error('Failed to load student progress')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Live Journey...</p>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: 'journey', label: 'Live Journey', icon: <Map size={16} /> },
    { id: 'badges', label: `Badges (${badges.length})`, icon: <Medal size={16} /> },
    { id: 'certificates', label: `Certs (${certificates.length})`, icon: <Award size={16} /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50/30 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-[100] border-b border-slate-100 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Progress</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                {student?.full_name?.split(' ')[0]}'s Journey
                <span className="p-1 px-3 bg-primary/10 text-primary rounded-xl text-[10px] not-italic">ELITE PATH</span>
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total XP</p>
                <p className="text-sm font-black text-amber-500 uppercase">{student?.xp || 0} XP</p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Zap size={20} className="fill-amber-400" />
             </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="max-w-5xl mx-auto mt-4 flex gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all
                ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8">
        {/* ── JOURNEY TAB ── */}
        {activeTab === 'journey' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative"
          >
            {sessions.length > 0 ? (
              <div className="relative">
                <div className="absolute top-8 left-8 right-8 z-50 flex justify-between items-start pointer-events-none">
                   <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-4">
                      <Map size={18} className="text-primary" />
                      <div className="flex flex-col">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Current View</span>
                         <span className="text-[10px] font-black uppercase">Interactive Roadmap</span>
                      </div>
                   </div>
                </div>
                <StudyPath sessions={sessions} readOnly={true} />
              </div>
            ) : (
              <div className="py-40 text-center space-y-6">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                  <Map size={48} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">No Roadmap Found</h2>
                  <p className="text-slate-500 font-medium max-w-xs mx-auto mt-2">
                    {student?.full_name} hasn't created a study roadmap yet.
                  </p>
                </div>
                <button 
                  onClick={() => router.back()}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
                >
                  Go Back
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── BADGES TAB ── */}
        {activeTab === 'badges' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Achievement Badges</h2>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">
                  {badges.length} earned · {ALL_BADGE_TYPES.length} total available
                </p>
              </div>
              <button 
                onClick={() => setShowAllBadges(p => !p)}
                className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                {showAllBadges ? 'Earned Only' : `All (${ALL_BADGE_TYPES.length})`}
              </button>
            </div>

            {badges.length === 0 && !showAllBadges && (
              <div className="py-20 text-center space-y-4 bg-white rounded-[3rem] shadow-lg border border-slate-100">
                <Trophy size={48} className="mx-auto text-slate-200" />
                <p className="font-bold text-slate-400">No badges earned yet.</p>
                <button onClick={() => setShowAllBadges(true)} className="px-6 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest">
                  👀 See All Earnable Badges
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(showAllBadges ? ALL_BADGE_TYPES : badges.map((b: any) => b.badge_type)).map((badgeType: string, i: number) => {
                const badge = badges.find((b: any) => b.badge_type === badgeType)
                const isEarned = !!badge
                const config = BADGE_CONFIG[badgeType] || { label: badgeType, icon: <Zap size={28} />, color: 'from-slate-400 to-slate-600', description: '' }
                return (
                  <motion.div key={badgeType} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}>
                    <Card className={`p-6 rounded-[2.5rem] border-none bg-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden ${!isEarned ? 'opacity-45 grayscale' : ''}`}>
                      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${config.color} opacity-5 -mr-8 -mt-8 rounded-full`} />
                      <div className="flex items-start gap-4 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight truncate">{config.label}</h3>
                          <p className="text-slate-400 text-[10px] font-medium mt-0.5 leading-relaxed line-clamp-2">{config.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            {isEarned ? (
                              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                ✓ {new Date(badge.achieved_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 bg-slate-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Lock size={8} /> Not yet earned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── CERTIFICATES TAB ── */}
        {activeTab === 'certificates' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Certificates</h2>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{certificates.length} certificates earned</p>
            </div>

            {certificates.length === 0 && (
              <div className="py-20 text-center space-y-4 bg-white rounded-[3rem] shadow-lg border border-slate-100">
                <Shield size={48} className="mx-auto text-slate-200" />
                <p className="font-bold text-slate-400">No certificates earned yet.</p>
              </div>
            )}

            <div className="space-y-4">
              {certificates.map((cert: any, i: number) => (
                <motion.div key={cert.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="p-6 rounded-[2.5rem] border-none bg-white shadow-lg hover:shadow-xl transition-all flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary flex-shrink-0">
                      <Award size={32} />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{cert.event?.title || 'Academic Achievement'}</h3>
                      <p className="text-slate-500 text-sm font-medium">{cert.attendance_percentage}% excellence score</p>
                      <div className="flex items-center justify-center sm:justify-start gap-4 pt-1">
                        <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1"><Calendar size={11} /> {new Date(cert.generated_at).toDateString()}</span>
                        <span className="text-[10px] font-extrabold text-emerald-500 flex items-center gap-1"><Shield size={11} /> VERIFIED BY PEAK</span>
                      </div>
                    </div>
                    <button className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-primary transition-colors shadow-lg">
                      Download PDF
                    </button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
