'use client'

import { useMemo } from 'react'
import type { WorksheetBlock } from '@/types/database'
import { cn } from '@/lib/utils'

interface WorksheetPreviewProps {
  title: string
  subject?: string
  class_name?: string
  blocks: WorksheetBlock[]
  passage?: string
  passage_type?: string
  total_marks: number
}

const DIFF_COLORS = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444' }
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

export function WorksheetPreview({ title, subject, class_name, blocks, passage, passage_type, total_marks }: WorksheetPreviewProps) {
  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: 'var(--bg)', fontFamily: 'Georgia, serif' }}
    >
      {/* A4-like paper */}
      <div
        className="max-w-[720px] mx-auto my-6 rounded-2xl shadow-xl overflow-hidden"
        style={{ background: '#fff', color: '#1a1a1a' }}
      >
        {/* Header */}
        <div className="px-10 pt-8 pb-6" style={{ borderBottom: '3px double #1a1a1a' }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wide">{title || 'Untitled Worksheet'}</h1>
              <div className="text-sm mt-1 text-gray-500">{subject} {class_name && `· ${class_name}`}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Marks</div>
              <div className="text-3xl font-black" style={{ color: '#0EA5E9' }}>{total_marks}</div>
            </div>
          </div>
          <div className="flex gap-8 mt-4 text-xs text-gray-500">
            <span>Name: ___________________________</span>
            <span>Date: _______________</span>
            <span>Class: _______________</span>
          </div>
        </div>

        {/* Global Passage if present */}
        {passage && (
          <div className="px-10 py-6" style={{ background: '#f8f7ff', borderBottom: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full" style={{ background: '#8B5CF6' }} />
              <span className="text-xs font-black uppercase tracking-widest text-purple-700">
                {passage_type === 'poem' ? 'Poem' : 'Reading Passage'}
              </span>
            </div>
            <div
              className={cn(
                "text-sm whitespace-pre-wrap leading-relaxed",
                passage_type === 'poem' ? 'font-serif italic text-lg opacity-90 pl-6 border-l-4 border-purple-200' : ''
              )}
              style={{ color: '#374151' }}
            >
              {passage}
            </div>
          </div>
        )}

        {/* Modular Blocks */}
        <div className="px-10 py-6 space-y-8">
          {(() => {
            let currentQ = 1
            let currentSubQ = 0
            const mainTypes = ['mcq', 'multi_select', 'short_answer', 'long_answer', 'true_false', 'math', 'matching', 'fill_in_blank']

            return blocks.map((block) => {
              let qLabel: string | number | undefined = undefined
              
              if (block.type === 'sub_question') {
                qLabel = `${String.fromCharCode(97 + (currentSubQ % 26))})`
                currentSubQ++
              } else if (mainTypes.includes(block.type)) {
                qLabel = currentQ++
                currentSubQ = 0
              } else {
                currentSubQ = 0
              }

              if (block.type === 'section_header') {
                return (
                  <div key={block.id} className="py-3" style={{ borderBottom: '2px solid #1a1a1a' }}>
                    <h2 className="font-black uppercase text-base tracking-wide">{block.section_title}</h2>
                    {block.section_instructions && (
                      <div 
                        className="text-xs text-gray-500 mt-1 italic prose prose-sm" 
                        dangerouslySetInnerHTML={{ __html: block.section_instructions }} 
                      />
                    )}
                  </div>
                )
              }

              if (block.type === 'poem' || block.type === 'passage' || block.type === 'reading_passage') {
                const isPoem = block.type === 'poem' || block.passage_type === 'poem'
                const rawContent = block.question || block.passage_text || ''
                const isHtml = rawContent.includes('</') || rawContent.includes('<br')

                return (
                  <div key={block.id} className="py-2">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <div className="w-1 h-3 rounded-full bg-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        {isPoem ? 'Poem' : 'Passage'}
                      </span>
                    </div>
                    <div 
                      className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap",
                        isPoem ? "font-serif italic text-lg opacity-90 pl-6 border-l-4 border-gray-100" : ""
                      )}
                    >
                      {isHtml ? (
                         <div dangerouslySetInnerHTML={{ __html: rawContent }} />
                      ) : (
                        rawContent
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <div 
                  key={block.id} 
                  className={cn(
                    "space-y-4",
                    block.type === 'sub_question' && "ml-10"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {qLabel && (
                        <span className={cn(
                          "rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5",
                          typeof qLabel === 'number' ? "w-7 h-7 bg-blue-50 text-blue-600" : "w-6 h-6 text-gray-400"
                        )}>
                          {qLabel}{typeof qLabel === 'number' && '.'}
                        </span>
                      )}
                      <div className="flex-1">
                        {block.question ? (
                          <div 
                            className="prose prose-sm max-w-none text-sm leading-relaxed font-medium text-gray-900"
                            dangerouslySetInnerHTML={{ __html: block.question }} 
                          />
                        ) : (
                          <span className="italic text-gray-400 text-sm">Question text...</span>
                        )}
                      </div>
                    </div>
                    {block.marks > 0 && (
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-black text-blue-600">[{block.marks} mk]</div>
                        {block.difficulty && (
                          <div className="text-[9px] uppercase font-bold mt-0.5" style={{ color: DIFF_COLORS[block.difficulty] }}>
                            {block.difficulty}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MCQ */}
                  {(block.type === 'mcq' || block.type === 'multi_select') && (
                    <div className="ml-10 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      {(block.options ?? []).filter(o => o).map((opt, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ border: '1.5px solid #d1d5db' }}>{OPTION_LABELS[i]}</span>
                          <span className="leading-tight">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* True/False */}
                  {block.type === 'true_false' && (
                    <div className="ml-10 flex gap-6 text-sm text-gray-700">
                      <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{ border: '1.5px solid #d1d5db' }} /> True</div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{ border: '1.5px solid #d1d5db' }} /> False</div>
                    </div>
                  )}

                  {/* Matching */}
                  {block.type === 'matching' && (
                    <div className="ml-10 grid grid-cols-2 gap-8 pr-4">
                      <div className="space-y-2">
                        {(block.matching_pairs ?? []).map((p, i) => <div key={i} className="text-sm border-b border-gray-100 pb-1.5 flex gap-2"><span className="opacity-40 font-bold">{i + 1}.</span> {p.left}</div>)}
                      </div>
                      <div className="space-y-2">
                        {(block.matching_pairs ?? []).map((p, i) => <div key={i} className="text-sm border-b border-gray-100 pb-1.5 flex gap-2"><span className="opacity-40 font-bold">{String.fromCharCode(65 + i)}.</span> {p.right}</div>)}
                      </div>
                    </div>
                  )}

                  {/* Answer lines for short/long */}
                  {(block.type === 'short_answer' || block.type === 'long_answer' || block.type === 'math' || block.type === 'sub_question') && (
                    <div className="ml-10 space-y-3 mt-2 pr-4">
                      {Array.from({ length: Math.min(block.answer_lines ?? (block.type === 'long_answer' ? 8 : 3), 10) }).map((_, i) => (
                        <div key={i} className="h-5" style={{ borderBottom: '1px solid #e5e7eb' }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>

        {/* Footer */}
        <div className="px-10 py-4 text-center text-xs text-gray-400" style={{ borderTop: '1px solid #e5e7eb' }}>
          — End of Worksheet — Total: {total_marks} Marks —
        </div>
      </div>
    </div>
  )
}
