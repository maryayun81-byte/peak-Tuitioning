'use client'

import React, { useState } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import { Map, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function PeriodicTrendsEngine() {
  const [isSaving, setIsSaving] = useState(false)
  const [activeTrend, setActiveTrend] = useState('radius')

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setIsSaving(false)
  }

  const trendsData = {
    radius: {
      title: 'Atomic Radius Across a Period',
      trendIcon: <TrendingDown className="text-blue-500" size={32} />,
      statement: 'Atomic radius DECREASES across a period.',
      explanationChain: [
        'Number of protons increases',
        'Nuclear charge increases',
        'Electrons are added to the same shell',
        'Shielding effect remains almost constant',
        'Nuclear force of attraction on outer electrons INCREASES',
        'Electron cloud is pulled closer to nucleus'
      ],
      kcseAnswer: 'Atomic radius decreases across a period because nuclear charge increases while the number of occupied energy levels remains the same. Therefore the outer electrons are pulled more strongly towards the nucleus.',
      visual: 'Na (Large) ⟶ Mg ⟶ Al ⟶ Si ⟶ P ⟶ S ⟶ Cl (Small)'
    },
    ionization: {
      title: 'First Ionization Energy',
      trendIcon: <TrendingUp className="text-rose-500" size={32} />,
      statement: 'First ionization energy INCREASES across a period.',
      explanationChain: [
        'Atomic radius decreases',
        'Outer electrons are closer to the nucleus',
        'Nuclear force of attraction becomes STRONGER',
        'More energy is required to remove an electron'
      ],
      kcseAnswer: 'Ionization energy increases across a period because nuclear charge increases and atomic radius decreases, causing stronger attraction between the nucleus and the outer electron.',
      visual: 'Na (Low Energy) ⟶ Mg ⟶ Al ⟶ Si ⟶ P ⟶ S ⟶ Cl (High Energy)'
    },
    affinity: {
      title: 'Electron Affinity',
      trendIcon: <TrendingUp className="text-emerald-500" size={32} />,
      statement: 'Electron affinity INCREASES across a period.',
      explanationChain: [
        'Atomic radius decreases',
        'Nuclear charge increases',
        'Nuclear attraction for an incoming extra electron INCREASES',
        'More energy is released when gaining an electron'
      ],
      kcseAnswer: 'Electron affinity increases across a period because atomic radius decreases and nuclear charge increases, so the nucleus attracts an incoming electron more strongly.',
      visual: 'Na (Weak Attraction) ⟶ Cl (Strong Attraction for e⁻)'
    },
    metallic: {
      title: 'Metallic Character',
      trendIcon: <TrendingDown className="text-amber-500" size={32} />,
      statement: 'Metallic character DECREASES across a period.',
      explanationChain: [
        'Metals react by losing electrons',
        'Across a period, nuclear attraction increases',
        'Outer electrons are held more strongly',
        'Elements lose electrons less easily'
      ],
      kcseAnswer: 'Metallic character decreases because nuclear attraction increases, making it harder for atoms to lose their valence electrons.',
      visual: 'Na, Mg, Al (Metals) ⟶ Si (Metalloid) ⟶ P, S, Cl (Non-metals)'
    }
  }

  const activeData = trendsData[activeTrend as keyof typeof trendsData]

  return (
    <BuilderLayout
      title="Periodic Trends Engine"
      subtitle="Trend Explanation Master"
      backHref="/teacher/resources/chemistry/periodic-table"
      isSaving={isSaving}
      onSave={handleSave}
    >
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-72 shrink-0 space-y-3">
          <div className="bg-slate-900 dark:bg-slate-800 p-4 rounded-2xl text-white shadow-lg mb-4">
            <h2 className="font-black flex items-center gap-2"><Map size={20} /> Select Trend</h2>
            <p className="text-xs text-slate-400 mt-1">Period 3 (Na to Ar)</p>
          </div>
          
          <button onClick={() => setActiveTrend('radius')} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${activeTrend === 'radius' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}>
            <h3 className="font-bold">Atomic Radius</h3>
          </button>
          <button onClick={() => setActiveTrend('ionization')} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${activeTrend === 'ionization' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}>
            <h3 className="font-bold">Ionization Energy</h3>
          </button>
          <button onClick={() => setActiveTrend('affinity')} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${activeTrend === 'affinity' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}>
            <h3 className="font-bold">Electron Affinity</h3>
          </button>
          <button onClick={() => setActiveTrend('metallic')} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${activeTrend === 'metallic' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}>
            <h3 className="font-bold">Metallic Character</h3>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-sm overflow-y-auto">
          
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-inner">
              {activeData.trendIcon}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">{activeData.title}</h1>
              <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mt-1">{activeData.statement}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Master Explanation Chain */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Master Explanation Chain</h3>
              <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900/50 ml-4 space-y-6 py-2">
                {activeData.explanationChain.map((step, idx) => (
                  <div key={idx} className="relative pl-6 animate-in slide-in-from-left-4 fade-in duration-300" style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}>
                    <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1.5 border-2 border-white dark:border-slate-900" />
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-xl shadow-sm text-sm font-bold text-indigo-900 dark:text-indigo-300">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Visual & KCSE */}
            <div className="space-y-8">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Period 3 Visual Map</h3>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                  {activeData.visual}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest">KCSE Standard Answer</h3>
                <div className="bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 p-6 rounded-r-2xl shadow-sm text-rose-900 dark:text-rose-200 font-medium leading-relaxed">
                  "{activeData.kcseAnswer}"
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </BuilderLayout>
  )
}
