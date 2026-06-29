'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, Headphones, Loader2, MessageCircle, Phone, Send, Sparkles, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { askPublicSupport, requestHumanSupport, type PublicSupportMessage } from '@/app/actions/public-support'

const starterPrompts = [
  'How do I register for holiday tuition?',
  'Do you support CBC Grade 9?',
  'Where are you located?',
]

export function FloatingSupportChat() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [queuedMessages, setQueuedMessages] = useState<string[]>([])
  const [suggestionsUsed, setSuggestionsUsed] = useState(false)
  const sendingRef = useRef(false)
  const [handoffSending, setHandoffSending] = useState(false)
  const [handoff, setHandoff] = useState({ name: '', phone: '', email: '' })
  const [messages, setMessages] = useState<PublicSupportMessage[]>([
    {
      role: 'assistant',
      content: 'Hi, I am Peak Support. Ask about KCSE, CBC, holiday tuition, registration, fees, location, or request a human.',
    },
  ])

  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'user')?.content || input || 'I need human support.',
    [messages, input],
  )

  const isAppArea = /^\/(admin|student|teacher|parent|finance)(\/|$)/.test(pathname || '')
  if (isAppArea) return null

  const renderMessageContent = (content: string) => {
    const lines = content
      .replace(/\*\*/g, '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length <= 1) return <span>{content.replace(/\*\*/g, '')}</span>

    return (
      <div className="space-y-1.5">
        {lines.map((line, index) => {
          const cleaned = line.replace(/^[-*]\s*/, '').replace(/^\d+[.)]\s*/, '')
          const isList = /^[-*]\s*/.test(line) || /^\d+[.)]\s*/.test(line)
          return isList ? (
            <div key={`${cleaned}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7ed957]" />
              <span>{cleaned}</span>
            </div>
          ) : (
            <p key={`${cleaned}-${index}`} className={index === 0 ? 'font-black text-[#073159]' : ''}>{cleaned}</p>
          )
        })}
      </div>
    )
  }

  const sendMessage = async (text?: string, options?: { alreadyDisplayed?: boolean }) => {
    const content = String(text ?? input).trim()
    if (!content) return
    if (sendingRef.current) {
      setQueuedMessages((previous) => [...previous, content])
      setMessages((previous) => [...previous, { role: 'user', content }])
      setInput('')
      toast.success('Message queued')
      return
    }
    setSuggestionsUsed(true)
    const nextMessages: PublicSupportMessage[] = options?.alreadyDisplayed ? messages : [...messages, { role: 'user', content }]
    if (!options?.alreadyDisplayed) setMessages(nextMessages)
    setInput('')
    setSending(true)
    sendingRef.current = true
    try {
      const result = await askPublicSupport({
        message: content,
        history: messages,
        path: window.location.pathname,
      })
      if (!result.success) throw new Error(result.error || 'Support is unavailable.')
      setMessages((previous) => [...previous, { role: 'assistant', content: result.reply || '' }])
    } catch (error: any) {
      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: 'I could not reach Peak AI right now. Please WhatsApp or call 0798971625 for immediate help.' },
      ])
      toast.error(error?.message || 'Peak AI support is unavailable.')
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  useEffect(() => {
    if (sending || queuedMessages.length === 0) return
    const [next, ...rest] = queuedMessages
    setQueuedMessages(rest)
    void sendMessage(next, { alreadyDisplayed: true })
  }, [sending, queuedMessages])

  const submitHandoff = async (event: FormEvent) => {
    event.preventDefault()
    setHandoffSending(true)
    try {
      const result = await requestHumanSupport({
        ...handoff,
        message: lastUserMessage,
        transcript: messages,
        path: window.location.pathname,
      })
      if (!result.success) throw new Error(result.error || 'Could not request human support.')
      toast.success(result.message || 'Human support requested.')
      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: 'I have handed this to the Peak team. For urgent help, WhatsApp or call 0798971625.' },
      ])
      setHandoffOpen(false)
    } catch (error: any) {
      toast.error(error?.message || 'Could not request human support.')
    } finally {
      setHandoffSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-4 z-[80] sm:bottom-6 sm:right-6">
      {open && (
        <div className="mb-3 flex h-[min(78vh,620px)] w-[min(calc(100vw-1rem),390px)] flex-col overflow-hidden rounded-[1.5rem] border border-white/30 bg-white shadow-[0_28px_90px_rgba(2,6,23,0.28)]">
          <div className="bg-[#071a2d] p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#7ed957] text-[#073159]">
                  <Bot size={22} />
                </span>
                <div>
                  <div className="text-sm font-black">Peak Support</div>
                  <div className="mt-0.5 text-xs text-white/60">AI help plus human handoff</div>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close support chat">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f4f9fc] p-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#073159] text-white">
                    <Sparkles size={13} />
                  </span>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'bg-[#145da0] text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                  {message.role === 'assistant' ? renderMessageContent(message.content) : message.content}
                </div>
                {message.role === 'user' && (
                  <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eaf3f8] text-[#145da0]">
                    <UserRound size={13} />
                  </span>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-500 shadow-sm">
                <Loader2 size={14} className="animate-spin" /> Peak AI is thinking...
              </div>
            )}
          </div>

          {!handoffOpen ? (
            <div className="border-t border-slate-200 bg-white p-3">
              {!suggestionsUsed && messages.length <= 1 && <div className="mb-2 flex flex-wrap gap-1.5">
                {starterPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => sendMessage(prompt)} className="rounded-full bg-[#eaf3f8] px-3 py-1.5 text-[11px] font-bold text-[#145da0] hover:bg-[#d8edf8]">
                    {prompt}
                  </button>
                ))}
              </div>}
              {queuedMessages.length > 0 && (
                <div className="mb-2 rounded-2xl bg-[#fff8db] px-3 py-2 text-xs font-black text-[#7a5a00]">
                  {queuedMessages.length} message{queuedMessages.length === 1 ? '' : 's'} queued
                </div>
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  sendMessage()
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask Peak or request human support..."
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#145da0]"
                />
                <button type="submit" disabled={sending || !input.trim()} className="grid h-10 w-10 place-items-center rounded-2xl bg-[#073159] text-white disabled:opacity-50" aria-label="Send message">
                  <Send size={16} />
                </button>
              </form>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setHandoffOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#145da0]/15 px-3 py-2 text-xs font-black text-[#145da0] hover:bg-[#eaf3f8]">
                  <Headphones size={14} /> Human
                </button>
                <a href="https://wa.me/254798971625" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7ed957] px-3 py-2 text-xs font-black text-[#073159]">
                  <Phone size={14} /> WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={submitHandoff} className="border-t border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#145da0]">Human handoff</div>
              <div className="grid gap-2">
                <input value={handoff.name} onChange={(event) => setHandoff((prev) => ({ ...prev, name: event.target.value }))} placeholder="Name" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#145da0]" />
                <input value={handoff.phone} onChange={(event) => setHandoff((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone / WhatsApp" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#145da0]" />
                <input value={handoff.email} onChange={(event) => setHandoff((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email optional" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#145da0]" />
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setHandoffOpen(false)} className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Back</button>
                <button type="submit" disabled={handoffSending} className="flex-1 rounded-2xl bg-[#073159] px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                  {handoffSending ? 'Sending...' : 'Send to human'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="group flex h-14 items-center gap-3 rounded-full bg-[#073159] px-4 text-white shadow-[0_18px_50px_rgba(7,49,89,0.35)] transition hover:-translate-y-1 hover:bg-[#145da0]"
        aria-label="Open Peak support chat"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#7ed957] text-[#073159]">
          <MessageCircle size={19} />
        </span>
        <span className="hidden pr-1 text-sm font-black sm:inline">Ask Peak</span>
      </button>
    </div>
  )
}
