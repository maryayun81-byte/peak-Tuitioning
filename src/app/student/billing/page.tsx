'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Receipt as ReceiptIcon, Loader2, Calendar, DollarSign, CheckCircle, Eye, Download, ArrowRight } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Receipt as ReceiptViewer } from '@/components/Receipt'
import toast from 'react-hot-toast'

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
  tuition_event_id: string
  tuition_center_id: string | null
  is_published: boolean
  event?: { name: string }
  center?: { name: string }
}

export default function StudentBillingPage() {
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()

  const [receipts, setReceipts] = useState<DBPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingReceipt, setViewingReceipt] = useState<DBPayment | null>(null)

  useEffect(() => {
    if (!profile?.id) return

    // Fetch published payments for this student
    supabase.from('payments')
      .select('*, event:tuition_events(name), center:tuition_centers(name)')
      .eq('student_id', profile.id)
      .eq('is_published', true)
      .order('payment_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load receipts')
        } else {
          setReceipts(data as any ?? [])
        }
        setLoading(false)
      })
  }, [profile, supabase])

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[var(--card-border)] pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Financial Records
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
            View and download your official tuition receipts.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="success" className="px-4 py-2 text-sm bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-black flex items-center">
            <CheckCircle size={16} className="mr-2" />
            Account in Good Standing
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin opacity-50" style={{ color: 'var(--primary)' }} />
        </div>
      ) : receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-16 rounded-[2rem] border-2 border-dashed border-[var(--card-border)] bg-black/5">
          <div className="w-20 h-20 rounded-full bg-[var(--card)] flex items-center justify-center mb-6 shadow-sm border border-[var(--card-border)]">
            <ReceiptIcon size={32} className="opacity-20" />
          </div>
          <h4 className="text-xl font-black mb-2" style={{ color: 'var(--text-muted)' }}>No Published Receipts</h4>
          <p className="text-sm opacity-50 max-w-md">
            When the finance department processes your payments and publishes your receipts, they will appear securely in this vault.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {receipts.map(receipt => (
            <motion.div
              key={receipt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className="group cursor-pointer"
              onClick={() => setViewingReceipt(receipt)}
            >
              <Card className="p-6 h-full flex flex-col justify-between transition-all hover:shadow-xl hover:border-emerald-500/50 relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--input)] flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform">
                      <ReceiptIcon size={24} />
                    </div>
                    <Badge variant="muted" className="font-mono text-xs font-bold">
                      {receipt.receipt_number}
                    </Badge>
                  </div>
                  
                  <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>
                    {formatCurrency(receipt.amount)}
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-wider mt-1 opacity-50 truncate">
                    {receipt.event?.name ?? 'Tuition Event'}
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      <Calendar size={16} className="opacity-50" />
                      <span>{formatDate(receipt.payment_date)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      <DollarSign size={16} className="opacity-50" />
                      <span>Paid via {receipt.method}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-[var(--card-border)] flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">View Details</span>
                  <ArrowRight size={16} className="text-[var(--primary)]" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Receipt Viewer Modal */}
      <Modal isOpen={!!viewingReceipt} onClose={() => setViewingReceipt(null)} title="Official Receipt" size="xl">
        {viewingReceipt && (
           <ReceiptViewer 
             payment={viewingReceipt} 
             eventName={viewingReceipt.event?.name}
             centerName={viewingReceipt.center?.name}
           />
        )}
      </Modal>
    </div>
  )
}
