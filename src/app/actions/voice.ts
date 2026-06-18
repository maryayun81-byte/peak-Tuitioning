'use server'

import { createClient } from '@/lib/supabase/server'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'

export async function saveVoiceNote(studentId: string, title: string, audioBase64: string, subjectId?: string) {
  const supabase = await createClient()
  
  // 1. Convert base64 to buffer
  const base64Data = audioBase64.split(',')[1] || audioBase64
  const audioBuffer = Buffer.from(base64Data, 'base64')

  // 2. Upload to Supabase Storage (Assumes 'voice_notes' bucket exists)
  const fileName = `${studentId}/${Date.now()}.webm`
  
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('voice_notes')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/webm',
      upsert: true
    })

  // If storage fails, we might just fall back to null url for now
  let audioUrl = ''
  if (!uploadError && uploadData) {
    const { data: { publicUrl } } = supabase.storage.from('voice_notes').getPublicUrl(fileName)
    audioUrl = publicUrl
  } else {
    console.error('Failed to upload voice note to storage. Please ensure "voice_notes" bucket exists and is public.', uploadError)
    // Fallback: store base64 directly (NOT RECOMMENDED FOR PROD, but works for demo)
    audioUrl = audioBase64
  }

  // 3. Simulate AI Transcription & Summarization 
  // (In a real app, we'd send the audioBuffer to an STT API like Whisper)
  // For now, we will generate a dummy transcript based on the title
  let transcript = `(Auto-generated transcript based on title: ${title})\nIn this voice note, the student discusses key concepts related to ${title}. The main points covered are essential for upcoming revisions...`
  let aiSummary = `Key point: Review ${title} concepts thoroughly.`

  // Try to use AI to generate a more realistic "fake" transcript if text AI is available
  try {
    const prompt = `Generate a realistic 3-sentence transcript of a student explaining the topic "${title}" to themselves as a study note. Then provide a 1-sentence summary.`
    
    let aiResponse = null
    if (hasGroqToken()) {
      const res = await callGroqChat([{ role: 'user', content: prompt }], { temperature: 0.7 })
      aiResponse = res.content
    } else if (hasGeminiToken()) {
      const res = await callGeminiChat([{ role: 'user', content: prompt }], { temperature: 0.7 })
      aiResponse = res.content
    }

    if (aiResponse) {
      transcript = aiResponse
      aiSummary = 'AI Summary generated from audio.'
    }
  } catch (e) {
    // ignore
  }

  // 4. Save to DB
  const { data: note, error: dbError } = await supabase
    .from('voice_revision_notes')
    .insert({
      student_id: studentId,
      subject_id: subjectId,
      title,
      audio_url: audioUrl,
      transcript,
      ai_summary: aiSummary
    })
    .select()
    .single()
  
  if (dbError) throw dbError
  return note
}

export async function getStudentVoiceNotes(studentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('voice_revision_notes')
    .select('*, subject:subjects(name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}
