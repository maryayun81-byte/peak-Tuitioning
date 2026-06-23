'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Flame, Swords, Zap, Trophy,
  BrainCircuit, Mic, Users, BookOpen, Target,
  PlayCircle, Star, Sparkles, Rocket,
  Activity, CheckCircle2, LayoutDashboard, Clock, FileText, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'
import { getStudentYouTubeSuggestions } from '@/app/actions/youtube'
import { getStudentHomepageFeeds, getStudentNationalExam } from '@/app/actions/student'
import { generateDailyInsights } from '@/app/actions/ai'
import { getReferralSummary } from '@/app/actions/referrals'
import { getApprovedCreatorReel } from '@/app/actions/flashcards'
import { calculateLevel } from '@/lib/gamification'
import confetti from 'canvas-confetti'
import Link from 'next/link'

// ── DAILY INSIGHTS COMPONENT ───────────────────────────────────────────────
function DailyInsightsCard({ insight, isCBC }: { insight: any, isCBC: boolean }) {
  if (!insight) return null

  const themeColors = isCBC 
    ? { border: 'border-b-purple-500', bg: 'to-purple-500/5', icon: 'bg-purple-500/10 text-purple-500', title: 'text-purple-600' }
    : { border: 'border-indigo-500', bg: 'to-indigo-500/5', icon: 'bg-indigo-500/10 text-indigo-500', title: 'text-indigo-600' }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-1 md:col-span-3 mb-6">
      <Card className={`p-6 border-b-4 ${themeColors.border} bg-gradient-to-br from-[var(--card)] ${themeColors.bg}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${themeColors.icon}`}>
            <BrainCircuit size={24} />
          </div>
          <div>
            <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>Peak AI Daily Insights</h3>
            <p className="text-xs font-bold text-muted uppercase tracking-widest">Powered by Curriculum Intelligence</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insight.vocabulary && (
            <div className="bg-[var(--input)] p-4 rounded-2xl border border-[var(--card-border)]">
              <h4 className={`text-sm font-black mb-2 uppercase tracking-widest ${themeColors.title}`}>Word of the Day</h4>
              <p className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>{insight.vocabulary.word}</p>
              <p className="text-sm font-bold text-muted mb-2">{insight.vocabulary.meaning}</p>
              <p className="text-xs italic text-muted">"{insight.vocabulary.example}"</p>
            </div>
          )}
          
          {insight.tip && (
            <div className="bg-[var(--input)] p-4 rounded-2xl border border-[var(--card-border)]">
              <h4 className={`text-sm font-black mb-2 uppercase tracking-widest ${themeColors.title}`}>Top Tip: {insight.tip.title}</h4>
              <p className="text-sm font-bold text-muted leading-relaxed">{insight.tip.content}</p>
            </div>
          )}

          {insight.didYouKnow && (
            <div className="bg-[var(--input)] p-4 rounded-2xl border border-[var(--card-border)]">
              <h4 className={`text-sm font-black mb-2 uppercase tracking-widest ${themeColors.title}`}>Did You Know?</h4>
              <p className="text-sm font-bold text-muted leading-relaxed">{insight.didYouKnow}</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

function CreatorReel({ decks }: { decks: any[] }) {
  if (!decks || decks.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase font-black tracking-[0.25em] text-primary">Teacher approved</p>
          <h2 className="text-xl md:text-2xl font-black" style={{ color: 'var(--text)' }}>Class Creator Reel</h2>
        </div>
        <Link href="/student/flashcards" className="text-xs font-black text-primary">Open Creator Hub</Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
        {decks.map((deck: any) => {
          const cover = deck.cover_config || {}
          const cardCount = deck.cards?.[0]?.count || 0
          const title = deck.title || deck.name || 'Student deck'
          const coverClass = cover.presetClass || 'bg-gradient-to-br from-slate-950 via-indigo-950 to-primary'
          return (
            <Link key={deck.id} href="/student/flashcards" className="snap-start min-w-[250px] md:min-w-[310px]">
              <Card className={`relative h-52 overflow-hidden border border-[var(--card-border)] p-5 text-white shadow-xl ${cover.imageUrl ? '' : coverClass}`}>
                {cover.imageUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cover.imageUrl})` }} />}
                {cover.imageUrl && <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/35 to-black/75" />}
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase backdrop-blur">Approved deck</span>
                    <span className="text-3xl">{cover.emoji || '📚'}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-75">{deck.subject?.name || deck.topic || 'Creator Hub'}</p>
                    <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight">{title}</h3>
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase opacity-80">
                      <span>{cardCount} cards</span>
                      <span>•</span>
                      <span>{deck.saves || 0} saves</span>
                      <span>•</span>
                      <span>{deck.shares || 0} shares</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function getYoutubeVideoId(parsed: URL) {
  const parts = parsed.pathname.split('/').filter(Boolean)
  if (parsed.hostname.includes('youtu.be')) return parts[0] || ''
  if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] || ''
  return parsed.searchParams.get('v') || ''
}

function normalizeUrl(url: string) {
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) return `https://${url}`
  return url
}

function getEmbeddableVideoUrl(url: string) {
  if (!url) return ''
  const normalized = normalizeUrl(url)
  try {
    const parsed = new URL(normalized)
    const isYt = parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be') || parsed.hostname.includes('youtube-nocookie.com')
    if (isYt) {
      const id = getYoutubeVideoId(parsed)
      if (!id) return ''
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}?dnt=1` : ''
    }
  } catch {}
  return ''
}

function getVideoThumbnail(url: string) {
  if (!url) return ''
  const normalized = normalizeUrl(url)
  try {
    const parsed = new URL(normalized)
    const isYt = parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be') || parsed.hostname.includes('youtube-nocookie.com')
    const id = isYt ? getYoutubeVideoId(parsed) : ''
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
  } catch {}
  const fallbackId = extractYoutubeIdFallback(url)
  if (fallbackId) return `https://img.youtube.com/vi/${fallbackId}/hqdefault.jpg`
  return ''
}

function extractYoutubeIdFallback(url: string) {
  const match = url.match(/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=|&v=)([^#&?]*).*/)
  return match && match[1] ? match[1] : ''
}

function isDirectVideoUrl(url: string) {
  return /(\.mp4|\.webm|\.mov)($|\?)/i.test(url) || url.startsWith('blob:') || url.startsWith('data:video')
}

const REEL_ACCENTS = [
  { icon: '⚡', className: 'from-amber-400 via-orange-500 to-rose-600' },
  { icon: '🧪', className: 'from-cyan-400 via-teal-500 to-emerald-600' },
  { icon: '📐', className: 'from-blue-500 via-indigo-600 to-violet-700' },
  { icon: '🧠', className: 'from-fuchsia-500 via-purple-600 to-indigo-700' },
  { icon: '🎯', className: 'from-lime-400 via-emerald-500 to-teal-700' },
  { icon: '🔥', className: 'from-red-500 via-rose-600 to-pink-700' },
  { icon: '📚', className: 'from-slate-700 via-slate-900 to-indigo-950' },
  { icon: '💡', className: 'from-yellow-300 via-amber-500 to-orange-700' },
]

const REEL_ICON_COMPONENTS = [Zap, Sparkles, Target, BrainCircuit, Trophy, Flame, BookOpen, Star]

function getReelAccent(seed: string) {
  const score = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const index = score % REEL_ACCENTS.length
  return { ...REEL_ACCENTS[index], Icon: REEL_ICON_COMPONENTS[index % REEL_ICON_COMPONENTS.length] }
}

function InAppVideoCard({ video }: { video: any }) {
  const [open, setOpen] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const url = video.youtube_url || video.video_url || video.attachment_url || video.url || ''
  const embedUrl = getEmbeddableVideoUrl(url)
  const thumb = getVideoThumbnail(url)
  const title = video.title || 'Video lesson'
  const teacherName = video.teacher?.full_name || 'your teacher'
  const subjectName = video.subject?.name || video.chapter || 'Peak lesson'
  const showThumb = thumb && !posterFailed
  const accent = getReelAccent(`${video.id || ''}${title}${subjectName}`)
  const AccentIcon = accent.Icon

  return (
    <>
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="cursor-pointer group"
        onClick={() => setOpen(true)}
      >
        <Card className="overflow-hidden border-0 bg-transparent shadow-none">
          <div className="aspect-[9/13] bg-black relative overflow-hidden rounded-2xl shadow-lg shadow-black/20 group-hover:shadow-2xl group-hover:shadow-black/40 transition-all duration-500">
            {/* Subtle border that glows on hover */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 group-hover:ring-primary/40 transition-all duration-500 z-20 pointer-events-none" />

            {showThumb ? (
              <>
                {/* Thumbnail with cinematic reveal */}
                <motion.img
                  src={thumb}
                  alt={title}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setPosterFailed(true)}
                  initial={{ scale: 1.1, filter: 'blur(8px)' }}
                  animate={imgLoaded ? { scale: 1, filter: 'blur(0px)' } : {}}
                  transition={{ duration: 0.6 }}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {/* Cinematic top/bottom vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 group-hover:via-black/30 transition-all duration-500" />
              </>
            ) : (
              <div className={`relative h-full w-full bg-gradient-to-br ${accent.className} p-5 text-white`}>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] bg-[length:20px_20px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-md">
                    <AccentIcon size={22} className="text-white" />
                  </span>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">{subjectName}</p>
                    <h3 className="line-clamp-3 text-xl font-black leading-tight">{title}</h3>
                    <p className="text-[11px] font-bold text-white/60">{teacherName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top-left subject badge — glass pill */}
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/90 backdrop-blur-md border border-white/10 shadow-lg">
                <AccentIcon size={10} />
                {subjectName}
              </span>
            </div>

            {/* Time-based freshness badge */}
            {video.created_at && Date.now() - new Date(video.created_at).getTime() < 4 * 60 * 60 * 1000 && (
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/80 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur-md animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  NEW
                </span>
              </div>
            )}

            {/* Play button — minimal, elegant, appears on hover */}
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl shadow-black/40 border border-white/30 group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                  <PlayCircle size={28} className="ml-0.5 text-white fill-current" />
                </div>
                {/* Subtle ring glow */}
                <div className="absolute -inset-3 rounded-full bg-white/5 animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ animationDuration: '2.5s' }} />
              </motion.div>
            </div>

            {/* Bottom info bar — always visible with glass effect */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-3 pt-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <p className="line-clamp-1 text-sm font-black text-white drop-shadow-lg">{title}</p>
              <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-white/60">
                <span>{teacherName}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span>{video.created_at ? formatRelativeTime(video.created_at) : 'Recent'}</span>
              </div>
            </div>

            {/* Bottom-right play hint on idle */}
            <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-0 transition-opacity duration-300">
              <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-white/40">
                <PlayCircle size={10} />
                Watch
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <Modal isOpen={open} onClose={() => setOpen(false)} size="xl" title={title}>
        <div className="space-y-5 pt-3">
          <div className="aspect-video overflow-hidden rounded-3xl border border-[var(--card-border)] bg-black shadow-2xl">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : isDirectVideoUrl(url) ? (
              <video src={url} controls className="h-full w-full" />
            ) : (
              <div className={`flex h-full flex-col items-center justify-center bg-gradient-to-br ${accent.className} p-6 text-center text-white`}>
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/18 shadow-inner backdrop-blur">
                  <AccentIcon size={30} />
                </span>
                <h3 className="mt-4 text-xl font-black">This video needs an embeddable source</h3>
                <p className="mt-2 max-w-md text-sm font-semibold text-white/80">
                  Ask the teacher to upload the video file or use a YouTube/Vimeo link that allows playback inside Peak Performance.
                </p>
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Teacher video</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-muted">{video.description || 'Watch this lesson inside Peak Performance, then continue with your tasks.'}</p>
          </div>
          <Button className="w-full" onClick={() => setOpen(false)}>Close Player</Button>
        </div>
      </Modal>
    </>
  )
}

function formatRelativeTime(dateString: string) {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateString).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

function TeacherVideoReel({ videos }: { videos: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  if (!videos || videos.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    const rail = scrollRef.current
    if (!rail) return
    const cardWidth = rail.querySelector('div:first-child')?.getBoundingClientRect().width || 200
    rail.scrollBy({
      left: direction === 'left' ? -(cardWidth * 2 + 12) : (cardWidth * 2 + 12),
      behavior: 'smooth',
    })
  }

  return (
    <section className="relative overflow-hidden border-b border-[var(--card-border)] bg-gradient-to-b from-[var(--card)]/90 to-transparent px-4 py-5 backdrop-blur md:px-8">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-20 left-1/4 h-40 w-96 -translate-x-1/2 rounded-full opacity-[0.07]" style={{ background: 'var(--primary)' }} />
      <div className="pointer-events-none absolute -right-20 top-0 h-32 w-32 rounded-full opacity-[0.04]" style={{ background: 'var(--primary)' }} />
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          >
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--primary)' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--primary)' }} />
              Fresh lessons
            </p>
            <h2 className="mt-0.5 text-lg font-black tracking-tight md:text-xl" style={{ color: 'var(--text)' }}>Video Reel</h2>
          </motion.div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card)] text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-90"
              aria-label="Scroll left"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card)] text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-90"
              aria-label="Scroll right"
            >
              <ChevronRight size={17} />
            </button>
            <Link
              href="/student/resources"
              className="group inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary hover:text-white transition-all active:scale-95"
            >
              All videos
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 16 }}
        >
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory no-scrollbar">
            {videos.slice(0, 10).map((video: any, i: number) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 150, damping: 18 }}
                className="min-w-[148px] max-w-[148px] snap-start sm:min-w-[176px] sm:max-w-[176px] md:min-w-[196px] md:max-w-[196px]"
              >
                <InAppVideoCard video={video} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── ELITE SCHOLAR HOMEPAGE (8-4-4 / HIGH SCHOOL) ───────────────────────────
function LegacyEliteScholarHomepage({ student, profile, data }: { student: any, profile: any, data: any }) {
  const currentXP = student?.xp || 0
  const { level } = calculateLevel(currentXP)
  
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 4000)
    return () => clearTimeout(t)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }
  
  return (
    <div className="min-h-screen pb-32" style={{ background: 'var(--bg)' }}>
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-center py-3 font-bold shadow-xl flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            Welcome back to your dashboard, {profile?.full_name?.split(' ')[0] || 'Scholar'}!
            <Sparkles size={18} />
          </motion.div>
        )}
      </AnimatePresence>
      <TeacherVideoReel videos={data.resourceReel || []} />

      {/* Sleek, professional header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="pt-12 pb-8 px-6 md:px-12 border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <Avatar url={profile?.avatar_url} name={profile?.full_name} size="xl" className="ring-2 ring-[var(--card-border)] shadow-md" />
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 mb-1">Scholar Profile</p>
              <h1 className="text-3xl font-black" style={{ color: 'var(--text)' }}>
                {profile?.full_name}
              </h1>
              <p className="text-sm font-bold text-muted">KCSE Candidate • Level {level}</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-[var(--input)] rounded-xl p-4 min-w-[120px] border border-[var(--card-border)]">
              <p className="text-[10px] uppercase font-bold text-muted mb-1">Total XP</p>
              <p className="text-xl font-black font-mono text-emerald-500">{currentXP}</p>
            </div>
            <div className="bg-[var(--input)] rounded-xl p-4 min-w-[120px] border border-[var(--card-border)]">
              <p className="text-[10px] uppercase font-bold text-muted mb-1">Daily Streak</p>
              <p className="text-xl font-black font-mono text-orange-500 flex items-center gap-1">
                <Flame size={16} /> {data.brainGymStreak}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        {data.dailyInsight && <DailyInsightsCard insight={data.dailyInsight} isCBC={false} />}
        <CreatorReel decks={data.creatorReel || []} />

        {/* Core Productivity Actions (Bento Grid) */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          <motion.div variants={itemVariants} className="md:col-span-8 h-full">
            <Link href="/student/performance" className="block h-full">
              <Card className="h-full p-6 md:p-8 hover:border-emerald-500 transition-all duration-300 cursor-pointer group bg-[var(--card)] hover:shadow-2xl hover:shadow-emerald-500/10 border border-[var(--card-border)] backdrop-blur-md">
                <div className="flex flex-col h-full justify-between">
                  <Activity size={32} className="text-emerald-500 mb-6 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300" />
                  <div>
                    <h3 className="font-black text-2xl tracking-tight mb-2" style={{ color: 'var(--text)' }}>Subject Mastery</h3>
                    <p className="text-sm font-bold text-muted">View your performance radar and track deep analytics across all your KCSE subjects.</p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
          
          <motion.div variants={itemVariants} className="md:col-span-4 h-full">
            <Link href="/student/exam-prep" className="block h-full">
              <Card className="h-full p-6 md:p-8 hover:border-indigo-500 transition-all duration-300 cursor-pointer group bg-[var(--card)] hover:shadow-2xl hover:shadow-indigo-500/10 border border-[var(--card-border)] backdrop-blur-md">
                <div className="flex flex-col h-full justify-between">
                  <Target size={32} className="text-indigo-500 mb-6 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300" />
                  <div>
                    <h3 className="font-black text-xl tracking-tight mb-1" style={{ color: 'var(--text)' }}>Study Planner</h3>
                    <p className="text-xs font-bold text-muted">Manage revision schedule</p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
          
          <motion.div variants={itemVariants} className="md:col-span-4 h-full">
            <Link href="/student/flashcards" className="block h-full">
              <Card className="h-full p-6 md:p-8 hover:border-amber-500 transition-all duration-300 cursor-pointer group bg-[var(--card)] hover:shadow-2xl hover:shadow-amber-500/10 border border-[var(--card-border)] backdrop-blur-md">
                <div className="flex flex-col h-full justify-between">
                  <BookOpen size={32} className="text-amber-500 mb-6 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300" />
                  <div>
                    <h3 className="font-black text-xl tracking-tight mb-1" style={{ color: 'var(--text)' }}>Creator Hub</h3>
                    <p className="text-xs font-bold text-muted">Flashcards, packs, and sharing</p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
          
          <motion.div variants={itemVariants} className="md:col-span-8 h-full">
            <Link href="/student/voice-notes" className="block h-full">
              <Card className="h-full p-6 md:p-8 hover:border-rose-500 transition-all duration-300 cursor-pointer group bg-[var(--card)] hover:shadow-2xl hover:shadow-rose-500/10 border border-[var(--card-border)] backdrop-blur-md">
                <div className="flex flex-col h-full justify-between">
                  <Mic size={32} className="text-rose-500 mb-6 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300" />
                  <div>
                    <h3 className="font-black text-2xl tracking-tight mb-2" style={{ color: 'var(--text)' }}>Audio Transcripts</h3>
                    <p className="text-sm font-bold text-muted">Record AI-powered voice notes, dictation, and automatically generate summarized study sheets.</p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        {/* Dynamic Feeds */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="p-6 border border-[var(--card-border)] bg-[var(--card)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Recent Assignments</h3>
            </div>
            {data.recentAssignments.length === 0 ? (
              <p className="text-center py-6 text-muted text-sm font-bold">No recent assignments</p>
            ) : (
              <div className="space-y-3">
                {data.recentAssignments.map((item: any) => (
                  <Link key={item.id} href={`/student/assignments/${item.id}`}>
                    <div className="p-3 rounded-lg bg-[var(--input)] hover:bg-[var(--sidebar)] transition-colors cursor-pointer border border-[var(--card-border)]">
                      <p className="font-bold text-sm line-clamp-1 mb-1" style={{ color: 'var(--text)' }}>{item.title}</p>
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted">
                        <span>{item.subject?.name}</span>
                        <span>{item.teacher?.profiles?.full_name}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 border border-[var(--card-border)] bg-[var(--card)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Latest Quizzes</h3>
            </div>
            {data.recentQuizzes.length === 0 ? (
              <p className="text-center py-6 text-muted text-sm font-bold">No recent quizzes</p>
            ) : (
              <div className="space-y-3">
                {data.recentQuizzes.map((item: any) => (
                  <Link key={item.id} href={`/student/quizzes/${item.id}`}>
                    <div className="p-3 rounded-lg bg-[var(--input)] hover:bg-[var(--sidebar)] transition-colors cursor-pointer border border-[var(--card-border)]">
                      <p className="font-bold text-sm line-clamp-1 mb-1" style={{ color: 'var(--text)' }}>{item.title}</p>
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted">
                        <span>{item.subject?.name}</span>
                        <span>{item.teacher?.profiles?.full_name}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 border border-[var(--card-border)] bg-[var(--card)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-500">
                <Clock size={20} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>My Timetable</h3>
            </div>
            {data.upcomingSessions.length === 0 ? (
              <p className="text-center py-6 text-muted text-sm font-bold">No upcoming classes</p>
            ) : (
              <div className="space-y-3">
                {data.upcomingSessions.map((item: any) => (
                  <div key={item.id} className="p-3 rounded-lg bg-[var(--input)] border border-[var(--card-border)]">
                    <p className="font-bold text-sm line-clamp-1 mb-1" style={{ color: 'var(--text)' }}>{item.title}</p>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-orange-500">
                      <span>{new Date(item.start_time).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                      <span>{item.subject?.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          </motion.div>
        </motion.div>

        {/* Video Resources */}
        {data.youtubeVideos.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
              <PlayCircle size={16} /> Recommended Lectures
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.youtubeVideos.map((video: any) => (
                <InAppVideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── EPIC STUDENT HOMEPAGE (CBC / PRIMARY) ──────────────────────────────────
function NationalExamCountdownCard({ exam }: { exam: any }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!exam?.exam_date) return null

  const target = new Date(`${exam.exam_date}T00:00:00`).getTime()
  const diff = Math.max(target - now, 0)
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="mb-5 overflow-hidden border border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-[var(--card)] to-orange-500/10 p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-400">🎯 National Exam Countdown</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{exam.name}</h2>
            <p className="mt-1 text-sm font-semibold text-muted">{exam.exam_type} · {new Date(exam.exam_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 md:min-w-[400px]">
            {([
              ['Days', days],
              ['Hours', hours],
              ['Mins', minutes],
              ['Secs', seconds],
            ] as [string, number][]).map(([label, value]) => (
              <div key={label} className={`rounded-2xl border border-rose-500/20 bg-black/25 p-3 text-center backdrop-blur-sm ${label === 'Secs' ? 'ring-1 ring-rose-500/30' : ''}`}>
                <p className="text-2xl font-black text-white md:text-3xl tabular-nums">{String(value).padStart(2, '0')}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function getLocalDailyInsight(isCBC: boolean) {
  return {
    vocabulary: isCBC
      ? { word: 'Explore', meaning: 'To look carefully, try, and discover.', example: 'Explore one new idea, then explain it in your own words.' }
      : { word: 'Precision', meaning: 'Careful accuracy in work or expression.', example: 'A precise answer uses the words an examiner expects.' },
    tip: isCBC
      ? { title: 'Tiny challenge', content: 'Pick one strand, answer three short questions, then show one thing you made or learnt.' }
      : { title: 'Exam language', content: 'Before writing, list the key marking points. Turn those points into short, clear sentences.' },
    didYouKnow: isCBC
      ? 'You remember more when you draw, say, match, and teach the idea to someone else.'
      : 'Timed practice works best when you review the marking scheme immediately after the attempt.',
  }
}

function PremiumStudentHome({ student, profile, data, isCBC }: { student: any, profile: any, data: any, isCBC: boolean }) {
  const currentXP = student?.xp || 0
  const { level, progressPercent, nextMilestone } = calculateLevel(currentXP)
  const firstName = profile?.full_name?.split(' ')[0] || (isCBC ? 'Learner' : 'Scholar')
  const insight = data.dailyInsight || getLocalDailyInsight(isCBC)
  const displayTitle = isCBC
    ? level >= 8 ? 'Knowledge King 👑' : level >= 4 ? 'Learning Lion 🦁' : 'Curious Cub 🐻'
    : 'KCSE Warrior ⚔️'

  const streakCount = isCBC ? Math.max(1, Math.floor(currentXP / 50)) : data.brainGymStreak

  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const classId = (student as any)?.class_id

  useEffect(() => {
    if (!classId) return
    const supabase = getSupabaseBrowserClient()
    supabase.rpc('get_class_leaderboard', { p_class_id: classId, p_limit: 5 }).then(({ data, error }) => {
      if (!error && data) setLeaderboard(data)
    })
  }, [classId])

  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#f59e0b', '#22c55e', '#ef4444'],
        disableForReducedMotion: true,
      })
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const quests = [
    { emoji: '📝', title: 'Complete a quiz', done: (data.recentQuizzes?.length || 0) > 0, href: '/student/quizzes', color: 'from-violet-500 to-purple-600' },
    { emoji: '⚡', title: 'Study 30 minutes', done: data.brainGymStreak > 0, href: '/student/study', color: 'from-amber-400 to-orange-500' },
    { emoji: '🎯', title: 'Win a duel', done: (student?.duel_wins || 0) > 0, href: '/student/duels', color: 'from-rose-500 to-pink-600' },
    { emoji: '📋', title: 'Submit an assignment', done: (data.recentAssignments?.length || 0) > 0, href: '/student/assignments', color: 'from-blue-500 to-indigo-600' },
  ]

  const tools = isCBC
    ? [
        { emoji: '🧠', title: 'Brain Gym', color: '#8b5cf6', href: '/student/brain-gym' },
        { emoji: '🃏', title: 'Creator Hub', color: '#f59e0b', href: '/student/flashcards' },
        { emoji: '🏆', title: 'Portfolio', color: '#10b981', href: '/student/portfolio' },
        { emoji: '⚔️', title: 'Duels', color: '#ef4444', href: '/student/duels' },
      ]
    : [
        { emoji: '📋', title: 'Exam Prep', color: '#6366f1', href: '/student/exam-prep' },
        { emoji: '📊', title: 'Performance', color: '#22c55e', href: '/student/performance' },
        { emoji: '🃏', title: 'Creator Hub', color: '#f59e0b', href: '/student/flashcards' },
        { emoji: '🎙️', title: 'Voice Notes', color: '#ec4899', href: '/student/voice-notes' },
      ]

  return (
    <div className="min-h-screen overflow-x-hidden pb-32" style={{ background: 'var(--bg)' }}>
      <TeacherVideoReel videos={data.resourceReel || []} />

      {/* ── Floating Streak Banner ─────────────────────────── */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12 }}
        className="sticky top-0 z-40 mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 pt-2 pb-1"
      >
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500/90 to-orange-500/90 px-5 py-2.5 text-white shadow-xl shadow-amber-500/30 backdrop-blur-md">
          <motion.span
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-2xl">🔥</motion.span>
          <span className="text-sm font-black uppercase tracking-wider">
            {streakCount > 0 ? `${streakCount}-Day Streak!` : 'Start your streak today!'}
          </span>
          <span className="ml-2 text-xs font-bold text-white/70">Keep going! 💪</span>
        </div>
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6">

        {/* ── Hero Card ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          className="relative overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 md:p-7 shadow-2xl shadow-black/10"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.06]" style={{ background: 'var(--primary)' }} />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full opacity-[0.04]" style={{ background: 'var(--primary)' }} />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <motion.div whileHover={{ scale: 1.05 }} className="relative shrink-0">
                <Avatar url={profile?.avatar_url} name={profile?.full_name} size="xl" className="ring-4 ring-[var(--primary)]/30 shadow-xl" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 }}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[11px] font-black text-white shadow-lg"
                >
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  >
                    {level}
                  </motion.span>
                </motion.div>
              </motion.div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--primary)' }}>
                  {isCBC ? '🌟 Kids Dashboard' : '⚡ Student Dashboard'}
                </p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight md:text-3xl" style={{ color: 'var(--text)' }}>
                  Hey {firstName}! 👋
                </h1>
                <p className="mt-0.5 text-sm font-bold text-muted">{displayTitle}</p>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              {[
                ['⭐ XP', currentXP, 'from-amber-400 to-orange-500', false],
                ['🔥 Streak', streakCount, 'from-rose-500 to-pink-600', false],
                ['🎯 Next', Math.max(nextMilestone - currentXP, 0), 'from-blue-500 to-indigo-600', true],
              ].map(([label, value, grad, isNext]) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                  whileHover={{ y: -3, scale: 1.02 }}
                  className={`rounded-2xl bg-gradient-to-br ${grad} p-3 min-w-[72px] text-center shadow-lg`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/70">{label}</p>
                  <motion.p
                    key={value}
                    initial={isNext ? { scale: 0.5, opacity: 0 } : undefined}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="mt-0.5 text-xl font-black text-white"
                  >
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </motion.p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-muted">Level {level} → Level {level + 1}</span>
              <span style={{ color: 'var(--primary)' }}>{progressPercent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--input)] shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 60%, white 40%))' }}
              />
            </div>
          </div>
        </motion.div>

        {/* ── National Exam Countdown ─────────────────────────── */}
        <div className="mt-4">
          <NationalExamCountdownCard exam={data.nationalExam} />
        </div>

        {/* ── Daily Quests ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>Daily Quests</h2>
            <span className="text-xs font-bold text-muted">— {quests.filter(q => q.done).length}/{quests.length} completed</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {quests.map((quest, qi) => (
              <motion.div
                key={quest.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + qi * 0.08 }}
                whileHover={{ y: -3, scale: 1.01 }}
              >
                <Link href={quest.href} className="group block">
                  <div className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 ${
                    quest.done
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--primary)]/40 hover:shadow-lg'
                  }`}>
                    <div className={`pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full bg-gradient-to-br ${quest.color} opacity-[0.06]`} />
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ rotate: 10 }}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all ${
                          quest.done
                            ? 'bg-emerald-500/15'
                            : `bg-gradient-to-br ${quest.color} text-white shadow-md`
                        }`}
                      >
                        {quest.done ? '✅' : quest.emoji}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black ${quest.done ? 'text-emerald-500 line-through' : ''}`} style={{ color: 'var(--text)' }}>
                          {quest.title}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{quest.done ? 'Done! 🎉' : 'Tap to start →'}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Assignments ──────────────────────────────────────── */}
        {data.recentAssignments?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">📝</span>
              <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>Assignments</h2>
              <Link href="/student/assignments" className="ml-auto text-[10px] font-black uppercase tracking-wider hover:underline" style={{ color: 'var(--primary)' }}>View all →</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.recentAssignments.slice(0, 3).map((a: any) => {
                const daysLeft = a.due_date ? Math.ceil((new Date(a.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                return (
                  <motion.div
                    key={a.id}
                    whileHover={{ y: -3 }}
                    className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm shadow-md">
                        {a.subject?.name?.charAt(0) || '📋'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{a.title}</p>
                        <p className="text-[10px] font-bold text-muted">{a.subject?.name || 'General'}</p>
                        {daysLeft !== null && (
                          <p className={`text-[10px] font-black mt-1 ${daysLeft <= 1 ? 'text-red-500' : 'text-muted'}`}>
                            {daysLeft <= 0 ? '⚠️ Overdue!' : daysLeft === 1 ? '🔥 Due tomorrow!' : `📅 ${daysLeft} days left`}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── Upcoming Sessions / Timetable ──────────────────────── */}
        {data.upcomingSessions?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">📅</span>
              <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>Upcoming Sessions</h2>
              <Link href="/student/schedule" className="ml-auto text-[10px] font-black uppercase tracking-wider hover:underline" style={{ color: 'var(--primary)' }}>Full schedule →</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {data.upcomingSessions.slice(0, 8).map((s: any) => (
                <motion.div
                  key={s.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="min-w-[180px] shrink-0 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs shadow-md">
                      {s.subject?.name?.charAt(0) || '📚'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate" style={{ color: 'var(--text)' }}>{s.subject?.name || 'Class'}</p>
                      <p className="text-[9px] font-bold text-muted">{s.day}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-muted">
                    <Clock size={12} />
                    <span>{s.start_time} — {s.end_time}</span>
                  </div>
                  {s.teacher?.full_name && (
                    <p className="text-[10px] font-semibold text-muted mt-1.5 truncate">👤 {s.teacher.full_name}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Quick Launch + Daily Nudge (side by side) ──────── */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Quick Launch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>Quick Launch</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tools.map((tool, ti) => (
                <motion.div
                  key={tool.href}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + ti * 0.06, type: 'spring', stiffness: 200 }}
                  whileHover={{ y: -5, scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href={tool.href} className="group block h-full">
                    <div className="relative h-full overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition-all duration-200 hover:shadow-xl">
                      <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-[0.08]" style={{ background: tool.color }} />
                      <div className="flex flex-col items-center gap-3 text-center">
                        <motion.div
                          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
                          transition={{ duration: 0.4 }}
                          className="text-3xl"
                        >
                          {tool.emoji}
                        </motion.div>
                        <span className="text-sm font-black" style={{ color: 'var(--text)' }}>{tool.title}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Daily Nudge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">💡</span>
              <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>Daily Nudge</h2>
            </div>
            <div className="space-y-3">
              <motion.div
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, black 30%))' }}
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/8" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">📖 Word of the Day</p>
                <p className="text-2xl font-black text-white leading-none">{insight.vocabulary?.word || 'Focus'}</p>
                <p className="text-xs font-bold text-white/70 mt-1.5">{insight.vocabulary?.meaning || 'Stay on track!'}</p>
              </motion.div>

              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--primary)' }}>
                  📌 {insight.tip?.title || 'Study Tip'}
                </p>
                <p className="text-xs font-semibold leading-relaxed text-muted">{insight.tip?.content}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Leaderboard + Duels row ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-6 grid gap-4 lg:grid-cols-2"
        >
          {/* Leaderboard preview */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>Class Leaderboard</h3>
              </div>
              <Link href="/student/performance" className="text-[10px] font-black uppercase tracking-wider hover:underline" style={{ color: 'var(--primary)' }}>View all →</Link>
            </div>
            <div className="space-y-2">
              {(leaderboard.length > 0 ? leaderboard : []).map((entry: any, i: number) => {
                const isMe = entry.id === student?.id
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <div
                    key={entry.id || i}
                    className={`flex items-center justify-between rounded-xl px-4 py-2.5 transition-all ${
                      isMe
                        ? 'bg-gradient-to-r from-[var(--primary)]/15 to-[var(--primary)]/5 border border-[var(--primary)]/30'
                        : 'bg-[var(--input)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{medals[i] || `#${i + 1}`}</span>
                      <Avatar url={entry.avatar_url} name={entry.full_name} size="sm" />
                      <span className={`text-sm font-bold truncate ${isMe ? 'text-[var(--primary)]' : ''}`} style={{ color: isMe ? undefined : 'var(--text)' }}>
                        {entry.full_name || 'Unknown'}
                        {isMe && <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider text-muted">(You)</span>}
                      </span>
                    </div>
                    <span className="text-xs font-black font-mono text-muted shrink-0 ml-2">{entry.xp?.toLocaleString()} XP</span>
                  </div>
                )
              })}
              {leaderboard.length === 0 && (
                <p className="text-xs text-muted text-center py-4">No leaderboard data yet. Start earning XP!</p>
              )}
            </div>
          </div>

          {/* Duels + Referrals */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚔️</span>
                  <div>
                    <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>Friend Duels</h3>
                    <p className="text-[10px] font-bold text-muted">{data.activeDuelsCount} active challenges</p>
                  </div>
                </div>
                <Link href="/student/duels" className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 transition-all">
                  ⚔️ Duel Now
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {([
                  ['Wins', student?.duel_wins || 0, '#22c55e', '🏆'],
                  ['Draws', student?.duel_draws || 0, 'var(--primary)', '🤝'],
                  ['Losses', student?.duel_losses || 0, '#ef4444', '💪'],
                ] as [string, number, string, string][]).map(([label, value, color, emoji]) => (
                  <div key={label} className="rounded-xl bg-[var(--input)] p-3">
                    <p className="text-lg font-black" style={{ color }}>{value}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">{emoji} {label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👥</span>
                  <div>
                    <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>Invite Friends</h3>
                    <p className="text-[10px] font-bold text-muted">Earn bonus XP!</p>
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-center shadow-lg shadow-amber-500/30">
                  <p className="text-xl font-black text-white">{data.referralSummary?.completedCount || 0}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/70">Invites</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Creator Reel ─────────────────────────────────────── */}
        <div className="mt-6">
          <CreatorReel decks={data.creatorReel || []} />
        </div>

        {/* ── Teacher Picks Videos ─────────────────────────────── */}
        {data.youtubeVideos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">📺</span>
              <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>Teacher Picks</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {data.youtubeVideos.map((video: any) => (
                <InAppVideoCard key={video.id} video={video} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}


function EliteScholarHomepage({ student, profile, data }: { student: any, profile: any, data: any }) {
  const currentXP = student?.xp || 0
  const { level, progressPercent, nextMilestone } = calculateLevel(currentXP)

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 }
  }

  const feeds = [
    {
      title: 'Assignments',
      eyebrow: 'Due work',
      icon: <FileText size={18} />,
      accent: 'text-blue-400 bg-blue-500/10',
      empty: 'No assignments due right now.',
      cta: 'Open assignments',
      href: '/student/assignments',
      items: data.recentAssignments || [],
      renderMeta: (item: any) => item.subject?.name || 'Assignment',
      itemHref: (item: any) => `/student/assignments/${item.id}`,
    },
    {
      title: 'Quizzes',
      eyebrow: 'Practice',
      icon: <CheckCircle2 size={18} />,
      accent: 'text-emerald-400 bg-emerald-500/10',
      empty: 'No fresh quizzes yet.',
      cta: 'Open quizzes',
      href: '/student/quizzes',
      items: data.recentQuizzes || [],
      renderMeta: (item: any) => item.subject?.name || 'Quiz',
      itemHref: (item: any) => `/student/quizzes/${item.id}`,
    },
    {
      title: 'Timetable',
      eyebrow: 'Next classes',
      icon: <Clock size={18} />,
      accent: 'text-orange-400 bg-orange-500/10',
      empty: 'No upcoming classes on the timetable.',
      cta: 'View schedule',
      href: '/student/schedule',
      items: data.upcomingSessions || [],
      renderMeta: (item: any) => item.start_time ? new Date(item.start_time).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'Class session',
      itemHref: (_item: any) => '/student/schedule',
    },
  ]

  const quickActions = [
    { title: 'Subject Mastery', text: 'Radar, marks, strengths, and weak spots.', href: '/student/performance', icon: <Activity size={22} />, accent: 'text-emerald-400' },
    { title: 'Exam Prep', text: 'Build a revision plan around your next paper.', href: '/student/exam-prep', icon: <Target size={22} />, accent: 'text-indigo-400' },
    { title: 'Creator Hub', text: 'Make beautiful flashcards and revision packs.', href: '/student/flashcards', icon: <BookOpen size={22} />, accent: 'text-amber-400' },
    { title: 'Voice Notes', text: 'Turn dictation into study summaries.', href: '/student/voice-notes', icon: <Mic size={22} />, accent: 'text-rose-400' },
  ]

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-5 rounded-[28px] border border-[var(--card-border)] bg-[var(--card)]/90 p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar url={profile?.avatar_url} name={profile?.full_name} size="lg" className="ring-2 ring-emerald-500/20" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Student Command Center</p>
                <h1 className="truncate text-2xl font-black tracking-tight md:text-3xl" style={{ color: 'var(--text)' }}>
                  {profile?.full_name}
                </h1>
                <p className="text-sm font-semibold text-muted">KCSE Candidate - Level {level}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">XP</p>
                <p className="mt-1 text-lg font-black text-emerald-400">{currentXP}</p>
              </div>
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Streak</p>
                <p className="mt-1 flex items-center gap-1 text-lg font-black text-orange-400"><Flame size={15} /> {data.brainGymStreak}</p>
              </div>
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Next</p>
                <p className="mt-1 text-lg font-black" style={{ color: 'var(--text)' }}>{Math.max(nextMilestone - currentXP, 0)} XP</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--input)]">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400" style={{ width: `${progressPercent}%` }} />
          </div>
        </motion.div>

        <NationalExamCountdownCard exam={data.nationalExam} />

        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Priority board</p>
            <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>What needs attention today</h2>
          </div>
          <Link href="/student/schedule" className="hidden rounded-full border border-[var(--card-border)] px-4 py-2 text-xs font-bold text-muted transition hover:text-[var(--text)] sm:inline-flex">
            Full schedule
          </Link>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {feeds.map((feed) => (
            <motion.div variants={itemVariants} key={feed.title}>
              <Card className="h-full border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${feed.accent}`}>
                      {feed.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{feed.eyebrow}</p>
                      <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>{feed.title}</h3>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--input)] px-2.5 py-1 text-xs font-black text-muted">{feed.items.length}</span>
                </div>

                {feed.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--input)]/50 p-4">
                    <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{feed.empty}</p>
                    <p className="mt-1 text-xs text-muted">Use this quiet window to revise, ask a question, or plan the next session.</p>
                    <Link href={feed.href} className="mt-4 inline-flex text-xs font-black uppercase tracking-widest text-emerald-400">
                      {feed.cta}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {feed.items.slice(0, 3).map((item: any) => (
                      <Link key={item.id} href={feed.itemHref(item)} className="block rounded-2xl border border-[var(--card-border)] bg-[var(--input)] p-3 transition hover:border-emerald-500/60">
                        <p className="line-clamp-1 text-sm font-bold" style={{ color: 'var(--text)' }}>{item.title}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{feed.renderMeta(item)}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Study tools</p>
          <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Launch the right workspace</h2>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <motion.div variants={itemVariants} key={action.href}>
              <Link href={action.href} className="block h-full">
                <Card className="group h-full border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-500/10">
                  <div className="mb-5 flex items-center justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--input)] ${action.accent}`}>
                      {action.icon}
                    </div>
                    <span className="text-muted transition group-hover:translate-x-1 group-hover:text-emerald-400">-&gt;</span>
                  </div>
                  <h3 className="text-base font-black" style={{ color: 'var(--text)' }}>{action.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-muted">{action.text}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Invite and earn</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>Refer a classmate</h3>
                <p className="mt-1 text-sm font-semibold text-muted">Both students earn XP when the invite is completed.</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-emerald-400">{data.referralSummary?.completedCount || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Invites</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-[var(--input)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Your code</p>
              <p className="mt-1 font-mono text-lg font-black text-emerald-400">{data.referralSummary?.referralCode || 'Generating...'}</p>
            </div>
          </Card>

          <Card className="border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Friend duels</p>
            <h3 className="mt-3 text-lg font-black" style={{ color: 'var(--text)' }}>Visible win record</h3>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ['Wins', (student as any)?.duel_wins || 0, 'text-emerald-400'],
                ['Draws', (student as any)?.duel_draws || 0, 'text-amber-400'],
                ['Losses', (student as any)?.duel_losses || 0, 'text-rose-400'],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-2xl bg-[var(--input)] p-3 text-center">
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
                </div>
              ))}
            </div>
            <Link href="/student/duels" className="mt-4 inline-flex text-xs font-black uppercase tracking-widest text-indigo-400">
              Challenge a classmate
            </Link>
          </Card>
        </div>

        {data.dailyInsight && (
          <Card className="mt-8 border border-[var(--card-border)] bg-gradient-to-br from-[var(--card)] to-indigo-500/5 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                <BrainCircuit size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Peak Intelligence</p>
                <h3 className="font-black" style={{ color: 'var(--text)' }}>Daily insight</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-[var(--input)] p-4">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Word</p>
                <p className="mt-2 text-lg font-black" style={{ color: 'var(--text)' }}>{data.dailyInsight.vocabulary?.word}</p>
                <p className="mt-1 text-xs text-muted">{data.dailyInsight.vocabulary?.meaning}</p>
              </div>
              <div className="rounded-2xl bg-[var(--input)] p-4">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-400">{data.dailyInsight.tip?.title || 'Study tip'}</p>
                <p className="mt-2 text-sm font-semibold text-muted">{data.dailyInsight.tip?.content}</p>
              </div>
              <div className="rounded-2xl bg-[var(--input)] p-4">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Did you know?</p>
                <p className="mt-2 text-sm font-semibold text-muted">{data.dailyInsight.didYouKnow}</p>
              </div>
            </div>
          </Card>
        )}
        <CreatorReel decks={data.creatorReel || []} />
      </div>
    </div>
  )
}

function EpicStudentHomepage({ student, profile, data }: { student: any, profile: any, data: any }) {
  const currentXP = student?.xp || 0
  const { level, progressPercent, nextMilestone } = calculateLevel(currentXP)
  
  const [greeting, setGreeting] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')

    const t = setTimeout(() => setShowWelcome(false), 4000)
    return () => clearTimeout(t)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 }
  }
  const stars = Math.max(1, Math.floor(currentXP / 50))
  const cbcTitle = level >= 8 ? 'Knowledge King' : level >= 4 ? 'Learning Lion' : 'Curious Cub'
  const mascotMood = data.brainGymStreak > 0 ? 'Happy streak buddy' : 'Ready for today'

  return (
    <div className="min-h-screen pb-32 overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-400 to-emerald-600 text-white text-center py-3 font-black shadow-2xl flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            Welcome back to your dashboard, {profile?.full_name?.split(' ')[0] || 'Champion'}!
            <Sparkles size={18} />
          </motion.div>
        )}
      </AnimatePresence>
      <TeacherVideoReel videos={data.resourceReel || []} />

      {/* Epic Header */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative pt-12 pb-20 px-6 md:px-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 overflow-hidden rounded-b-[3rem] shadow-2xl mb-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute top-10 right-10 animate-bounce" style={{ animationDuration: '3s' }}>
          <Sparkles size={48} className="text-white/20" />
        </div>
        <div className="absolute bottom-10 right-32 animate-pulse" style={{ animationDuration: '4s' }}>
          <Rocket size={64} className="text-white/10" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <Avatar url={profile?.avatar_url} name={profile?.full_name} size="xl" className="ring-8 ring-white/20 shadow-2xl" />
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight drop-shadow-md">
              {greeting}, {profile?.full_name?.split(' ')[0] || 'Champion'}!
            </h1>
            <p className="text-xl text-white/80 font-bold mb-6">Ready to conquer your goals today?</p>
            
            <div className="max-w-md bg-black/20 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
              <div className="flex justify-between items-end mb-2 text-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-black shadow-lg">
                    {level}
                  </div>
                  <span className="font-bold uppercase tracking-widest text-xs opacity-80">Level</span>
                </div>
                <span className="font-black text-sm">{currentXP} / {nextMilestone} XP</span>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 space-y-12">
        <NationalExamCountdownCard exam={data.nationalExam} />

        <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 p-5 text-slate-950 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/50 text-5xl shadow-inner">
                {data.brainGymStreak > 0 ? '🦁' : '🦊'}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Our Kids motivation</p>
                <h2 className="text-2xl font-black">{cbcTitle}</h2>
                <p className="text-sm font-bold text-slate-700">{mascotMood} - complete your mini-challenge to keep growing.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/45 p-3">
                <p className="text-2xl font-black">⭐ {stars}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Stars</p>
              </div>
              <div className="rounded-2xl bg-white/45 p-3">
                <p className="text-2xl font-black">🔥 {data.brainGymStreak}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Streak</p>
              </div>
              <div className="rounded-2xl bg-white/45 p-3">
                <p className="text-2xl font-black">3</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Daily Qs</p>
              </div>
            </div>
          </div>
        </Card>

        {data.dailyInsight && <DailyInsightsCard insight={data.dailyInsight} isCBC={true} />}
        <CreatorReel decks={data.creatorReel || []} />

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }} className="md:col-span-8 h-full">
            <Link href="/student/brain-gym" className="block h-full">
              <Card className="p-6 md:p-8 h-full flex flex-col md:flex-row items-center justify-between text-center md:text-left group border-b-4 border-b-orange-500 hover:shadow-orange-500/30 hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-[var(--card)] to-orange-500/10 backdrop-blur-xl border-[var(--card-border)]">
                <div>
                  <h3 className="font-black text-3xl mb-2 tracking-tight" style={{ color: 'var(--text)' }}>Brain Gym</h3>
                  <p className="text-sm font-bold text-muted uppercase tracking-widest mb-6 md:mb-0">Your Daily Mental Workout</p>
                </div>
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 text-orange-500 group-hover:scale-110 group-hover:rotate-12 shadow-inner">
                    <BrainCircuit size={48} />
                  </div>
                  {data.brainGymStreak > 0 && (
                    <div className="absolute -top-3 -right-3 bg-orange-500 text-white text-sm font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg shadow-orange-500/50 animate-bounce ring-4 ring-white/10">
                      <Flame size={14} className="fill-current" /> {data.brainGymStreak}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} className="md:col-span-4 h-full">
            <Link href="/student/duels" className="block h-full">
              <Card className="p-6 h-full flex flex-col items-center justify-center text-center group border-b-4 border-b-indigo-500 hover:shadow-indigo-500/30 hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-b from-[var(--card)] to-indigo-500/10 relative overflow-hidden backdrop-blur-xl border-[var(--card-border)]">
                {data.activeDuelsCount > 0 && (
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-2xl animate-pulse opacity-50" />
                )}
                <div className="relative mb-4 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 text-indigo-500 group-hover:rotate-12">
                    <Swords size={32} />
                  </div>
                  {data.activeDuelsCount > 0 && (
                    <div className="absolute -top-2 -right-4 bg-indigo-500 text-white text-xs font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg shadow-indigo-500/50 transform rotate-12">
                      <Zap size={12} className="fill-current" /> {data.activeDuelsCount}
                    </div>
                  )}
                </div>
                <h3 className="font-black text-xl tracking-tight mb-1 relative z-10" style={{ color: 'var(--text)' }}>Duels</h3>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest relative z-10">Vs Classmates</p>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} className="md:col-span-4 h-full">
            <Link href="/student/flashcards" className="block h-full">
              <Card className="p-6 h-full flex flex-col items-center justify-center text-center group border-b-4 border-b-amber-500 hover:shadow-amber-500/30 hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-b from-[var(--card)] to-amber-500/10 backdrop-blur-xl border-[var(--card-border)]">
                <div className="mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 text-amber-500 group-hover:-rotate-6">
                    <BookOpen size={32} />
                  </div>
                </div>
                <h3 className="font-black text-xl tracking-tight mb-1" style={{ color: 'var(--text)' }}>Creator Hub</h3>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">Create & Share</p>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} className="md:col-span-4 h-full">
            <Link href="/student/portfolio" className="block h-full">
              <Card className="p-6 h-full flex flex-col items-center justify-center text-center group border-b-4 border-b-pink-500 hover:shadow-pink-500/30 hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-b from-[var(--card)] to-pink-500/10 backdrop-blur-xl border-[var(--card-border)]">
                <div className="mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-all duration-300 text-pink-500 group-hover:scale-110">
                    <Star size={32} />
                  </div>
                </div>
                <h3 className="font-black text-xl tracking-tight mb-1" style={{ color: 'var(--text)' }}>Stickers</h3>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">My Portfolio</p>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} className="md:col-span-4 h-full">
            <Link href="/student/voice-notes" className="block h-full">
              <Card className="p-6 h-full flex flex-col items-center justify-center text-center group border-b-4 border-b-rose-500 hover:shadow-rose-500/30 hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-b from-[var(--card)] to-rose-500/10 backdrop-blur-xl border-[var(--card-border)]">
                <div className="mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 text-rose-500 group-hover:scale-110">
                    <Mic size={32} />
                  </div>
                </div>
                <h3 className="font-black text-xl tracking-tight mb-1" style={{ color: 'var(--text)' }}>Audio Notes</h3>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">Speak & Learn</p>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        {/* Dynamic Feeds for CBC */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="p-6 border-b-4 border-b-blue-500 bg-gradient-to-b from-[var(--card)] to-blue-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500">
                <FileText size={24} />
              </div>
              <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>Assignments</h3>
            </div>
            {data.recentAssignments.length === 0 ? (
              <p className="text-center py-6 text-muted text-sm font-bold uppercase tracking-widest">All caught up!</p>
            ) : (
              <div className="space-y-3">
                {data.recentAssignments.map((item: any) => (
                  <Link key={item.id} href={`/student/assignments/${item.id}`}>
                    <div className="p-4 rounded-2xl bg-[var(--input)] hover:bg-white hover:shadow-lg transition-all cursor-pointer border border-[var(--card-border)]">
                      <p className="font-black text-md line-clamp-1 mb-1 text-blue-600">{item.title}</p>
                      <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-wider">
                        <span>{item.subject?.name}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
          <Card className="p-6 border-b-4 border-b-emerald-500 bg-gradient-to-b from-[var(--card)] to-emerald-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>Quizzes</h3>
            </div>
            {data.recentQuizzes.length === 0 ? (
              <p className="text-center py-6 text-muted text-sm font-bold uppercase tracking-widest">No Quizzes yet!</p>
            ) : (
              <div className="space-y-3">
                {data.recentQuizzes.map((item: any) => (
                  <Link key={item.id} href={`/student/quizzes/${item.id}`}>
                    <div className="p-4 rounded-2xl bg-[var(--input)] hover:bg-white hover:shadow-lg transition-all cursor-pointer border border-[var(--card-border)]">
                      <p className="font-black text-md line-clamp-1 mb-1 text-emerald-600">{item.title}</p>
                      <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-wider">
                        <span>{item.subject?.name}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
          <Card className="p-6 border-b-4 border-b-orange-500 bg-gradient-to-b from-[var(--card)] to-orange-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-500">
                <Clock size={24} />
              </div>
              <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>My Timetable</h3>
            </div>
            {data.upcomingSessions.length === 0 ? (
              <p className="text-center py-6 text-muted text-sm font-bold uppercase tracking-widest">No upcoming classes</p>
            ) : (
              <div className="space-y-3">
                {data.upcomingSessions.map((item: any) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                    <p className="font-black text-md line-clamp-1 mb-1">{item.title}</p>
                    <div className="flex items-center justify-between text-xs font-bold text-white/80 uppercase tracking-wider">
                      <span>{new Date(item.start_time).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          </motion.div>
        </motion.div>

        {data.youtubeVideos.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <PlayCircle size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Teacher's Picks</h2>
                <p className="text-sm font-bold text-muted">Watch and learn from the best videos.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.youtubeVideos.map((video: any) => (
                <InAppVideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN ROUTER COMPONENT ───────────────────────────────────────────────────
function inferNationalExamType(curriculumName: string, className: string) {
  const curriculum = curriculumName.toLowerCase()
  const klass = className.toLowerCase()

  if (curriculum.includes('8-4') || klass.includes('form 4')) return 'KCSE'
  if (klass.includes('grade 6') || klass === '6') return 'KJSEA'
  if (klass.includes('grade 9') || klass === '9') return 'KPSEA'

  return null
}

export default function StudentHomepageRouter() {
  const { student, profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [curriculumName, setCurriculumName] = useState<string>('CBC')
  const [data, setData] = useState<{ 
    youtubeVideos: any[]; 
    activeDuelsCount: number; 
    brainGymStreak: number;
    recentAssignments: any[];
    recentQuizzes: any[];
    upcomingSessions: any[];
    dailyInsight: any;
    nationalExam: any;
    referralSummary: any;
    creatorReel: any[];
    resourceReel: any[];
  }>({
    youtubeVideos: [],
    activeDuelsCount: 0,
    brainGymStreak: 0,
    recentAssignments: [],
    recentQuizzes: [],
    upcomingSessions: [],
    dailyInsight: null,
    nationalExam: null,
    referralSummary: null,
    creatorReel: [],
    resourceReel: []
  })

  useEffect(() => {
    if (student?.id) loadData()
  }, [student?.id])

  const loadData = async () => {
    if (!student?.id) return
    const supabase = getSupabaseBrowserClient()
    const classId = (student as any).class_id
    const curriculumId = (student as any).curriculum_id
    const expectedUserId = profile?.id || (student as any).user_id
    const fallbackFeeds = { recentAssignments: [], recentQuizzes: [], upcomingSessions: [] }
    const safeLoad = async <T,>(label: string, loader: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await loader
      } catch (error: any) {
        const message = error?.message || error?.code || 'unavailable'
        console.warn(`[StudentHome] ${label} unavailable: ${message}`)
        return fallback
      }
    }
    const loadTeacherVideoReel = async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const visibility = [
        `student_ids.cs.{${student.id}}`,
        'audience.in.("public","broadcast")',
      ]
      if (classId) {
        visibility.unshift(`class_id.eq.${classId}`, `class_ids.cs.{${classId}}`)
      }

      const { data, error } = await supabase
        .from('resources')
        .select('*, subject:subjects(name), teacher:teachers(full_name)')
        .gte('created_at', cutoff)
        .or(visibility.join(','))
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      return (data || [])
        .filter((resource: any) => {
          const url = `${resource.video_url || ''} ${resource.attachment_url || ''} ${resource.url || ''}`
          return resource.type === 'video' || /youtube\.com|youtu\.be|vimeo\.com|\.mp4($|\?)|\.webm($|\?)|\.mov($|\?)/i.test(url)
        })
        .slice(0, 10)
    }

    try {
      const [feeds, vids, referralSummary, creatorReel, resourceReel] = await Promise.all([
        safeLoad('feeds', getStudentHomepageFeeds(classId), fallbackFeeds),
        safeLoad('videos', getStudentYouTubeSuggestions(classId), []),
        safeLoad('referrals', getReferralSummary(student.id), { referralCode: '', completedCount: 0, pendingCount: 0 }),
        safeLoad('creator reel', getApprovedCreatorReel(student.id, classId, curriculumId), []),
        safeLoad('teacher video reel', loadTeacherVideoReel(), []),
      ])
      
      const { count: duelsCount } = await supabase
        .from('classroom_duels')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')
        .eq('class_id', classId)
      
      const { data: gymData } = await supabase
        .from('brain_gym_streaks')
        .select('current_streak')
        .eq('student_id', student.id)
        .single()

      // Fetch or Generate Daily Insights
      let currName = curriculumName
      let className = 'Student'
      if (curriculumId) {
        const { data: curr } = await supabase.from('curriculums').select('name').eq('id', curriculumId).single()
        if (curr) {
          setCurriculumName(curr.name)
          currName = curr.name
        }
      }

      if (classId) {
        const { data: cls } = await supabase.from('classes').select('name').eq('id', classId).single()
        if (cls) className = cls.name
      }

      let nationalExam = null
      const examType = inferNationalExamType(currName, className)
      if (examType) {
        nationalExam = await safeLoad('national exam', getStudentNationalExam(student.id, examType, expectedUserId), null)
      }

      let insightData = null
      const dateKey = new Date().toISOString().split('T')[0]
      const cacheKey = `peak_insight_${student.id}_${dateKey}`
      const cached = localStorage.getItem(cacheKey)
      
      if (cached) {
        try { insightData = JSON.parse(cached) } catch(e) {}
      } else {
        insightData = await safeLoad('daily insight', generateDailyInsights(currName, className), getLocalDailyInsight(!currName.includes('8-4')))
        if (insightData) {
          localStorage.setItem(cacheKey, JSON.stringify(insightData))
        }
      }

      setData({
        youtubeVideos: vids || [],
        activeDuelsCount: duelsCount || 0,
        brainGymStreak: gymData?.current_streak || 0,
        recentAssignments: feeds.recentAssignments,
        recentQuizzes: feeds.recentQuizzes,
        upcomingSessions: feeds.upcomingSessions,
        dailyInsight: insightData,
        nationalExam,
        referralSummary,
        creatorReel,
        resourceReel
      })

    } catch (e: any) {
      console.warn(`[StudentHome] Dashboard loaded with fallbacks: ${e?.message || e?.code || 'unknown issue'}`)
      setData((previous) => ({
        ...previous,
        dailyInsight: previous.dailyInsight || getLocalDailyInsight(!curriculumName.includes('8-4')),
      }))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-32 space-y-8" style={{ background: 'var(--bg)' }}>
        <div className="pt-12 pb-20 bg-[var(--card)] border-b border-[var(--card-border)] mb-12 h-[280px] animate-pulse"></div>
        <div className="max-w-6xl mx-auto px-6 space-y-8 animate-pulse">
          <div className="h-48 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="h-40 md:col-span-4 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl"></div>
            <div className="h-40 md:col-span-8 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl"></div>
            <div className="h-40 md:col-span-6 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl"></div>
            <div className="h-40 md:col-span-6 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-72 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl"></div>
            <div className="h-72 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl"></div>
            <div className="h-72 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl"></div>
          </div>
        </div>
      </div>
    )
  }

  // Route based on curriculum
  if (curriculumName.includes('8-4')) {
    return <PremiumStudentHome student={student} profile={profile} data={data} isCBC={false} />
  }

  // Default to CBC/Primary theme
  return <PremiumStudentHome student={student} profile={profile} data={data} isCBC={true} />
}
