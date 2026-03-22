'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Library, BookOpen, FileText, Video, 
  Link as LinkIcon, Download, Search, 
  Filter, GraduationCap, School, Book,
  ChevronRight, ArrowRight
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SkeletonDashboard } from '@/components/ui/Skeleton'

function ResourcesContent() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  const searchParams = useSearchParams()
  const initialSubject = searchParams.get('subjectId')
  
  const [loading, setLoading] = useState(true)
  const [resources, setResources] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject || 'all')

  useEffect(() => {
    if (initialSubject) setSelectedSubject(initialSubject)
  }, [initialSubject])

  useEffect(() => {
    if (student) {
      loadInitialData()
    }
  }, [student])

  const loadInitialData = async () => {
    if (!student) return
    setLoading(true)
    try {
      // 1. Fetch Student's Subjects
      const { data: sData } = await supabase
        .from('student_subjects')
        .select('subject:subjects(*)')
        .eq('student_id', student.id)
      
      const uniqueSubjects = Array.from(new Set((sData || []).map(s => s.subject))).filter(Boolean)
      setSubjects(uniqueSubjects)

      // 2. Fetch Resources
      const { data: rData } = await supabase
        .from('resources')
        .select('*, subject:subjects(name)')
        .eq('class_id', student.class_id)
      
      setResources(rData || [])
    } catch (err) {
      console.error('Error loading resources:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = selectedSubject === 'all' || r.subject_id === selectedSubject
    return matchesSearch && matchesSubject
  })

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto">
      {/* Search & Filter Header */}
      <div className="space-y-8">
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
               <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
                  <Library className="text-primary" size={40} /> Resource Bank
               </h1>
               <p className="text-slate-500 font-medium tracking-tight">Access your library of worksheets, notes, and videos.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    placeholder="Search resources..." 
                    className="pl-12 py-6 rounded-2xl bg-white border-none shadow-xl shadow-slate-200/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               <Button variant="secondary" className="p-4 h-auto rounded-2xl bg-white shadow-xl shadow-slate-200/50"><Filter size={20} /></Button>
            </div>
         </div>

         {/* Subject Pills */}
         <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
            <button 
               onClick={() => setSelectedSubject('all')}
               className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedSubject === 'all' ? 'bg-primary text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
            >
               All Subjects
            </button>
            {subjects.map(s => (
               <button 
                  key={s.id}
                  onClick={() => setSelectedSubject(s.id)}
                  className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedSubject === s.id ? 'bg-primary text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
               >
                  {s.name}
               </button>
            ))}
         </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredResources.length === 0 && (
            <div className="col-span-full py-32 text-center space-y-4">
               <Book className="mx-auto text-slate-200" size={64} />
               <p className="text-slate-400 font-bold">No resources found for your filters.</p>
            </div>
         )}
         
         {filteredResources.map((res, i) => (
            <motion.div 
               key={res.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
            >
               <Card className="p-6 h-full rounded-[2.5rem] border-none bg-white shadow-xl hover:shadow-2xl transition-all group flex flex-col justify-between">
                  <div className="space-y-5">
                     <div className="flex items-start justify-between">
                        <div className={`p-4 rounded-3xl ${res.type === 'video' ? 'bg-rose-50 text-rose-500' : res.type === 'link' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                           {res.type === 'video' ? <Video size={24} /> : res.type === 'link' ? <LinkIcon size={24} /> : <FileText size={24} />}
                        </div>
                        <Badge variant="muted" className="bg-slate-50 text-slate-400 border-none rounded-xl text-[8px] font-black uppercase tracking-widest">{res.subject?.name}</Badge>
                     </div>
                     
                     <div className="space-y-2">
                        <h3 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tighter group-hover:text-primary transition-colors">{res.title}</h3>
                        <p className="text-slate-500 text-xs font-medium line-clamp-3 leading-relaxed">{res.description || 'No description available for this resource.'}</p>
                     </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-50 flex items-center justify-between">
                     <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Added {new Date(res.created_at).toLocaleDateString()}</div>
                     <button 
                        onClick={() => res.url && window.open(res.url, '_blank')}
                        className="inline-flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest hover:translate-x-1 transition-transform"
                     >
                        {res.type === 'file' ? 'Download' : 'Open Resource'} <ArrowRight size={14} />
                     </button>
                  </div>
               </Card>
            </motion.div>
         ))}
      </div>
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
