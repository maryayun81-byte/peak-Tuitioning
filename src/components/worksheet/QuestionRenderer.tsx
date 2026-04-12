'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Circle, ChevronDown, ChevronUp, Upload, BookOpen, Type as DrawIcon } from 'lucide-react'
import type { WorksheetBlock, WorksheetAnswers } from '@/types/database'
import { AnnotationCanvas } from '@/components/worksheet/AnnotationCanvas'
import MathRenderer from '@/components/ui/MathRenderer'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

interface QuestionRendererProps {
  block: WorksheetBlock
  index: number // question number (1-based, skips section/passage)
  answer: WorksheetAnswers[string]
  onChange: (value: WorksheetAnswers[string]) => void
  readOnly?: boolean
  showCorrect?: boolean   // for grading review
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const DIFF = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444' }

const lightPaperStyle = {
  '--card': '#ffffff',
  '--input': '#f9fafb',
  '--text': '#000000',
  '--text-muted': '#4b5563',
  '--card-border': '#e5e7eb',
} as React.CSSProperties

export function QuestionRenderer({ block, index, answer, onChange, readOnly, showCorrect }: QuestionRendererProps) {
  
  // Helper to render text with KaTeX support
  const renderTextWithMath = (text: string | undefined) => {
    if (!text) return null
    // Split by $ or $$
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            const formula = part.slice(2, -2)
            return <MathRenderer key={i} formula={formula} block={true} />
          } else if (part.startsWith('$') && part.endsWith('$')) {
            const formula = part.slice(1, -1)
            return <MathRenderer key={i} formula={formula} block={false} />
          }
          return <span key={i}>{part}</span>
        })}
      </>
    )
  }

  // --- Teacher Diagram Rendering ---
  const renderTeacherDiagram = () => {
    if (!block.diagram_json) return null
    return (
      <div className="my-4 rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm w-full">
        <div className="bg-slate-50/50 px-3 py-1.5 border-b border-slate-100 flex items-center gap-2">
           <DrawIcon size={12} className="text-slate-400" />
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Diagram / Illustration</span>
        </div>
        <AnnotationCanvas
          key={`diagram-render-${block.id}`}
          backgroundJson={block.diagram_json}
          onSave={() => {}}
          readOnly={true}
        />
      </div>
    )
  }

  const renderQuestionImage = () => {
    if (!block.image_url) return null
    const urlLower = block.image_url.toLowerCase().split('?')[0]
    const isPDF = urlLower.endsWith('.pdf')
    const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(urlLower)

    // Both PDFs and non-image documents (DOCX, etc.) fallback to the robust embedded document card.
    // Native iframes for PDFs silently fail on iOS/Safari, leaving students with a blank 500px box.
    if (isPDF || !isImage) {
      return (
        <div className="my-4 rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0" style={{ background: 'var(--primary)' }}>
                 <BookOpen size={24} />
              </div>
              <div>
                 <p className="text-sm font-black text-slate-800 tracking-tight">
                   {isPDF ? 'Attached PDF Document' : 'Attached Document'}
                 </p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                   Opens in a safe tab
                 </p>
              </div>
           </div>
           <a 
             href={block.image_url} 
             target="_blank" 
             rel="noreferrer"
             className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all outline-none text-center"
             style={{ background: 'var(--primary)', color: '#ffffff' }}
           >
             Read Document
           </a>
        </div>
      )
    }

    return (
      <div className="my-4 rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm flex items-center justify-center p-2 bg-slate-50/30">
        <img 
          src={block.image_url} 
          alt={`Visual prompt for question ${index}`}
          className="max-w-full max-h-[400px] object-contain rounded-xl shadow-sm"
        />
      </div>
    )
  }

  // --- MCQ ---
  const renderMCQ = () => (
    <div className="space-y-2 mt-3">
      {(block.options ?? []).map((opt: any, i: any) => {
        const letter = OPTION_LABELS[i]
        const selected = answer === letter
        const isCorrect = block.correct_answer === letter
        let bg = 'var(--input)'; let border = 'var(--card-border)'; let textColor = 'var(--text)'
        if (selected) { bg = '#0EA5E918'; border = '#0EA5E9'; textColor = '#0EA5E9' }
        if (showCorrect && isCorrect) { bg = '#10B98118'; border = '#10B981'; textColor = '#10B981' }
        if (showCorrect && selected && !isCorrect) { bg = '#EF444418'; border = '#EF4444'; textColor = '#EF4444' }
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange(selected ? null : letter)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
            style={{ background: bg, border: `1.5px solid ${border}`, color: textColor }}
          >
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0" style={{ background: selected || (showCorrect && isCorrect) ? border : 'var(--card-border)', color: selected || (showCorrect && isCorrect) ? 'white' : 'var(--text-muted)' }}>
              {letter}
            </span>
            <span className="text-sm font-medium break-words overflow-hidden">
              {renderTextWithMath(opt)}
            </span>
          </button>
        )
      })}
    </div>
  )

  // --- Multi-select ---
  const renderMultiSelect = () => {
    const selected = Array.isArray(answer) ? (answer as string[]) : []
    return (
      <div className="space-y-2 mt-3">
        {(block.options ?? []).map((opt: any, i: any) => {
          const letter = OPTION_LABELS[i]
          const isSelected = selected.includes(letter)
          const isCorrect = (block.correct_answers ?? []).includes(letter)
          let border = 'var(--card-border)'
          if (isSelected) border = '#8B5CF6'
          if (showCorrect && isCorrect) border = '#10B981'
          if (showCorrect && isSelected && !isCorrect) border = '#EF4444'
          return (
            <button
              key={i}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (readOnly) return
                const next = isSelected ? selected.filter(x => x !== letter) : [...selected, letter]
                onChange(next)
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
              style={{ background: isSelected ? '#8B5CF618' : 'var(--input)', border: `1.5px solid ${border}` }}
            >
              <span className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ border: `2px solid ${border}`, background: isSelected ? '#8B5CF6' : 'transparent' }}>
                {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
              </span>
              <span className="text-sm font-medium break-words overflow-hidden" style={{ color: 'var(--text)' }}>
                {renderTextWithMath(opt)}
              </span>
            </button>
          )
        })}
        <p className="text-[10px] italic mt-1" style={{ color: 'var(--text-muted)' }}>Select all that apply</p>
      </div>
    )
  }

  // --- True/False ---
  const renderTrueFalse = () => (
    <div className="flex gap-3 mt-3">
      {['true', 'false'].map(val => {
        const selected = answer === val
        const isCorrect = block.correct_answer === val
        let border = 'var(--card-border)'
        if (selected) border = val === 'true' ? '#10B981' : '#EF4444'
        if (showCorrect && isCorrect) border = '#10B981'
        if (showCorrect && selected && !isCorrect) border = '#EF4444'
        return (
          <button
            key={val}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange(val)}
            className="flex-1 py-3 rounded-xl text-sm font-bold capitalize transition-all"
            style={{ border: `2px solid ${border}`, background: selected ? `${border}18` : 'var(--input)', color: selected ? border : 'var(--text-muted)' }}
          >{val}</button>
        )
      })}
    </div>
  )

  // --- Short/Long Answer ---
  const renderTextAnswer = () => (
    <textarea
      disabled={readOnly}
      className="w-full mt-3 rounded-xl p-3 text-sm resize-none transition-all"
      style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)', minHeight: `${Math.max(2, block.answer_lines ?? 4) * 28}px` }}
      value={(answer as string) ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={block.answer_placeholder ?? 'Write your answer here...'}
    />
  )

  // --- Matching ---
  const renderMatching = () => {
    const pairs = block.matching_pairs ?? []
    const answerMap = (Array.isArray(answer) ? answer : []) as { left: string; right: string }[]
    const shuffledRight = [...pairs.map((p: any) => p.right)].sort(() => 0.5 - Math.random())
    const [localRight] = useState(shuffledRight)

    return (
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase tracking-wide mb-2">
          <span style={{ color: 'var(--text-muted)' }}>Column A</span>
          <span style={{ color: 'var(--text-muted)' }}>Column B</span>
        </div>
        {pairs.map((pair: any, i: any) => (
          <div key={i} className="grid grid-cols-2 gap-2 items-center">
            <div className="p-2.5 rounded-lg text-sm" style={{ background: 'var(--input)', color: 'var(--text)' }}>
              {renderTextWithMath(pair.left)}
            </div>
            {readOnly ? (
              <div className="p-2.5 rounded-lg text-sm" style={{ background: 'var(--input)', color: 'var(--text)' }}>
                {answerMap.find(a => a.left === pair.left)?.right ?? '—'}
              </div>
            ) : (
              <select
                className="p-2.5 rounded-lg text-sm"
                style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                value={answerMap.find(a => a.left === pair.left)?.right ?? ''}
                onChange={e => {
                  const next = [...answerMap.filter(a => a.left !== pair.left)]
                  if (e.target.value) next.push({ left: pair.left, right: e.target.value })
                  onChange(next)
                }}
              >
                <option value="">— Select —</option>
                {localRight.map((r, ri) => <option key={ri} value={r}>{r}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
    )
  }
  // --- Diagram Labeling ---
  const renderDiagramLabeling = () => {
    const labels = block.labels || []
    const answerMap = (typeof answer === 'object' && answer !== null && !Array.isArray(answer) ? answer : {}) as Record<string, string>
    
    return (
      <div className="mt-3 space-y-4">
        <div className="relative aspect-video bg-[var(--input)] rounded-xl overflow-hidden border border-[var(--card-border)] ring-1 ring-[var(--card-border)]">
           {block.diagram_url ? (
              <img src={block.diagram_url} alt="Diagram" className="w-full h-full object-contain" />
           ) : (
              <div className="w-full h-full flex items-center justify-center opacity-10"><BookOpen size={48} /></div>
           )}
           {labels.map((label: any) => (
              <div 
                key={label.id} 
                className="absolute w-6 h-6 bg-primary rounded-full ring-2 ring-white transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] font-black text-white shadow-xl"
                style={{ left: `${label.x}%`, top: `${label.y}%` }}
              >
                 {labels.indexOf(label) + 1}
              </div>
           ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
           {labels.map((label: any, i: any) => (
              <div key={label.id} className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-lg bg-[var(--input)] flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                 <input 
                    disabled={readOnly}
                    className="flex-1 bg-[var(--input)] border border-[var(--card-border)] rounded-xl px-3 py-2 text-sm"
                    value={answerMap[label.id] || ''}
                    onChange={e => onChange({ ...answerMap, [label.id]: e.target.value })}
                    placeholder="Enter answer..."
                 />
              </div>
           ))}
        </div>
      </div>
    )
  }

  // --- Table Question ---
  const renderTableQuestion = () => {
    const headers = block.table_data?.headers || []
    const answerRows = (Array.isArray(answer) && Array.isArray(answer[0]) ? answer : []) as string[][]
    
    return (
      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--card-border)] shadow-sm">
         <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-[var(--input)]">
               <tr>
                  {headers.map((h: any, i: any) => <th key={i} className="px-4 py-2 font-black uppercase tracking-wider text-[10px] opacity-60 border-r border-[var(--card-border)]">{h}</th>)}
               </tr>
            </thead>
            <tbody>
               {[0, 1, 2].map(rowIndex => (
                  <tr key={rowIndex} className="border-t border-[var(--card-border)]">
                     {headers.map((_: any, colIndex: any) => (
                        <td key={colIndex} className="p-0 border-r border-[var(--card-border)]">
                           <input 
                              disabled={readOnly}
                              className="w-full bg-transparent p-3 text-sm focus:bg-primary/5 transition-colors"
                              value={answerRows[rowIndex]?.[colIndex] || ''}
                              onChange={e => {
                                 const next = [...answerRows]
                                 if (!next[rowIndex]) next[rowIndex] = new Array(headers.length).fill('')
                                 next[rowIndex][colIndex] = e.target.value
                                 onChange(next)
                              }}
                           />
                        </td>
                     ))}
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
    )
  }

  // --- Fill in the Blank ---
  const renderFillInBlank = () => {
    const parts = block.blank_text?.split(/(\[.*?\])/) || []
    const answerMap = (typeof answer === 'object' && answer !== null && !Array.isArray(answer) ? answer : {}) as Record<string, string>
    let blankCounter = 0

    return (
      <div className="mt-3 p-4 rounded-xl bg-[var(--input)]/50 border border-[var(--card-border)] leading-relaxed text-base">
         {parts.map((part: any, i: any) => {
            if (part.startsWith('[') && part.endsWith(']')) {
               const blankId = `blank-${blankCounter++}`
               return (
                  <input 
                     key={i}
                     disabled={readOnly}
                     className="mx-1 px-2 py-0.5 rounded-lg border-b-2 border-primary/40 bg-white/50 dark:bg-black/20 text-sm font-bold w-24 focus:w-32 transition-all text-center focus:border-primary"
                     value={answerMap[blankId] || ''}
                     onChange={e => onChange({ ...answerMap, [blankId]: e.target.value })}
                  />
               )
            }
            return <span key={i}>{part}</span>
         })}
      </div>
    )
  }

  // --- File Upload ---
  const FileUpload = () => {
    const onDrop = useCallback((files: File[]) => {
      if (files[0]) onChange(files[0].name) // store filename; actual upload handled by parent
    }, [])
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false, disabled: readOnly })
    return (
      <div {...getRootProps()} className="mt-3 rounded-xl p-8 text-center cursor-pointer transition-all" style={{ background: isDragActive ? 'var(--primary-dim)' : 'var(--input)', border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--card-border)'}` }}>
        <input {...getInputProps()} />
        <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{isDragActive ? 'Drop file here' : 'Click or drag file here'}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{answer ? `📎 ${answer}` : 'Accepts images, PDF, Word docs'}</p>
      </div>
    )
  }
 
  // --- Math/Drawing/Virtual Paper ---
  const renderDrawingCanvas = () => {
    // CRITICAL: The height is passed to AnnotationCanvas as a fixed value.
    // Previously the outer div had a dynamic height that caused page reflow (jitter) on every stroke.
    const canvasHeight = Math.max(400, (block.answer_lines || 12) * 32)
    return (
      <div className="mt-3 space-y-2">
         <div className="flex items-center gap-2 mb-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <DrawIcon size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Virtual Paper Mode — Draw your working below</span>
         </div>
         {/* No inline height here — canvas controls its own size via the height prop */}
         <div className="rounded-2xl overflow-hidden border-2 border-[var(--card-border)] bg-white shadow-inner">
            <AnnotationCanvas
               key={block.id}
               backgroundText={undefined}
               defaultColor="#3b82f6"
               initialJson={typeof answer === 'string' && answer.startsWith('{') ? (answer as string) : undefined}
               onSave={json => !readOnly && onChange(json)}
               readOnly={readOnly}
               height={canvasHeight}
            />
         </div>
         {!readOnly && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mt-2">Marks will be awarded for your working steps</p>}
      </div>
    )
  }
 
  // --- Section header (not a question) ---
  if (block.type === 'section_header') {
    return (
      <div className="py-4" style={{ borderBottom: '2px solid var(--card-border)', ...lightPaperStyle }}>
        <h3 className="font-black uppercase text-sm tracking-wide" style={{ color: 'var(--text)' }}>
          {renderTextWithMath(block.section_title || '')}
        </h3>
        {block.section_instructions && (
          <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>
            {renderTextWithMath(block.section_instructions)}
          </p>
        )}
      </div>
    )
  }

  // --- Reading passage/poem block ---
  if (block.type === 'reading_passage' || block.type === 'passage' || block.type === 'poem') {
    const isPoem = block.type === 'poem' || block.passage_type === 'poem'
    const rawContent = block.question || block.passage_text || ''
    // If it contains tags, treat as HTML; otherwise, treat as plain text for exact \n preservation
    const isHtml = rawContent.includes('</') || rawContent.includes('<br')

    return (
      <div className="py-2 mb-4" style={lightPaperStyle}>
        <div 
          className={cn(
            "text-base leading-relaxed whitespace-pre-wrap",
            isPoem ? "font-serif italic text-lg pl-6 border-l-4 border-primary/20" : ""
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)', ...lightPaperStyle }}
    >
      {/* Question header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-start gap-3 flex-1">
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ background: 'var(--primary)', color: 'white' }}>
            {index}
          </span>
          <div>
            <div className="text-sm font-medium leading-relaxed break-words overflow-hidden" style={{ color: 'var(--text)' }}>
              {renderTextWithMath(block.question)}
            </div>
            {renderQuestionImage()}
            {renderTeacherDiagram()}
            {block.topic && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>{block.topic}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-black" style={{ color: 'var(--primary)' }}>[{block.marks}]</div>
          <div className="text-[9px] font-bold uppercase mt-0.5" style={{ color: DIFF[block.difficulty as keyof typeof DIFF] }}>{block.difficulty}</div>
        </div>
      </div>

      {block.type === 'mcq' && renderMCQ()}
      {block.type === 'multi_select' && renderMultiSelect()}
      {block.type === 'true_false' && renderTrueFalse()}
      {(block.type === 'short_answer' || block.type === 'long_answer' || block.type === 'math' || block.type === 'sub_question') && renderTextAnswer()}
      {block.type === 'math_drawing' && renderDrawingCanvas()}
      {block.type === 'matching' && renderMatching()}
      {block.type === 'file_upload' && <FileUpload />}
      {block.type === 'diagram_labeling' && renderDiagramLabeling()}
      {block.type === 'table_question' && renderTableQuestion()}
      {block.type === 'fill_in_blank' && renderFillInBlank()}
    </motion.div>
  )
}
