'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Library, Search, Plus, Filter, ArrowUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import DeckCard from '@/components/creator-hub/DeckCard'

const MY_DECKS = [
  { id: 'math-101', title: 'Calculus Derivatives', subject: 'Mathematics', topic: 'Calculus', level: 'Form 4', cardCount: 24, progressPercent: 80, rating: 4.8 },
  { id: 'chem-101', title: 'Organic Chemistry', subject: 'Chemistry', topic: 'Organic', level: 'Form 3', cardCount: 50, progressPercent: 12, rating: 4.5, themeColor: 'bg-emerald-500' },
  { id: 'bio-101', title: 'KCSE Biology Paper 1', subject: 'Biology', topic: 'Mixed', level: 'Form 4', cardCount: 120, isMarketplace: true, price: 150, rating: 5.0, themeColor: 'bg-rose-500' },
]

export default function LibraryPage() {
  const router = useRouter()

  return (
    <div className="min-h-full p-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
            <Library size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>My Decks</h1>
            <p className="text-sm font-bold text-muted">{MY_DECKS.length} decks in your library</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-xl border border-[var(--card-border)] p-3" style={{ color: 'var(--text-muted)' }}>
            <Filter size={18} />
          </button>
          <button className="rounded-xl border border-[var(--card-border)] p-3" style={{ color: 'var(--text-muted)' }}>
            <ArrowUpDown size={18} />
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98]">
            <Plus size={18} strokeWidth={3} />
            <span>New Deck</span>
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search decks..."
          className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card)] py-3.5 pl-12 pr-4 text-sm font-bold outline-none transition-all placeholder:font-bold focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          style={{ color: 'var(--text)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {MY_DECKS.map((deck, i) => (
          <motion.div
            key={deck.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -6 }}
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
      </motion.div>

      {MY_DECKS.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--card)]">
            <Library size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>No decks yet</h3>
          <p className="mt-1 text-sm font-bold text-muted">Create your first deck to get started</p>
        </div>
      )}
    </div>
  )
}
