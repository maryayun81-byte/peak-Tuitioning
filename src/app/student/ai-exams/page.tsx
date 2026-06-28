'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BookOpenCheck, CheckCircle2, Clock, FileText, GraduationCap, Play, ShieldCheck, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getExamDeskAiStatus, getExamDeskBlueprints, getExamDeskStudentContext, markExamDeskSession, recordExamInvigilationEvent, startExamDeskSession } from '@/app/actions/examDesk'
import { getStudentRegisteredSubjects } from '@/app/actions/brainGym'
import { useAuthStore } from '@/stores/authStore'
import type { GeneratedExamPaper } from '@/lib/examDesk/blueprints'

type BlueprintSummary = {
  id: string
  curriculum: string
  level: string
  subject: string
  paper: string
  durationMinutes: number
  totalMarks: number
}

type ExamStage = 'select' | 'instructions' | 'sitting' | 'report'

function normaliseSubject(value: string) {
  return value.toLowerCase().replace(/cbc|kcse|kpsea|kjsea|8-4-4|844|[^a-z0-9]/g, '')
}

function subjectAllowed(subject: string, registeredSubjects: string[]) {
  if (registeredSubjects.length === 0) return true
  const target = normaliseSubject(subject)
  return registeredSubjects.some(item => {
    const candidate = normaliseSubject(item)
    return candidate.includes(target) || target.includes(candidate)
  })
}

function getLearnerExamBand(context: { curriculum?: string; className?: string; level?: number | null }, registeredSubjects: string[]) {
  const raw = `${context.curriculum || ''} ${context.className || ''} ${context.level || ''} ${registeredSubjects.join(' ')}`.toLowerCase()
  if (/kcse|8-4-4|844|form/.test(raw)) return 'KCSE'
  if (/kpsea|grade\s*6|\b6\b|primary/.test(raw)) return 'KPSEA'
  if (/kjsea|grade\s*7|grade\s*8|grade\s*9|\b7\b|\b8\b|\b9\b|junior secondary|jss|cbc/.test(raw)) return 'KJSEA'
  return ''
}

function blueprintAllowedForLearner(blueprint: BlueprintSummary, registeredSubjects: string[], learnerBand: string) {
  if (!subjectAllowed(blueprint.subject, registeredSubjects)) return false
  if (!learnerBand) return true
  return blueprint.curriculum === learnerBand
}

export default function StudentExamDeskPage() {
  const { student } = useAuthStore()
  const [blueprints, setBlueprints] = useState<BlueprintSummary[]>([])
  const [registeredSubjects, setRegisteredSubjects] = useState<string[]>([])
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('')
  const [stage, setStage] = useState<ExamStage>('select')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [paper, setPaper] = useState<GeneratedExamPaper | null>(null)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [report, setReport] = useState<any>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [integrityEvents, setIntegrityEvents] = useState<{ type: string; at: string }[]>([])
  const [aiStatus, setAiStatus] = useState<{ name: string; configured: boolean; role: string }[]>([])
  const [learnerBand, setLearnerBand] = useState('')

  useEffect(() => {
    Promise.all([
      getExamDeskBlueprints(),
      student?.id ? getStudentRegisteredSubjects(student.id) : Promise.resolve([]),
      getExamDeskAiStatus(),
      getExamDeskStudentContext(),
    ])
      .then(([data, subjects, status, context]) => {
        setBlueprints(data)
        setRegisteredSubjects(subjects)
        setAiStatus(status)
        const band = getLearnerExamBand(context, subjects)
        setLearnerBand(band)
        const firstAllowed = data.find(item => blueprintAllowedForLearner(item, subjects, band)) || data.find(item => subjectAllowed(item.subject, subjects)) || data[0]
        setSelectedBlueprintId(firstAllowed?.id || '')
      })
      .catch(() => toast.error('Failed to load exam papers'))
      .finally(() => setLoading(false))
  }, [student?.id])

  const selectedBlueprint = blueprints.find(item => item.id === selectedBlueprintId)
  const visibleBlueprints = blueprints.filter(item => blueprintAllowedForLearner(item, registeredSubjects, learnerBand))
  const questions = useMemo(() => paper?.sections.flatMap(section => section.questions) || [], [paper])
  const answeredCount = questions.filter(question => (responses[question.id] || '').trim().length > 0).length
  const needsMathWorkspace = (question: { syllabusOutcome?: string; questionText?: string }) => {
    const text = `${paper?.paperMeta.subject || ''} ${question.syllabusOutcome || ''} ${question.questionText || ''}`.toLowerCase()
    return /(math|mathematics|chemistry|physics|biology|science|equation|calculate|differentiat|matrix|matrices|longitude|latitude|enthalpy|mole|gradient|curve|graph|trig|geometry)/.test(text)
  }
  const formulaSnippets = [
    { label: 'x²', value: '^2' },
    { label: '√', value: 'sqrt()' },
    { label: 'π', value: 'pi' },
    { label: 'θ', value: 'theta' },
    { label: '°', value: ' degrees ' },
    { label: 'dy/dx', value: 'dy/dx = ' },
    { label: 'd²y/dx²', value: 'd2y/dx2 = ' },
    { label: 'fraction', value: '()/()' },
    { label: 'matrix', value: '[[ , ], [ , ]]' },
    { label: '=>', value: ' => ' },
    { label: '⇌', value: ' <=> ' },
    { label: 'ΔH', value: 'Delta H = ' },
  ]
  const insertResponseSnippet = (questionId: string, snippet: string) => {
    setResponses(prev => {
      const current = prev[questionId] || ''
      const spacer = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : ''
      return { ...prev, [questionId]: `${current}${spacer}${snippet}` }
    })
  }

  useEffect(() => {
    if (stage !== 'sitting' || remainingSeconds <= 0) return
    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          void handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [stage, remainingSeconds])

  useEffect(() => {
    if (stage !== 'sitting') return
    const record = (type: string) => {
      setIntegrityEvents(prev => [...prev, { type, at: new Date().toISOString() }].slice(-12))
      void recordExamInvigilationEvent({ sessionId, eventType: type, payload: { userAgent: navigator.userAgent } })
    }
    const onBlur = () => record('Window changed')
    const onCopy = () => record('Copy attempted')
    const onPaste = () => record('Paste attempted')
    window.addEventListener('blur', onBlur)
    window.addEventListener('copy', onCopy)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('copy', onCopy)
      window.removeEventListener('paste', onPaste)
    }
  }, [stage])

  const startPaper = async () => {
    if (!selectedBlueprintId) return
    setStarting(true)
    try {
      const result = await startExamDeskSession(selectedBlueprintId)
      setSessionId(result.sessionId)
      setPaper(result.paper)
      setResponses({})
      setReport(null)
      setRemainingSeconds(result.paper.paperMeta.durationMinutes * 60)
      setStage('instructions')
    } catch (error: any) {
      toast.error(error.message || 'Failed to prepare paper')
    } finally {
      setStarting(false)
    }
  }

  const beginSitting = () => {
    setStage('sitting')
    toast.success('Exam started')
  }

  const handleSubmit = async () => {
    if (!paper || submitting) return
    setSubmitting(true)
    try {
      const marked = await markExamDeskSession({ sessionId, paper, responses })
      setReport(marked)
      setStage('report')
      toast.success(`Marked: ${marked.marksEarned}/${marked.totalMarks}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark paper')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (stage === 'instructions' && paper) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24 md:p-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Peak Exam Desk</p>
          <h1 className="mt-1 text-2xl font-black" style={{ color: 'var(--text)' }}>{paper.paperMeta.subject} {paper.paperMeta.paper}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{paper.paperMeta.curriculum} - {paper.paperMeta.level}</p>
        </div>

        <Card className="p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoTile icon={<Clock size={18} />} label="Duration" value={`${paper.paperMeta.durationMinutes} minutes`} />
            <InfoTile icon={<FileText size={18} />} label="Total marks" value={`${paper.paperMeta.totalMarks} marks`} />
            <InfoTile icon={<ShieldCheck size={18} />} label="Integrity" value="Evidence only, teacher decides" />
          </div>

          <div className="mt-8 space-y-3 rounded-xl p-4" style={{ background: 'var(--input)' }}>
            <h2 className="text-sm font-black" style={{ color: 'var(--text)' }}>Before You Start</h2>
            {[
              'Answer every question in the spaces provided.',
              'Show working, evidence, units and examiner wording where needed.',
              'Changing tabs, copying or pasting is logged for teacher review, but never auto-fails you.',
              'When time ends, Peak Coach will submit and mark the paper automatically.',
            ].map(item => (
              <div key={item} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" /> {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={() => setStage('select')}>Back</Button>
            <Button onClick={beginSitting} className="sm:flex-1">
              <Play size={16} /> Enter Exam Room
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (stage === 'sitting' && paper) {
    return (
      <div className="min-h-screen pb-28">
        <div className="sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-xl" style={{ background: 'var(--background)', borderColor: 'var(--card-border)' }}>
          <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{paper.paperMeta.subject} {paper.paperMeta.paper}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {answeredCount}/{questions.length} answered
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black" style={{ background: remainingSeconds < 600 ? 'rgba(239,68,68,0.12)' : 'var(--input)', color: remainingSeconds < 600 ? '#EF4444' : 'var(--text)' }}>
                <Clock size={16} /> {formatTime(remainingSeconds)}
              </div>
              <Button onClick={handleSubmit} isLoading={submitting}>Submit Paper</Button>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
          {integrityEvents.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border p-3 text-xs" style={{ borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)', color: '#B45309' }}>
              <AlertTriangle size={15} /> Integrity events recorded: {integrityEvents.length}. Keep focus in the exam room.
            </div>
          )}

          {paper.sections.map(section => (
            <section key={section.sectionName} className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{section.sectionName}</h2>
              {section.questions.map((question, index) => (
                <Card key={question.id} className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
                      Question {index + 1}
                    </div>
                    <div className="rounded-lg px-2 py-1 text-xs font-black" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                      {question.marks} marks
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{question.questionText}</p>
                  {needsMathWorkspace(question) && (
                    <div className="mt-4 rounded-xl border p-3" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                      <div className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        Maths / Science Working Tools
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formulaSnippets.map(snippet => (
                          <button
                            key={snippet.label}
                            type="button"
                            onClick={() => insertResponseSnippet(question.id, snippet.value)}
                            className="rounded-lg border px-2.5 py-1.5 text-xs font-black transition hover:border-primary"
                            style={{ borderColor: 'var(--card-border)', color: 'var(--text)', background: 'var(--card)' }}
                          >
                            {snippet.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                        Use plain working like x^2, sqrt(64), dy/dx, [[2,1],[5,3]], Delta H, CO2(g) + H2O(l) &lt;=&gt; H2CO3(aq). Peak Coach reads this notation.
                      </div>
                    </div>
                  )}
                  <textarea
                    value={responses[question.id] || ''}
                    onChange={event => setResponses(prev => ({ ...prev, [question.id]: event.target.value }))}
                    className={`mt-4 w-full resize-y rounded-xl border p-4 text-sm outline-none ${needsMathWorkspace(question) ? 'min-h-56 font-mono leading-7' : 'min-h-32'}`}
                    style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                    placeholder={needsMathWorkspace(question)
                      ? 'Show full working here. Example: dy/dx = 3x^2 - 12x + 9; at x = 1, y = 5; therefore maximum point is (1,5).'
                      : 'Write your answer, working, evidence or explanation here...'}
                  />
                </Card>
              ))}
            </section>
          ))}
        </main>
      </div>
    )
  }

  if (stage === 'report' && report && paper) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Examiner Report</p>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{report.marksEarned}/{report.totalMarks} - Grade {report.grade}</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{report.percentage}% predicted readiness, confidence {report.report.confidence}</p>
          </div>
          <Button onClick={() => setStage('select')}>Sit Another Paper</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ReportList title="Strengths" items={report.report.strengths} tone="success" />
          <ReportList title="Weaknesses" items={report.report.weaknesses} tone="warning" />
          <ReportList title="Next Actions" items={report.report.nextActions} tone="info" />
        </div>

        <div className="space-y-3">
          {report.itemMarks.map((item: any) => (
            <Card key={item.questionId} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{item.syllabusOutcome}</div>
                <div className="text-sm font-black" style={{ color: item.score >= item.maxScore * 0.5 ? '#10B981' : '#EF4444' }}>
                  {item.score}/{item.maxScore}
                </div>
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{item.comment}</p>
              {item.missed.length > 0 && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Missed: {item.missed.join('; ')}</p>
              )}
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-24 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
            <GraduationCap size={14} /> National Exam Simulator
          </div>
          <h1 className="mt-3 text-3xl font-black" style={{ color: 'var(--text)' }}>Peak Exam Desk</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
            Sit a blueprint-locked Kenyan paper, submit written responses, receive examiner-style marking, and feed your weak areas back into Peak Coach.
          </p>
        </div>
        <Button onClick={startPaper} isLoading={starting} disabled={!selectedBlueprintId}>
          <Play size={16} /> Prepare Paper
        </Button>
      </div>

      {registeredSubjects.length > 0 && (
        <Card className="p-4">
          <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Your Registered Subjects</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {registeredSubjects.map(subject => (
              <span key={subject} className="rounded-xl px-3 py-1.5 text-xs font-black" style={{ background: 'var(--input)', color: 'var(--text)' }}>
                {subject}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          <Zap size={14} /> Peak Coach AI Providers
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {aiStatus.map(provider => (
            <div key={provider.name} className="rounded-xl p-3" style={{ background: provider.configured ? 'rgba(16,185,129,0.1)' : 'var(--input)', color: 'var(--text)' }}>
              <div className="text-xs font-black">{provider.name}</div>
              <div className="mt-1 text-[10px] font-bold" style={{ color: provider.configured ? '#10B981' : 'var(--text-muted)' }}>
                {provider.configured ? 'Configured' : 'Missing key'}
              </div>
              <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{provider.role}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Exam Desk races configured providers briefly. If live AI is slow, it uses the locked paper blueprint immediately so students are not trapped waiting.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleBlueprints.map(blueprint => (
          <motion.button
            key={blueprint.id}
            whileHover={{ y: -3 }}
            onClick={() => setSelectedBlueprintId(blueprint.id)}
            className="rounded-2xl border p-5 text-left transition-all"
            style={{
              background: selectedBlueprintId === blueprint.id ? 'var(--primary-dim)' : 'var(--card)',
              borderColor: selectedBlueprintId === blueprint.id ? 'var(--primary)' : 'var(--card-border)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-xl p-2" style={{ background: 'var(--input)', color: 'var(--primary)' }}>
                <FileText size={18} />
              </div>
              <span className="rounded-lg px-2 py-1 text-[10px] font-black" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                {blueprint.curriculum}
              </span>
            </div>
            <h2 className="mt-4 text-base font-black" style={{ color: 'var(--text)' }}>{blueprint.subject}</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{blueprint.paper} - {blueprint.level}</p>
            <div className="mt-4 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock size={14} /> {blueprint.durationMinutes} min
              <BookOpenCheck size={14} /> {blueprint.totalMarks} marks
            </div>
          </motion.button>
        ))}
        {visibleBlueprints.length === 0 && (
          <Card className="p-8 text-center md:col-span-2 xl:col-span-3">
            <FileText size={34} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>No papers for registered subjects yet</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Ask admin to add paper blueprints for {registeredSubjects.join(', ') || 'this learner'}.
            </p>
          </Card>
        )}
      </div>

      {selectedBlueprint && (
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} style={{ color: '#10B981' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Selected: <span className="font-black" style={{ color: 'var(--text)' }}>{selectedBlueprint.subject} {selectedBlueprint.paper}</span>. Peak Coach will use the paper blueprint, weak-outcome memory and strict examiner marking.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--input)' }}>
      <div className="mb-2" style={{ color: 'var(--primary)' }}>{icon}</div>
      <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="mt-1 text-sm font-black" style={{ color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function ReportList({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'warning' | 'info' }) {
  const color = tone === 'success' ? '#10B981' : tone === 'warning' ? '#F59E0B' : '#22D3EE'
  return (
    <Card className="p-5">
      <h2 className="text-sm font-black" style={{ color }}>{title}</h2>
      <div className="mt-3 space-y-2">
        {(items.length ? items : ['No clear pattern yet. Sit another paper for stronger evidence.']).map(item => (
          <div key={item} className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item}</div>
        ))}
      </div>
    </Card>
  )
}
