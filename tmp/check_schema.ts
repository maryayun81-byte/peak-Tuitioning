import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rxqdphgskikofsbzbbwi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cWRwaGdza2lrb2ZzYnpiYndpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjUxMjUsImV4cCI6MjA4OTI0MTEyNX0.D2JXTNZ3Uv0Fdus-JvPXMj6B-l3jQTNgMiZ9EoA0xKc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  // Use a hack to see columns by trying to select something that won't exist or just select all and check keys
  const { data, error } = await supabase.from('grading_systems').select('*').limit(1)
  
  if (error) {
    console.error('Error fetching grading_systems:', error)
  } else {
    console.log('--- GRADING SYSTEMS COLUMNS ---')
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]))
    } else {
      console.log('Table is empty, trying another way...')
      // Try to insert a dummy record and see what it has (rollback is not easy here, so just check keys of null if possible? no)
      // Actually, if it's empty, we can just check if we can select class_id specifically
      const { error: colErr } = await supabase.from('grading_systems').select('class_id').limit(1)
      if (colErr) console.log('class_id missing:', colErr.message)
      else console.log('class_id exists')
      
      const { error: defErr } = await supabase.from('grading_systems').select('is_default').limit(1)
      if (defErr) console.log('is_default missing:', defErr.message)
      else console.log('is_default exists')

      const { error: overErr } = await supabase.from('grading_systems').select('is_overall').limit(1)
      if (overErr) console.log('is_overall missing:', overErr.message)
      else console.log('is_overall exists')
    }
  }
}

checkSchema()
