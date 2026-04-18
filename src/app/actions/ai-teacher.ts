'use server'

import { createClient } from '@/lib/supabase/server'
import { AIIntent } from '@/stores/aiFormStore'
import { extractTextFromPDF, extractTextFromDOCX } from '@/lib/utils/file-parser'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SITE_NAME = 'Peak Teacher Assistant'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

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
    { "question": string, "type": "long_answer" | "short_answer", "marks": number, "lines": number }
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

  const context = JSON.stringify(assignments || [])

  // 2. Call AI
  const fullPrompt = `
    Teacher Prompt: "${prompt}"
    ${extractedText ? `Extracted Document Text: "${extractedText}"` : ''}
    ${mediaUrls.length > 0 ? `Uploaded Media Files: ${JSON.stringify(mediaUrls)}` : ''}
    Teacher Context (Classes/Subjects): ${context}
    
    If any media file name matches a question (e.g., "image1 for question 1"), include its URL in the question object as "image_url".
  `

  if (!OPENROUTER_API_KEY) return { error: 'AI Service Config Missing' }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-lite-001',
        messages: [
          { role: 'system', content: TEACHER_AI_SYSTEM_PROMPT },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.1, // Low temperature for deterministic JSON
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('AI returned empty response')

    const parsedData = JSON.parse(content)

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
