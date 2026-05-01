import { createClient } from './supabase/server'
import { NextResponse } from 'next/server'

/**
 * Validates if the current user has the 'admin' role.
 * Can be used in Server Actions or API Routes.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized: Please log in.')
  }

  const role = user.user_metadata?.role || user.app_metadata?.role

  if (role !== 'admin') {
    throw new Error('Forbidden: Admin access required.')
  }

  return { user, supabase }
}

/**
 * API Route specific guard that returns a NextResponse if unauthorized.
 */
export async function adminApiGuard() {
  try {
    await requireAdmin()
    return null // Authorized
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message.includes('Forbidden') ? 403 : 401 }
    )
  }
}

/**
 * Checks if the current user is an admin without throwing.
 */
export async function checkIsAdmin() {
  try {
    const { user } = await requireAdmin()
    return !!user
  } catch {
    return false
  }
}
