'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, Search, File, FileText, Image, 
  Video, Download, Trash2, Globe, Lock,
  Filter, MoreVertical, ExternalLink, Library
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Resource, Subject } from '@/types/database'

export default function TeacherResources() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  
  const [resources, setResources] = useState<any[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    type: 'pdf' as 'video' | 'pdf' | 'image' | 'link' | 'document',
    url: '',
    subject_id: '',
    is_public: true,
  })

  useEffect(() => {
    if (teacher?.id) loadData()
  }, [teacher?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rRes, sRes] = await Promise.all([
        supabase.from('resources').select('*, subject:subjects(name)').eq('teacher_id', teacher?.id).order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').order('name'),
      ])
      setResources(rRes.data ?? [])
      setSubjects(sRes.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  // Safety timeout
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), 5000)
      return () => clearTimeout(t)
    }
  }, [loading])

  const handleUpload = async () => {
    if (!newResource.title || !newResource.url || !newResource.subject_id) {
       toast.error('Fill in all fields')
       return
    }
    const { error } = await supabase.from('resources').insert({
       ...newResource,
       teacher_id: teacher?.id
    })
    if (error) { toast.error(error.message) }
    else {
       toast.success('Resource added to library!')
       setAddOpen(false)
       loadData()
    }
  }

  const deleteResource = async (id: string) => {
    const { error } = await supabase.from('resources').delete().eq('id', id)
    if (error) { toast.error('Check your permissions') }
    else { toast.success('Removed'); loadData() }
  }

  const filtered = resources.filter(r => {
     const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.subject?.name.toLowerCase().includes(search.toLowerCase())
     const matchesType = filterType === 'all' || r.type === filterType
     return matchesSearch && matchesType
  })

  const getIcon = (type: string) => {
     if (type === 'pdf' || type === 'document') return <FileText size={20} className="text-rose-500" />
     if (type === 'video') return <Video size={20} className="text-blue-500" />
     if (type === 'image') return <Image size={20} className="text-emerald-500" />
     return <Globe size={20} className="text-amber-500" />
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Resource Library</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Share learning materials with your students</p>
         </div>
         <Button onClick={() => setAddOpen(true)}><Plus size={16} className="mr-2" /> Add Resource</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Total Resources" value={resources.length} icon={<Library size={20} />} />
         <StatCard title="Public Items" value={resources.filter(r => r.is_public).length} icon={<Globe size={20} />} />
         <StatCard title="Private Items" value={resources.filter(r => !r.is_public).length} icon={<Lock size={20} />} />
         <StatCard title="Downloads" value="1.2k" icon={<Download size={20} />} />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
         <Input placeholder="Search resources..." leftIcon={<Search size={16} />} value={search} onChange={e => setSearch(e.target.value)} />
         <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full md:w-48">
            <option value="all">All Types</option>
            <option value="pdf">PDF Documents</option>
            <option value="video">Videos</option>
            <option value="image">Images</option>
            <option value="link">External Links</option>
         </Select>
      </div>

      {loading ? <SkeletonList count={8} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {filtered.map((r, i) => (
             <motion.div key={r.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                <Card className="p-4 h-full flex flex-col group border-2 border-transparent hover:border-primary/20 transition-all">
                   <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-[var(--input)]">
                         {getIcon(r.type)}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => deleteResource(r.id)} className="p-1.5 rounded-lg text-danger hover:bg-danger-light"><Trash2 size={14} /></button>
                         <a href={r.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-muted hover:bg-input"><ExternalLink size={14} /></a>
                      </div>
                   </div>

                   <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: 'var(--text)' }}>{r.title}</h3>
                   <div className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>{r.subject?.name}</div>

                   <div className="mt-auto pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                      <Badge variant={r.is_public ? 'success' : 'muted'} className="text-[9px]">
                         {r.is_public ? 'Shared' : 'Private'}
                      </Badge>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(r.created_at, 'short')}</span>
                   </div>
                </Card>
             </motion.div>
           ))}
           {filtered.length === 0 && <div className="col-span-full py-20 text-center text-sm" style={{ color: 'var(--text-muted)' }}>The library is empty. Upload your first resource!</div>}
        </div>
      )}

      {/* Add Resource Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Educational Resource" size="md">
         <div className="space-y-4">
            <Input label="Title" placeholder="e.g. Physics Revision Guide" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
               <Select label="Type" value={newResource.type} onChange={e => setNewResource({...newResource, type: e.target.value as any})}>
                  <option value="pdf">PDF</option>
                  <option value="document">Word/Doc</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="link">Link</option>
               </Select>
               <Select label="Subject" value={newResource.subject_id} onChange={e => setNewResource({...newResource, subject_id: e.target.value})}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </Select>
            </div>
            <Input label="File URL" placeholder="Cloud storage link or external URL" value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} />
            <Textarea label="Short Description" placeholder="What is this about?" value={newResource.description} onChange={e => setNewResource({...newResource, description: e.target.value})} />
            
            <div className="flex items-center gap-2">
               <input type="checkbox" id="is_public" checked={newResource.is_public} onChange={e => setNewResource({...newResource, is_public: e.target.checked})} className="w-4 h-4 accent-primary" />
               <label htmlFor="is_public" className="text-xs font-bold" style={{ color: 'var(--text)' }}>Make visible to all students</label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
               <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
               <Button onClick={handleUpload}>Add Resource</Button>
            </div>
         </div>
      </Modal>
    </div>
  )
}
