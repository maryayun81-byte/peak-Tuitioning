'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Library, Map, Users, AlertTriangle, LifeBuoy, Zap } from 'lucide-react'

export default function PeriodicTableHub() {
  const modules = [
    {
      id: 'trends',
      title: 'Periodic Trends Canvas',
      desc: 'Interactive map of atomic radius, ionization energy, and electron affinity.',
      icon: <Map size={24} className="text-blue-500" />,
      color: 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20',
      available: true
    },
    {
      id: 'families',
      title: 'Chemical Families Pack',
      desc: 'Alkali metals, Alkaline Earth, Halogens, and Noble Gases.',
      icon: <Users size={24} className="text-emerald-500" />,
      color: 'hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/20',
      available: true
    },
    {
      id: 'traps',
      title: 'Examiner Traps Pack',
      desc: 'Common KCSE pitfalls on nuclear charge, shielding, and ionic radius.',
      icon: <AlertTriangle size={24} className="text-amber-500" />,
      color: 'hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/20',
      available: true
    },
    {
      id: 'recovery',
      title: 'Topic Recovery Pack',
      desc: 'Definitions, rules, and simplified explanations for weak students.',
      icon: <LifeBuoy size={24} className="text-cyan-500" />,
      color: 'hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-900/20',
      available: true
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link 
              href="/teacher/resources" 
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-2"
            >
              <ArrowLeft size={16} /> Back to Library
            </Link>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Library className="text-indigo-500" />
              Periodic Table & Trends Engine
            </h1>
            <p className="text-slate-500 font-medium">Master the Master Explanation Rule: Electronic arrangement → Nuclear attraction → Radius.</p>
          </div>
        </div>

        {/* Master Rule Callout */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 p-6 rounded-r-2xl shadow-sm">
          <h2 className="text-lg font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2">
            <Zap size={20} /> The Master Explanation Rule
          </h2>
          <p className="text-indigo-800 dark:text-indigo-400 font-medium text-sm">
            Every trend must be explained using this chain: <br/>
            <strong>Electronic arrangement → Number of shells → Nuclear charge → Shielding effect → Nuclear force of attraction → Atomic/ionic radius → Ease of losing/gaining electrons → Reactivity</strong>
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {modules.map((mod, idx) => (
            <Link 
              href={mod.available ? `/teacher/resources/chemistry/periodic-table/${mod.id}` : '#'} 
              key={mod.id}
            >
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-6 rounded-3xl border-2 transition-all duration-300 h-full flex flex-col relative overflow-hidden group
                  ${mod.available ? mod.color : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-60 cursor-not-allowed'}
                `}
              >
                {!mod.available && (
                  <div className="absolute top-4 right-4 bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                    Coming Soon
                  </div>
                )}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 
                  ${mod.available ? 'bg-white dark:bg-slate-950 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`
                }>
                  {mod.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{mod.title}</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-auto">{mod.desc}</p>
                
                {mod.available && (
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-950 shadow-sm flex items-center justify-center text-slate-400">
                      <ArrowLeft size={16} className="rotate-180" />
                    </div>
                  </div>
                )}
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
