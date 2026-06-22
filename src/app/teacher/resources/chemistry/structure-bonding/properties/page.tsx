'use client'

import React, { useState } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import { Compass, ChevronDown, ChevronRight, Activity } from 'lucide-react'

const PROPERTY_DATA = [
  {
    id: 'melting',
    title: 'Melting Point & Boiling Point',
    icon: '🌡️',
    color: 'bg-rose-50 border-rose-200',
    accentColor: 'text-rose-600',
    entries: [
      {
        structure: 'Giant Ionic',
        examples: 'NaCl, MgO, CaCl₂',
        value: 'HIGH',
        valueColor: 'bg-rose-500',
        chain: ['Giant Ionic Lattice', 'Strong Electrostatic Forces Between Ions', 'Large Energy Required to Overcome', 'HIGH Melting Point'],
        tip: 'MgO has a higher melting point than NaCl because Mg²⁺ has a higher charge density than Na⁺ (smaller ion, higher charge).'
      },
      {
        structure: 'Simple Molecular',
        examples: 'CO₂, H₂O, I₂, CH₄',
        value: 'LOW',
        valueColor: 'bg-emerald-500',
        chain: ['Small Discrete Molecules', 'Weak Intermolecular Forces Between Molecules', 'Small Energy Required', 'LOW Melting Point'],
        tip: 'Covalent bonds WITHIN molecules are strong — it is the forces BETWEEN molecules that are weak. Students confuse these!'
      },
      {
        structure: 'Giant Covalent',
        examples: 'Diamond, Graphite, SiO₂',
        value: 'VERY HIGH',
        valueColor: 'bg-rose-700',
        chain: ['3D Network of Atoms', 'Strong Covalent Bonds Throughout', 'Enormous Energy Required', 'VERY HIGH Melting Point'],
        tip: 'Giant covalent structures must break actual covalent bonds to melt — this takes far more energy than breaking ionic or metallic bonds.'
      },
      {
        structure: 'Metallic',
        examples: 'Cu, Fe, Mg, Al',
        value: 'HIGH',
        valueColor: 'bg-amber-500',
        chain: ['Metal Ion Lattice', 'Strong Electrostatic Attraction (Ions + Electrons)', 'Large Energy Required', 'HIGH Melting Point'],
        tip: 'Metals with more delocalized electrons per atom (e.g., Al with 3) have stronger metallic bonds than those with fewer (e.g., Na with 1).'
      }
    ]
  },
  {
    id: 'conductivity',
    title: 'Electrical Conductivity',
    icon: '⚡',
    color: 'bg-blue-50 border-blue-200',
    accentColor: 'text-blue-600',
    entries: [
      {
        structure: 'Giant Ionic (Solid)',
        examples: 'NaCl(s)',
        value: 'NO',
        valueColor: 'bg-slate-500',
        chain: ['Ions Fixed in Lattice Positions', 'Cannot Move to Carry Charge', 'NO Conduction'],
        tip: 'Even though NaCl has ions, they cannot move in the solid state — the lattice holds them rigidly in place.'
      },
      {
        structure: 'Giant Ionic (Molten/Aqueous)',
        examples: 'NaCl(l), NaCl(aq)',
        value: 'YES',
        valueColor: 'bg-blue-500',
        chain: ['Ions Free to Move', 'Carry Charge Toward Electrodes', 'YES Conduction'],
        tip: 'This is the KCSE examiner\'s favourite trap — ionic solids do NOT conduct but their melt/solution DOES.'
      },
      {
        structure: 'Simple Molecular',
        examples: 'CO₂, H₂O, I₂',
        value: 'NO',
        valueColor: 'bg-slate-500',
        chain: ['Molecules Have No Charge', 'No Mobile Ions or Electrons', 'NO Conduction'],
        tip: 'Iodine (I₂) is a common trap — it is non-polar and covalent, so it does NOT conduct electricity.'
      },
      {
        structure: 'Giant Covalent (Diamond)',
        examples: 'Diamond',
        value: 'NO',
        valueColor: 'bg-slate-500',
        chain: ['All 4 Electrons Used in Bonding', 'No Delocalized/Free Electrons', 'NO Conduction'],
        tip: 'Every carbon atom in diamond uses all 4 outer electrons to form covalent bonds — none are free to move.'
      },
      {
        structure: 'Giant Covalent (Graphite)',
        examples: 'Graphite',
        value: 'YES',
        valueColor: 'bg-purple-500',
        chain: ['Each Carbon Bonded to 3 Others', '1 Electron Per Carbon Delocalized', 'Electrons Move Between Layers', 'YES Conduction'],
        tip: 'Graphite\'s unique layer structure leaves one electron per carbon delocalized — THIS is why graphite conducts but diamond does not.'
      },
      {
        structure: 'Metallic',
        examples: 'Cu, Fe, Al',
        value: 'YES',
        valueColor: 'bg-amber-500',
        chain: ['Sea of Delocalized Electrons', 'Electrons Move Freely Throughout', 'YES Conduction'],
        tip: 'Metals conduct in BOTH solid AND liquid state (unlike ionic compounds which only conduct when molten).'
      }
    ]
  },
  {
    id: 'solubility',
    title: 'Solubility',
    icon: '💧',
    color: 'bg-cyan-50 border-cyan-200',
    accentColor: 'text-cyan-600',
    entries: [
      { structure: 'Giant Ionic', examples: 'NaCl, KBr', value: 'SOLUBLE in Water', valueColor: 'bg-cyan-500', chain: ['Polar Water Molecules', 'Attract Ions from Lattice', 'Ions Hydrated and Dispersed'], tip: 'Ionic compounds dissolve in polar solvents (water) but NOT non-polar solvents like hexane.' },
      { structure: 'Simple Molecular (Polar)', examples: 'H₂O, HCl, NH₃', value: 'SOLUBLE', valueColor: 'bg-cyan-500', chain: ['Polar Molecule', 'Interacts with Polar Water', 'Dissolves'], tip: '"Like dissolves like" — polar dissolves in polar.' },
      { structure: 'Simple Molecular (Non-polar)', examples: 'I₂, CCl₄', value: 'INSOLUBLE in Water', valueColor: 'bg-slate-500', chain: ['Non-polar Molecule', 'Cannot Interact with Polar Water', 'Does NOT Dissolve'], tip: 'Iodine does NOT dissolve well in water but dissolves in non-polar hexane.' }
    ]
  }
]

export default function PropertyExplorer() {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  return (
    <BuilderLayout
      title="Property Explorer"
      subtitle="Structure & Bonding Engine"
      backHref="/teacher/resources/chemistry/structure-bonding"
      isSaving={false}
      onSave={() => {}}
    >
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="max-w-4xl mx-auto p-8 space-y-10">

          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Compass size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Property Explorer</h1>
              <p className="text-slate-500 text-sm mt-1">Trace WHY each structure has each property — never memorize again.</p>
            </div>
          </div>

          {PROPERTY_DATA.map(section => (
            <section key={section.id} className="space-y-4">
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${section.color} dark:bg-transparent dark:border-slate-800`}>
                <span className="text-3xl">{section.icon}</span>
                <h2 className={`text-xl font-black ${section.accentColor}`}>{section.title}</h2>
              </div>

              <div className="space-y-3">
                {section.entries.map((entry, i) => {
                  const key = `${section.id}-${i}`
                  const isOpen = expandedEntry === key
                  return (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => setExpandedEntry(isOpen ? null : key)}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1.5 rounded-full text-white text-xs font-black ${entry.valueColor}`}>
                            {entry.value}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{entry.structure}</p>
                            <p className="text-xs text-slate-500">{entry.examples}</p>
                          </div>
                        </div>
                        {isOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {/* Visual chain */}
                          <div className="flex flex-col items-start gap-1">
                            {entry.chain.map((step, idx) => (
                              <React.Fragment key={idx}>
                                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 w-full">
                                  {step}
                                </div>
                                {idx < entry.chain.length - 1 && (
                                  <div className="text-slate-300 dark:text-slate-600 text-lg self-center leading-none">↓</div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                          {/* Examiner tip */}
                          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl">
                            <Activity size={18} className="text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-amber-900 dark:text-amber-300 font-semibold">{entry.tip}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

        </div>
      </div>
    </BuilderLayout>
  )
}
