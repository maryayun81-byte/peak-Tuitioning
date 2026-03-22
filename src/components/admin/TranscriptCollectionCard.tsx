'use client'

import { motion } from 'framer-motion'
import { 
  Calendar, 
  Users, 
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react'
import { TuitionEvent } from '@/types/database'

interface TranscriptCollectionCardProps {
  event: TuitionEvent
  transcriptCount: number
  lastGenerated?: string
  onClick: () => void
}

export function TranscriptCollectionCard({ event, transcriptCount, lastGenerated, onClick }: TranscriptCollectionCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/20 via-[var(--primary)]/5 to-transparent rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-[2.5rem] p-8 shadow-xl shadow-black/5 flex flex-col h-full overflow-hidden transition-theme">
        {/* Decorative elements */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--primary)]/5 rounded-full" />
        <div className="absolute bottom-12 -left-12 w-24 h-24 bg-[var(--input)] rounded-full" />

        <div className="flex items-start justify-between mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--sidebar)] flex items-center justify-center shadow-lg group-hover:bg-[var(--primary)] transition-colors duration-300">
             <Award className="text-white" size={28} />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--input)] border border-[var(--card-border)] rounded-full">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Live Collection</span>
          </div>
        </div>

        <div className="flex-grow">
          <h3 className="text-2xl font-black text-[var(--text)] leading-tight mb-2 group-hover:text-[var(--primary)] transition-colors">{event.name}</h3>
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">{event.description || 'Academic Transcript Collection'}</p>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--card-border)] grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)]">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase">Students</p>
              <p className="text-sm font-black text-[var(--text)]">{transcriptCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)]">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-[9px] font-black text-[var(--text-muted)] uppercase">Last Updated</p>
              <p className="text-sm font-black text-[var(--text)]">{lastGenerated ? new Date(lastGenerated).toLocaleDateString() : 'Never'}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
           <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">Manage Collection</span>
           <div className="w-10 h-10 rounded-full bg-[var(--input)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300 translate-x-4 group-hover:translate-x-0">
              <ArrowRight size={18} />
           </div>
        </div>
      </div>
    </motion.div>
  )
}
