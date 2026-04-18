'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, Star, Search, Filter, 
  ArrowRight, Sparkles, Trophy, 
  Zap, Clock, Heart, Library as LibraryIcon,
  ChevronRight, Brain, DollarSign, Users, Target, Rocket
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'
import { useLibraryBooks, useStudentLibrary } from '@/hooks/useDashboardData'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import Link from 'next/link'

const CATEGORY_MAP: Record<string, { icon: any, color: string, bg: string }> = {
  'Mindset': { icon: <Brain size={14} />, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  'Money': { icon: <DollarSign size={14} />, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  'Communication': { icon: <Users size={14} />, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  'Self-worth': { icon: <Heart size={14} />, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)' },
  'Working Smart': { icon: <Target size={14} />, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  'Leadership': { icon: <Rocket size={14} />, color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.1)' },
  'Other': { icon: <LibraryIcon size={14} />, color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' }
}

export default function StudentLibrary() {
  const { student } = useAuthStore()
  const { data: booksData, status: booksStatus } = useLibraryBooks()
  const { data: shelfData, status: shelfStatus } = useStudentLibrary(student?.id)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const books = booksData || []
  const shelf = shelfData || []
  const loading = (booksStatus === 'loading' || shelfStatus === 'loading')

  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = activeCategory === 'All' || b.category === activeCategory
    return matchesSearch && matchesCat
  })

  // Get currently reading books
  const currentlyReading = shelf.filter((s: any) => s.status === 'reading')

  if (loading) return <SkeletonDashboard />

  return (
    <div className="min-h-screen pb-32" style={{ background: 'var(--bg)' }}>
      {/* Hero Header */}
      <div className="relative pt-16 pb-24 md:pt-24 md:pb-36 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500 blur-[150px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500 blur-[150px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-3xl"
          >
            <Badge variant="primary" className="px-4 py-1.5 bg-primary/10 text-primary border-primary/20 backdrop-blur-xl">
              <Sparkles size={14} className="mr-2" /> Peak Performance Library
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase" style={{ color: 'var(--text)' }}>
              Fuel Your <br /><span className="text-primary underline decoration-primary/20">Ambition</span>
            </h1>
            <p className="text-lg md:text-xl font-medium opacity-60 max-w-xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Access our curated collection of books on mindset, wealth creation, and communication. Read, reflect, and grow your mental library.
            </p>
          </motion.div>

          <div className="mt-12 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full max-w-xl">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-50" size={20} />
              <Input 
                placeholder="Search authors, titles, or concepts..." 
                className="pl-14 py-8 rounded-[2rem] bg-[var(--card)] border-2 border-[var(--card-border)] shadow-2xl focus:border-primary transition-all text-sm font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 p-2 bg-[var(--card)] rounded-3xl border border-[var(--card-border)] overflow-x-auto no-scrollbar max-w-full">
              {['All', ...Object.keys(CATEGORY_MAP)].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-primary text-white shadow-lg' : 'hover:bg-primary/10'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 space-y-20">
        
        {/* Currently Reading Shelf */}
        {currentlyReading.length > 0 && (
          <section className="space-y-8">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-500">
                  <Clock size={20} />
               </div>
               <h2 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>On Your Shelf</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentlyReading.map((entry: any) => (
                <Link key={entry.id} href={`/student/library/${entry.book.id}`}>
                  <Card className="p-0 border-[var(--card-border)] bg-[var(--card)] group hover:border-primary/50 transition-all overflow-hidden flex h-48">
                    <div className="w-32 h-full relative shrink-0">
                      <img src={entry.book.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                    <div className="p-6 flex flex-col justify-between flex-1">
                      <div>
                        <div className="text-[10px] font-black text-primary uppercase mb-1">{entry.book.category}</div>
                        <h3 className="text-xl font-black uppercase line-clamp-1 leading-tight" style={{ color: 'var(--text)' }}>{entry.book.title}</h3>
                        <p className="text-xs opacity-50 font-bold mt-1" style={{ color: 'var(--text-muted)' }}>{entry.book.author}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary">
                          <span>Progress</span>
                          <span>{entry.progress_percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--input)] rounded-full overflow-hidden">
                           <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${entry.progress_percent}%` }}
                              className="h-full bg-primary" 
                           />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Global Catalog */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/20 text-primary">
                <LibraryIcon size={20} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>Peak Catalog</h2>
            </div>
            <p className="text-sm font-bold text-muted hidden sm:block">{filteredBooks.length} titles available</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredBooks.map((book: any, i: number) => (
                <motion.div
                  layout
                  key={book.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/student/library/${book.id}`}>
                    <Card className="p-0 border-[var(--card-border)] bg-[var(--card)] group hover:border-primary/50 transition-all h-full flex flex-col overflow-hidden relative">
                      <div className="relative h-64 overflow-hidden">
                        <img 
                          src={book.cover_url} 
                          alt={book.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                           <Button size="sm" className="w-full font-black text-[10px] tracking-widest uppercase">Start Reading <ArrowRight size={10} className="ml-2" /></Button>
                        </div>
                        
                        {/* Category Tag Overlay */}
                        <div className="absolute top-4 left-4">
                          <div 
                            className="px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest border border-white/20"
                            style={{ backgroundColor: CATEGORY_MAP[book.category]?.bg || 'rgba(0,0,0,0.5)' }}
                          >
                            {CATEGORY_MAP[book.category]?.icon} {book.category}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                           <h3 className="font-black text-sm uppercase leading-tight line-clamp-2" style={{ color: 'var(--text)' }}>{book.title}</h3>
                           <p className="text-[10px] font-bold text-primary">{book.author}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 opacity-40">
                             <Zap size={10} className="text-amber-500 fill-amber-500" />
                             <span className="text-[9px] font-black uppercase tracking-widest">200 XP REWARD</span>
                          </div>
                          
                          <div className="p-2.5 rounded-xl bg-[var(--input)] border border-[var(--card-border)]">
                             <p className="text-[10px] font-bold text-primary flex items-center gap-1.5 mb-1">
                                <Sparkles size={10} /> RELEVANCE
                             </p>
                             <p className="text-[10px] opacity-60 leading-tight line-clamp-2 font-medium">
                                {book.relevance || 'Critical for personal and professional development.'}
                             </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredBooks.length === 0 && (
            <div className="py-20 text-center">
               <div className="w-16 h-16 bg-[var(--card)] rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-[var(--card-border)] mb-4">
                  <LibraryIcon size={32} className="opacity-20" />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>No books in this shelf</h3>
               <p className="text-sm font-medium opacity-50" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or searching for something else.</p>
            </div>
          )}
        </section>

        {/* Global Library Stats Banner */}
        <Card className="p-8 border-none relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-800 text-white flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="absolute inset-0 bg-white/5 opacity-50 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
           
           <div className="space-y-4 relative z-10 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                 <div className="p-2 bg-white/20 rounded-lg"><Trophy size={18} /></div>
                 <span className="text-xs font-black uppercase tracking-widest">Reading Challenge</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9]">
                 Read 5 Books <br />Get a <span className="text-yellow-400">Bibliophile</span> Badge
              </h2>
              <p className="text-sm font-medium opacity-80 max-w-sm">Every book you read and reflect on brings you closer to legendary status. Start your next chapter today.</p>
           </div>

           <div className="grid grid-cols-2 gap-4 relative z-10 w-full md:w-auto">
              {[
                { label: 'Books Read', val: shelf.filter((s: any) => s.status === 'finished').length },
                { label: 'Words Mastered', val: '4.2k' },
                { label: 'Impact Hours', val: '128' },
                { label: 'Growth Rating', val: 'A+' }
              ].map(stat => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                   <div className="text-2xl font-black">{stat.val}</div>
                   <div className="text-[9px] font-black uppercase tracking-widest opacity-60">{stat.label}</div>
                </div>
              ))}
           </div>
        </Card>

      </div>
    </div>
  )
}
