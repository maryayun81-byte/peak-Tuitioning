'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, GitBranch, Factory, Combine, BatteryMedium, Flame, Table, ShieldAlert, Sparkles, Hammer, Zap } from 'lucide-react'

export default function ExtractionHub() {
  const modules = [
    {
      id: 'reactivity',
      title: 'Reactivity Series Tree',
      desc: 'Foundation: Why metals are extracted differently.',
      icon: <GitBranch size={24} className="text-emerald-500" />,
      color: 'hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/20',
      available: true
    },
    {
      id: 'concentration',
      title: 'Ore Concentration',
      desc: 'Froth Flotation, Magnetic Separation, and Leaching simulators.',
      icon: <Combine size={24} className="text-blue-500" />,
      color: 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20',
      available: true
    },
    {
      id: 'sodium',
      title: 'Sodium Extraction',
      desc: 'Downs Cell learning system & electrolysis mapping.',
      icon: <BatteryMedium size={24} className="text-cyan-500" />,
      color: 'hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-900/20',
      available: true
    },
    {
      id: 'aluminium',
      title: 'Aluminium Extraction',
      desc: 'Hall-Héroult Cell & Bayer Process purification.',
      icon: <Zap size={24} className="text-indigo-500" />,
      color: 'hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20',
      available: true
    },
    {
      id: 'iron',
      title: 'Iron Extraction',
      desc: 'Blast furnace zones, reactions, and slag formation.',
      icon: <Factory size={24} className="text-rose-500" />,
      color: 'hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/20',
      available: true
    },
    {
      id: 'zinc-lead',
      title: 'Zinc & Lead Extraction',
      desc: 'Roasting and carbon reduction pathways.',
      icon: <Flame size={24} className="text-amber-500" />,
      color: 'hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/20',
      available: true
    },
    {
      id: 'copper',
      title: 'Copper Smelting',
      desc: 'Sulphide roasting and electrolytic purification.',
      icon: <Hammer size={24} className="text-orange-500" />,
      color: 'hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-900/20',
      available: true
    },
    {
      id: 'cyanide',
      title: 'Silver & Gold',
      desc: 'Cyanide leaching process for unreactive metals.',
      icon: <Sparkles size={24} className="text-yellow-500" />,
      color: 'hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10',
      available: false
    },
    {
      id: 'comparison',
      title: 'Master Comparison',
      desc: 'Auto-generated tables comparing ores, methods, and equipment.',
      icon: <Table size={24} className="text-purple-500" />,
      color: 'hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/20',
      available: true
    },
    {
      id: 'traps',
      title: 'Examiner Traps',
      desc: 'Centralized database of the most common KCSE extraction traps.',
      icon: <ShieldAlert size={24} className="text-rose-600" />,
      color: 'hover:border-rose-600 hover:bg-rose-50 dark:hover:bg-rose-600/10',
      available: false
    }
  ]

  // Fix missing Zap import by substituting with Factory/Flame if Zap isn't available, wait Zap is not imported above! I will import Zap.

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      <header className="flex items-start justify-between">
        <div>
          <Link href="/teacher/resources/chemistry" className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 mb-4 text-sm font-bold transition-colors">
            <ArrowLeft size={16} /> Back to Chemistry Hub
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Factory size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Extraction of Metals Mastery Engine</h1>
              <p className="text-slate-500 mt-1 max-w-2xl">A comprehensive 10-module learning system teaching industrial extraction visually.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod, i) => {
          const content = (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-all group h-full flex flex-col relative overflow-hidden ${mod.available ? mod.color + ' cursor-pointer' : 'opacity-70 grayscale-[0.5]'}`}
            >
              {!mod.available && (
                <div className="absolute top-4 right-4 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold px-2 py-1 rounded-md">
                  Coming Soon
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors shadow-sm">
                  {mod.icon}
                </div>
                {mod.available && (
                  <div className="text-slate-300 group-hover:text-current transition-colors">
                    <ArrowLeft size={20} className="rotate-135" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{mod.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mt-auto">{mod.desc}</p>
            </motion.div>
          )

          if (mod.available) {
            return (
              <Link key={mod.id} href={`/teacher/resources/chemistry/extraction/${mod.id}`}>
                {content}
              </Link>
            )
          }

          return <div key={mod.id}>{content}</div>
        })}
      </div>
    </div>
  )
}
