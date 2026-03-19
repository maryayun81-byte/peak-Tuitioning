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
  const [matchingStudent, setMatchingStudent] = useState<any>(null)
  const [step, setStep] = useState(1)

  const findStudent = async () => {
    if (!admissionNumber) return
    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('*, class:classes(name)')
      .eq('admission_number', admissionNumber)
      .single()
    
    setLoading(false)
    if (error || !data) {
       toast.error('No student found with this admission number.')
       return
    }
    setMatchingStudent(data)
    setStep(2)
  }

  const confirmLink = async () => {
    // In a real app, you'd verify the PIN against a generated value
    if (parentPin !== '1234') { 
       toast.error('Incorrect security PIN. Please contact the school office.')
       return
    }
    
    setLoading(true)
    const { error } = await supabase
      .from('students')
      .update({ parent_id: profile?.id })
      .eq('id', matchingStudent.id)
    
    setLoading(false)
    if (error) { toast.error(error.message) }
    else {
       toast.success(`Successfully linked to ${matchingStudent.full_name}!`)
       router.push('/parent')
    }
  }

  return (
    <div className="p-6 h-[80vh] flex flex-col items-center justify-center bg-[var(--bg)]">
       <button onClick={() => router.back()} className="fixed top-24 left-10 p-4 rounded-3xl hover:bg-[var(--input)] transition-all">
          <ArrowLeft size={24} className="text-muted" />
       </button>

       <div className="w-full max-w-md">
          {step === 1 ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
               <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-600">
                  <GraduationCap size={40} />
               </div>
               <div>
                  <h1 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Link Your Child</h1>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Enter your child&apos;s unique admission number to begin linking your accounts.</p>
               </div>
               <div className="space-y-4">
                  <Input 
                    placeholder="e.g. ADM10245" 
                    className="py-8 text-xl font-black text-center rounded-3xl" 
                    value={admissionNumber}
                    onChange={e => setAdmissionNumber(e.target.value)}
                  />
                  <Button className="w-full py-8 text-lg font-black rounded-3xl" onClick={findStudent} isLoading={loading}>
                     Find Student <Search size={18} className="ml-2" />
                  </Button>
               </div>
               <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3 text-left">
                  <AlertCircle size={20} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-800 leading-tight">
                     Linking allows you to see attendance, performance and bills for this student. Ensure you have the correct admission number from the school office.
                  </p>
               </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
               <Card className="p-8 text-center space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                     <Badge variant="success" className="rounded-lg">Found Match</Badge>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto border-4 border-white shadow-lg text-xl font-black text-primary">
                     {matchingStudent.full_name[0]}
                  </div>
                  <div>
                     <h3 className="text-xl font-black" style={{ color: 'var(--text)' }}>{matchingStudent.full_name}</h3>
                     <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{matchingStudent.class?.name}</p>
                  </div>
                  
                  <div className="pt-6 border-t border-[var(--card-border)] text-left space-y-4">
                     <label className="text-xs font-black uppercase tracking-widest text-muted">Security Verification</label>
                     <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Enter the secret parent security PIN provided to you during enrollment.</p>
                     <Input 
                        type="password" 
                        placeholder="4-Digit PIN" 
                        max={4}
                        className="py-6 text-2xl font-black text-center tracking-[0.5em] rounded-2xl" 
                        value={parentPin}
                        onChange={e => setParentPin(e.target.value)}
                     />
                  </div>

                  <div className="flex gap-4">
                     <Button variant="secondary" className="flex-1 py-6 rounded-2xl" onClick={() => setStep(1)}>Back</Button>
                     <Button className="flex-[2] py-6 rounded-2xl" onClick={confirmLink} isLoading={loading}>Link Account <ShieldCheck size={18} className="ml-2" /></Button>
                  </div>
               </Card>
            </motion.div>
          )}
       </div>
    </div>
  )
}
