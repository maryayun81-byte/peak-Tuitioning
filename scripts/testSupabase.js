// Script to run using node locally
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ey...'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  const teacherId = '2a3c20c0-63ce-4762-b91c-1bb35fc62eb4' // I don't know the exact UUID but I can just test a malformed query
  const classId = 'dcb2cdff-7f41-4cf4-90cc-111111111111'
  const { data, error } = await supabase
    .from('teacher_teaching_map')
    .select(`
      subject_id,
      subjects (id, name)
    `)
    // .eq('teacher_id', teacherId)
    // .eq('class_id', classId)

  console.log(error)
}

test()
