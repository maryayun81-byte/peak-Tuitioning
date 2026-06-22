'use client'

import { useState } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import { Trash2, PlusCircle, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react'

interface Trap {
  id: number
  question: string
  answer: string
  note: string
}

const initialTraps: Trap[] = [
  {
    id: 1,
    question: 'Why does atomic radius decrease across a period?',
    answer: 'Because nuclear charge increases while the number of shells remains constant. Therefore the outer electrons are pulled more strongly towards the nucleus.',
    note: 'Students often incorrectly write "because the number of protons and electrons increases so they attract each other more." You must specify that SHELLS REMAIN CONSTANT while nuclear charge increases.'
  },
  {
    id: 2,
    question: 'Why does ionization energy decrease down Group I?',
    answer: 'Because atomic radius and shielding increase, so the outer electron is further from the nucleus and less strongly attracted. Thus less energy is needed to remove it.',
    note: 'Always mention BOTH atomic radius (distance) and shielding effect.'
  },
  {
    id: 3,
    question: 'Why is potassium more reactive than sodium?',
    answer: 'Potassium has a larger atomic radius and more shielding than sodium, so its outer electron is lost more easily due to weaker nuclear attraction.',
    note: 'Reactivity for metals is about how easily they LOSE electrons.'
  },
  {
    id: 4,
    question: 'Why is chlorine more reactive than iodine?',
    answer: 'Chlorine has a smaller atomic radius and less shielding, so it attracts an incoming electron more strongly.',
    note: 'Reactivity for non-metals is about how easily they GAIN electrons.'
  },
  {
    id: 5,
    question: 'Why are noble gases unreactive?',
    answer: 'They have full, stable outer energy levels. They do not need to gain, lose, or share electrons.',
    note: 'Do not just say "they are stable". Specify they have full outer energy levels (duplet for He, octet for rest).'
  },
  {
    id: 6,
    question: 'Why is Na⁺ smaller than Na?',
    answer: 'Na loses its entire outer electron shell when it forms Na⁺, leaving it with one less occupied energy level.',
    note: 'This is the classic cation radius trap.'
  },
  {
    id: 7,
    question: 'Why is Cl⁻ larger than Cl?',
    answer: 'Cl gains an electron, which increases electron-electron repulsion in the outer shell, causing the electron cloud to expand.',
    note: 'The number of shells remains the same, the expansion is purely due to repulsion.'
  },
  {
    id: 8,
    question: 'Why is second ionization energy greater than first ionization energy?',
    answer: 'After the first electron is removed, the ion becomes positive and holds the remaining electrons more strongly, requiring more energy to remove the next one.',
    note: 'A very common 2-mark question in KCSE.'
  }
]

export default function PeriodicTrapsPage() {
  const [traps, setTraps] = useState<Trap[]>(initialTraps)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (id: number, field: keyof Trap, value: string) => {
    setTraps(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const addTrap = () => {
    const newId = traps.length ? Math.max(...traps.map(t => t.id)) + 1 : 1
    setTraps(prev => [...prev, { id: newId, question: '', answer: '', note: '' }])
  }

  const deleteTrap = (id: number) => {
    setTraps(prev => prev.filter(t => t.id !== id))
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setIsSaving(false)
  }

  return (
    <BuilderLayout
      title="Examiner Traps Pack"
      subtitle="Periodic Table & Trends"
      backHref="/teacher/resources/chemistry/periodic-table"
      isSaving={isSaving}
      onSave={handleSave}
    >
      <div className="space-y-6">
        
        {/* Header Area */}
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50">
          <div>
            <h2 className="text-xl font-black text-amber-900 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" />
              KCSE Examiner Traps
            </h2>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-500 mt-1">
              Common explanation errors on nuclear charge, shielding, and ionic radius.
            </p>
          </div>
          <button
            onClick={addTrap}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors shadow"
          >
            <PlusCircle className="w-5 h-5" />
            Add Trap
          </button>
        </div>

        {/* Grid of Traps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {traps.map((trap) => (
            <div
              key={trap.id}
              className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-all hover:border-amber-300 dark:hover:border-amber-700"
            >
              {/* Question */}
              <div className="bg-rose-50 dark:bg-rose-900/10 p-4 border-b border-rose-100 dark:border-rose-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-rose-500" />
                  <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Common Question</span>
                </div>
                <textarea
                  value={trap.question}
                  onChange={(e) => handleChange(trap.id, 'question', e.target.value)}
                  className="w-full bg-transparent text-rose-950 dark:text-rose-100 font-bold placeholder-rose-300 resize-none outline-none"
                  rows={2}
                  placeholder="Enter common question..."
                />
              </div>

              {/* Answer */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 border-b border-emerald-100 dark:border-emerald-900/30 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Correct Answer</span>
                </div>
                <textarea
                  value={trap.answer}
                  onChange={(e) => handleChange(trap.id, 'answer', e.target.value)}
                  className="w-full bg-transparent text-emerald-900 dark:text-emerald-100 text-sm font-medium placeholder-emerald-300 resize-none outline-none h-full min-h-[80px]"
                  placeholder="Enter the correct explanation..."
                />
              </div>

              {/* Examiner Note */}
              <div className="bg-amber-50 dark:bg-amber-900/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Examiner Note</span>
                </div>
                <textarea
                  value={trap.note}
                  onChange={(e) => handleChange(trap.id, 'note', e.target.value)}
                  className="w-full bg-transparent text-amber-900 dark:text-amber-200 text-sm font-semibold placeholder-amber-300/50 resize-none outline-none"
                  rows={2}
                  placeholder="Add an examiner tip..."
                />
              </div>

              {/* Delete Button */}
              <button
                onClick={() => deleteTrap(trap.id)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 opacity-0 group-hover:opacity-100 transition-all shadow-sm backdrop-blur"
                aria-label="Delete trap"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        
      </div>
    </BuilderLayout>
  )
}
