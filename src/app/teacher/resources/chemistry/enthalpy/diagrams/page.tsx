"use client";

import React, { useState } from "react";
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout';

export default function EnergyDiagramsVisualizerPage() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setIsSaving(false)
  }

  const [exothermicExp, setExothermicExp] = useState(
    "In an exothermic reaction, the products have lower energy than the reactants. Energy is released to the surroundings, so ΔH is negative."
  );
  const [endothermicExp, setEndothermicExp] = useState(
    "In an endothermic reaction, the products have higher energy than the reactants. Energy is absorbed from the surroundings, so ΔH is positive."
  );
  const [activationExp, setActivationExp] = useState(
    "Activation energy (Ea) is the minimum energy required to start a chemical reaction, represented by the energy barrier or 'hump' in the diagram."
  );

  return (
    <BuilderLayout
      title="Energy Diagrams Visualizer"
      subtitle="Enthalpy Changes Engine"
      backHref="/teacher/resources/chemistry/enthalpy"
      isSaving={isSaving}
      onSave={handleSave}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        
        {/* Exothermic Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-orange-200 dark:border-orange-900 overflow-hidden flex flex-col">
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 border-b border-orange-100 dark:border-orange-800">
            <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400">Exothermic Reaction</h3>
            <p className="text-sm text-orange-600 dark:text-orange-500">ΔH &lt; 0 (Energy Released)</p>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center">
            <div className="w-full aspect-square max-w-[250px] mb-6">
              <svg viewBox="0 0 200 200" className="w-full h-full text-orange-500">
                {/* Axes */}
                <line x1="20" y1="20" x2="20" y2="180" stroke="currentColor" strokeWidth="2" />
                <line x1="20" y1="180" x2="180" y2="180" stroke="currentColor" strokeWidth="2" />
                <text x="10" y="100" transform="rotate(-90 10 100)" fill="currentColor" fontSize="12" textAnchor="middle">Energy</text>
                <text x="100" y="195" fill="currentColor" fontSize="12" textAnchor="middle">Progress of Reaction</text>
                
                {/* Curve */}
                <path d="M 30 80 L 70 80 Q 100 80 120 40 Q 140 140 180 140" fill="none" stroke="currentColor" strokeWidth="4" />
                
                {/* Labels */}
                <text x="50" y="70" fill="currentColor" fontSize="12" textAnchor="middle">Reactants</text>
                <text x="160" y="130" fill="currentColor" fontSize="12" textAnchor="middle">Products</text>
                
                {/* Delta H */}
                <line x1="70" y1="80" x2="160" y2="80" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="160" y1="80" x2="160" y2="140" stroke="currentColor" strokeWidth="1" />
                <polygon points="156,136 164,136 160,140" fill="currentColor" />
                <polygon points="156,84 164,84 160,80" fill="currentColor" />
                <text x="175" y="115" fill="currentColor" fontSize="12" textAnchor="middle">ΔH</text>
              </svg>
            </div>
            <textarea
              value={exothermicExp}
              onChange={(e) => setExothermicExp(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none flex-1 min-h-[120px]"
              placeholder="Explain exothermic reactions..."
            />
          </div>
        </div>

        {/* Endothermic Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-blue-200 dark:border-blue-900 overflow-hidden flex flex-col">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border-b border-blue-100 dark:border-blue-800">
            <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400">Endothermic Reaction</h3>
            <p className="text-sm text-blue-600 dark:text-blue-500">ΔH &gt; 0 (Energy Absorbed)</p>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center">
            <div className="w-full aspect-square max-w-[250px] mb-6">
              <svg viewBox="0 0 200 200" className="w-full h-full text-blue-500">
                {/* Axes */}
                <line x1="20" y1="20" x2="20" y2="180" stroke="currentColor" strokeWidth="2" />
                <line x1="20" y1="180" x2="180" y2="180" stroke="currentColor" strokeWidth="2" />
                <text x="10" y="100" transform="rotate(-90 10 100)" fill="currentColor" fontSize="12" textAnchor="middle">Energy</text>
                <text x="100" y="195" fill="currentColor" fontSize="12" textAnchor="middle">Progress of Reaction</text>
                
                {/* Curve */}
                <path d="M 30 140 L 70 140 Q 100 140 120 40 Q 140 80 180 80" fill="none" stroke="currentColor" strokeWidth="4" />
                
                {/* Labels */}
                <text x="50" y="155" fill="currentColor" fontSize="12" textAnchor="middle">Reactants</text>
                <text x="160" y="70" fill="currentColor" fontSize="12" textAnchor="middle">Products</text>
                
                {/* Delta H */}
                <line x1="70" y1="140" x2="160" y2="140" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="160" y1="140" x2="160" y2="80" stroke="currentColor" strokeWidth="1" />
                <polygon points="156,84 164,84 160,80" fill="currentColor" />
                <polygon points="156,136 164,136 160,140" fill="currentColor" />
                <text x="175" y="115" fill="currentColor" fontSize="12" textAnchor="middle">ΔH</text>
              </svg>
            </div>
            <textarea
              value={endothermicExp}
              onChange={(e) => setEndothermicExp(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none flex-1 min-h-[120px]"
              placeholder="Explain endothermic reactions..."
            />
          </div>
        </div>

        {/* Activation Energy Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-emerald-200 dark:border-emerald-900 overflow-hidden flex flex-col">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 border-b border-emerald-100 dark:border-emerald-800">
            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Activation Energy</h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-500">Ea (Energy Barrier)</p>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center">
            <div className="w-full aspect-square max-w-[250px] mb-6">
              <svg viewBox="0 0 200 200" className="w-full h-full text-emerald-500">
                {/* Axes */}
                <line x1="20" y1="20" x2="20" y2="180" stroke="currentColor" strokeWidth="2" />
                <line x1="20" y1="180" x2="180" y2="180" stroke="currentColor" strokeWidth="2" />
                <text x="10" y="100" transform="rotate(-90 10 100)" fill="currentColor" fontSize="12" textAnchor="middle">Energy</text>
                <text x="100" y="195" fill="currentColor" fontSize="12" textAnchor="middle">Progress of Reaction</text>
                
                {/* Curve */}
                <path d="M 30 110 L 70 110 Q 100 110 120 40 Q 140 140 180 140" fill="none" stroke="currentColor" strokeWidth="4" />
                
                {/* Labels */}
                <text x="50" y="125" fill="currentColor" fontSize="12" textAnchor="middle">Reactants</text>
                
                {/* Ea */}
                <line x1="70" y1="110" x2="120" y2="110" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="120" y1="110" x2="120" y2="40" stroke="currentColor" strokeWidth="1" />
                <polygon points="116,44 124,44 120,40" fill="currentColor" />
                <polygon points="116,106 124,106 120,110" fill="currentColor" />
                <text x="135" y="80" fill="currentColor" fontSize="12" textAnchor="middle">Ea</text>
              </svg>
            </div>
            <textarea
              value={activationExp}
              onChange={(e) => setActivationExp(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none flex-1 min-h-[120px]"
              placeholder="Explain activation energy..."
            />
          </div>
        </div>

      </div>
    </BuilderLayout>
  );
}
