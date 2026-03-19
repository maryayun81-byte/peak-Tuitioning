'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare, ToggleLeft, AlignLeft, FileText, Calculator,
  Upload, GitMerge, Heading, BookOpen, X, Type
} from 'lucide-react'
import type { QuestionType } from '@/types/database'

interface QuestionTypeSheetProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: QuestionType) => void
}

const TYPES: { type: QuestionType; icon: React.ReactNode; label: string; desc: string; color: string }[] = [
  { type: 'mcq',             icon: <CheckSquare size={20} />,   label: 'Multiple Choice',  desc: 'A, B, C, D options with one correct',   color: '#0EA5E9' },
  { type: 'multi_select',    icon: <CheckSquare size={20} />,   label: 'Multi-Select',     desc: 'Select all correct answers',              color: '#8B5CF6' },
  { type: 'short_answer',    icon: <AlignLeft size={20} />,     label: 'Short Answer',     desc: '1–3 line written response',               color: '#10B981' },
  { type: 'long_answer',     icon: <FileText size={20} />,      label: 'Long Answer/Essay',desc: 'Extended written response',               color: '#F59E0B' },
  { type: 'math',            icon: <Calculator size={20} />,    label: 'Math / Equation',  desc: 'LaTeX/KaTeX rendered math question',      color: '#EF4444' },
  { type: 'file_upload',     icon: <Upload size={20} />,        label: 'File Upload',      desc: 'Student uploads image or document',       color: '#EC4899' },
  { type: 'matching',        icon: <GitMerge size={20} />,      label: 'Matching',         desc: 'Connect left items to right matches',     color: '#14B8A6' },
  { type: 'true_false',      icon: <ToggleLeft size={20} />,    label: 'True / False',     desc: 'Binary true or false question',          color: '#F97316' },
  { type: 'section_header',  icon: <Heading size={20} />,       label: 'Section Header',   desc: 'Divide worksheet into sections',          color: '#6B7280' },
  { type: 'reading_passage', icon: <BookOpen size={20} />,      label: 'Reading Passage',  desc: 'Legacy passage/poem block',              color: '#A78BFA' },
  { type: 'passage',         icon: <BookOpen size={20} />,      label: 'Passage',          desc: 'Standalone reading passage block',        color: '#A78BFA' },
  { type: 'poem',            icon: <Type size={20} />,          label: 'Poem',             desc: 'Poem block with preserved formatting',    color: '#8B5CF6' },
  { type: 'sub_question',    icon: <AlignLeft size={20} />,     label: 'Sub-Question',     desc: 'Alphabetical sub-question (a, b, c)',     color: '#10B981' },
]

export function QuestionTypeSheet({ isOpen, onClose, onSelect }: QuestionTypeSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          {/* Sheet — slides up on mobile, appears as modal on desktop */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[540px] z-50 rounded-t-3xl md:rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', maxHeight: '80vh' }}
          >
            {/* Handle bar (mobile) */}
            <div className="flex md:hidden justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--card-border)' }} />
            </div>

            <div className="flex items-center justify-between px-5 pt-3 pb-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div>
                <h3 className="font-black text-base" style={{ color: 'var(--text)' }}>Add Question</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Choose a question type</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              {TYPES.map(t => (
                <button
                  key={t.type}
                  onClick={() => { onSelect(t.type); onClose() }}
                  className="flex items-start gap-3 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: `${t.color}10`, border: `1px solid ${t.color}25` }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.color, color: 'white' }}>
                    {t.icon}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
