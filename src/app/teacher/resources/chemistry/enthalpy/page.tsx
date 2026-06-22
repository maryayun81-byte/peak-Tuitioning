import Link from 'next/link'
import { Flame, Activity, Calculator, Map, AlertTriangle, ShieldCheck, ArrowRight, Share2, Printer, Save, BrainCircuit, Lightbulb } from 'lucide-react'

export default function EnthalpyHub() {
  const engines = [
    {
      title: "Energy Diagrams Visualizer",
      description: "Interactive canvas for Exo/Endothermic curves and Activation Energy.",
      icon: <Activity className="text-rose-500" size={24} />,
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-900",
      href: "/teacher/resources/chemistry/enthalpy/diagrams",
      stats: "3 Diagrams"
    },
    {
      title: "Calorimetry & Calculations",
      description: "Step-by-step KCSE calculation flows (mcΔT, Moles, Bond Energies).",
      icon: <Calculator className="text-amber-500" size={24} />,
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-900",
      href: "/teacher/resources/chemistry/enthalpy/calculations",
      stats: "Formulas & Flow"
    },
    {
      title: "Hess's Law & Cycles Builder",
      description: "ReactFlow map for building Hess Cycles and Solution Energy Cycles.",
      icon: <Map className="text-purple-500" size={24} />,
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-900",
      href: "/teacher/resources/chemistry/enthalpy/hess",
      stats: "Interactive Map"
    },
    {
      title: "Examiner Traps Pack",
      description: "Common KCSE pitfalls: missing signs, volume vs mass, missing unit conversions.",
      icon: <AlertTriangle className="text-red-500" size={24} />,
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-900",
      href: "/teacher/resources/chemistry/enthalpy/traps",
      stats: "9 Traps"
    },
    {
      title: "Topic Recovery Pack",
      description: "Definitions, Golden Rules, and Mastery Checklist for struggling students.",
      icon: <ShieldCheck className="text-emerald-500" size={24} />,
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-900",
      href: "/teacher/resources/chemistry/enthalpy/recovery",
      stats: "Recovery Plan"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-20">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/teacher/resources/chemistry"
              className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              ← Back to Chemistry
            </Link>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Flame size={18} />
              <span className="font-black tracking-widest uppercase text-xs">Enthalpy Engine</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold transition-all">
              <Share2 size={16} />
              Share Hub
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-orange-500/20">
              <Printer size={16} />
              Export Full Engine
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-12 pb-16">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-sm font-black tracking-widest uppercase mb-6">
            <Flame size={16} />
            Mastery Engine™
          </div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
            Enthalpy Changes
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
            Help students master energy changes, definitions, diagrams, Hess's law, and KCSE calculations visually—not through memorization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {engines.map((engine, idx) => (
            <Link 
              href={engine.href} 
              key={idx}
              className={`group relative bg-white dark:bg-slate-900 border-2 ${engine.border} rounded-3xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-full transition-transform duration-500 group-hover:scale-110 ${engine.bg}`} />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${engine.bg}`}>
                    {engine.icon}
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold">
                    {engine.stats}
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">
                  {engine.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 line-clamp-2">
                  {engine.description}
                </p>

                <div className="flex items-center text-sm font-bold text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Open Engine <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 lg:p-12 border border-slate-700 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl">
                <Lightbulb size={24} />
              </div>
              <h2 className="text-3xl font-black text-white">The Golden Rule</h2>
            </div>
            
            <div className="text-xl text-slate-300 font-medium leading-relaxed mb-8">
              "Chemical bonds store energy. Breaking bonds <span className="text-blue-400 font-bold">absorbs</span> energy. Making bonds <span className="text-orange-400 font-bold">releases</span> energy."
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <div className="font-black text-orange-400 mb-2">Exothermic (-)</div>
                <div className="text-sm text-slate-400">More energy is released forming bonds than absorbed breaking them. Products have lower energy.</div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <div className="font-black text-blue-400 mb-2">Endothermic (+)</div>
                <div className="text-sm text-slate-400">More energy is absorbed breaking bonds than released forming them. Products have higher energy.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
