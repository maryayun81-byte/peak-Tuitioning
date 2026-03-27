'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GripVertical, Trash2, ChevronDown, ChevronUp, Plus, X,
  CheckSquare, ToggleLeft, AlignLeft, FileText, Calculator,
  Upload, GitMerge, Heading, BookOpen, ImageIcon, Table as TableIcon, Hash, Type as TypeIcon
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DrawerModal } from '@/components/ui/DrawerModal'
import { AnnotationCanvas } from '@/components/worksheet/AnnotationCanvas'
import MathRenderer from '@/components/ui/MathRenderer'
import type { WorksheetBlock, QuestionType, DifficultyLevel } from '@/types/database'
import { v4 as uuid } from 'uuid'

interface QuestionBlockProps {
  block: WorksheetBlock
  index: number
  onChange: (updated: WorksheetBlock) => void
  onDelete: () => void
}

const QUESTION_TYPE_META: Record<QuestionType, { icon: React.ReactNode; label: string; color: string }> = {
  mcq:             { icon: <CheckSquare size={14} />,  label: 'Multiple Choice',  color: '#0EA5E9' },
  multi_select:    { icon: <CheckSquare size={14} />,  label: 'Multi-Select',     color: '#8B5CF6' },
  short_answer:    { icon: <AlignLeft size={14} />,    label: 'Short Answer',     color: '#10B981' },
  long_answer:     { icon: <FileText size={14} />,     label: 'Long Answer',      color: '#F59E0B' },
  math:            { icon: <Calculator size={14} />,   label: 'Math',             color: '#EF4444' },
  file_upload:     { icon: <Upload size={14} />,       label: 'File Upload',      color: '#EC4899' },
  matching:        { icon: <GitMerge size={14} />,     label: 'Matching',         color: '#14B8A6' },
  true_false:      { icon: <ToggleLeft size={14} />,   label: 'True / False',     color: '#F97316' },
  section_header:  { icon: <Heading size={14} />,      label: 'Section Header',   color: '#6B7280' },
  reading_passage: { icon: <BookOpen size={14} />,     label: 'Reading Passage',  color: '#A78BFA' },
  passage:         { icon: <BookOpen size={14} />,     label: 'Passage',          color: '#A78BFA' },
  poem:            { icon: <TypeIcon size={14} />,     label: 'Poem',             color: '#8B5CF6' },
  sub_question:    { icon: <AlignLeft size={14} />,    label: 'Sub-Question',     color: '#10B981' },
  diagram_labeling: { icon: <ImageIcon size={14} />,   label: 'Diagram Labeling', color: '#3B82F6' },
  table_question:   { icon: <TableIcon size={14} />,   label: 'Table Question',   color: '#6366F1' },
  math_drawing:     { icon: <TypeIcon size={14} />,    label: 'Virtual Paper',    color: '#8B5CF6' },
  fill_in_blank:    { icon: <Hash size={14} />,        label: 'Fill in Blank',    color: '#EC4899' },
}

export function QuestionBlock({ block, index, onChange, onDelete }: QuestionBlockProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showDiagramEditor, setShowDiagramEditor] = useState(false)
  // KEY FIX: Use a ref instead of state so that canvas saves during drawing
  // do NOT trigger a React re-render → no Framer Motion jitter
  const diagramRef = useRef<string | undefined>(block.diagram_json)
  
  const meta = QUESTION_TYPE_META[block.type]
  const update = (patch: Partial<WorksheetBlock>) => onChange({ ...block, ...patch })

  const updateOption = (i: number, val: string) => {
    const opts = [...(block.options ?? [])]
    opts[i] = val
    update({ options: opts })
  }
  const addOption = () => update({ options: [...(block.options ?? []), ''] })
  const removeOption = (i: number) => update({ options: (block.options ?? []).filter((_: any, idx: any) => idx !== i) })

  const updatePair = (i: number, key: 'left' | 'right', val: string) => {
    const pairs = [...(block.matching_pairs ?? [])]
    pairs[i] = { ...pairs[i], [key]: val }
    update({ matching_pairs: pairs })
  }
  const addPair = () => update({ matching_pairs: [...(block.matching_pairs ?? []), { left: '', right: '' }] })
  const removePair = (i: number) => update({ matching_pairs: (block.matching_pairs ?? []).filter((_: any, idx: any) => idx !== i) })

  const handleDiagramSave = () => {
    // Only now do we write to parent state — one time, on explicit save
    update({ diagram_json: diagramRef.current })
    setShowDiagramEditor(false)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{ border: `1px solid ${meta.color}30`, background: 'var(--card)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
          style={{ background: `${meta.color}0d`, borderBottom: collapsed ? 'none' : `1px solid ${meta.color}20` }}
          onClick={() => setCollapsed(c => !c)}
        >
          <div className="touch-none cursor-grab" onClick={e => e.stopPropagation()}>
            <GripVertical size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm" style={{ background: meta.color, color: 'white' }}>
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
            <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>Q{index + 1} · {block.marks} mark{block.marks !== 1 ? 's' : ''}</span>
            {block.question && (
              <p className="text-sm truncate mt-0.5 font-medium" style={{ color: 'var(--text)' }}>
                {block.question.replace(/<[^>]+>/g, '').slice(0, 60)}
              </p>
            )}
          </div>
          <button 
            type="button"
            onClick={e => { e.stopPropagation(); onDelete() }} 
            className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity" 
            style={{ color: '#EF4444', background: '#EF444410' }}
          >
            <Trash2 size={13} />
          </button>
          {collapsed ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />}
        </div>

        {/* Body */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {block.type === 'section_header' ? (
                  <>
                    <Input label="Section Title" value={block.section_title ?? ''} onChange={e => update({ section_title: e.target.value })} placeholder="e.g. Section A" />
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-500">Instructions</label>
                      <textarea className="w-full rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} rows={3} value={block.section_instructions ?? ''} onChange={e => update({ section_instructions: e.target.value })} />
                    </div>
                  </>
                ) : (block.type === 'reading_passage' || block.type === 'passage' || block.type === 'poem') ? (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-500">{block.type === 'poem' ? 'Poem Content' : 'Text Content'}</label>
                    <textarea className="w-full rounded-xl p-3 text-sm resize-none font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} rows={10} value={block.question || block.passage_text || ''} onChange={e => update({ question: e.target.value, passage_text: e.target.value })} />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-500">Question Text</label>
                      <textarea className="w-full rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} rows={3} value={block.question} onChange={e => update({ question: e.target.value })} />
                      {block.question && (block.question.includes('$')) && (
                        <div className="mt-2 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                          <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2">Math Live Preview</div>
                          <div className="text-sm">
                            {block.question.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g).map((part: any, i: any) => {
                              if (part.startsWith('$$') && part.endsWith('$$')) return <MathRenderer key={i} formula={part.slice(2, -2)} block={true} />
                              if (part.startsWith('$') && part.endsWith('$')) return <MathRenderer key={i} formula={part.slice(1, -1)} block={false} />
                              return <span key={i}>{part}</span>
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {(block.type === 'mcq' || block.type === 'multi_select') && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-500">Options</label>
                        {(block.options ?? []).map((opt: any, i: any) => (
                           <div key={i} className="flex items-center gap-2 group">
                              <button
                                 type="button"
                                 onClick={() => block.type === 'mcq' ? update({ correct_answer: String.fromCharCode(65 + i) }) : undefined}
                                 className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 shadow-sm transition-all"
                                 style={{ 
                                    background: block.correct_answer === String.fromCharCode(65 + i) ? meta.color : 'var(--input)',
                                    color: block.correct_answer === String.fromCharCode(65 + i) ? 'white' : 'var(--text-muted)'
                                 }}
                              >{String.fromCharCode(65 + i)}</button>
                              <input className="flex-1 rounded-xl px-3 py-2 text-sm shadow-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={opt} onChange={e => updateOption(i, e.target.value)} />
                              <button type="button" onClick={() => removeOption(i)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><X size={14} /></button>
                           </div>
                        ))}
                        <Button type="button" onClick={addOption} size="sm" variant="secondary" className="gap-2"><Plus size={14} /> Add Option</Button>
                      </div>
                    )}

                    {block.type === 'true_false' && (
                      <div className="flex gap-3">
                        {['true', 'false'].map(v => (
                           <button key={v} type="button" onClick={() => update({ correct_answer: v })} className="flex-1 py-2.5 rounded-xl text-sm font-bold capitalize shadow-sm transition-all" style={{ background: block.correct_answer === v ? meta.color : 'var(--input)', color: block.correct_answer === v ? 'white' : 'var(--text-muted)' }}>{v}</button>
                        ))}
                      </div>
                    )}

                    {block.type === 'matching' && (
                        <div className="space-y-2">
                            {(block.matching_pairs ?? []).map((p: any, i: any) => (
                                <div key={i} className="flex items-center gap-2 group">
                                    <input className="flex-1 rounded-xl px-3 py-2 text-sm shadow-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={p.left} onChange={e => updatePair(i, 'left', e.target.value)} placeholder="Left" />
                                    <span className="text-slate-300">→</span>
                                    <input className="flex-1 rounded-xl px-3 py-2 text-sm shadow-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={p.right} onChange={e => updatePair(i, 'right', e.target.value)} placeholder="Right" />
                                    <button type="button" onClick={() => removePair(i)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={14} /></button>
                                </div>
                            ))}
                            <Button type="button" onClick={addPair} size="sm" variant="secondary"><Plus size={14} /> Add Pair</Button>
                        </div>
                    )}

                    {(block.type === 'short_answer' || block.type === 'long_answer' || block.type === 'math_drawing') && (
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-semibold mb-1 text-slate-500">{block.type === 'math_drawing' ? 'Drawing Height (Lines)' : 'Lines'}</label>
                             <input type="number" className="w-full rounded-xl px-3 py-2 text-sm shadow-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={block.answer_lines ?? 15} onChange={e => update({ answer_lines: parseInt(e.target.value) })} />
                          </div>
                          {block.type === 'math_drawing' && (
                             <div className="flex items-end">
                                <Button type="button" variant="secondary" size="sm" className="w-full h-10 gap-2 border-dashed border-2" onClick={() => {
                                   diagramRef.current = block.diagram_json
                                   setShowDiagramEditor(true)
                                }}>
                                   <ImageIcon size={14} /> {block.diagram_json ? 'Edit Illustration' : 'Add Illustration'}
                                </Button>
                             </div>
                          )}
                       </div>
                    )}
                  </>
                )}

                {/* Footer Metrics */}
                {block.type !== 'section_header' && block.type !== 'reading_passage' && (
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-50">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Marks</label>
                        <input type="number" className="w-full rounded-xl px-3 py-2 text-sm font-bold shadow-sm" style={{ background: 'var(--input)', color: meta.color, border: `1px solid ${meta.color}30` }} value={block.marks} onChange={e => update({ marks: parseInt(e.target.value) || 0 })} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Difficulty</label>
                        <select className="w-full rounded-xl px-3 py-2 text-sm shadow-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={block.difficulty} onChange={e => update({ difficulty: e.target.value as DifficultyLevel })}>
                           <option value="easy">Easy</option>
                           <option value="medium">Medium</option>
                           <option value="hard">Hard</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Topic</label>
                        <input className="w-full rounded-xl px-3 py-2 text-sm shadow-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={block.topic} onChange={e => update({ topic: e.target.value })} placeholder="e.g. Physics" />
                     </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <DrawerModal
        isOpen={showDiagramEditor}
        onClose={() => setShowDiagramEditor(false)}
        title="Question Illustration"
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AnnotationCanvas
               key={`diagram-ed-${block.id}`}
               defaultColor="#000000"
               initialJson={diagramRef.current}
               onSave={json => { diagramRef.current = json }}
               readOnly={false}
               height={500}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', background: 'var(--card, #ffffff)', flexShrink: 0 }}>
            <button
              onClick={() => setShowDiagramEditor(false)}
              style={{ padding: '10px 24px', borderRadius: '14px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 900, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDiagramSave}
              style={{ padding: '10px 28px', borderRadius: '14px', background: '#0f172a', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 900, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              Save Illustration
            </button>
          </div>
        </div>
      </DrawerModal>
    </>
  )
}

export function createBlock(type: QuestionType): WorksheetBlock {
  const base: WorksheetBlock = {
    id: uuid(),
    type,
    question: '',
    marks: type === 'section_header' || type === 'reading_passage' ? 0 : 5,
    difficulty: 'medium',
    topic: '',
  }
  if (type === 'mcq') return { ...base, options: ['', '', '', ''], correct_answer: 'A' }
  if (type === 'multi_select') return { ...base, options: ['', '', '', ''], correct_answers: [] }
  if (type === 'matching') return { ...base, matching_pairs: [{ left: '', right: '' }, { left: '', right: '' }] }
  if (type === 'true_false') return { ...base, correct_answer: 'true' }
  if (type === 'short_answer') return { ...base, answer_lines: 3 }
  if (type === 'long_answer') return { ...base, answer_lines: 8 }
  if (type === 'reading_passage') return { ...base, passage_text: '', passage_type: 'passage' }
  if (type === 'passage') return { ...base, question: '', passage_type: 'passage', marks: 0 }
  if (type === 'poem') return { ...base, question: '', passage_type: 'poem', marks: 0 }
  if (type === 'sub_question') return { ...base, question: '', marks: 5 }
  if (type === 'section_header') return { ...base, section_title: '', section_instructions: '' }
  if (type === 'diagram_labeling') return { ...base, diagram_url: '', labels: [] }
  if (type === 'table_question') return { ...base, table_data: { headers: ['Header 1', 'Header 2'], rows: [] } }
  if (type === 'fill_in_blank') return { ...base, blank_text: '' }
  if (type === 'math_drawing') return { ...base, marks: 10, answer_lines: 15 }
  return base
}
