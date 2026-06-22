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
import { Factory, Plus, Trash2, Map, Package, ListOrdered, AlertTriangle, Blocks } from 'lucide-react'

// --- ReactFlow Node Component ---
const StageNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-cyan-200 dark:border-cyan-800 rounded-2xl shadow-xl w-72 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-cyan-500 border-2 border-white" style={{ left: '60%' }} />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-cyan-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 bg-cyan-500 border-2 border-white" style={{ top: '60%' }} />

      <div className="bg-cyan-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Factory size={16} />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-cyan-200 font-bold w-40"
            placeholder="Stage Name"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-cyan-200 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm">
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Inputs</label>
          <input 
            value={data.inputs} 
            onChange={(e) => data.onChange(id, 'inputs', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300" 
            placeholder="e.g. NaCl" 
          />
        </div>
        <div className="bg-cyan-50 dark:bg-cyan-900/10 p-2 rounded-lg border border-cyan-100 dark:border-cyan-800/50">
          <label className="text-[10px] font-black text-cyan-500 uppercase tracking-wider mb-1 block">Conditions / Details</label>
          <input 
            value={data.conditions} 
            onChange={(e) => data.onChange(id, 'conditions', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-cyan-700 dark:text-cyan-400" 
            placeholder="e.g. 600°C" 
          />
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Outputs</label>
          <input 
            value={data.outputs} 
            onChange={(e) => data.onChange(id, 'outputs', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300" 
            placeholder="e.g. Pure Na" 
          />
        </div>
      </div>
      
      <Handle type="target" position={Position.Right} className="w-3 h-3 bg-cyan-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-cyan-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Bottom} className="w-3 h-3 bg-cyan-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-500 border-2 border-white" style={{ left: '60%' }} />
    </div>
  )
}

const nodeTypes = { stage: StageNode }

export default function SodiumExtraction() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'materials' | 'steps' | 'traps'>('canvas')
  const [isSaving, setIsSaving] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [learningData, setLearningData] = useState({
    rawMaterials: [
      { id: '1', material: 'Rock Salt', source: 'Chief Ore (NaCl)' },
      { id: '2', material: 'Calcium Chloride', source: 'Additive (CaCl2)' },
      { id: '3', material: 'Graphite Anode', source: 'Central electrode' },
      { id: '4', material: 'Steel Cathode', source: 'Circular outer electrode' }
    ],
    steps: [
      { id: '1', title: 'Melting the Electrolyte', equation: 'NaCl(s) → Na+(l) + Cl-(l)', purpose: 'Provide free mobile ions for conductivity.', observation: 'Solid salt melts at 600°C.' },
      { id: '2', title: 'Cathode (Reduction)', equation: 'Na+(l) + e- → Na(l)', purpose: 'Extract molten sodium metal.', observation: 'Silvery molten metal floats to the top (less dense than electrolyte).' },
      { id: '3', title: 'Anode (Oxidation)', equation: '2Cl-(l) → Cl2(g) + 2e-', purpose: 'Produce chlorine gas byproduct.', observation: 'Pale green gas bubbles off.' }
    ],
    traps: [
      { id: '1', question: 'Why is calcium chloride added to the rock salt?', answer: 'It lowers the melting point of sodium chloride from 800°C to about 600°C, saving massive amounts of energy and reducing the corrosive effects of the molten salt on the equipment.' },
      { id: '2', question: 'Why must the anode and cathode be separated by a steel gauze?', answer: 'To prevent the highly reactive sodium metal and chlorine gas from recombining to form sodium chloride again.' },
      { id: '3', question: 'Why is sodium extracted by electrolysis instead of carbon reduction?', answer: 'Sodium is highly reactive (above carbon in the reactivity series) and forms very stable bonds in its ore that cannot be broken by carbon.' }
    ]
  })

  useState(() => {
    const initialNodes: Node[] = [
      { id: 'melt', type: 'stage', position: { x: 50, y: 200 }, data: { title: 'Melting Tank', inputs: 'NaCl + CaCl2', conditions: '600°C', outputs: 'Molten Electrolyte' } },
      { id: 'downs', type: 'stage', position: { x: 450, y: 200 }, data: { title: 'Downs Cell', inputs: 'Molten NaCl', conditions: 'Electrolysis', outputs: 'Na(l) + Cl2(g)' } }
    ]

    const initialEdges: Edge[] = [
      { id: 'e1', source: 'melt', sourceHandle: 'right-source', target: 'downs', targetHandle: 'left-target', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } }
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
    setEdges((eds) => addEdge({ ...params, animated: true, label: label || undefined, style: { stroke: '#06b6d4', strokeWidth: 2 } }, eds))
  }, [])

  const addStageNode = () => setNodes(nds => nds.concat({ id: `node-${Date.now()}`, type: 'stage', position: { x: 400, y: 200 }, data: { title: 'New Zone', inputs: '', conditions: '', outputs: '' } }))

  const updateMaterial = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, rawMaterials: prev.rawMaterials.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  const updateStep = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, steps: prev.steps.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  const updateTrap = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, traps: prev.traps.map(item => item.id === id ? { ...item, [field]: value } : item) }))

  const tabs = [
    { id: 'canvas', label: 'Downs Cell Flow', icon: <Map size={18} /> },
    { id: 'materials', label: 'Raw Materials', icon: <Package size={18} /> },
    { id: 'steps', label: 'Step Breakdown', icon: <ListOrdered size={18} /> },
    { id: 'traps', label: 'Examiner Traps', icon: <AlertTriangle size={18} /> },
  ]

  return (
    <BuilderLayout
      title="Sodium Extraction (Downs Cell)"
      subtitle="Extraction Learning System"
      backHref="/teacher/resources/chemistry/extraction"
      isSaving={isSaving}
      onSave={() => setIsSaving(true)}
      onExport={() => alert('Exporting map...')}
    >
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg">
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
                  ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' 
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
              <button onClick={addStageNode} className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105">
                <Plus size={20} /> Add Stage
              </button>
            </Panel>
          </ReactFlow>
        </div>

        {activeTab !== 'canvas' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {activeTab === 'materials' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="text-cyan-500" /> Raw Materials
                  </h2>
                  <div className="space-y-4">
                    {learningData.rawMaterials.map(mat => (
                      <div key={mat.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Material</label>
                          <input value={mat.material} onChange={e => updateMaterial(mat.id, 'material', e.target.value)} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white pb-1 outline-none focus:border-cyan-500" />
                        </div>
                        <div className="flex-[2]">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Source / Note</label>
                          <input value={mat.source} onChange={e => updateMaterial(mat.id, 'source', e.target.value)} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 pb-1 outline-none focus:border-cyan-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'steps' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ListOrdered className="text-cyan-500" /> Step Breakdown
                  </h2>
                  <div className="space-y-6">
                    {learningData.steps.map((step, idx) => (
                      <div key={step.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 flex items-center justify-center font-black">{idx + 1}</div>
                          <input value={step.title} onChange={e => updateStep(step.id, 'title', e.target.value)} className="flex-1 bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none placeholder-slate-300" placeholder="Stage Name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Chemical Equation</label>
                            <input value={step.equation} onChange={e => updateStep(step.id, 'equation', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Key Observation</label>
                            <input value={step.observation} onChange={e => updateStep(step.id, 'observation', e.target.value)} className="w-full bg-cyan-50 dark:bg-cyan-900/10 px-3 py-2 rounded-lg border border-cyan-200 dark:border-cyan-800/50 text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Purpose of Step</label>
                            <textarea value={step.purpose} onChange={e => updateStep(step.id, 'purpose', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-cyan-500 resize-none h-16" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'traps' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="text-rose-500" /> KCSE Examiner Traps
                  </h2>
                  <div className="space-y-4">
                    {learningData.traps.map(trap => (
                      <div key={trap.id} className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-rose-500 uppercase mb-1">Common Question</label>
                          <input value={trap.question} onChange={e => updateTrap(trap.id, 'question', e.target.value)} className="w-full bg-transparent border-b border-rose-200 dark:border-rose-800 font-bold text-slate-900 dark:text-white pb-1 outline-none focus:border-rose-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Correct Answer / Justification</label>
                          <textarea value={trap.answer} onChange={e => updateTrap(trap.id, 'answer', e.target.value)} className="w-full bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </BuilderLayout>
  )
}
