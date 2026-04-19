'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, CheckCircle2, AlertCircle, Info, 
  Trash2, MailOpen, Clock, ArrowLeft,
  ShieldAlert, CheckCheck, XCircle, Search,
  Filter, Calendar, MoreVertical, Trash,
  Zap, BookOpen, CreditCard, Award, ArrowRight
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface NotificationsViewProps {
  role: 'student' | 'teacher' | 'parent'
  backLink: string
}

export function NotificationsView({ role, backLink }: NotificationsViewProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()
  const { 
    notifications, 
    unreadCount, 
    markRead, 
    markAllRead: markAllReadStore, 
    deleteNotification: deleteFromStore,
    clearAll: clearAllStore 
  } = useNotificationStore()
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedNotification, setSelectedNotification] = useState<any>(null)

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    return true
  })

  const handleMarkAsRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id)
    if (!notif || notif.read) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    
    if (!error) {
      markRead(id)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile?.id)
      .eq('read', false)
    
    if (error) {
      toast.error('Failed to update notifications')
    } else {
      markAllReadStore()
      toast.success('All marked as read')
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete notification')
    } else {
      deleteFromStore(id)
      toast.success('Notification removed')
    }
  }

  const handleClearAll = async () => {
    if (notifications.length === 0) return
    if (!confirm('Are you sure you want to clear all notifications?')) return
     
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', profile?.id)
    
    if (error) {
      toast.error('Failed to clear notifications')
    } else {
      clearAllStore()
      toast.success('Notifications cleared')
    }
  }

  const getIcon = (type: string, title: string) => {
    const t = title.toLowerCase()
    if (t.includes('assignment') || type === 'assignment_published') return <BookOpen size={18} />
    if (t.includes('quiz') || type === 'quiz_published') return <Zap size={18} />
    if (t.includes('payment') || type === 'payment_recorded') return <CreditCard size={18} />
    if (t.includes('award') || t.includes('badge') || type === 'achievement') return <Award size={18} />
    if (t.includes('pin') || type === 'alert') return <ShieldAlert size={18} />
    return <Bell size={18} />
  }

  const getTypeColor = (type: string, title: string) => {
    const t = title.toLowerCase()
    if (t.includes('pin') || type === 'alert') return 'bg-rose-500 text-white shadow-rose-500/20'
    if (type === 'warning') return 'bg-amber-500 text-white shadow-amber-500/20'
    if (type === 'achievement' || t.includes('award')) return 'bg-emerald-500 text-white shadow-emerald-500/20'
    return 'bg-primary text-white shadow-primary/20'
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-32">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-2xl p-3 h-12 w-12" 
            onClick={() => router.push(backLink)}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Intel & Alerts</h1>
            <p className="text-sm font-medium opacity-60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Stay updated with your latest activity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="primary" className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
              {unreadCount} New Update{unreadCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-2 bg-[var(--input)] rounded-3xl border border-[var(--card-border)] shadow-inner">
        <div className="flex items-center gap-1 p-1 bg-[var(--bg)] rounded-2xl shadow-sm border border-[var(--card-border)] w-full md:w-auto">
          <button 
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${filter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:text-[var(--text)]'}`}
          >
            All Logs
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${filter === 'unread' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:text-[var(--text)]'}`}
          >
            Unread
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-2xl text-[10px] font-black uppercase tracking-widest h-11 px-6 hover:bg-primary/5 hover:text-primary transition-all active:scale-95"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck size={14} className="mr-2" /> Mark All Read
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-2xl text-[10px] font-black uppercase tracking-widest h-11 px-6 text-rose-500 hover:bg-rose-500/5 transition-all active:scale-95"
            onClick={handleClearAll}
            disabled={notifications.length === 0}
          >
            <Trash2 size={14} className="mr-2" /> Wipe All
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredNotifications.map((n, i) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: -20 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              onClick={() => {
                handleMarkAsRead(n.id)
                setSelectedNotification(n)
                // if (n.data?.link) router.push(n.data.link as string)
              }}
              className="group cursor-pointer"
            >
              <Card className={`relative overflow-hidden p-0 border-none transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${!n.read ? 'bg-gradient-to-r from-primary/5 to-transparent' : 'opacity-70 grayscale-[0.3]'}`}>
                {/* Active Indicator Line */}
                {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />}
                
                <div className="p-5 md:p-6 flex gap-4 md:gap-6 items-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:rotate-6 ${getTypeColor(n.type, n.title)} shadow-lg`}>
                    {getIcon(n.type, n.title)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className={`text-sm md:text-base font-black truncate ${!n.read ? 'text-[var(--text)]' : 'text-muted'}`}>
                        {n.title}
                        {!n.read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />}
                      </h3>
                      <span className="text-[10px] font-bold text-muted opacity-40 whitespace-nowrap">
                        {formatDate(n.created_at, 'relative')} 
                      </span>
                    </div>
                    <p className="text-xs md:text-sm font-medium leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {n.body}
                    </p>
                  </div>

                  <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform duration-300">
                    {!n.read && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); }}
                        className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                        title="Mark as read"
                      >
                        <MailOpen size={16} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                      className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                      title="Delete"
                    >
                      <Trash size={16} />
                    </button>
                  </div>

                  {/* Mobile Quick Action Dot */}
                  <div className="md:hidden">
                    <MoreVertical size={18} className="text-muted opacity-40" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredNotifications.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="py-32 text-center space-y-8"
          >
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping" />
              <div className="relative w-32 h-32 rounded-[3rem] bg-primary/10 flex items-center justify-center text-primary border-4 border-white dark:border-[var(--bg)] shadow-2xl">
                <Bell size={48} className="opacity-40 animate-bounce" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black" style={{ color: 'var(--text)' }}>You're all caught up 🎉</h3>
              <p className="text-sm max-w-xs mx-auto text-muted font-medium">Your digital workspace is clear. We'll alert you the moment new intel arrives.</p>
            </div>
            <Button variant="secondary" className="rounded-2xl px-8 py-6 h-auto font-black uppercase text-xs tracking-widest" onClick={() => router.push(backLink)}>
              Back to Sector
            </Button>
          </motion.div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal 
        isOpen={!!selectedNotification} 
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title}
        size="md"
      >
        {selectedNotification && (
          <div className="space-y-6 py-2">
            <div className="flex items-center gap-4">
               <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor(selectedNotification.type, selectedNotification.title)} shadow-lg`}>
                  {getIcon(selectedNotification.type, selectedNotification.title)}
               </div>
               <div>
                  <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>Intel Received</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                     {formatDate(selectedNotification.created_at, 'long')}
                  </p>
               </div>
            </div>

            <div className="p-5 rounded-3xl border border-[var(--card-border)] bg-[var(--input)] shadow-inner">
               <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                  {selectedNotification.body}
               </p>
            </div>

            {selectedNotification.data?.link && (
               <Button 
                  className="w-full rounded-2xl h-12 font-black uppercase text-xs tracking-widest"
                  onClick={() => {
                    setSelectedNotification(null)
                    router.push(selectedNotification.data.link as string)
                  }}
               >
                  Go to Resource <ArrowRight size={14} className="ml-2" />
               </Button>
            )}

            <div className="flex gap-3">
               <Button 
                  variant="secondary" 
                  className="flex-1 rounded-2xl h-12 font-black uppercase text-xs tracking-widest"
                  onClick={() => setSelectedNotification(null)}
               >
                  Close
               </Button>
               <Button 
                  variant="ghost" 
                  className="flex-1 rounded-2xl h-12 font-black uppercase text-xs tracking-widest text-rose-500 hover:bg-rose-500/5"
                  onClick={() => {
                    handleDelete(selectedNotification.id)
                    setSelectedNotification(null)
                  }}
               >
                  Delete Log
               </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
