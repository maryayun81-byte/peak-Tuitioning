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
import { Layers, Plus, Trash2, Map, ListOrdered, Blocks, Activity } from 'lucide-react'

// --- Custom Nodes ---

const StructureNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl shadow-xl w-64 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-emerald-500 border-2 border-white" style={{ left: '60%' }} />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-white" style={{ top: '60%' }} />

      <div className="bg-emerald-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Layers size={16} />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-emerald-200 font-black w-40"
            placeholder="Structure Type"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-emerald-200 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm">
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Forces Present</label>
          <input 
            value={data.forces} 
            onChange={(e) => data.onChange(id, 'forces', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300" 
            placeholder="e.g. Strong Electrostatic" 
          />
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
          <label className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1 block">Examples</label>
          <input 
            value={data.examples} 
            onChange={(e) => data.onChange(id, 'examples', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-emerald-700 dark:text-emerald-400" 
            placeholder="e.g. NaCl, MgO" 
          />
        </div>
      </div>
      
      <Handle type="target" position={Position.Right} className="w-3 h-3 bg-emerald-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Bottom} className="w-3 h-3 bg-emerald-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500 border-2 border-white" style={{ left: '60%' }} />
    </div>
  )
}

const PropertyNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700 rounded-xl shadow-lg w-56 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ left: '60%' }} />
      
      <div className="p-3">
        <label className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1 block">Physical Property</label>
        <textarea 
          value={data.property} 
          onChange={(e) => data.onChange(id, 'property', e.target.value)}
          className="w-full bg-transparent border-none outline-none text-amber-900 dark:text-amber-100 font-bold resize-none h-12"
          placeholder="e.g. High Melting Point"
        />
      </div>

      <Handle type="target" position={Position.Bottom} className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ left: '60%' }} />
    </div>
  )
}

const nodeTypes = { structure: StructureNode, property: PropertyNode }

// --- Main Builder ---
export default function StructureExplorer() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'theory'>('canvas')
  const [isSaving, setIsSaving] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [learningData, setLearningData] = useState({
    theory: [
      { id: '1', title: 'Giant Ionic Lattice', explanation: 'A 3D network of alternating positive and negative ions held together by strong electrostatic forces of attraction. Takes a large amount of energy to break these bonds, hence high melting points.' },
      { id: '2', title: 'Giant Covalent Structure', explanation: 'A 3D network of atoms held together by strong covalent bonds. Examples include Diamond and Silicon(IV) Oxide. They are extremely hard and have very high melting points.' },
      { id: '3', title: 'Simple Molecular Structure', explanation: 'Small distinct molecules (like H2O or CO2) with strong covalent bonds WITHIN the molecule, but very weak intermolecular forces BETWEEN the molecules. Easy to separate, so low boiling points.' },
      { id: '4', title: 'Giant Metallic Lattice', explanation: 'A regular arrangement of positive metal ions in a sea of delocalized electrons. The strong electrostatic attraction between the ions and electrons gives high melting points, and the free electrons allow conductivity.' }
    ]
  })

  useState(() => {
    const initialNodes: Node[] = [
      { id: 'ionic', type: 'structure', position: { x: 50, y: 150 }, data: { title: 'Giant Ionic', forces: 'Strong Electrostatic', examples: 'NaCl, MgO' } },
      { id: 'prop_ionic1', type: 'property', position: { x: 70, y: 400 }, data: { property: 'High Melting/Boiling Point' } },
      { id: 'prop_ionic2', type: 'property', position: { x: 70, y: 550 }, data: { property: 'Conducts when molten or aqueous (mobile ions)' } },

      { id: 'simple', type: 'structure', position: { x: 400, y: 150 }, data: { title: 'Simple Molecular', forces: 'Weak Intermolecular', examples: 'CO2, H2O, I2' } },
      { id: 'prop_simple', type: 'property', position: { x: 420, y: 400 }, data: { property: 'Low Melting/Boiling Point (Easy to overcome weak forces)' } },

      { id: 'giantcov', type: 'structure', position: { x: 750, y: 150 }, data: { title: 'Giant Covalent', forces: 'Strong Covalent', examples: 'Diamond, Graphite, SiO2' } },
      { id: 'prop_gc1', type: 'property', position: { x: 770, y: 400 }, data: { property: 'Very High Melting Point (Hard to break network)' } },

      { id: 'metallic', type: 'structure', position: { x: 1100, y: 150 }, data: { title: 'Metallic Lattice', forces: 'Strong Electrostatic (Delocalized)', examples: 'Cu, Fe, Mg' } },
      { id: 'prop_met1', type: 'property', position: { x: 1120, y: 400 }, data: { property: 'Conducts electricity (Solid & Liquid) via delocalized e-' } }
    ]

    const initialEdges: Edge[] = [
      { id: 'e1', source: 'ionic', sourceHandle: 'bottom-source', target: 'prop_ionic1', targetHandle: 'top-target', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
      { id: 'e2', source: 'prop_ionic1', sourceHandle: 'bottom-source', target: 'prop_ionic2', targetHandle: 'top-target', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
      
      { id: 'e3', source: 'simple', sourceHandle: 'bottom-source', target: 'prop_simple', targetHandle: 'top-target', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
      { id: 'e4', source: 'giantcov', sourceHandle: 'bottom-source', target: 'prop_gc1', targetHandle: 'top-target', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
      { id: 'e5', source: 'metallic', sourceHandle: 'bottom-source', target: 'prop_met1', targetHandle: 'top-target', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }
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
    setEdges((eds) => addEdge({ ...params, animated: true, label: label || undefined, style: { stroke: '#10b981', strokeWidth: 2 } }, eds))
  }, [])

  const addStructureNode = () => setNodes(nds => nds.concat({ id: `node-${Date.now()}`, type: 'structure', position: { x: 400, y: 50 }, data: { title: 'New Structure', forces: '', examples: '' } }))
  const addPropertyNode = () => setNodes(nds => nds.concat({ id: `prop-${Date.now()}`, type: 'property', position: { x: 400, y: 250 }, data: { property: 'New Property' } }))

  const updateTheory = (id: string, field: string, value: string) => setLearningData(prev => ({ ...prev, theory: prev.theory.map(item => item.id === id ? { ...item, [field]: value } : item) }))

  const tabs = [
    { id: 'canvas', label: 'Structure Trees', icon: <Map size={18} /> },
    { id: 'theory', label: 'Theory Explanations', icon: <ListOrdered size={18} /> }
  ]

  return (
    <BuilderLayout
      title="Structure Explorer"
      subtitle="Structure & Bonding Engine"
      backHref="/teacher/resources/chemistry/structure-bonding"
      isSaving={isSaving}
      onSave={() => setIsSaving(true)}
      exportData={{ type: 'STRUCTURE_MAPPING', nodes, edges, learningData }}
    >
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
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
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
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
              <button onClick={addStructureNode} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105">
                <Plus size={20} /> Add Structure
              </button>
              <button onClick={addPropertyNode} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105">
                <Plus size={20} /> Add Property
              </button>
            </Panel>
            <Panel position="bottom-center" className="mb-4">
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-emerald-100 dark:border-emerald-900/50 flex items-start gap-4 max-w-xl">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white mb-1">Forces determine Properties</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Physical properties like melting point and conductivity are entirely determined by the strength and nature of the forces holding the structure together.</p>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {activeTab === 'theory' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ListOrdered className="text-emerald-500" /> Theory & Explanations
              </h2>
              <div className="space-y-4">
                {learningData.theory.map((step) => (
                  <div key={step.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Structure Type</label>
                      <input value={step.title} onChange={e => updateTheory(step.id, 'title', e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none border-b border-transparent focus:border-emerald-500 pb-1" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Detailed Explanation</label>
                      <textarea value={step.explanation} onChange={e => updateTheory(step.id, 'explanation', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-24" />
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
