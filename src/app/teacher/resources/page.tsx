'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { FileUploadZone } from '@/components/worksheet/FileUploadZone'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Resource } from '@/types/database'

export default function TeacherResources() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  
  const [resources, setResources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  const INITIAL_RESOURCE = {
    title: '',
    description: '',
    type: 'file' as 'video' | 'file' | 'note' | 'link' | 'document',
    url: '',
    attachment_url: '',
    video_url: '',
    subject_id: '',
    tuition_center_id: '' as string | null,
    chapter: 'General',
    is_practice: false,
    audience: 'class' as 'public' | 'class' | 'broadcast' | 'students',
    class_ids: [] as string[],
    student_ids: [] as string[],
    is_public: true,
  }

  const [newResource, setNewResource] = useState(INITIAL_RESOURCE)

  // All teacher data loaded once upfront
  const [allCenters, setAllCenters] = useState<any[]>([])
  const [allSubjects, setAllSubjects] = useState<any[]>([])
  const [allClasses, setAllClasses] = useState<any[]>([])
  const [rawAssignments, setRawAssignments] = useState<any[]>([]) // {tuition_center_id, subject_id, class_id}
  const [centerStudents, setCenterStudents] = useState<any[]>([])

  // UI filter selections
  const [selCenter, setSelCenter] = useState('')
  const [selClass, setSelClass] = useState('')

  // Derive visible classes by looking at what the teacher is actually assigned to teach in the selected center
  const visibleClasses = useMemo(() => {
    if (!selCenter) return allClasses
    const assignedClassIds = new Set(
      rawAssignments
        .filter(a => (a.tuition_center_id || '') === selCenter)
        .map(a => a.class_id)
    )
    return allClasses.filter(c => assignedClassIds.has(c.id))
  }, [allClasses, rawAssignments, selCenter])

  // Derive visible subjects: if a center is selected, only show subjects assigned in that center
  const visibleSubjects = useMemo(() => {
    if (!selCenter) return allSubjects
    const assignedSubjectIds = new Set(
      rawAssignments
        .filter(a => (a.tuition_center_id || '') === selCenter)
        .map(a => a.subject_id)
    )
    return allSubjects.filter(s => assignedSubjectIds.has(s.id))
  }, [allSubjects, rawAssignments, selCenter])

  useEffect(() => {
    if (teacher?.id) loadData()
  }, [teacher?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch this teacher's resources
      const { data: rData } = await supabase
        .from('resources')
        .select('*, subject:subjects(name)')
        .eq('teacher_id', teacher?.id)
        .order('created_at', { ascending: false })
      setResources(rData ?? [])

      // 2. Get all assignment rows for this teacher (source of truth for what they teach)
      const { data: aData } = await supabase
        .from('teacher_assignments')
        .select('tuition_center_id, subject_id, class_id')
        .eq('teacher_id', teacher?.id)

      const assignments = aData || []
      setRawAssignments(assignments)

      const centerIds = Array.from(new Set(assignments.map((a: any) => a.tuition_center_id).filter(Boolean)))
      const subjectIds = Array.from(new Set(assignments.map((a: any) => a.subject_id).filter(Boolean)))
      const classIds   = Array.from(new Set(assignments.map((a: any) => a.class_id).filter(Boolean)))

      // 3. Fetch the actual records for those IDs.
      //    Always use specific IDs if available so we only show what the teacher teaches.
      //    Fall back to full list only if assignments table is completely empty.
      const [cRes, sRes, clRes] = await Promise.all([
        centerIds.length > 0
          ? supabase.from('tuition_centers').select('id, name').in('id', centerIds).order('name')
          : supabase.from('tuition_centers').select('id, name').order('name').limit(50),
        subjectIds.length > 0
          ? supabase.from('subjects').select('id, name, tuition_center_id').in('id', subjectIds).order('name')
          : supabase.from('subjects').select('id, name, tuition_center_id').order('name').limit(100),
        classIds.length > 0
          ? supabase.from('classes').select('id, name, tuition_center_id').in('id', classIds).order('name')
          : supabase.from('classes').select('id, name, tuition_center_id').order('name').limit(100),
      ])

      setAllCenters(cRes.data || [])
      setAllSubjects(sRes.data || [])
      setAllClasses(clRes.data || [])
    } catch (err) {
      console.error('[Resources] loadData error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load students whenever the class filter changes
  useEffect(() => {
    if (!selClass) { setCenterStudents([]); return }
    supabase
      .from('students')
      .select('id, full_name, class:classes(name)')
      .eq('class_id', selClass)
      .limit(100)
      .then(({ data }) => setCenterStudents(data || []))
  }, [selClass])


  // Safety timeout
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), 5000)
      return () => clearTimeout(t)
    }
  }, [loading])

  const handleUpload = async () => {
    if (!newResource.title) {
       toast.error('Please enter a title')
       return
    }
    if (!newResource.url && !newResource.attachment_url && !newResource.video_url) {
       toast.error('Please upload a file or provide a URL')
       return
    }
    if (!newResource.subject_id) {
       toast.error('Please select a subject')
       return
    }
    if (newResource.audience === 'class' && !newResource.class_ids[0]) {
       toast.error('Please select a target class')
       return
    }
    if (newResource.audience === 'students' && newResource.student_ids.length === 0) {
       toast.error('Please select at least one student')
       return
    }

    // Build the final DB row — strip form-only fields, map correctly
    const payload = {
      title: newResource.title,
      description: newResource.description,
      type: newResource.type,
      url: newResource.url || newResource.attachment_url || newResource.video_url,
      attachment_url: newResource.attachment_url || null,
      video_url: newResource.video_url || null,
      subject_id: newResource.subject_id || null,
      tuition_center_id: newResource.tuition_center_id || null,
      chapter: newResource.chapter,
      is_practice: newResource.is_practice,
      audience: newResource.audience,
      // class_id: for 'class' scope only (column is now nullable)
      class_id: newResource.audience === 'class' ? (newResource.class_ids[0] || null) : null,
      // class_ids: for broadcast multi-class
      class_ids: newResource.audience === 'broadcast' ? newResource.class_ids : [],
      // student_ids: for targeted students
      student_ids: newResource.audience === 'students' ? newResource.student_ids : [],
      is_public: newResource.audience === 'public' || newResource.audience === 'broadcast',
      teacher_id: teacher?.id,
    }

    const { error } = await supabase.from('resources').insert(payload)

    if (error) { toast.error(error.message) }
    else {
       toast.success('Resource added to library!')
       setNewResource(INITIAL_RESOURCE)
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
     if (type === 'file' || type === 'pdf' || type === 'document') return <FileText size={20} className="text-rose-500" />
     if (type === 'video') return <Video size={20} className="text-blue-500" />
     if (type === 'note' || type === 'image') return <Image size={20} className="text-emerald-500" />
     return <Globe size={20} className="text-amber-500" />
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Resource Library</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Share learning materials with your students</p>
         </div>
         <Button onClick={() => { setNewResource(INITIAL_RESOURCE); setAddOpen(true) }}><Plus size={16} className="mr-2" /> Add Resource</Button>
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
            <option value="file">PDF Documents</option>
            <option value="video">Videos</option>
            <option value="note">Notes & Images</option>
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
                   <div className="flex items-center gap-2 mb-4">
                      <div className="text-[10px] opacity-60">{r.subject?.name}</div>
                      <div className="w-1 h-1 rounded-full bg-current opacity-20" />
                      <div className="text-[10px] font-bold text-primary">{r.chapter || 'General'}</div>
                   </div>

                   {r.is_practice && (
                      <Badge variant="primary" className="mb-4 w-fit py-0.5 text-[8px] tracking-wider uppercase font-black bg-primary/10 text-primary border-primary/20">
                         PRACTICE TASK
                      </Badge>
                   )}

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

      {/* Enhanced Add Resource Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Upload Educational Resource" size="lg">
         <div className="space-y-6">
             <div className="space-y-4">
                <Input label="Title" placeholder="e.g. Physics Revision Guide" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Select
                     label="Filter by Center (optional)"
                     value={selCenter}
                     onChange={e => { setSelCenter(e.target.value); setSelClass('') }}
                   >
                     <option value="">All My Centers</option>
                     {allCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </Select>
                   <Select
                     label="Subject *"
                     value={newResource.subject_id}
                     onChange={e => setNewResource({...newResource, subject_id: e.target.value})}
                   >
                     <option value="">Select Subject</option>
                     {visibleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </Select>
                </div>
             </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Sharing Scope (Audience)</label>
                <div className="flex flex-wrap gap-2">
                   {['class', 'broadcast', 'students', 'public'].map(scope => (
                      <button 
                        key={scope}
                        onClick={() => {
                           setNewResource({...newResource, audience: scope as any, class_ids: [], student_ids: []})
                           setSelCenter('')
                           setSelClass('')
                        }}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all"
                        style={{
                           background: newResource.audience === scope ? 'var(--primary)' : 'var(--input)',
                           color: newResource.audience === scope ? 'white' : 'var(--text-muted)',
                           borderColor: newResource.audience === scope ? 'var(--primary)' : 'var(--card-border)',
                        }}
                      >
                         {scope === 'class' ? 'Single Class' : scope === 'broadcast' ? 'Broadcast' : scope === 'students' ? 'Target Students' : 'Public'}
                      </button>
                   ))}
                </div>

                {newResource.audience === 'broadcast' && (
                   <div className="space-y-4">
                      <div className="flex gap-2">
                         <button 
                           onClick={() => setNewResource({...newResource, tuition_center_id: null, is_public: true})}
                           className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${!newResource.tuition_center_id ? 'bg-primary text-white' : 'bg-input text-muted border border-card-border'}`}
                         >
                            All Centers
                         </button>
                         <button 
                           onClick={() => setNewResource({...newResource, tuition_center_id: allCenters[0]?.id || '', is_public: false})}
                           className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${newResource.tuition_center_id ? 'bg-primary text-white' : 'bg-input text-muted border border-card-border'}`}
                         >
                            Specific Center
                         </button>
                      </div>

                      {newResource.tuition_center_id !== null && (
                         <Select 
                           label="Main Center" 
                           value={newResource.tuition_center_id || ''} 
                           onChange={e => setNewResource({...newResource, tuition_center_id: e.target.value})}
                         >
                            <option value="">Select Center</option>
                            {allCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </Select>
                      )}

                      <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Select Target Classes</label>
                            <div className="text-[9px] font-black text-primary uppercase">{newResource.class_ids.length} classes selected</div>
                         </div>
                         
                         {/* Quick Select by Class Name */}
                         <div className="flex flex-wrap gap-2 mb-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                            <div className="text-[9px] font-bold w-full mb-1 opacity-50 uppercase tracking-widest">Select All Instances Of:</div>
                            {Array.from(new Set(allClasses.map(c => c.name))).map(name => (
                               <button 
                                 key={name}
                                 onClick={() => {
                                    const idsWithName = allClasses.filter(c => c.name === name).map(c => c.id)
                                    const alreadySelected = idsWithName.every(id => newResource.class_ids.includes(id))
                                    const next = alreadySelected 
                                       ? newResource.class_ids.filter(id => !idsWithName.includes(id))
                                       : Array.from(new Set([...newResource.class_ids, ...idsWithName]))
                                    setNewResource({...newResource, class_ids: next})
                                 }}
                                 className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${allClasses.filter(c => c.name === name).every(c => newResource.class_ids.includes(c.id)) ? 'bg-primary text-white' : 'bg-white text-muted border border-card-border'}`}
                               >
                                  {name}
                               </button>
                            ))}
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 no-scrollbar">
                            {allClasses.map(c => (
                               <label 
                                 key={c.id} 
                                 className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${newResource.class_ids.includes(c.id) ? 'bg-primary/10 border-primary' : 'bg-input border-card-border'}`}
                               >
                                  <input 
                                    type="checkbox"
                                    checked={newResource.class_ids.includes(c.id)}
                                    onChange={e => {
                                       const next = e.target.checked 
                                          ? [...newResource.class_ids, c.id]
                                          : newResource.class_ids.filter(id => id !== c.id)
                                       setNewResource({...newResource, class_ids: next})
                                    }}
                                    className="accent-primary"
                                  />
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-black">{c.name}</span>
                                     <span className="text-[8px] opacity-60">{(allCenters.find(ct => ct.id === c.tuition_center_id)?.name) || 'Unknown Center'}</span>
                                  </div>
                               </label>
                            ))}
                         </div>
                      </div>
                   </div>
                )}

                {newResource.audience === 'class' && (
                   <div className="space-y-2">
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Classes are filtered by the center selected above.
                      </p>
                      <Select label="Target Class *" value={newResource.class_ids[0] || ''} onChange={e => setNewResource({...newResource, class_ids: [e.target.value]})}>
                         <option value="">Select Class</option>
                         {visibleClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                   </div>
                )}

                {newResource.audience === 'students' && (
                   <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <Select label="Filter by Center" value={selCenter} onChange={e => { setSelCenter(e.target.value); setSelClass('') }}>
                            <option value="">All Centers</option>
                            {allCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </Select>
                         <Select label="Filter by Class" value={selClass} onChange={e => setSelClass(e.target.value)}>
                            <option value="">Select a Class</option>
                            {visibleClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </Select>
                      </div>

                      <div className="space-y-2">
                         <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Select Students</label>
                            <div className="text-[10px] font-black text-primary">{newResource.student_ids.length} selected</div>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-40 overflow-y-auto p-3 rounded-xl border no-scrollbar" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                            {centerStudents.map(s => (
                               <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all hover:bg-primary/5" style={{ borderColor: 'var(--card-border)' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={newResource.student_ids.includes(s.id)}
                                    onChange={e => {
                                       const next = e.target.checked 
                                          ? [...newResource.student_ids, s.id]
                                          : newResource.student_ids.filter(id => id !== s.id)
                                       setNewResource({...newResource, student_ids: next})
                                    }}
                                  />
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-black" style={{ color: 'var(--text)' }}>{s.full_name}</span>
                                     <span className="text-[8px] opacity-60" style={{ color: 'var(--text-muted)' }}>{(s.class as any)?.name}</span>
                                  </div>
                               </label>
                            ))}
                            {centerStudents.length === 0 && (
                               <div className="col-span-full py-10 text-center text-[10px] opacity-40">Select a class to see students</div>
                            )}
                         </div>
                      </div>
                   </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Select label="Type" value={newResource.type} onChange={e => setNewResource({...newResource, type: e.target.value as any})}>
                  <option value="file">PDF / Document</option>
                  <option value="video">Video</option>
                  <option value="note">Image / Note</option>
                  <option value="link">URL / Link</option>
               </Select>
               <Input label="Topic / Chapter" placeholder="e.g. Algebra" value={newResource.chapter} onChange={e => setNewResource({...newResource, chapter: e.target.value})} />
            </div>

            {newResource.type === 'video' ? (
               <div className="space-y-4 p-4 rounded-2xl border" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: 'var(--primary)' }}>Video Source</span>
                     <div className="flex gap-2">
                        <button 
                          onClick={() => setNewResource({...newResource, url: '', video_url: ''})} 
                          className="text-[8px] px-2 py-1 rounded-md font-bold uppercase transition-all"
                          style={{
                             background: !newResource.video_url ? 'var(--primary)' : 'transparent',
                             color: !newResource.video_url ? 'white' : 'var(--text-muted)',
                             border: !newResource.video_url ? 'none' : '1px solid var(--card-border)',
                          }}
                        >
                           Upload
                        </button>
                        <button 
                          onClick={() => setNewResource({...newResource, attachment_url: ''})} 
                          className="text-[8px] px-2 py-1 rounded-md font-bold uppercase transition-all"
                          style={{
                             background: (newResource.video_url || newResource.url.includes('youtube')) ? 'var(--primary)' : 'transparent',
                             color: (newResource.video_url || newResource.url.includes('youtube')) ? 'white' : 'var(--text-muted)',
                             border: (newResource.video_url || newResource.url.includes('youtube')) ? 'none' : '1px solid var(--card-border)',
                          }}
                        >
                           Link
                        </button>
                     </div>
                  </div>
                  {(newResource.video_url || newResource.url.includes('youtube')) ? (
                     <Input placeholder="YouTube, Vimeo, or MP4 URL" value={newResource.video_url} onChange={e => setNewResource({...newResource, video_url: e.target.value, url: e.target.value})} />
                  ) : (
                     <FileUploadZone 
                       bucket="resource-uploads"
                       value={newResource.attachment_url} 
                       onChange={url => setNewResource({...newResource, attachment_url: url || '', url: url || ''})} 
                       accept={{ 'video/*': ['.mp4', '.mov', '.webm'] }}
                     />
                  )}
               </div>
            ) : newResource.type === 'link' ? (
               <Input label="URL Link" placeholder="https://..." value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} />
            ) : (
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Upload Document</label>
                  <FileUploadZone 
                    bucket="resource-uploads"
                    value={newResource.attachment_url} 
                    onChange={url => setNewResource({...newResource, attachment_url: url || '', url: url || ''})} 
                  />
               </div>
            )}

            <Textarea label="Short Description" placeholder="What is this about?" value={newResource.description} onChange={e => setNewResource({...newResource, description: e.target.value})} />

            <div className="flex gap-3 justify-end pt-4">
               <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
               <Button onClick={handleUpload}>Create Resource</Button>
            </div>
         </div>
      </Modal>
    </div>
  )
}
