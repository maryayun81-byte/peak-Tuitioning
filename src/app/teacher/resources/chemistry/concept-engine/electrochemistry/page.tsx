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
import { Battery, Plus, Trash2 } from 'lucide-react'

const ElectrodeNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-cyan-200 dark:border-cyan-800 rounded-2xl shadow-xl w-72 overflow-hidden font-sans">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-500 border-2 border-white" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-cyan-500 border-2 border-white" />
      
      {/* Header */}
      <div className="bg-cyan-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Battery size={16} />
          <input 
            type="text" 
            value={data.title} 
            onChange={(e) => data.onChange(id, 'title', e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-cyan-200 font-bold w-40"
            placeholder="e.g. Anode"
          />
        </div>
        <button onClick={() => data.onDelete(id)} className="text-cyan-200 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 text-sm">
        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Process</label>
          <input 
            value={data.process} 
            onChange={(e) => data.onChange(id, 'process', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300" 
            placeholder="e.g. Oxidation" 
          />
        </div>
        
        <div className="bg-cyan-50 dark:bg-cyan-900/10 p-2 rounded-lg border border-cyan-100 dark:border-cyan-800/50">
          <label className="text-[10px] font-black text-cyan-500 uppercase tracking-wider mb-1 block">Half-Equation</label>
          <input 
            value={data.equation} 
            onChange={(e) => data.onChange(id, 'equation', e.target.value)}
            className="w-full bg-transparent outline-none font-mono text-cyan-700 dark:text-cyan-400 text-xs" 
            placeholder="e.g. 2Cl- -> Cl2 + 2e-" 
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Observations</label>
          <input 
            value={data.observations} 
            onChange={(e) => data.onChange(id, 'observations', e.target.value)}
            className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300" 
            placeholder="e.g. Green-yellow gas bubbles" 
          />
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-cyan-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-500 border-2 border-white" />
    </div>
  )
}

const ComponentNode = ({ data, id }: { data: any, id: string }) => {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-full px-6 py-3 shadow-md font-sans flex items-center justify-between gap-4 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-slate-400" />
      
      <input 
        type="text" 
        value={data.title} 
        onChange={(e) => data.onChange(id, 'title', e.target.value)}
        className="bg-transparent border-none outline-none text-slate-800 dark:text-white font-bold w-full text-center"
        placeholder="Component Name"
      />
      
      <button onClick={() => data.onDelete(id)} className="text-slate-400 hover:text-rose-500 transition-colors shrink-0">
        <Trash2 size={14} />
      </button>
      
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
    </div>
  )
}

const nodeTypes = {
  electrode: ElectrodeNode,
  component: ComponentNode
}

export default function ElectrochemistryMap() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  useState(() => {
    const initialNodes: Node[] = [
      {
        id: 'anode',
        type: 'electrode',
        position: { x: 100, y: 200 },
        data: { 
          title: 'Anode (Positive)', process: 'Oxidation', equation: '2Cl⁻ → Cl₂ + 2e⁻', observations: 'Green-yellow gas bubbles' 
        }
      },
      {
        id: 'cathode',
        type: 'electrode',
        position: { x: 700, y: 200 },
        data: { 
          title: 'Cathode (Negative)', process: 'Reduction', equation: 'Na⁺ + e⁻ → Na', observations: 'Grey molten metal' 
        }
      },
      {
        id: 'battery',
        type: 'component',
        position: { x: 400, y: 50 },
        data: { title: 'Battery / Power Source' }
      },
      {
        id: 'electrolyte',
        type: 'component',
        position: { x: 400, y: 400 },
        data: { title: 'Electrolyte: Molten NaCl' }
      }
    ]

    const initialEdges: Edge[] = [
      { id: 'e1', source: 'anode', sourceHandle: 'top', target: 'battery', targetHandle: 'left', animated: true, label: 'e⁻ flow', style: { stroke: '#06b6d4', strokeWidth: 2 } },
      { id: 'e2', source: 'battery', sourceHandle: 'right', target: 'cathode', targetHandle: 'top', animated: true, label: 'e⁻ flow', style: { stroke: '#06b6d4', strokeWidth: 2 } },
      { id: 'e3', source: 'electrolyte', sourceHandle: 'left', target: 'anode', targetHandle: 'bottom', animated: true, label: 'Cl⁻ migration', style: { stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '5,5' } },
      { id: 'e4', source: 'electrolyte', sourceHandle: 'right', target: 'cathode', targetHandle: 'bottom', animated: true, label: 'Na⁺ migration', style: { stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '5,5' } }
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
    data: {
      ...node.data,
      onChange: updateNodeData,
      onDelete: deleteNode
    }
  }))

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), [])
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])
  
  // Custom connection handler to prompt for edge label
  const onConnect = useCallback((params: Connection | Edge) => {
    const label = window.prompt("Enter arrow label (e.g. 'e- flow', 'ion migration'):", "")
    setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      label: label || undefined,
      style: { stroke: '#06b6d4', strokeWidth: 2 } 
    }, eds))
  }, [])

  const addElectrode = () => {
    setNodes((nds) => nds.concat({
      id: `node-${Date.now()}`,
      type: 'electrode',
      position: { x: 400, y: 200 },
      data: { title: 'New Electrode', process: '', equation: '', observations: '' }
    }))
  }

  const addComponent = () => {
    setNodes((nds) => nds.concat({
      id: `node-${Date.now()}`,
      type: 'component',
      position: { x: 400, y: 200 },
      data: { title: 'New Component' }
    }))
  }

  return (
    <BuilderLayout
      title="Electrolysis of Molten NaCl"
      subtitle="Electrochemistry Map"
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
          
          <Panel position="top-right" className="m-4 flex flex-col gap-2">
            <button 
              onClick={addElectrode}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105"
            >
              <Plus size={20} />
              Add Electrode
            </button>
            <button 
              onClick={addComponent}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition-all hover:scale-105"
            >
              <Plus size={20} />
              Add Component
            </button>
          </Panel>
          
          <Panel position="bottom-center" className="mb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm text-sm font-bold text-slate-500 border border-slate-200 dark:border-slate-800">
            Connect nodes to add labeled arrows (e.g. electron flow)
          </Panel>
        </ReactFlow>
      </div>
    </BuilderLayout>
  )
}
