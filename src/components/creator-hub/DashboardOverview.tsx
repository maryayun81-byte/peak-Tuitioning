'use client'

import React from 'react'
import { motion } from 'framer-motion'
import DeckCard from './DeckCard'
import { TrendingUp, Clock, Award, Coins } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Dummy data for now (will be hooked up to real DB)
const DUMMY_DECKS = [
  { id: 'math-101', title: 'Calculus Derivatives', subject: 'Mathematics', topic: 'Calculus', level: 'Form 4', cardCount: 24, progressPercent: 80, rating: 4.8 },
  { id: 'chem-101', title: 'Organic Chemistry', subject: 'Chemistry', topic: 'Organic', level: 'Form 3', cardCount: 50, progressPercent: 12, rating: 4.5, themeColor: 'bg-emerald-500' },
  { id: 'bio-101', title: 'KCSE Biology Paper 1', subject: 'Biology', topic: 'Mixed', level: 'Form 4', cardCount: 120, isMarketplace: true, price: 150, rating: 5.0, themeColor: 'bg-rose-500' }
]

export default function DashboardOverview() {
  const router = useRouter()
  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-theme-text tracking-tight">Welcome to Creator Hub</h1>
        <p className="text-theme-text-muted mt-1">Manage your decks, track study progress, and explore the marketplace.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Study Streak</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">5 Days</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hours Studied</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">12.5h</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cards Mastered</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">342</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Earned</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">KES 0</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-theme-text">Continue Studying</h2>
            <button className="text-sm font-bold text-primary hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {DUMMY_DECKS.map((deck) => (
              <DeckCard 
                key={deck.id} 
                {...deck} 
                onStudy={() => router.push(`/student/flashcards/study/${deck.id}`)} 
                onEdit={() => router.push('/student/flashcards/studio')}
                onShare={() => alert('Share deck link copied!')}
                onDownload={() => alert('Downloading PDF...')}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-theme-text">Recommended for You</h2>
            <button className="text-sm font-bold text-primary hover:underline">Explore Marketplace</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {DUMMY_DECKS.map((deck) => (
              <DeckCard 
                key={deck.id} 
                {...deck} 
                isMarketplace 
                price={250} 
                rating={4.9} 
                onStudy={() => router.push(`/student/flashcards/study/${deck.id}`)} 
                onShare={() => alert('Share marketplace link copied!')}
                onSell={() => alert('Opening marketplace seller dashboard...')}
              />
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
