'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, Send, Users, Shield, UserCheck, GraduationCap, Clock, CheckCircle, Trash2, Search, Filter } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import type { Notification, Profile } from '@/types/database'

export default function AdminNotifications() {
  const supabase = getSupabaseBrowserClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [users, setUsers] = useState<Pick<Profile, 'id' | 'full_name' | 'role'>[]>([])
  const [loading, setLoading] = useState(true)
  const [sendOpen, setSendOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  const [form, setForm] = useState({
    title: '',
    body: '',
    target: 'all' as 'all' | 'specific_role' | 'specific_user',
    role: 'student' as 'admin' | 'teacher' | 'student' | 'parent',
    user_id: '',
    type: 'broadcast',
  })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: nRes }, { data: uRes }] = await Promise.all([
        supabase.from('notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, role'),
      ])
      setNotifications(nRes ?? [])
      setUsers(uRes ?? [])
    } catch (e) {
      console.error('Failed to load notifications:', e)
    } finally {
      setLoading(false)
    }
  }

  const broadcast = async () => {
    if (!form.title || !form.body) { toast.error('Fill in message'); return }
    
    let targetUserIds: string[] = []
    
    if (form.target === 'all') {
      targetUserIds = users.map(u => u.id)
    } else if (form.target === 'specific_role') {
      targetUserIds = users.filter(u => u.role === form.role).map(u => u.id)
    } else {
      targetUserIds = [form.user_id]
    }

    if (targetUserIds.length === 0) { toast.error('No users found for target'); return }

    const items = targetUserIds.map(uid => ({
      user_id: uid,
      title: form.title,
      body: form.body,
      type: form.type,
    }))

    const { error } = await supabase.from('notifications').insert(items)
    if (error) { toast.error(error.message); return }

    toast.success(`Notification sent to ${targetUserIds.length} users!`)
    setSendOpen(false)
    setForm({ ...form, title: '', body: '' })
    load()
  }

  const deleteNotice = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) { toast.error('Failed'); return }
    toast.success('Removed'); load()
  }

  const filtered = notifications.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.body.toLowerCase().includes(search.toLowerCase())
  )

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Shield size={14} />
    if (role === 'teacher') return <UserCheck size={14} />
    if (role === 'student') return <GraduationCap size={14} />
    return <Users size={14} />
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Global Notifications</h1>
           <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Broadcast messages and track alerts</p>
        </div>
        <Button onClick={() => setSendOpen(true)}><Send size={16} className="mr-2" /> Send Notification</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Alerts" value={notifications.length} icon={<Bell size={20} />} />
        <StatCard title="Today" value={notifications.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length} icon={<Clock size={20} />} />
        <StatCard title="Unread Total" value={notifications.filter(n => !n.read).length} icon={<CheckCircle size={20} />} />
        <StatCard title="Broadcasts" value={notifications.filter(n => n.type === 'broadcast').length} icon={<Users size={20} />} />
      </div>

      <div className="flex gap-4">
        <Input placeholder="Search messages…" leftIcon={<Search size={16} />} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <SkeletonList count={8} /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--input)' }}>
                     {['User', 'Message', 'Type', 'Status', 'Sent', 'Actions'].map(h => (
                       <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                     ))}
                  </tr>
               </thead>
               <tbody>
                  {filtered.map((n, i) => (
                    <motion.tr key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ borderBottom: '1px solid var(--card-border)' }}>
                       <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--primary)', color: 'white' }}>
                                {(n as any).user?.full_name?.[0] || '?'}
                             </div>
                             <div>
                                <div className="font-semibold" style={{ color: 'var(--text)' }}>{(n as any).user?.full_name || 'System'}</div>
                                <div className="text-[10px] capitalize flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                   {getRoleIcon((n as any).user?.role)} {(n as any).user?.role || 'user'}
                                </div>
                             </div>
                          </div>
                       </td>
                       <td className="px-5 py-3 max-w-sm">
                          <div className="font-bold truncate" style={{ color: 'var(--text)' }}>{n.title}</div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{n.body}</div>
                       </td>
                       <td className="px-5 py-3">
                          <Badge variant={n.type === 'broadcast' ? 'info' : 'muted'}>{n.type}</Badge>
                       </td>
                       <td className="px-5 py-3">
                          <Badge variant={n.read ? 'success' : 'warning'}>{n.read ? 'Read' : 'Unread'}</Badge>
                       </td>
                       <td className="px-5 py-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(n.created_at, 'short')}</td>
                       <td className="px-5 py-3">
                          <button onClick={() => deleteNotice(n.id)} className="p-2 rounded-lg text-danger hover:bg-danger-light"><Trash2 size={14} /></button>
                       </td>
                    </motion.tr>
                  ))}
               </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Send Modal */}
      <Modal isOpen={sendOpen} onClose={() => setSendOpen(false)} title="New Notification" size="md">
         <div className="space-y-4">
            <Select label="Recipient Target" value={form.target} onChange={e => setForm({...form, target: e.target.value as any})}>
               <option value="all">Everyone</option>
               <option value="specific_role">Specific Role</option>
               <option value="specific_user">Specific User</option>
            </Select>

            {form.target === 'specific_role' && (
              <Select label="Choose Role" value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                 <option value="student">Students</option>
                 <option value="teacher">Teachers</option>
                 <option value="parent">Parents</option>
                 <option value="admin">Admins</option>
              </Select>
            )}

            {form.target === 'specific_user' && (
              <Select label="Choose User" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})}>
                 <option value="">Select a user</option>
                 {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
              </Select>
            )}

            <Input label="Notification Title" placeholder="e.g. System Update" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <Textarea label="Message Body" placeholder="Enter your message here..." rows={4} value={form.body} onChange={e => setForm({...form, body: e.target.value})} />
            
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
               <span>Type:</span>
               <div className="flex gap-2">
                  {['broadcast', 'alert', 'info', 'warning'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setForm({...form, type: t})}
                      className="px-2 py-1 rounded-lg capitalize border"
                      style={{ 
                        background: form.type === t ? 'var(--primary)' : 'transparent',
                        color: form.type === t ? 'white' : 'var(--text-muted)',
                        borderColor: 'var(--card-border)'
                      }}
                    >
                      {t}
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
               <Button variant="secondary" onClick={() => setSendOpen(false)}>Cancel</Button>
               <Button onClick={broadcast}>Send Message</Button>
            </div>
         </div>
      </Modal>
    </div>
  )
}
