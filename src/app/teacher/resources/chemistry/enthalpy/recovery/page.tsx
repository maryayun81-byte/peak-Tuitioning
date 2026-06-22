"use client";

import React, { useState } from 'react';
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout';
import { BookOpen, AlertCircle, Lightbulb, CheckCircle2 } from 'lucide-react';

export default function TopicRecoveryPackPage() {
  const [checklist, setChecklist] = useState({
    mcDeltaT: false,
    signs: false,
    hess: false,
    definitions: false,
  });

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <BuilderLayout
      title="Topic Recovery Pack"
      subtitle="Enthalpy Changes Engine"
      backHref="/teacher/resources/chemistry/enthalpy"
    >
      <div className="space-y-8 max-w-4xl mx-auto p-6">
        
        {/* Section 1: Key Definitions */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">1. Key Definitions</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Combustion:</span> 1 mole of a substance reacts completely with oxygen under standard conditions.
            </div>
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Neutralization:</span> 1 mole of water is formed from an acid and alkali under standard conditions.
            </div>
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Solution:</span> 1 mole of solute dissolves completely in sufficient solvent to form a solution.
            </div>
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Hydration:</span> 1 mole of gaseous ions dissolve in water to form 1 mole of aqueous ions.
            </div>
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg md:col-span-2">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Lattice:</span> 1 mole of an ionic crystal lattice is formed from its constituent gaseous ions under standard conditions.
            </div>
          </div>
        </section>

        {/* Section 2: Golden Rules */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-cyan-100 dark:border-cyan-900/30 overflow-hidden">
          <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 border-b border-cyan-100 dark:border-cyan-900/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-lg font-semibold text-cyan-900 dark:text-cyan-100">2. Golden Rules</h2>
          </div>
          <div className="p-5 space-y-3 text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 flex-shrink-0"></div>
              <p><strong className="text-cyan-700 dark:text-cyan-400">BENDO MEXO:</strong> Breaking bonds is Endothermic (+), Making bonds is Exothermic (-).</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 flex-shrink-0"></div>
              <p><strong className="text-cyan-700 dark:text-cyan-400">ΔH = H(products) - H(reactants):</strong> Always final minus initial.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Common Examples */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">3. Common Examples</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-4 text-gray-700 dark:text-gray-300">
              <li className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md text-sm font-bold flex-shrink-0">Exothermic (-ΔH)</span>
                <span className="flex-1">Combustion is always exothermic. Neutralization is exothermic.</span>
              </li>
              <li className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md text-sm font-bold flex-shrink-0">Endothermic (+ΔH)</span>
                <span className="flex-1">Thermal decomposition, breaking bonds.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Mastery Checklist */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-cyan-100 dark:border-cyan-900/30 overflow-hidden">
          <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 border-b border-cyan-100 dark:border-cyan-900/30 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-lg font-semibold text-cyan-900 dark:text-cyan-100">4. Mastery Checklist</h2>
          </div>
          <div className="p-5 space-y-3">
            <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
              <input type="checkbox" checked={checklist.mcDeltaT} onChange={() => toggleCheck('mcDeltaT')} className="w-5 h-5 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500" />
              <span className={`text-gray-700 dark:text-gray-300 ${checklist.mcDeltaT ? 'line-through opacity-50' : ''}`}>I can use q = mcΔT to calculate heat transferred.</span>
            </label>
            <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
              <input type="checkbox" checked={checklist.signs} onChange={() => toggleCheck('signs')} className="w-5 h-5 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500" />
              <span className={`text-gray-700 dark:text-gray-300 ${checklist.signs ? 'line-through opacity-50' : ''}`}>I remember to change signs correctly depending on the process (endo/exo).</span>
            </label>
          </div>
        </section>
        
      </div>
    </BuilderLayout>
  );
}
