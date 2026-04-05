'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, FileText, ChevronRight, CheckCircle2, Clock, Trash2, Edit3, Save } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AdminTermsDashboard() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setLoading(true)
    // Fetch documents. Join with profiles for creator name.
    const { data: docs, error } = await supabase
      .from('documents')
      .select(`
        *,
        creator:profiles(full_name)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Supabase Error:', error)
      toast.error('Failed to load documents')
    } else {
      // Fetch assignment counts
      const enriched = await Promise.all((docs || []).map(async (d) => {
        const { count: pending } = await supabase.from('document_assignments').select('id', { count: 'exact', head: true }).eq('document_id', d.id).eq('status', 'pending')
        const { count: signed } = await supabase.from('document_assignments').select('id', { count: 'exact', head: true }).eq('document_id', d.id).eq('status', 'signed')
        return { ...d, _pending: pending || 0, _signed: signed || 0 }
      }))
      setDocuments(enriched)
    }
    setLoading(false)
  }

  const createDocument = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Admin profile not found')
      return
    }
    const admin = { id: user.id }
    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: 'Untitled Terms Document',
        content: '<p>Start writing your conditions here...</p>',
        version: 'v1.0',
        status: 'draft',
        created_by: admin.id
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
    } else if (data) {
      router.push(`/admin/terms/builder/${data.id}`)
    }
  }

  const deleteDocument = async (id: string, isPublished: boolean) => {
    if (isPublished) {
      const confirm1 = confirm('WARNING: This document is PUBLISHED and has active signatures. Deleting it will PERMANENTLY remove all signature records for all teachers. Are you absolutely sure?')
      if (!confirm1) return
      const confirm2 = confirm('Final Confirmation: Type "DELETE" to confirm. (Just kidding, just click OK if you are sure, this is the final warning).')
      if (!confirm2) return
    } else {
      if (!confirm('Delete this draft permanently?')) return
    }
    
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete: ' + error.message)
    } else {
      toast.success('Document deleted')
      loadDocuments()
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <FileText className="text-primary" /> Terms & Conditions
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Manage platform agreements and track teacher signatures.</p>
        </div>
        <Button onClick={createDocument} className="w-full sm:w-auto shadow-lg shadow-primary/20">
          <Plus size={16} className="mr-2" /> New Agreement
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-[var(--input)] animate-pulse rounded-2xl" />)}
        </div>
      ) : documents.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-[var(--card-border)] rounded-3xl">
          <FileText size={48} className="mx-auto text-[var(--text-muted)] opacity-50 mb-4" />
          <h3 className="font-bold text-lg">No Documents</h3>
          <p className="text-[var(--text-muted)] text-sm mb-6">Create your first terms and conditions agreement.</p>
          <Button onClick={createDocument}>Create Document</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc, i) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={doc.id}>
              <Card className="p-5 flex flex-col sm:flex-row gap-4 justify-between group hover:border-primary/30 transition-all border-2">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-black text-lg leading-tight">{doc.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${doc.status === 'published' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/10'}`}>
                        {doc.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-[var(--input)] border border-[var(--card-border)] uppercase">
                        {doc.version}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    <span>by {doc.creator?.full_name || 'Admin'} • {formatDate(doc.updated_at, 'short')}</span>
                    {doc.status === 'published' && (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 size={12}/> {doc._signed} Signed</span>
                        <span className="flex items-center gap-1 text-amber-500"><Clock size={12}/> {doc._pending} Pending</span>
                      </div>
                    )}
                  </div>
                </div>

                  <div className="flex items-center gap-2">
                    {doc.status === 'draft' ? (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/terms/builder/${doc.id}`)}>
                          <Edit3 size={14} className="mr-2" /> Edit Draft
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteDocument(doc.id, false)} className="text-red-500 hover:bg-red-500/10" title="Delete Draft">
                          <Trash2 size={14} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/terms/builder/${doc.id}`)}>
                          <FileText size={14} className="mr-2" /> View Contents
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/terms/tracking/${doc.id}`)}>
                          Tracking <ChevronRight size={14} className="ml-1" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteDocument(doc.id, true)} className="text-red-500/60 hover:text-red-500 hover:bg-red-500/10" title="Delete Published Document">
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
