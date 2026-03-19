'use client'

import { 
  Type, Heading, AlignLeft, FileText, CheckSquare, 
  BookOpen, Calculator, Image as ImageIcon, Table, 
  Hash, Layout, GitMerge, ToggleLeft, Zap
} from 'lucide-react'
import { useWorksheetBuilderStore } from '@/stores/worksheetBuilderStore'
import type { QuestionType } from '@/types/database'

const BLOCK_TYPES: { type: QuestionType; label: string; icon: any; color: string; description: string; category: string }[] = [
  { type: 'section_header',  label: 'Section Header', icon: Heading,     color: '#6B7280', description: 'Add a titled section',         category: 'Structure' },
  { type: 'passage',         label: 'Passage',        icon: BookOpen,    color: '#A78BFA', description: 'Add a reading passage',         category: 'Structure' },
  { type: 'poem',            label: 'Poem',           icon: Type,        color: '#8B5CF6', description: 'Add a poem block',              category: 'Structure' },
  { type: 'sub_question',    label: 'Sub-Question',   icon: AlignLeft,   color: '#10B981', description: 'Indented alphabetical question',category: 'Questions' },
  { type: 'mcq',             label: 'Multiple Choice',icon: CheckSquare, color: '#34D399', description: 'Single correct answer',        category: 'Questions' },
  { type: 'multi_select',    label: 'Multi-Select',   icon: Layout,      color: '#8B5CF6', description: 'Multiple correct answers',     category: 'Questions' },
  { type: 'true_false',      label: 'True / False',   icon: ToggleLeft,  color: '#F97316', description: 'True or false question',      category: 'Questions' },
  { type: 'short_answer',    label: 'Short Answer',   icon: AlignLeft,   color: '#10B981', description: 'Brief open-ended answer',     category: 'Questions' },
  { type: 'long_answer',     label: 'Long Answer',    icon: FileText,    color: '#F59E0B', description: 'Essay or explanation',        category: 'Questions' },
  { type: 'math',            label: 'Math Equation',  icon: Calculator,  color: '#EF4444', description: 'Mathematical working space',  category: 'Questions' },
  { type: 'matching',        label: 'Matching',       icon: GitMerge,    color: '#14B8A6', description: 'Connect related items',       category: 'Questions' },
  { type: 'fill_in_blank',   label: 'Fill in Blanks', icon: Hash,        color: '#EC4899', description: 'Cloze / gap-fill questions',  category: 'Questions' },
]

const CATEGORIES = ['Structure', 'Questions']

export function BlockLibrary() {
  const addBlock = useWorksheetBuilderStore(state => state.addBlock)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--card-border)' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
            <Zap size={14} />
          </div>
          <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Block Library</h3>
        </div>
        <p className="text-[10px] pl-9" style={{ color: 'var(--text-muted)' }}>Tap a block to add to canvas</p>
      </div>

      {/* Block list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
        {CATEGORIES.map(cat => (
          <div key={cat}>
            <div className="px-1 mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{cat}</span>
            </div>
            <div className="space-y-1.5">
              {BLOCK_TYPES.filter(b => b.category === cat).map(block => (
                <button
                  key={block.type}
                  onClick={() => addBlock(block.type)}
                  className="w-full text-left p-3 rounded-xl border transition-all group active:scale-[0.98]"
                  style={{ 
                    border: '1px solid var(--card-border)',
                    background: 'var(--card)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = block.color + '60'
                    ;(e.currentTarget as HTMLElement).style.background = block.color + '0A'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--card)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" 
                      style={{ background: `${block.color}18`, color: block.color }}
                    >
                      <block.icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-none truncate" style={{ color: 'var(--text)' }}>{block.label}</div>
                      <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{block.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
