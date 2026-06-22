import React from 'react'

export const KCSE_CHEMISTRY_TOPICS = [
  "Structure and Bonding",
  "Acids, Bases and Salts",
  "Organic Chemistry (Alkanes, Alkenes, Alcohols)",
  "Organic Chemistry (Alkanoic Acids, Esters, Polymers)",
  "Energy Changes / Enthalpy Changes",
  "Rates of Reaction",
  "Electrochemistry",
  "Extraction of Metals",
  "Industrial Chemistry",
  "Periodic Table and Periodicity",
  "Mole Concept and Stoichiometry",
  "Salts and Solubility",
  "Gas Laws"
]

interface TopicSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function TopicSelector({ value, onChange }: TopicSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
        KCSE Topic Tag <span className="text-rose-500">*</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
      >
        <option value="" disabled>Select a core syllabus topic...</option>
        {KCSE_CHEMISTRY_TOPICS.map(topic => (
          <option key={topic} value={topic}>{topic}</option>
        ))}
      </select>
    </div>
  )
}
