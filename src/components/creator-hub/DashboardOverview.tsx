'use client'

import React from 'react'
import { motion } from 'framer-motion'
import DeckCard from './DeckCard'
import { TrendingUp, Clock, Award, Coins, Sparkles, Flame, Zap, Rocket, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'

const DUMMY_DECKS = [
  { id: 'math-101', title: 'Calculus Derivatives', subject: 'Mathematics', topic: 'Calculus', level: 'Form 4', cardCount: 24, progressPercent: 80, rating: 4.8 },
  { id: 'chem-101', title: 'Organic Chemistry', subject: 'Chemistry', topic: 'Organic', level: 'Form 3', cardCount: 50, progressPercent: 12, rating: 4.5, themeColor: 'bg-emerald-500' },
  { id: 'bio-101', title: 'KCSE Biology Paper 1', subject: 'Biology', topic: 'Mixed', level: 'Form 4', cardCount: 120, isMarketplace: true, price: 150, rating: 5.0, themeColor: 'bg-rose-500' }
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 14 } }
}

export default function DashboardOverview() {
  const router = useRouter()

  const stats = [
    { icon: Flame, label: 'Study Streak', value: '5 Days', color: 'from-orange-500 to-rose-600', emoji: '🔥' },
    { icon: Clock, label: 'Hours Studied', value: '12.5h', color: 'from-emerald-500 to-teal-600', emoji: '⏱️' },
    { icon: Award, label: 'Cards Mastered', value: '342', color: 'from-violet-500 to-purple-600', emoji: '🏅' },
    { icon: Coins, label: 'Earnings', value: 'KES 0', color: 'from-amber-400 to-orange-500', emoji: '💰' },
  ]

  return (
    <div className="min-h-full flex flex-col">
      {/* ── Premium Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 pt-12 pb-20 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] bg-[length:32px_32px]" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative mx-auto max-w-full px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur shadow-inner">
                <Sparkles size={20} />
              </div>
              <span className="text-sm font-black uppercase tracking-[0.2em] text-white/70">Creator Hub</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight md:text-5xl">
              Welcome to the Studio 🎨
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-bold text-white/70">
              Design, manage, and share stunning flashcards. Track your impact and earn from your creations.
            </p>
          </motion.div>

          {/* ── Premium Stats Row ──────────────────────────────── */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            {stats.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.label}
                  variants={item}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md transition-all hover:bg-white/20 hover:shadow-2xl"
                >
                  <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${s.color} opacity-20 blur-xl transition-all group-hover:opacity-30`} />
                  <div className="relative flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xl shadow-inner">
                      <span className="text-xl">{s.emoji}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{s.label}</p>
                      <p className="mt-0.5 text-2xl font-black text-white">{s.value}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>

      {/* ── Content Section ────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-full -mt-10 px-4 sm:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Continue Studying */}
          <motion.section variants={item}>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                  <Rocket size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>Continue Studying</h2>
                  <p className="text-xs font-bold text-muted">Pick up where you left off</p>
                </div>
              </div>
              <button className="rounded-full border border-[var(--card-border)] px-5 py-2 text-xs font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                View all →
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {DUMMY_DECKS.map((deck, di) => (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + di * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="group"
                >
                  <DeckCard
                    {...deck}
                    onStudy={() => router.push(`/student/flashcards/study/${deck.id}`)}
                    onEdit={() => router.push('/student/flashcards/studio')}
                    onShare={() => alert('Share deck link copied!')}
                    onDownload={() => alert('Downloading PDF...')}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Recommended for You */}
          <motion.section variants={item}>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                  <Zap size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>Recommended for You</h2>
                  <p className="text-xs font-bold text-muted">From the marketplace</p>
                </div>
              </div>
              <button className="rounded-full border border-[var(--card-border)] px-5 py-2 text-xs font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                Explore →
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {DUMMY_DECKS.map((deck, di) => (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + di * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="group"
                >
                  <DeckCard
                    {...deck}
                    isMarketplace
                    price={250}
                    rating={4.9}
                    onStudy={() => router.push(`/student/flashcards/study/${deck.id}`)}
                    onShare={() => alert('Share marketplace link copied!')}
                    onSell={() => alert('Opening marketplace seller dashboard...')}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Recent Activity Feed */}
          <motion.section variants={item} className="pb-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                <Activity size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>Recent Activity</h2>
                <p className="text-xs font-bold text-muted">Your latest moments</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { emoji: '📝', text: 'Created "Organic Chemistry" deck', time: '2 hours ago' },
                { emoji: '⭐', text: 'Earned 50 XP from studying', time: '5 hours ago' },
                { emoji: '⚔️', text: 'Won a duel against John', time: '1 day ago' },
                { emoji: '📚', text: 'Completed "Calculus Derivatives" review', time: '2 days ago' },
              ].map((activity, ai) => (
                <motion.div
                  key={ai}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + ai * 0.05 }}
                  className="flex items-center gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 transition-all hover:border-[var(--primary)]/30 hover:shadow-md"
                >
                  <span className="text-lg">{activity.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{activity.text}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted whitespace-nowrap">{activity.time}</span>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  )
}
