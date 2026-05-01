'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import LiveSessionCreator from './LiveSessionCreator'

type Props = {
  subjects: { id: string, name: string }[]
  assignments: any[]
  centers: { id: string, name: string }[]
  sessions: any[]
  onSessionCreated?: () => void
}

export default function LiveSessionManager({ subjects, assignments, centers, onSessionCreated }: Props) {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsCreatorOpen(true)}
        className="px-8 py-4 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:bg-white transition-all shadow-xl shadow-emerald-500/20"
      >
        <Plus size={18} /> New Live Session
      </button>

      <AnimatePresence>
        {isCreatorOpen && (
          <LiveSessionCreator 
            subjects={subjects}
            assignments={assignments}
            centers={centers}
            onClose={() => setIsCreatorOpen(false)}
            onSessionCreated={onSessionCreated}
          />
        )}
      </AnimatePresence>
    </>
  )
}
