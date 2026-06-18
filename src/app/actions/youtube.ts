'use server'

import { createClient } from '@/lib/supabase/server'

export async function getStudentYouTubeSuggestions(classId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('teacher_youtube_suggestions')
    .select('*, teacher:teachers(full_name)')
    .order('created_at', { ascending: false })
    .limit(3)

  if (classId) {
    query = query.or(`class_id.eq.${classId},class_id.is.null`)
  } else {
    query = query.is('class_id', null)
  }

  const { data, error } = await query
  if (error) return []
  return data
}
