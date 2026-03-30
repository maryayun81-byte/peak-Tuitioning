'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'

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

export async function updateOwnPassword(newPassword: string) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized access' }

  const adminClient = await createAdminClient()
  
  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, { password: newPassword })
  if (updateError) return { success: false, error: updateError.message }

  // Clear the temporary password flag so it reflects in the admin dashboard
  await adminClient.from('students').update({ temp_password: null }).eq('user_id', user.id)

  return { success: true }
}
