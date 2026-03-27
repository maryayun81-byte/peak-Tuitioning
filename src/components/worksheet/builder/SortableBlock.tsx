'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { 
  GripVertical, Trash2, Settings2, Plus, 
  CheckSquare, AlignLeft, BookOpen, 
  Calculator, FileText, ToggleLeft, GitMerge, Heading,
  Image as ImageIcon, Table as TableIcon, Hash, Layout, Type, Upload
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorksheetBuilderStore } from '@/stores/worksheetBuilderStore'
import type { WorksheetBlock, QuestionType } from '@/types/database'

interface SortableBlockProps {
  block: WorksheetBlock
  index: number
  qNumber?: string | number
}

const TYPE_META: Partial<Record<QuestionType, { icon: any; color: string; label: string }>> = {
  mcq:              { icon: CheckSquare, color: '#0EA5E9', label: 'Multiple Choice' },
  multi_select:     { icon: Layout,      color: '#8B5CF6', label: 'Multi-Select'   },
  short_answer:     { icon: AlignLeft,   color: '#10B981', label: 'Short Answer'   },
  long_answer:      { icon: FileText,    color: '#F59E0B', label: 'Long Answer'    },
  reading_passage:  { icon: BookOpen,    color: '#A78BFA', label: 'Passage'        },
  passage:          { icon: BookOpen,    color: '#A78BFA', label: 'Passage'        },
  poem:             { icon: Type,        color: '#8B5CF6', label: 'Poem'           },
  sub_question:     { icon: AlignLeft,   color: '#10B981', label: 'Sub-Question'   },
  section_header:   { icon: Heading,     color: '#6B7280', label: 'Section'        },
  math:             { icon: Calculator,  color: '#EF4444', label: 'Math'           },
  matching:         { icon: GitMerge,    color: '#14B8A6', label: 'Matching'       },
  true_false:       { icon: ToggleLeft,  color: '#F97316', label: 'True / False'  },
  diagram_labeling: { icon: ImageIcon,   color: '#EC4899', label: 'Diagram'        },
  table_question:   { icon: TableIcon,   color: '#14B8A6', label: 'Table'          },
  fill_in_blank:    { icon: Hash,        color: '#8B5CF6', label: 'Fill in Blank'  },
  file_upload:      { icon: Upload,      color: '#6366F1', label: 'File Upload'   },
}

export function SortableBlock({ block, index, qNumber }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id })

  const { selectedBlockId, setSelectedBlockId, removeBlock, addBlock, layoutLocked } = useWorksheetBuilderStore()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isSelected = selectedBlockId === block.id
  const meta = TYPE_META[block.type] || { icon: Heading, color: '#6B7280', label: block.type }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => setSelectedBlockId(block.id)}
      className={cn(
        'group relative rounded-2xl transition-all duration-200 cursor-pointer select-none',
        isDragging ? 'opacity-30 scale-[0.98] z-50' : 'opacity-100'
      )}
    >
      {/* Selected ring highlight */}
      {isSelected && (
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: '2px solid var(--primary)', background: 'rgba(99,102,241,0.04)' }}
        />
      )}

      <div 
        className="rounded-2xl p-3 md:p-4 transition-colors"
        style={{ 
          background: !isSelected ? 'var(--input)' : undefined,
          border: `1px solid ${isSelected ? 'transparent' : 'var(--card-border)'}`,
          marginLeft: block.type === 'sub_question' ? '2rem' : '0',
        }}
      >
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          {!layoutLocked && (
            <div
              {...attributes}
              {...listeners}
              className="mt-1 p-1 rounded-lg cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-50 transition-opacity touch-none"
              style={{ color: 'var(--text-muted)' }}
            >
              <GripVertical size={15} />
            </div>
          )}

          {/* Type icon */}
          <div
            className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${meta.color}18`, color: meta.color }}
          >
            <meta.icon size={16} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Badge row */}
            <div className="flex items-center flex-wrap gap-1.5 mb-2">
              <span 
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: meta.color }}
              >
                {block.type === 'reading_passage' 
                  ? (block.passage_type === 'poem' ? 'Poem Block' : 'Passage Block')
                  : meta.label
                }
              </span>
              {block.marks > 0 && (
                <span 
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'var(--card)', color: 'var(--text-muted)' }}
                >
                  {block.marks} MK
                </span>
              )}
              {block.difficulty && (
                <span 
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-bold capitalize"
                  style={{ 
                    background: block.difficulty === 'easy' ? 'rgba(16,185,129,0.12)' : block.difficulty === 'hard' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                    color: block.difficulty === 'easy' ? '#10B981' : block.difficulty === 'hard' ? '#EF4444' : '#F59E0B'
                  }}
                >
                  {block.difficulty}
                </span>
              )}
            </div>

            {/* Block preview content */}
            {block.type === 'section_header' ? (
              <h2 className="text-base md:text-lg font-black leading-tight" style={{ color: 'var(--text)' }}>
                {block.section_title || <span className="opacity-30 italic font-normal text-sm">Untitled Section...</span>}
              </h2>
            ) : block.type === 'fill_in_blank' ? (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                {block.blank_text?.split(/\[.*?\]/).map((part: any, i: any, arr: any) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span 
                        className="inline-block mx-0.5 rounded" 
                        style={{ width: '60px', height: '18px', background: 'rgba(99,102,241,0.15)', verticalAlign: 'middle', border: '1px solid rgba(99,102,241,0.3)' }} 
                      />
                    )}
                  </span>
                )) || <span className="opacity-30 italic">Enter text with [brackets]...</span>}
              </p>
            ) : (
              <div>
                <div 
                  className={cn(
                    "text-sm leading-relaxed",
                    (block.type === 'poem' || block.type === 'passage' || block.type === 'reading_passage') 
                      ? "whitespace-pre-wrap font-serif italic text-lg opacity-90 pl-4 border-l-2 border-[var(--primary)]/30"
                      : "prose prose-sm max-w-none"
                  )} 
                  style={{ color: 'var(--text)' }}
                >
                  {block.question ? (
                    <div className="flex gap-2">
                      {qNumber !== undefined && <span className="opacity-40 font-black shrink-0">{qNumber}</span>}
                      <div className="whitespace-pre-wrap">
                        {block.question && (
                          block.question.includes('</') || block.question.includes('<br') ? (
                            <div dangerouslySetInnerHTML={{ __html: block.question }} />
                          ) : (
                            block.question
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="opacity-30 italic">Enter {block.type === 'poem' ? 'poem lines' : 'content'}...</span>
                  )}
                </div>
                {/* MCQ options preview */}
                {(block.type === 'mcq' || block.type === 'multi_select') && block.options && block.options.some((o: any) => o) && (
                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {block.options.filter((o: any) => o).map((opt: any, i: any) => (
                      <div key={i} className="flex items-center gap-2 text-xs opacity-60">
                        <div 
                          className="w-5 h-5 rounded-md flex items-center justify-center font-black shrink-0 text-[10px]"
                          style={{ background: 'var(--card)' }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="truncate">{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Short answer lines */}
                {(block.type === 'short_answer' || block.type === 'long_answer') && (
                  <div className="mt-3 space-y-1.5">
                    {Array.from({ length: Math.min(block.answer_lines ?? 3, 3) }).map((_, i) => (
                      <div key={i} className="h-4" style={{ borderBottom: '1px dashed var(--card-border)' }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); setSelectedBlockId(block.id) }}
              className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}
            >
              <Settings2 size={13} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); removeBlock(block.id) }}
              className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Quick Add Questions for Structural Blocks */}
        {['section_header'].includes(block.type) && !layoutLocked && (
          <div className="mt-4 pt-4 flex items-center gap-3" style={{ borderTop: '1px dashed var(--card-border)' }}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Add Question For This:</span>
            <div className="flex gap-2">
              {[
                { type: 'mcq', label: 'MCQ', color: '#0EA5E9' },
                { type: 'short_answer', label: 'Short', color: '#10B981' },
                { type: 'true_false', label: 'T/F', color: '#F97316' }
              ].map(qType => (
                <button
                  key={qType.type}
                  onClick={(e) => {
                    e.stopPropagation()
                    addBlock(qType.type as any, index + 1)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                  style={{ background: `${qType.color}15`, color: qType.color, border: `1px solid ${qType.color}30` }}
                >
                  <Plus size={10} /> {qType.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
