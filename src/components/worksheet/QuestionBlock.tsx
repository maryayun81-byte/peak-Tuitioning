'use client'

import { useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  GripVertical, Trash2, ChevronDown, ChevronUp, Plus, X,
  CheckSquare, ToggleLeft, AlignLeft, FileText, Calculator,
  Upload, GitMerge, Heading, BookOpen, ImageIcon, Table as TableIcon, Hash, Type
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
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
  poem:            { icon: <Type size={14} />,         label: 'Poem',             color: '#8B5CF6' },
  sub_question:    { icon: <AlignLeft size={14} />,    label: 'Sub-Question',     color: '#10B981' },
  diagram_labeling: { icon: <ImageIcon size={14} />,   label: 'Diagram Labeling', color: '#3B82F6' },
  table_question:   { icon: <TableIcon size={14} />,   label: 'Table Question',   color: '#6366F1' },
  fill_in_blank:    { icon: <Hash size={14} />,        label: 'Fill in Blank',    color: '#EC4899' },
}

export function QuestionBlock({ block, index, onChange, onDelete }: QuestionBlockProps) {
  const [collapsed, setCollapsed] = useState(false)
  const meta = QUESTION_TYPE_META[block.type]

  const update = (patch: Partial<WorksheetBlock>) => onChange({ ...block, ...patch })

  const addOption = () => update({ options: [...(block.options ?? []), ''] })
  const updateOption = (i: number, val: string) => {
    const opts = [...(block.options ?? [])]
    opts[i] = val
    update({ options: opts })
  }
  const removeOption = (i: number) => update({ options: (block.options ?? []).filter((_, idx) => idx !== i) })

  const addPair = () => update({ matching_pairs: [...(block.matching_pairs ?? []), { left: '', right: '' }] })
  const updatePair = (i: number, key: 'left' | 'right', val: string) => {
    const pairs = [...(block.matching_pairs ?? [])]
    pairs[i] = { ...pairs[i], [key]: val }
    update({ matching_pairs: pairs })
  }
  const removePair = (i: number) => update({ matching_pairs: (block.matching_pairs ?? []).filter((_, idx) => idx !== i) })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl overflow-hidden"
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
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: meta.color, color: 'white' }}>
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
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity" style={{ color: '#EF4444', background: '#EF444410' }}>
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
              {/* Section Header type */}
              {block.type === 'section_header' ? (
                <>
                  <Input label="Section Title" value={block.section_title ?? ''} onChange={e => update({ section_title: e.target.value })} placeholder="e.g. Section A — Reading Comprehension" />
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Instructions</label>
                    <textarea
                      className="w-full rounded-xl p-3 text-sm resize-none"
                      style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                      rows={3}
                      value={block.section_instructions ?? ''}
                      onChange={e => update({ section_instructions: e.target.value })}
                      placeholder="Instructions for this section..."
                    />
                  </div>
                </>
              ) : (block.type === 'reading_passage' || block.type === 'passage' || block.type === 'poem') ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                      {block.type === 'poem' ? 'Poem Text' : 'Passage Text'}
                    </label>
                    <textarea
                      className="w-full rounded-xl p-3 text-sm resize-none font-mono"
                      style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)', whiteSpace: 'pre' }}
                      rows={12}
                      value={block.question || block.passage_text || ''}
                      onChange={e => update({ question: e.target.value, passage_text: e.target.value })}
                      placeholder={block.type === 'poem' ? "Paste your poem here..." : "Paste your passage here..."}
                    />
                  </div>
                  {block.type === 'reading_passage' && (
                    <div className="grid grid-cols-3 gap-3">
                      {(['passage', 'poem', 'diagram'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => update({ passage_type: t })}
                          className="py-2 rounded-xl text-xs font-bold capitalize transition-all"
                          style={{
                            background: block.passage_type === t ? meta.color : 'var(--input)',
                            color: block.passage_type === t ? 'white' : 'var(--text-muted)',
                          }}
                        >{t}</button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Question text */}
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Question Text</label>
                    <textarea
                      className="w-full rounded-xl p-3 text-sm resize-none"
                      style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                      rows={3}
                      value={block.question}
                      onChange={e => update({ question: e.target.value })}
                      placeholder="Enter your question here..."
                    />
                  </div>

                  {/* MCQ options */}
                  {(block.type === 'mcq' || block.type === 'multi_select') && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        Options {block.type === 'multi_select' ? '(select all correct)' : '(select correct)'}
                      </label>
                      {(block.options ?? []).map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (block.type === 'mcq') update({ correct_answer: String.fromCharCode(65 + i) })
                              else {
                                const current = block.correct_answers ?? []
                                const letter = String.fromCharCode(65 + i)
                                update({ correct_answers: current.includes(letter) ? current.filter(x => x !== letter) : [...current, letter] })
                              }
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-all"
                            style={{
                              background: (block.type === 'mcq' ? block.correct_answer === String.fromCharCode(65 + i) : (block.correct_answers ?? []).includes(String.fromCharCode(65 + i))) ? meta.color : 'var(--input)',
                              color: (block.type === 'mcq' ? block.correct_answer === String.fromCharCode(65 + i) : (block.correct_answers ?? []).includes(String.fromCharCode(65 + i))) ? 'white' : 'var(--text-muted)',
                            }}
                          >{String.fromCharCode(65 + i)}</button>
                          <input
                            className="flex-1 rounded-xl px-3 py-2 text-sm"
                            style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                            value={opt}
                            onChange={e => updateOption(i, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          />
                          <button type="button" onClick={() => removeOption(i)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="secondary" onClick={addOption}>
                        <Plus size={12} /> Add Option
                      </Button>
                    </div>
                  )}

                  {/* True/False */}
                  {block.type === 'true_false' && (
                    <div className="flex gap-3">
                      {['true', 'false'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => update({ correct_answer: val })}
                          className="flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all"
                          style={{
                            background: block.correct_answer === val ? (val === 'true' ? '#10B981' : '#EF4444') : 'var(--input)',
                            color: block.correct_answer === val ? 'white' : 'var(--text-muted)',
                          }}
                        >{val}</button>
                      ))}
                    </div>
                  )}

                  {/* Matching */}
                  {block.type === 'matching' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Matching Pairs</label>
                      {(block.matching_pairs ?? []).map((pair, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input className="flex-1 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={pair.left} onChange={e => updatePair(i, 'left', e.target.value)} placeholder="Left item" />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
                          <input className="flex-1 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={pair.right} onChange={e => updatePair(i, 'right', e.target.value)} placeholder="Right match" />
                          <button type="button" onClick={() => removePair(i)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10"><X size={12} /></button>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="secondary" onClick={addPair}><Plus size={12} /> Add Pair</Button>
                    </div>
                  )}

                  {/* Short/Long answer lines */}
                  {(block.type === 'short_answer' || block.type === 'long_answer') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Answer Lines</label>
                        <input type="number" min={1} max={30} className="w-full rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={block.answer_lines ?? (block.type === 'long_answer' ? 8 : 3)} onChange={e => update({ answer_lines: parseInt(e.target.value) })} />
                      </div>
                      <Input label="Placeholder hint" value={block.answer_placeholder ?? ''} onChange={e => update({ answer_placeholder: e.target.value })} placeholder="e.g. Write your answer..." />
                    </div>
                  )}
                </>
              )}

              {/* Metadata row (not for section_header) */}
              {block.type !== 'section_header' && block.type !== 'reading_passage' && (
                <div className="grid grid-cols-3 gap-3 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Marks</label>
                    <input type="number" min={0} max={100} className="w-full rounded-xl px-3 py-2 text-sm font-bold" style={{ background: 'var(--input)', color: meta.color, border: `1px solid ${meta.color}40` }} value={block.marks} onChange={e => update({ marks: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Difficulty</label>
                    <select className="w-full rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }} value={block.difficulty} onChange={e => update({ difficulty: e.target.value as DifficultyLevel })}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <Input label="Topic" value={block.topic} onChange={e => update({ topic: e.target.value })} placeholder="e.g. Algebra" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Factory function to create a new block with sensible defaults
export function createBlock(type: QuestionType): WorksheetBlock {
  const base: WorksheetBlock = {
    id: uuid(),
    type,
    question: '',
    marks: type === 'section_header' || type === 'reading_passage' ? 0 : 5,
    difficulty: 'medium',
    topic: '',
  }
  if (type === 'mcq') return { ...base, options: ['', '', '', ''], correct_answer: 'A', shuffle_options: false }
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
  return base
}
