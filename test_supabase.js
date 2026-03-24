import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase
    .from('teacher_teaching_map')
    .select(`
      class_id,
      subject_id,
      classes (id, name),
      subjects (id, name, class_id)
    `)
    .limit(5)

  console.log('Error:', error)
  console.log('Data:', JSON.stringify(data, null, 2))
}

run()
