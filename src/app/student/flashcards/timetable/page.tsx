'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, Download, Share2, Plus, GripVertical, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00']

const MY_LIBRARY = [
  { id: 'math-1', title: 'Calculus Derivatives', subject: 'Mathematics', color: 'bg-blue-500' },
  { id: 'chem-1', title: 'Organic Chemistry', subject: 'Chemistry', color: 'bg-emerald-500' },
  { id: 'bio-1', title: 'KCSE Biology Paper 1', subject: 'Biology', color: 'bg-rose-500' },
  { id: 'geo-1', title: 'Map Work Practice', subject: 'Geography', color: 'bg-amber-500' }
]

type StudyBlock = {
  id: string
  deckId: string
  title: string
  subject: string
  color: string
}

export default function TimetablePage() {
  // schedule mapping: "Monday-16:00" -> StudyBlock
  const [schedule, setSchedule] = useState<Record<string, StudyBlock>>({})

  const handleDragStart = (e: React.DragEvent, deck: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(deck))
  }

  const handleDrop = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('application/json')
    if (!data) return
    const deck = JSON.parse(data)
    const slotKey = `${day}-${time}`
    setSchedule(prev => ({
      ...prev,
      [slotKey]: { ...deck, id: `${deck.id}-${Date.now()}`, deckId: deck.id }
    }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const removeBlock = (day: string, time: string) => {
    const slotKey = `${day}-${time}`
    setSchedule(prev => {
      const newSchedule = { ...prev }
      delete newSchedule[slotKey]
      return newSchedule
    })
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto font-sans h-[100dvh] flex flex-col bg-theme-bg text-theme-text overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/student/flashcards" className="p-2 bg-theme-card border border-theme-card-border hover:bg-theme-sidebar rounded-xl text-theme-text-muted hover:text-theme-text transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-theme-text tracking-tight flex items-center gap-3">
              <CalendarIcon className="text-theme-primary" size={32} />
              Personalized Timetable
            </h1>
            <p className="text-theme-text-muted mt-1">Drag decks from your library into the calendar to plan your revision.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-card-border hover:bg-theme-sidebar text-theme-text font-bold rounded-xl transition-colors">
            <Share2 size={16} /> Share
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white font-bold rounded-xl transition-colors">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        
        {/* Left Sidebar: Deck Library */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">My Library</h2>
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 flex-1 overflow-y-auto space-y-3 border border-slate-200 dark:border-slate-800">
            {MY_LIBRARY.map(deck => (
              <div 
                key={deck.id}
                draggable
                onDragStart={(e) => handleDragStart(e, deck)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary transition-colors group flex items-center gap-3"
              >
                <div className="text-slate-400 group-hover:text-primary transition-colors">
                  <GripVertical size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${deck.color}`} />
                    <span className="text-[10px] font-black uppercase text-slate-500 truncate">{deck.subject}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{deck.title}</h3>
                </div>
              </div>
            ))}
            <button className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors">
              <Plus size={16} /> Create New Deck
            </button>
          </div>
        </div>

        {/* Right Area: Calendar Grid */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-x-auto">
          <div className="min-w-[800px] w-full">
            {/* Header Row */}
            <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="p-4 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 text-center flex items-center justify-center">
                TIME
              </div>
              {DAYS.map(day => (
                <div key={day} className="p-4 border-r border-slate-200 dark:border-slate-800 last:border-r-0 text-sm font-black text-slate-700 dark:text-slate-300 text-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Time Rows */}
            {TIME_SLOTS.map(time => (
              <div key={time} className="grid grid-cols-8 border-b border-slate-100 dark:border-slate-800/50 last:border-b-0 h-24">
                <div className="p-2 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 flex items-start justify-center pt-3 bg-slate-50 dark:bg-slate-900/50">
                  {time}
                </div>
                {DAYS.map(day => {
                  const slotKey = `${day}-${time}`
                  const block = schedule[slotKey]
                  return (
                    <div 
                      key={day} 
                      onDrop={(e) => handleDrop(e, day, time)}
                      onDragOver={handleDragOver}
                      className={`border-r border-slate-100 dark:border-slate-800/50 last:border-r-0 p-1.5 transition-colors relative group ${!block ? 'hover:bg-slate-50 dark:hover:bg-slate-800/30' : ''}`}
                    >
                      {block && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`w-full h-full rounded-lg ${block.color} p-2 text-white shadow-sm flex flex-col relative`}
                        >
                          <span className="text-[9px] font-black uppercase opacity-80 mb-0.5 truncate">{block.subject}</span>
                          <span className="text-xs font-bold leading-tight line-clamp-2">{block.title}</span>
                          
                          <button 
                            onClick={() => removeBlock(day, time)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/40 rounded p-0.5 transition-all"
                          >
                            <CalendarIcon size={12} className="text-white" />
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
