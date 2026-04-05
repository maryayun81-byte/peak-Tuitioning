'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle2, Clock, Filter, UserCheck, ShieldCheck } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select, Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'

export default function SignatureTracking({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedSignature, setSelectedSignature] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: docData } = await supabase.from('documents').select('*').eq('id', id).single()
    if (docData) setDoc(docData)

    const { data: assignmentData } = await supabase
      .from('document_assignments')
      .select('*, teacher:teachers(full_name, email)')
      .eq('document_id', id)
      .order('assigned_at', { ascending: false })
      
    if (assignmentData) setAssignments(assignmentData)
    setLoading(false)
  }

  const filtered = assignments.filter(a => {
    const matchesFilter = filter === 'all' ? true : a.status === filter
    const searchLower = search.toLowerCase()
    const matchesSearch = (a.teacher?.full_name || '').toLowerCase().includes(searchLower) || 
                          (a.teacher?.email || '').toLowerCase().includes(searchLower)
    return matchesFilter && matchesSearch
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/terms')} className="px-2">
          <ChevronLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <ShieldCheck className="text-primary" /> Signature Tracking
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {doc ? `${doc.title} (${doc.version})` : 'Loading document...'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
          <div>
            <div className="text-2xl font-black">{assignments.length}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Total Assigned</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-black">{assignments.filter(a => a.status === 'signed').length}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Signatures</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-2xl font-black">{assignments.filter(a => a.status === 'pending').length}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Pending</div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-[var(--card-border)] bg-[var(--input)]/50 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-[150px]">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
            </Select>
          </div>
          <Input 
            placeholder="Search teachers..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full sm:w-[300px]"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading tracking data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">
            No assignments match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--input)]/50 border-b border-[var(--card-border)] text-[var(--text-muted)] uppercase tracking-wider text-[10px] font-black">
                <tr>
                  <th className="p-4">Teacher</th>
                  <th className="p-4">Assigned On</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-[var(--input)]/20 transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{a.teacher?.full_name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{a.teacher?.email}</div>
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">{formatDate(a.assigned_at, 'short')}</td>
                    <td className="p-4">
                      {a.status === 'signed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black bg-emerald-500/10 text-emerald-500 uppercase tracking-widest">
                          <CheckCircle2 size={12} /> Signed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black bg-amber-500/10 text-amber-500 uppercase tracking-widest">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {a.status === 'signed' && a.signature_type ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{a.signature_type}</span>
                          {a.signature_type === 'typed' ? (
                            <span className="font-serif italic bg-[var(--input)] px-2 py-1 rounded w-fit text-xs border">{a.signature_data}</span>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => setSelectedSignature(a)}>
                              View Drawing
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)] opacity-50">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={!!selectedSignature} onClose={() => setSelectedSignature(null)} title="Signature Ledger Record">
        {selectedSignature && (
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-[var(--text-muted)]">Signed by: </span>
              <span className="font-bold">{selectedSignature.teacher?.full_name}</span>
            </div>
            <div className="text-sm">
              <span className="text-[var(--text-muted)]">Timestamp: </span>
              <span className="font-bold">{new Date(selectedSignature.signed_at).toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-[var(--text-muted)]">Document Version: </span>
              <span className="font-bold">{doc?.version}</span>
            </div>
            <div className="p-4 bg-white border-2 rounded-2xl flex items-center justify-center min-h-[200px]">
              {selectedSignature.signature_type === 'drawn' && selectedSignature.signature_data ? (
                <img src={selectedSignature.signature_data} alt="Drawn Signature" className="max-w-full h-auto" />
              ) : (
                <span className="text-slate-400 italic">No image data saved</span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
