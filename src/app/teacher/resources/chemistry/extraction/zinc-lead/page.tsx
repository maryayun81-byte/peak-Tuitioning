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
import { Factory, Plus, Trash2, Map, Package, ListOrdered, AlertTriangle } from 'lucide-react'

// --- ReactFlow Node Component ---
const StageNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-800 rounded-2xl shadow-xl w-72 overflow-hidden font-sans relative">
      <Handle type="target" position={Position.Top} id="top-target" className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} id="top-source" className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ left: '60%' }} />
      <Handle type="target" position={Position.Left} id="left-target" className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Right} id="right-target" className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ left: '60%' }} />

      <div className="bg-amber-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Factory size={16} />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-amber-200 font-bold w-40"
            placeholder="Stage Name"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-amber-200 hover:text-white transition-colors delete-btn">
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
            placeholder="e.g. Zinc Blende"
          />
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 p-2 rounded-lg border border-orange-100 dark:border-orange-900/50">
          <label className="text-[10px] font-black text-orange-400 uppercase tracking-wider mb-1 block">Conditions</label>
          <input 
            value={data.conditions} 
            onChange={(e) => data.onChange(id, 'conditions', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-orange-800 dark:text-orange-300"
            placeholder="e.g. 1000°C Heat"
          />
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
          <label className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-1 block">Outputs</label>
          <input 
            value={data.outputs} 
            onChange={(e) => data.onChange(id, 'outputs', e.target.value)}
            className="w-full bg-transparent outline-none font-bold text-emerald-700 dark:text-emerald-400"
            placeholder="e.g. Zinc Vapour"
          />
        </div>
      </div>
    </div>
  )
}
const nodeTypes = { stage: StageNode }

export default function ZincLeadExtraction() {
  const reactFlowWrapper = useRef(null)
  const [activeTab, setActiveTab] = useState<'canvas' | 'materials' | 'steps' | 'traps'>('canvas')
  const [isSaving, setIsSaving] = useState(false)

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [learningData, setLearningData] = useState({
    rawMaterials: [
      { id: '1', material: 'Zinc Blende', source: 'Chief Ore of Zinc (ZnS)' },
      { id: '2', material: 'Galena', source: 'Chief Ore of Lead (PbS)' },
      { id: '3', material: 'Coke', source: 'Reducing Agent & Fuel (C)' },
      { id: '4', material: 'Limestone', source: 'To remove silica impurities (CaCO3)' }
    ],
    steps: [
      { id: '1', title: 'Froth Flotation (Concentration)', equation: 'Physical Process', purpose: 'To concentrate the sulphide ore by separating it from rocky gangue impurities using oil and water.', observation: 'Ore particles float in froth, gangue sinks.' },
      { id: '2', title: 'Roasting in Air', equation: '2ZnS(s) + 3O2(g) → 2ZnO(s) + 2SO2(g)', purpose: 'To convert metal sulphide into a metal oxide which is much easier to reduce.', observation: 'Choking smell of sulphur dioxide.' },
      { id: '3', title: 'Reduction (Smelting)', equation: 'ZnO(s) + C(s) → Zn(g) + CO(g)', purpose: 'Reduction of zinc oxide using carbon to produce zinc vapour. Also applies to PbO.', observation: 'Zinc vaporizes because furnace temp is >907°C.' },
      { id: '4', title: 'Condensation & Purification', equation: 'Zn(g) → Zn(l) → Zn(s)', purpose: 'Fractional distillation is used because zinc has a lower boiling point than lead impurities.', observation: 'Liquid zinc is collected.' }
    ],
    traps: [
      { id: '1', question: 'Why must sulphide ores be roasted before reduction?', answer: 'Because it is chemically much easier to reduce a metal oxide using carbon than a metal sulphide.', note: 'A classic KCSE 1-mark question.' },
      { id: '2', question: 'What is the environmental impact of the roasting stage?', answer: 'Sulphur(IV) oxide gas is produced, which causes acid rain if released into the atmosphere.', note: 'Often linked to contact process as a way to utilize the SO2.' },
      { id: '3', question: 'Why does Zinc distil off as a vapour during reduction?', answer: 'The temperature in the furnace (around 1000°C) is higher than the boiling point of Zinc (907°C), so it vaporizes.', note: 'Lead does not vaporize because its boiling point is much higher (1740°C).' }
    ]
  })

  useState(() => {
    const initialNodes: Node[] = [
      { id: 'flotation', type: 'stage', position: { x: 400, y: 50 }, data: { title: 'Concentration', inputs: 'ZnS + Gangue', conditions: 'Water + Pine Oil', outputs: 'Concentrated ZnS' } },
      { id: 'roasting', type: 'stage', position: { x: 400, y: 300 }, data: { title: 'Roasting in Air', inputs: 'ZnS + O2', conditions: 'Strong Heat', outputs: 'ZnO + SO2(g)' } },
      { id: 'reduction', type: 'stage', position: { x: 400, y: 550 }, data: { title: 'Reduction Furnace', inputs: 'ZnO + Coke', conditions: '1000°C Heat', outputs: 'Zinc Vapour + CO' } },
      { id: 'condensation', type: 'stage', position: { x: 800, y: 550 }, data: { title: 'Condensation', inputs: 'Zinc Vapour', conditions: 'Cooling', outputs: 'Liquid Zinc' } }
    ]

    const initialEdges: Edge[] = [
      { id: 'e1', source: 'flotation', sourceHandle: 'bottom-source', target: 'roasting', targetHandle: 'top-target', animated: true, label: 'Transferred', style: { stroke: '#f59e0b', strokeWidth: 2 } },
      { id: 'e2', source: 'roasting', sourceHandle: 'bottom-source', target: 'reduction', targetHandle: 'top-target', animated: true, label: 'Roasted Ore', style: { stroke: '#f59e0b', strokeWidth: 2 } },
      { id: 'e3', source: 'reduction', sourceHandle: 'right-source', target: 'condensation', targetHandle: 'left-target', animated: true, label: 'Zn Vapour', style: { stroke: '#f59e0b', strokeWidth: 2 } }
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
    setEdges((eds) => addEdge({ ...params, animated: true, label: label || undefined, style: { stroke: '#f59e0b', strokeWidth: 2 } }, eds))
  }, [])

  const addStageNode = () => {
    setNodes(nds => nds.concat({ id: `node-${Date.now()}`, type: 'stage', position: { x: 400, y: 200 }, data: { title: 'New Stage', inputs: '', conditions: '', outputs: '' } }))
  }

  const updateMaterial = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, rawMaterials: prev.rawMaterials.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  const updateStep = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, steps: prev.steps.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  const updateTrap = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, traps: prev.traps.map(item => item.id === id ? { ...item, [field]: value } : item) }))

  const tabs = [
    { id: 'canvas', label: 'Extraction Flow', icon: <Map size={18} /> },
    { id: 'materials', label: 'Raw Materials', icon: <Package size={18} /> },
    { id: 'steps', label: 'Process Steps', icon: <ListOrdered size={18} /> },
    { id: 'traps', label: 'Examiner Traps', icon: <AlertTriangle size={18} /> },
  ]

  return (
    <BuilderLayout
      title="Zinc & Lead Extraction"
      subtitle="Extraction Learning System"
      backHref="/teacher/resources/chemistry/extraction"
      isSaving={isSaving}
      onSave={() => setIsSaving(true)}
      exportData={{ type: 'ZINC_LEAD_EXTRACTION', nodes, edges, learningData }}
      resourceSections={['Extraction Flow Canvas', 'Raw Materials', 'Process Steps Breakdown', 'KCSE Examiner Traps']}
    >
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Engine</h2>
        </div>
        <nav className="flex flex-col p-2 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all allow-student-click ${
                activeTab === tab.id 
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' 
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
              <button onClick={addStageNode} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105 add-node-btn">
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
                    <Package className="text-amber-500" /> Raw Materials
                  </h2>
                  <div className="space-y-4">
                    {learningData.rawMaterials.map(mat => (
                      <div key={mat.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Material</label>
                          <input value={mat.material} onChange={e => updateMaterial(mat.id, 'material', e.target.value)} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white pb-1 outline-none focus:border-amber-500" />
                        </div>
                        <div className="flex-[2]">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Source / Note</label>
                          <input value={mat.source} onChange={e => updateMaterial(mat.id, 'source', e.target.value)} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 pb-1 outline-none focus:border-amber-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'steps' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ListOrdered className="text-amber-500" /> Process Steps
                  </h2>
                  <div className="space-y-6">
                    {learningData.steps.map((step, idx) => (
                      <div key={step.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center font-black">{idx + 1}</div>
                          <input value={step.title} onChange={e => updateStep(step.id, 'title', e.target.value)} className="flex-1 bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none placeholder-slate-300" placeholder="Stage Name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Chemical Equation</label>
                            <input value={step.equation} onChange={e => updateStep(step.id, 'equation', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Key Observation</label>
                            <input value={step.observation} onChange={e => updateStep(step.id, 'observation', e.target.value)} className="w-full bg-amber-50 dark:bg-amber-900/10 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/50 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Purpose of Step</label>
                            <textarea value={step.purpose} onChange={e => updateStep(step.id, 'purpose', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500 resize-none h-16" />
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
                    <AlertTriangle className="text-amber-500" /> KCSE Examiner Traps
                  </h2>
                  <div className="space-y-4">
                    {learningData.traps.map(trap => (
                      <div key={trap.id} className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-amber-500 uppercase mb-1">Common Question</label>
                          <input value={trap.question} onChange={e => updateTrap(trap.id, 'question', e.target.value)} className="w-full bg-transparent border-b border-amber-200 dark:border-amber-800 font-bold text-slate-900 dark:text-white pb-1 outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Correct Answer / Justification</label>
                          <textarea value={trap.answer} onChange={e => updateTrap(trap.id, 'answer', e.target.value)} className="w-full bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Examiner Note (Optional)</label>
                          <input value={trap.note || ''} onChange={e => updateTrap(trap.id, 'note', e.target.value)} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 pb-1 outline-none focus:border-amber-500" placeholder="E.g. Don't confuse roasting with smelting!" />
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
