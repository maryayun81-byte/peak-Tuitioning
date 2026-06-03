'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'

export async function createStudentUser(admissionNumber: string, emailStr: string, tempPwd: string, fullName: string) {
  await requireAdmin()
  const adminClient = await createAdminClient()

  // 1. Try normal auth.admin.createUser()
  const { data, error } = await adminClient.auth.admin.createUser({
    email: emailStr,
    password: tempPwd,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'student' },
  })

  if (error) {
    console.error('[createStudentUser] admin.createUser failed:', error.message, error.code)

    // 2. If the on_auth_user_created trigger is broken, use the RPC fallback
    if (error.code === 'unexpected_failure') {
      const { data: rpcUserId, error: rpcError } = await adminClient.rpc('admin_create_user', {
        p_email: emailStr,
        p_password: tempPwd,
        p_full_name: fullName,
        p_role: 'student',
      })

      if (rpcError) {
        console.error('[createStudentUser] RPC fallback also failed:', rpcError)
        return { success: false, error: rpcError.message, code: 'rpc_fallback_failed' }
      }

      return { success: true, user_id: rpcUserId }
    }

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
