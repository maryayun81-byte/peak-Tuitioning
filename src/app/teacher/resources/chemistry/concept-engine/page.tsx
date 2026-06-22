'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, GitBranch, Factory, Battery, Flame, Share2, Grid3x3, TrendingUp, FlaskConical, Network, LayoutTemplate } from 'lucide-react'

export default function ConceptEngineHub() {
  const modules = [
    {
      id: 'industrial',
      title: 'Industrial Process Maps',
      desc: 'Haber, Contact, and Metal Extraction visual flowcharts.',
      icon: <Factory size={24} className="text-amber-500" />,
      color: 'hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/20',
      available: true
    },
    {
      id: 'electrochemistry',
      title: 'Electrochemistry Maps',
      desc: 'Visualize electron flow, half-cells, and oxidation states.',
      icon: <Battery size={24} className="text-cyan-500" />,
      color: 'hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-900/20',
      available: true
    },
    {
      id: 'enthalpy',
      title: 'Energy Flow Maps',
      desc: 'Activation energy profiles and Hess Law cycles.',
      icon: <Flame size={24} className="text-rose-500" />,
      color: 'hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-900/20',
      available: true
    },
    {
      id: 'structure',
      title: 'Structure & Bonding',
      desc: 'Expandable knowledge trees for ionic, covalent, and metallic bonds.',
      icon: <Share2 size={24} className="text-indigo-500" />,
      color: 'hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20',
      available: true
    },
    {
      id: 'periodic',
      title: 'Periodic Trend Maps',
      desc: 'Visual trend grids for atomic radius, ionization energy, etc.',
      icon: <Grid3x3 size={24} className="text-purple-500" />,
      color: 'hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10',
      available: false
    },
    {
      id: 'rates',
      title: 'Reaction Rate Maps',
      desc: 'Factors affecting rate linked to collision theory visualizers.',
      icon: <TrendingUp size={24} className="text-emerald-500" />,
      color: 'hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
      available: false
    },
    {
      id: 'organic',
      title: 'Organic Networks',
      desc: 'Complete homologous series conversion pathways.',
      icon: <Network size={24} className="text-pink-500" />,
      color: 'hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 border-pink-200 dark:border-pink-900 bg-pink-50/50 dark:bg-pink-900/20',
      available: true
    },
    {
      id: 'practical',
      title: 'Practical Flowcharts',
      desc: 'Qualitative analysis testing decision trees.',
      icon: <FlaskConical size={24} className="text-blue-500" />,
      color: 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10',
      available: false
    },
    {
      id: 'kcse',
      title: 'KCSE Concept Maps',
      desc: 'Macro-level relationship trees connecting syllabus topics.',
      icon: <LayoutTemplate size={24} className="text-orange-500" />,
      color: 'hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10',
      available: false
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      <header className="flex items-start justify-between">
        <div>
          <Link href="/teacher/resources/chemistry" className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 mb-4 text-sm font-bold transition-colors">
            <ArrowLeft size={16} /> Back to Chemistry Hub
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <GitBranch size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Visual Concept Engine</h1>
              <p className="text-slate-500 mt-1 max-w-2xl">Create interactive knowledge trees, network maps, and process flows. Choose a map architecture below to begin.</p>
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
              <Link key={mod.id} href={`/teacher/resources/chemistry/concept-engine/${mod.id}`}>
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
