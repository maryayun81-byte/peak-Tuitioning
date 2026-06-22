'use client'

import React, { useState, useCallback } from 'react'
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
import { GitBranch, Plus, Trash2, ShieldAlert } from 'lucide-react'

// --- Custom Nodes ---

const ConceptNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl shadow-xl w-72 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} id="top-target" className="w-3 h-3 bg-emerald-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} id="top-source" className="w-3 h-3 bg-emerald-500 border-2 border-white" style={{ left: '60%' }} />
      <Handle type="target" position={Position.Left} id="left-target" className="w-3 h-3 bg-emerald-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-3 h-3 bg-emerald-500 border-2 border-white" style={{ top: '60%' }} />

      <div className="bg-emerald-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <GitBranch size={16} />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-emerald-200 font-black w-32"
            placeholder="Category"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-emerald-200 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm">
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Metals</label>
          <textarea 
            value={data.metals} 
            onChange={(e) => data.onChange(id, 'metals', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300 resize-none min-h-[120px]" 
            placeholder="e.g. Potassium, Sodium" 
          />
        </div>
      </div>
      
      <Handle type="target" position={Position.Right} id="right-target" className="w-3 h-3 bg-emerald-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-3 h-3 bg-emerald-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-3 h-3 bg-emerald-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-3 h-3 bg-emerald-500 border-2 border-white" style={{ left: '60%' }} />
    </div>
  )
}

const MethodNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700 rounded-xl shadow-lg w-56 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} id="top-target" className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} id="top-source" className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ left: '60%' }} />
      <Handle type="target" position={Position.Left} id="left-target" className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ top: '60%' }} />

      <div className="p-3 text-center">
        <label className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1 block">Extraction Method</label>
        <input 
          type="text" 
          value={data.method} 
          onChange={(e) => data.onChange(id, 'method', e.target.value)}
          className="w-full bg-transparent text-center border-none outline-none text-amber-900 dark:text-amber-100 font-bold"
          placeholder="e.g. Electrolysis"
        />
      </div>

      <Handle type="target" position={Position.Right} id="right-target" className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-3 h-3 bg-amber-500 border-2 border-white" style={{ left: '60%' }} />
    </div>
  )
}

const nodeTypes = { concept: ConceptNode, method: MethodNode }

// --- Main Component ---

export default function ReactivitySeriesTree() {
  const [isSaving, setIsSaving] = useState(false)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useState(() => {
    const initialNodes: Node[] = [
      { id: 'root', type: 'concept', position: { x: 400, y: 50 }, data: { title: 'Reactivity Series', metals: 'K, Na, Ca, Mg, Al, Zn, Fe, Pb, (H), Cu, Ag, Au' } },
      
      { id: 'above', type: 'concept', position: { x: 100, y: 250 }, data: { title: 'Above Carbon', metals: 'Potassium\nSodium\nCalcium\nMagnesium\nAluminium' } },
      { id: 'electrolysis', type: 'method', position: { x: 120, y: 450 }, data: { method: 'Electrolysis of Molten Ore' } },

      { id: 'below', type: 'concept', position: { x: 400, y: 250 }, data: { title: 'Below Carbon', metals: 'Zinc\nIron\nLead\n(Copper)' } },
      { id: 'reduction', type: 'method', position: { x: 420, y: 450 }, data: { method: 'Reduction with Carbon' } },

      { id: 'unreactive', type: 'concept', position: { x: 700, y: 250 }, data: { title: 'Very Unreactive', metals: 'Silver\nGold\nPlatinum' } },
      { id: 'native', type: 'method', position: { x: 720, y: 450 }, data: { method: 'Found Native (Uncombined)' } }
    ]

    const initialEdges: Edge[] = [
      { id: 'e1', source: 'root', sourceHandle: 'bottom-source', target: 'above', targetHandle: 'top-target', animated: false, style: { stroke: '#10b981', strokeWidth: 2 } },
      { id: 'e2', source: 'root', sourceHandle: 'bottom-source', target: 'below', targetHandle: 'top-target', animated: false, style: { stroke: '#10b981', strokeWidth: 2 } },
      { id: 'e3', source: 'root', sourceHandle: 'bottom-source', target: 'unreactive', targetHandle: 'top-target', animated: false, style: { stroke: '#10b981', strokeWidth: 2 } },
      
      { id: 'e4', source: 'above', sourceHandle: 'bottom-source', target: 'electrolysis', targetHandle: 'top-target', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
      { id: 'e5', source: 'below', sourceHandle: 'bottom-source', target: 'reduction', targetHandle: 'top-target', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
      { id: 'e6', source: 'unreactive', sourceHandle: 'bottom-source', target: 'native', targetHandle: 'top-target', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } }
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
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } }, eds))
  }, [])

  const addCategory = () => setNodes(nds => nds.concat({ id: `cat-${Date.now()}`, type: 'concept', position: { x: 400, y: 150 }, data: { title: 'New Category', metals: '' } }))
  const addMethod = () => setNodes(nds => nds.concat({ id: `meth-${Date.now()}`, type: 'method', position: { x: 400, y: 350 }, data: { method: 'New Method' } }))

  return (
    <BuilderLayout
      title="Reactivity Series Decision Tree"
      subtitle="Foundation Module"
      backHref="/teacher/resources/chemistry/extraction"
      isSaving={isSaving}
      onSave={() => setIsSaving(true)}
      onExport={() => alert('Exporting map...')}
    >
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#cbd5e1" gap={24} size={2} />
          <Controls className="bg-white dark:bg-slate-900 border-none shadow-lg rounded-xl overflow-hidden" />
          
          <Panel position="top-right" className="m-4 flex flex-col gap-2">
            <button onClick={addCategory} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-lg transition-all hover:scale-105 text-sm">
              <Plus size={16} /> Add Category
            </button>
            <button onClick={addMethod} className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl shadow-lg transition-all hover:scale-105 text-sm">
              <Plus size={16} /> Add Method
            </button>
          </Panel>

          <Panel position="bottom-center" className="mb-4">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-rose-100 dark:border-rose-900/50 flex items-start gap-4 max-w-xl">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white mb-1">Golden Rule of Extraction</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">The method used to extract a metal from its ore depends on its position in the reactivity series. Carbon is the reference point for reduction.</p>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </BuilderLayout>
  )
}
