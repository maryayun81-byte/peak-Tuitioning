'use client';

import { useState } from 'react';
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout';
import { Trash2, PlusCircle, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';

interface Trap {
  id: number;
  question: string;
  answer: string;
  note: string;
}

const initialTraps: Trap[] = [
  {
    id: 1,
    question: 'Why does graphite conduct electricity but diamond does not?',
    answer:
      'In graphite, each carbon forms 3 covalent bonds, leaving 1 delocalized electron per carbon free to carry charge. In diamond, all 4 electrons are used in bonding — none are free.',
    note: 'Students always write "graphite has free electrons" without explaining WHERE they come from. Explain the 3-bond structure!',
  },
  {
    id: 2,
    question: 'Why is diamond hard?',
    answer:
      'Diamond has a 3D network of covalent bonds in all directions. To deform it, covalent bonds must be broken — this requires enormous energy.',
    note: 'Do NOT just say "strong bonds". You must specify the 3D network structure.',
  },
  {
    id: 3,
    question: 'Why does NaCl conduct when molten but not when solid?',
    answer:
      'In solid NaCl, ions are held in fixed lattice positions and cannot move. When molten, the lattice breaks down and ions are free to move and carry charge.',
    note: 'This is the single most common conductivity trap in KCSE.',
  },
  {
    id: 4,
    question: 'Why does CO₂ have a low boiling point?',
    answer:
      'CO₂ is a simple molecular substance. There are only weak intermolecular forces between CO₂ molecules. Little energy is needed to overcome these — so it has a low boiling point.',
    note: 'Students incorrectly say "covalent bonds are weak." The covalent bonds ARE strong. It is the intermolecular forces that are weak.',
  },
  {
    id: 5,
    question: 'What is the difference between giant ionic and giant covalent structures?',
    answer:
      'Giant ionic: held together by electrostatic forces between oppositely charged ions. Giant covalent: held together by covalent bonds between atoms throughout the network.',
    note: 'Both have high melting points but for different reasons — ionic (electrostatic) vs covalent (covalent bonds).',
  },
  {
    id: 6,
    question: 'Why does iodine (I₂) sublime easily?',
    answer:
      'Iodine is a simple molecular substance. Only weak van der Waals forces exist between I₂ molecules. Very little energy is needed to overcome these.',
    note: 'Despite iodine being relatively heavy, the intermolecular forces are still considered weak compared to ionic or covalent network forces.',
  },
  {
    id: 7,
    question: 'Why are metals malleable?',
    answer:
      'When layers of metal ions slide, the sea of delocalized electrons reorganizes and maintains the metallic bonding. No bonds are broken.',
    note: 'The KEY point is that the electron sea allows the bond to be maintained even after deformation — unlike ionic where layers cracking causes repulsion.',
  },
  {
    id: 8,
    question: 'Why does MgO have a higher melting point than NaCl?',
    answer:
      'MgO contains Mg²⁺ and O²⁻ ions (2+ and 2- charges). NaCl contains Na⁺ and Cl⁻ (1+ and 1- charges). The greater charge means stronger electrostatic attraction in MgO.',
    note: 'Charge density concept: higher charge + smaller ion = stronger attraction = higher melting point.',
  },
];

export default function TrapsPage() {
  const [traps, setTraps] = useState<Trap[]>(initialTraps);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (id: number, field: keyof Trap, value: string) => {
    setTraps((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const addTrap = () => {
    const newId = traps.length ? Math.max(...traps.map((t) => t.id)) + 1 : 1;
    setTraps((prev) => [
      ...prev,
      { id: newId, question: '', answer: '', note: '' },
    ]);
  };

  const deleteTrap = (id: number) => {
    setTraps((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
  };

  return (
    <BuilderLayout
      title="Examiner Traps Pack"
      subtitle="Structure & Bonding Engine"
      backHref="/teacher/resources/chemistry/structure-bonding"
      isSaving={isSaving}
      onSave={handleSave}
    >
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-semibold">
              {traps.length} examiner trap{traps.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={addTrap}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors shadow"
          >
            <PlusCircle className="w-4 h-4" />
            Add Trap
          </button>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {traps.map((trap, idx) => (
            <div
              key={trap.id}
              className="group relative rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-gray-900 shadow-md hover:shadow-xl transition-shadow overflow-hidden"
            >
              {/* Card number badge */}
              <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center z-10">
                {idx + 1}
              </div>

              {/* Delete button */}
              <button
                onClick={() => deleteTrap(trap.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all opacity-0 group-hover:opacity-100 z-10"
                aria-label="Delete trap"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="p-4 pt-10 space-y-3">
                {/* Question */}
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5 text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Question
                    </span>
                  </div>
                  <textarea
                    value={trap.question}
                    onChange={(e) => handleChange(trap.id, 'question', e.target.value)}
                    rows={2}
                    className="w-full bg-transparent resize-none focus:outline-none text-sm text-rose-900 dark:text-rose-100 placeholder-rose-300 dark:placeholder-rose-700"
                    placeholder="Enter the exam question..."
                  />
                </div>

                {/* Answer */}
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Model Answer
                    </span>
                  </div>
                  <textarea
                    value={trap.answer}
                    onChange={(e) => handleChange(trap.id, 'answer', e.target.value)}
                    rows={3}
                    className="w-full bg-transparent resize-none focus:outline-none text-sm text-emerald-900 dark:text-emerald-100 placeholder-emerald-300 dark:placeholder-emerald-700"
                    placeholder="Enter the model answer..."
                  />
                </div>

                {/* Note */}
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5 text-amber-700 dark:text-amber-400">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Examiner Note
                    </span>
                  </div>
                  <textarea
                    value={trap.note}
                    onChange={(e) => handleChange(trap.id, 'note', e.target.value)}
                    rows={2}
                    className="w-full bg-transparent resize-none focus:outline-none text-sm text-amber-900 dark:text-amber-100 placeholder-amber-300 dark:placeholder-amber-700"
                    placeholder="Add examiner insight..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BuilderLayout>
  );
}
