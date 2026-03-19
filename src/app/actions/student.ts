'use server'

import { createClient } from '@supabase/supabase-js'

export async function createStudentUser(admissionNumber: string, emailStr: string, tempPwd: string, fullName: string) {
  // We use the service role key to bypass RLS and auth restrictions 
  // so the Admin doesn't get logged out of their current session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase.auth.admin.createUser({
    email: emailStr,
    password: tempPwd,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'student',
    }
  })

  if (error) {
    return { success: false, error: error.message, code: (error as any).code }
  }

  return { success: true, user_id: data.user.id }
}
