'use server'

import { createClient } from '@/lib/supabase/server'
import { AIIntent } from '@/stores/aiFormStore'
import { extractTextFromPDF, extractTextFromDOCX } from '@/lib/utils/file-parser'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'

const TEACHER_AI_SYSTEM_PROMPT = `
You are the "Peak Teacher Assistant" — an expert educational content architect and form operator.
Your job is to transform teacher instructions into perfectly structured JSON data for four types of portal content:
1. assignment
2. quiz
3. trivia
4. resource

STRICT OUTPUT FORMAT:
You MUST return ONLY a JSON object. No explanation, no markdown blocks.

JSON STRUCTURES:

For "assignment":
{
  "type": "assignment",
  "title": string,
  "class_id": string (optional),
  "subject_id": string (optional),
  "due_date": string (ISO format, optional),
  "settings": {
    "late_submission": boolean,
    "strict_mode": boolean
  },
  "questions": [
    { "question": string, "type": "long_answer" | "short_answer" | "math", "marks": number, "lines": number }
  ],
  "missing_fields": string[]
}

For "quiz":
{
  "type": "quiz",
  "title": string,
  "questions": [
    { "text": string, "type": "multiple_choice" | "true_false", "options": string[], "correct_answer": string, "marks": number }
  ],
  "missing_fields": string[]
}

(Similar for trivia and resource)

INSTRUCTIONS:
- Analyze the prompt and any extracted document text.
- If a document is provided, extract key concepts to generate questions.
- If specific questions are provided manually, structure them perfectly.
- "missing_fields" should list required metadata not found in the prompt (e.g., class_id, due_date).
- Use teacher context (list of their classes/subjects) to find IDs if possible.
- CURRICULUM RELEVANCE: the prompt names a class, subject, topic and often a
  curriculum (CBC or 8-4-4/KCSE). Anchor every question to that syllabus at
  that level: CBC questions stress competencies and practical application for
  the grade; 8-4-4/KCSE questions mirror national-exam style, command words
  and depth for the form. Never write Form 4 content for Grade 7 or vice
  versa. If the level is ambiguous, aim slightly below rather than above.
- MATH & SCIENCES: for Mathematics, Physics, Chemistry or Biology, write ALL
  formulas and equations in LaTeX — $...$ inline, $$...$$ for display
  equations. Mark equation-heavy assignment questions with type "math".
  Never write raw ASCII math like x^2 or sqrt() — always LaTeX.
- Each question must be answerable from the topic, carry sensible marks for
  its demand, and vary in difficulty (start accessible, end challenging).
`.trim()

export async function extractTextFromFileAction(url: string, fileName: string) {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (fileName.endsWith('.pdf')) {
      return await extractTextFromPDF(buffer)
    } else if (fileName.endsWith('.docx')) {
      return await extractTextFromDOCX(buffer)
    } else {
      return buffer.toString('utf-8')
    }
  } catch (err: any) {
    console.error('Extraction Action Error:', err)
    return `[Error extracting text from ${fileName}]`
  }
}

export async function processTeacherInstruction(
  prompt: string, 
  extractedText?: string,
  mediaUrls: { name: string, url: string }[] = []
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Fetch teacher context (their classes/subjects) to help AI map IDs
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, user_id')
    .eq('user_id', user.id)
    .single()
  
  if (!teacher) return { error: 'Teacher record not found' }

  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('class_id, class:classes(name), subject_id, subject:subjects(name)')
    .eq('teacher_id', teacher.id)

  // Same three sources the portal UI reads: formal assignments,
  // self-registered subjects, and onboarding teaching-map entries. Any one
  // of them may be the only place a class/subject link lives.
  const [{ data: selfRegs }, { data: teachMap }] = await Promise.all([
    supabase
      .from('teacher_subject_classes')
      .select('class_id, subject_id, class:classes(name), subject:subjects(name)')
      .eq('teacher_id', teacher.id),
    supabase
      .from('teacher_teaching_map')
      .select('class_id, subject_id, class:classes(name), subject:subjects(name)')
      .eq('teacher_id', teacher.id),
  ])

  const seen = new Set<string>()
  const contextRows: any[] = []
  for (const row of [...(assignments || []), ...(selfRegs || []), ...(teachMap || [])] as any[]) {
    const key = `${row.class_id}:${row.subject_id}`
    if (seen.has(key)) continue
    seen.add(key)
    contextRows.push(row)
  }
  const context = JSON.stringify(contextRows)

  // 2. Call AI
  const fullPrompt = `
    Teacher Prompt: "${prompt}"
    ${extractedText ? `Extracted Document Text: "${extractedText}"` : ''}
    ${mediaUrls.length > 0 ? `Uploaded Media Files: ${JSON.stringify(mediaUrls)}` : ''}
    Teacher Context (Classes/Subjects): ${context}
    
    If any media file name matches a question (e.g., "image1 for question 1"), include its URL in the question object as "image_url".
  `

  // 2. Call AI — provider chain: HuggingFace first (status quo), then
  // Gemini. A missing HF token no longer hard-blocks generation ("AI Service
  // Config Missing") while a working Gemini key sits configured.
  const useHF = hasHuggingFaceToken()
  const useGemini = hasGeminiToken()
  if (!useHF && !useGemini) return { error: 'AI Service Config Missing' }

  try {
    const messages = [
      { role: 'system', content: TEACHER_AI_SYSTEM_PROMPT },
      { role: 'user', content: fullPrompt },
    ] as const
    let content: string | null = null
    const providerErrors: string[] = []
    if (useHF) {
      try {
        const response = await callHuggingFaceChat(
          [...messages] as any,
          // Firm per-call budget: without it one hung provider can stall the
          // whole 4-model chain for minutes and the teacher stares at a spinner.
          { temperature: 0.1, maxTokens: 1800, responseFormat: { type: 'json_object' }, timeoutMs: 25000, retries: 1 },
        )
        content = response.content
      } catch (e: any) {
        providerErrors.push(`huggingface: ${e?.message || 'failed'}`)
      }
    }
    if (!content && useGemini) {
      try {
        const response = await callGeminiChat(
          [...messages] as any,
          { temperature: 0.1, maxTokens: 1800, responseFormat: { type: 'json_object' } },
        )
        content = response.content
      } catch (e: any) {
        providerErrors.push(`gemini: ${e?.message || 'failed'}`)
      }
    }
    if (!content) {
      throw new Error(
        providerErrors.length > 0
          ? `AI providers failed (${providerErrors.join('; ')}). Please try again.`
          : 'Failed to process instructions. Please try again.'
      )
    }
    const jsonText = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    const parsedData = JSON.parse(jsonText)

    // 3. Save to ai_jobs
    const { data: job } = await supabase.from('ai_jobs').insert({
      teacher_id: teacher.id,
      raw_prompt: prompt,
      intent_type: parsedData.type,
      parsed_output: parsedData,
      status: parsedData.publish_at ? 'scheduled' : 'completed',
      scheduled_for: parsedData.publish_at || null
    }).select().single()

    return { data: parsedData, jobId: job?.id }
  } catch (error: any) {
    console.error('[AI Teacher Action Error]', error)
    return { error: 'Failed to process instructions. Please try again.' }
  }
}
