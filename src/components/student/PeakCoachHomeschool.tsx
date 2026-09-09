'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Send, ChevronDown, Maximize2, MinusCircle,
  Loader2, Lock, Sparkles, ShieldAlert, Target,
  BookOpen, Lightbulb, CheckCircle2, PenTool,
  ArrowRight, Bot, ListChecks, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { chatWithPeakCoach } from '@/app/actions/homeschooling-ai'
import type { Message } from '@/app/actions/homeschooling-ai'
import type { LearningObjective, LearningResource } from '@/types/homeschooling'
import { sanitizeHTML } from '@/lib/sanitize'
import toast from 'react-hot-toast'

interface PeakCoachHomeschoolProps {
  sessionId: string
  enrollmentId: string
  subjectId: string
  subjectName: string
  topic?: string
  objectives?: LearningObjective[]
  resources?: LearningResource[]
  instructions?: string
  aiInstructions?: string
  aiAssistanceEnabled: boolean
}

const THINKING_STEPS = [
  { icon: BookOpen, label: 'Analyzing your question' },
  { icon: Target, label: 'Reviewing session context' },
  { icon: Brain, label: 'Building guidance' },
  { icon: Lightbulb, label: 'Preparing explanation' },
  { icon: CheckCircle2, label: 'Finalizing response' },
]

function PeakLoader() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev < THINKING_STEPS.length - 1 ? prev + 1 : 0))
    }, 1600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col gap-0">
      {THINKING_STEPS.map((step, i) => {
        const Icon = step.icon
        const isActive = i === activeStep
        const isDone = i < activeStep
        return (
          <div key={i} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500 ${
                  isDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/40 scale-110'
                      : 'bg-white/[0.04] text-[var(--text-muted)]'
                }`}
              >
                {isDone ? <CheckCircle2 size={13} /> : <Icon size={13} />}
              </div>
              {i < THINKING_STEPS.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-[16px] transition-all duration-500 ${
                    isDone ? 'bg-emerald-500/50' : isActive ? 'bg-gradient-to-b from-primary to-primary/20' : 'bg-white/[0.06]'
                  }`}
                />
              )}
            </div>
            <div className={`flex items-center min-h-[28px] transition-all duration-500 ${
              isDone ? 'text-emerald-400/70' : isActive ? 'text-white' : 'text-white/25'
            }`}>
              <span className={`text-[10px] sm:text-[11px] font-bold tracking-wide transition-all duration-500 ${
                isActive ? 'scale-[1.02]' : ''
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RenderTextBlock({ text }: { text: string }) {
  const sanitized = sanitizeHTML(text)
  const formatted = sanitized
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-primary">$1</strong>')
    .replace(/\n- (.*?)/g, '<br/><span class="inline-block w-3 shrink-0">•</span> $1')

  return (
    <div className="text-sm leading-[1.75] text-[var(--text)]/85 space-y-1.5">
      {formatted.split('\n').map((l, i) => (
        <p key={i} className="last:mb-0" dangerouslySetInnerHTML={{ __html: l || '&nbsp;' }} />
      ))}
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  if (content.includes('|') && content.includes('\n|---')) {
    const lines = content.trim().split('\n')
    const tableIndex = lines.findIndex(l => l.includes('|---'))
    if (tableIndex > 0) {
      const header = lines[tableIndex - 1].split('|').map(c => c.trim()).filter(c => c !== '')
      const rows = lines.slice(tableIndex + 1)
        .filter(l => l.includes('|'))
        .map(l => l.split('|').map(c => c.trim()).filter(c => c !== ''))
      const textBefore = lines.slice(0, tableIndex - 1).join('\n')
      const textAfter = lines.slice(tableIndex + rows.length + 1).join('\n')

      return (
        <div className="space-y-3">
          {textBefore && <MarkdownRenderer content={textBefore} />}
          <div className="my-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/20">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">{header.map((h, i) => <th key={i} className="p-3 font-bold uppercase tracking-wider text-primary/60">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-white/[0.03] last:border-0">
                    {row.map((cell, ci) => <td key={ci} className="p-3 text-[var(--text)]/70">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {textAfter && <MarkdownRenderer content={textAfter} />}
        </div>
      )
    }
  }

  return <RenderTextBlock text={content} />
}

export function PeakCoachHomeschool({
  sessionId,
  enrollmentId,
  subjectId,
  subjectName,
  topic,
  objectives = [],
  resources = [],
  instructions,
  aiInstructions,
  aiAssistanceEnabled,
}: PeakCoachHomeschoolProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showProvider, setShowProvider] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const greeting = `Hi there! I'm your Peak Coach for today's ${subjectName} session${topic ? ` on "${topic}"` : ''}. I can help you understand concepts, work through problems step by step, and prepare for your learning objectives. What would you like help with?`

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (messages.length === 0 && aiAssistanceEnabled) {
      setMessages([{ role: 'assistant', content: greeting }])
    }
  }, [sessionId])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !aiAssistanceEnabled) return
    const userMsg = input.trim()
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setIsLoading(true)
    setShowProvider(null)

    try {
      const response = await chatWithPeakCoach({
        sessionId,
        messages: newMessages,
        studentMessage: userMsg,
      })

      if (response.error) {
        toast.error(response.error)
      } else if (response.content) {
        const assistantMsg: Message = { role: 'assistant', content: response.content }
        setMessages(prev => [...prev, assistantMsg])
        if (response.provider) {
          setShowProvider(response.provider)
          setTimeout(() => setShowProvider(null), 4000)
        }
      }
    } catch {
      toast.error('Connection lost. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, sessionId, aiAssistanceEnabled])

  const sendQuickAction = useCallback(async (prompt: string, label: string) => {
    if (isLoading || !aiAssistanceEnabled) return
    const displayMessages: Message[] = [...messages, { role: 'user', content: label }]
    setMessages(displayMessages)
    setIsLoading(true)
    setShowProvider(null)

    try {
      const response = await chatWithPeakCoach({
        sessionId,
        messages: displayMessages,
        studentMessage: prompt,
      })
      if (response.error) toast.error(response.error)
      if (response.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.content! }])
        if (response.provider) {
          setShowProvider(response.provider)
          setTimeout(() => setShowProvider(null), 4000)
        }
      }
    } catch {
      toast.error('Connection lost. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, sessionId, aiAssistanceEnabled])

  const handleRestart = () => {
    if (window.confirm('Clear the current conversation?')) {
      setMessages([{ role: 'assistant', content: greeting }])
    }
  }

  if (!aiAssistanceEnabled) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <ShieldAlert size={18} className="text-amber-400" />
          <span className="text-sm font-bold text-amber-300">Peak Coach Unavailable</span>
        </div>
        <p className="text-xs text-amber-200/60 leading-relaxed">
          AI assistance has been disabled for this assessment by your teacher. Focus on completing the task independently — you&apos;ve got this!
        </p>
      </div>
    )
  }

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shadow-lg shadow-primary/20 relative group"
          >
            <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <Bot size={20} className="group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--bg)] animate-pulse pointer-events-none" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="homeschool-coach"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={[
              'flex flex-col overflow-hidden rounded-xl border border-white/10',
              isFullScreen
                ? 'fixed inset-0 z-50 rounded-none border-0'
                : 'w-full h-[520px] max-h-[70vh]',
            ].join(' ')}
            style={{ background: 'var(--card)' }}
          >
            {/* Header */}
            <div className="flex-shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-accent/8 to-transparent" />
              <div className="relative px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent/80 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                    <Brain size={15} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate text-white">Peak Coach</h3>
                    <p className="text-[9px] font-medium text-white/30 mt-0.5 truncate">
                      Helping with: {subjectName}{topic ? ` — ${topic}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/10 flex items-center justify-center transition-all text-white/40 hover:text-white"
                  >
                    {isFullScreen ? <MinusCircle size={12} /> : <Maximize2 size={12} />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 flex items-center justify-center transition-all text-white/40 hover:text-rose-300"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-[var(--card)]/80 border-b border-white/5 flex-shrink-0">
              <div className="px-3 py-2">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {(messages.length <= 1 ? [
                    { label: 'Explain Topic', prompt: `Explain the key concepts of ${topic || 'this topic'} in a simple way I can understand.` },
                    { label: 'Quiz Me', prompt: `Give me a short quiz question on ${topic || 'this topic'} to test my understanding.` },
                    { label: 'Show Example', prompt: `Show me a real-life example of ${topic || 'this topic'} that helps me understand it better.` },
                    { label: 'Summarize', prompt: `Summarize the main points of ${topic || 'this topic'} that I need to remember.` },
                  ] : [
                    { label: 'Continue', prompt: 'Continue guiding me through the next concept.' },
                    { label: 'Simplify', prompt: 'Can you explain that again in a simpler way?' },
                    { label: 'Quiz', prompt: `Give me a quick question on ${topic || 'this topic'}.` },
                    { label: 'Hint', prompt: 'Give me a hint without revealing the answer.' },
                  ]).map((act, idx) => (
                    <button
                      key={idx}
                      disabled={isLoading}
                      onClick={() => sendQuickAction(act.prompt, act.label)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                        isLoading
                          ? 'opacity-40 cursor-not-allowed'
                          : 'bg-white/[0.03] border-white/10 text-[var(--text)]/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className={`flex-1 overflow-y-auto chat-scrollbar ${isFullScreen ? 'px-10 py-6 max-w-3xl mx-auto w-full' : 'px-4 py-4'}`}
            >
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' ? (
                      <div className="max-w-[90%] group relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-primary/40 via-accent/30 to-primary/10" />
                        <div className="ml-2 bg-[var(--bg)]/50 border border-white/[0.05] rounded-xl rounded-bl-lg px-4 py-3 shadow-lg shadow-black/10">
                          <MarkdownRenderer content={m.content} />
                          {i === messages.length - 1 && showProvider && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[7px] font-semibold uppercase tracking-wider text-[var(--text-muted)]/20">
                                via {showProvider}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-emerald-500/30" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[80%] bg-gradient-to-br from-primary to-accent text-white rounded-xl rounded-tr-sm px-4 py-3 shadow-lg shadow-primary/20">
                        <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-[var(--bg)]/50 border border-white/[0.05] rounded-xl rounded-bl-lg px-4 py-3 ml-1 min-w-0 w-full max-w-[280px]">
                      <PeakLoader />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-white/5 bg-[var(--card)] flex-shrink-0 px-4 py-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Ask Peak Coach..."
                    className="w-full min-h-[40px] max-h-[80px] py-2 px-3 rounded-lg bg-white/[0.04] border border-white/10 focus:border-primary/50 outline-none text-sm font-medium transition-all resize-none block overflow-y-auto"
                    style={{ color: 'var(--text)', height: '40px' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="h-[40px] w-[40px] rounded-lg bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 transition-all"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className="text-white" />}
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-[7px] font-semibold uppercase tracking-wider text-[var(--text-muted)]/30">
                <Lock size={7} /> Session Protected
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
