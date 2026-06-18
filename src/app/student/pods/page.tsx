'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, MessageSquare, Send, ArrowLeft, Hash } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'
import { getStudentPods, joinPod, createPod, getPodMessages, sendPodMessage } from '@/app/actions/pods'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function StudyPods() {
  const { student, profile } = useAuthStore()
  const [pods, setPods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Creation
  const [isCreating, setIsCreating] = useState(false)
  const [newPodName, setNewPodName] = useState('')
  const [newPodDesc, setNewPodDesc] = useState('')

  // Active Pod / Chat
  const [activePod, setActivePod] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (student?.id) loadPods()
  }, [student?.id])

  const loadPods = async () => {
    if (!student?.id) return
    try {
      const data = await getStudentPods(student.id, (student as any).class_id)
      setPods(data)
    } catch (e) {
      toast.error('Failed to load study pods')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePod = async () => {
    if (!newPodName) return
    try {
      const p = await createPod(newPodName, newPodDesc, student!.id, (student as any).class_id)
      setIsCreating(false)
      setNewPodName('')
      setNewPodDesc('')
      loadPods()
      toast.success('Study Pod created!')
    } catch (e) {
      toast.error('Failed to create pod')
    }
  }

  const handleJoinPod = async (podId: string) => {
    try {
      await joinPod(podId, student!.id)
      toast.success('Joined Pod!')
      loadPods()
    } catch (e) {
      toast.error('Failed to join pod')
    }
  }

  const openPod = async (pod: any) => {
    setActivePod(pod)
    try {
      const msgs = await getPodMessages(pod.id)
      setMessages(msgs)
    } catch (e) {
      toast.error('Failed to load messages')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activePod) return
    
    // Optimistic UI
    const optimisticMsg = {
      id: Math.random().toString(),
      content: newMessage,
      student_id: student!.id,
      created_at: new Date().toISOString(),
      student: { full_name: profile?.full_name || 'You', avatar_url: profile?.avatar_url }
    }
    setMessages(prev => [...prev, optimisticMsg])
    const contentToSend = newMessage
    setNewMessage('')
    
    try {
      await sendPodMessage(activePod.id, student!.id, contentToSend)
    } catch (e) {
      toast.error('Failed to send message')
      // Remove optimistic msg if failed (lazy approach: just reload)
      const msgs = await getPodMessages(activePod.id)
      setMessages(msgs)
    }
  }

  // Realtime subscription for messages
  useEffect(() => {
    if (!activePod?.id) return

    const supabase = getSupabaseBrowserClient()
    const channel = supabase.channel(`pod_${activePod.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pod_messages', filter: `pod_id=eq.${activePod.id}` }, async (payload) => {
        // Fetch the message with relations to get the sender's name/avatar
        const { data } = await supabase.from('pod_messages').select('*, student:students(full_name, avatar_url)').eq('id', payload.new.id).single()
        if (data) {
          // Prevent duplicating optimistic updates
          setMessages(prev => {
            if (prev.find(m => m.id === data.id || (m.student_id === data.student_id && m.content === data.content && new Date(data.created_at).getTime() - new Date(m.created_at).getTime() < 5000))) {
              // replace optimistic with real
              return prev.map(m => m.content === data.content ? data : m)
            }
            return [...prev, data]
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activePod?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (loading) return <div className="p-6 flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>

  if (activePod) {
    return (
      <div className="flex flex-col h-screen md:h-[calc(100vh-80px)] pb-20 md:pb-0" style={{ background: 'var(--bg)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)]">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setActivePod(null)} className="p-2 -ml-2 rounded-full">
              <ArrowLeft size={20} />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Hash size={20} />
            </div>
            <div>
              <h2 className="font-black text-lg leading-tight" style={{ color: 'var(--text)' }}>{activePod.name}</h2>
              <p className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                <Users size={10} /> {activePod.members?.[0]?.count || 1} Members
              </p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
              <MessageSquare size={48} className="mb-4 text-muted" />
              <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Welcome to {activePod.name}!</p>
              <p className="text-xs text-muted">Say hello to your study group.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.student_id === student?.id
              return (
                <div key={msg.id || i} className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                  {!isMe && (
                    <Avatar url={msg.student?.avatar_url} name={msg.student?.full_name} size="sm" className="mt-1" />
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span className="text-[10px] font-bold text-muted ml-1 mb-1">{msg.student?.full_name}</span>}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-violet-500 text-white rounded-tr-sm' : 'bg-[var(--card)] border border-[var(--card-border)] rounded-tl-sm text-[var(--text)]'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[var(--card)] border-t border-[var(--card-border)]">
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
            <Input 
              placeholder="Message the pod..." 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              className="rounded-full bg-[var(--input)] border-transparent focus:border-violet-500"
            />
            <Button type="submit" disabled={!newMessage.trim()} className="rounded-full w-10 h-10 p-0 shrink-0 bg-violet-500 hover:bg-violet-600 border-none text-white">
              <Send size={16} className="-ml-0.5 mt-0.5" />
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Peer Study Pods</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Join class groups to discuss assignments and revise together.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="rounded-2xl shadow-lg shadow-violet-500/20 bg-violet-500 hover:bg-violet-600 border-none text-white">
          <Plus size={16} className="mr-2" /> Create Pod
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="p-6 border-violet-500/20 bg-violet-500/5 shadow-xl mb-6">
              <h3 className="font-black text-sm mb-4 text-violet-500">Create a Study Pod</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input placeholder="Pod Name (e.g. Science Revision Squad)" value={newPodName} onChange={e => setNewPodName(e.target.value)} className="rounded-xl" />
                <Input placeholder="Description" value={newPodDesc} onChange={e => setNewPodDesc(e.target.value)} className="rounded-xl" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button onClick={handleCreatePod} disabled={!newPodName} className="bg-violet-500 hover:bg-violet-600 border-none text-white rounded-xl">Create</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pods.map((pod: any) => (
          <motion.div key={pod.id} whileHover={{ y: -5 }}>
            <Card className="p-6 h-full flex flex-col hover:shadow-xl hover:shadow-violet-500/10 transition-all border-l-4 border-l-violet-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>{pod.name}</h3>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                  <Users size={20} />
                </div>
              </div>
              <p className="text-xs mb-6 text-muted line-clamp-2">{pod.description || 'No description'}</p>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
                <div className="text-[10px] font-bold text-muted flex items-center gap-1">
                  <span className="text-violet-500 font-black">{pod.members?.[0]?.count || 1}</span> Members
                </div>
                {pod.hasJoined ? (
                  <Button size="sm" onClick={() => openPod(pod)} className="rounded-xl bg-violet-500 hover:bg-violet-600 text-white border-none">
                    Enter Chat
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => handleJoinPod(pod.id)} className="rounded-xl border-violet-500/20 text-violet-500 hover:bg-violet-500/10">
                    Join Pod
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}

        {pods.length === 0 && !isCreating && (
          <div className="col-span-full p-12 text-center">
            <Users size={48} className="mx-auto text-muted opacity-20 mb-4" />
            <p className="text-sm font-bold text-muted mb-4">No study pods available for your class yet.</p>
            <Button onClick={() => setIsCreating(true)} className="rounded-2xl bg-violet-500 text-white border-none">Be the first to create one!</Button>
          </div>
        )}
      </div>
    </div>
  )
}
