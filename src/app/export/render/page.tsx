'use client'

import React, { useEffect, useState } from 'react'
import { Map, Package, ListOrdered, AlertTriangle } from 'lucide-react'
import ReactFlow, { Background, Edge, Node } from 'reactflow'
import 'reactflow/dist/style.css'

const StageNodePrint = ({ data }: { data: any }) => (
  <div className="bg-white border-2 border-rose-200 rounded-2xl shadow-sm w-72 overflow-hidden font-sans relative">
    <Handle type="target" position={Position.Top} id="top-target" className="opacity-0 w-3 h-3 bg-rose-500 border-2 border-white" />
    <Handle type="source" position={Position.Top} id="top-source" className="opacity-0 w-3 h-3 bg-rose-500 border-2 border-white" style={{ left: '60%' }} />
    <Handle type="target" position={Position.Left} id="left-target" className="opacity-0 w-3 h-3 bg-rose-500 border-2 border-white" />
    <Handle type="source" position={Position.Left} id="left-source" className="opacity-0 w-3 h-3 bg-rose-500 border-2 border-white" style={{ top: '60%' }} />
    <Handle type="target" position={Position.Right} id="right-target" className="opacity-0 w-3 h-3 bg-rose-500 border-2 border-white" />
    <Handle type="source" position={Position.Right} id="right-source" className="opacity-0 w-3 h-3 bg-rose-500 border-2 border-white" style={{ top: '60%' }} />
    <Handle type="target" position={Position.Bottom} id="bottom-target" className="opacity-0 w-3 h-3 bg-rose-500 border-2 border-white" />
    <Handle type="source" position={Position.Bottom} id="bottom-source" className="opacity-0 w-3 h-3 bg-rose-500 border-2 border-white" style={{ left: '60%' }} />

    <div className="bg-rose-500 text-white p-2 font-bold flex items-center justify-center text-sm">
      {data.title || 'Stage Name'}
    </div>
    <div className="p-3 space-y-2 text-xs">
      <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
        <label className="text-[9px] font-black text-slate-400 uppercase block">Inputs</label>
        <div className="font-medium text-slate-700">{data.inputs || '-'}</div>
      </div>
      <div className="bg-orange-50 p-1.5 rounded border border-orange-100">
        <label className="text-[9px] font-black text-orange-400 uppercase block">Conditions</label>
        <div className="font-medium text-orange-800">{data.conditions || '-'}</div>
      </div>
      <div className="bg-emerald-50 p-1.5 rounded border border-emerald-100">
        <label className="text-[9px] font-black text-emerald-500 uppercase block">Outputs</label>
        <div className="font-bold text-emerald-700">{data.outputs || '-'}</div>
      </div>
    </div>
  </div>
)

const StructureNodePrint = ({ data }: { data: any }) => (
  <div className="bg-white border-2 border-emerald-200 rounded-xl shadow-sm w-64 overflow-hidden font-sans relative">
    <Handle type="target" position={Position.Top} className="opacity-0" />
    <Handle type="source" position={Position.Top} className="opacity-0" style={{ left: '60%' }} />
    <Handle type="target" position={Position.Left} className="opacity-0" />
    <Handle type="source" position={Position.Left} className="opacity-0" style={{ top: '60%' }} />
    <Handle type="target" position={Position.Right} className="opacity-0" />
    <Handle type="source" position={Position.Right} className="opacity-0" style={{ top: '60%' }} />
    <Handle type="target" position={Position.Bottom} className="opacity-0" />
    <Handle type="source" position={Position.Bottom} className="opacity-0" style={{ left: '60%' }} />

    <div className="bg-emerald-500 text-white p-2 font-bold flex items-center justify-center text-sm">
      {data.title || 'Structure'}
    </div>
    <div className="p-3 space-y-2 text-xs">
      <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
        <label className="text-[9px] font-black text-slate-400 uppercase block">Forces</label>
        <div className="font-medium text-slate-700">{data.forces || '-'}</div>
      </div>
      <div className="bg-emerald-50 p-1.5 rounded border border-emerald-100">
        <label className="text-[9px] font-black text-emerald-600 uppercase block">Examples</label>
        <div className="font-medium text-emerald-700">{data.examples || '-'}</div>
      </div>
    </div>
  </div>
)

const PropertyNodePrint = ({ data }: { data: any }) => (
  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl shadow-sm w-56 overflow-hidden font-sans relative p-3">
    <Handle type="target" position={Position.Top} className="opacity-0" />
    <Handle type="source" position={Position.Top} className="opacity-0" style={{ left: '60%' }} />
    <Handle type="target" position={Position.Bottom} className="opacity-0" />
    <Handle type="source" position={Position.Bottom} className="opacity-0" style={{ left: '60%' }} />
    <label className="text-[9px] font-black text-amber-600 uppercase block mb-1">Physical Property</label>
    <div className="font-bold text-amber-900 text-sm leading-tight">{data.property || '-'}</div>
  </div>
)

const nodeTypes = { stage: StageNodePrint, structure: StructureNodePrint, property: PropertyNodePrint }

export default function ExportRenderPage() {
  const [data, setData] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if data is already injected
    if (typeof window !== 'undefined' && (window as any).__EXPORT_DATA__) {
      setData((window as any).__EXPORT_DATA__)
    }

    // Listen for data injection
    const handleDataReady = () => {
      if ((window as any).__EXPORT_DATA__) {
        setData((window as any).__EXPORT_DATA__)
      }
    }
    window.addEventListener('export-data-ready', handleDataReady)

    return () => window.removeEventListener('export-data-ready', handleDataReady)
  }, [])

  // Allow ReactFlow some time to render and fitView before we tell Puppeteer we're ready
  useEffect(() => {
    if (data) {
      setTimeout(() => {
        setIsReady(true)
      }, 1500) // 1.5 second delay for ReactFlow to initialize
    }
  }, [data])

  if (!data) {
    return <div className="p-10 font-sans">Awaiting export data...</div>
  }

  const renderExtraction = () => {
    const { type, nodes, edges, learningData } = data

    const metadata = {
      'IRON_EXTRACTION': { title: 'Iron Extraction', subtitle: 'Blast Furnace Mastery Resource', color: 'rose', bgClass: 'bg-rose-50', textClass: 'text-rose-500', borderClass: 'border-rose-500', targetClass: 'bg-rose-500' },
      'ZINC_LEAD_EXTRACTION': { title: 'Zinc & Lead Extraction', subtitle: 'Roasting & Reduction Mastery', color: 'amber', bgClass: 'bg-amber-50', textClass: 'text-amber-500', borderClass: 'border-amber-500', targetClass: 'bg-amber-500' }
    }[type as 'IRON_EXTRACTION' | 'ZINC_LEAD_EXTRACTION'] || { title: 'Extraction Resource', subtitle: 'Mastery Resource', color: 'slate', bgClass: 'bg-slate-50', textClass: 'text-slate-500', borderClass: 'border-slate-500', targetClass: 'bg-slate-500' }

    return (
      <div className="font-sans text-slate-900 bg-white">
        
        {/* Page 1: Cover & Canvas */}
        <div className="print-page relative flex flex-col min-h-[297mm] w-[210mm] p-12 mx-auto break-after-page">
          <div className={`flex items-center justify-between border-b-4 ${metadata.borderClass} pb-6 mb-8`}>
            <div>
              <div className={`${metadata.textClass} font-black tracking-widest uppercase text-xs mb-2`}>Peak Performance Tutoring</div>
              <h1 className="text-4xl font-black text-slate-900 leading-tight">{metadata.title}</h1>
              <p className="text-lg text-slate-500 font-medium mt-1">{metadata.subtitle}</p>
            </div>
            <img src="/logo.png" alt="Logo" className="h-16 object-contain" />
          </div>

          <div className="flex-1 flex flex-col relative border-2 border-slate-200 rounded-3xl overflow-hidden bg-slate-50 shadow-inner">
             <div className="absolute top-0 left-0 right-0 bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center gap-2 z-10">
                <Map className={metadata.textClass} size={20} />
                <h2 className="font-black text-slate-700 uppercase tracking-widest text-sm">Flow Diagram</h2>
             </div>
             {/* The Canvas container needs fixed height for ReactFlow to render */}
             <div className="flex-1 relative mt-14" style={{ height: '700px' }}>
                <ReactFlow 
                   nodes={nodes} 
                   edges={edges} 
                   nodeTypes={nodeTypes} 
                   fitView 
                   fitViewOptions={{ padding: 0.2 }}
                   zoomOnScroll={false}
                   panOnDrag={false}
                   nodesDraggable={false}
                   elementsSelectable={false}
                >
                   <Background color="#cbd5e1" gap={24} size={2} />
                </ReactFlow>
             </div>
          </div>
        </div>

        {/* Page 2: Materials & Steps */}
        <div className="print-page relative flex flex-col min-h-[297mm] w-[210mm] p-12 mx-auto break-after-page bg-white">
          <div className="space-y-10">
            {/* Materials */}
            <section>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
                <Package className={metadata.textClass} /> Raw Materials
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {learningData.rawMaterials.map((mat: any) => (
                  <div key={mat.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-6">
                    <div className="flex-[1]">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Material</div>
                      <div className="font-bold text-slate-800 text-lg">{mat.material}</div>
                    </div>
                    <div className="flex-[2]">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Source / Note</div>
                      <div className="text-slate-600">{mat.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Steps */}
            <section>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
                <ListOrdered className={metadata.textClass} /> Process Stages
              </h2>
              <div className="space-y-6">
                {learningData.steps.map((step: any, idx: number) => (
                  <div key={step.id} className="bg-white p-5 rounded-xl border-2 border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-full ${metadata.bgClass} ${metadata.textClass} flex items-center justify-center font-black text-sm`}>{idx + 1}</div>
                      <h3 className="font-black text-xl text-slate-800">{step.title}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Chemical Equation / Process</div>
                        <div className="font-mono text-sm font-bold text-slate-700">{step.equation}</div>
                      </div>
                      <div className={`${metadata.bgClass} p-3 rounded-lg border ${metadata.borderClass} opacity-80`}>
                        <div className={`text-[10px] font-black ${metadata.textClass} uppercase tracking-wider mb-1`}>Observation</div>
                        <div className="text-sm font-medium text-slate-800">{step.observation}</div>
                      </div>
                      <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Purpose</div>
                        <div className="text-sm text-slate-600">{step.purpose}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Page 3: Traps */}
        <div className="print-page relative flex flex-col min-h-[297mm] w-[210mm] p-12 mx-auto bg-white">
          <section>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
              <AlertTriangle className={metadata.textClass} /> Examiner Traps
            </h2>
            <div className="space-y-6">
              {learningData.traps.map((trap: any, idx: number) => (
                <div key={trap.id} className={`${metadata.bgClass} p-6 rounded-2xl border-2 ${metadata.borderClass} opacity-80 relative overflow-hidden`}>
                  <div className={`absolute top-0 left-0 w-2 h-full ${metadata.targetClass}`} />
                  <div className="pl-4">
                    <div className="mb-4">
                      <div className={`text-[10px] font-black ${metadata.textClass} uppercase tracking-widest mb-1`}>Common Question</div>
                      <div className="font-black text-lg text-slate-900">{trap.question}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Correct Answer / Justification</div>
                      <div className="text-slate-700 leading-relaxed font-medium">{trap.answer}</div>
                    </div>
                    {trap.note && (
                      <div className={`mt-3 text-sm ${metadata.textClass} ${metadata.bgClass} border border-slate-200 p-3 rounded-lg inline-block font-bold`}>
                        Examiner Note: {trap.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          body { background: white !important; }
          .print-page { box-sizing: border-box; }
          @media print {
            @page { size: A4; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-page { width: 100%; min-height: 100vh; page-break-after: always; padding: 20mm !important; }
          }
        `}} />
      </div>
    )
  }

  const renderStructureMapping = () => {
    const { type, nodes, edges, learningData } = data

    return (
      <div className="font-sans text-slate-900 bg-white">
        {/* Page 1: Diagram */}
        <div className="print-page relative flex flex-col min-h-[210mm] w-[297mm] p-12 mx-auto break-after-page">
          <div className="flex items-center justify-between border-b-4 border-emerald-500 pb-6 mb-8">
            <div>
              <div className="text-emerald-500 font-black tracking-widest uppercase text-xs mb-2">Peak Performance Tutoring</div>
              <h1 className="text-4xl font-black text-slate-900 leading-tight">Structure & Properties Map</h1>
              <p className="text-lg text-slate-500 font-medium mt-1">Structure & Bonding Mastery Resource</p>
            </div>
            <img src="/logo.png" alt="Logo" className="h-16 object-contain" />
          </div>

          <div className="flex-1 flex flex-col relative border-2 border-slate-200 rounded-3xl overflow-hidden bg-slate-50 shadow-inner">
             <div className="absolute top-0 left-0 right-0 bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center gap-2 z-10">
                <Map className="text-emerald-500" size={20} />
                <h2 className="font-black text-slate-700 uppercase tracking-widest text-sm">Forces Determine Properties</h2>
             </div>
             {/* The Canvas container needs fixed height for ReactFlow to render */}
             <div className="flex-1 relative mt-14" style={{ height: '700px' }}>
                <ReactFlow 
                   nodes={nodes} 
                   edges={edges} 
                   nodeTypes={nodeTypes} 
                   fitView 
                   fitViewOptions={{ padding: 0.2 }}
                   zoomOnScroll={false}
                   panOnDrag={false}
                   nodesDraggable={false}
                   elementsSelectable={false}
                >
                   <Background color="#cbd5e1" gap={24} size={2} />
                </ReactFlow>
             </div>
          </div>
        </div>

        {/* Page 2: Theory */}
        <div className="print-page relative flex flex-col min-h-[297mm] w-[210mm] p-12 mx-auto break-after-page bg-white">
          <div className="space-y-10">
            <section>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
                <ListOrdered className="text-emerald-500" /> Theory Explanations
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {learningData?.theory?.map((item: any) => (
                  <div key={item.id} className="bg-emerald-50 dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100 mb-2">{item.title}</h3>
                    <p className="text-emerald-800 dark:text-emerald-200 font-medium leading-relaxed">{item.explanation}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          body { background: white !important; }
          .print-page { box-sizing: border-box; }
          @media print {
            @page { size: A4 landscape; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-page { width: 100%; min-height: 100vh; page-break-after: always; padding: 15mm !important; }
          }
        `}} />
      </div>
    )
  }

  const renderStructureComparison = () => {
    const { rows } = data

    return (
      <div className="font-sans text-slate-900 bg-white">
        <div className="print-page relative flex flex-col min-h-[210mm] w-[297mm] p-12 mx-auto break-after-page">
          <div className="flex items-center justify-between border-b-4 border-purple-500 pb-6 mb-8">
            <div>
              <div className="text-purple-500 font-black tracking-widest uppercase text-xs mb-2">Peak Performance Tutoring</div>
              <h1 className="text-4xl font-black text-slate-900 leading-tight">Structure & Bonding</h1>
              <p className="text-lg text-slate-500 font-medium mt-1">Master Comparison Table</p>
            </div>
            <img src="/logo.png" alt="Logo" className="h-16 object-contain" />
          </div>

          <div className="flex-1 flex flex-col relative border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-inner">
             <div className="bg-purple-100 px-6 py-4 border-b border-purple-200 flex items-center gap-2">
                <ListOrdered className="text-purple-600" size={20} />
                <h2 className="font-black text-purple-900 uppercase tracking-widest text-sm">Structure Comparison</h2>
             </div>
             
             <div className="p-6">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-purple-600 text-white">
                      <th className="p-3 font-bold border border-purple-700 rounded-tl-lg">Structure Type</th>
                      <th className="p-3 font-bold border border-purple-700">Examples</th>
                      <th className="p-3 font-bold border border-purple-700">Bonding</th>
                      <th className="p-3 font-bold border border-purple-700">Forces Present</th>
                      <th className="p-3 font-bold border border-purple-700">Melting Point</th>
                      <th className="p-3 font-bold border border-purple-700">Conductivity</th>
                      <th className="p-3 font-bold border border-purple-700 rounded-tr-lg">Solubility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: any, idx: number) => (
                      <tr key={row.id || idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="p-3 font-bold text-slate-800 border border-slate-200">{row.structureType}</td>
                        <td className="p-3 font-medium text-slate-600 border border-slate-200">{row.exampleSubstance}</td>
                        <td className="p-3 font-medium text-slate-600 border border-slate-200">{row.bonding}</td>
                        <td className="p-3 font-medium text-slate-600 border border-slate-200">{row.forcesPresent}</td>
                        <td className="p-3 font-bold text-rose-600 border border-slate-200">{row.meltingPoint}</td>
                        <td className="p-3 font-medium text-emerald-600 border border-slate-200">{row.conductivity}</td>
                        <td className="p-3 font-medium text-blue-600 border border-slate-200">{row.solubility}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          body { background: white !important; }
          .print-page { box-sizing: border-box; }
          @media print {
            @page { size: A4 landscape; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-page { width: 100%; min-height: 100vh; page-break-after: always; padding: 15mm !important; }
          }
        `}} />
      </div>
    )
  }

  return (
    <>
      {data.type.endsWith('EXTRACTION') && renderExtraction()}
      {data.type === 'STRUCTURE_COMPARISON' && renderStructureComparison()}
      {data.type === 'STRUCTURE_MAPPING' && renderStructureMapping()}
      {!data.type.endsWith('EXTRACTION') && data.type !== 'STRUCTURE_COMPARISON' && data.type !== 'STRUCTURE_MAPPING' && <div>Unsupported Engine Type: {data.type}</div>}
      
      {/* Invisible element that signals to Puppeteer that the page is fully rendered */}
      {isReady && <div id="export-ready" className="hidden" />}
    </>
  )
}
