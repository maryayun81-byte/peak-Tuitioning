'use server'

import { createClient } from '@/lib/supabase/server'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'
import { callGitHubModelsChat, hasGitHubModelsToken } from '@/lib/github-models-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'
import {
  buildExamGenerationPrompt,
  getExamBlueprint,
  getFallbackExamPaper,
  listExamBlueprints,
  validateExamPaper,
  type ExamQuestion,
  type GeneratedExamPaper,
} from '@/lib/examDesk/blueprints'
import { recordPeakCoachMasterySignals } from './brainGym'

function cleanJsonResponse(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return text
  return match[0].replace(/,\s*(\]|\})/g, '$1')
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

async function getCurrentStudent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: student } = await supabase
    .from('students')
    .select('id, curriculum:curriculums(name), class:classes(name, level)')
    .eq('user_id', user.id)
    .single()

  if (!student) throw new Error('Student not found')
  return { supabase, studentId: student.id, student }
}

async function getWeakOutcomes(supabase: any, studentId: string, subject: string) {
  try {
    const { data, error } = await supabase
      .from('student_syllabus_outcome_mastery')
      .select('subject, syllabus_outcome, mastery_estimate')
      .eq('student_id', studentId)
      .eq('subject', subject)
      .lt('mastery_estimate', 0.72)
      .order('mastery_estimate', { ascending: true })
      .limit(8)

    if (error) throw error
    return (data || []).map((row: any) => `${row.subject}: ${row.syllabus_outcome} (${Math.round(Number(row.mastery_estimate || 0) * 100)}%)`)
  } catch (error: any) {
    if (!/student_syllabus_outcome_mastery|schema cache|Could not find the table/i.test(error?.message || '')) {
      console.error('[ExamDesk] weak outcomes unavailable:', error?.message)
    }
    return []
  }
}

function normalizePaper(value: any): GeneratedExamPaper | null {
  if (!value || typeof value !== 'object') return null
  const paperMeta = value.paperMeta || value.paper_meta
  const sections = Array.isArray(value.sections) ? value.sections : []

  return {
    paperMeta: {
      curriculum: paperMeta?.curriculum,
      level: paperMeta?.level,
      subject: paperMeta?.subject,
      paper: paperMeta?.paper,
      durationMinutes: Number(paperMeta?.durationMinutes || paperMeta?.duration_minutes),
      totalMarks: Number(paperMeta?.totalMarks || paperMeta?.total_marks),
      blueprintId: paperMeta?.blueprintId || paperMeta?.blueprint_id,
    },
    sections: sections.map((section: any, sectionIndex: number) => ({
      sectionName: section.sectionName || section.section_name || `Section ${sectionIndex + 1}`,
      questions: (Array.isArray(section.questions) ? section.questions : []).map((q: any, questionIndex: number) => ({
        id: String(q.id || `s${sectionIndex + 1}q${questionIndex + 1}`),
        sectionName: q.sectionName || q.section_name || section.sectionName || section.section_name || `Section ${sectionIndex + 1}`,
        marks: Number(q.marks || 1),
        commandWords: Array.isArray(q.commandWords || q.command_words) ? (q.commandWords || q.command_words).map(String) : [],
        syllabusOutcome: String(q.syllabusOutcome || q.syllabus_outcome || q.topic || 'General outcome'),
        questionText: String(q.questionText || q.question_text || q.question || ''),
        requiresTool: q.requiresTool || q.requires_tool || null,
        markingScheme: (Array.isArray(q.markingScheme || q.marking_scheme) ? (q.markingScheme || q.marking_scheme) : []).map((step: any) => ({
          step: String(step.step || step.point || ''),
          marks: Number(step.marks || 0),
          type: ['M', 'A', 'C', 'B'].includes(step.type) ? step.type : 'M',
        })).filter((step: any) => step.step && step.marks > 0),
        modelAnswer: String(q.modelAnswer || q.model_answer || q.correctAnswer || q.correct_answer || ''),
        commonErrors: Array.isArray(q.commonErrors || q.common_errors) ? (q.commonErrors || q.common_errors).map(String) : [],
      })),
    })),
  }
}

async function generatePaperWithProviders(blueprintId: string, weakOutcomes: string[]) {
  const blueprint = getExamBlueprint(blueprintId)
  const prompt = buildExamGenerationPrompt(blueprint, weakOutcomes)
  const messages = [
    { role: 'system' as const, content: 'You generate authentic Kenyan national examination papers. Return valid JSON only.' },
    { role: 'user' as const, content: prompt },
  ]

  const task = /(mathematics|chemistry|physics)/i.test(blueprint.subject) ? 'reasoning' : 'language'
  const providerTimeoutMs = Number(process.env.EXAM_DESK_AI_TIMEOUT_MS || 12000)
  const providers: { name: string; call: () => Promise<{ content: string; model?: string }> }[] = []
  if (hasGitHubModelsToken()) providers.push({ name: 'GitHub Models Phi', call: () => callGitHubModelsChat(messages, { temperature: 0.25, maxTokens: 3200, task }) })
  if (hasGeminiToken()) providers.push({ name: 'Gemini', call: () => callGeminiChat(messages, { temperature: 0.25, maxTokens: 3200, responseFormat: { type: 'json_object' } }) })
  if (hasGroqToken()) providers.push({ name: 'Groq', call: () => callGroqChat(messages, { temperature: 0.25, maxTokens: 3200, responseFormat: { type: 'json_object' } }) })
  if (hasHuggingFaceToken()) providers.push({ name: 'Hugging Face', call: () => callHuggingFaceChat(messages, { temperature: 0.25, maxTokens: 2600, responseFormat: { type: 'json_object' } }) })

  if (providers.length > 0) {
    const failures: string[] = []
    const attempts = providers.map(async provider => {
      try {
        const response = await withTimeout(provider.call(), providerTimeoutMs, `[ExamDesk] ${provider.name}`)
        const parsed = normalizePaper(JSON.parse(cleanJsonResponse(response.content)))
        if (!parsed || !validateExamPaper(parsed, blueprint)) {
          throw new Error('returned paper failed blueprint validation')
        }
        return {
          ...parsed,
          paperMeta: { ...parsed.paperMeta, providerModel: response.model || provider.name } as any,
        }
      } catch (error: any) {
        failures.push(`${provider.name}: ${error?.message || 'failed'}`)
        return null
      }
    })

    const settled = await Promise.all(attempts)
    const firstValid = settled.find(Boolean)
    if (firstValid) return firstValid
    console.error(`[ExamDesk] AI paper generation unavailable; using blueprint fallback. ${failures.join(' | ')}`)
  }

  return getFallbackExamPaper(blueprint)
}

async function persistSession(supabase: any, studentId: string, paper: GeneratedExamPaper) {
  try {
    const { data, error } = await supabase
      .from('exam_sessions')
      .insert({
        student_id: studentId,
        paper_blueprint_id: paper.paperMeta.blueprintId,
        curriculum: paper.paperMeta.curriculum,
        level: paper.paperMeta.level,
        subject: paper.paperMeta.subject,
        paper_name: paper.paperMeta.paper,
        duration_minutes: paper.paperMeta.durationMinutes,
        total_marks: paper.paperMeta.totalMarks,
        paper_json: paper,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        integrity_score: 100,
      })
      .select('id')
      .single()

    if (error) throw error
    return data?.id as string
  } catch (error: any) {
    console.error('[ExamDesk] session persistence skipped:', error?.message)
    return `local-${Date.now()}`
  }
}

export async function getExamDeskBlueprints() {
  return listExamBlueprints()
}

export async function getExamDeskAiStatus() {
  return [
    { name: 'GitHub Models Phi', configured: hasGitHubModelsToken(), role: 'Phi-4 reasoning/language router' },
    { name: 'Gemini', configured: hasGeminiToken(), role: 'fast JSON fallback' },
    { name: 'Groq', configured: hasGroqToken(), role: 'fast Llama fallback' },
    { name: 'Hugging Face', configured: hasHuggingFaceToken(), role: 'open-model fallback via router' },
  ]
}

export async function getExamDeskStudentContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { curriculum: '', className: '', level: null as number | null }

  const { data } = await supabase
    .from('students')
    .select('class:classes(name, level), curriculum:curriculums(name)')
    .eq('user_id', user.id)
    .single()

  return {
    curriculum: (data as any)?.curriculum?.name || '',
    className: (data as any)?.class?.name || '',
    level: (data as any)?.class?.level ?? null,
  }
}

export async function startExamDeskSession(blueprintId: string) {
  const { supabase, studentId } = await getCurrentStudent()
  const blueprint = getExamBlueprint(blueprintId)
  const weakOutcomes = await getWeakOutcomes(supabase, studentId, blueprint.subject)
  const paper = await generatePaperWithProviders(blueprint.id, weakOutcomes)
  const sessionId = await persistSession(supabase, studentId, paper)
  return { sessionId, paper, weakOutcomes }
}

function markTextResponse(question: ExamQuestion, response: string) {
  const answer = response.trim().toLowerCase()
  const model = question.modelAnswer.toLowerCase()
  const outcomeWords = question.syllabusOutcome.toLowerCase().split(/\W+/).filter(word => word.length > 4)
  const modelWords = model.split(/\W+/).filter(word => word.length > 5).slice(0, 12)
  const hits = [...outcomeWords, ...modelWords].filter(word => answer.includes(word)).length
  const hasWorking = /\d|because|therefore|hence|kwa sababu|hivyo|for example|mfano|show|method|units/i.test(response)
  const hasEnoughText = response.trim().split(/\s+/).filter(Boolean).length >= Math.min(25, Math.max(8, question.marks * 3))

  let ratio = 0
  if (hasEnoughText) ratio += 0.3
  if (hasWorking) ratio += 0.25
  ratio += Math.min(0.45, hits * 0.08)

  const score = Math.min(question.marks, Math.round(question.marks * ratio))
  const missed = question.markingScheme
    .filter((_, index) => index >= Math.ceil(question.markingScheme.length * ratio))
    .map(step => step.step)
    .slice(0, 3)

  return {
    score,
    maxScore: question.marks,
    missed,
    comment: score >= question.marks * 0.75
      ? 'Strong examiner-aligned response. Keep showing method and final form.'
      : score >= question.marks * 0.45
        ? 'Some credit earned, but the response needs clearer method, evidence or final examiner wording.'
        : 'Low credit. Rebuild this answer from the command word, then show working or evidence.',
  }
}

export async function markExamDeskSession(input: {
  sessionId: string
  paper: GeneratedExamPaper
  responses: Record<string, string>
}) {
  const { supabase, studentId } = await getCurrentStudent()
  const questions = input.paper.sections.flatMap(section => section.questions)
  const itemMarks = questions.map(question => {
    const response = input.responses[question.id] || ''
    const mark = markTextResponse(question, response)
    return { question, response, ...mark }
  })
  const marksEarned = itemMarks.reduce((sum, item) => sum + item.score, 0)
  const totalMarks = questions.reduce((sum, item) => sum + item.marks, 0)
  const percentage = totalMarks ? Math.round((marksEarned / totalMarks) * 100) : 0
  const grade = percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'E'

  await recordPeakCoachMasterySignals(studentId, itemMarks.map(item => ({
    curriculum: input.paper.paperMeta.curriculum,
    subject: input.paper.paperMeta.subject,
    syllabusOutcome: item.question.syllabusOutcome,
    marksAvailable: item.question.marks,
    marksEarned: item.score,
  })))

  if (!input.sessionId.startsWith('local-')) {
    try {
      await supabase
        .from('exam_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          score: marksEarned,
          percentage,
          grade,
        })
        .eq('id', input.sessionId)

      await supabase.from('exam_items').insert(itemMarks.map(item => ({
        session_id: input.sessionId,
        question_id: item.question.id,
        question_json: item.question,
        response_json: { text: item.response },
        ai_score: item.score,
        final_score: item.score,
        max_score: item.maxScore,
        marking_breakdown: {
          missed: item.missed,
          comment: item.comment,
          markingScheme: item.question.markingScheme,
        },
      })))
    } catch (error: any) {
      console.error('[ExamDesk] marking persistence skipped:', error?.message)
    }
  }

  const weak = itemMarks
    .filter(item => item.score < item.maxScore * 0.5)
    .sort((a, b) => (b.maxScore - b.score) - (a.maxScore - a.score))
    .slice(0, 5)

  return {
    marksEarned,
    totalMarks,
    percentage,
    grade,
    itemMarks: itemMarks.map(item => ({
      questionId: item.question.id,
      score: item.score,
      maxScore: item.maxScore,
      comment: item.comment,
      missed: item.missed,
      syllabusOutcome: item.question.syllabusOutcome,
      modelAnswer: item.question.modelAnswer,
    })),
    report: {
      strengths: itemMarks
        .filter(item => item.score >= item.maxScore * 0.8)
        .slice(0, 4)
        .map(item => item.question.syllabusOutcome),
      weaknesses: weak.map(item => item.question.syllabusOutcome),
      nextActions: weak.slice(0, 2).map(item => `Train ${item.question.syllabusOutcome} in Brain Gym, then sit a focused mini-paper.`),
      predictedGrade: grade,
      confidence: itemMarks.length >= 8 ? 'medium' : 'low',
    },
  }
}

export async function recordExamInvigilationEvent(input: {
  sessionId: string
  eventType: string
  payload?: Record<string, any>
}) {
  if (!input.sessionId || input.sessionId.startsWith('local-')) return { recorded: false }
  const { supabase } = await getCurrentStudent()

  try {
    const { error } = await supabase.from('invigilation_events').insert({
      session_id: input.sessionId,
      event_type: input.eventType,
      payload: input.payload || {},
    })
    if (error) throw error
    return { recorded: true }
  } catch (error: any) {
    console.error('[ExamDesk] invigilation persistence skipped:', error?.message)
    return { recorded: false }
  }
}
