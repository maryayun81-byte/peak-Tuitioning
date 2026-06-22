'use client'

import React, { useState, useRef } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import { TopicSelector } from '@/components/teacher/resources/TopicSelector'
import { Plus, Move, Trash2, Settings, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Node {
  id: string
  x: number
  y: number
  label: string
  type: 'compound' | 'condition'
}

export default function ReactionMapBuilder() {
  const [title, setTitle] = useState('New Reaction Map')
  const [topic, setTopic] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  // Canvas State
  const [nodes, setNodes] = useState<Node[]>([
    { id: '1', x: 100, y: 100, label: 'Ethene', type: 'compound' },
    { id: '2', x: 400, y: 100, label: 'Ethane', type: 'compound' },
    { id: '3', x: 250, y: 100, label: 'H2, Ni cat, 150°C', type: 'condition' }
  ])
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleSave = async () => {
    if (!title || !topic) {
      toast.error('Please provide a title and select a topic.')
      return
    }
    setIsSaving(true)
    // Simulate DB save delay
    setTimeout(() => {
      setIsSaving(false)
      toast.success('Reaction Map saved successfully!')
    }, 1000)
  }

  const handleAddNode = (type: 'compound' | 'condition') => {
    setNodes([...nodes, {
      id: Date.now().toString(),
      x: 50,
      y: 50,
      label: type === 'compound' ? 'New Compound' : 'Conditions',
      type
    }])
  }

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraggingNodeId(id)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingNodeId || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - 75 // rough center offset
    const y = e.clientY - rect.top - 25

    setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x, y } : n))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingNodeId) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      setDraggingNodeId(null)
    }
  }

  const updateNodeLabel = (id: string, label: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, label } : n))
  }

  return (
    <BuilderLayout
      title={title}
      subtitle="Reaction Map"
      backHref="/teacher/resources/chemistry"
      isSaving={isSaving}
      onSave={handleSave}
      onExport={() => alert('Exporting reaction map...')}
    >
      {/* Left Sidebar: Properties */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-10 shrink-0">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="font-black text-lg text-slate-900 dark:text-white">Map Properties</h2>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Title <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <TopicSelector value={topic} onChange={setTopic} />
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus size={16} /> Add Elements
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleAddNode('compound')}
              className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-xl hover:bg-blue-100 transition-colors border-2 border-blue-200 dark:border-blue-800 text-sm"
            >
              Compound
            </button>
            <button 
              onClick={() => handleAddNode('condition')}
              className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-xl hover:bg-amber-100 transition-colors border-2 border-amber-200 dark:border-amber-800 text-sm"
            >
              Condition
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {nodes.map(node => (
          <div
            key={node.id}
            onPointerDown={(e) => handlePointerDown(e, node.id)}
            style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
            className={`absolute top-0 left-0 cursor-move transition-shadow ${draggingNodeId === node.id ? 'shadow-xl z-50 scale-105' : 'shadow-sm z-10 hover:shadow-md'}`}
          >
            <div className={`
              px-4 py-3 rounded-xl border-2 flex items-center gap-2 backdrop-blur-sm
              ${node.type === 'compound' 
                ? 'bg-white/90 dark:bg-slate-900/90 border-blue-200 dark:border-blue-800' 
                : 'bg-amber-50/90 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 border-dashed rounded-full px-6'
              }
            `}>
              <Move size={14} className="text-slate-400 shrink-0" />
              <input 
                type="text" 
                value={node.label}
                onChange={(e) => updateNodeLabel(node.id, e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-center w-32 text-slate-900 dark:text-white"
                placeholder={node.type === 'compound' ? 'Compound' : 'Conditions'}
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setNodes(nodes.filter(n => n.id !== node.id)) }}
                className="text-slate-300 hover:text-rose-500 transition-colors shrink-0 p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        
        {/* Simple visual instruction */}
        <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 font-medium flex items-center justify-center gap-2 shadow-sm pointer-events-none">
          Drag elements to build your pathway. Advanced SVG arrow connections will be available in the full release.
        </div>
      </div>
    </BuilderLayout>
  )
}
