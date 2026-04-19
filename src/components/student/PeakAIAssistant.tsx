'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, X, Send, Sparkles, 
  Flame, Zap, ShieldAlert, Brain, 
  ChevronDown, MinusCircle, Maximize2,
  Lock, Trash2, PlusCircle, GraduationCap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Card'
import { chatWithPeakAI, getPeakPerformanceIntel, saveAIStudyPlan, logAILearningRequest, getTrendingAILessons } from '@/app/actions/ai'
import type { Message } from '@/app/actions/ai'
import MermaidDiagram from '@/components/shared/MermaidDiagram'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load from Persistence + Initial greeting
  useEffect(() => {
    const initChat = async () => {
      if (student) {
        // Try to load history from LocalStorage
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
          const greeting = `Hello ${firstName}! I'm your Peak Coach. 🚀 I'm here for your academic wins AND your mental well-being. Whether you're feeling on top of the world or just need to talk, I've got your back! ✨ How are we feeling today?`
          setMessages([{ role: 'assistant', content: greeting }])
        }
        
        // Fetch performance intel silently
        const performanceIntel = await getPeakPerformanceIntel()
        setIntel(performanceIntel)
        
        // Fetch real trending lessons
        const trending = await getTrendingAILessons()
        if (trending && trending.length > 0) {
          setTrendingTopics(trending)
        }
        
        setIsInitializing(false)
      }
    }
    initChat()
  }, [student, profile])

  // Proactive Open Listener
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

  // Save to Persistence
  useEffect(() => {
    if (!isInitializing && student && messages.length > 0) {
      localStorage.setItem(`peak_ai_history_${student.id}`, JSON.stringify(messages))
    }
  }, [messages, student, isInitializing])

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg = input.trim()
    setInput('')
    
    // Log topic for trending if it looks like a lesson start
    if (messages.length === 1 && messages[0].role === 'assistant' && messages[0].content.includes('topic')) {
       logAILearningRequest(userMsg)
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const response = await chatWithPeakAI(
        newMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        {
          studentName: profile?.full_name?.split(' ')[0],
          streak: student?.streak_count,
          performanceIntel: intel
        }
      )

      if (response.error) {
        toast.error(response.error)
      } else if (response.content) {
        const assistantMsg: Message = { role: 'assistant', content: response.content }
        setMessages(prev => [...prev, assistantMsg])
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
      const greeting = `Hello ${firstName}! I'm your Peak Coach. 🚀 Ready for a fresh mission! How can I help you today?`
      setMessages([{ role: 'assistant', content: greeting }])
      if (student) {
        localStorage.removeItem(`peak_ai_history_${student.id}`)
      }
    }
  }

  return (
    <>
      {/* ── Mobile: full-screen overlay backdrop ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] sm:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[101]">
            <div className="relative">
              <motion.button
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 45 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[1.75rem] flex items-center justify-center shadow-2xl relative group bg-primary text-white"
              >
                <span className="absolute inset-0 rounded-2xl sm:rounded-[1.75rem] bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <MessageSquare size={22} className="sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
              </motion.button>

              {/* Pulsing online dot */}
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full border-2 border-[var(--bg)] animate-bounce pointer-events-none" />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Chat modal ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={[
              'fixed z-[100] flex flex-col overflow-hidden transition-all duration-300',
              'border-primary/20 shadow-2xl',
              isFullScreen 
                ? 'inset-0 rounded-0 border-0' 
                : [
                    'border-4 rounded-[2rem]',
                    'inset-x-3 bottom-[9rem] top-auto',
                    'max-h-[calc(100dvh-11rem)]',
                    'sm:inset-x-auto sm:bottom-[6rem] sm:right-6',
                    'sm:w-[450px] sm:h-[600px] sm:max-h-[85vh]'
                  ].join(' ')
            ].join(' ')}
            style={{ background: 'var(--card)' }}
          >
            {/* Header */}
            <div className={`p-5 bg-gradient-to-r from-primary to-accent text-white flex items-center justify-between flex-shrink-0 ${isFullScreen ? 'px-8 py-6' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <Brain size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isProactive ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] truncate max-w-[120px] xs:max-w-[180px]">
                      Peak Performance AI Coach
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[7px] border-white/20 text-white/60 px-1 py-0 h-auto font-black uppercase tracking-widest leading-none">
                      {isProactive ? 'Intelligence Report' : (
                        `Target: ${
                          (student?.curriculum as any)?.name?.includes('8-4-4') ? 'KCSE' :
                          (student?.class as any)?.level <= 6 ? 'KPSEA' : 'KJSEA'
                        }`
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all shrink-0 sm:flex"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                  >
                    {isFullScreen ? <MinusCircle size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button
                    onClick={handleRestart}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-rose-500/20 hover:text-rose-200 flex items-center justify-center transition-all group shrink-0"
                    title="Restart Conversation"
                  >
                    <Trash2 size={14} className="group-hover:scale-110" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
            </div>

            {/* Fixed Discovery & Action Layer */}
            <div className="bg-[var(--card)]/95 backdrop-blur-md border-b border-[var(--card-border)] z-20 flex-shrink-0">
               <div className={`${isFullScreen ? 'max-w-6xl mx-auto w-full px-8' : 'px-5'} py-4 space-y-3`}>
                  {/* 1. Context-Aware Quick Actions */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
                    {(messages.length <= 1 ? [
                      { label: '🎓 Help Me Study', prompt: "I'm ready! What specific **Topic, Concept, or Sub-strand** (for CBC) should we master today? (e.g., Chemistry - Structure of Matter)" },
                      { label: '📝 Test Me', prompt: "Excellent! Which specific **Subject and Topic** shall I examine you on? I'll be marking like a strict national examiner!" },
                      { label: '📅 Study Plan', prompt: "Let's organize your week. What are your main goals for the next 7 days? I'll create a syllabus-aligned roadmap for you." },
                      { label: '📡 Intelligence', action: async () => {
                          setIsLoading(true);
                          const { generateStudentInsights } = await import('@/app/actions/ai');
                          const res = await generateStudentInsights();
                          setIsLoading(false);
                          if (res.success) setMessages(prev => [...prev, { role: 'assistant', content: res.insights || '' }]);
                      }}
                    ] : [
                      { label: '➡️ Continue Lesson', prompt: "Please continue with the next step of this KCSE-level lesson." },
                      { label: '❓ Quick Quiz', prompt: "Give me an examiner-style KCSE quiz question on what we just discussed. Use strict command words." },
                      { label: '💡 Explain Simpler', prompt: "I'm a bit lost. Can you explain that again using a simpler analogy for better conceptual mastery?" },
                      { label: '🔍 Show Example', prompt: "Show me another real-life example of this concept that frequently appears in exams." },
                      { label: '🧪 High-Stakes Test', prompt: "I'm ready for a real KCSE exam simulation. Give me a tough, multi-part examiner-style question with a strict marking scheme!" }
                    ]).map((act, idx) => (
                      <button
                        key={idx}
                        disabled={isLoading}
                        onClick={act.action ? act.action : () => {
                          if (act.prompt) {
                            if (messages.length <= 1) {
                              setMessages(prev => [...prev, { role: 'user', content: act.label }, { role: 'assistant', content: act.prompt! }])
                              return
                            }
                            setMessages(prev => [...prev, { role: 'user', content: act.label }])
                            const sendToAI = async () => {
                              setIsLoading(true)
                              if (act.label.includes('Study') || act.label.includes('Quiz')) logAILearningRequest(act.label)
                              const newMsgs: Message[] = [...messages, { role: 'user', content: act.prompt! }]
                              const response = await chatWithPeakAI(newMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })), { studentName: profile?.full_name?.split(' ')[0], streak: student?.streak_count })
                              if (response.content) setMessages(prev => [...prev, { role: 'assistant', content: response.content as string }])
                              setIsLoading(false)
                            }
                            sendToAI()
                          }
                        }}
                        className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : 'bg-primary/5 border-primary/10 text-primary hover:bg-primary shadow-sm'
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>

                  {/* 2. Persistent Trending Topics Scroller */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-500 uppercase tracking-wider shrink-0 shadow-inner">
                      <Sparkles size={10} /> Trending
                    </div>
                    {(trendingTopics.length > 0 ? trendingTopics : [
                      { label: '🧬 Genetics', topic: 'Biology: Genetics' },
                      { label: '🧪 Bonding', topic: 'Chemistry: Structure & Bonding' },
                      { label: '⚡ Electricity', topic: 'Physics: Current Electricity' },
                      { label: '🏛️ Govt', topic: 'History: The Kenyan Government' },
                      { label: '🦁 Evolution', topic: 'Integrated Science: Living Things' },
                      { label: '🌱 Nutrition', topic: 'Science: Human Body' },
                    ]).map((item, idx) => (
                      <button
                        key={idx}
                        disabled={isLoading}
                        onClick={() => {
                          const sendToAI = async () => {
                            setIsLoading(true)
                            logAILearningRequest(item.topic)
                            const response = await chatWithPeakAI([{ role: 'user', content: `Teach me about ${item.topic} for my target exam.` }], { studentName: profile?.full_name?.split(' ')[0], streak: student?.streak_count })
                            if (response.content) setMessages(prev => [...prev, { role: 'assistant', content: response.content as string }])
                            setIsLoading(false)
                          }
                          sendToAI()
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-[var(--text)]/70 hover:border-primary hover:text-primary transition-all flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollRef}
              className={`flex-1 overflow-y-auto space-y-4 scroll-smooth ${isFullScreen ? 'p-10 pb-32 max-w-6xl mx-auto w-full' : 'p-5'}`}
            >

              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: m.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-[var(--bg)] border border-[var(--card-border)] rounded-tl-none'
                    }`}
                    style={{ color: m.role === 'user' ? 'white' : 'var(--text)' }}
                  >
                    {m.role === 'user' ? m.content : (
                      <>
                        <MarkdownRenderer content={m.content} />
                        <SavePlanButton content={m.content} />
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--bg)] border border-[var(--card-border)] p-4 rounded-3xl rounded-tl-none">
                    <div className="flex gap-1.5">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-primary" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-primary" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className={`border-t border-[var(--card-border)] bg-[var(--bg)]/90 backdrop-blur-md flex-shrink-0 ${isFullScreen ? 'p-8' : 'p-4'}`}>
              <div className={`relative flex items-end gap-3 ${isFullScreen ? 'max-w-6xl mx-auto w-full' : ''}`}>
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      // Auto-resize
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Type your answer or ask anything..."
                    className="w-full min-h-[48px] max-h-[200px] py-3 px-5 rounded-2xl bg-[var(--input)] border-2 border-transparent focus:border-primary outline-none text-sm font-bold transition-all resize-none block overflow-y-auto"
                    style={{ color: 'var(--text)', height: '48px' }}
                  />
                </div>
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="h-12 w-12 rounded-2xl shadow-xl shadow-primary/20 shrink-0"
                >
                  <Send size={18} />
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">
                <Lock size={10} /> Academy Protected • AI Safety Enabled
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * Simple Academic Markdown Renderer
 * Handles Bold, Lists, and Pipe Tables
 */
function MarkdownRenderer({ content }: { content: string }) {
  // 0. Detect Examiner Tips
  if (content.includes('[EXAMINER_TIP]')) {
    const parts = content.split('[EXAMINER_TIP]')
    return (
      <div className="space-y-6">
        {parts.map((part, index) => {
          if (index === 0) return <MarkdownRenderer key={index} content={part} />
          
          // Case: AI provided the tip content. We check for the closing tag.
          // If missing, we take the entire part as the tip.
          const [tip, ...remainingParts] = part.includes('[/EXAMINER_TIP]') 
            ? part.split('[/EXAMINER_TIP]')
            : [part, ''];

          return (
            <React.Fragment key={index}>
              <div className="flex items-start gap-3 my-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0 mt-1 border border-white/20">
                   <GraduationCap size={20} />
                </div>
                <div className="relative flex-1 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 shadow-xl shadow-amber-500/5 group">
                  <div className="absolute top-4 -left-[9px] w-4 h-4 bg-inherit border-l-2 border-b-2 border-amber-500/30 rotate-45" />
                  
                  <div className="flex items-center gap-2 mb-2">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                        Senior Examiner's Corner
                     </span>
                     <div className="h-px flex-1 bg-amber-500/20" />
                  </div>
                  
                  <div className="text-[13px] font-bold text-amber-100/90 leading-relaxed italic pr-2">
                     "{tip.trim()}"
                  </div>
                  
                  <div className="mt-3 pt-2 border-t border-amber-500/10 text-[9px] font-black uppercase tracking-[0.15em] text-amber-500/60 flex items-center justify-between">
                     <span className="flex items-center gap-1">
                        <ShieldAlert size={10} /> Exam Standard
                     </span>
                     <span className="opacity-40">KNEC Marking Scheme</span>
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

  // 1. Detect Mermaid Diagrams
  if (content.includes('```mermaid')) {
    const parts = content.split('```mermaid')
    return (
      <div className="space-y-4">
        {parts.map((part, index) => {
          if (index === 0) return <MarkdownRenderer key={index} content={part} />
          
          const [chart, ...remaining] = part.split('```')
          return (
            <React.Fragment key={index}>
              <MermaidDiagram chart={chart.trim()} id={`msg-diag-${index}`} />
              {remaining.join('```').trim() && (
                <MarkdownRenderer content={remaining.join('```').trim()} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  // 2. Detect Tables (Simple Pipe Tables)
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
          <div className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-primary/20 font-black uppercase tracking-widest text-primary">
                <tr>{header.map((h, i) => <th key={i} className="p-3 border-b border-white/10">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    {row.map((cell, ci) => <td key={ci} className="p-3 opacity-90">{cell}</td>)}
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

  // 3. Detect Images
  if (content.includes('![') && content.includes('](')) {
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g
    const parts = []
    let lastIndex = 0
    let match
    while ((match = imgRegex.exec(content)) !== null) {
      parts.push(<MarkdownRenderer key={lastIndex} content={content.substring(lastIndex, match.index)} />)
      parts.push(
        <div key={match.index} className="my-4 group relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-black/20 shadow-xl">
           <img 
             src={match[2]} 
             alt={match[1]} 
             className="w-full h-auto max-h-[500px] object-contain transition-transform duration-500 group-hover:scale-[1.02]" 
           />
           {match[1] && (
             <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/90">{match[1]}</p>
             </div>
           )}
        </div>
      )
      lastIndex = imgRegex.lastIndex
    }
    parts.push(<MarkdownRenderer key={lastIndex} content={content.substring(lastIndex)} />)
    return <div className="space-y-2">{parts}</div>
  }

  // 4. Fallback to Simple Formatting (Bold, Lists)
  const formattedLines = content
    .replace(/\*\*(.*?)\*\*/g, '<b class="font-black text-primary">$1</b>')
    .replace(/\n- (.*?)/g, '<br/>• $1')
    .split('\n')

  return (
    <div className="text-[13px] leading-relaxed">
      {formattedLines.map((line, i) => (
        <p key={i} className="mb-1.5" dangerouslySetInnerHTML={{ __html: line }} />
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
      // Very naive parser for AI markdown tables
      const lines = content.split('\n').filter(l => l.includes('|'))
      // Skip header and divider
      const dataLines = lines.filter(l => !l.includes('---') && !l.toLowerCase().includes('subject'))
      
      const sessions = dataLines.map(l => {
        const parts = l.split('|').map(p => p.trim()).filter(p => p !== '')
        const title = parts[0] || 'Study Session'
        let timePart = parts.find(p => p.includes(':')) || '16:00'
        const durationPart = parts.find(p => p.match(/\d+/))?.[0] || '45'

        // Robust time extraction: "4:00 PM" -> "16:00"
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
        toast.success('Deployed to Planner! 🚀', { id: toastId })
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
      className={`mt-3 w-full gap-2 rounded-xl py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
        isSaved 
          ? 'bg-emerald-500/20 text-emerald-500' 
          : isSyncing
            ? 'bg-primary/10 text-primary animate-pulse'
            : 'bg-primary/20 text-primary hover:bg-primary hover:text-white'
      }`}
    >
      <Zap size={12} className={isSaved ? 'fill-emerald-500' : isSyncing ? 'animate-spin' : ''} />
      {isSaved ? 'Encoded in Planner' : isSyncing ? 'Syncing...' : 'Sync to My Roadmap'}
    </Button>
  )
}
