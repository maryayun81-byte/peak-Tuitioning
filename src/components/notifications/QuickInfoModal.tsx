'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'

import { Modal } from '@/components/ui/Modal'
import { useNotificationStore } from '@/stores/notificationStore'
import { Button } from '@/components/ui/Button'
import { Bell, Info, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function QuickInfoModal() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { activePriorityNotification, setActivePriorityNotification, markRead } = useNotificationStore()

  if (!activePriorityNotification) return null

  const n = activePriorityNotification

  const getIcon = () => {
    switch (n.type) {
      case 'alert': return <ShieldAlert size={32} className="text-rose-500" />
      case 'warning': return <AlertTriangle size={32} className="text-amber-500" />
      default: return <Bell size={32} className="text-primary" />
    }
  }

  const handleClose = async () => {
    // Mark as read immediately in DB and store so it doesn't pop up again on refresh
    await supabase.from('notifications').update({ read: true }).eq('id', n.id)
    markRead(n.id)
    setActivePriorityNotification(null)
  }

  const handleViewAll = async () => {
    await supabase.from('notifications').update({ read: true }).eq('id', n.id)
    markRead(n.id)
    setActivePriorityNotification(null)
    router.push('/student/notifications')
  }

  return (
    <Modal 
      isOpen={!!activePriorityNotification} 
      onClose={handleClose}
      title="Intel Broadcast"
      size="md"
    >
      <div className="space-y-6 py-2">
        <div className="flex items-start gap-5">
           <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shrink-0 shadow-xl ${
             n.type === 'alert' ? 'bg-rose-500/10' : 
             n.type === 'warning' ? 'bg-amber-500/10' : 
             'bg-primary/10'
           }`}>
             {getIcon()}
           </div>
           <div className="space-y-2 flex-1">
             <h3 className="text-xl font-black leading-tight" style={{ color: 'var(--text)' }}>{n.title}</h3>
             <div className="flex items-center gap-2">
               <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--input)] text-[var(--text-muted)] border border-[var(--card-border)]">
                 {n.type} broadcast
               </span>
             </div>
           </div>
        </div>

        <div className="p-5 rounded-3xl border border-[var(--card-border)] bg-[var(--input)] shadow-inner">
           <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
             {n.body}
           </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
           <Button 
             variant="secondary" 
             className="flex-1 rounded-2xl h-14 font-black uppercase text-xs tracking-widest"
             onClick={handleClose}
           >
             Dismiss
           </Button>
           <Button 
             className="flex-1 rounded-2xl h-14 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
             onClick={handleViewAll}
           >
             Read Full Log <ArrowRight size={14} className="ml-2" />
           </Button>
        </div>
      </div>
    </Modal>
  )
}
