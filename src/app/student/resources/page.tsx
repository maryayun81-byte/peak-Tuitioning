'use client'

import { useState, Suspense, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Library, BookOpen, FileText, Video, 
  Link as LinkIcon, Download, Search, 
  Filter, GraduationCap, School, Book,
  ChevronRight, ArrowRight, X, PlayCircle,
  ExternalLink, Sparkles, Layers,
  CheckCircle2, Clock
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

type ResourceType = 'all' | 'note' | 'video' | 'link' | 'practice'

function ResourcesContent() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const searchParams = useSearchParams()
  const initialSubject = searchParams.get('subjectId')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject || 'all')
  const [activeType, setActiveType] = useState<ResourceType>('all')
  const [activeVideo, setActiveVideo] = useState<any>(null)

  const fetchResources = async () => {
    if (!student) return { resources: [], subjects: [] }
    const [sRes, rRes] = await Promise.all([
      supabase.from('student_subjects').select('subject:subjects(*)').eq('student_id', student.id),
      supabase.from('resources')
        .select('*, subject:subjects(name), teacher:teachers(full_name)')
        .or(`class_id.eq.${student.class_id},class_ids.cs.{${student.class_id}},student_ids.cs.{${student.id}},audience.in.("public","broadcast")`)
        .order('created_at', { ascending: false })
    ])
    const subjects = Array.from(new Set((sRes.data || []).map((s: any) => s.subject))).filter(Boolean)
    return { resources: rRes.data || [], subjects }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['student-resources', student?.id, student?.class_id],
    queryFn: fetchResources,
    enabled: !!student?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const resources = data?.resources ?? []
  const subjects = data?.subjects ?? []
  const loading = isLoading && !data

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = 
        r.title.toLowerCase().includes(q) || 
        r.description?.toLowerCase().includes(q) ||
        r.chapter?.toLowerCase().includes(q) ||
        r.subject?.name?.toLowerCase().includes(q)
      
      const matchesSubject = selectedSubject === 'all' || r.subject_id === selectedSubject
      
      const matchesType = activeType === 'all' || 
        (activeType === 'note' && (r.type === 'pdf' || r.type === 'document' || r.type === 'file' || r.type === 'note')) ||
        (activeType === 'video' && r.type === 'video') ||
        (activeType === 'link' && r.type === 'link') ||
        (activeType === 'practice' && r.is_practice)

      return matchesSearch && matchesSubject && matchesType
    })
  }, [resources, searchQuery, selectedSubject, activeType])

  const getVideoEmbed = (url: string) => {
    if (!url) return null
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
      const match = url.match(regExp)
      const id = (match && match[2].length === 11) ? match[2] : null
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    return url // Direct MP4/Others
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="min-h-screen pb-32 transition-theme">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32 px-6">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent blur-[120px] rounded-full" />
         </div>

         <div className="max-w-7xl mx-auto relative z-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
               <div className="space-y-4 max-w-2xl">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                     <Badge variant="primary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20 backdrop-blur-md">
                        <Sparkles size={12} className="mr-2" /> Educational Library
                     </Badge>
                  </motion.div>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]" style={{ color: 'var(--text)' }}>
                     Resource Bank
                  </h1>
                  <p className="text-lg md:text-xl font-medium tracking-tight opacity-60 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                     Curated collections of study guides, video lessons, and interactive practice materials for your specific curriculum.
                  </p>
               </div>

               <div className="flex flex-col gap-4 w-full md:w-96">
                  <div className="relative group">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-50 group-focus-within:opacity-100 transition-opacity" size={20} />
                     <Input 
                        placeholder="Search by topic, subject, or title..." 
                        className="pl-14 py-8 rounded-[2rem] bg-[var(--card)] border-2 border-[var(--card-border)] shadow-2xl focus:border-primary transition-all text-sm font-bold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                     <button 
                        onClick={() => setSelectedSubject('all')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${selectedSubject === 'all' ? 'bg-primary text-white border-primary shadow-lg' : 'bg-[var(--card)] text-muted border-[var(--card-border)] hover:border-primary/30'}`}
                     >
                        All
                     </button>
                     {subjects.map(s => (
                        <button 
                           key={s.id}
                           onClick={() => setSelectedSubject(s.id)}
                           className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${selectedSubject === s.id ? 'bg-primary text-white border-primary shadow-lg' : 'bg-[var(--card)] text-muted border-[var(--card-border)] hover:border-primary/30'}`}
                        >
                           {s.name}
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            {/* Type Filter Tabs */}
            <div className="flex items-center gap-3 border-b border-[var(--card-border)] pb-0">
               {[
                  { id: 'all', label: 'All Resources', icon: <Layers size={14} /> },
                  { id: 'note', label: 'Notes & Docs', icon: <FileText size={14} /> },
                  { id: 'video', label: 'Video Lessons', icon: <Video size={14} /> },
                  { id: 'practice', label: 'Practice Tasks', icon: <Sparkles size={14} /> },
                  { id: 'link', label: 'External Links', icon: <LinkIcon size={14} /> }
               ].map(t => (
                  <button 
                     key={t.id}
                     onClick={() => setActiveType(t.id as any)}
                     className={`px-6 py-4 text-xs font-black uppercase tracking-widest relative flex items-center gap-2 transition-all ${activeType === t.id ? 'text-primary' : 'text-muted hover:text-[var(--text)]'}`}
                  >
                     {t.icon} {t.label}
                     {activeType === t.id && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(79,140,255,0.4)]" />}
                  </button>
               ))}
            </div>
         </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
               {filteredResources.map((res, i) => (
                  <motion.div 
                     layout
                     key={res.id}
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                     <Card className="glass-card-elite p-0 h-full overflow-hidden flex flex-col group cursor-pointer" onClick={() => {
                        if (res.type === 'video') setActiveVideo(res)
                        else if (res.url) window.open(res.url, '_blank')
                     }}>
                        {/* Card Header/Icon */}
                        <div className="relative h-40 bg-[var(--input)] flex items-center justify-center border-b border-[var(--card-border)] overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50 group-hover:scale-110 transition-transform duration-700" />
                           {res.type === 'video' ? (
                              <Video size={48} className="text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
                           ) : res.type === 'link' ? (
                              <LinkIcon size={48} className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]" />
                           ) : (
                              <FileText size={48} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                           )}
                           
                           {/* Hover Overlay */}
                           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white text-primary p-4 rounded-full shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                                 {res.type === 'video' ? <PlayCircle size={32} /> : <ArrowRight size={32} />}
                              </div>
                           </div>

                           <div className="absolute top-4 left-4">
                              <Badge variant="muted" className="bg-black/20 backdrop-blur-md border-none text-[8px] tracking-widest uppercase font-black px-3 py-1">
                                 {res.subject?.name}
                              </Badge>
                           </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex flex-col flex-1 gap-4">
                           <div className="space-y-1">
                              <div className="flex justify-between items-start gap-2">
                                 <h3 className="text-lg font-black leading-tight uppercase tracking-tighter line-clamp-2" style={{ color: 'var(--text)' }}>
                                    {res.title}
                                 </h3>
                                 {res.is_practice && <Sparkles size={16} className="text-primary animate-pulse shrink-0" />}
                              </div>
                              <div className="text-[10px] font-black text-primary uppercase tracking-wider">{res.chapter || 'Foundations'}</div>
                           </div>

                           <p className="text-xs font-medium opacity-50 line-clamp-3 leading-relaxed mb-auto" style={{ color: 'var(--text-muted)' }}>
                              {res.description || 'Access comprehensive notes and research materials specifically curated for this topic.'}
                           </p>

                           <div className="pt-4 mt-auto border-t border-[var(--card-border)] flex items-center justify-between">
                              <div className="flex flex-col gap-0.5">
                                 <div className="text-[8px] font-black text-muted uppercase tracking-widest flex items-center gap-1">
                                    <GraduationCap size={10} /> {res.teacher?.full_name || 'Staff Member'}
                                 </div>
                                 <div className="text-[8px] font-bold opacity-40 uppercase tracking-tighter flex items-center gap-1">
                                    <Clock size={10} /> {formatDate(res.created_at, 'relative')}
                                 </div>
                              </div>
                              <button className="text-primary font-black text-[10px] uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-1.5">
                                 Open <ArrowRight size={14} />
                              </button>
                           </div>
                        </div>
                     </Card>
                  </motion.div>
               ))}
            </AnimatePresence>
            
            {filteredResources.length === 0 && (
               <div className="col-span-full py-40 text-center space-y-6">
                  <div className="w-24 h-24 bg-[var(--card)] rounded-full flex items-center justify-center mx-auto border-2 border-[var(--card-border)] animate-float-slow">
                     <Book size={40} className="text-muted" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Quiet in the library</h3>
                     <p className="text-sm font-medium opacity-50" style={{ color: 'var(--text-muted)' }}>No resources found for your current search or filters.</p>
                     <Button variant="ghost" className="mt-4" onClick={() => { setSearchQuery(''); setActiveType('all'); setSelectedSubject('all'); }}>Clear All Filters</Button>
                  </div>
               </div>
            )}
         </div>
      </div>

      {/* Video Modal */}
      <Modal isOpen={!!activeVideo} onClose={() => setActiveVideo(null)} size="xl" title={activeVideo?.title || 'Video Lesson'}>
         <div className="space-y-6 pt-4">
            <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-[var(--card-border)]">
               {activeVideo && (
                  getVideoEmbed(activeVideo.video_url || activeVideo.url) ? (
                     <iframe 
                        src={getVideoEmbed(activeVideo.video_url || activeVideo.url) || ''} 
                        className="w-full h-full" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                     />
                  ) : (
                     <video src={activeVideo.attachment_url || activeVideo.url} controls className="w-full h-full" />
                  )
               )}
            </div>
            <div className="space-y-2">
               <div className="flex items-center gap-3">
                  <Badge variant="primary" className="uppercase font-black text-[10px] tracking-widest">{activeVideo?.subject?.name}</Badge>
                  <span className="text-[10px] font-black text-muted uppercase tracking-widest">• {activeVideo?.chapter}</span>
               </div>
               <p className="text-sm font-medium opacity-70 leading-relaxed" style={{ color: 'var(--text)' }}>{activeVideo?.description}</p>
            </div>
            <div className="flex gap-4 pt-4">
               <Button className="flex-1" onClick={() => setActiveVideo(null)}>Close Player</Button>
               {activeVideo?.attachment_url && (
                  <a href={activeVideo.attachment_url} download className="flex-1">
                     <Button variant="secondary" className="w-full"><Download size={18} className="mr-2" /> Download Video</Button>
                  </a>
               )}
            </div>
         </div>
      </Modal>
    </div>
  )
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={<SkeletonDashboard />}>
      <ResourcesContent />
    </Suspense>
  )
}
