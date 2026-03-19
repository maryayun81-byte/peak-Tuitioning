'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Settings2, Eye, BookOpen } from 'lucide-react'
import { BlockLibrary } from '@/components/worksheet/builder/BlockLibrary'
import { WorksheetCanvas } from '@/components/worksheet/builder/WorksheetCanvas'
import { PropertiesPanel } from '@/components/worksheet/builder/PropertiesPanel'
import { useWorksheetBuilderStore } from '@/stores/worksheetBuilderStore'

type MobileTab = 'library' | 'canvas' | 'properties'

export default function NewWorksheetPage() {
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas')
  const selectedBlockId = useWorksheetBuilderStore(s => s.selectedBlockId)

  // Auto-switch to properties on mobile when a block is selected
  useEffect(() => {
    if (selectedBlockId) setMobileTab('properties')
  }, [selectedBlockId])

  const tabs: { id: MobileTab; icon: typeof Layers; label: string }[] = [
    { id: 'library', icon: Layers, label: 'Blocks' },
    { id: 'canvas', icon: BookOpen, label: 'Canvas' },
    { id: 'properties', icon: Settings2, label: 'Settings' },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Desktop: 3-panel layout | Mobile: tabs control which panel is visible */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block Library — hidden on mobile unless tab selected */}
        <div className={`
          xl:flex xl:flex-col xl:w-64 xl:shrink-0
          ${mobileTab === 'library' ? 'flex flex-col flex-1' : 'hidden xl:flex'}
          overflow-hidden
        `}>
          <BlockLibrary />
        </div>

        {/* Main Canvas — always shown on desktop, conditionally on mobile */}
        <div className={`
          xl:flex xl:flex-col xl:flex-1 xl:min-w-0
          ${mobileTab === 'canvas' ? 'flex flex-col flex-1' : 'hidden xl:flex'}
          overflow-hidden
        `}>
          <WorksheetCanvas />
        </div>

        {/* Properties Panel — hidden on mobile unless tab selected */}
        <div className={`
          xl:flex xl:flex-col xl:w-80 xl:shrink-0
          ${mobileTab === 'properties' ? 'flex flex-col flex-1' : 'hidden xl:flex'}
          overflow-hidden
        `}>
          <PropertiesPanel />
        </div>
      </div>

      {/* Mobile Tab Bar — hidden on xl+ */}
      <div className="xl:hidden border-t flex shrink-0" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        {tabs.map(tab => {
          const active = mobileTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all relative"
              style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
            >
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--primary)' }}
                />
              )}
              <tab.icon size={18} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
