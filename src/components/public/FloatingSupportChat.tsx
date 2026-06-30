'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'
import { CalendarDays, CheckCircle2, Edit3, Eraser, Expand, FileSearch, Headphones, Loader2, MapPin, MessageCircle, Minimize2, Phone, PlusCircle, Send, SlidersHorizontal, Trash2, UploadCloud, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeResultSlip, askPublicSupport, getApexThreadMessages, registerFromApex, requestHumanSupport, sendApexVisitorMessage, type PublicSupportMessage } from '@/app/actions/public-support'

const APEX_AVATAR = '/apex-assistant.png'
const APEX_STORAGE_KEY = 'peak-apex-current-conversation'
const APEX_ARCHIVE_KEY = 'peak-apex-conversation-archive'
const APEX_CONVERSATION_KEY = 'peak-apex-conversation-id'
const createWelcomeMessage = (): PublicSupportMessage => ({
  role: 'assistant',
  content: 'Hi, I am APEX, your Peak tutoring assistant. I can help with KCSE, CBC, holiday tuition, result slips, study diagnosis, registration, fees, location, or human support.',
})

const starterPrompts = [
  'I am failing Mathematics',
  'Analyse my result slip',
  'How can Peak help me improve?',
]

type QueuedMessage = {
  id: string
  content: string
  steering: string
}

function createQueueId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export function FloatingSupportChat() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [humanMode, setHumanMode] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])
  const [suggestionsUsed, setSuggestionsUsed] = useState(false)
  const sendingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [handoffSending, setHandoffSending] = useState(false)
  const [handoff, setHandoff] = useState({ name: '', phone: '', email: '' })
  const [steeringOpen, setSteeringOpen] = useState(false)
  const [steering, setSteering] = useState('')
  const [resultSlipOpen, setResultSlipOpen] = useState(false)
  const [resultFile, setResultFile] = useState<File | null>(null)
  const [resultNotes, setResultNotes] = useState('')
  const [analyzingSlip, setAnalyzingSlip] = useState(false)
  const [apexEvents, setApexEvents] = useState<any[]>([])
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false)
  const [registration, setRegistration] = useState({
    studentName: '',
    parentName: '',
    parentPhone: '',
    studentPhone: '',
    schoolName: '',
    curriculum: 'CBC',
    classLevel: 'Grade 9',
    eventId: '',
    programmeSelected: '',
    preferredMode: 'Group Tuition',
    overallGrade: '',
    subjectResultsText: '',
  })
  const [messages, setMessages] = useState<PublicSupportMessage[]>([createWelcomeMessage()])
  const [conversationId, setConversationId] = useState('')
  const [lastHumanMessageAt, setLastHumanMessageAt] = useState('')

  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'user')?.content || input || 'I need human support.',
    [messages, input],
  )

  const isAppArea = /^\/(admin|student|teacher|parent|finance)(\/|$)/.test(pathname || '')

  const renderMessageContent = (content: string) => {
    const lines = content
      .replace(/\*\*/g, '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length <= 1) return <span>{content.replace(/\*\*/g, '')}</span>

    return (
      <div className="relative space-y-0 pl-7">
        <div className="absolute bottom-1 left-[9px] top-2 w-px bg-[#d9edf8]" />
        {lines.map((line, index) => {
          const cleaned = line.replace(/^[-*]\s*/, '').replace(/^\d+[.)]\s*/, '')
          const isList = /^[-*]\s*/.test(line) || /^\d+[.)]\s*/.test(line)
          return isList ? (
            <div key={`${cleaned}-${index}`} className="relative flex gap-2 pb-2">
              <span className="absolute left-[-25px] top-1 grid h-4 w-4 place-items-center rounded-full bg-[#edffe5] text-[#145da0] ring-2 ring-white">
                <CheckCircle2 size={10} />
              </span>
              <span>{cleaned}</span>
            </div>
          ) : (
            <p key={`${cleaned}-${index}`} className={`relative pb-2 ${index === 0 ? 'font-black text-[#073159]' : ''}`}>
              <span className="absolute left-[-23px] top-2 h-2.5 w-2.5 rounded-full bg-[#145da0] ring-2 ring-white" />
              {cleaned}
            </p>
          )
        })}
      </div>
    )
  }

  const sendMessage = async (text?: string, options?: { alreadyDisplayed?: boolean; steeringOverride?: string }) => {
    const content = String(text ?? input).trim()
    if (!content) return
    if (humanMode && conversationId) {
      setMessages((previous) => [...previous, { role: 'user', content }])
      setInput('')
      const result = await sendApexVisitorMessage({ conversationId, message: content, name: handoff.name || 'Website visitor' })
      if (!result.success) toast.error(result.error || 'Could not send to admin.')
      return
    }
    if (sendingRef.current) {
      setQueuedMessages((previous) => [...previous, { id: createQueueId(), content, steering }])
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
        steering: options?.steeringOverride ?? steering,
      })
      if (!result.success) throw new Error(result.error || 'Support is unavailable.')
      setMessages((previous) => [...previous, { role: 'assistant', content: result.reply || '' }])
      if (Array.isArray(result.events) && result.events.length) {
        setApexEvents(result.events)
        const firstEvent = result.events[0]
        setRegistration((previous) => ({
          ...previous,
          eventId: firstEvent.id || previous.eventId,
          programmeSelected: firstEvent.name || previous.programmeSelected,
          preferredMode: 'Group Tuition',
        }))
        setRegistrationOpen(true)
      }
      if (result.needsHuman && result.urgency === 'high') {
        setHandoffOpen(true)
      }
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

  const readFilePayload = (file: File) => new Promise<{ dataUrl?: string; extractedText?: string }>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the uploaded file.'))
    if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.csv')) {
      reader.onload = () => resolve({ extractedText: String(reader.result || '') })
      reader.readAsText(file)
      return
    }
    reader.onload = () => resolve({ dataUrl: String(reader.result || '') })
    reader.readAsDataURL(file)
  })

  const submitResultSlip = async () => {
    if (!resultFile && !resultNotes.trim()) {
      toast.error('Upload the result slip or type the marks first.')
      return
    }
    if (resultFile && resultFile.size > 4 * 1024 * 1024) {
      toast.error('Please upload a result slip under 4MB.')
      return
    }

    setSuggestionsUsed(true)
    setAnalyzingSlip(true)
    const userContent = resultFile
      ? `Uploaded result slip: ${resultFile.name}${resultNotes.trim() ? `\nNotes: ${resultNotes.trim()}` : ''}`
      : `Result slip marks typed:\n${resultNotes.trim()}`
    setMessages((previous) => [...previous, { role: 'user', content: userContent }])

    try {
      const payload = resultFile ? await readFilePayload(resultFile) : { extractedText: resultNotes }
      const result = await analyzeResultSlip({
        fileName: resultFile?.name || 'typed-result-slip',
        mimeType: resultFile?.type || 'text/plain',
        dataUrl: payload.dataUrl,
        extractedText: payload.extractedText || resultNotes,
        notes: resultNotes,
        history: messages,
        path: window.location.pathname,
      })
      if (!result.success) throw new Error(result.error || 'Could not analyse result slip.')
      setMessages((previous) => [...previous, { role: 'assistant', content: result.reply || '' }])
      setResultSlipOpen(false)
      setResultFile(null)
      setResultNotes('')
      setHandoffOpen(true)
    } catch (error: any) {
      toast.error(error?.message || 'Could not analyse result slip.')
      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: 'I could not complete the result-slip analysis. Type the subjects and marks here, or WhatsApp 0798971625 for human review.' },
      ])
    } finally {
      setAnalyzingSlip(false)
    }
  }

  const updateQueuedMessage = (id: string, value: string) => {
    setQueuedMessages((previous) => previous.map((item) => item.id === id ? { ...item, content: value } : item))
  }

  const updateQueuedSteering = (id: string, value: string) => {
    setQueuedMessages((previous) => previous.map((item) => item.id === id ? { ...item, steering: value } : item))
  }

  const deleteQueuedMessage = (id: string) => {
    setQueuedMessages((previous) => previous.filter((item) => item.id !== id))
  }

  const resetConversationState = () => {
    setMessages([createWelcomeMessage()])
    setInput('')
    setQueuedMessages([])
    setSuggestionsUsed(false)
    setHandoffOpen(false)
    setHumanMode(false)
    setSteeringOpen(false)
    setResultSlipOpen(false)
    setResultFile(null)
    setResultNotes('')
  }

  const startNewConversation = () => {
    if (messages.length > 1) {
      try {
        const archive = JSON.parse(localStorage.getItem(APEX_ARCHIVE_KEY) || '[]')
        const nextArchive = [
          { id: crypto.randomUUID(), createdAt: new Date().toISOString(), messages: messages.slice(-30) },
          ...(Array.isArray(archive) ? archive : []),
        ].slice(0, 8)
        localStorage.setItem(APEX_ARCHIVE_KEY, JSON.stringify(nextArchive))
      } catch {
        // Local persistence is helpful, not critical.
      }
    }
    resetConversationState()
    localStorage.removeItem(APEX_STORAGE_KEY)
    localStorage.removeItem(APEX_CONVERSATION_KEY)
    setConversationId(createQueueId())
    toast.success('New APEX conversation started')
  }

  const clearConversation = () => {
    resetConversationState()
    localStorage.removeItem(APEX_STORAGE_KEY)
    setHumanMode(false)
    toast.success('APEX chat cleared')
  }

  const ensureHumanThread = async (reason = 'Visitor requested human support from APEX chat.') => {
    const activeConversationId = conversationId || createQueueId()
    setConversationId(activeConversationId)
    localStorage.setItem(APEX_CONVERSATION_KEY, activeConversationId)
    setHumanMode(true)
    const result = await requestHumanSupport({
      ...handoff,
      message: reason || lastUserMessage,
      transcript: messages,
      path: window.location.pathname,
      conversationId: activeConversationId,
    })
    if (!result.success) {
      toast.error(result.error || 'Could not notify admin.')
      return false
    }
    setMessages((previous) => [
      ...previous,
      { role: 'assistant', content: 'Human support is now connected. An admin can reply here in this APEX chat. You can keep typing while you wait.' },
    ])
    toast.success('Admin has been notified')
    return true
  }

  const submitApexRegistration = async () => {
    if (!registration.studentName || !registration.parentName || !registration.parentPhone || !registration.schoolName || !registration.eventId || !registration.overallGrade || !registration.subjectResultsText.trim()) {
      toast.error('Add student, parent, school, event, grade and at least one subject result.')
      return
    }
    setRegistrationSubmitting(true)
    try {
      const result = await registerFromApex({ ...registration, path: window.location.pathname })
      if (!result.success) throw new Error(result.error || 'Registration failed.')
      toast.success(result.message || 'Registration submitted.')
      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: `Registration submitted for ${registration.studentName}. Peak Performance will review the details and contact ${registration.parentName} on ${registration.parentPhone}.` },
      ])
      setRegistrationOpen(false)
      setHandoffOpen(true)
    } catch (error: any) {
      toast.error(error?.message || 'Registration failed.')
    } finally {
      setRegistrationSubmitting(false)
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(APEX_STORAGE_KEY)
      const savedConversationId = localStorage.getItem(APEX_CONVERSATION_KEY)
      if (savedConversationId) {
        setConversationId(savedConversationId)
        setHumanMode(true)
      } else {
        const nextConversationId = createQueueId()
        setConversationId(nextConversationId)
        localStorage.setItem(APEX_CONVERSATION_KEY, nextConversationId)
      }
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed?.messages) && parsed.messages.length) {
        setMessages(parsed.messages.slice(-40))
        setSuggestionsUsed(parsed.messages.length > 1)
      }
      if (typeof parsed?.steering === 'string') setSteering(parsed.steering)
    } catch {
      localStorage.removeItem(APEX_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (!humanMode || !conversationId) return
    let cancelled = false
    const poll = async () => {
      const result = await getApexThreadMessages({ conversationId, after: lastHumanMessageAt || undefined })
      if (!result.success || cancelled) return
      const adminMessages = (result.messages || []).filter((item: any) => item.author_role === 'admin')
      if (adminMessages.length > 0) {
        setLastHumanMessageAt(adminMessages[adminMessages.length - 1].created_at)
        setMessages((previous) => {
          const existing = new Set(previous.map((message) => `${message.role}:${message.content}`))
          const next = adminMessages
            .map((item: any) => ({ role: 'assistant' as const, content: `Peak Admin: ${item.body}` }))
            .filter((item) => !existing.has(`${item.role}:${item.content}`))
          return next.length ? [...previous, ...next] : previous
        })
      }
    }
    void poll()
    const timer = window.setInterval(poll, 7000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [humanMode, conversationId, lastHumanMessageAt])

  useEffect(() => {
    try {
      localStorage.setItem(APEX_STORAGE_KEY, JSON.stringify({ messages: messages.slice(-40), steering, updatedAt: new Date().toISOString() }))
    } catch {
      // Ignore storage quota or private-mode failures.
    }
  }, [messages, steering])

  useEffect(() => {
    if (sending || queuedMessages.length === 0) return
    const [next, ...rest] = queuedMessages
    setQueuedMessages(rest)
    void sendMessage(next.content, { steeringOverride: next.steering })
  }, [sending, queuedMessages])

  if (isAppArea) return null

  const submitHandoff = async (event: FormEvent) => {
    event.preventDefault()
    setHandoffSending(true)
    try {
      const result = await requestHumanSupport({
        ...handoff,
        message: lastUserMessage,
        transcript: messages,
        path: window.location.pathname,
        conversationId,
      })
      if (!result.success) throw new Error(result.error || 'Could not request human support.')
      toast.success(result.message || 'Human support requested.')
      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: 'I have handed this to the Peak team. You can keep chatting here; an admin can reply inside this APEX chat.' },
      ])
      if (result.conversationId) {
        setConversationId(result.conversationId)
        localStorage.setItem(APEX_CONVERSATION_KEY, result.conversationId)
      }
      setHumanMode(true)
      setHandoffOpen(false)
    } catch (error: any) {
      toast.error(error?.message || 'Could not request human support.')
    } finally {
      setHandoffSending(false)
    }
  }

  return (
    <div className={fullscreen ? 'fixed inset-0 z-[240] bg-[#071a2d]/70 p-2 backdrop-blur sm:p-4' : 'fixed bottom-5 right-4 z-[80] sm:bottom-6 sm:right-6'}>
      {open && (
        <div className={`${fullscreen ? 'mx-auto flex h-full w-full max-w-5xl' : 'mb-3 flex h-[min(78vh,620px)] w-[min(calc(100vw-1rem),390px)]'} flex-col overflow-hidden rounded-[1.5rem] border border-white/30 bg-white shadow-[0_28px_90px_rgba(2,6,23,0.28)]`}>
          <div className="bg-[#071a2d] p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 overflow-hidden rounded-2xl bg-white shadow-[0_10px_26px_rgba(0,0,0,0.22)] ring-2 ring-[#7ed957]/70">
                  <img src={APEX_AVATAR} alt="APEX tutoring assistant" className="h-full w-full object-cover" />
                </span>
                <div>
                  <div className="text-sm font-black">APEX</div>
                  <div className="mt-0.5 text-xs text-white/60">Tutoring diagnosis plus human handoff</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={startNewConversation} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Start new APEX conversation">
                  <PlusCircle size={17} />
                </button>
                <button type="button" onClick={clearConversation} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Clear APEX chat">
                  <Eraser size={17} />
                </button>
                <button type="button" onClick={() => setFullscreen((value) => !value)} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label={fullscreen ? 'Exit fullscreen APEX chat' : 'Open fullscreen APEX chat'}>
                  {fullscreen ? <Minimize2 size={17} /> : <Expand size={17} />}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close support chat">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f4f9fc] p-3">
            {apexEvents.length > 0 && (
              <div className="rounded-2xl border border-[#145da0]/10 bg-white p-3 shadow-sm">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#145da0]">Matched group tuition</div>
                <div className="grid gap-2">
                  {apexEvents.slice(0, fullscreen ? 3 : 2).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        setRegistration((previous) => ({ ...previous, eventId: event.id, programmeSelected: event.name }))
                        setRegistrationOpen(true)
                      }}
                      className="rounded-xl border border-[#145da0]/10 bg-[#f8fbfd] p-3 text-left transition hover:border-[#7ed957]/60 hover:bg-[#edffe5]"
                    >
                      <div className="text-sm font-black text-[#073159]">{event.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'date TBC'}</span>
                        <span className="inline-flex items-center gap-1"><MapPin size={11} /> {event.event_location || 'venue TBC'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <span className="mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-[#7ed957]/50">
                    <img src={APEX_AVATAR} alt="APEX" className="h-full w-full object-cover" />
                  </span>
                )}
                <div className={`max-w-[82%] overflow-hidden rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'bg-[#145da0] text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
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
              <div className="flex items-start gap-2 rounded-2xl border border-[#7ed957]/30 bg-white px-3 py-3 shadow-[0_12px_30px_rgba(7,49,89,0.08)]">
                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-[#7ed957]/50">
                  <img src={APEX_AVATAR} alt="APEX" className="h-full w-full object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#145da0]">
                    APEX is working
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7ed957]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7ed957] [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7ed957] [animation-delay:240ms]" />
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Reading context, checking the best next question, and preparing a useful response.</p>
                </div>
              </div>
            )}
          </div>

          {!handoffOpen ? (
            <div className="border-t border-slate-200 bg-white p-3">
              {registrationOpen && (
                <div className="mb-2 rounded-2xl border border-[#145da0]/15 bg-[#f8fbfd] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-[#145da0]">APEX registration</div>
                    <button type="button" onClick={() => setRegistrationOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={15} /></button>
                  </div>
                  <div className={`grid gap-2 ${fullscreen ? 'sm:grid-cols-2' : ''}`}>
                    <input value={registration.studentName} onChange={(event) => setRegistration((prev) => ({ ...prev, studentName: event.target.value }))} placeholder="Student full name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]" />
                    <input value={registration.parentName} onChange={(event) => setRegistration((prev) => ({ ...prev, parentName: event.target.value }))} placeholder="Parent name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]" />
                    <input value={registration.parentPhone} onChange={(event) => setRegistration((prev) => ({ ...prev, parentPhone: event.target.value }))} placeholder="Parent phone" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]" />
                    <input value={registration.schoolName} onChange={(event) => setRegistration((prev) => ({ ...prev, schoolName: event.target.value }))} placeholder="School name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]" />
                    <input value={registration.curriculum} onChange={(event) => setRegistration((prev) => ({ ...prev, curriculum: event.target.value }))} placeholder="Curriculum e.g. CBC" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]" />
                    <input value={registration.classLevel} onChange={(event) => setRegistration((prev) => ({ ...prev, classLevel: event.target.value }))} placeholder="Class e.g. Grade 9" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]" />
                    <select value={registration.eventId} onChange={(event) => {
                      const selected = apexEvents.find((item) => item.id === event.target.value)
                      setRegistration((prev) => ({ ...prev, eventId: event.target.value, programmeSelected: selected?.name || prev.programmeSelected }))
                    }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none focus:border-[#145da0]">
                      <option value="">Choose programme</option>
                      {apexEvents.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
                    </select>
                    <input value={registration.overallGrade} onChange={(event) => setRegistration((prev) => ({ ...prev, overallGrade: event.target.value }))} placeholder="Overall grade / level" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]" />
                  </div>
                  <textarea value={registration.subjectResultsText} onChange={(event) => setRegistration((prev) => ({ ...prev, subjectResultsText: event.target.value }))} rows={2} placeholder="Subject results, e.g. Mathematics: Approaching - algebra, English: Meeting - composition" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]" />
                  <button type="button" onClick={submitApexRegistration} disabled={registrationSubmitting} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#073159] px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                    {registrationSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {registrationSubmitting ? 'Submitting registration...' : 'Submit registration to Peak'}
                  </button>
                </div>
              )}
              <div className="mb-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setResultSlipOpen((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#edffe5] px-3 py-2 text-xs font-black text-[#073159] hover:bg-[#dcffd0]">
                  <FileSearch size={14} /> Result slip
                </button>
                <button type="button" onClick={() => setSteeringOpen((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#eaf3f8] px-3 py-2 text-xs font-black text-[#145da0] hover:bg-[#d8edf8]">
                  <SlidersHorizontal size={14} /> Steer
                </button>
              </div>
              {steeringOpen && queuedMessages.length === 0 && (
                <div className="mb-2 rounded-2xl border border-[#145da0]/10 bg-[#f4f9fc] p-2">
                  <textarea
                    value={steering}
                    onChange={(event) => setSteering(event.target.value)}
                    rows={2}
                    placeholder="Steer APEX, e.g. ask one question at a time, focus on Form 4 Chemistry..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]"
                  />
                </div>
              )}
              {resultSlipOpen && (
                <div className="mb-2 rounded-2xl border border-[#7ed957]/30 bg-[#f7fff4] p-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.txt,.csv"
                    className="hidden"
                    onChange={(event) => setResultFile(event.target.files?.[0] || null)}
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#145da0]/15 bg-white px-3 py-2 text-xs font-black text-[#145da0]">
                    <UploadCloud size={14} /> {resultFile ? resultFile.name : 'Upload result slip'}
                  </button>
                  <textarea
                    value={resultNotes}
                    onChange={(event) => setResultNotes(event.target.value)}
                    rows={2}
                    placeholder="Optional: type curriculum, class/form, target exam, or marks if the image is unclear."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]"
                  />
                  <button type="button" onClick={submitResultSlip} disabled={analyzingSlip} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#073159] px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                    {analyzingSlip ? <Loader2 size={14} className="animate-spin" /> : <FileSearch size={14} />}
                    {analyzingSlip ? 'Analysing result slip...' : 'Analyse like a tutor'}
                  </button>
                </div>
              )}
              {!suggestionsUsed && messages.length <= 1 && <div className="mb-2 flex flex-wrap gap-1.5">
                {starterPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => sendMessage(prompt)} className="rounded-full bg-[#eaf3f8] px-3 py-1.5 text-[11px] font-bold text-[#145da0] hover:bg-[#d8edf8]">
                    {prompt}
                  </button>
                ))}
              </div>}
              {queuedMessages.length > 0 && (
                <div className="mb-2 space-y-2 rounded-2xl bg-[#fff8db] p-2 text-xs text-[#7a5a00]">
                  <div className="font-black">{queuedMessages.length} pending message{queuedMessages.length === 1 ? '' : 's'}</div>
                  {queuedMessages.map((queued, index) => (
                    <div key={queued.id} className="rounded-xl bg-white/80 p-2 shadow-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7a5a00]">Queue {index + 1}</span>
                        <button type="button" onClick={() => deleteQueuedMessage(queued.id)} className="rounded-lg p-1 text-red-600 hover:bg-red-50" aria-label="Delete queued message">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Edit3 size={12} className="shrink-0" />
                        <input
                          value={queued.content}
                          onChange={(event) => updateQueuedMessage(queued.id, event.target.value)}
                          className="min-w-0 flex-1 rounded-lg bg-white px-2 py-1 text-xs font-bold text-[#073159] outline-none ring-1 ring-[#f1df8a] focus:ring-[#145da0]"
                        />
                      </div>
                      <textarea
                        value={queued.steering}
                        onChange={(event) => updateQueuedSteering(queued.id, event.target.value)}
                        rows={2}
                        placeholder="Steer this queued message, e.g. ask one question first, be brief, focus on study habits..."
                        className="mt-1.5 w-full resize-none rounded-lg bg-white px-2 py-1.5 text-xs text-[#073159] outline-none ring-1 ring-[#f1df8a] placeholder:text-slate-400 focus:ring-[#145da0]"
                      />
                    </div>
                  ))}
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
                  placeholder="Ask APEX or request human support..."
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#073159] outline-none placeholder:text-slate-400 focus:border-[#145da0]"
                />
                <button type="submit" disabled={!input.trim()} className="grid h-10 w-10 place-items-center rounded-2xl bg-[#073159] text-white disabled:opacity-50" aria-label="Send message">
                  <Send size={16} />
                </button>
              </form>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { void ensureHumanThread('Visitor clicked the Human button in APEX chat.') }} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#145da0]/15 px-3 py-2 text-xs font-black text-[#145da0] hover:bg-[#eaf3f8]">
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
        className="group flex h-14 items-center gap-3 rounded-full bg-[#073159] px-3 pr-4 text-white shadow-[0_18px_50px_rgba(7,49,89,0.35)] transition hover:-translate-y-1 hover:bg-[#145da0]"
        aria-label="Open APEX support chat"
      >
        <span className="h-10 w-10 overflow-hidden rounded-full bg-white ring-2 ring-[#7ed957]">
          <img src={APEX_AVATAR} alt="APEX tutoring assistant" className="h-full w-full object-cover" />
        </span>
        <span className="hidden items-center gap-1 pr-1 text-sm font-black sm:inline-flex">Ask APEX <MessageCircle size={14} /></span>
      </button>
    </div>
  )
}
