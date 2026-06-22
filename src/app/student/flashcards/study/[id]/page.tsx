'use client'

import React, { useState, useEffect } from 'react'
import StudyLayout from '@/components/creator-hub/study/StudyLayout'
import FlashcardPlayer from '@/components/creator-hub/study/FlashcardPlayer'
import StudyControls from '@/components/creator-hub/study/StudyControls'
import { BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Brain, RotateCcw, Trophy } from 'lucide-react'
import Link from 'next/link'

// Mock Data for a deck
const MOCK_DECK = {
  id: 'math-101',
  title: 'Calculus Derivatives Mastery',
  cards: [
    {
      id: 'c1',
      frontHtml: <div className="text-center"><p className="text-sm text-slate-500 font-bold mb-2 uppercase">Find the derivative of:</p><BlockMath math="f(x) = x^n" /></div>,
      backHtml: <div className="text-center"><p className="text-sm text-slate-500 font-bold mb-2 uppercase">Power Rule</p><BlockMath math="f'(x) = n \cdot x^{n-1}" /></div>,
      themeClass: 'bg-white dark:bg-slate-900',
    },
    {
      id: 'c2',
      frontHtml: <div className="text-center"><p className="text-sm text-slate-500 font-bold mb-2 uppercase">Find the derivative of:</p><BlockMath math="f(x) = \sin(x)" /></div>,
      backHtml: <div className="text-center"><p className="text-sm text-slate-500 font-bold mb-2 uppercase">Trig Rule</p><BlockMath math="f'(x) = \cos(x)" /></div>,
      themeClass: 'bg-white dark:bg-slate-900',
    },
    {
      id: 'c3',
      frontHtml: <div className="text-center text-3xl font-black text-slate-800 dark:text-white">What is the Product Rule?</div>,
      backHtml: <div className="text-center"><BlockMath math="(fg)' = f'g + fg'" /></div>,
      themeClass: 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20',
    }
  ]
}

export default function StudyPage() {
  const [queue, setQueue] = useState(MOCK_DECK.cards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [mode, setMode] = useState<'daily' | 'sprint'>('daily')
  
  // Analytics State
  const [xp, setXp] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [startTime] = useState(Date.now())
  const [timeSpent, setTimeSpent] = useState('00:00')
  const [isFinished, setIsFinished] = useState(false)

  // Timer effect
  useEffect(() => {
    if (isFinished) return
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000)
      const m = Math.floor(diff / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setTimeSpent(`${m}:${s}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, isFinished])

  const handleScore = (score: 1 | 3 | 5) => {
    // 1 = Hard, 3 = Good, 5 = Easy
    let newXp = xp
    if (score === 5) newXp += 20
    else if (score === 3) newXp += 10
    else newXp += 5
    
    setXp(newXp)
    if (score >= 3) setCorrectCount(prev => prev + 1)

    // Move to next card
    setIsFlipped(false)
    setTimeout(() => {
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        setIsFinished(true)
      }
    }, 300) // wait for flip back animation before changing content
  }

  const accuracy = currentIndex === 0 ? 0 : Math.round((correctCount / currentIndex) * 100)
  const progress = isFinished ? 100 : Math.round((currentIndex / queue.length) * 100)

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-800"
        >
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Trophy size={40} className="text-amber-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Session Complete!</h2>
          <p className="text-slate-500 mb-8">You mastered {queue.length} cards in {timeSpent}.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
              <div className="text-2xl font-black text-primary mb-1">+{xp}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">XP Earned</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
              <div className="text-2xl font-black text-emerald-500 mb-1">{accuracy}%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Accuracy</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                setQueue([...MOCK_DECK.cards].reverse()) // Shuffle for next round
                setCurrentIndex(0)
                setCorrectCount(0)
                setXp(0)
                setIsFinished(false)
              }}
              className="w-full py-4 rounded-xl font-bold bg-primary hover:bg-primary-hover text-white transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> Study Again
            </button>
            <Link href="/student/flashcards" className="w-full py-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
              Return to Hub
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  const currentCard = queue[currentIndex]

  return (
    <StudyLayout
      title={MOCK_DECK.title}
      progress={progress}
      xp={xp}
      timeSpentStr={timeSpent}
      accuracy={accuracy}
    >
      <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
        
        {/* Mode Toggle Header */}
        <div className="w-full flex justify-between items-center mb-8 px-4">
          <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
            <button 
              onClick={() => setMode('daily')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'daily' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Daily Review
            </button>
            <button 
              onClick={() => setMode('sprint')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${mode === 'sprint' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Brain size={14} /> Exam Sprint
            </button>
          </div>
          <div className="text-sm font-bold text-slate-400">
            {currentIndex + 1} / {queue.length}
          </div>
        </div>

        <FlashcardPlayer 
          card={currentCard} 
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(!isFlipped)} 
        />

        <div className="h-32 mt-4 flex items-center justify-center w-full relative">
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div
                key="hint"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-slate-400 font-medium flex items-center gap-2 animate-pulse"
              >
                Tap card to reveal answer
              </motion.div>
            ) : (
              <StudyControls 
                key="controls"
                onScore={handleScore}
                disabled={!isFlipped}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </StudyLayout>
  )
}
