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
import { Share2, Plus, Trash2, Map, ListOrdered, Blocks, Magnet, Activity } from 'lucide-react'

// --- Custom Nodes ---

const ConceptNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-xl w-64 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-white" style={{ left: '60%' }} />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-white" style={{ top: '60%' }} />

      <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Share2 size={16} />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-blue-200 font-black w-40"
            placeholder="Bond Type"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-blue-200 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm">
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Atoms Involved</label>
          <input 
            value={data.atoms} 
            onChange={(e) => data.onChange(id, 'atoms', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300" 
            placeholder="e.g. Metal + Non-metal" 
          />
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100 dark:border-blue-800/50">
          <label className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1 block">Mechanism</label>
          <input 
            value={data.mechanism} 
            onChange={(e) => data.onChange(id, 'mechanism', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-blue-700 dark:text-blue-400" 
            placeholder="e.g. Electron Transfer" 
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

const ForceNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-purple-50 dark:bg-purple-950 border-2 border-purple-300 dark:border-purple-700 rounded-xl shadow-lg w-56 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-purple-500 border-2 border-white" style={{ left: '60%' }} />
      
      <div className="p-3 flex items-center justify-center gap-2">
        <Magnet size={18} className="text-purple-500" />
        <input 
          type="text" 
          value={data.force} 
          onChange={(e) => data.onChange(id, 'force', e.target.value)}
          className="w-full bg-transparent text-center border-none outline-none text-purple-900 dark:text-purple-100 font-bold"
          placeholder="e.g. Electrostatic Attraction"
        />
      </div>

      <Handle type="target" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-white" style={{ left: '60%' }} />
    </div>
  )
}

const nodeTypes = { concept: ConceptNode, force: ForceNode }

// --- Main Builder ---
export default function BondingExplorer() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'theory'>('canvas')
  const [isSaving, setIsSaving] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [learningData, setLearningData] = useState({
    theory: [
      { id: 'ionic', title: 'Why Ionic Bonds Form', explanation: 'Metals lose electrons to form positive ions (cations). Non-metals gain electrons to form negative ions (anions). Both achieve a stable noble gas electronic configuration.' },
      { id: 'covalent', title: 'Why Covalent Bonds Form', explanation: 'Non-metals share pairs of electrons to achieve a stable electronic configuration, as neither atom is willing to completely lose an electron.' },
      { id: 'metallic', title: 'Why Metallic Bonds Form', explanation: 'Metal atoms easily lose their outer electrons, creating a lattice of positive metal ions in a "sea" of delocalized electrons.' },
      { id: 'dative', title: 'Dative (Coordinate) Bonding', explanation: 'A special type of covalent bond where ONE atom provides BOTH electrons for the shared pair (e.g. NH3 donating its lone pair to an H+ ion to form NH4+).' }
    ]
  })

  useState(() => {
    const initialNodes: Node[] = [
      { id: 'root', type: 'concept', position: { x: 400, y: 50 }, data: { title: 'Chemical Bonding', atoms: 'Elements', mechanism: 'Achieve stable octet' } },
      
      { id: 'ionic', type: 'concept', position: { x: 50, y: 250 }, data: { title: 'Ionic Bonding', atoms: 'Metal + Non-metal', mechanism: 'Electron Transfer' } },
      { id: 'force_ionic', type: 'force', position: { x: 70, y: 450 }, data: { force: 'Electrostatic Attraction (Strong)' } },

      { id: 'covalent', type: 'concept', position: { x: 400, y: 250 }, data: { title: 'Covalent Bonding', atoms: 'Non-metal + Non-metal', mechanism: 'Electron Sharing' } },
      { id: 'dative', type: 'concept', position: { x: 400, y: 450 }, data: { title: 'Dative Bonding', atoms: 'Non-metal + Ion', mechanism: 'Lone Pair Donation' } },

      { id: 'metallic', type: 'concept', position: { x: 750, y: 250 }, data: { title: 'Metallic Bonding', atoms: 'Metal + Metal', mechanism: 'Delocalized Electrons' } },
      { id: 'force_metallic', type: 'force', position: { x: 770, y: 450 }, data: { force: 'Electrostatic Attraction (Strong)' } }
    ]

    const initialEdges: Edge[] = [
      { id: 'e1', source: 'root', sourceHandle: 'bottom-source', target: 'ionic', targetHandle: 'top-target', animated: false, style: { stroke: '#3b82f6', strokeWidth: 2 } },
      { id: 'e2', source: 'root', sourceHandle: 'bottom-source', target: 'covalent', targetHandle: 'top-target', animated: false, style: { stroke: '#3b82f6', strokeWidth: 2 } },
      { id: 'e3', source: 'root', sourceHandle: 'bottom-source', target: 'metallic', targetHandle: 'top-target', animated: false, style: { stroke: '#3b82f6', strokeWidth: 2 } },
      
      { id: 'e4', source: 'ionic', sourceHandle: 'bottom-source', target: 'force_ionic', targetHandle: 'top-target', animated: true, label: 'Results in', style: { stroke: '#a855f7', strokeWidth: 2 } },
      { id: 'e5', source: 'covalent', sourceHandle: 'bottom-source', target: 'dative', targetHandle: 'top-target', animated: true, label: 'Special Case', style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' } },
      { id: 'e6', source: 'metallic', sourceHandle: 'bottom-source', target: 'force_metallic', targetHandle: 'top-target', animated: true, label: 'Results in', style: { stroke: '#a855f7', strokeWidth: 2 } }
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
    setEdges((eds) => addEdge({ ...params, animated: true, label: label || undefined, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds))
  }, [])

  const addConceptNode = () => setNodes(nds => nds.concat({ id: `node-${Date.now()}`, type: 'concept', position: { x: 400, y: 200 }, data: { title: 'New Bond', atoms: '', mechanism: '' } }))
  const addForceNode = () => setNodes(nds => nds.concat({ id: `force-${Date.now()}`, type: 'force', position: { x: 400, y: 350 }, data: { force: 'New Force' } }))

  const updateTheory = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, theory: prev.theory.map(item => item.id === id ? { ...item, [field]: value } : item) }))

  const tabs = [
    { id: 'canvas', label: 'Bonding Trees', icon: <Map size={18} /> },
    { id: 'theory', label: 'Theory & Rules', icon: <ListOrdered size={18} /> }
  ]

  return (
    <BuilderLayout
      title="Bonding Explorer"
      subtitle="Structure & Bonding Engine"
      backHref="/teacher/resources/chemistry/structure-bonding"
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
            <Panel position="top-right" className="m-4 flex flex-col gap-2">
              <button onClick={addConceptNode} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105">
                <Plus size={20} /> Add Concept
              </button>
              <button onClick={addForceNode} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105">
                <Magnet size={20} /> Add Force
              </button>
            </Panel>
            <Panel position="bottom-center" className="mb-4">
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-emerald-100 dark:border-emerald-900/50 flex items-start gap-4 max-w-xl">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white mb-1">The Golden Rule</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Bonds are formed between atoms to achieve a stable noble gas electron configuration. The type of atoms involved determines the mechanism.</p>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {activeTab === 'theory' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ListOrdered className="text-blue-500" /> Theory & Rules
              </h2>
              <div className="space-y-4">
                {learningData.theory.map((step) => (
                  <div key={step.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Concept Name</label>
                      <input value={step.title} onChange={e => updateTheory(step.id, 'title', e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none border-b border-transparent focus:border-blue-500 pb-1" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Scientific Explanation</label>
                      <textarea value={step.explanation} onChange={e => updateTheory(step.id, 'explanation', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20" />
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
