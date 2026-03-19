'use client'

import { X, Plus, Trash2, Sliders } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useWorksheetBuilderStore } from '@/stores/worksheetBuilderStore'
import RichTextEditor from '@/components/ui/RichTextEditor'
import type { DifficultyLevel } from '@/types/database'

const DIFF_OPTIONS: { value: DifficultyLevel; label: string; color: string }[] = [
  { value: 'easy',   label: 'Easy',   color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'hard',   label: 'Hard',   color: '#EF4444' },
]

export function PropertiesPanel() {
  const { blocks, selectedBlockId, updateBlock, setSelectedBlockId, removeBlock } = useWorksheetBuilderStore()
  const block = blocks.find(b => b.id === selectedBlockId)

  if (!block) {
    return (
      <div 
        className="flex flex-col h-full overflow-hidden"
        style={{ background: 'var(--sidebar)', borderLeft: '1px solid var(--card-border)' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--input)' }}>
            <Sliders size={22} />
          </div>
          <p className="text-sm font-semibold">Select a block</p>
          <p className="text-xs mt-1 opacity-60">Tap any block on the canvas to edit its properties here.</p>
        </div>
      </div>
    )
  }

  const update = (patch: any) => updateBlock(block.id, patch)

  return (
    <div 
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--sidebar)', borderLeft: '1px solid var(--card-border)' }}
    >
      {/* Sticky header */}
      <div className="px-4 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--sidebar)' }}>
        <div>
          <h3 className="text-sm font-black capitalize" style={{ color: 'var(--text)' }}>
            {block.type === 'reading_passage' 
              ? (block.passage_type === 'poem' ? 'Poem Block' : 'Passage Block')
              : block.type.replace(/_/g, ' ')
            }
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Block settings</p>
        </div>
        <button 
          onClick={() => setSelectedBlockId(null)} 
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

        {/* Content Fields */}
        {block.type === 'section_header' ? (
          <>
            <Input label="Section Title" value={block.section_title || ''} onChange={e => update({ section_title: e.target.value })} />
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 opacity-50">Instructions</label>
              <RichTextEditor
                value={block.section_instructions || ''}
                onChange={val => update({ section_instructions: val })}
                placeholder="Enter instructions..."
              />
            </div>
          </>
        ) : block.type === 'reading_passage' ? (
          <>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 opacity-50">Passage Type</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['passage', 'poem', 'diagram'].map(t => (
                  <button
                    key={t}
                    onClick={() => update({ passage_type: t })}
                    className="py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all"
                    style={{
                      background: block.passage_type === t ? 'var(--primary)' : 'var(--input)',
                      color: block.passage_type === t ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 opacity-50">Passage / Poem Text</label>
              <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Press Enter for new lines. All spaces and line breaks are preserved exactly.</p>
              <textarea
                className="w-full rounded-xl p-3 text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-primary/30"
                style={{ 
                  background: 'var(--input)', 
                  border: '1px solid var(--card-border)', 
                  color: 'var(--text)', 
                  minHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: block.passage_type === 'poem' ? 'Georgia, serif' : 'monospace',
                }}
                rows={10}
                value={block.passage_text || ''}
                onChange={e => update({ passage_text: e.target.value })}
                placeholder={block.passage_type === 'poem' 
                  ? 'The road not taken,\nTwo paths in the wood...\n\nEach line is preserved exactly.' 
                  : 'Type your passage here.\nEach line break is preserved.\n\nBlank lines create paragraph breaks.'}
              />
            </div>
          </>
        ) : block.type === 'fill_in_blank' ? (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 opacity-50">Text with [blanks]</label>
            <textarea
              className="w-full rounded-xl p-3 text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-primary/30"
              style={{ background: 'var(--input)', border: '1px solid var(--card-border)', color: 'var(--text)', minHeight: '100px' }}
              rows={5}
              value={block.blank_text || ''}
              onChange={e => update({ blank_text: e.target.value })}
              placeholder="The [capital] of France is [Paris]."
            />
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Wrap blank words in [square brackets].</p>
          </div>
        ) : (
          <>
            {/* Question text — use plain textarea for poem/passage, rich editor for others */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 opacity-50">
                {(block.type === 'poem' || block.type === 'passage') ? 'Content (exact whitespace preserved)' : 'Question Text'}
              </label>
              {(block.type === 'poem' || block.type === 'passage') ? (
                <>
                  <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Press Enter for new lines. Spaces and indentation are preserved exactly.</p>
                  <textarea
                    className="w-full rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ 
                      background: 'var(--input)', 
                      border: '1px solid var(--card-border)', 
                      color: 'var(--text)', 
                      minHeight: '180px',
                      fontFamily: block.type === 'poem' ? 'Georgia, serif' : 'monospace',
                      fontStyle: block.type === 'poem' ? 'italic' : 'normal',
                      whiteSpace: 'pre-wrap',
                    }}
                    rows={9}
                    value={block.question || ''}
                    onChange={e => update({ question: e.target.value })}
                    placeholder={block.type === 'poem' 
                      ? 'Two roads diverged in a yellow wood,\nAnd sorry I could not travel both...'
                      : 'Type your passage content here.\nEvery line break and space is preserved.'}
                  />
                </>
              ) : (
                <RichTextEditor
                  value={block.question || ''}
                  onChange={val => update({ question: val })}
                  placeholder="Enter your question and sub-questions..."
                />
              )}
            </div>

            {/* MCQ / Multi-select options */}
            {(block.type === 'mcq' || block.type === 'multi_select') && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest opacity-50">Options — tap letter to mark correct</label>
                {(block.options ?? []).map((opt, i) => {
                  const letter = String.fromCharCode(65 + i)
                  const isCorrect = block.type === 'mcq'
                    ? block.correct_answer === letter
                    : (block.correct_answers || []).includes(letter)
                  return (
                    <div key={i} className="flex gap-2 items-center">
                      <button
                        onClick={() => {
                          if (block.type === 'mcq') update({ correct_answer: letter })
                          else {
                            const cur = block.correct_answers || []
                            update({ correct_answers: cur.includes(letter) ? cur.filter(x => x !== letter) : [...cur, letter] })
                          }
                        }}
                        className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-black text-xs transition-all"
                        style={{ background: isCorrect ? 'var(--primary)' : 'var(--input)', color: isCorrect ? 'white' : 'var(--text-muted)' }}
                      >
                        {letter}
                      </button>
                      <input
                        className="flex-1 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
                        style={{ background: 'var(--input)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
                        value={opt}
                        placeholder={`Option ${letter}`}
                        onChange={e => {
                          const opts = [...(block.options || [])]
                          opts[i] = e.target.value
                          update({ options: opts })
                        }}
                      />
                      {(block.options?.length ?? 0) > 2 && (
                        <button
                          onClick={() => update({ options: (block.options || []).filter((_, idx) => idx !== i) })}
                          className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: '#EF4444' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  )
                })}
                <Button
                  variant="secondary" size="sm" className="w-full mt-1"
                  onClick={() => update({ options: [...(block.options || []), ''] })}
                >
                  <Plus size={13} className="mr-1.5" /> Add Option
                </Button>
              </div>
            )}

            {/* True/False */}
            {block.type === 'true_false' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 opacity-50">Correct Answer</label>
                <div className="grid grid-cols-2 gap-2">
                  {['true', 'false'].map(val => (
                    <button
                      key={val}
                      onClick={() => update({ correct_answer: val })}
                      className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all"
                      style={{
                        background: block.correct_answer === val ? (val === 'true' ? '#10B981' : '#EF4444') : 'var(--input)',
                        color: block.correct_answer === val ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Short/Long answer lines */}
            {(block.type === 'short_answer' || block.type === 'long_answer' || block.type === 'math') && (
              <Input
                type="number"
                label="Answer Lines"
                value={block.answer_lines ?? (block.type === 'long_answer' ? 8 : 3)}
                onChange={e => update({ answer_lines: parseInt(e.target.value) || 3 })}
              />
            )}
          </>
        )}

        {/* Marks, Difficulty, Topic — for non-structural blocks */}
        {block.type !== 'section_header' && block.type !== 'reading_passage' && (
          <div className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="Marks"
                value={block.marks}
                onChange={e => update({ marks: parseInt(e.target.value) || 0 })}
              />
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 opacity-50">Difficulty</label>
                <div className="grid grid-cols-3 gap-1">
                  {DIFF_OPTIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => update({ difficulty: d.value })}
                      className="py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                      style={{
                        background: block.difficulty === d.value ? d.color + '25' : 'var(--input)',
                        color: block.difficulty === d.value ? d.color : 'var(--text-muted)',
                        border: block.difficulty === d.value ? `1px solid ${d.color}50` : '1px solid transparent',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Input
              label="Topic / Tag"
              value={block.topic || ''}
              onChange={e => update({ topic: e.target.value })}
              placeholder="e.g. Algebra, Photosynthesis"
            />
          </div>
        )}

        {/* Delete Block */}
        <div className="pt-2">
          <button
            onClick={() => { removeBlock(block.id); setSelectedBlockId(null) }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'rgba(239,68,68,0.06)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <Trash2 size={14} /> Delete Block
          </button>
        </div>
      </div>
    </div>
  )
}
