'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Users, Search, ShieldCheck, 
  ChevronRight, ArrowLeft, GraduationCap,
  Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function LinkStudent() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { profile } = useAuthStore()
  
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [parentPin, setParentPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [matchingStudents, setMatchingStudents] = useState<any[]>([])
  const [step, setStep] = useState(1)
  const [isSuccess, setIsSuccess] = useState(false)

  const findStudents = async () => {
    if (!admissionNumber) return
    setLoading(true)
    const ads = admissionNumber.split(',').map(s => s.trim()).filter(Boolean)
    
    // 0. Fetch target students
    const { data: students, error: sError } = await supabase
      .from('students')
      .select('*, class:classes(name)')
      .in('admission_number', ads)
    
    if (sError || !students || students.length === 0) {
       setLoading(false)
       toast.error('No students found with these admission numbers.')
       return
    }

    // 1. Fetch parent internal ID (NOT user_id)
    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', profile?.id)
      .single()
    
    if (!parent) {
       setLoading(false)
       toast.error('Parent profile not found.')
       return
    }

    // 2. Fetch existing links using internal ID
    const { data: links } = await supabase
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', parent.id)
      .in('student_id', students.map(s => s.id))
    
    const linkedIds = new Set(links?.map(l => l.student_id) || [])
    const processed = students.map(s => ({
       ...s,
       isAlreadyLinked: linkedIds.has(s.id)
    }))

    setMatchingStudents(processed)
    setLoading(false)
    setStep(2)
  }

  const confirmLink = async () => {
    setLoading(true)
    
    // Verify PIN against DB
    const { data: parentData, error: pError } = await supabase
      .from('parents')
      .select('id, security_pin')
      .eq('user_id', profile?.id)
      .single()
    
    if (pError || !parentData?.id || !parentData?.security_pin) {
       toast.error('PIN verification failed. Ensure you have a valid PIN from your notifications.')
       setLoading(false)
       return
    }

    if (parentPin !== parentData.security_pin) { 
       toast.error('Incorrect security PIN. Please check your notifications.')
       setLoading(false)
       return
    }
    
    // 1. Link in students table (for legacy/simple portal queries)
    const { error: sError } = await supabase
      .from('students')
      .update({ parent_id: parentData.id })
      .in('id', matchingStudents.map(s => s.id))
    
    if (sError) {
       console.error('Students Update Error:', sError)
       toast.error('Failed to update student record: ' + sError.message)
       setLoading(false)
       return
    }

    // 2. Link in parent_student_links table (for Admin Portal compatibility)
    let linksCreated = 0
    for (const s of matchingStudents) {
       const { error: lError } = await supabase
         .from('parent_student_links')
         .upsert({
            parent_id: parentData.id,
            student_id: s.id
         }, { onConflict: 'parent_id,student_id' })
       
       if (lError) {
          console.error(`Link Error for ${s.full_name}:`, lError)
          toast.error(`Link failed for ${s.full_name}: ${lError.message}`)
       } else {
          linksCreated++
       }
    }

    if (linksCreated === 0 && matchingStudents.length > 0) {
       setLoading(false)
       return
    }

    // 3. Clear PIN (One-time use)
    const { error: pinError } = await supabase
      .from('parents')
      .update({ security_pin: null })
      .eq('user_id', profile?.id)
    
    if (pinError) console.error('PIN Clear Error:', pinError)

    setIsSuccess(true)
    toast.success(`Successfully linked ${linksCreated} student(s)!`)
    
    // Redirect after a short delay
    setTimeout(() => {
       window.location.href = '/parent'
    }, 2500)
  }

  return (
    <div className="p-4 sm:p-6 min-h-[80vh] flex flex-col items-center justify-center bg-[var(--bg)] relative">
       <button onClick={() => router.back()} className="absolute top-4 left-4 sm:top-24 sm:left-10 p-3 sm:p-4 rounded-2xl sm:rounded-3xl hover:bg-[var(--input)] transition-all z-50">
          <ArrowLeft size={20} className="sm:w-6 sm:h-6 text-muted" />
       </button>

        <div className="w-full max-w-md">
          {isSuccess ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 p-10 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-emerald-500/20">
               <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-500/30">
                  <CheckCircle2 size={48} className="animate-bounce" />
               </div>
               <div className="space-y-2">
                  <h2 className="text-3xl font-black text-emerald-600">Perfect!</h2>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                     You&apos;ve successfully linked your children. Redirecting you to the intelligence dashboard...
                  </p>
               </div>
               <div className="flex gap-2 justify-center">
                  {[1, 2, 3].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-2 h-2 rounded-full bg-emerald-500"
                    />
                  ))}
               </div>
            </motion.div>
          ) : step === 1 ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
               <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-600">
                  <GraduationCap size={40} />
               </div>
               <div>
                  <h1 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Link Your Kids</h1>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Enter admission numbers separated by commas to link multiple students at once.</p>
               </div>
               <div className="space-y-4">
                  <Input 
                    placeholder="e.g. PPT-001, PPT-002" 
                    className="py-6 sm:py-8 text-lg sm:text-xl font-black text-center rounded-[1.5rem] sm:rounded-3xl" 
                    value={admissionNumber}
                    onChange={e => setAdmissionNumber(e.target.value)}
                  />
                  <Button className="w-full py-6 sm:py-8 text-base sm:text-lg font-black rounded-[1.5rem] sm:rounded-3xl" onClick={findStudents} isLoading={loading}>
                     Find Students <Search size={18} className="ml-2" />
                  </Button>
               </div>
               <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3 text-left">
                  <AlertCircle size={20} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-800 leading-tight">
                     Linking allows you to see attendance, performance and bills. Use the one-time security PIN sent to your notifications.
                  </p>
               </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 w-full">
               <Card className="p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 sm:p-4">
                     <Badge variant="success" className="rounded-lg">{matchingStudents.length} Found</Badge>
                  </div>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10">
                    {matchingStudents.map((s) => (
                      <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] text-left hover:border-primary/30 transition-colors">
                         <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-black text-primary border-2 border-primary/20 shrink-0">
                            {s.full_name ? s.full_name[0] : '?'}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                               <h4 className="font-black text-base leading-tight" style={{ color: 'var(--text)' }}>{s.full_name}</h4>
                               {s.isAlreadyLinked && <Badge variant="secondary" className="text-[8px]">Already Linked</Badge>}
                            </div>
                            <p className="text-xs font-bold opacity-60 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                               {s.class?.name || 'No Class Assigned'}
                            </p>
                            <p className="text-[10px] uppercase font-black tracking-widest text-primary/60 mt-1">
                               {s.admission_number}
                            </p>
                         </div>
                         <div className="ml-2 shrink-0">
                            {s.isAlreadyLinked ? (
                               <CheckCircle2 size={24} className="text-muted opacity-30 shadow-sm" />
                            ) : (
                               <Sparkles size={24} className="text-primary animate-pulse shadow-sm" />
                            )}
                          </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-6 border-t border-[var(--card-border)] text-left space-y-4">
                     <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted">Security Verification</label>
                     <p className="text-[9px] sm:text-[10px]" style={{ color: 'var(--text-muted)' }}>Enter the one-time secret PIN sent to your notifications. It can only be used once!</p>
                     <Input 
                        type="password" 
                        placeholder="4-Digit PIN" 
                        className="py-6 text-xl sm:text-2xl font-black text-center tracking-[0.5em] rounded-2xl" 
                        value={parentPin}
                        onChange={e => setParentPin(e.target.value)}
                        maxLength={4}
                      />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                     <Button variant="secondary" className="w-full py-4 sm:py-6 rounded-2xl order-2 sm:order-1" onClick={() => setStep(1)}>Back</Button>
                     <Button className="w-full py-4 sm:py-6 rounded-2xl order-1 sm:order-2" onClick={confirmLink} isLoading={loading}>Link Now <ShieldCheck size={18} className="ml-2" /></Button>
                  </div>
               </Card>
            </motion.div>
          )}
       </div>
    </div>
  )
}
