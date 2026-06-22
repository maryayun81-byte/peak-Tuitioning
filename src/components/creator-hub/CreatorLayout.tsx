import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Library, 
  Store, 
  Calendar, 
  TrendingUp, 
  DownloadCloud, 
  Heart,
  Plus,
  Settings,
  Menu,
  X,
  BookOpen
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import DeckCreationWizard from './DeckCreationWizard'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/student/flashcards' },
  { label: 'My Decks', icon: Library, href: '/student/flashcards/library' },
  { label: 'Marketplace', icon: Store, href: '/student/flashcards/marketplace' },
  { label: 'Timetable', icon: Calendar, href: '/student/flashcards/timetable' },
  { label: 'Study Analytics', icon: TrendingUp, href: '/student/flashcards/analytics' },
  { label: 'Downloads', icon: DownloadCloud, href: '/student/flashcards/downloads' },
  { label: 'Favorites', icon: Heart, href: '/student/flashcards/favorites' },
]

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleDeckCreated = (data: any) => {
    console.log('Deck created:', data)
    // Here we will save to the database, then navigate to the studio
    const params = new URLSearchParams()
    if (data.title) params.append('title', data.title)
    if (data.coverIcon) params.append('icon', data.coverIcon)
    if (data.templateStyle) params.append('bg', data.templateStyle)
    
    router.push(`/student/flashcards/studio?${params.toString()}`)
  }

  return (
    <div className="flex h-[100dvh] bg-theme-bg text-theme-text overflow-hidden font-sans">
      <DeckCreationWizard 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        onComplete={handleDeckCreated} 
      />
      {/* Mobile Header */}
      <div className="lg:hidden absolute top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <BookOpen className="text-primary" />
          <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight">Creator Hub</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          aria-label="Open Navigation"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className={`fixed lg:static top-0 bottom-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen size={18} className="text-primary" />
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">Creator Hub</span>
          </div>
          <button 
            className="lg:hidden p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-4 rounded-xl font-bold shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Create New Deck</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.label}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white w-full transition-colors">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden pt-16 lg:pt-0">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
