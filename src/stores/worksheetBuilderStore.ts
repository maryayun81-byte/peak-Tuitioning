import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { WorksheetBlock, QuestionType } from '@/types/database'

interface WorksheetMeta {
  title: string
  subject: string
  className: string
}

interface WorksheetBuilderState {
  blocks: WorksheetBlock[]
  meta: WorksheetMeta
  selectedBlockId: string | null
  layoutLocked: boolean
  
  setBlocks: (blocks: WorksheetBlock[]) => void
  setMeta: (patch: Partial<WorksheetMeta>) => void
  addBlock: (type: QuestionType, index?: number) => void
  updateBlock: (id: string, updates: Partial<WorksheetBlock>) => void
  removeBlock: (id: string) => void
  moveBlock: (activeId: string, overId: string) => void
  setSelectedBlockId: (id: string | null) => void
  setLayoutLocked: (locked: boolean) => void
  reset: () => void
}

const DEFAULT_META: WorksheetMeta = { title: '', subject: '', className: '' }

export const useWorksheetBuilderStore = create<WorksheetBuilderState>((set) => ({
  blocks: [],
  meta: DEFAULT_META,
  selectedBlockId: null,
  layoutLocked: true,

  setBlocks: (blocks) => set({ blocks }),
  setMeta: (patch) => set((state) => ({ meta: { ...state.meta, ...patch } })),
  
  addBlock: (type, index) => set((state) => {
    const newBlock: WorksheetBlock = {
      id: uuid(),
      type,
      question: '',
      marks: type === 'section_header' || type === 'reading_passage' ? 0 : 5,
      difficulty: 'medium',
      topic: '',
    }
    
    if (type === 'mcq') {
       newBlock.options = ['', '', '', '']
       newBlock.correct_answer = 'A'
    } else if (type === 'multi_select') {
       newBlock.options = ['', '', '', '']
       newBlock.correct_answers = []
    } else if (type === 'reading_passage') {
       newBlock.passage_text = ''
       newBlock.passage_type = 'passage'
    } else if (type === 'matching') {
       newBlock.matching_pairs = [{ left: '', right: '' }, { left: '', right: '' }]
    } else if (type === 'fill_in_blank') {
       newBlock.blank_text = ''
    }

    const newBlocks = [...state.blocks]
    if (typeof index === 'number') {
      newBlocks.splice(index, 0, newBlock)
    } else {
      newBlocks.push(newBlock)
    }
    
    return { blocks: newBlocks, selectedBlockId: newBlock.id }
  }),

  updateBlock: (id, updates) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
  })),

  removeBlock: (id) => set((state) => ({
    blocks: state.blocks.filter(b => b.id !== id),
    selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId
  })),

  moveBlock: (activeId, overId) => set((state) => {
    const oldIndex = state.blocks.findIndex(b => b.id === activeId)
    const newIndex = state.blocks.findIndex(b => b.id === overId)
    const newBlocks = [...state.blocks]
    const [moved] = newBlocks.splice(oldIndex, 1)
    newBlocks.splice(newIndex, 0, moved)
    return { blocks: newBlocks }
  }),

  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
  setLayoutLocked: (locked) => set({ layoutLocked: locked }),
  reset: () => set({ blocks: [], meta: DEFAULT_META, selectedBlockId: null, layoutLocked: true })
}))
