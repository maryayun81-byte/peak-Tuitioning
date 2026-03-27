'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, Award, Star, Zap, 
  Calendar, CheckCircle2, ChevronRight,
  Shield, Medal, Target, Rocket, Timer,
  Crown, Sparkles
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SkeletonDashboard } from '@/components/ui/Skeleton'

const BADGE_CONFIG: Record<string, { label: string; icon: any; color: string; description: string }> = {
  'map_master': {
    label: 'Roadmap Master',
    icon: <Trophy size={32} />,
    color: 'from-amber-400 to-orange-500',
    description: 'Completed every level in a study roadmap without skipping a single day.'
  },
  'weekly_mastery': { 
    label: 'Consistency King', 
    icon: <Target size={32} />, 
    color: 'from-blue-400 to-indigo-600',
    description: 'Studied consistently across an entire study plan.'
  },
  'consistency_king': { 
    label: 'Consistency King', 
    icon: <Target size={32} />, 
    color: 'from-blue-400 to-indigo-600',
    description: 'Studied for 7 days in a row with zero distractions.'
  },
  'early_bird': { 
    label: 'Early Bird', 
    icon: <Rocket size={32} />, 
    color: 'from-emerald-400 to-teal-600',
    description: 'Started a focus session before 7:00 AM.'
  },
  'level_1_pioneer': {
    label: 'L1 Pioneer',
    icon: <Trophy size={32} />,
    color: 'from-amber-400 to-orange-500',
    description: 'The first legendary student to reach Level 1 (1000 XP).'
  },
  'level_1_conqueror': {
    label: 'Level 1 Hero',
    icon: <Award size={32} />,
    color: 'from-indigo-400 to-purple-600',
    description: 'Reached the 1000 XP milestone and mastered Level 1.'
  },
  'level_2_pioneer': {
    label: 'L2 Pioneer',
    icon: <Sparkles size={32} />,
    color: 'from-amber-400 to-orange-500',
    description: 'The first to reach Level 2 (1800 XP).'
  },
  'level_5_pioneer': {
    label: 'Ultimate Pioneer',
    icon: <Crown size={32} />,
    color: 'from-amber-400 to-orange-500',
    description: 'The first to reach the ultimate peak of 4000 XP.'
  },
  'trivia_champion': {
    label: 'Trivia Titan',
    icon: <Trophy size={32} />,
    color: 'from-amber-400 to-yellow-600',
    description: 'Led your squad to a #1 victory in an official trivia quest.'
  },
  'quick_draw': {
    label: 'Quick Draw',
    icon: <Timer size={32} />,
    color: 'from-emerald-400 to-cyan-500',
    description: 'Awarded for having the fastest average response time in a trivia session.'
  },
  'streak_master': {
    label: 'Streak Master',
    icon: <Zap size={32} />,
    color: 'from-orange-400 to-rose-500',
    description: 'Maintained a massive 5+ question streak during a trivia mission.'
  }
}

// All available badges students can earn
const ALL_BADGE_TYPES = [
  'map_master', 'weekly_mastery', 'consistency_king', 'early_bird',
  'level_1_pioneer', 'level_1_conqueror', 'level_2_pioneer', 'level_5_pioneer',
  'trivia_champion', 'quick_draw', 'streak_master'
]

export default function AwardsPage() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [badges, setBadges] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'badges' | 'certificates'>('badges')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (student) loadAwards()
  }, [student])

  const loadAwards = async () => {
    if (!student) return
    setLoading(true)
    try {
      // 1. Fetch Badges
      const { data: bData } = await supabase
        .from('study_badges')
        .select('*')
        .eq('student_id', student.id)
        .order('achieved_at', { ascending: false })
      
      setBadges(bData || [])

      // 2. Fetch Certificates (joined with event title)
      const { data: cData } = await supabase
        .from('certificates')
        .select('*, event:tuition_events(title)')
        .eq('student_id', student.id)
        .order('generated_at', { ascending: false })
      
      setCertificates(cData || [])
    } catch (err) {
      console.error('Error loading awards:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 md:p-12 space-y-12 max-w-7xl mx-auto">
      {/* Premium Header */}
      <div className="relative p-10 rounded-[3rem] bg-slate-900 overflow-hidden shadow-2xl">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--primary),transparent)] opacity-20" />
         <div className="absolute -bottom-1/4 -left-1/4 w-full h-full bg-primary/20 blur-[120px] rounded-full" />
         
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left space-y-4">
               <Badge variant="primary" className="px-4 py-1.5 rounded-full bg-white/10 text-white border-white/20 uppercase tracking-widest text-[10px] font-black">
                  Student Hall of Fame
               </Badge>
               <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
                  Your Achievements
               </h1>
               <p className="text-white/60 text-sm md:text-lg max-w-md font-medium">
                  Every mission completed and every goal reached is recorded here. Wear your badges with pride! 🏆
               </p>
            </div>

            <div className="flex items-center gap-6">
               <div className="text-center space-y-1">
                  <div className="text-5xl font-black text-white">{badges.length}</div>
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Badges</div>
               </div>
               <div className="w-px h-12 bg-white/10" />
               <div className="text-center space-y-1">
                  <div className="text-5xl font-black text-white">{certificates.length}</div>
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Certificates</div>
               </div>
            </div>
         </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-center gap-4">
         <button 
           onClick={() => setActiveTab('badges')}
           className={`px-8 py-4 rounded-[2rem] font-black text-sm transition-all flex items-center gap-3 ${activeTab === 'badges' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
         >
            <Medal size={20} /> BADGES
         </button>
         <button 
           onClick={() => setActiveTab('certificates')}
           className={`px-8 py-4 rounded-[2rem] font-black text-sm transition-all flex items-center gap-3 ${activeTab === 'certificates' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
         >
            <Award size={20} /> CERTIFICATES
         </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'badges' ? (
          <motion.div 
            key="badges"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {badges.length === 0 && !showAll && (
              <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                 <Trophy size={48} className="mx-auto text-slate-200" />
                 <p className="font-bold text-slate-400">No badges earned yet. Complete your first study plan to win!</p>
                 <button onClick={() => setShowAll(true)} className="px-6 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest">
                   👀 See All Earnable Badges
                 </button>
              </div>
            )}
            {/* Toggle button */}
            {badges.length > 0 && (
              <div className="col-span-full flex justify-end">
                <button 
                  onClick={() => setShowAll(prev => !prev)}
                  className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  {showAll ? 'Show Earned Only' : `Show All (${ALL_BADGE_TYPES.length})`}
                </button>
              </div>
            )}
            {/* Render earned or all badges */}
            {(showAll ? ALL_BADGE_TYPES : (badges.length > 0 ? badges.map((b: any) => b.badge_type) : [])).map((badgeType: string, i: number) => {
              const badge = badges.find((b: any) => b.badge_type === badgeType)
              const isEarned = !!badge
              const config = BADGE_CONFIG[badgeType] || { 
                label: badgeType, 
                icon: <Zap size={32} />, 
                color: 'from-slate-400 to-slate-600',
                description: 'A special achievement awarded for your dedication.'
              }
              return (
                <motion.div 
                  key={badgeType}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                   <Card className={`p-8 h-full rounded-[3rem] border-none bg-white shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden ${!isEarned ? 'opacity-40 grayscale' : ''}`}>
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${config.color} opacity-[0.03] group-hover:opacity-[0.05] transition-opacity -mr-16 -mt-16 rounded-full`} />
                      
                      <div className="space-y-6 relative z-10">
                         <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-lg`}>
                            {config.icon}
                         </div>
                         
                         <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{config.label}</h3>
                            <p className="text-slate-500 text-xs font-medium leading-relaxed">{config.description}</p>
                         </div>

                         <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                               {isEarned ? `Achieved ${new Date(badge!.achieved_at).toLocaleDateString()}` : 'Not Yet Earned'}
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isEarned ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-300'}`}>
                               {isEarned ? <CheckCircle2 size={16} /> : <Star size={16} />}
                            </div>
                         </div>
                      </div>
                   </Card>
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="certs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {certificates.length === 0 && (
              <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                 <Shield size={48} className="mx-auto text-slate-200" />
                 <p className="font-bold text-slate-400">Attend more webinars and events to earn official certificates.</p>
              </div>
            )}
            {certificates.map((cert, i) => (
              <motion.div 
                key={cert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                 <Card className="p-6 md:p-8 rounded-[2.5rem] border-none bg-white shadow-lg hover:shadow-xl transition-all flex flex-col md:flex-row items-center gap-8 group">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary">
                       <Award size={40} />
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-1">
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{cert.event?.title || 'Academic Achievement'}</h3>
                       <p className="text-slate-500 text-sm font-medium">Official certification with {cert.attendance_percentage}% excellence score.</p>
                       <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                          <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1"><Calendar size={12} /> {new Date(cert.generated_at).toDateString()}</span>
                          <span className="text-[10px] font-extrabold text-emerald-500 flex items-center gap-1"><Shield size={12} /> VERIFIED BY PEAK</span>
                       </div>
                    </div>

                    <button className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-primary transition-colors shadow-lg shadow-slate-900/10">
                       DOWNLOAD PDF
                    </button>
                 </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
