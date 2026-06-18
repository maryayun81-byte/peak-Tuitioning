'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Sparkles,
  Zap, ShieldAlert, Brain,
  ChevronDown, MinusCircle, Maximize2,
  Lock, GraduationCap,
  BookOpen, Search, Loader2, Target,
  Lightbulb, RefreshCw,
  CheckCircle2,
  PenTool, ArrowRight, Bot,
  Microscope,
  Puzzle, ListChecks, Quote,
  Image, Map,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { chatWithPeakAI, getPeakPerformanceIntel, saveAIStudyPlan, logAILearningRequest, getTrendingAILessons } from '@/app/actions/ai'
import type { Message } from '@/app/actions/ai'
import { analyzeStudentProfile, generateNotifications, getStudentProfileSummary } from '@/app/actions/academic-profile'
import MermaidDiagram from '@/components/shared/MermaidDiagram'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { peakToast } from '@/lib/peakToast'
import { sanitizeHTML } from '@/lib/sanitize'

function buildCoachGreeting(firstName: string) {
  return `Hello ${firstName}! I'm your Peak Intelligence Coach. I can teach CBC and 8-4-4 with diagrams, worked examples, examiner tips, rubric guidance, and practice questions. What subject and topic should we master today?`
}

function isTrackableLearningTopic(value: string) {
  const text = value.toLowerCase().trim()
  if (text.length < 8) return false
  if (/^(hi|hello|hey|thanks|thank you|ok|okay)\b/.test(text)) return false
  return /\b(teach|learn|lesson|explain|revise|revision|chem|biology|physics|math|science|english|kiswahili|history|geography|business|agriculture|pretechnical|integrated|topic|sub-strand|strand)\b/.test(text)
}

function getCoachTarget(student: any) {
  const curriculumName = Array.isArray(student?.curriculum)
    ? student.curriculum[0]?.name
    : student?.curriculum?.name
  const classLevel = Number(student?.class?.level || 0)
  const curriculumKey = String(curriculumName || '').toLowerCase()

  if (curriculumKey.includes('8-4-4') || curriculumKey.includes('844')) return 'KCSE'
  if (curriculumKey.includes('cbc') || curriculumKey.includes('cbe')) {
    if (classLevel <= 6) return 'KPSEA'
    if (classLevel <= 9) return 'KJSEA'
    return 'CBC Senior'
  }

  return curriculumName || 'Curriculum'
}

const THINKING_STEPS = [
  { icon: BookOpen, label: 'Analyzing your question' },
  { icon: Search, label: 'Searching curriculum' },
  { icon: Brain, label: 'Building lesson plan' },
  { icon: Lightbulb, label: 'Crafting examples' },
  { icon: CheckCircle2, label: 'Preparing response' },
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
            {/* Timeline column: icon + connector line */}
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
            {/* Label */}
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

export function PeakAIAssistant() {
  const { student, profile } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isProactive, setIsProactive] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [intel, setIntel] = useState('')
  const [isInitializing, setIsInitializing] = useState(true)
  const [trendingTopics, setTrendingTopics] = useState<{label: string, topic: string}[]>([])
  const [showProvider, setShowProvider] = useState<string | null>(null)
  const [profileSummary, setProfileSummary] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const initChat = async () => {
      if (student) {
        const savedHistory = localStorage.getItem(`peak_ai_history_${student.id}`)
        if (savedHistory) {
          try {
            const parsed = JSON.parse(savedHistory)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed)
            }
          } catch (e) {
            console.error('Failed to parse AI history')
          }
        } else if (messages.length === 0) {
          const firstName = profile?.full_name?.split(' ')[0] || 'Scholar'
          setMessages([{ role: 'assistant', content: buildCoachGreeting(firstName) }])
        }
        const performanceIntel = await getPeakPerformanceIntel()
        setIntel(performanceIntel)
        const trending = await getTrendingAILessons()
        if (trending && trending.length > 0) {
          setTrendingTopics(trending)
        }
        // Load academic profile
        try {
          await analyzeStudentProfile(student.id)
          const summary = await getStudentProfileSummary(student.id)
          setProfileSummary(summary)
          await generateNotifications(student.id)
        } catch (e) {
          // Profile analysis is non-critical
        }
        setIsInitializing(false)
      }
    }
    initChat()
  }, [student, profile])

  useEffect(() => {
    const handleProactiveOpen = (e: any) => {
      const { message, title } = e.detail || {}
      if (message) {
        setMessages(prev => [...prev, { role: 'assistant', content: message }])
        setIsProactive(true)
        setIsOpen(true)
      }
    }
    window.addEventListener('peak-ai-open', handleProactiveOpen)
    return () => window.removeEventListener('peak-ai-open', handleProactiveOpen)
  }, [])

  useEffect(() => {
    if (!isInitializing && student && messages.length > 0) {
      localStorage.setItem(`peak_ai_history_${student.id}`, JSON.stringify(messages))
    }
  }, [messages, student, isInitializing])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const userMsg = input.trim()
    setInput('')

    if (isTrackableLearningTopic(userMsg)) {
      logAILearningRequest(userMsg)
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setIsLoading(true)
    setShowProvider(null)

    try {
      const response = await chatWithPeakAI(
        newMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        {
          studentName: profile?.full_name?.split(' ')[0],
          streak: student?.streak_count,
          performanceIntel: intel,
          academicProfile: profileSummary,
        }
      )

      if (response.error) {
        toast.error(response.error)
      } else if (response.content) {
        const assistantMsg: Message = { role: 'assistant', content: response.content }
        setMessages(prev => [...prev, assistantMsg])

        const lower = response.content.toLowerCase()
        if (lower.includes('three clean answers') || (lower.includes('correct') && lower.includes('understanding'))) {
          peakToast('Three clean answers in a row — that\'s not luck, that\'s understanding.', 'achievement')
        }

        if (response.provider) {
          setShowProvider(response.provider)
          setTimeout(() => setShowProvider(null), 4000)
        }
      }
    } catch (err) {
      toast.error('Connection to Peak HQ lost. Try again!')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestart = () => {
    if (window.confirm('This will clear our current conversation. Ready for a fresh start?')) {
      const firstName = profile?.full_name?.split(' ')[0] || 'Scholar'
      setMessages([{ role: 'assistant', content: buildCoachGreeting(firstName) }])
      if (student) {
        localStorage.removeItem(`peak_ai_history_${student.id}`)
      }
    }
  }

  const sendPromptToCoach = async (prompt: string, label = prompt) => {
    if (isLoading) return
    const displayMessages: Message[] = [...messages, { role: 'user', content: label }]
    const aiMessages: Message[] = [...messages, { role: 'user', content: prompt }]
    setMessages(displayMessages)
    setIsLoading(true)
    setShowProvider(null)

    if (isTrackableLearningTopic(prompt)) {
      logAILearningRequest(prompt)
    }

    try {
      const response = await chatWithPeakAI(
        aiMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        {
          studentName: profile?.full_name?.split(' ')[0],
          streak: student?.streak_count,
          performanceIntel: intel,
          academicProfile: profileSummary,
        },
      )

      if (response.error) toast.error(response.error)
      if (response.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.content as string }])
        if (response.provider) {
          setShowProvider(response.provider)
          setTimeout(() => setShowProvider(null), 4000)
        }
      }
    } catch (err) {
      toast.error('Connection to Peak HQ lost. Try again!')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && window.innerWidth < 640 && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <div className="fixed bottom-24 right-4 z-[101] sm:bottom-6 sm:right-6">
            <div className="relative">
              <motion.button
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 45 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsOpen(true)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-2xl flex items-center justify-center shadow-2xl relative group bg-gradient-to-br from-primary to-accent text-white"
              >
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <Bot size={24} className="sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" />
                <span className="absolute -inset-1 rounded-2xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[var(--bg)] animate-pulse pointer-events-none" />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-modal"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={[
              'fixed z-[100] flex flex-col overflow-hidden',
              'glass-premium',
              isFullScreen
                ? 'inset-0 rounded-0 border-0'
                : [
                    'sm:rounded-2xl sm:border sm:border-white/10',
                    'inset-x-0 bottom-[72px] top-[8%]',
                    'sm:inset-x-auto sm:right-6',
                    'sm:top-auto sm:bottom-6',
                    'sm:w-[520px] sm:h-[700px] sm:max-h-[calc(100vh-6rem)]',
                    'rounded-t-2xl sm:rounded-2xl',
                  ].join(' '),
            ].join(' ')}
            style={{ background: 'var(--card)' }}
          >
            {/* Header — clean, minimal */}
            <div className="flex-shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-accent/8 to-transparent" />
              <div className="relative px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent/80 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                    <Brain size={18} className="sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold truncate text-white">
                      Peak Intelligence Coach
                    </h3>
                    <p className="text-[9px] sm:text-[10px] font-medium text-white/30 mt-0.5">
                      {isProactive ? 'Intelligence Report' : getCoachTarget(student)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] hover:bg-white/10 flex items-center justify-center transition-all text-white/40 hover:text-white"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                  >
                    {isFullScreen ? <MinusCircle size={12} className="sm:w-[14px]" /> : <Maximize2 size={12} className="sm:w-[14px]" />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 flex items-center justify-center transition-all text-white/40 hover:text-rose-300"
                  >
                    <ChevronDown size={14} className="sm:w-[16px]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick actions bar — compact */}
            <div className="bg-[var(--card)]/80 border-b border-white/5 flex-shrink-0">
              <div className={`${isFullScreen ? 'max-w-4xl mx-auto w-full px-8' : 'px-4 sm:px-5'} py-3 space-y-2`}>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {(messages.length <= 1 ? [
                    { label: 'Help Me Study', prompt: "I'm ready! What specific **Topic, Concept, or Sub-strand** (for CBC) should we master today? (e.g., Chemistry - Structure of Matter)" },
                    { label: 'Test Me', prompt: "Excellent! Which specific **Subject and Topic** shall I examine you on? I'll be marking like a strict national examiner!" },
                    { label: 'Study Plan', prompt: "Let's organize your week. What are your main goals for the next 7 days? I'll create a syllabus-aligned roadmap for you." },
                    { label: 'Intelligence', action: async () => {
                        setIsLoading(true)
                        const { generateStudentInsights } = await import('@/app/actions/ai')
                        const res = await generateStudentInsights()
                        setIsLoading(false)
                        if (res.success) setMessages(prev => [...prev, { role: 'assistant', content: res.insights || '' }])
                    }},
                  ] : [
                    { label: 'Continue', prompt: "Continue with the next curriculum-matched step." },
                    { label: 'Quick Quiz', prompt: "Give me one curriculum-matched quiz question on what we just discussed." },
                    { label: 'Simplify', prompt: "I'm a bit lost. Can you explain that again using a simpler analogy?" },
                    { label: 'Example', prompt: "Show me another real-life example of this concept that frequently appears in exams." },
                    { label: 'Test', prompt: "I'm ready for a challenging curriculum-matched task." },
                  ]).map((act, idx) => (
                    <button
                      key={idx}
                      disabled={isLoading}
                      onClick={act.action ? act.action : () => {
                        if (act.prompt) sendPromptToCoach(act.prompt, act.label)
                      }}
                      className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                        isLoading
                          ? 'opacity-40 cursor-not-allowed'
                          : 'bg-white/[0.03] border-white/10 text-[var(--text)]/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[7px] font-bold uppercase tracking-wider text-amber-500/70 shrink-0">Trending</span>
                  {(trendingTopics.length > 0 ? trendingTopics : [
                    { label: 'Genetics', topic: 'Biology: Genetics' },
                    { label: 'Bonding', topic: 'Chemistry: Structure & Bonding' },
                    { label: 'Electricity', topic: 'Physics: Current Electricity' },
                    { label: 'Government', topic: 'History: The Kenyan Government' },
                    { label: 'Evolution', topic: 'Integrated Science: Living Things' },
                  ]).map((item, idx) => (
                    <button
                      key={idx}
                      disabled={isLoading}
                      onClick={() => {
                        const sendToAI = async () => {
                          setIsLoading(true)
                          logAILearningRequest(item.topic)
                          const response = await chatWithPeakAI(
                            [{ role: 'user', content: `Teach me about ${item.topic} for my target exam.` }],
                            { studentName: profile?.full_name?.split(' ')[0], streak: student?.streak_count, academicProfile: profileSummary },
                          )
                          if (response.content) {
                            setMessages(prev => [...prev, { role: 'assistant', content: response.content as string }])
                          }
                          setIsLoading(false)
                        }
                        sendToAI()
                      }}
                      className="px-2 py-0.5 rounded-md bg-white/[0.02] border border-white/5 text-[8px] font-semibold text-[var(--text)]/40 hover:border-primary/20 hover:text-primary transition-all whitespace-nowrap"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className={`flex-1 overflow-y-auto chat-scrollbar ${isFullScreen ? 'px-10 py-8 max-w-4xl mx-auto w-full' : 'px-5 sm:px-6 py-6'}`}
            >
              <div className="space-y-5 sm:space-y-6">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' ? (
                      /* ── Peak Signature Rail Card ── */
                      <div className="max-w-[92%] sm:max-w-[85%] group relative">
                        {/* Rail — gradient stripe with connector dots */}
                        <div className="absolute left-0 top-0 bottom-0 w-5 sm:w-6 flex flex-col items-center pointer-events-none z-10">
                          <div className="w-full h-full rounded-l-2xl bg-gradient-to-b from-primary/40 via-accent/30 to-primary/10" />
                          <div className="absolute top-3 -left-[2px] w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 ring-2 ring-[var(--bg)]">
                            <Brain size={12} className="sm:w-[14px] text-white" />
                          </div>
                          {/* Connector dots along the rail */}
                          <div className="absolute top-[52px] flex flex-col items-center gap-2.5">
                            <span className="w-1 h-1 rounded-full bg-white/25" />
                            <span className="w-1 h-1 rounded-full bg-white/15" />
                            <span className="w-1 h-1 rounded-full bg-white/8" />
                            <span className="w-0.5 h-0.5 rounded-full bg-white/5" />
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="ml-[18px] sm:ml-[22px] bg-[var(--bg)]/50 border border-white/[0.05] rounded-2xl rounded-bl-lg p-5 sm:p-6 shadow-lg shadow-black/10">

                          {/* Content */}
                          <MarkdownRenderer content={m.content} />

                          {/* Save button */}
                          <SavePlanButton content={m.content} />

                          {/* Action rail — only on latest message */}
                          {i === messages.length - 1 && !isLoading && (
                            <div className="mt-6 pt-4 border-t border-white/[0.04]">
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => sendPromptToCoach('Continue lesson. Move to the next small step and keep it curriculum-matched.', 'Next Lesson')}
                                  className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all"
                                >
                                  <ArrowRight size={10} className="inline mr-1 -mt-0.5" />
                                  Next
                                </button>
                                <button
                                  onClick={() => sendPromptToCoach('Quick quiz mode. Ask one question only and wait for my answer before marking.', 'Quick Quiz')}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500/8 text-amber-400 border border-amber-500/15 text-[9px] font-bold uppercase tracking-wider hover:bg-amber-500/20 hover:text-amber-300 transition-all"
                                >
                                  <PenTool size={10} className="inline mr-1 -mt-0.5" />
                                  Quiz
                                </button>
                                <button
                                  onClick={() => sendPromptToCoach('Explain this concept more simply.', 'Simplify')}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/8 text-emerald-400 border border-emerald-500/15 text-[9px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 hover:text-emerald-300 transition-all"
                                >
                                  <Lightbulb size={10} className="inline mr-1 -mt-0.5" />
                                  Simplify
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Provider badge — brief */}
                          {i === messages.length - 1 && showProvider && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <span className="text-[7px] font-semibold uppercase tracking-wider text-[var(--text-muted)]/20">
                                via {showProvider === 'groq' ? 'Groq' : showProvider === 'gemini' ? 'Gemini' : showProvider === 'nvidia' ? 'NVIDIA' : showProvider === 'peak-core' ? 'Peak Engine' : 'Hugging Face'}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-emerald-500/30" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ── User Message ── */
                      <div className="max-w-[80%] bg-gradient-to-br from-primary to-accent text-white rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-lg shadow-primary/20">
                        <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-[var(--bg)]/50 border border-white/[0.05] rounded-2xl rounded-bl-lg px-4 sm:px-5 py-4 sm:py-5 ml-1 min-w-0 w-full max-w-[320px]">
                      <PeakLoader />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className={`border-t border-white/5 bg-[var(--card)] flex-shrink-0 ${isFullScreen ? 'px-10 py-5' : 'px-5 sm:px-6 py-4'}`}>
              <div className={`relative flex items-end gap-2.5 ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Ask Peak anything..."
                    className="w-full min-h-[44px] max-h-[100px] py-2.5 px-3.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-primary/50 outline-none text-sm font-medium transition-all resize-none block overflow-y-auto"
                    style={{ color: 'var(--text)', height: '44px' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="h-[44px] w-[44px] rounded-xl bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 transition-all"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[7px] font-semibold uppercase tracking-wider text-[var(--text-muted)]/30">
                <Lock size={7} /> Academy Protected
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ── Section Rail Registry ── */
const SECTION_RAILS: { pattern: RegExp; icon: React.ElementType; color: string; label: string }[] = [
  { pattern: /\*\*Visual Map\*\*/i, icon: Map, color: 'from-violet-500 to-purple-600', label: 'Visual Map' },
  { pattern: /\*\*What You Must Understand\*\*/i, icon: BookOpen, color: 'from-blue-500 to-cyan-500', label: 'Core Concept' },
  { pattern: /\*\*Key Concept/i, icon: Brain, color: 'from-blue-500 to-indigo-600', label: 'Key Concept' },
  { pattern: /\*\*Worked Example\*\*/i, icon: Microscope, color: 'from-emerald-500 to-teal-600', label: 'Worked Example' },
  { pattern: /\*\*Score Booster\*\*/i, icon: Target, color: 'from-amber-500 to-orange-600', label: 'Score Booster' },
  { pattern: /\*\*Now Your Turn\*\*/i, icon: PenTool, color: 'from-rose-500 to-pink-600', label: 'Your Turn' },
  { pattern: /\*\*Practice\*\*/i, icon: Puzzle, color: 'from-amber-500 to-yellow-600', label: 'Practice' },
  { pattern: /\*\*Definition/i, icon: Quote, color: 'from-sky-500 to-blue-600', label: 'Definition' },
  { pattern: /\*\*Format/i, icon: ListChecks, color: 'from-teal-500 to-emerald-600', label: 'Format' },
  { pattern: /\*\*Tip/i, icon: Lightbulb, color: 'from-amber-400 to-amber-600', label: 'Tip' },
]

function detectSectionRail(line: string): { icon: React.ElementType; color: string; label: string } | null {
  for (const section of SECTION_RAILS) {
    if (section.pattern.test(line)) return section
  }
  return null
}

/**
 * Peak Markdown Renderer with Section Rails
 */
function MarkdownRenderer({ content }: { content: string }) {
  // ── Level 0: Examiner Tips ──
  if (content.includes('[EXAMINER_TIP]')) {
    const parts = content.split('[EXAMINER_TIP]')
    return (
      <div className="space-y-5">
        {parts.map((part, index) => {
          if (index === 0) return <MarkdownRenderer key={index} content={part} />
          const [tip, ...remainingParts] = part.includes('[/EXAMINER_TIP]')
            ? part.split('[/EXAMINER_TIP]')
            : [part, '']

          return (
            <React.Fragment key={index}>
              <div className="flex items-start gap-3 my-5">
                <div className="relative flex flex-col items-center shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/10">
                    <GraduationCap size={15} className="text-white" />
                  </div>
                  <div className="mt-1 w-0.5 flex-1 min-h-[16px] bg-gradient-to-b from-amber-500/40 to-transparent rounded-full" />
                </div>
                <div className="flex-1 bg-amber-500/[0.04] border border-amber-500/15 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400/80">Examiner's Tip</span>
                    <div className="h-px flex-1 bg-amber-500/10" />
                  </div>
                  <div className="text-sm text-amber-100/70 leading-relaxed italic border-l-2 border-amber-500/20 pl-3">
                    &ldquo;{tip.trim()}&rdquo;
                  </div>
                </div>
              </div>
              {remainingParts.join('[/EXAMINER_TIP]').trim() && (
                <MarkdownRenderer content={remainingParts.join('[/EXAMINER_TIP]').trim()} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  // ── Level 1: Mermaid Diagrams ──
  const mermaidFenceRegex = /```mermaid\s*([\s\S]*?)```/i
  const bareMermaidRegex = /^\s*(flowchart|graph)\s+(TD|LR|BT|RL)\b/im
  if (mermaidFenceRegex.test(content) || bareMermaidRegex.test(content)) {
    const normalizedContent = mermaidFenceRegex.test(content)
      ? content
      : content.replace(
          /^(\s*(?:flowchart|graph)\s+(?:TD|LR|BT|RL)\b[\s\S]*?)(?=\n\n|\n[A-Z][A-Za-z ]+:|$)/im,
          '```mermaid\n$1\n```',
        )
    const parts: React.ReactNode[] = []
    const regex = /```mermaid\s*([\s\S]*?)```/gi
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(normalizedContent)) !== null) {
      const before = normalizedContent.slice(lastIndex, match.index).trim()
      if (before) {
        parts.push(<MarkdownRenderer key={`text-${lastIndex}`} content={before} />)
      }
      parts.push(
        <div key={`diagram-${match.index}`} className="my-4 p-4 rounded-xl bg-black/20 border border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-3 text-[8px] font-bold uppercase tracking-wider text-primary/40">
            <Map size={11} /> Lesson Flow
          </div>
          <MermaidDiagram chart={match[1].trim()} />
        </div>,
      )
      lastIndex = regex.lastIndex
    }

    const after = normalizedContent.slice(lastIndex).trim()
    if (after) {
      parts.push(<MarkdownRenderer key={`text-${lastIndex}`} content={after} />)
    }

    return <div className="space-y-4">{parts}</div>
  }

  // ── Level 2: Tables ──
  if (content.includes('|') && content.includes('\n|---')) {
    const lines = content.trim().split('\n')
    const tableIndex = lines.findIndex(l => l.includes('|---'))
    if (tableIndex > 0) {
      const headerLine = lines[tableIndex - 1]
      const header = headerLine.split('|').map(c => c.trim()).filter(c => c !== '')
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

  // ── Level 3: Images ──
  if (content.includes('![') && content.includes('](')) {
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = imgRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<MarkdownRenderer key={lastIndex} content={content.substring(lastIndex, match.index)} />)
      }
      parts.push(
        <div key={match.index} className="my-5 group relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.02] border-b border-white/5">
            <Image size={10} className="text-primary/40" />
            <span className="text-[7px] font-bold uppercase tracking-wider text-primary/30">Visual</span>
          </div>
          <img
            src={match[2]}
            alt={match[1]}
            className="w-full h-auto max-h-[400px] object-contain"
          />
          {match[1] && (
            <div className="px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/60">{match[1]}</p>
            </div>
          )}
        </div>
      )
      lastIndex = imgRegex.lastIndex
    }
    if (lastIndex < content.length) {
      parts.push(<MarkdownRenderer key={lastIndex} content={content.substring(lastIndex)} />)
    }
    return <div className="space-y-2">{parts}</div>
  }

  // ── Level 4: Section-Aware Fallback ──
  const lines = content.split('\n')
  const renderedBlocks: React.ReactNode[] = []
  let currentBlock: string[] = []
  let currentSection: { icon: React.ElementType; color: string; label: string } | null = null

  function flushBlock() {
    if (currentBlock.length === 0) return
    const blockText = currentBlock.join('\n')
    currentBlock = []

    if (!blockText.trim()) return

    if (currentSection) {
      const SectionIcon = currentSection.icon
      renderedBlocks.push(
        <div key={`section-${renderedBlocks.length}`} className="flex items-start gap-3 my-4 group/section">
          <div className="relative flex flex-col items-center shrink-0">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${currentSection.color} flex items-center justify-center shadow-lg ring-2 ring-white/[0.04]`}>
              <SectionIcon size={13} className="text-white" />
            </div>
            <div className="mt-1 w-0.5 flex-1 min-h-[12px] bg-gradient-to-b from-white/8 to-transparent rounded-full" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <span className="text-[8px] font-bold uppercase tracking-wider text-white/25 block mb-2">
              {currentSection.label}
            </span>
            <RenderTextBlock text={blockText} />
          </div>
        </div>,
      )
      currentSection = null
    } else {
      renderedBlocks.push(
        <RenderTextBlock key={`block-${renderedBlocks.length}`} text={blockText} />,
      )
    }
  }

  for (const line of lines) {
    const section = detectSectionRail(line)
    if (section) {
      flushBlock()
      currentSection = section
      // Don't push the header line — the section label is shown in the rail
      continue
    }
    currentBlock.push(line)
  }
  flushBlock()

  return <div className="space-y-2">{renderedBlocks}</div>
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

/**
 * Save Button for Plans
 */
function SavePlanButton({ content }: { content: string }) {
  const [isSaved, setIsSaved] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const isPlan = content.toLowerCase().includes('plan') && content.includes('|')

  if (!isPlan) return null

  const handleSave = async () => {
    if (isSyncing || isSaved) return
    setIsSyncing(true)
    const toastId = toast.loading('Exporting to your Planner...')
    try {
      const lines = content.split('\n').filter(l => l.includes('|'))
      const dataLines = lines.filter(l => !l.includes('---') && !l.toLowerCase().includes('subject'))

      const sessions = dataLines.map(l => {
        const parts = l.split('|').map(p => p.trim()).filter(p => p !== '')
        const title = parts[0] || 'Study Session'
        let timePart = parts.find(p => p.includes(':')) || '16:00'
        const durationPart = parts.find(p => p.match(/\d+/))?.[0] || '45'

        if (timePart.toLowerCase().includes('pm') || timePart.toLowerCase().includes('am')) {
          const ampm = timePart.toLowerCase().includes('pm') ? 'PM' : 'AM'
          let [h, m] = timePart.replace(/[^\d:]/g, '').split(':')
          let hours = parseInt(h)
          if (ampm === 'PM' && hours < 12) hours += 12
          if (ampm === 'AM' && hours === 12) hours = 0
          timePart = `${hours.toString().padStart(2, '0')}:${m.padStart(2, '0')}`
        }

        return {
          title,
          date: new Date().toISOString().split('T')[0],
          start_time: timePart,
          duration: parseInt(durationPart)
        }
      })

      const res = await saveAIStudyPlan({
        name: 'AI Generated Roadmap',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sessions
      })

      if (res.success) {
        setIsSaved(true)
        toast.success('Deployed to Planner!', { id: toastId })
      } else {
        throw new Error(res.error)
      }
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message, { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleSave}
      disabled={isSaved || isSyncing}
      className={`mt-3 w-full gap-2 rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
        isSaved
          ? 'bg-emerald-500/20 text-emerald-500'
          : isSyncing
            ? 'bg-primary/10 text-primary animate-pulse'
            : 'bg-primary/15 text-primary border border-primary/20 hover:bg-primary hover:text-white'
      }`}
    >
      <Zap size={12} className={isSaved ? 'fill-emerald-500' : isSyncing ? 'animate-spin' : ''} />
      {isSaved ? 'Encoded in Planner' : isSyncing ? 'Syncing...' : 'Sync to My Roadmap'}
    </Button>
  )
}
