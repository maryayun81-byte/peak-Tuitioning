'use client'

import React, { useState } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import { RepeaterFieldLayout, RepeaterItem } from '@/components/teacher/resources/RepeaterFieldLayout'
import { TopicSelector } from '@/components/teacher/resources/TopicSelector'
import { Settings, FlaskConical, Search, ShieldAlert, Sigma } from 'lucide-react'
import toast from 'react-hot-toast'
import 'katex/dist/katex.min.css'
import { BlockMath } from 'react-katex'

interface PracticalEntry extends RepeaterItem {
  procedure: string
  observation: string
  inference: string
  confirmatoryTest: string
  equation: string
  safetyNote: string
}

export default function PracticalObservationBuilder() {
  const [title, setTitle] = useState('New Practical Pack')
  const [topic, setTopic] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const [entries, setEntries] = useState<PracticalEntry[]>([
    {
      id: '1',
      _title: 'Test for Lead(II) ions',
      procedure: 'To about 2cm³ of solution X, add aqueous potassium iodide dropwise until in excess.',
      observation: 'A yellow precipitate is formed.',
      inference: 'Pb²⁺ ions present.',
      confirmatoryTest: 'Heat the mixture. The yellow precipitate dissolves on heating and reappears on cooling.',
      equation: 'Pb^{2+}_{(aq)} + 2I^{-}_{(aq)} \\rightarrow PbI_{2(s)}',
      safetyNote: 'Lead compounds are toxic. Wash hands after handling.'
    }
  ])
  const [activeId, setActiveId] = useState<string | null>('settings')

  const handleSave = () => {
    if (!title || !topic) {
      toast.error('Please provide a title and select a topic in the Document Settings.')
      setActiveId('settings')
      return
    }
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success('Practical Pack saved!')
    }, 1000)
  }

  const handleAdd = () => {
    const newEntry: PracticalEntry = {
      id: Date.now().toString(),
      _title: 'New Procedure',
      procedure: '', observation: '', inference: '', confirmatoryTest: '',
      equation: '', safetyNote: ''
    }
    setEntries([...entries, newEntry])
    setActiveId(newEntry.id)
  }

  const handleDelete = (id: string) => {
    setEntries(entries.filter(e => e.id !== id))
    if (activeId === id) setActiveId('settings')
  }

  const handleDuplicate = (id: string) => {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    const newEntry = { ...entry, id: Date.now().toString(), _title: `${entry._title} (Copy)` }
    setEntries([...entries, newEntry])
    setActiveId(newEntry.id)
  }

  const updateEntry = (id: string, field: keyof PracticalEntry, value: string) => {
    setEntries(entries.map(e => {
      if (e.id !== id) return e
      const updated = { ...e, [field]: value }
      if (field === 'procedure') {
        updated._title = value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : 'Untitled Procedure'
      }
      return updated
    }))
  }

  const activeEntry = entries.find(e => e.id === activeId)

  // Document Settings pseudo-item for sidebar
  const sidebarItems = [
    { id: 'settings', _title: 'Document Settings' },
    ...entries
  ]

  return (
    <BuilderLayout
      title={title}
      subtitle="Practical Observation"
      backHref="/teacher/resources/chemistry"
      isSaving={isSaving}
      onSave={handleSave}
      onExport={() => alert('Exporting practical pack...')}
    >
      <RepeaterFieldLayout
        items={sidebarItems}
        activeId={activeId}
        onActiveChange={setActiveId}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        itemLabel="Procedure"
      >
        {activeId === 'settings' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Settings size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Document Settings</h2>
                <p className="text-slate-500 text-sm">Configure the overarching details for this practical pack.</p>
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pack Title <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg shadow-sm"
                  placeholder="e.g. Qualitative Analysis - Paper 3"
                />
              </div>
              <TopicSelector value={topic} onChange={setTopic} />
            </div>
          </div>
        ) : activeEntry ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <FlaskConical className="text-emerald-500" />
                Procedure Details
              </h2>
            </div>

            {/* Procedure & Observation */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs">Action & Result</h3>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Action / Procedure</label>
                <textarea 
                  value={activeEntry.procedure} 
                  onChange={e => updateEntry(activeEntry.id, 'procedure', e.target.value)}
                  className="w-full h-24 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="e.g. To about 2cm³ of solution X, add aqueous NaOH dropwise until in excess."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                  <Search size={14} className="text-emerald-500" /> Expected Observation
                </label>
                <textarea 
                  value={activeEntry.observation} 
                  onChange={e => updateEntry(activeEntry.id, 'observation', e.target.value)}
                  className="w-full h-20 px-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  placeholder="e.g. White precipitate formed, soluble in excess."
                />
              </div>
            </div>

            {/* Inference & Equations */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs">Deductions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Inference(s)</label>
                  <textarea 
                    value={activeEntry.inference} 
                    onChange={e => updateEntry(activeEntry.id, 'inference', e.target.value)}
                    className="w-full h-20 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="e.g. Zn²⁺, Al³⁺, or Pb²⁺ present."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Confirmatory Test</label>
                  <textarea 
                    value={activeEntry.confirmatoryTest} 
                    onChange={e => updateEntry(activeEntry.id, 'confirmatoryTest', e.target.value)}
                    className="w-full h-20 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="e.g. Add aqueous ammonia dropwise..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                  <Sigma size={14} className="text-purple-500" /> Chemical Equation (LaTeX)
                </label>
                <input 
                  type="text" 
                  value={activeEntry.equation} 
                  onChange={e => updateEntry(activeEntry.id, 'equation', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-3"
                  placeholder="e.g. Zn^{2+}_{(aq)} + 2OH^{-}_{(aq)} \rightarrow Zn(OH)_{2(s)}"
                />
                {activeEntry.equation && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto text-center">
                    <BlockMath math={activeEntry.equation} />
                  </div>
                )}
              </div>
            </div>

            {/* Safety */}
            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm space-y-4">
              <label className="block text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <ShieldAlert size={14} /> Safety Note
              </label>
              <input 
                type="text" 
                value={activeEntry.safetyNote} 
                onChange={e => updateEntry(activeEntry.id, 'safetyNote', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="e.g. Corrosive. Wear eye protection."
              />
            </div>

          </div>
        ) : null}
      </RepeaterFieldLayout>
    </BuilderLayout>
  )
}
