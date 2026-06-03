'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Search, User, Calendar, CheckCircle, Loader2, 
  X, ChevronDown, Receipt, RefreshCw, AlertCircle, Plus, 
  Banknote, Smartphone, Building2, CreditCard, Filter,
  ArrowRight, Info, Check, Clock, TrendingUp, HelpCircle, Send,
  Eye
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, getEventWeeks, calculateWeeklyStats, getArrearsStatus } from '@/lib/utils'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { Modal } from '@/components/ui/Modal'
import { Receipt as ReceiptViewer } from '@/components/Receipt'
import toast from 'react-hot-toast'

// --- Types ---
interface Registration {
  id: string
  student_name: string
  tuition_event_id: string
  class_id: string | null
  tuition_center_id: string | null
  class?: { id: string, name: string, curriculum_id: string }
  center?: { name: string }
  student?: { id: string }
}

interface TuitionEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  active_days: string[]
  is_active: boolean
  daily_rate: number
}

interface DBPayment {
  id: string
  amount: number
  payment_date: string
  paid_dates: string | null
  method: string
  receipt_number: string
  student_id: string | null
  student_name: string
  week_number: number | null
  is_published?: boolean
}

const METHODS = [
  { value: 'Cash', icon: <Banknote size={16} />, color: '#10B981' },
  { value: 'M-Pesa', icon: <Smartphone size={16} />, color: '#00B900' },
  { value: 'Bank Transfer', icon: <Building2 size={16} />, color: '#3B82F6' },
  { value: 'Cheque', icon: <CreditCard size={16} />, color: '#8B5CF6' },
]

function generateReceiptNumber() {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RCP-${ts}-${rand}`
}

export default function PaymentManagement() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()

  // --- Core State ---
  const [events, setEvents] = useState<TuitionEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<TuitionEvent | null>(null)
  const [weeks, setWeeks] = useState<any[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [centers, setCenters] = useState<{id: string, name: string}[]>([])
  const [curriculums, setCurriculums] = useState<{id: string, name: string}[]>([])
  const [classes, setClasses] = useState<{id: string, name: string, curriculum_id: string}[]>([])
  
  const [selectedCenterId, setSelectedCenterId] = useState<string>('')
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null)
  
  const [studentPayments, setStudentPayments] = useState<DBPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadRef, setLoadRef] = useState(0)

  // --- Payment Form State ---
  const [paymentMode, setPaymentMode] = useState<'full' | 'daily' | 'multi'>('full')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('Cash')
  const [submitting, setSubmitting] = useState(false)
  const [receiptNumber, setReceiptNumber] = useState(generateReceiptNumber())

  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // --- Receipt Viewer State ---
  const [viewingReceipt, setViewingReceipt] = useState<DBPayment | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)

  // --- Initialization ---
  useEffect(() => {
    supabase.from('tuition_events').select('*').order('start_date', { ascending: false }).limit(10)
      .then(({ data }) => {
        const events = data as TuitionEvent[]
        setEvents(events ?? [])
        const active = events?.find(e => e.is_active)
        setSelectedEvent(active ?? events?.[0] ?? null)
      })

    supabase.from('tuition_centers').select('id, name').order('name').then(({ data }) => {
      const centerList = data || []
      setCenters(centerList)
      if (centerList.length > 0) setSelectedCenterId(centerList[0].id)
    })
    
    supabase.from('curriculums').select('id, name').then(({data}) => setCurriculums(data || []))
    supabase.from('classes').select('id, name, curriculum_id').then(({data}) => setClasses(data || []))
  }, [supabase])

  // Fetches weeks and registrations when event or center changes
  useEffect(() => {
    if (!selectedEvent) return
    
    const evWeeks = getEventWeeks(selectedEvent.start_date, selectedEvent.end_date, selectedEvent.active_days)
    setWeeks(evWeeks)
    setSelectedWeekIndex(0) 

    setLoading(true)
    supabase.from('event_registrations')
      .select('*, class:classes(id, name, curriculum_id), center:tuition_centers(name), student:students(id)')
      .eq('tuition_event_id', selectedEvent.id)
      .then(({ data, error }) => {
        if (error) toast.error(`Data Sync Error: ${error.message}`)
        setRegistrations(data as any ?? [])
        setLoading(false)
      })
  }, [selectedEvent, supabase])

  // --- Derived State & Logic ---
  const filteredStudents = useMemo(() => {
    return registrations.filter(r => {
      if (selectedCenterId && selectedCenterId !== 'none' && r.tuition_center_id !== selectedCenterId) return false
      if (selectedCurriculum && r.class?.curriculum_id !== selectedCurriculum) return false
      if (selectedClass && r.class_id !== selectedClass) return false
      if (studentSearch && !r.student_name.toLowerCase().includes(studentSearch.toLowerCase())) return false
      return true
    }).slice(0, 10)
  }, [registrations, selectedCenterId, selectedCurriculum, selectedClass, studentSearch])

  // Fetches payments for the selected student to calculate arrears
  const loadStudentData = useCallback(async () => {
    if (!selectedReg || !selectedEvent) return
    const { data } = await supabase.from('payments')
      .select('*')
      .eq('tuition_event_id', selectedEvent.id)
      .ilike('student_name', selectedReg.student_name)
    setStudentPayments(data as any ?? [])
  }, [selectedReg, selectedEvent, supabase])

  useEffect(() => { loadStudentData() }, [loadStudentData, loadRef])

  const selectedWeek = weeks[selectedWeekIndex]
  const weeklyStats = useMemo(() => {
    if (!selectedWeek || !selectedEvent) return null
    return calculateWeeklyStats(selectedWeek, studentPayments, selectedEvent.daily_rate)
  }, [selectedWeek, studentPayments, selectedEvent])

  useEffect(() => {
    if (!selectedEvent || !weeklyStats) return
    if (paymentMode === 'full') {
      setSelectedDates(weeklyStats.unpaidDates)
      setAmount(weeklyStats.unpaidDates.length * selectedEvent.daily_rate)
    } else if (paymentMode === 'daily' && selectedDates.length > 1) {
      setSelectedDates([selectedDates[0]])
      setAmount(selectedEvent.daily_rate)
    }
  }, [paymentMode, weeklyStats, selectedEvent])

  const handleDateToggle = (date: string) => {
    if (paymentMode === 'daily') {
      setSelectedDates([date])
      setAmount(selectedEvent?.daily_rate ?? 0)
    } else if (paymentMode === 'multi') {
      const next = selectedDates.includes(date)
        ? selectedDates.filter(d => d !== date)
        : [...selectedDates, date]
      setSelectedDates(next)
      setAmount(next.length * (selectedEvent?.daily_rate ?? 0))
    }
  }

  // --- Handlers ---
  const recordPayment = async () => {
    if (!selectedReg || !selectedEvent || selectedDates.length === 0) {
      toast.error('Please select a student and at least one date')
      return
    }
    setSubmitting(true)
    try {
      // Find actual student id if it exists
      let studentId = selectedReg.student?.id || null

      const { error } = await supabase.from('payments').insert({
        tuition_event_id: selectedEvent.id,
        student_name: selectedReg.student_name,
        student_id: studentId,
        amount,
        paid_dates: selectedDates.join(','),
        week_number: selectedWeek.weekNumber,
        method,
        receipt_number: receiptNumber,
        payment_date: new Date().toISOString().split('T')[0],
        tuition_center_id: selectedReg.tuition_center_id,
        created_by: profile?.id,
        is_published: false
      })

      if (error) throw error

      toast.success('Payment recorded successfully!')
      setReceiptNumber(generateReceiptNumber())
      setSelectedDates([])
      setLoadRef(prev => prev + 1)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const publishReceipt = async (paymentId: string) => {
    setPublishing(paymentId)
    try {
      const { error } = await supabase.from('payments').update({ is_published: true }).eq('id', paymentId)
      if (error) throw error
      
      const payment = studentPayments.find(p => p.id === paymentId)
      if (payment && payment.student_id) {
        await supabase.from('notifications').insert({
          user_id: payment.student_id,
          title: 'Official Receipt Published',
          message: `Receipt ${payment.receipt_number} for ${formatCurrency(payment.amount)} has been published to your account.`,
          type: 'billing'
        })
      }
      
      toast.success('Receipt officially published!')
      setLoadRef(p => p + 1)
    } catch (err: any) {
      toast.error('Failed to publish receipt')
    } finally {
      setPublishing(null)
    }
  }

  const publishAll = async () => {
    const unpublished = studentPayments.filter(p => !p.is_published)
    if (unpublished.length === 0) {
      toast.success('All receipts are already published!')
      return
    }
    
    setPublishing('all')
    try {
      for (const p of unpublished) {
        await supabase.from('payments').update({ is_published: true }).eq('id', p.id)
        if (p.student_id) {
          await supabase.from('notifications').insert({
            user_id: p.student_id,
            title: 'Official Receipt Published',
            message: `Receipt ${p.receipt_number} has been published to your account.`,
            type: 'billing'
          })
        }
      }
      toast.success(`Published ${unpublished.length} receipts!`)
      setLoadRef(p => p + 1)
    } catch (err: any) {
      toast.error('Failed to publish all receipts')
    } finally {
      setPublishing(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Payment Hub
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
            Weekly Billing & Arrears Management System
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="info" className="px-3 py-1 text-sm bg-blue-500/10 border-blue-500/20 text-blue-500 hidden sm:flex">
            <RefreshCw size={12} className="mr-1.5" /> Live Sync Active
          </Badge>
          
          <div className="flex flex-col items-end border-r border-[var(--card-border)] pr-4">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Curriculum</p>
            <select 
              value={selectedCurriculum} 
              onChange={e => { setSelectedCurriculum(e.target.value); setSelectedClass(''); }}
              className="text-sm font-black bg-transparent border-none outline-none text-right cursor-pointer text-primary"
            >
              <option value="" style={{ color: '#000' }}>All Curriculums</option>
              {curriculums.map(c => <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col items-end border-r border-[var(--card-border)] pr-4">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Class</p>
            <select 
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)}
              className="text-sm font-black bg-transparent border-none outline-none text-right cursor-pointer text-primary"
            >
              <option value="" style={{ color: '#000' }}>All Classes</option>
              {classes.filter(c => !selectedCurriculum || c.curriculum_id === selectedCurriculum).map(c => <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col items-end border-r border-[var(--card-border)] pr-4">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Center</p>
            <select 
              value={selectedCenterId} 
              onChange={e => setSelectedCenterId(e.target.value)}
              className="text-sm font-black bg-transparent border-none outline-none text-right cursor-pointer text-primary"
            >
              <option value="none" style={{ color: '#000' }}>Unassigned / Global</option>
              {centers.map(c => <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col items-end">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Event</p>
            <select 
              value={selectedEvent?.id ?? ''} 
              onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value) ?? null)}
              className="text-sm font-black bg-transparent border-none outline-none text-right cursor-pointer text-primary"
            >
              {events.map(e => <option key={e.id} value={e.id} style={{ color: '#000' }}>{e.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Context & Selection */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Week Selection Card */}
          <Card className="p-5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-2xl" />
            <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={16} /> Select Billing Week
            </h3>
            <div className="space-y-2 overflow-y-auto max-h-[320px] pr-2 scrollbar-hide">
              {weeks.map((w, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWeekIndex(idx)}
                  className={`w-full p-4 rounded-2xl text-left transition-all relative overflow-hidden group ${selectedWeekIndex === idx ? 'ring-2 ring-primary border-transparent' : 'border border-[var(--card-border)] hover:bg-white/5'}`}
                  style={{ background: selectedWeekIndex === idx ? 'var(--primary-subtle, rgba(245,158,11,0.08))' : 'var(--card)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-black ${selectedWeekIndex === idx ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>{w.label}</p>
                      <p className="text-xs font-medium mt-0.5 opacity-60">Active Teaching Window</p>
                    </div>
                    {selectedWeekIndex === idx && <Check size={18} className="text-[var(--primary)]" />}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Student Lookup Card */}
          <Card className="p-5">
            <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <User size={16} /> Student Source
            </h3>
            
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                <input
                  type="text"
                  placeholder="Search registered students..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-none outline-none text-sm font-bold shadow-inner"
                  style={{ background: 'var(--input)', color: 'var(--text)' }}
                  value={studentSearch}
                  onFocus={() => setShowDropdown(true)}
                  onChange={e => setStudentSearch(e.target.value)}
                />
              </div>

              <AnimatePresence>
                {showDropdown && (studentSearch || filteredStudents.length > 0) && !selectedReg && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute z-50 w-full mt-2 rounded-2xl shadow-2xl overflow-hidden border border-[var(--card-border)]"
                    style={{ background: 'var(--card)' }}
                  >
                    {loading ? (
                      <div className="p-8 text-center"><Loader2 size={24} className="animate-spin mx-auto opacity-20" /></div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="p-8 text-center text-xs font-bold text-[var(--text-muted)]">No registered students found in this event</div>
                    ) : (
                      filteredStudents.map(reg => (
                        <button
                          key={reg.id}
                          onClick={() => { setSelectedReg(reg); setShowDropdown(false); setStudentSearch(reg.student_name); }}
                          className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-colors border-b border-[var(--card-border)] last:border-none"
                        >
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm bg-gradient-to-br from-indigo-500 to-purple-600">
                            {reg.student_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black" style={{ color: 'var(--text)' }}>{reg.student_name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-tight opacity-50">{reg.class?.name} · {reg.center?.name ?? 'Main Center'}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {selectedReg && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-4 rounded-2xl flex items-center justify-between"
                style={{ background: 'var(--primary-subtle, rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm bg-gradient-to-br from-indigo-500 to-purple-600">
                    {selectedReg.student_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--text)' }}>{selectedReg.student_name}</p>
                    <p className="text-[10px] font-bold opacity-50 uppercase">{selectedReg.class?.name}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedReg(null); setStudentSearch(''); }} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </Card>
        </div>

        {/* Right Column: Arrears & Payment Logic */}
        <div className="xl:col-span-8 space-y-6">
          {!selectedReg ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 rounded-[2rem] border-2 border-dashed border-[var(--card-border)] bg-black/5">
              <div className="w-16 h-16 rounded-full bg-[var(--card)] flex items-center justify-center mb-4 shadow-sm">
                <Receipt size={32} className="opacity-10" />
              </div>
              <h4 className="text-lg font-black mb-1" style={{ color: 'var(--text-muted)' }}>Financial Terminal Standby</h4>
              <p className="text-sm opacity-40 max-w-xs">Select a tuition center student to begin real-time arrears tracking and billing.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              
              {/* Arrears Summary Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5 flex flex-col justify-center border-l-4 border-l-blue-500">
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-50 mb-1">Total Billable</p>
                  <p className="text-2xl font-black">{formatCurrency(weeklyStats?.totalDue ?? 0)}</p>
                  <p className="text-[10px] font-bold mt-1 opacity-40">{weeklyStats?.unpaidDates.length || 0} teaching days due</p>
                </Card>
                <Card className="p-5 flex flex-col justify-center border-l-4 border-l-emerald-500">
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-50 mb-1">Weekly Collected</p>
                  <p className="text-2xl font-black text-emerald-500">{formatCurrency(weeklyStats?.totalPaid ?? 0)}</p>
                  <p className="text-[10px] font-bold mt-1 opacity-40">{weeklyStats?.paidDates.length || 0} days settled</p>
                </Card>
                <Card className="p-5 flex flex-col justify-center border-l-4 border-l-orange-500">
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-50 mb-1">Outstanding (Arrears)</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black text-orange-500">{formatCurrency(weeklyStats?.arrears ?? 0)}</p>
                    {weeklyStats && (
                      <Badge variant={getArrearsStatus(weeklyStats.arrears, weeklyStats.totalDue).variant as any} className="text-[10px] px-1.5 py-0">
                        {getArrearsStatus(weeklyStats.arrears, weeklyStats.totalDue).label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] font-bold mt-1 opacity-40">Due for selected week</p>
                </Card>
              </div>

              {/* Mode Selection */}
              <div className="flex gap-2 p-1.5 rounded-2xl w-fit" style={{ background: 'var(--input)' }}>
                {(['full', 'daily', 'multi'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black capitalize transition-all ${paymentMode === mode ? 'bg-white shadow-sm text-black' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                  >
                    {mode === 'full' ? 'Full Week' : mode === 'daily' ? 'Individual Day' : 'Multi-Day'}
                  </button>
                ))}
              </div>

              {/* Dynamic Logic: Date Picker */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-black flex items-center gap-2">
                    <Clock size={18} className="text-[var(--primary)]" />
                   {paymentMode === 'full' ? 'Week Allocation' : 'Custom Day Selection'}
                  </h4>
                  <p className="text-xs font-bold opacity-40">Billing Window: {selectedWeek.activeDates.length} Days</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {selectedWeek.activeDates.map((date: string) => {
                    const isPaid = weeklyStats?.paidDates.includes(date)
                    const isSelected = selectedDates.includes(date)
                    const isToday = date === new Date().toISOString().split('T')[0]

                    return (
                      <button
                        key={date}
                        disabled={isPaid && paymentMode !== 'full'}
                        onClick={() => handleDateToggle(date)}
                        className={`p-4 rounded-[1.5rem] text-left transition-all relative overflow-hidden group ${isPaid ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'} ${isSelected ? 'ring-2 ring-primary' : 'border border-[var(--card-border)]'}`}
                        style={{ 
                          background: isSelected ? 'var(--primary-subtle, rgba(245,158,11,0.1))' : isPaid ? 'rgba(0,0,0,0.05)' : 'var(--card)'
                        }}
                      >
                        {isPaid && <CheckCircle size={14} className="absolute top-2 right-2 text-emerald-500" />}
                        {isToday && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                        
                        <p className={`text-[10px] font-black uppercase tracking-tighter ${isSelected ? 'text-[var(--primary)]' : 'opacity-40'}`}>
                          {new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}
                        </p>
                        <p className="text-lg font-black leading-none mt-1">
                          {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </Card>

              {/* Payment Receipt Logic */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Billing Details */}
                <Card className="p-6 space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-wider opacity-50 flex items-center gap-2">
                    <ArrowRight size={16} /> Transaction Details
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5">Payment Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        {METHODS.map(m => (
                          <button
                            key={m.value}
                            onClick={() => setMethod(m.value)}
                            className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${method === m.value ? 'ring-1 ring-primary' : 'border border-[var(--card-border)] opacity-60 hover:opacity-100'}`}
                            style={{ background: method === m.value ? m.color + '15' : 'var(--card)', color: method === m.value ? m.color : 'inherit' }}
                          >
                            {m.icon} {m.value}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5">Amount (KES)</label>
                        <input 
                          type="number" 
                          value={amount}
                          onChange={e => setAmount(Number(e.target.value))}
                          className="w-full bg-[var(--input)] border-none rounded-xl py-3 px-4 text-sm font-black outline-none"
                          style={{ color: 'var(--primary)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5">Receipt Reference</label>
                        <input 
                          type="text" 
                          readOnly
                          value={receiptNumber}
                          className="w-full bg-[var(--input)] opacity-50 border-none rounded-xl py-3 px-4 text-sm font-mono font-bold outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Confirm & Submit */}
                <Card className="p-6 flex flex-col justify-between border-t-4 border-t-[var(--primary)]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white shadow-xl">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <h4 className="text-base font-black">Execution Summary</h4>
                        <p className="text-xs font-bold opacity-40">Ready to commit to record</p>
                      </div>
                    </div>

                    <div className="space-y-2 py-4 border-y border-[var(--card-border)] border-dashed">
                      <div className="flex justify-between text-lg font-black mt-2 pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(amount)}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full mt-4 h-14 rounded-2xl font-black text-base shadow-xl active:scale-95" 
                    disabled={submitting || selectedDates.length === 0}
                    onClick={recordPayment}
                  >
                    {submitting ? <Loader2 className="animate-spin" /> : <><Plus size={20} className="mr-2" /> Confirm Record</>}
                  </Button>
                </Card>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Bottom Section: Recent Activity & Today's Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
        <Card className="lg:col-span-12 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                <Receipt size={20} className="text-emerald-500" />
                Student Collection Ledger
              </h3>
              <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Real-time audit of financier entries</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={publishAll}
                disabled={publishing === 'all' || studentPayments.filter(p => !p.is_published).length === 0}
                className="border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold"
              >
                {publishing === 'all' ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send size={16} className="mr-2" />} 
                Publish All Unpublished
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-black/5 text-[10px] font-black uppercase tracking-widest opacity-50">
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Coverage</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {studentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs font-bold opacity-30 uppercase tracking-widest">
                      No transactions recorded for this student in the current event
                    </td>
                  </tr>
                ) : (
                  studentPayments.sort((a, b) => b.id.localeCompare(a.id)).map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 font-mono font-bold text-xs opacity-60">{p.receipt_number}</td>
                      <td className="px-4 py-4 font-black">{p.student_name}</td>
                      <td className="px-4 py-4">
                        <Badge variant="muted">Week {p.week_number}</Badge>
                      </td>
                      <td className="px-4 py-4 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {p.paid_dates?.split(',').map(d => (
                            <span key={d} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-emerald-500">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {p.is_published ? (
                          <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none"><CheckCircle size={12} className="mr-1" /> Published</Badge>
                        ) : (
                          <Badge variant="warning" className="bg-orange-500/10 text-orange-500 border-none">Draft</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setViewingReceipt(p)}
                          className="hover:bg-white/10"
                        >
                          <Eye size={16} />
                        </Button>
                        {!p.is_published && (
                          <Button 
                            variant="primary" 
                            size="sm"
                            disabled={publishing === p.id}
                            onClick={() => publishReceipt(p.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            {publishing === p.id ? <Loader2 size={16} className="animate-spin" /> : 'Publish'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={!!viewingReceipt} onClose={() => setViewingReceipt(null)} title="Official Receipt Preview" size="xl">
        {viewingReceipt && (
           <ReceiptViewer 
             payment={viewingReceipt} 
             eventName={selectedEvent?.name}
             centerName={centers.find(c => c.id === selectedReg?.tuition_center_id)?.name}
           />
        )}
      </Modal>
    </div>
  )
}
