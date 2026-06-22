'use client'

import React, { useState, useCallback, useRef } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import ReactFlow, { 
  Background, 
  Controls, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  Node, 
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  Handle,
  Position,
  Panel
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Combine, Plus, Trash2, Map, ListOrdered, Blocks } from 'lucide-react'

// --- ReactFlow Node Component ---
const StageNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-800 rounded-2xl shadow-xl w-72 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-white" style={{ left: '60%' }} />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-white" style={{ top: '60%' }} />

      <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Combine size={16} />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-blue-200 font-bold w-40"
            placeholder="Stage Name"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-blue-200 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm">
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Process Action</label>
          <input 
            value={data.action} 
            onChange={(e) => data.onChange(id, 'action', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300" 
            placeholder="e.g. Add Water" 
          />
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100 dark:border-blue-800/50">
          <label className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1 block">Result / Observation</label>
          <input 
            value={data.result} 
            onChange={(e) => data.onChange(id, 'result', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-blue-700 dark:text-blue-400" 
            placeholder="e.g. Froth forms" 
          />
        </div>
      </div>
      
      <Handle type="target" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-white" style={{ left: '60%' }} />
    </div>
  )
}

const nodeTypes = { stage: StageNode }

export default function OreConcentration() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'steps'>('canvas')
  const [isSaving, setIsSaving] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [learningData, setLearningData] = useState({
    steps: [
      { id: '1', title: 'Crushing & Grinding', explanation: 'Ore is crushed to increase surface area.' },
      { id: '2', title: 'Slurry Formation', explanation: 'Crushed ore is mixed with water to form a slurry.' },
      { id: '3', title: 'Addition of Collectors', explanation: 'Pine oil or specific chemicals added. These coat the ore particles and make them water-repellent (hydrophobic).' },
      { id: '4', title: 'Aeration', explanation: 'Air is blown vigorously through the mixture, creating bubbles.' },
      { id: '5', title: 'Froth Collection', explanation: 'Hydrophobic ore particles attach to air bubbles and rise to the surface as froth, while gangue (impurities) sink.' }
    ]
  })

  useState(() => {
    const initialNodes: Node[] = [
      { id: 'crush', type: 'stage', position: { x: 50, y: 50 }, data: { title: 'Crushing', action: 'Crush raw ore', result: 'Fine powder' } },
      { id: 'water', type: 'stage', position: { x: 450, y: 50 }, data: { title: 'Slurry', action: 'Add water', result: 'Ore slurry forms' } },
      { id: 'oil', type: 'stage', position: { x: 450, y: 350 }, data: { title: 'Collectors', action: 'Add Pine Oil', result: 'Ore becomes hydrophobic' } },
      { id: 'air', type: 'stage', position: { x: 850, y: 350 }, data: { title: 'Aeration', action: 'Blow air through', result: 'Bubbles form' } },
      { id: 'froth', type: 'stage', position: { x: 850, y: 650 }, data: { title: 'Froth Collection', action: 'Skim froth', result: 'Concentrated Ore' } }
    ]

    const initialEdges: Edge[] = [
      { id: 'e1', source: 'crush', sourceHandle: 'right-source', target: 'water', targetHandle: 'left-target', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
      { id: 'e2', source: 'water', sourceHandle: 'bottom-source', target: 'oil', targetHandle: 'top-target', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
      { id: 'e3', source: 'oil', sourceHandle: 'right-source', target: 'air', targetHandle: 'left-target', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
      { id: 'e4', source: 'air', sourceHandle: 'bottom-source', target: 'froth', targetHandle: 'top-target', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }
    ]
    setNodes(initialNodes)
    setEdges(initialEdges)
  })

  const updateNodeData = useCallback((id: string, field: string, value: string) => {
    setNodes(nds => nds.map(node => node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node))
  }, [])
  const deleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(node => node.id !== id))
    setEdges(eds => eds.filter(edge => edge.source !== id && edge.target !== id))
  }, [])

  const nodesWithCallbacks = nodes.map(node => ({ ...node, data: { ...node.data, onChange: updateNodeData, onDelete: deleteNode } }))
  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), [])
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])
  
  const onConnect = useCallback((params: Connection | Edge) => {
    const label = window.prompt("Enter flow label:", "")
    setEdges((eds) => addEdge({ ...params, animated: true, label: label || undefined, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds))
  }, [])

  const addStageNode = () => setNodes(nds => nds.concat({ id: `node-${Date.now()}`, type: 'stage', position: { x: 400, y: 200 }, data: { title: 'New Stage', action: '', result: '' } }))

  const updateStep = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, steps: prev.steps.map(item => item.id === id ? { ...item, [field]: value } : item) }))

  const tabs = [
    { id: 'canvas', label: 'Flotation Canvas', icon: <Map size={18} /> },
    { id: 'steps', label: 'Theory Breakdown', icon: <ListOrdered size={18} /> }
  ]

  return (
    <BuilderLayout
      title="Ore Concentration (Froth Flotation)"
      subtitle="Extraction Learning System"
      backHref="/teacher/resources/chemistry/extraction"
      isSaving={isSaving}
      onSave={() => setIsSaving(true)}
      onExport={() => alert('Exporting map...')}
    >
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Blocks size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 dark:text-white text-sm">System Modules</h2>
              <p className="text-xs text-slate-500">Configure learning data</p>
            </div>
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 w-full h-full relative flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
        
        <div className={`flex-1 w-full h-full ${activeTab === 'canvas' ? 'block' : 'hidden'}`} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodesWithCallbacks} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.2}
          >
            <Background color="#cbd5e1" gap={24} size={2} />
            <Controls className="bg-white dark:bg-slate-900 border-none shadow-lg rounded-xl overflow-hidden" />
            <Panel position="top-right" className="m-4">
              <button onClick={addStageNode} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105">
                <Plus size={20} /> Add Process
              </button>
            </Panel>
            <Panel position="bottom-center" className="mb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm text-sm font-bold text-slate-500 border border-slate-200 dark:border-slate-800">
              Froth Flotation is heavily used for Sulphide Ores (Zinc Blende, Galena, Copper Pyrites)
            </Panel>
          </ReactFlow>
        </div>

        {activeTab === 'steps' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ListOrdered className="text-blue-500" /> Flotation Theory
              </h2>
              <div className="space-y-4">
                {learningData.steps.map((step, idx) => (
                  <div key={step.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-black">{idx + 1}</div>
                      <input value={step.title} onChange={e => updateStep(step.id, 'title', e.target.value)} className="flex-1 bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none placeholder-slate-300" placeholder="Theory Step" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Scientific Explanation</label>
                      <textarea value={step.explanation} onChange={e => updateStep(step.id, 'explanation', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </BuilderLayout>
  )
}
