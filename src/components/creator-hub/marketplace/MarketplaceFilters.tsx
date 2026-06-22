import React from 'react'
import { Filter, Search } from 'lucide-react'

interface MarketplaceFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedSubject: string
  setSelectedSubject: (subject: string) => void
  selectedLevel: string
  setSelectedLevel: (level: string) => void
}

const SUBJECTS = ['All Subjects', 'Mathematics', 'Chemistry', 'Biology', 'Physics', 'Geography', 'History', 'English', 'Kiswahili']
const LEVELS = ['All Levels', 'Form 1', 'Form 2', 'Form 3', 'Form 4', 'CBC Grade 6', 'CBC Grade 7']

export default function MarketplaceFilters({ 
  searchQuery, setSearchQuery, 
  selectedSubject, setSelectedSubject,
  selectedLevel, setSelectedLevel
}: MarketplaceFiltersProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center">
      
      {/* Search Bar */}
      <div className="relative w-full md:flex-1">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </div>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for KCSE revision, Math topics..."
          className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-shadow"
        />
      </div>

      <div className="w-full md:w-px md:h-12 bg-slate-200 dark:bg-slate-800 hidden md:block" />

      {/* Filters */}
      <div className="flex w-full md:w-auto items-center gap-3">
        <div className="flex items-center gap-2 text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <Filter size={16} />
        </div>
        
        <select 
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="flex-1 md:w-40 py-3 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary cursor-pointer appearance-none"
        >
          {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
        </select>

        <select 
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="flex-1 md:w-40 py-3 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary cursor-pointer appearance-none"
        >
          {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
        </select>
      </div>
      
    </div>
  )
}
