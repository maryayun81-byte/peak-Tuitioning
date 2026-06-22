'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Store, Star } from 'lucide-react'
import MarketplaceFilters from '@/components/creator-hub/marketplace/MarketplaceFilters'
import DeckCard from '@/components/creator-hub/DeckCard'
import CheckoutModal from '@/components/creator-hub/marketplace/CheckoutModal'

// Dummy Marketplace Data
const MARKETPLACE_DECKS = [
  { id: 'm1', title: 'Calculus Derivatives Mastery', subject: 'Mathematics', topic: 'Calculus', level: 'Form 4', cardCount: 150, rating: 4.9, price: 250, themeColor: 'bg-blue-600' },
  { id: 'm2', title: 'KCSE Biology Paper 1 & 2', subject: 'Biology', topic: 'Mixed', level: 'Form 4', cardCount: 300, rating: 5.0, price: 500, themeColor: 'bg-emerald-600' },
  { id: 'm3', title: 'Organic Chemistry Reactions', subject: 'Chemistry', topic: 'Organic', level: 'Form 3', cardCount: 80, rating: 4.7, price: 150, themeColor: 'bg-rose-600' },
  { id: 'm4', title: 'Map Reading & Interpretation', subject: 'Geography', topic: 'Map Work', level: 'Form 2', cardCount: 45, rating: 4.8, price: 100, themeColor: 'bg-amber-600' },
  { id: 'm5', title: 'Kiswahili Fasihi Simulizi', subject: 'Kiswahili', topic: 'Fasihi', level: 'Form 3', cardCount: 90, rating: 4.6, price: 200, themeColor: 'bg-purple-600' },
  { id: 'm6', title: 'Vectors & Mechanics Sprint', subject: 'Physics', topic: 'Mechanics', level: 'Form 4', cardCount: 110, rating: 4.9, price: 300, themeColor: 'bg-slate-800' }
]

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All Subjects')
  const [selectedLevel, setSelectedLevel] = useState('All Levels')
  
  const [selectedDeck, setSelectedDeck] = useState<any>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Filtering logic
  const filteredDecks = MARKETPLACE_DECKS.filter(deck => {
    const matchesSearch = deck.title.toLowerCase().includes(searchQuery.toLowerCase()) || deck.topic.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = selectedSubject === 'All Subjects' || deck.subject === selectedSubject
    const matchesLevel = selectedLevel === 'All Levels' || deck.level === selectedLevel
    return matchesSearch && matchesSubject && matchesLevel
  })

  const handleBuy = (deck: any) => {
    setSelectedDeck(deck)
    setIsCheckoutOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] font-sans pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#073159] to-[#145da0] dark:from-slate-900 dark:to-slate-800 text-white pt-16 pb-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#4caf25] flex items-center gap-2 mb-4">
            <Store size={14} /> Peak Marketplace
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Premium Study Decks
          </h1>
          <p className="text-blue-100 max-w-2xl text-lg">
            Boost your grades instantly with high-quality, verified flashcards created by top students and expert tutors.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 relative z-10">
        <MarketplaceFilters 
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject}
          selectedLevel={selectedLevel} setSelectedLevel={setSelectedLevel}
        />

        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {filteredDecks.length} Decks Found
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredDecks.map((deck) => (
              <motion.div 
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className={`h-40 w-full relative ${deck.themeColor} p-5 flex flex-col justify-between`}>
                  <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(0,0,0,0.2)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.2)_75%,transparent_75%,transparent)] bg-[length:16px_16px]" />
                  <div className="relative z-10 flex justify-between items-start">
                    <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-white/90 dark:bg-black/50 text-slate-900 dark:text-white rounded-md backdrop-blur-sm shadow-sm">
                      {deck.subject}
                    </span>
                    <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white rounded-md shadow-sm flex items-center gap-1">
                      <Star size={10} className="fill-white" /> {deck.rating}
                    </span>
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-bold text-xl text-white leading-tight drop-shadow-sm">{deck.title}</h3>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{deck.level} • {deck.topic}</p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {deck.cardCount} Cards
                    </div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      KES {deck.price}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleBuy(deck)}
                    className="w-full mt-4 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary-hover text-white transition-colors"
                  >
                    Buy Now
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredDecks.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500">No decks found matching your filters.</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedSubject('All Subjects'); setSelectedLevel('All Levels'); }}
                className="mt-4 text-primary font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)}
        deckTitle={selectedDeck?.title || ''}
        price={selectedDeck?.price || 0}
        isLoggedIn={true} // For demo purposes, we assume they are logged in so they see "Open in My Decks"
      />
    </div>
  )
}
