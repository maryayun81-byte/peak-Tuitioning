'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Printer, 
  MoreVertical,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send
} from 'lucide-react'
import { Transcript } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Card'

interface TranscriptListProps {
  transcripts: Transcript[]
  onPreview: (t: Transcript) => void
  onDownload: (t: Transcript) => void
  onDelete?: (t: Transcript) => void
  onRegenerate: (t: Transcript) => void
  onBulkRegenerate: () => void
  onBulkDelete?: () => void
  onUpdateRemark?: (t: Transcript) => void
  onPublishIndividual?: (t: Transcript) => void
  onBulkPublish?: () => void
  isLoading?: boolean
  hideAdminPowers?: boolean
}

export function TranscriptList({ 
  transcripts, 
  onPreview, 
  onDownload, 
  onDelete, 
  onRegenerate, 
  onBulkRegenerate, 
  onBulkDelete,
  onUpdateRemark,
  onPublishIndividual,
  onBulkPublish,
  isLoading,
  hideAdminPowers = false
}: TranscriptListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  const filtered = useMemo(() => {
    return transcripts.filter(t => 
      t.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.student?.admission_number?.toLowerCase().includes(search.toLowerCase())
    )
  }, [transcripts, search])

  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  return (
    <div className="space-y-6">
      {/* MANAGEMENT CONTROLS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[var(--card)] p-4 rounded-[2rem] border border-[var(--card-border)] shadow-sm transition-theme">
        <div className="flex-1 w-full flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--input)] border-none focus:ring-2 ring-[var(--primary)]/20 outline-none text-sm font-medium text-[var(--text)]"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-[var(--input)] rounded-xl border border-[var(--card-border)]">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[var(--card)] shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            >
              <ListIcon size={18} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[var(--card)] shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {!hideAdminPowers && (
            <Button variant="success" size="sm" onClick={onBulkPublish} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
              <Send size={14} className="mr-2" /> Publish All
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onBulkRegenerate} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
            <RefreshCw size={14} className="mr-2" /> Regenerate All
          </Button>
          {!hideAdminPowers && (
            <Button variant="outline" size="sm" onClick={onBulkDelete} className="rounded-xl font-bold uppercase tracking-widest text-[10px] text-red-500 hover:text-red-600 border-red-100 hover:bg-red-50">
              <Trash2 size={14} className="mr-2" /> Delete All
            </Button>
          )}
        </div>
      </div>

      {/* TRANSCRIPT VIEW */}
      {viewMode === 'list' ? (
        <div className="bg-[var(--card)] rounded-[2rem] border border-[var(--card-border)] overflow-hidden shadow-sm transition-theme">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--input)] text-[10px] font-black tracking-widest text-[var(--text-muted)] uppercase">
                <th className="p-6 border-b border-[var(--card-border)]">Student Info</th>
                <th className="p-6 border-b border-[var(--card-border)]">Performance</th>
                <th className="p-6 border-b border-[var(--card-border)] text-center">Status</th>
                <th className="p-6 border-b border-[var(--card-border)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]/50">
              {paginated.map(t => (
                <tr key={t.id} className="group hover:bg-[var(--input)]/50 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--input)] flex items-center justify-center font-black text-[var(--text-muted)]">
                        {t.student?.full_name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text)] leading-none mb-1">{t.student?.full_name}</p>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t.student?.admission_number} • {t.student?.class?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase mb-0.5">Mean</p>
                        <p className="text-sm font-black text-[var(--text)]">{t.average_score?.toFixed(1)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase mb-0.5">Grade</p>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--sidebar)] text-white text-[10px] font-black">
                          {t.overall_grade}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <Badge variant={t.is_published ? 'success' : 'warning'} className="rounded-full text-[9px] font-black uppercase tracking-widest px-3">
                      {t.is_published ? <><CheckCircle2 size={10} className="mr-1" /> Final</> : <><Clock size={10} className="mr-1" /> Draft</>}
                    </Badge>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onPreview(t)} className="p-2 rounded-lg hover:bg-[var(--input)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all" title="Preview"><Eye size={18} /></button>
                      <button onClick={() => onDownload(t)} className="p-2 rounded-lg hover:bg-[var(--input)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all" title="Download"><Printer size={18} /></button>
                      
                      {!hideAdminPowers && onPublishIndividual && (
                        <button onClick={() => onPublishIndividual(t)} className={`p-2 rounded-lg transition-all ${t.is_published ? 'hover:bg-amber-500/10 text-amber-500' : 'hover:bg-emerald-500/10 text-emerald-500'}`} title={t.is_published ? 'Unpublish' : 'Publish'}><Send size={18} /></button>
                      )}
                      
                      {onUpdateRemark && (
                        <button onClick={() => onUpdateRemark(t)} className="p-2 rounded-lg hover:bg-[var(--input)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all" title="Edit Remarks"><MessageSquare size={18} /></button>
                      )}
                      
                      <button onClick={() => onRegenerate(t)} className="p-2 rounded-lg hover:bg-[var(--input)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all" title="Regenerate"><RefreshCw size={18} /></button>
                      
                      {!hideAdminPowers && onDelete && (
                        <button onClick={() => onDelete(t)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-all" title="Delete"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map(t => (
            <div key={t.id} className="bg-[var(--card)] rounded-[2rem] border border-[var(--card-border)] p-6 shadow-sm hover:shadow-xl hover:shadow-black/10 transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[var(--input)] flex items-center justify-center font-black text-[var(--text-muted)] border border-[var(--card-border)] transition-colors group-hover:bg-[var(--primary)] group-hover:text-white">
                  {t.student?.full_name?.[0]}
                </div>
                <Badge variant={t.is_published ? 'success' : 'warning'}>
                  {t.is_published ? 'Final' : 'Draft'}
                </Badge>
              </div>

              <div className="mb-6">
                <h4 className="font-black text-[var(--text)] uppercase tracking-tight truncate">{t.student?.full_name}</h4>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t.student?.admission_number} • {t.student?.class?.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[var(--input)] p-3 rounded-2xl border border-[var(--card-border)]">
                  <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Mean Score</p>
                  <p className="text-lg font-black text-[var(--text)]">{t.average_score?.toFixed(1)}%</p>
                </div>
                <div className="bg-[var(--sidebar)] p-3 rounded-2xl flex items-center justify-center border border-white/5">
                  <span className="text-3xl font-black text-white">{t.overall_grade}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--card-border)] flex items-center justify-between">
                <div className="flex gap-1">
                   <button onClick={() => onPreview(t)} className="p-2 rounded-lg hover:bg-[var(--input)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all"><Eye size={18} /></button>
                   {!hideAdminPowers && onPublishIndividual && (
                     <button onClick={() => onPublishIndividual(t)} className={`p-2 rounded-lg transition-all ${t.is_published ? 'hover:bg-amber-500/10 text-amber-500' : 'hover:bg-emerald-500/10 text-emerald-500'}`}><Send size={18} /></button>
                   )}
                   {onUpdateRemark && (
                     <button onClick={() => onUpdateRemark(t)} className="p-2 rounded-lg hover:bg-[var(--input)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all"><MessageSquare size={18} /></button>
                   )}
                </div>
                <button onClick={() => onDownload(t)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--input)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--primary)] hover:text-white transition-all shadow-sm">
                   <Printer size={14} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
            className="rounded-xl"
          >
            <ChevronLeft size={16} />
          </Button>
          <div className="flex items-center gap-2 px-4">
             {Array.from({ length: totalPages }).map((_, i) => (
               <button 
                 key={i} 
                 onClick={() => setPage(i + 1)}
                 className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${page === i + 1 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-100'}`}
               >
                 {i + 1}
               </button>
             ))}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === totalPages} 
            onClick={() => setPage(page + 1)}
            className="rounded-xl"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* EMPTY STATE */}
      {transcripts.length === 0 && (
        <div className="py-24 text-center bg-[var(--card)] rounded-[3rem] border border-dashed border-[var(--card-border)] transition-theme">
           <div className="w-20 h-20 bg-[var(--input)] rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)] border border-[var(--card-border)]">
              <RefreshCw size={40} />
           </div>
           <h3 className="text-xl font-black text-[var(--text)] uppercase tracking-tight mb-2">No Transcripts Generated</h3>
           <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-8">Ready to transform academic data into premium insights?</p>
           <Button onClick={onBulkRegenerate} className="rounded-2xl px-8 font-black uppercase tracking-widest text-xs">
              <RefreshCw size={18} className="mr-2" /> Start Generation
           </Button>
        </div>
      )}
    </div>
  )
}
