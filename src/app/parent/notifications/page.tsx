'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, CheckCircle2, AlertCircle, Info, 
  Trash2, MailOpen, Clock, ArrowLeft,
  ShieldAlert, CheckCheck, XCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ParentNotifications() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (profile) loadNotifications()
  }, [profile])

  const loadNotifications = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      toast.error('Failed to load notifications')
    } else {
      setNotifications(data || [])
    }
    setLoading(false)
  }

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete notification')
    } else {
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Notification removed')
    }
  }

  const markAsRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id)
    if (!notif || notif.read) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile?.id)
      .eq('read', false)
    
    if (error) {
      toast.error('Failed to update notifications')
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('All marked as read')
    }
  }

  const deleteAll = async () => {
     if (!confirm('Are you sure you want to clear all notifications?')) return
     
     const { error } = await supabase
       .from('notifications')
       .delete()
       .eq('user_id', profile?.id)
     
     if (error) {
        toast.error('Failed to clear notifications')
     } else {
        setNotifications([])
        toast.success('Notifications cleared')
     }
  }

  if (loading) return <SkeletonDashboard />

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 pb-32">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
         <div className="flex items-center gap-4">
            <Link href="/parent" className="p-2 hover:bg-[var(--input)] rounded-xl transition-colors">
               <ArrowLeft size={20} className="text-muted" />
            </Link>
            <div>
               <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Bell size={28} className="text-primary" /> Notifications
               </h1>
               <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Inbox Overview</p>
                  {unreadCount > 0 && <Badge variant="primary" className="text-[8px] py-0.5 px-2 rounded-full">{unreadCount} Unread</Badge>}
               </div>
            </div>
         </div>

         {/* Actions Bar - Responsive */}
         <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-2 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] shadow-sm">
            <Button 
               variant="ghost" 
               size="sm" 
               className="rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 sm:flex-none py-4"
               onClick={markAllAsRead}
               disabled={unreadCount === 0}
            >
               <CheckCheck size={14} className="mr-2" /> Mark All Read
            </Button>
            <Button 
               variant="ghost" 
               size="sm" 
               className="rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 sm:flex-none py-4 text-rose-500 hover:text-rose-600 hover:bg-rose-500/5"
               onClick={deleteAll}
               disabled={notifications.length === 0}
            >
               <XCircle size={14} className="mr-2" /> Clear All
            </Button>
         </div>
      </div>

      <div className="space-y-4">
         <AnimatePresence mode="popLayout" initial={false}>
            {notifications.map((n) => {
              const isPin = n.title?.toLowerCase().includes('pin') || n.body?.toLowerCase().includes('pin')
              
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    markAsRead(n.id)
                    if (n.data?.link) {
                      router.push(n.data.link)
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Card className={`p-5 sm:p-7 border-none shadow-sm relative group overflow-hidden transition-all duration-300 ${!n.read ? 'bg-primary/5 ring-1 ring-primary/10' : 'opacity-80'}`}>
                    {/* Unread Indicator */}
                    {!n.read && (
                      <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50 animate-pulse" />
                    )}

                    {isPin && (
                      <div className="absolute top-0 right-0 p-3">
                        <Badge className="bg-primary text-white border-none rounded-lg animate-pulse text-[8px]">SECRET PIN</Badge>
                      </div>
                    )}
                    
                    <div className="flex gap-4 sm:gap-6">
                      <div className={`p-4 rounded-2xl shrink-0 h-fit transition-transform group-hover:scale-110 ${
                        isPin ? 'bg-primary text-white shadow-xl shadow-primary/20' :
                        n.type === 'alert' ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' :
                        n.type === 'warning' ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' :
                        'bg-blue-500/10 text-blue-500 border border-blue-500/10'
                      }`}>
                        {isPin ? <ShieldAlert size={20} /> : 
                         n.type === 'alert' ? <AlertCircle size={20} /> :
                         n.type === 'warning' ? <Clock size={20} /> :
                         <Info size={20} />}
                      </div>
                      
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                           <h3 className={`font-black text-sm sm:text-base truncate ${!n.read ? 'text-primary' : 'text-[var(--text)]'}`}>{n.title}</h3>
                           <span className="text-[10px] font-black uppercase tracking-widest text-muted opacity-40 shrink-0">{formatDate(n.created_at, 'short')}</span>
                        </div>
                        <p className={`text-xs sm:text-sm leading-relaxed ${isPin ? 'font-bold' : 'font-medium'}`} style={{ color: 'var(--text-muted)' }}>
                           {n.body || n.message}
                        </p>
                        
                        {isPin && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-white/40 dark:bg-black/20 rounded-xl border border-primary/20 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">Authentication Code Valid</span>
                            <div className="flex items-center gap-2">
                               <CheckCircle2 size={12} className="text-primary" />
                               <span className="text-[10px] font-bold text-primary italic">Verify in Student Link</span>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Delete Action - Visible but refined */}
                      <div className="flex items-center">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation()
                             deleteNotification(n.id)
                           }}
                           className="p-3 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all shadow-sm"
                           title="Delete notification"
                         >
                            <Trash2 size={16} />
                         </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
         </AnimatePresence>

         {notifications.length === 0 && (
            <div className="py-24 text-center space-y-6">
               <div className="w-24 h-24 rounded-[2rem] bg-indigo-500/5 flex items-center justify-center mx-auto text-indigo-500/20 border border-indigo-500/10">
                  <Bell size={48} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-xl font-black" style={{ color: 'var(--text)' }}>Peaceful Silence</h3>
                  <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>Your inbox is completely clear. We'll alert you when there's new intel on your students.</p>
               </div>
            </div>
         )}
      </div>
    </div>
  )
}
