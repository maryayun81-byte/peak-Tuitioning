'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Beaker, Zap, BookOpen, Layers, ShieldAlert, GitBranch, Calculator, Search, Atom, GraduationCap, Factory, Palette, Flame } from 'lucide-react'

export default function ChemistryEngineDashboard() {
  const builders = [
    {
      id: 'concept-engine',
      title: 'Visual Concept Engine',
      desc: 'Build expandable knowledge trees, process flows, and reaction networks.',
      icon: <GitBranch size={24} className="text-emerald-500" />,
      color: 'hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-900/10 relative overflow-hidden'
    },
    {
      id: 'structure-bonding',
      title: 'Structure & Bonding Engine',
      desc: 'Mastery engine explaining WHY substances behave the way they do.',
      icon: <Layers size={24} className="text-blue-500" />,
      color: 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 relative overflow-hidden'
    },
    {
      id: 'extraction',
      title: 'Extraction of Metals',
      desc: 'Mastery engine for Reactivity Series, Ore Concentration, and Blast Furnaces.',
      icon: <Factory size={24} className="text-amber-500" />,
      color: 'hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-900/10 relative overflow-hidden'
    },
    {
      id: 'conditions',
      title: 'Conditions Handbook',
      desc: 'Structured reference for reactions, reagents, and conditions.',
      icon: <BookOpen size={24} className="text-blue-500" />,
      color: 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'
    },
    {
      id: 'practical',
      title: 'Practical Observations',
      desc: 'Mastery packs for observations, inferences, and equations.',
      icon: <Beaker size={24} className="text-purple-500" />,
      color: 'hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10'
    },
    {
      id: 'traps',
      title: 'Examiner Traps',
      desc: 'Capture common KCSE mistakes and misconceptions.',
      icon: <ShieldAlert size={24} className="text-rose-500" />,
      color: 'hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
    },
    {
      id: 'calculations',
      title: 'Calculation Mastery',
      desc: 'Build guided examples for moles, enthalpy, and rates.',
      icon: <Calculator size={24} className="text-orange-500" />,
      color: 'hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10'
    },
    {
      id: 'themed-packs',
      title: 'Topic Recovery Packs',
      desc: 'Complete recovery resources for specific KCSE topics.',
      icon: <Layers size={24} className="text-indigo-500" />,
      color: 'hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
    },
    {
      id: 'enthalpy',
      title: 'Enthalpy Changes Engine™',
      desc: 'Mastery engine: energy diagrams, Hess\u2019s law, calorimetry, KCSE calc flows.',
      icon: <Flame size={24} className="text-orange-500" />,
      color: 'hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 border-orange-200 dark:border-orange-900 bg-orange-50/30 dark:bg-orange-900/10 relative overflow-hidden'
    },
    {
      id: 'studio',
      title: 'Chemistry Draw Studio™',
      desc: 'Excalidraw-style infinite canvas. Sketch, annotate, and export chemistry diagrams.',
      icon: <Palette size={24} className="text-violet-500" />,
      color: 'hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 border-violet-200 dark:border-violet-900 bg-violet-50/30 dark:bg-violet-900/10 relative overflow-hidden'
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <Link href="/teacher/resources" className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 mb-4 text-sm font-bold transition-colors">
            <ArrowLeft size={16} /> Back to Library
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <Atom size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Chemistry Engine</h1>
              <p className="text-slate-500 mt-1">The ultimate KCSE resource builder for Chemistry teachers.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Grid of Builders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {builders.map((builder, i) => (
          <Link key={builder.id} href={`/teacher/resources/chemistry/${builder.id}`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer transition-all group ${builder.color}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors shadow-sm">
                  {builder.icon}
                </div>
                <div className="text-slate-300 group-hover:text-current transition-colors">
                  <ArrowLeft size={20} className="rotate-135" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{builder.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{builder.desc}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}
