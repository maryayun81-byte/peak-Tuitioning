'use client'

import React, { useState } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import { RepeaterFieldLayout, RepeaterItem } from '@/components/teacher/resources/RepeaterFieldLayout'
import { TopicSelector } from '@/components/teacher/resources/TopicSelector'
import { FileText, Settings, ShieldAlert, Zap, AlertTriangle, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

interface ConditionEntry extends RepeaterItem {
  reaction: string
  reagent: string
  catalyst: string
  conditions: string
  observation: string
  product: string
  explanation: string
  examinerNote: string
  commonMistake: string
}

export default function ConditionsHandbookBuilder() {
  const [title, setTitle] = useState('New Conditions Handbook')
  const [topic, setTopic] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const [entries, setEntries] = useState<ConditionEntry[]>([
    {
      id: '1',
      _title: 'Haber Process',
      reaction: 'Haber Process',
      reagent: 'Nitrogen and Hydrogen (1:3 ratio)',
      catalyst: 'Finely divided iron',
      conditions: '450°C, 200 atmospheres',
      observation: '',
      product: 'Ammonia',
      explanation: 'Exothermic reversible reaction. Compromise conditions are used to balance yield and rate.',
      examinerNote: 'Conditions and yield trade-off frequently tested.',
      commonMistake: 'Forgetting the catalyst name.'
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
      toast.success('Conditions Handbook saved!')
    }, 1000)
  }

  const handleAdd = () => {
    const newEntry: ConditionEntry = {
      id: Date.now().toString(),
      _title: 'New Reaction',
      reaction: '', reagent: '', catalyst: '', conditions: '',
      observation: '', product: '', explanation: '', examinerNote: '', commonMistake: ''
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

  const updateEntry = (id: string, field: keyof ConditionEntry, value: string) => {
    setEntries(entries.map(e => {
      if (e.id !== id) return e
      const updated = { ...e, [field]: value }
      if (field === 'reaction') updated._title = value || 'Untitled Reaction'
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
      subtitle="Conditions Handbook"
      backHref="/teacher/resources/chemistry"
      isSaving={isSaving}
      onSave={handleSave}
      onExport={() => alert('Exporting handbook...')}
    >
      <RepeaterFieldLayout
        items={sidebarItems}
        activeId={activeId}
        onActiveChange={setActiveId}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        itemLabel="Reaction"
      >
        {activeId === 'settings' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Settings size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Document Settings</h2>
                <p className="text-slate-500 text-sm">Configure the overarching details for this handbook.</p>
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Handbook Title <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg shadow-sm"
                  placeholder="e.g. Industrial Processes Mastery"
                />
              </div>
              <TopicSelector value={topic} onChange={setTopic} />
            </div>
          </div>
        ) : activeEntry ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <Zap className="text-amber-500" />
                Reaction Detail
              </h2>
            </div>

            {/* Core Details */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs">Core Details</h3>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Reaction Name</label>
                <input 
                  type="text" 
                  value={activeEntry.reaction} 
                  onChange={e => updateEntry(activeEntry.id, 'reaction', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Hydrogenation of Ethene"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Reagent(s)</label>
                  <input 
                    type="text" 
                    value={activeEntry.reagent} 
                    onChange={e => updateEntry(activeEntry.id, 'reagent', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Hydrogen gas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Product(s)</label>
                  <input 
                    type="text" 
                    value={activeEntry.product} 
                    onChange={e => updateEntry(activeEntry.id, 'product', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Ethane"
                  />
                </div>
              </div>
            </div>

            {/* Conditions & Obs */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs">Environment & Results</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Catalyst</label>
                  <input 
                    type="text" 
                    value={activeEntry.catalyst} 
                    onChange={e => updateEntry(activeEntry.id, 'catalyst', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Nickel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Temperature / Pressure</label>
                  <input 
                    type="text" 
                    value={activeEntry.conditions} 
                    onChange={e => updateEntry(activeEntry.id, 'conditions', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. 150°C"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Observation (Optional)</label>
                <textarea 
                  value={activeEntry.observation} 
                  onChange={e => updateEntry(activeEntry.id, 'observation', e.target.value)}
                  className="w-full h-20 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="e.g. Decolorizes bromine water"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Explanation</label>
                <textarea 
                  value={activeEntry.explanation} 
                  onChange={e => updateEntry(activeEntry.id, 'explanation', e.target.value)}
                  className="w-full h-24 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Why do these conditions exist? Briefly explain."
                />
              </div>
            </div>

            {/* KCSE Traps */}
            <div className="bg-rose-50/50 dark:bg-rose-900/10 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm space-y-5">
              <h3 className="font-bold text-rose-500 uppercase tracking-wider text-xs flex items-center gap-2">
                <ShieldAlert size={14} /> KCSE Traps & Tips
              </h3>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Examiner Note</label>
                <div className="relative">
                  <MessageSquare className="absolute top-3 left-3 text-slate-400" size={18} />
                  <textarea 
                    value={activeEntry.examinerNote} 
                    onChange={e => updateEntry(activeEntry.id, 'examinerNote', e.target.value)}
                    className="w-full h-20 pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                    placeholder="e.g. Frequently tested in Section B."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Common Mistake</label>
                <div className="relative">
                  <AlertTriangle className="absolute top-3 left-3 text-amber-500" size={18} />
                  <textarea 
                    value={activeEntry.commonMistake} 
                    onChange={e => updateEntry(activeEntry.id, 'commonMistake', e.target.value)}
                    className="w-full h-20 pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                    placeholder="e.g. Students often confuse the catalyst."
                  />
                </div>
              </div>
            </div>

          </div>
        ) : null}
      </RepeaterFieldLayout>
    </BuilderLayout>
  )
}
