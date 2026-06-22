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
import { Flame, Plus, Trash2, ArrowUpRight } from 'lucide-react'

const EnergyStateNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-800 rounded-2xl shadow-xl w-64 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-rose-500 border-2 border-white" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-rose-500 border-2 border-white" />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-orange-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Flame size={18} className="text-rose-100" />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-rose-200 font-black w-32"
            placeholder="e.g. Reactants"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-rose-200 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 text-sm">
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Chemical Species</label>
          <input 
            value={data.species} 
            onChange={(e) => data.onChange(id, 'species', e.target.value)}
            className="w-full bg-transparent outline-none font-mono text-slate-700 dark:text-slate-300 text-xs" 
            placeholder="e.g. N2(g) + 3H2(g)" 
          />
        </div>
        
        <div className="bg-rose-50 dark:bg-rose-900/10 p-2 rounded-xl border border-rose-100 dark:border-rose-800/50 flex items-center gap-2">
          <ArrowUpRight size={14} className="text-rose-500" />
          <input 
            value={data.energy} 
            onChange={(e) => data.onChange(id, 'energy', e.target.value)}
            className="w-full bg-transparent outline-none font-bold text-rose-700 dark:text-rose-400" 
            placeholder="Energy Level (kJ/mol)" 
          />
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-rose-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-rose-500 border-2 border-white" />
    </div>
  )
}

const nodeTypes = {
  energyState: EnergyStateNode
}

export default function EnthalpyFlowMap() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  useState(() => {
    const initialNodes: Node[] = [
      {
        id: 'reactants',
        type: 'energyState',
        position: { x: 100, y: 300 },
        data: { title: 'Reactants', species: 'CH4(g) + 2O2(g)', energy: '0 kJ/mol (baseline)' }
      },
      {
        id: 'transition',
        type: 'energyState',
        position: { x: 400, y: 100 },
        data: { title: 'Transition State', species: 'Activated Complex', energy: '+ E_a' }
      },
      {
        id: 'products',
        type: 'energyState',
        position: { x: 700, y: 500 },
        data: { title: 'Products', species: 'CO2(g) + 2H2O(l)', energy: '-890 kJ/mol' }
      }
    ]

    const initialEdges: Edge[] = [
      { 
        id: 'e1', source: 'reactants', sourceHandle: 'right', target: 'transition', targetHandle: 'left', 
        animated: true, 
        label: 'Activation Energy (Bond Breaking)', 
        style: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '5,5' } 
      },
      { 
        id: 'e2', source: 'transition', sourceHandle: 'right', target: 'products', targetHandle: 'top', 
        animated: true, 
        label: 'Bond Formation (Exothermic)', 
        style: { stroke: '#10b981', strokeWidth: 2 } 
      },
      { 
        id: 'e3', source: 'reactants', sourceHandle: 'bottom', target: 'products', targetHandle: 'left', 
        animated: true, 
        label: 'ΔH = -890 kJ/mol', 
        style: { stroke: '#3b82f6', strokeWidth: 3 } 
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
    const label = window.prompt("Enter enthalpy change (e.g. ΔH = -890 kJ/mol, Activation Energy):", "")
    setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      label: label || undefined,
      style: { stroke: '#f43f5e', strokeWidth: 2 } 
    }, eds))
  }, [])

  const addEnergyState = () => {
    setNodes((nds) => nds.concat({
      id: `node-${Date.now()}`,
      type: 'energyState',
      position: { x: 400, y: 300 },
      data: { title: 'New State', species: '', energy: '' }
    }))
  }

  return (
    <BuilderLayout
      title="Combustion of Methane"
      subtitle="Energy Flow Map"
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
              onClick={addEnergyState}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-105"
            >
              <Flame size={20} />
              Add Energy State
            </button>
          </Panel>
          
          <Panel position="bottom-center" className="mb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm text-sm font-bold text-slate-500 border border-slate-200 dark:border-slate-800">
            Position nodes vertically to represent energy levels (Hess Law cycles)
          </Panel>
        </ReactFlow>
      </div>
    </BuilderLayout>
  )
}
