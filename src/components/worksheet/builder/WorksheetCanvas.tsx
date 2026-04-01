'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DndContext, closestCenter, KeyboardSensor,
  PointerSensor, useSensor, useSensors, DragEndEvent 
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Plus, Lock, Unlock, Eye, EyeOff, Save, Download, Layers, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useWorksheetBuilderStore } from '@/stores/worksheetBuilderStore'
import { useAuthStore } from '@/stores/authStore'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { SortableBlock } from './SortableBlock'
import { generateWorksheetPDF } from '@/lib/services/worksheetExport'
import { WorksheetPreview } from '@/components/worksheet/WorksheetPreview'

export function WorksheetCanvas() {
  const { blocks, meta, setMeta, moveBlock, layoutLocked, setLayoutLocked } = useWorksheetBuilderStore()
  const { profile, teacher } = useAuthStore()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = getSupabaseBrowserClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) moveBlock(active.id as string, over.id as string)
  }

  const totalMarks = blocks.reduce((acc, b) => acc + (b.marks || 0), 0)

  const handleExportPDF = () => {
    generateWorksheetPDF({
      title: meta.title || 'Worksheet',
      subject_name: meta.subject || undefined,
      class_name: meta.className || undefined,
      worksheet: blocks,
      total_marks: totalMarks,
    })
  }

  const handleSave = async () => {
    if (!profile?.id) {
      toast.error('You must be logged in to save.')
      return
    }

    if (!meta.title.trim()) {
      toast.error('Please enter a worksheet title.')
      return
    }

    if (blocks.length === 0) {
      toast.error('Cannot save an empty worksheet.')
      return
    }

    setIsSaving(true)
    const toastId = toast.loading('Initiating save...')

    // Safety: 45 seconds for diagnostic mode
    const safetyTimer = setTimeout(() => {
      setIsSaving(false)
      toast.error('Save timed out. Please check your browser console for logs.', { id: toastId })
    }, 45000)

    try {
      console.log('[Worksheet Save] --- SAVE ATTEMPT START ---')
      console.log('[Worksheet Save] User ID:', profile.id)
      
      const payload = {
        teacher_id: profile.id,
        title: meta.title.trim(),
        description: [meta.subject, meta.className].filter(Boolean).join(' · ') || 'No description',
        category: meta.subject?.trim() || 'General',
        blocks: blocks as any,
        total_marks: totalMarks || 0,
      }

      console.log('[Worksheet Save] Payload Size:', JSON.stringify(payload).length, 'bytes')

      // Step 2: Attempt Insert directly
      console.log('[Worksheet Save] Attempting direct INSERT into worksheet_templates_v3...')
      const { data: insertData, error: insertError } = await supabase
        .from('worksheet_templates_v3')
        .insert(payload)
        .select()

      if (insertError) {
        console.error('[Worksheet Save] INSERT ERROR:', insertError)
        // Check for specific error codes
        if (insertError.code === '42P01') {
          throw new Error('Table "worksheet_templates_v3" does not exist in your Supabase database.')
        }
        throw new Error(insertError.message || JSON.stringify(insertError))
      }

      console.log('[Worksheet Save] SUCCESS! Saved Data:', insertData)
      toast.success('Worksheet saved successfully!', { id: toastId })
    } catch (err: any) {
      console.error('[Worksheet Save] FATAL ERROR:', err)
      toast.error(`Save failed: ${err.message}`, { id: toastId })
    } finally {
      clearTimeout(safetyTimer)
      setIsSaving(false)
      console.log('[Worksheet Save] --- SAVE ATTEMPT END ---')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div
        className="h-14 px-3 md:px-5 flex items-center justify-between gap-3 shrink-0"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)' }}
      >
        {/* Lock toggle */}
        <div className="flex bg-[var(--input)] rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setLayoutLocked(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${!layoutLocked ? 'bg-[var(--card)] shadow-sm text-primary' : 'opacity-40'}`}
          >
            <Unlock size={11} /> <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={() => setLayoutLocked(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${layoutLocked ? 'bg-[var(--card)] shadow-sm' : 'opacity-40'}`}
          >
            <Lock size={11} /> <span className="hidden sm:inline">Lock</span>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>
            {totalMarks} <span className="font-normal opacity-70">marks</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="flex px-2.5 sm:px-3">
            <Download size={14} className="sm:mr-1.5" /> <span className="hidden sm:inline">Export PDF</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)} className="flex px-2.5 sm:px-3">
            <Eye size={14} className="sm:mr-1.5" /> <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex px-2.5 sm:px-3">
            {isSaving ? (
              <Loader2 size={14} className="sm:mr-1.5 animate-spin" />
            ) : (
              <Save size={14} className="sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* Scrollable document area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="min-h-full px-4 py-8 md:px-8 md:py-10 flex flex-col items-center">
          <div
            className="w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            {/* Gradient top strip */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)' }} />

            <div className="px-5 py-7 md:px-12 md:py-10">
              {/* Metadata inputs — editable inline */}
              <div className="mb-8 space-y-3">
                <input
                  type="text"
                  className="w-full text-xl md:text-3xl font-black bg-transparent border-0 outline-none text-center placeholder-opacity-30 focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-1"
                  style={{ color: 'var(--text)' }}
                  placeholder="Worksheet Title"
                  value={meta.title}
                  onChange={e => setMeta({ title: e.target.value })}
                />
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <input
                    type="text"
                    className="text-sm bg-transparent border-0 outline-none text-center placeholder-opacity-30 focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-1"
                    style={{ color: 'var(--text-muted)' }}
                    placeholder="Subject"
                    value={meta.subject}
                    onChange={e => setMeta({ subject: e.target.value })}
                  />
                  <span className="hidden sm:inline self-center opacity-30" style={{ color: 'var(--text-muted)' }}>·</span>
                  <input
                    type="text"
                    className="text-sm bg-transparent border-0 outline-none text-center placeholder-opacity-30 focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-1"
                    style={{ color: 'var(--text-muted)' }}
                    placeholder="Class / Form"
                    value={meta.className}
                    onChange={e => setMeta({ className: e.target.value })}
                  />
                </div>

                {/* Name / Date / Class fill fields */}
                <div
                  className="mt-4 grid grid-cols-3 gap-3 text-xs pt-4"
                  style={{ borderTop: '1px dashed var(--card-border)' }}
                >
                  {['Name', 'Date', 'Class'].map(f => (
                    <div key={f} className="flex flex-col gap-1.5">
                      <span className="font-bold uppercase tracking-wider text-[9px]" style={{ color: 'var(--text-muted)' }}>{f}</span>
                      <div className="h-7 rounded-lg border" style={{ borderColor: 'var(--card-border)', background: 'var(--input)' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* DnD blocks */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {blocks.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed"
                          style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
                        >
                          <Layers size={36} className="mb-4 opacity-20" />
                          <p className="font-bold text-sm">Canvas is empty</p>
                          <p className="text-xs mt-1 opacity-60">Add blocks from the library to get started</p>
                        </motion.div>
                      ) : (
                        (() => {
                          let currentQ = 1
                          let currentSubQ = 0
                          const mainTypes = ['mcq', 'multi_select', 'short_answer', 'long_answer', 'true_false', 'math', 'matching', 'fill_in_blank']
                          
                          return blocks.map((block, index) => {
                            let qLabel: string | number | undefined = undefined
                            
                            if (block.type === 'sub_question') {
                              qLabel = `${String.fromCharCode(97 + (currentSubQ % 26))})`
                              currentSubQ++
                            } else if (mainTypes.includes(block.type)) {
                              qLabel = currentQ++
                              currentSubQ = 0 // Reset for next set of sub-questions
                            } else {
                              // Reset sub-counter on structural blocks too
                              currentSubQ = 0
                            }
                            
                            return <SortableBlock key={block.id} block={block} index={index} qNumber={qLabel} />
                          })
                        })()
                      )}
                    </AnimatePresence>
                  </div>
                </SortableContext>
              </DndContext>

              {/* Footer */}
              <div
                className="mt-12 pt-5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest"
                style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
              >
                <span>Peak Performance Tutoring</span>
                <span className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>{totalMarks} Marks</span>
                  Page 1
                </span>
              </div>
            </div>
          </div>

          <button
            className="mt-8 mb-4 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <Plus size={16} /> Add Page
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Preview header */}
              <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <div>
                  <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>Worksheet Preview</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>This is how the printed worksheet will look</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportPDF}>
                    <Download size={13} className="mr-1.5" /> Export PDF
                  </Button>
                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Preview body */}
              <div className="flex-1 overflow-y-auto">
                <WorksheetPreview
                  title={meta.title || 'Untitled Worksheet'}
                  subject={meta.subject}
                  class_name={meta.className}
                  blocks={blocks}
                  total_marks={totalMarks}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
