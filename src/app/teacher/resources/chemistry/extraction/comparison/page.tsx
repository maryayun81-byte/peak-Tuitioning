'use client'

import React, { useState } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import { Table, Plus, Trash2, GripVertical } from 'lucide-react'

export default function MasterComparison() {
  const [isSaving, setIsSaving] = useState(false)

  const [tableData, setTableData] = useState([
    { id: '1', metal: 'Sodium', ore: 'Rock Salt (NaCl)', method: 'Electrolysis', equipment: 'Downs Cell' },
    { id: '2', metal: 'Aluminium', ore: 'Bauxite (Al2O3)', method: 'Electrolysis', equipment: 'Hall-Héroult Cell' },
    { id: '3', metal: 'Iron', ore: 'Haematite (Fe2O3)', method: 'Carbon Reduction', equipment: 'Blast Furnace' },
    { id: '4', metal: 'Zinc', ore: 'Zinc Blende (ZnS)', method: 'Carbon Reduction', equipment: 'Furnace' },
    { id: '5', metal: 'Lead', ore: 'Galena (PbS)', method: 'Carbon Reduction', equipment: 'Furnace' },
    { id: '6', metal: 'Copper', ore: 'Copper Pyrites (CuFeS2)', method: 'Smelting + Electrolysis', equipment: 'Converter + Electrolytic Cell' },
    { id: '7', metal: 'Silver', ore: 'Argentite (Ag2S)', method: 'Cyanide Process', equipment: 'Extraction Tanks' },
    { id: '8', metal: 'Gold', ore: 'Native Gold', method: 'Cyanide Process', equipment: 'Extraction Tanks' }
  ])

  const updateRow = (id: string, field: string, value: string) => {
    setTableData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  const deleteRow = (id: string) => {
    setTableData(prev => prev.filter(row => row.id !== id))
  }

  const addRow = () => {
    setTableData(prev => [...prev, { id: Date.now().toString(), metal: '', ore: '', method: '', equipment: '' }])
  }

  return (
    <BuilderLayout
      title="Master Comparisons Table"
      subtitle="Extraction Learning System"
      backHref="/teacher/resources/chemistry/extraction"
      isSaving={isSaving}
      onSave={() => setIsSaving(true)}
      onExport={() => alert('Exporting map...')}
    >
      <div className="flex-1 w-full h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <Table size={24} />
              </div>
              Extraction Methods Comparison
            </h2>
            <button onClick={addRow} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-4 py-2 rounded-xl shadow-sm transition-all hover:scale-105">
              <Plus size={18} /> Add Metal
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-black text-slate-500 uppercase tracking-wider">
              <div className="col-span-1"></div>
              <div className="col-span-2">Metal</div>
              <div className="col-span-3">Chief Ore</div>
              <div className="col-span-3">Extraction Method</div>
              <div className="col-span-2">Equipment</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {tableData.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-12 gap-4 p-4 items-center group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="col-span-1 flex justify-center text-slate-300 dark:text-slate-600">
                    <GripVertical size={16} className="cursor-grab hover:text-slate-500" />
                  </div>
                  <div className="col-span-2">
                    <input 
                      value={row.metal} 
                      onChange={e => updateRow(row.id, 'metal', e.target.value)}
                      className="w-full bg-transparent font-bold text-slate-900 dark:text-white outline-none border-b border-transparent focus:border-purple-500" 
                      placeholder="e.g. Sodium"
                    />
                  </div>
                  <div className="col-span-3">
                    <input 
                      value={row.ore} 
                      onChange={e => updateRow(row.id, 'ore', e.target.value)}
                      className="w-full bg-transparent text-slate-600 dark:text-slate-300 outline-none border-b border-transparent focus:border-purple-500" 
                      placeholder="e.g. Rock Salt"
                    />
                  </div>
                  <div className="col-span-3">
                    <input 
                      value={row.method} 
                      onChange={e => updateRow(row.id, 'method', e.target.value)}
                      className="w-full bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 font-medium px-2 py-1 rounded border border-transparent focus:border-purple-300 outline-none" 
                      placeholder="e.g. Electrolysis"
                    />
                  </div>
                  <div className="col-span-2">
                    <input 
                      value={row.equipment} 
                      onChange={e => updateRow(row.id, 'equipment', e.target.value)}
                      className="w-full bg-transparent text-slate-600 dark:text-slate-300 outline-none border-b border-transparent focus:border-purple-500" 
                      placeholder="e.g. Downs Cell"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => deleteRow(row.id)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </BuilderLayout>
  )
}
