'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { createLearningObjective, getLearningObjectives } from '@/app/actions/homeschooling'
import { createActivity, createQuestion, publishMission, getSessionPreparation } from '@/app/actions/homeschool-learning'
import toast from 'react-hot-toast'

// §20 — Guided mission builder. Steps, not a giant form:
// Mission → Objectives → Activities → Questions → Mastery → Publish.
const STEPS = ['Mission', 'Objectives', 'Activities', 'Questions', 'Publish'] as const

const ACTIVITY_TYPES = [
  { group: 'Teach', options: ['Video', 'Document', 'Teacher Notes', 'Link'] },
  { group: 'Practice', options: ['Questions', 'Interactive Practice', 'Retrieval Practice'] },
  { group: 'Work', options: ['Worksheet', 'Photo Submission', 'File Submission'] },
  { group: 'Assess', options: ['Teacher Assessment', 'Uploaded Assessment'] },
  { group: 'Reflect', options: ['Self Assessment', 'Reflection', 'Error Review'] },
]

export default function TeacherMissionBuilder({
  sessionId,
  onPublished,
  onObjectivesChanged,
}: {
  sessionId: string
  onPublished?: () => void
  onObjectivesChanged?: () => void
}) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [prep, setPrep] = useState<any>(null)

  // Step 1
  const [topic, setTopic] = useState('')
  const [goal, setGoal] = useState('')
  const [why, setWhy] = useState('')

  // Step 2
  const [objectives, setObjectives] = useState<Array<{ id?: string; title: string; description: string }>>([])
  const [objTitle, setObjTitle] = useState('')
  const [objDesc, setObjDesc] = useState('')

  // Step 3
  const [activityType, setActivityType] = useState('Questions')
  const [activityTitle, setActivityTitle] = useState('')
  const [activityInstructions, setActivityInstructions] = useState('')
  const [supportMode, setSupportMode] = useState('PEAK_COACH')
  const [assessmentMode, setAssessmentMode] = useState('SYSTEM')
  const [activities, setActivities] = useState<any[]>([])

  // Step 4
  const [qPrompt, setQPrompt] = useState('')
  const [qAnswer, setQAnswer] = useState('')
  const [qDifficulty, setQDifficulty] = useState('standard')
  const [qReview, setQReview] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])

  const refreshPrep = async () => {
    const res = await getSessionPreparation(sessionId)
    if (res.success) setPrep(res.data)
  }

  // QC FIX (double-entry): this builder used to keep objectives in LOCAL state
  // only, while the Session Content Builder below it lists the SAME table from
  // the DB. Teachers added an objective here, didn't see it "below", and added
  // it again. Seed from the DB so both views show the same truth.
  useEffect(() => {
    let cancelled = false
    getLearningObjectives(sessionId).then((res) => {
      if (!cancelled && res.success && Array.isArray(res.data)) {
        setObjectives(
          (res.data as any[]).map((o: any) => ({ id: o.id, title: o.title, description: o.description || '' }))
        )
      }
    })
    return () => { cancelled = true }
  }, [sessionId])

  const addObjective = async () => {
    if (!objTitle.trim()) {
      toast.error('Give the objective a title')
      return
    }
    setSaving(true)
    const res = await createLearningObjective(sessionId, objTitle.trim(), objDesc.trim() || undefined)
    setSaving(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to add objective')
      return
    }
    if ((res as any).deduped) {
      // Same title already on this session (added via the other form or a
      // double-click) — surface it instead of silently duplicating.
      setObjectives((o) =>
        o.some((x) => x.id === (res.data as any).id)
          ? o
          : [...o, { id: (res.data as any).id, title: (res.data as any).title, description: (res.data as any).description || '' }]
      )
      setObjTitle('')
      setObjDesc('')
      toast.success('That objective is already on this session — kept the original')
      onObjectivesChanged?.()
      return
    }
    setObjectives((o) => [...o, { id: (res.data as any).id, title: objTitle.trim(), description: objDesc.trim() }])
    setObjTitle('')
    setObjDesc('')
    toast.success('Objective added')
    onObjectivesChanged?.()
  }

  const addActivity = async () => {
    if (!activityTitle.trim()) {
      toast.error('Give the activity a title')
      return
    }
    setSaving(true)
    const res = await createActivity({
      session_id: sessionId,
      objective_id: objectives[objectives.length - 1]?.id,
      activity_type: activityType.includes('Assessment') ? 'ASSESS' : activityType.includes('Worksheet') || activityType.includes('Submission') ? 'WORK' : 'PRACTICE',
      interaction_type: activityType.toUpperCase().replace(/ /g, '_'),
      assessment_mode: assessmentMode,
      support_mode: supportMode,
      title: activityTitle.trim(),
      instructions: activityInstructions.trim() || undefined,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to add activity')
      return
    }
    setActivities((a) => [...a, res.data])
    setActivityTitle('')
    setActivityInstructions('')
    toast.success('Activity added')
  }

  const addQuestion = async () => {
    if (!qPrompt.trim()) {
      toast.error('Write the question prompt')
      return
    }
    setSaving(true)
    const res = await createQuestion({
      session_id: sessionId,
      objective_id: objectives[objectives.length - 1]?.id,
      activity_id: activities[activities.length - 1]?.id,
      prompt: qPrompt.trim(),
      expected_answer: qAnswer.trim() ? { value: qAnswer.trim() } : undefined,
      difficulty: qDifficulty,
      teacher_review_required: qReview,
      assessment_mode: undefined,
    } as any)
    setSaving(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to add question')
      return
    }
    setQuestions((q) => [...q, res.data])
    setQPrompt('')
    setQAnswer('')
    toast.success('Question added')
  }

  const publish = async () => {
    setSaving(true)
    const res = await publishMission(sessionId)
    setSaving(false)
    if (!res.success) {
      toast.error(res.error || 'Cannot publish yet')
      await refreshPrep()
      return
    }
    toast.success(`Mission published (v${(res.data as any)?.version})`)
    onPublished?.()
  }

  const canNext = step === 0 ? true : step === 1 ? objectives.length > 0 : true

  return (
    <div className="rounded-2xl border p-4 sm:p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => i <= step && setStep(i)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap"
            style={{
              background: i === step ? 'var(--primary)' : i < step ? 'rgba(16,185,129,0.12)' : 'var(--input)',
              color: i === step ? '#fff' : i < step ? '#10B981' : 'var(--text-muted)',
            }}
          >
            <span>{i < step ? '✓' : `${i + 1}`}</span> {s}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
          className="space-y-3"
        >
          {step === 0 && (
            <>
              <Input label="Topic *" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Quadratic equations by factorization" />
              <Textarea label="Learning goal *" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Students will be able to…" />
              <Textarea label="Why it matters" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="This skill supports…" />
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Topic, goal and purpose are saved onto the session when you continue.
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Objective title *" value={objTitle} onChange={(e) => setObjTitle(e.target.value)} placeholder="e.g. Factor a quadratic expression" />
                <Input label="Why it matters" value={objDesc} onChange={(e) => setObjDesc(e.target.value)} placeholder="Short purpose…" />
              </div>
              <Button size="sm" onClick={addObjective} isLoading={saving}>+ Add objective</Button>
              {objectives.length > 0 && (
                <ol className="space-y-1.5">
                  {objectives.map((o, i) => (
                    <li key={o.id || i} className="flex items-center gap-2 text-sm rounded-xl px-3 py-2" style={{ background: 'var(--input)' }}>
                      <span className="text-xs font-black" style={{ color: 'var(--primary)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-bold" style={{ color: 'var(--text)' }}>{o.title}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Select label="Activity kind" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                  {ACTIVITY_TYPES.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </optgroup>
                  ))}
                </Select>
                <Input label="Activity title *" value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} placeholder="e.g. Factor these expressions" />
              </div>
              <Textarea label="Instructions" rows={2} value={activityInstructions} onChange={(e) => setActivityInstructions(e.target.value)} placeholder="What should the student do?" />
              <div className="grid sm:grid-cols-2 gap-3">
                <Select label="Support" value={supportMode} onChange={(e) => setSupportMode(e.target.value)}>
                  <option value="PEAK_COACH">Peak Coach</option>
                  <option value="NONE">None (independent)</option>
                  <option value="TEACHER">Teacher</option>
                </Select>
                <Select label="Assessment" value={assessmentMode} onChange={(e) => setAssessmentMode(e.target.value)}>
                  <option value="SYSTEM">Automatic</option>
                  <option value="TEACHER">Teacher review</option>
                  <option value="AI_FORMATIVE">AI formative check</option>
                </Select>
              </div>
              <Button size="sm" onClick={addActivity} isLoading={saving}>+ Add activity</Button>
              {activities.length > 0 && (
                <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  {activities.length} activit{activities.length === 1 ? 'y' : 'ies'} added
                </p>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Textarea label="Question prompt *" rows={2} value={qPrompt} onChange={(e) => setQPrompt(e.target.value)} placeholder="Write the exact question…" />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Expected answer (for auto-checking)" value={qAnswer} onChange={(e) => setQAnswer(e.target.value)} placeholder="Leave blank for teacher review" />
                <Select label="Difficulty" value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)}>
                  <option value="foundation">Foundation</option>
                  <option value="standard">Standard</option>
                  <option value="challenge">Challenge</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={qReview} onChange={(e) => setQReview(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Requires teacher review</span>
              </label>
              <Button size="sm" onClick={addQuestion} isLoading={saving}>+ Add question</Button>
              {questions.length > 0 && (
                <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  {questions.length} question{questions.length === 1 ? '' : 's'} added
                </p>
              )}
            </>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ background: 'var(--input)' }}>
                <p className="text-sm font-black mb-2" style={{ color: 'var(--text)' }}>Mission ready</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {objectives.length} objectives · {activities.length} activities · {questions.length} questions
                </p>
                {prep && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Preparation: {prep.state}
                  </p>
                )}
              </div>
              <Button onClick={publish} isLoading={saving}>
                <Rocket size={15} /> Publish mission
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <ChevronLeft size={14} /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            size="sm"
            disabled={!canNext}
            onClick={async () => {
              if (step === 0 && (topic || goal)) {
                // QC: this save used to fail silently (teachers got access-denied
                // here while believing the mission saved). Surface the result.
                try {
                  const { updateLearningSession } = await import('@/app/actions/homeschooling')
                  const saved = await updateLearningSession(sessionId, {
                    topic: topic || undefined,
                    learning_goal: goal || undefined,
                    instructions: why ? `Why it matters: ${why}` : undefined,
                  } as any)
                  if (!(saved as any).success) {
                    toast.error((saved as any).error || 'Could not save mission details')
                    return
                  }
                } catch (err: any) {
                  toast.error(err.message || 'Could not save mission details')
                  return
                }
              }
              if (step === STEPS.length - 2) await refreshPrep()
              setStep((s) => s + 1)
            }}
          >
            Continue <ChevronRight size={14} />
          </Button>
        ) : (
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Review, then publish above
          </span>
        )}
      </div>
    </div>
  )
}
