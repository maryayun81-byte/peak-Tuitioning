'use client'

import React, { useState, useCallback } from 'react'
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position
} from 'reactflow'
import 'reactflow/dist/style.css'

// Define nodeTypes outside of component to avoid infinite loop
const CustomNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-xl bg-white border-2 border-slate-200 min-w-[180px] relative">
      <Handle type="target" position={Position.Top} id="t-top" className="w-3 h-3 bg-indigo-500" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '30%' }} className="w-3 h-3 bg-indigo-500" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '70%' }} className="w-3 h-3 bg-emerald-500" />
      <Handle type="target" position={Position.Left} id="t-left" className="w-3 h-3 bg-indigo-500" />
      <Handle type="source" position={Position.Right} id="s-right" className="w-3 h-3 bg-emerald-500" />

      <div className="font-black text-center text-slate-800">{data.label}</div>
      {data.sublabel && <div className="text-sm font-medium text-slate-500 text-center mt-1">{data.sublabel}</div>}
    </div>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

const initialNodes: Node[] = [
  // Enthalpy Cycle
  {
    id: 'reactants',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: { label: 'Reactants', sublabel: '(e.g., C + O₂)' }
  },
  {
    id: 'products',
    type: 'custom',
    position: { x: 600, y: 100 },
    data: { label: 'Products', sublabel: '(e.g., CO₂)' }
  },
  {
    id: 'intermediates',
    type: 'custom',
    position: { x: 350, y: 300 },
    data: { label: 'Intermediates', sublabel: '(e.g., CO + ½O₂)' }
  },
  
  // Solution Energy Cycle
  {
    id: 'ionic-solid',
    type: 'custom',
    position: { x: 100, y: 550 },
    data: { label: 'Ionic Solid', sublabel: 'NaCl(s)' }
  },
  {
    id: 'gaseous-ions',
    type: 'custom',
    position: { x: 350, y: 750 },
    data: { label: 'Gaseous Ions', sublabel: 'Na⁺(g) + Cl⁻(g)' }
  },
  {
    id: 'aqueous-ions',
    type: 'custom',
    position: { x: 600, y: 550 },
    data: { label: 'Aqueous Ions', sublabel: 'Na⁺(aq) + Cl⁻(aq)' }
  }
]

const initialEdges: Edge[] = [
  // Enthalpy Cycle Edges
  {
    id: 'e-r-p',
    source: 'reactants',
    target: 'products',
    sourceHandle: 's-right',
    targetHandle: 't-left',
    label: 'Direct route ΔH',
    markerEnd: { type: MarkerType.ArrowClosed },
    type: 'smoothstep',
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
    labelStyle: { fontWeight: 'bold', fill: '#334155' }
  },
  {
    id: 'e-r-i',
    source: 'reactants',
    target: 'intermediates',
    sourceHandle: 's-bottom',
    targetHandle: 't-top',
    label: 'ΔH₁',
    markerEnd: { type: MarkerType.ArrowClosed },
    type: 'smoothstep',
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
    labelStyle: { fontWeight: 'bold', fill: '#334155' }
  },
  {
    id: 'e-i-p',
    source: 'intermediates',
    target: 'products',
    sourceHandle: 's-right',
    targetHandle: 't-bottom',
    label: 'ΔH₂',
    markerEnd: { type: MarkerType.ArrowClosed },
    type: 'smoothstep',
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
    labelStyle: { fontWeight: 'bold', fill: '#334155' }
  },
  
  // Solution Energy Cycle Edges
  {
    id: 's-is-ai',
    source: 'ionic-solid',
    target: 'aqueous-ions',
    sourceHandle: 's-right',
    targetHandle: 't-left',
    label: 'ΔH solution',
    markerEnd: { type: MarkerType.ArrowClosed },
    type: 'smoothstep',
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
    labelStyle: { fontWeight: 'bold', fill: '#334155' }
  },
  {
    id: 's-is-gi',
    source: 'ionic-solid',
    target: 'gaseous-ions',
    sourceHandle: 's-bottom',
    targetHandle: 't-top',
    label: 'Lattice Enthalpy',
    markerEnd: { type: MarkerType.ArrowClosed },
    type: 'smoothstep',
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
    labelStyle: { fontWeight: 'bold', fill: '#334155' }
  },
  {
    id: 's-gi-ai',
    source: 'gaseous-ions',
    target: 'aqueous-ions',
    sourceHandle: 's-right',
    targetHandle: 't-bottom',
    label: 'Hydration Enthalpy',
    markerEnd: { type: MarkerType.ArrowClosed },
    type: 'smoothstep',
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
    labelStyle: { fontWeight: 'bold', fill: '#334155' }
  }
]

export default function HessLawBuilder() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)
  const [isSaving, setIsSaving] = useState(false)

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    []
  )

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 800)
  }

  const exportData = {
    type: 'HESS_LAW',
    nodes,
    edges
  }

  return (
    <BuilderLayout
      title="Hess's Law & Cycles Builder"
      subtitle="Enthalpy Changes Engine"
      backHref="/teacher/resources/chemistry/enthalpy"
      isSaving={isSaving}
      onSave={handleSave}
      exportData={exportData}
    >
      <div className="w-full h-full bg-slate-50 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-50"
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls className="bg-white shadow-md border border-slate-200 rounded-lg" />
          <MiniMap className="bg-white shadow-md border border-slate-200 rounded-lg" />
        </ReactFlow>
      </div>
    </BuilderLayout>
  )
}
