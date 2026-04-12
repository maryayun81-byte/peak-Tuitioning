import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321', 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test'
)

async function test() {
  console.log('Testing query...')
  const start = Date.now()
  const { data, error } = await supabase
    .from('teachers')
    .select(
      *,
      teacher_curricula(curriculum:curricula(name)),
      teacher_assignments(
        class:classes(id, name),
        subject:subjects(name),
        is_class_teacher
      )
    )
    .limit(1)
  
  if (error) {
    console.error('ERROR:', error)
  } else {
    console.log('SUCCESS! Time:', Date.now() - start, 'ms')
  }
}
test()
