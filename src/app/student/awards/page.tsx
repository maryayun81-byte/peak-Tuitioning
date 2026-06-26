'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Crown,
  Download,
  Flag,
  Flame,
  Gem,
  GraduationCap,
  Lock,
  Medal,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/Card'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SkeletonDashboard } from '@/components/ui/Skeleton'

type AwardTab = 'badges' | 'certificates'

type BadgeConfig = {
  label: string
  Icon: LucideIcon
  gradient: string
  accent: string
  description: string
  lane: 'Mastery' | 'Consistency' | 'Leadership' | 'Speed'
}

const BADGE_CONFIG: Record<string, BadgeConfig> = {
  map_master: {
    label: 'Roadmap Master',
    Icon: Trophy,
    gradient: 'from-amber-300 via-orange-400 to-rose-500',
    accent: '#F59E0B',
    lane: 'Mastery',
    description: 'Completed every level in a study roadmap without skipping a day.',
  },
  weekly_mastery: {
    label: 'Weekly Mastery',
    Icon: Target,
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    accent: '#4F8CFF',
    lane: 'Consistency',
    description: 'Held a strong study rhythm across an entire study plan.',
  },
  consistency_king: {
    label: 'Consistency King',
    Icon: Flame,
    gradient: 'from-orange-300 via-amber-500 to-red-500',
    accent: '#F97316',
    lane: 'Consistency',
    description: 'Studied for seven days in a row with steady focus.',
  },
  early_bird: {
    label: 'Early Scholar',
    Icon: Rocket,
    gradient: 'from-emerald-300 via-teal-500 to-cyan-600',
    accent: '#10B981',
    lane: 'Consistency',
    description: 'Started a focused learning session before the day got busy.',
  },
  level_1_pioneer: {
    label: 'Level 1 Pioneer',
    Icon: Flag,
    gradient: 'from-yellow-300 via-amber-500 to-orange-600',
    accent: '#F59E0B',
    lane: 'Leadership',
    description: 'Reached the first major Peak XP milestone.',
  },
  level_1_conqueror: {
    label: 'Level 1 Hero',
    Icon: Shield,
    gradient: 'from-violet-400 via-indigo-500 to-blue-600',
    accent: '#8B5CF6',
    lane: 'Mastery',
    description: 'Crossed the 1000 XP milestone and kept climbing.',
  },
  level_2_pioneer: {
    label: 'Level 2 Pioneer',
    Icon: Sparkles,
    gradient: 'from-fuchsia-400 via-purple-500 to-indigo-600',
    accent: '#A855F7',
    lane: 'Leadership',
    description: 'Broke into the next tier of serious academic progress.',
  },
  level_5_pioneer: {
    label: 'Ultimate Pioneer',
    Icon: Crown,
    gradient: 'from-amber-200 via-yellow-400 to-orange-500',
    accent: '#EAB308',
    lane: 'Leadership',
    description: 'Reached the highest Peak XP tier available in the hall.',
  },
  trivia_champion: {
    label: 'Trivia Titan',
    Icon: GraduationCap,
    gradient: 'from-lime-300 via-emerald-500 to-teal-600',
    accent: '#22C55E',
    lane: 'Mastery',
    description: 'Led a squad to victory in an official trivia quest.',
  },
  quick_draw: {
    label: 'Quick Draw',
    Icon: Timer,
    gradient: 'from-cyan-300 via-sky-500 to-blue-600',
    accent: '#06B6D4',
    lane: 'Speed',
    description: 'Answered with sharp speed during a timed academic mission.',
  },
  streak_master: {
    label: 'Streak Master',
    Icon: Zap,
    gradient: 'from-rose-400 via-pink-500 to-violet-600',
    accent: '#F43F5E',
    lane: 'Speed',
    description: 'Built a powerful answer streak during a challenge.',
  },
}

const ALL_BADGE_TYPES = Object.keys(BADGE_CONFIG)

function formatAwardDate(value?: string) {
  if (!value) return 'Date pending'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date pending'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildFallbackConfig(type: string): BadgeConfig {
  return {
    label: type.replace(/_/g, ' '),
    Icon: Gem,
    gradient: 'from-slate-400 via-slate-500 to-slate-700',
    accent: '#64748B',
    lane: 'Mastery',
    description: 'A special achievement awarded for dedication and progress.',
  }
}

function StatTile({
  label,
  value,
  Icon,
  accent,
}: {
  label: string
  value: string | number
  Icon: LucideIcon
  accent: string
}) {
  return (
    <div className="rounded-lg border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p className="mt-2 text-3xl font-black leading-none" style={{ color: 'var(--text)' }}>
            {value}
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ background: `${accent}18`, color: accent }}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function BadgeMedallion({
  badgeType,
  badge,
  count,
  index,
}: {
  badgeType: string
  badge?: any
  count: number
  index: number
}) {
  const isEarned = Boolean(badge)
  const config = BADGE_CONFIG[badgeType] || buildFallbackConfig(badgeType)
  const Icon = config.Icon

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
      className="group relative min-h-[284px] overflow-hidden rounded-lg border"
      style={{
        background: isEarned
          ? 'linear-gradient(180deg, color-mix(in srgb, var(--card) 92%, white), var(--card))'
          : 'var(--card)',
        borderColor: isEarned ? `${config.accent}55` : 'var(--card-border)',
      }}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${config.gradient}`} />
      <div className="absolute inset-x-5 top-16 h-6 rounded-full bg-black/10 blur-xl opacity-30" />

      <div className="relative flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Badge variant={isEarned ? 'success' : 'muted'} className="rounded-md text-[9px] font-black uppercase tracking-[0.18em]">
            {isEarned ? 'Earned' : 'Locked'}
          </Badge>
          {count > 1 ? (
            <span className="rounded-md px-2 py-1 text-[10px] font-black" style={{ background: `${config.accent}18`, color: config.accent }}>
              x{count}
            </span>
          ) : null}
        </div>

        <div className="mt-6 flex justify-center">
          <div className="relative">
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient} blur-xl transition-opacity ${
                isEarned ? 'opacity-40 group-hover:opacity-60' : 'opacity-10'
              }`}
            />
            <div
              className={`relative flex h-24 w-24 items-center justify-center rounded-full border-[6px] bg-gradient-to-br ${config.gradient} text-white shadow-2xl ${
                isEarned ? '' : 'grayscale'
              }`}
              style={{ borderColor: isEarned ? 'rgba(255,255,255,0.55)' : 'var(--card-border)' }}
            >
              {isEarned ? <Icon size={42} strokeWidth={2.4} /> : <Lock size={34} strokeWidth={2.4} />}
            </div>
          </div>
        </div>

        <div className="mt-6 flex-1 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: config.accent }}>
            {config.lane}
          </p>
          <h3 className="mt-2 text-lg font-black uppercase leading-tight" style={{ color: 'var(--text)' }}>
            {config.label}
          </h3>
          <p className="mx-auto mt-3 max-w-[260px] text-xs font-medium leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {config.description}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
          <span className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
            {isEarned ? formatAwardDate(badge.achieved_at) : 'Awaiting mastery'}
          </span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: isEarned ? `${config.accent}18` : 'var(--input)', color: isEarned ? config.accent : 'var(--text-muted)' }}
          >
            {isEarned ? <CheckCircle2 size={17} /> : <Star size={17} />}
          </span>
        </div>
      </div>
    </motion.article>
  )
}

function TrophyCabinet({
  badges,
  showAll,
  onShowAll,
}: {
  badges: any[]
  showAll: boolean
  onShowAll: () => void
}) {
  const earnedByType = useMemo(() => {
    const map = new Map<string, { badge: any; count: number }>()
    badges.forEach((badge) => {
      const type = badge.badge_type || 'special_award'
      const existing = map.get(type)
      if (existing) {
        existing.count += 1
      } else {
        map.set(type, { badge, count: 1 })
      }
    })
    return map
  }, [badges])

  const displayTypes = showAll
    ? Array.from(new Set([...ALL_BADGE_TYPES, ...Array.from(earnedByType.keys())]))
    : Array.from(earnedByType.keys())

  if (displayTypes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <Trophy size={34} />
        </div>
        <h3 className="mt-5 text-lg font-black" style={{ color: 'var(--text)' }}>
          The cabinet is ready
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
          Earn badges from study plans, quizzes, duels, teacher awards, and consistency missions.
        </p>
        <button
          onClick={onShowAll}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20"
        >
          View earnable badges <ChevronRight size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
            Trophy Cabinet
          </p>
          <h2 className="mt-1 text-2xl font-black" style={{ color: 'var(--text)' }}>
            Medals, badges and mastery pieces
          </h2>
        </div>
        <button
          onClick={onShowAll}
          className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition-colors hover:bg-[var(--input)]"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text)' }}
        >
          {showAll ? 'Earned only' : 'Show locked slots'}
        </button>
      </div>

      <div className="relative rounded-lg border p-4 md:p-6" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="absolute inset-x-4 top-4 h-10 rounded-lg bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-emerald-500/10" />
        <div className="relative grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {displayTypes.map((badgeType, index) => {
            const earned = earnedByType.get(badgeType)
            return (
              <BadgeMedallion
                key={badgeType}
                badgeType={badgeType}
                badge={earned?.badge}
                count={earned?.count || 0}
                index={index}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CertificateGallery({ certificates }: { certificates: any[] }) {
  if (certificates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
          <Award size={34} />
        </div>
        <h3 className="mt-5 text-lg font-black" style={{ color: 'var(--text)' }}>
          Certificate gallery is empty
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
          Official certificates appear here after qualifying events, webinars, and verified academic programmes.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {certificates.map((cert, index) => (
        <motion.article
          key={cert.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="relative overflow-hidden rounded-lg border"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
        >
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sky-400 via-primary to-emerald-400" />
          <div className="p-6">
            <div className="flex items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Award size={29} />
                </div>
                <div className="min-w-0">
                  <Badge variant="info" className="rounded-md text-[9px] font-black uppercase tracking-[0.18em]">
                    Verified Certificate
                  </Badge>
                  <h3 className="mt-3 text-lg font-black leading-tight" style={{ color: 'var(--text)' }}>
                    {cert.event?.title || 'Academic Achievement'}
                  </h3>
                  <p className="mt-2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Excellence score: {Number(cert.attendance_percentage || 0).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="hidden rounded-lg border px-3 py-2 text-center sm:block" style={{ borderColor: 'var(--card-border)' }}>
                <p className="text-xl font-black text-primary">{Number(cert.attendance_percentage || 0).toFixed(0)}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                  Score
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--card-border)' }}>
              <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                <Calendar size={13} /> {formatAwardDate(cert.generated_at)}
              </span>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--input)] px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em]"
                style={{ color: 'var(--text)' }}
              >
                <Download size={14} /> Download
              </button>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  )
}

export default function AwardsPage() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [badges, setBadges] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<AwardTab>('badges')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (student) {
      loadAwards()
    }
  }, [student])

  const loadAwards = async () => {
    if (!student) return
    setLoading(true)
    try {
      const { data: bData } = await supabase
        .from('study_badges')
        .select('*')
        .eq('student_id', student.id)
        .order('achieved_at', { ascending: false })

      setBadges(bData || [])

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

  const earnedTypes = useMemo(() => new Set(badges.map((badge) => badge.badge_type)), [badges])
  const cabinetCompletion = Math.round((earnedTypes.size / Math.max(ALL_BADGE_TYPES.length, 1)) * 100)
  const latestBadge = badges[0]
  const latestConfig = latestBadge ? BADGE_CONFIG[latestBadge.badge_type] || buildFallbackConfig(latestBadge.badge_type) : null
  const LatestIcon = latestConfig?.Icon || Trophy

  if (loading) return <SkeletonDashboard />

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 pb-28 md:p-8">
      <section className="relative overflow-hidden rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-primary to-emerald-400" />
        <div className="absolute right-8 top-8 hidden h-40 w-40 rounded-full bg-amber-400/10 blur-3xl md:block" />
        <div className="absolute bottom-8 left-10 hidden h-32 w-32 rounded-full bg-primary/10 blur-3xl md:block" />

        <div className="relative grid gap-8 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8 lg:p-10">
          <div className="space-y-5">
            <Badge variant="primary" className="rounded-md px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">
              Student Awards Hall
            </Badge>
            <div>
              <h1 className="text-4xl font-black leading-none tracking-tight md:text-6xl" style={{ color: 'var(--text)' }}>
                Achievement Cabinet
              </h1>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 md:text-base" style={{ color: 'var(--text-muted)' }}>
                A polished record of badges, certificates, mastery milestones, and verified academic wins.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile label="Badges" value={badges.length} Icon={Medal} accent="#F59E0B" />
              <StatTile label="Certificates" value={certificates.length} Icon={Award} accent="#4F8CFF" />
              <StatTile label="Cabinet" value={`${cabinetCompletion}%`} Icon={BadgeCheck} accent="#10B981" />
            </div>
          </div>

          <div className="relative min-h-[300px] rounded-lg border p-5" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
            <div className="absolute inset-x-6 top-14 h-3 rounded-full bg-black/10 blur-md" />
            <div className="relative h-full rounded-lg border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
                  Featured Piece
                </span>
                <Sparkles size={17} className="text-amber-500" />
              </div>

              <div className="mt-8 flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-2xl" />
                  <div className={`relative flex h-28 w-28 items-center justify-center rounded-full border-[7px] bg-gradient-to-br ${latestConfig?.gradient || 'from-slate-400 to-slate-700'} text-white shadow-2xl`} style={{ borderColor: 'rgba(255,255,255,0.55)' }}>
                    <LatestIcon size={48} />
                  </div>
                </div>
                <h2 className="mt-6 text-2xl font-black uppercase leading-tight" style={{ color: 'var(--text)' }}>
                  {latestConfig?.label || 'First Badge Waiting'}
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                  {latestConfig?.description || 'Start completing missions and this showcase will light up with your strongest award.'}
                </p>
                <div className="mt-6 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                  <BookOpenCheck size={14} />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                    {latestBadge ? formatAwardDate(latestBadge.achieved_at) : 'Ready to unlock'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full rounded-lg border p-1 sm:w-auto" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
          {[
            { id: 'badges' as const, label: 'Badges', Icon: Medal },
            { id: 'certificates' as const, label: 'Certificates', Icon: Award },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-5 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all sm:flex-none ${
                activeTab === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[var(--text-muted)] hover:bg-[var(--input)]'
              }`}
            >
              <item.Icon size={16} /> {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
          <Shield size={14} className="text-emerald-500" />
          Verified by Peak Campus
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'badges' ? (
          <motion.div
            key="badges"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
          >
            <TrophyCabinet badges={badges} showAll={showAll} onShowAll={() => setShowAll((value) => !value)} />
          </motion.div>
        ) : (
          <motion.div
            key="certificates"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            className="space-y-5"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
                Certificate Gallery
              </p>
              <h2 className="mt-1 text-2xl font-black" style={{ color: 'var(--text)' }}>
                Official academic proof
              </h2>
            </div>
            <CertificateGallery certificates={certificates} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
