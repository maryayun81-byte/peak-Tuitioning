'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, BookOpen, Edit3, CheckCircle, 
  Sparkles, Award, ShieldCheck, ArrowRight,
  Maximize2, Share2, Info, Rocket, ExternalLink
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useRouter, useParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { finishBookAction, updateReadingProgress } from '@/app/actions/library'
import { useDebounce } from '../../../../hooks/useDebounce'
import toast from 'react-hot-toast'

export default function LibraryReader() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { student, profile } = useAuthStore()
  
  const [book, setBook] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [currentPage, setCurrentPage] = useState(1)
  const [currentPercent, setCurrentPercent] = useState(0)
  const [reflection, setReflection] = useState('')
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishResult, setFinishResult] = useState<any>(null)
  const debouncedPage = useDebounce(currentPage, 3000)
  const debouncedPercent = useDebounce(currentPercent, 3000)

  useEffect(() => {
    if (id) loadBookData()
  }, [id])

  const loadBookData = async () => {
    setLoading(true)
    const [bRes, pRes] = await Promise.all([
      supabase.from('library_books').select('*').eq('id', id).single(),
      supabase.from('library_student_progress').select('*').eq('book_id', id).eq('student_id', student?.id).single()
    ])

    if (bRes.data) setBook(bRes.data)
    
    // If no progress exists, create it
    if (!pRes.data && student?.id) {
      const { data: newP } = await supabase.from('library_student_progress').insert({
        student_id: student.id,
        book_id: bRes.data.id,
        status: 'reading'
      }).select().single()
      setProgress(newP)
    } else {
      setProgress(pRes.data)
      setReflection(pRes.data?.reflection_text || '')
      setCurrentPage(pRes.data?.last_page || 1)
      setCurrentPercent(pRes.data?.last_position_percent || 0)
    }
    setLoading(false)
  }

  // Progress Sync Effect
  useEffect(() => {
    if (student?.id && book?.id && !progress?.is_finished) {
      updateReadingProgress(student.id, String(id), debouncedPage, debouncedPercent)
    }
  }, [debouncedPage, debouncedPercent, student?.id, book?.id, id, progress?.is_finished])

  const saveReflection = async (text: string) => {
    setReflection(text)
    // Debounced or simple save on blur/change
    await supabase.from('library_student_progress')
      .update({ reflection_text: text })
      .eq('book_id', id)
      .eq('student_id', student?.id)
  }

  const handleFinish = async () => {
    if (!student?.id) return
    setIsFinishing(true)
    try {
      const res = await finishBookAction(student.id, String(id), reflection)
      if (res.success) {
        setFinishResult(res)
      } else {
        toast.error(res.error || 'Failed to finish book')
      }
    } catch (e) {
      toast.error('Something went wrong')
    } finally {
      setIsFinishing(false)
    }
  }

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-black/5">
       <div className="animate-spin text-primary"><BookOpen size={40} /></div>
    </div>
  )

  if (!book) return <div className="p-20 text-center">Book not found.</div>

  return (
    <div className="h-screen w-full bg-[#FCFCFC] flex flex-col overflow-hidden">
      {/* Reader Header */}
      <header className="h-16 px-6 border-b flex items-center justify-between bg-white z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/student/library')} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="h-8 w-[1px] bg-black/10 mx-2" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight line-clamp-1">{book.title}</h1>
            <p className="text-[10px] font-bold text-primary">{book.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Badge variant="secondary" className="text-[9px] uppercase font-black">{book.category}</Badge>
           <Button size="sm" onClick={handleFinish} disabled={progress?.is_finished} className="gap-2">
              {progress?.is_finished ? <CheckCircle size={14} /> : <Award size={14} />}
              {progress?.is_finished ? 'Finished' : 'Finish & Reflect'}
           </Button>
        </div>
      </header>

      {/* Reader Body */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Actual Reader Component */}
        <div className="flex-1 bg-neutral-100 flex flex-col relative overflow-hidden">
          {book.pdf_url ? (
            <iframe 
               src={`${book.pdf_url}#toolbar=0`} 
               className="w-full h-full border-none"
               title="Book Reader"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-center bg-white/50 backdrop-blur-3xl">
               <div className="max-w-md space-y-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
                     <Rocket size={32} />
                  </div>
                  <h2 className="text-2xl font-black uppercase">External Growth Link</h2>
                  <p className="text-sm opacity-60 font-medium leading-relaxed">
                     This growth resource is hosted on an external platform. Please read it and come back here to write your reflection and claim your XP.
                  </p>
                  <a 
                    href={`https://books.google.com/books?id=${book.external_id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 cursor-pointer text-white shadow-lg hover:shadow-xl w-full px-4 py-2.5 text-sm"
                    style={{ background: 'var(--primary)' }}
                  >
                    Read on Google Books <ExternalLink size={14} className="ml-2" />
                  </a>
               </div>
            </div>
          )}
          
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 flex flex-col items-center gap-3">
             <Card className="w-full p-4 bg-white/80 backdrop-blur-xl border-white shadow-2xl rounded-3xl flex items-center justify-between gap-6">
                <div className="flex items-center gap-3 shrink-0">
                   <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <BookOpen size={18} />
                   </div>
                   <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted">Reading Status</div>
                      <div className="text-sm font-black text-primary">Page {currentPage}</div>
                   </div>
                </div>

                <div className="flex-1 space-y-2">
                   <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-40">
                      <span>Start</span>
                      <span>{currentPercent.toFixed(0)}% Read</span>
                      <span>Finish</span>
                   </div>
                   <input 
                      type="range"
                      min="0"
                      max="100"
                      value={currentPercent}
                      onChange={(e) => setCurrentPercent(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-black/5 rounded-full appearance-none cursor-pointer accent-primary"
                   />
                </div>

                <div className="flex items-center gap-2">
                   <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 w-8 p-0 rounded-xl"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   >
                     -
                   </Button>
                   <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 w-8 p-0 rounded-xl font-bold"
                      onClick={() => setCurrentPage(p => p + 1)}
                   >
                     +
                   </Button>
                </div>
             </Card>
             <p className="text-[10px] font-bold uppercase tracking-widest text-muted opacity-40">System remembers your position automatically.</p>
          </div>
        </div>

        {/* Growth Journal Sidebar */}
        <aside className="w-96 border-l bg-white flex flex-col shadow-2xl relative z-10">
           <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Edit3 size={16} className="text-primary" />
                 <h2 className="text-xs font-black uppercase tracking-widest text-muted">Growth Journal</h2>
              </div>
              <Badge variant="success" className="text-[8px] animate-pulse">Auto-saving</Badge>
           </div>
           
           <div className="flex-1 overflow-y-auto p-0 flex flex-col no-scrollbar">
              <div className="p-6 bg-primary/5 border-b space-y-3">
                 <div className="flex items-center gap-2 text-primary">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Why read this?</span>
                 </div>
                 <p className="text-xs font-medium leading-relaxed italic text-primary/80">
                   "{book.relevance}"
                 </p>
              </div>

              <div className="p-6 space-y-4 flex-1">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Journal Thoughts & Reflections</label>
                    <p className="text-[9px] opacity-40 font-bold uppercase">Write what you've learned to unlock Bonus XP.</p>
                 </div>
                 <textarea 
                    className="w-full h-full min-h-[400px] border-none outline-none text-sm font-medium leading-relaxed bg-transparent resize-none no-scrollbar"
                    placeholder="Today I realized that..."
                    value={reflection}
                    onChange={(e) => saveReflection(e.target.value)}
                    disabled={progress?.is_finished}
                 />
              </div>

              {progress?.is_finished && progress?.ai_feedback && (
                 <div className="p-6 bg-emerald-50 border-t border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                       <Sparkles size={14} />
                       <span className="text-[10px] font-black uppercase tracking-widest">AI Growth Feedback</span>
                    </div>
                    <p className="text-xs font-medium text-emerald-800 leading-relaxed">
                       {progress.ai_feedback}
                    </p>
                    {progress.bonus_xp_awarded > 0 && (
                       <Badge className="mt-4 bg-emerald-200 text-emerald-900 border-none">
                         +{progress.bonus_xp_awarded} BONUS XP AWARDED! 🏆
                       </Badge>
                    )}
                 </div>
              )}
           </div>
        </aside>
      </main>

      {/* Completion Modal */}
      <Modal isOpen={!!finishResult} onClose={() => router.push('/student/library')} title="LEVEL UP ACHIEVED! 🚀" size="md">
         <div className="text-center space-y-6 pt-6 pb-2">
            <motion.div 
               initial={{ scale: 0 }} animate={{ scale: 1 }}
               className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto text-white text-3xl shadow-xl shadow-emerald-500/20"
            >
               <Award />
            </motion.div>
            
            <div className="space-y-2">
               <h2 className="text-2xl font-black uppercase">Great Work, {profile?.full_name?.split(' ')[0]}!</h2>
               <p className="text-sm font-medium opacity-60">You've successfully completed your reading session.</p>
            </div>

            <div className="p-6 bg-black/5 rounded-2xl border border-black/5 space-y-4">
               <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                  <span>Base Reward</span>
                  <span className="text-primary">+200 XP</span>
               </div>
               <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2">AI Bonus {finishResult?.bonusXP > 0 ? '✨' : ''}</span>
                  <span className={finishResult?.bonusXP > 0 ? 'text-emerald-500' : 'text-muted'}>
                    +{finishResult?.bonusXP || 0} XP
                  </span>
               </div>
               <div className="h-[1px] bg-black/10" />
               <div className="flex justify-between items-center font-black uppercase tracking-tighter text-xl">
                  <span>Total Earned</span>
                  <span className="text-emerald-500">{finishResult?.totalAward} XP</span>
               </div>
            </div>

            <div className="space-y-4">
               <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-left">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">AI Growth Insight</p>
                  <p className="text-xs font-medium text-emerald-800 leading-relaxed italic">"{finishResult?.feedback}"</p>
               </div>
               <Button className="w-full py-6 text-lg" onClick={() => router.push('/student/library')}>Back to Library <ArrowRight className="ml-2" /></Button>
            </div>
         </div>
      </Modal>

      {/* Finishing Loader */}
      {isFinishing && (
         <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center space-y-6">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
               <Sparkles size={48} className="text-primary" />
            </motion.div>
            <div className="text-center space-y-2">
               <h3 className="font-black uppercase tracking-tighter text-xl">AI analyzing your reflection...</h3>
               <p className="text-sm font-medium opacity-50">Calculating your growth rewards</p>
            </div>
         </div>
      )}
    </div>
  )
}
