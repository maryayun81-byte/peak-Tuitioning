'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, BookOpen } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { WorksheetBlock } from '@/types/database'

export interface BankQuestion {
  key: string
  block: WorksheetBlock
  fromTitle: string
  subjectName: string
}

/**
 * Question Bank — every question the teacher has ever written, searchable
 * and one tap away from reuse. Great questions compound: write once, use
 * every term. Cloned with a fresh id on insert (never shared by reference).
 */
export function QuestionBankDrawer({
  isOpen,
  onClose,
  onAdd,
  teacherId,
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (block: WorksheetBlock) => void
  teacherId?: string
}) {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<BankQuestion[]>([])
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')

  useEffect(() => {
    if (!isOpen || !teacherId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('assignments')
          .select('id, title, subject:subjects(name), worksheet')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(40)
        if (error) throw error
        if (cancelled) return
        const out: BankQuestion[] = []
        for (const a of (data || []) as any[]) {
          const subject = Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name
          for (const b of (Array.isArray(a.worksheet) ? a.worksheet : []) as WorksheetBlock[]) {
            if (!b || b.type === 'section_header' || b.type === 'reading_passage') continue
            const text = (b.question || '').replace(/<[^>]*>/g, '').trim()
            if (!text && b.type !== 'passage' && b.type !== 'poem') continue
            out.push({
              key: `${a.id}:${b.id}`,
              block: b,
              fromTitle: a.title || 'Untitled',
              subjectName: subject || 'General',
            })
          }
        }
        setItems(out.slice(0, 200))
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [isOpen, teacherId, supabase])

  const subjectNames = useMemo(
    () => Array.from(new Set(items.map((i) => i.subjectName))).sort(),
    [items]
  )

  const filtered = items.filter((i) => {
    const q = search.toLowerCase()
    const text = ((i.block.question || '').replace(/<[^>]*>/g, '') + ' ' + i.fromTitle).toLowerCase()
    return (!q || text.includes(q)) && (!subjectFilter || i.subjectName === subjectFilter)
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Question Bank" size="lg">
      <div className="space-y-3 py-2" style={{ maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Every question you&apos;ve written before — tap to reuse it here with a fresh copy.
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search questions..."
              leftIcon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-36 shrink-0">
            <option value="">All subjects</option>
            {subjectNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '46vh' }}>
          {loading ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Digging through your past papers…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpen size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                {items.length === 0 ? 'No past questions yet — your bank grows with every assignment.' : 'No matches. Try different words.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.key}
                className="flex items-start gap-3 p-3 rounded-2xl border transition-all hover:shadow-md"
                style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold leading-relaxed line-clamp-2" style={{ color: 'var(--text)' }}>
                    {(item.block.question || '').replace(/<[^>]*>/g, '') || item.block.type}
                  </p>
                  <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                    {item.subjectName} · {item.fromTitle} · {item.block.marks} marks
                  </p>
                </div>
                <button
                  onClick={() => {
                    onAdd({
                      ...item.block,
                      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    })
                  }}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
                  style={{ background: 'var(--primary)' }}
                  title="Add to this worksheet"
                  aria-label="Add question to worksheet"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
