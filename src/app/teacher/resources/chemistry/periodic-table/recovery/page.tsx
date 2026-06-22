'use client'

import { useState } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import { BookOpen, Star, Repeat, HelpCircle, CheckSquare, Square } from 'lucide-react'

interface Section {
  id: string
  title: string
  content: string
  colorClass: string
  borderClass: string
  bgClass: string
  textClass: string
  icon: React.ReactNode
}

const CHECKLIST_ITEMS = [
  'I can explain why atomic radius decreases across a period',
  'I can explain why atomic radius increases down a group',
  'I can explain why Group I reactivity increases down the group',
  'I can explain why Group VII reactivity decreases down the group',
  'I can explain why noble gases are unreactive',
  'I can explain why cations are smaller than their parent atoms'
]

export default function PeriodicRecoveryPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [checked, setChecked] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false))

  const [sections, setSections] = useState<Section[]>([
    {
      id: 'definitions',
      title: 'Key Definitions',
      content:
        'Atomic Radius: Distance from nucleus to outermost electron.\nIonization Energy: Energy needed to remove an electron from a gaseous atom.\nElectron Affinity: Energy change when an atom gains an electron.\nShielding Effect: Repulsion by inner electrons blocking nuclear pull.',
      colorClass: 'text-cyan-700 dark:text-cyan-300',
      borderClass: 'border-cyan-300 dark:border-cyan-700',
      bgClass: 'bg-cyan-50 dark:bg-cyan-950/40',
      textClass: 'text-cyan-900 dark:text-cyan-100',
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      id: 'rules',
      title: 'The Master Rule',
      content:
        '1. Find the Electronic Arrangement\n2. Does number of shells change?\n3. Does nuclear charge change?\n4. How does Shielding Effect change?\n5. Result: Is nuclear attraction stronger or weaker?\n6. Result: Does atomic radius increase or decrease?',
      colorClass: 'text-purple-700 dark:text-purple-300',
      borderClass: 'border-purple-300 dark:border-purple-700',
      bgClass: 'bg-purple-50 dark:bg-purple-950/40',
      textClass: 'text-purple-900 dark:text-purple-100',
      icon: <Star className="w-5 h-5" />
    },
    {
      id: 'comparison',
      title: 'Across vs Down',
      content:
        'ACROSS A PERIOD:\n- Protons increase, shells stay same.\n- Attraction STRONGER.\n- Radius gets smaller.\n\nDOWN A GROUP:\n- Shells increase, shielding increases.\n- Attraction WEAKER.\n- Radius gets bigger.',
      colorClass: 'text-emerald-700 dark:text-emerald-300',
      borderClass: 'border-emerald-300 dark:border-emerald-700',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
      textClass: 'text-emerald-900 dark:text-emerald-100',
      icon: <Repeat className="w-5 h-5" />
    },
    {
      id: 'quicktest',
      title: 'Quick Test Questions',
      content:
        '1. Why is Na larger than Cl?\n2. Why is K more reactive than Na?\n3. Why does Cl have a higher ionization energy than Na?\n4. Why is Na⁺ smaller than Na?\n5. Why are Noble Gases unreactive?',
      colorClass: 'text-amber-700 dark:text-amber-300',
      borderClass: 'border-amber-300 dark:border-amber-700',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40',
      textClass: 'text-amber-900 dark:text-amber-100',
      icon: <HelpCircle className="w-5 h-5" />
    }
  ])

  const handleContentChange = (id: string, value: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, content: value } : s)))
  }

  const toggleCheck = (idx: number) => {
    setChecked((prev) => {
      const next = [...prev]
      next[idx] = !next[idx]
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsSaving(false)
  }

  const completedCount = checked.filter(Boolean).length

  return (
    <BuilderLayout
      title="Topic Recovery Pack"
      subtitle="Periodic Table & Trends"
      backHref="/teacher/resources/chemistry/periodic-table"
      isSaving={isSaving}
      onSave={handleSave}
    >
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className={`rounded-2xl border-2 ${sec.borderClass} ${sec.bgClass} overflow-hidden flex flex-col transition-all hover:shadow-md`}
            >
              <div className={`px-5 py-4 flex items-center gap-3 border-b ${sec.borderClass}`}>
                <div className={`p-2 rounded-xl bg-white/50 dark:bg-black/20 ${sec.colorClass}`}>
                  {sec.icon}
                </div>
                <h2 className={`font-black tracking-wide ${sec.colorClass}`}>{sec.title}</h2>
              </div>
              <textarea
                value={sec.content}
                onChange={(e) => handleContentChange(sec.id, e.target.value)}
                className={`w-full p-5 bg-transparent resize-none outline-none flex-1 min-h-[160px] font-medium leading-relaxed ${sec.textClass} placeholder-opacity-50`}
                placeholder="Enter content..."
              />
            </div>
          ))}
        </div>

        {/* Student Checklist Area */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Student Mastery Checklist</h2>
              <p className="text-slate-500 font-medium mt-1">Can you confidently explain these concepts?</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-500">{completedCount}</span>
              <span className="text-slate-400 font-bold"> / {CHECKLIST_ITEMS.length}</span>
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-8">
            <div
              className="bg-emerald-500 h-full transition-all duration-500 ease-out"
              style={{ width: \`\${(completedCount / CHECKLIST_ITEMS.length) * 100}%\` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHECKLIST_ITEMS.map((item, idx) => {
              const isChecked = checked[idx]
              return (
                <button
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  className={`flex items-start gap-4 p-4 rounded-2xl text-left transition-all border-2 ${
                    isChecked
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 ${isChecked ? 'text-emerald-500' : 'text-slate-300'}`}>
                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                  </div>
                  <span className={`font-bold text-sm ${isChecked ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-600 dark:text-slate-400'}`}>
                    {item}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </BuilderLayout>
  )
}
