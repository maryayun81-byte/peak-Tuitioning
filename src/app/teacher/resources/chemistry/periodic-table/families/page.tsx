'use client'

import React, { useState } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import { Users, FlaskConical, Shield, Battery, Atom, ShieldAlert } from 'lucide-react'

export default function ChemicalFamiliesEngine() {
  const [isSaving, setIsSaving] = useState(false)
  const [activeFamily, setActiveFamily] = useState('group1')

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setIsSaving(false)
  }

  const familiesData = {
    group1: {
      title: 'Group I: Alkali Metals',
      icon: <FlaskConical className="text-rose-500" size={32} />,
      elements: 'Li (2.1), Na (2.8.1), K (2.8.8.1)',
      baseRule: 'All have 1 outer electron and form +1 ions (e.g. Na → Na⁺ + e⁻).',
      trends: [
        {
          name: 'Atomic Radius',
          trend: 'Increases down the group.',
          why: 'Each element down the group has an extra electron shell. Outer electron is further from nucleus. Shielding increases.'
        },
        {
          name: 'First Ionization Energy',
          trend: 'Decreases down the group.',
          why: 'Atomic radius increases, shielding increases. Outer electron is further from nucleus so nuclear attraction becomes weaker. Less energy needed to remove it.'
        },
        {
          name: 'Reactivity',
          trend: 'Increases down the group (Li < Na < K).',
          why: 'Alkali metals react by losing one electron. Down the group, the outer electron is lost more easily due to weaker nuclear attraction.'
        }
      ],
      reactions: [
        {
          type: 'Reaction with Water',
          equation: '2Na(s) + 2H₂O(l) → 2NaOH(aq) + H₂(g)',
          obs: 'Lithium floats and moves slowly. Sodium melts into a ball and moves faster. Potassium burns with a lilac flame.'
        }
      ]
    },
    group2: {
      title: 'Group II: Alkaline Earth Metals',
      icon: <Battery className="text-orange-500" size={32} />,
      elements: 'Be (2.2), Mg (2.8.2), Ca (2.8.8.2)',
      baseRule: 'All have 2 outer electrons and form +2 ions (e.g. Mg → Mg²⁺ + 2e⁻).',
      trends: [
        {
          name: 'Atomic Radius',
          trend: 'Increases down the group.',
          why: 'More electron shells are added. Shielding increases.'
        },
        {
          name: '1st & 2nd Ionization Energy',
          trend: 'Both decrease down the group.',
          why: 'Atomic radius increases. Shielding increases. Outer electrons are further from nucleus, so nuclear attraction decreases.'
        },
        {
          name: 'Reactivity',
          trend: 'Increases down the group.',
          why: 'Group II metals react by losing two electrons. Down the group, they are lost more easily.'
        }
      ],
      reactions: [
        {
          type: 'Reaction with Acid',
          equation: 'Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂(g)',
          obs: 'Rapid effervescence. Magnesium dissolves.'
        },
        {
          type: 'Reaction with Water',
          equation: 'Ca(s) + 2H₂O(l) → Ca(OH)₂(aq) + H₂(g)',
          obs: 'Calcium reacts steadily with cold water, forming a cloudy suspension.'
        }
      ]
    },
    group7: {
      title: 'Group VII: Halogens',
      icon: <ShieldAlert className="text-emerald-500" size={32} />,
      elements: 'F (2.7), Cl (2.8.7), Br (2.8.18.7), I',
      baseRule: 'All have 7 outer electrons and form -1 ions (e.g. Cl + e⁻ → Cl⁻). They exist as diatomic molecules (Cl₂).',
      trends: [
        {
          name: 'Electron Affinity',
          trend: 'Decreases down the group.',
          why: 'Atomic radius increases. Incoming electron is added further from nucleus. Shielding increases. Nuclear attraction for incoming electron decreases.'
        },
        {
          name: 'Reactivity',
          trend: 'Decreases down the group (F₂ > Cl₂ > Br₂ > I₂).',
          why: 'Halogens react by gaining electrons. Down the group, attraction for incoming electron becomes weaker.'
        }
      ],
      reactions: [
        {
          type: 'Displacement Reactions',
          equation: 'Cl₂(g) + 2KBr(aq) → 2KCl(aq) + Br₂(aq)',
          obs: 'A more reactive halogen displaces a less reactive halogen. Solution turns orange/brown as bromine is displaced.'
        }
      ]
    },
    group8: {
      title: 'Group VIII: Noble Gases',
      icon: <Atom className="text-purple-500" size={32} />,
      elements: 'He (2), Ne (2.8), Ar (2.8.8)',
      baseRule: 'They have full outer electron shells.',
      trends: [
        {
          name: 'Chemical Stability',
          trend: 'Extremely stable / Unreactive',
          why: 'They already have a stable full outer energy level. They do not need to gain, lose, or share electrons.'
        }
      ],
      reactions: []
    }
  }

  const activeData = familiesData[activeFamily as keyof typeof familiesData]

  return (
    <BuilderLayout
      title="Chemical Families Pack"
      subtitle="Groups I, II, VII & VIII"
      backHref="/teacher/resources/chemistry/periodic-table"
      isSaving={isSaving}
      onSave={handleSave}
    >
      <div className="flex flex-col h-full max-w-5xl mx-auto">
        
        {/* Top Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
          <button onClick={() => setActiveFamily('group1')} className={`p-4 rounded-2xl border-2 font-bold transition-all ${activeFamily === 'group1' ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>Group I</button>
          <button onClick={() => setActiveFamily('group2')} className={`p-4 rounded-2xl border-2 font-bold transition-all ${activeFamily === 'group2' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>Group II</button>
          <button onClick={() => setActiveFamily('group7')} className={`p-4 rounded-2xl border-2 font-bold transition-all ${activeFamily === 'group7' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>Group VII</button>
          <button onClick={() => setActiveFamily('group8')} className={`p-4 rounded-2xl border-2 font-bold transition-all ${activeFamily === 'group8' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>Group VIII</button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-sm overflow-y-auto animate-in fade-in duration-300">
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
              {activeData.icon}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">{activeData.title}</h1>
              <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mt-1">{activeData.elements}</p>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-8 font-bold text-slate-700 dark:text-slate-300">
            {activeData.baseRule}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Trends Column */}
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 border-b-2 border-slate-200 pb-2">Key Trends Down Group</h3>
              {activeData.trends.map((t, idx) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h4 className="font-black text-slate-800 uppercase tracking-wide text-sm mb-2">{t.name}</h4>
                  <p className="font-bold text-slate-700 mb-2">{t.trend}</p>
                  <p className="text-sm text-slate-600 border-l-2 border-slate-300 pl-3 italic">Why? {t.why}</p>
                </div>
              ))}
            </div>

            {/* Reactions Column */}
            {activeData.reactions.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-900 border-b-2 border-slate-200 pb-2">Key Reactions</h3>
                {activeData.reactions.map((r, idx) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <h4 className="font-black text-slate-800 uppercase tracking-wide text-sm mb-2">{r.type}</h4>
                    <p className="font-mono font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 mb-3">{r.equation}</p>
                    <p className="text-sm text-slate-600 font-medium">Obs: {r.obs}</p>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>
    </BuilderLayout>
  )
}
