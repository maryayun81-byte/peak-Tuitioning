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
import { Share2, Plus, Trash2 } from 'lucide-react'

const ConceptNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-xl w-64 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} id="top-target" className="w-3 h-3 bg-indigo-500 border-2 border-white" />
      <Handle type="source" position={Position.Top} id="top-source" className="w-3 h-3 bg-indigo-500 border-2 border-white" style={{ left: '60%' }} />
      
      <Handle type="target" position={Position.Left} id="left-target" className="w-3 h-3 bg-indigo-500 border-2 border-white" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-3 h-3 bg-indigo-500 border-2 border-white" style={{ top: '60%' }} />

      {/* Header */}
      <div className="bg-indigo-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Share2 size={16} />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-indigo-200 font-black w-32"
            placeholder="e.g. Ionic Bonding"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-indigo-200 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 text-sm">
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Definition / Key Idea</label>
          <textarea 
            value={data.definition} 
            onChange={(e) => data.onChange(id, 'definition', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300 resize-none h-16" 
            placeholder="e.g. Electrostatic attraction between oppositely charged ions." 
          />
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-1 block">Examples / Properties</label>
          <textarea 
            value={data.properties} 
            onChange={(e) => data.onChange(id, 'properties', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-indigo-700 dark:text-indigo-400 resize-none h-16" 
            placeholder="e.g. NaCl, High Melting Point, Conducts in molten state." 
          />
        </div>
      </div>
      
      <Handle type="target" position={Position.Right} id="right-target" className="w-3 h-3 bg-indigo-500 border-2 border-white" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-3 h-3 bg-indigo-500 border-2 border-white" style={{ top: '60%' }} />

      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-3 h-3 bg-indigo-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-3 h-3 bg-indigo-500 border-2 border-white" style={{ left: '60%' }} />
    </div>
  )
}

const nodeTypes = {
  concept: ConceptNode
}

export default function StructureBondingMap() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  useState(() => {
    const initialNodes: Node[] = [
      {
        id: 'bonding',
        type: 'concept',
        position: { x: 400, y: 50 },
        data: { title: 'Chemical Bonding', definition: 'The process of atoms combining to form molecules or compounds to achieve stability.', properties: '' }
      },
      {
        id: 'ionic',
        type: 'concept',
        position: { x: 100, y: 350 },
        data: { title: 'Ionic Bonding', definition: 'Transfer of electrons from a metal to a non-metal.', properties: 'NaCl, MgO\nGiant Ionic Lattice' }
      },
      {
        id: 'covalent',
        type: 'concept',
        position: { x: 400, y: 350 },
        data: { title: 'Covalent Bonding', definition: 'Sharing of electron pairs between non-metal atoms.', properties: 'Giant Covalent (Diamond)\nSimple Molecular (H2O)' }
      },
      {
        id: 'metallic',
        type: 'concept',
        position: { x: 700, y: 350 },
        data: { title: 'Metallic Bonding', definition: 'Electrostatic attraction between metal cations and delocalized electrons.', properties: 'Copper, Iron\nConducts electricity' }
      }
    ]

    const initialEdges: Edge[] = [
      { id: 'e1', source: 'bonding', sourceHandle: 'bottom-source', target: 'ionic', targetHandle: 'top-target', animated: false, style: { stroke: '#6366f1', strokeWidth: 2 } },
      { id: 'e2', source: 'bonding', sourceHandle: 'bottom-source', target: 'covalent', targetHandle: 'top-target', animated: false, style: { stroke: '#6366f1', strokeWidth: 2 } },
      { id: 'e3', source: 'bonding', sourceHandle: 'bottom-source', target: 'metallic', targetHandle: 'top-target', animated: false, style: { stroke: '#6366f1', strokeWidth: 2 } }
    ]

    setNodes(initialNodes)
    setEdges(initialEdges)
  })

  const updateNodeData = useCallback((id: string, field: string, value: string) => {
    setNodes(nds => nds.map(node => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, [field]: value } }
      }
      return node
    }))
  }, [])

  const deleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(node => node.id !== id))
    setEdges(eds => eds.filter(edge => edge.source !== id && edge.target !== id))
  }, [])

  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: { ...node.data, onChange: updateNodeData, onDelete: deleteNode }
  }))

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), [])
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])
  
  const onConnect = useCallback((params: Connection | Edge) => {
    setEdges((eds) => addEdge({ 
      ...params, 
      animated: false,
      style: { stroke: '#6366f1', strokeWidth: 2 } 
    }, eds))
  }, [])

  const addConcept = () => {
    setNodes((nds) => nds.concat({
      id: `node-${Date.now()}`,
      type: 'concept',
      position: { x: 400, y: 600 },
      data: { title: 'New Concept', definition: '', properties: '' }
    }))
  }

  return (
    <BuilderLayout
      title="Types of Chemical Bonding"
      subtitle="Structure & Bonding Tree"
      backHref="/teacher/resources/chemistry/concept-engine"
      isSaving={isSaving}
      onSave={() => setIsSaving(true)}
      onExport={() => alert('Exporting map...')}
    >
      <div className="flex-1 w-full h-full relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          className="bg-slate-50 dark:bg-slate-950"
        >
          <Background color="#cbd5e1" gap={24} size={2} />
          <Controls className="bg-white dark:bg-slate-900 border-none shadow-lg rounded-xl overflow-hidden" />
          
          <Panel position="top-right" className="m-4">
            <button 
              onClick={addConcept}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-105"
            >
              <Plus size={20} />
              Add Knowledge Node
            </button>
          </Panel>
          
          <Panel position="bottom-center" className="mb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm text-sm font-bold text-slate-500 border border-slate-200 dark:border-slate-800">
            Build hierarchical knowledge trees by connecting nodes in any direction
          </Panel>
        </ReactFlow>
      </div>
    </BuilderLayout>
  )
}
