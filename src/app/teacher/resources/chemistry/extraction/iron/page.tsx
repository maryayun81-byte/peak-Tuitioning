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
    <div className="bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-800 rounded-2xl shadow-xl w-72 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} id="top-target" className="w-3 h-3 bg-rose-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} id="top-source" className="w-3 h-3 bg-rose-500 border-2 border-white" style={{ left: '60%' }} />
      <Handle type="target" position={Position.Left} id="left-target" className="w-3 h-3 bg-rose-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-3 h-3 bg-rose-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Right} id="right-target" className="w-3 h-3 bg-rose-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-3 h-3 bg-rose-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-3 h-3 bg-rose-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-3 h-3 bg-rose-500 border-2 border-white" style={{ left: '60%' }} />

      <div className="bg-rose-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Factory size={16} />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-rose-200 font-bold w-40"
            placeholder="Stage Name"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-rose-200 hover:text-white transition-colors">
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
            placeholder="e.g. Fe2O3" 
          />
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/10 p-2 rounded-lg border border-rose-100 dark:border-rose-800/50">
          <label className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1 block">Conditions / Details</label>
          <input 
            value={data.conditions} 
            onChange={(e) => data.onChange(id, 'conditions', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-rose-700 dark:text-rose-400" 
            placeholder="e.g. 1900°C" 
          />
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Outputs</label>
          <input 
            value={data.outputs} 
            onChange={(e) => data.onChange(id, 'outputs', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300" 
            placeholder="e.g. Molten Iron" 
          />
        </div>
      </div>
      
      <Handle type="target" position={Position.Right} className="w-3 h-3 bg-rose-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-rose-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Bottom} className="w-3 h-3 bg-rose-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-rose-500 border-2 border-white" style={{ left: '60%' }} />
    </div>
  )
}

const nodeTypes = { stage: StageNode }

// --- Main Builder ---
export default function IronExtraction() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'materials' | 'steps' | 'traps'>('canvas')
  const [isSaving, setIsSaving] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [learningData, setLearningData] = useState({
    rawMaterials: [
      { id: '1', material: 'Haematite', source: 'Chief Iron Ore (Fe2O3)' },
      { id: '2', material: 'Coke', source: 'Source of Carbon / Reducing Agent' },
      { id: '3', material: 'Limestone', source: 'To remove silica impurities' },
      { id: '4', material: 'Hot Air', source: 'Oxygen for combustion of coke' }
    ],
    steps: [
      { id: '1', title: 'Combustion Zone', equation: 'C(s) + O2(g) → CO2(g)', purpose: 'Highly exothermic reaction providing the massive heat (1900°C) required for the furnace.', observation: 'Intense heat produced at base.' },
      { id: '2', title: 'Carbon Monoxide Formation', equation: 'CO2(g) + C(s) → 2CO(g)', purpose: 'Endothermic reaction producing the primary reducing agent.', observation: 'Temperature drops slightly in middle zone.' },
      { id: '3', title: 'Reduction Zone', equation: 'Fe2O3(s) + 3CO(g) → 2Fe(l) + 3CO2(g)', purpose: 'Reduction of iron(III) oxide to molten iron.', observation: 'Molten iron sinks to the bottom.' },
      { id: '4', title: 'Limestone Decomposition', equation: 'CaCO3(s) → CaO(s) + CO2(g)', purpose: 'Thermal decomposition to produce calcium oxide (basic oxide).', observation: 'More CO2 released.' },
      { id: '5', title: 'Slag Formation', equation: 'CaO(s) + SiO2(s) → CaSiO3(l)', purpose: 'Removal of acidic sand (silica) impurities as molten calcium silicate slag.', observation: 'Molten slag floats on top of molten iron.' }
    ],
    traps: [
      { id: '1', question: 'Why is limestone added to the blast furnace?', answer: 'Limestone decomposes into calcium oxide, which reacts with silica (sand) impurities to form calcium silicate (slag). This prevents the iron from being contaminated.' },
      { id: '2', question: 'Why is carbon monoxide the main reducing agent, rather than carbon?', answer: 'Carbon monoxide is a gas, so it can easily flow up through the furnace and make contact with all the solid iron ore. Solid carbon would have very poor surface area contact with solid ore.' },
      { id: '3', question: 'Why does slag float on top of the molten iron?', answer: 'Slag is less dense than molten iron, protecting the molten iron from being oxidized back into iron oxide by the incoming hot air blasts.' }
    ]
  })

  useState(() => {
    const initialNodes: Node[] = [
      { id: 'combustion', type: 'stage', position: { x: 50, y: 650 }, data: { title: 'Combustion Zone', inputs: 'Coke + Hot Air', conditions: '1900°C (Exothermic)', outputs: 'CO2' } },
      { id: 'co_form', type: 'stage', position: { x: 450, y: 500 }, data: { title: 'CO Formation', inputs: 'CO2 + Coke', conditions: '1000°C (Endothermic)', outputs: 'CO (Reducing Agent)' } },
      { id: 'reduction', type: 'stage', position: { x: 450, y: 200 }, data: { title: 'Reduction Zone', inputs: 'Fe2O3 + CO', conditions: '700°C', outputs: 'Molten Iron + CO2' } },
      { id: 'limestone', type: 'stage', position: { x: 850, y: 350 }, data: { title: 'Limestone Decomp.', inputs: 'CaCO3', conditions: 'Heat', outputs: 'CaO + CO2' } },
      { id: 'slag', type: 'stage', position: { x: 850, y: 650 }, data: { title: 'Slag Formation', inputs: 'CaO + SiO2', conditions: 'Molten State', outputs: 'CaSiO3 (Slag)' } }
    ]

    const initialEdges: Edge[] = [
      { id: 'e1', source: 'combustion', sourceHandle: 'right-source', target: 'co_form', targetHandle: 'left-target', animated: true, label: 'CO2 Rises', style: { stroke: '#f43f5e', strokeWidth: 2 } },
      { id: 'e2', source: 'co_form', sourceHandle: 'top-source', target: 'reduction', targetHandle: 'bottom-target', animated: true, label: 'CO Rises', style: { stroke: '#f43f5e', strokeWidth: 2 } },
      { id: 'e3', source: 'limestone', sourceHandle: 'bottom-source', target: 'slag', targetHandle: 'top-target', animated: true, label: 'CaO Drops', style: { stroke: '#f43f5e', strokeWidth: 2 } },
      { id: 'e4', source: 'limestone', sourceHandle: 'left-source', target: 'reduction', targetHandle: 'right-target', animated: true, label: 'CO2 (Waste)', style: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '5,5' } }
    ]
    setNodes(initialNodes)
    setEdges(initialEdges)
  })

  // Handlers
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
    setEdges((eds) => addEdge({ ...params, animated: true, label: label || undefined, style: { stroke: '#f43f5e', strokeWidth: 2 } }, eds))
  }, [])

  const addStageNode = () => {
    setNodes(nds => nds.concat({ id: `node-${Date.now()}`, type: 'stage', position: { x: 400, y: 200 }, data: { title: 'New Zone', inputs: '', conditions: '', outputs: '' } }))
  }

  const updateMaterial = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, rawMaterials: prev.rawMaterials.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  const updateStep = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, steps: prev.steps.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  const updateTrap = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, traps: prev.traps.map(item => item.id === id ? { ...item, [field]: value } : item) }))

  const tabs = [
    { id: 'canvas', label: 'Blast Furnace', icon: <Map size={18} /> },
    { id: 'materials', label: 'Raw Materials', icon: <Package size={18} /> },
    { id: 'steps', label: 'Furnace Zones', icon: <ListOrdered size={18} /> },
    { id: 'traps', label: 'Examiner Traps', icon: <AlertTriangle size={18} /> },
  ]

  return (
    <BuilderLayout
      title="Iron Extraction (Blast Furnace)"
      subtitle="Extraction Learning System"
      backHref="/teacher/resources/chemistry/extraction"
      isSaving={isSaving}
      onSave={() => setIsSaving(true)}
      exportData={{ type: 'IRON_EXTRACTION', nodes, edges, learningData }}
      resourceSections={['Blast Furnace Canvas', 'Raw Materials', 'Furnace Zones Breakdown', 'KCSE Examiner Traps']}
    >
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
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
                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' 
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
              <button onClick={addStageNode} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105">
                <Plus size={20} /> Add Furnace Zone
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
                    <Package className="text-rose-500" /> Raw Materials
                  </h2>
                  <div className="space-y-4">
                    {learningData.rawMaterials.map(mat => (
                      <div key={mat.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Material</label>
                          <input value={mat.material} onChange={e => updateMaterial(mat.id, 'material', e.target.value)} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white pb-1 outline-none focus:border-rose-500" />
                        </div>
                        <div className="flex-[2]">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Source / Note</label>
                          <input value={mat.source} onChange={e => updateMaterial(mat.id, 'source', e.target.value)} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 pb-1 outline-none focus:border-rose-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'steps' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ListOrdered className="text-rose-500" /> Furnace Zones Breakdown
                  </h2>
                  <div className="space-y-6">
                    {learningData.steps.map((step, idx) => (
                      <div key={step.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center font-black">{idx + 1}</div>
                          <input value={step.title} onChange={e => updateStep(step.id, 'title', e.target.value)} className="flex-1 bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none placeholder-slate-300" placeholder="Stage Name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Chemical Equation</label>
                            <input value={step.equation} onChange={e => updateStep(step.id, 'equation', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Key Observation</label>
                            <input value={step.observation} onChange={e => updateStep(step.id, 'observation', e.target.value)} className="w-full bg-rose-50 dark:bg-rose-900/10 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800/50 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Purpose of Step</label>
                            <textarea value={step.purpose} onChange={e => updateStep(step.id, 'purpose', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none h-16" />
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
