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
import { Hexagon, Plus, Trash2, Atom } from 'lucide-react'

const CompoundNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-pink-200 dark:border-pink-800 rounded-3xl shadow-xl w-64 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-pink-500 border-2 border-white" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-pink-500 border-2 border-white" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Hexagon size={18} className="text-pink-100" />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-pink-200 font-black w-32"
            placeholder="e.g. Ethene"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-pink-200 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 text-sm">
        <div className="bg-pink-50 dark:bg-pink-900/10 p-2 rounded-xl border border-pink-100 dark:border-pink-800/50">
          <label className="text-[10px] font-black text-pink-500 uppercase tracking-wider mb-1 block">Homologous Series</label>
          <input 
            value={data.series} 
            onChange={(e) => data.onChange(id, 'series', e.target.value)}
            className="w-full bg-transparent outline-none font-bold text-pink-700 dark:text-pink-400" 
            placeholder="e.g. Alkene" 
          />
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Formula / Structure</label>
          <input 
            value={data.formula} 
            onChange={(e) => data.onChange(id, 'formula', e.target.value)}
            className="w-full bg-transparent outline-none font-mono text-slate-700 dark:text-slate-300 text-xs" 
            placeholder="e.g. C2H4" 
          />
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-pink-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-pink-500 border-2 border-white" />
    </div>
  )
}

const nodeTypes = {
  compound: CompoundNode
}

export default function OrganicChemistryMap() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  useState(() => {
    const initialNodes: Node[] = [
      {
        id: 'alkene',
        type: 'compound',
        position: { x: 100, y: 200 },
        data: { title: 'Ethene', series: 'Alkene', formula: 'C2H4' }
      },
      {
        id: 'alkane',
        type: 'compound',
        position: { x: 500, y: 200 },
        data: { title: 'Ethane', series: 'Alkane', formula: 'C2H6' }
      },
      {
        id: 'alcohol',
        type: 'compound',
        position: { x: 500, y: 500 },
        data: { title: 'Ethanol', series: 'Alcohol', formula: 'C2H5OH' }
      }
    ]

    const initialEdges: Edge[] = [
      { 
        id: 'e1', source: 'alkene', sourceHandle: 'right', target: 'alkane', targetHandle: 'left', 
        animated: true, 
        label: '+H2, Ni cat, 150°C', 
        style: { stroke: '#ec4899', strokeWidth: 2 } 
      },
      { 
        id: 'e2', source: 'alkene', sourceHandle: 'bottom', target: 'alcohol', targetHandle: 'left', 
        animated: true, 
        label: '+H2O(g), H3PO4, 300°C, 60atm', 
        style: { stroke: '#ec4899', strokeWidth: 2 } 
      }
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
    const label = window.prompt("Enter reaction conditions (e.g. Reagent, Catalyst, Temp):", "")
    setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      label: label || undefined,
      style: { stroke: '#ec4899', strokeWidth: 2 } 
    }, eds))
  }, [])

  const addCompound = () => {
    setNodes((nds) => nds.concat({
      id: `node-${Date.now()}`,
      type: 'compound',
      position: { x: 300, y: 350 },
      data: { title: 'New Compound', series: '', formula: '' }
    }))
  }

  return (
    <BuilderLayout
      title="Alkenes to Alcohols"
      subtitle="Organic Chemistry Network"
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
              onClick={addCompound}
              className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-105"
            >
              <Hexagon size={20} />
              Add Organic Compound
            </button>
          </Panel>
          
          <Panel position="bottom-center" className="mb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm text-sm font-bold text-slate-500 border border-slate-200 dark:border-slate-800">
            Connect nodes to label the reaction pathway conditions
          </Panel>
        </ReactFlow>
      </div>
    </BuilderLayout>
  )
}
