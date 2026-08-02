'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'
import { rateLimit } from '@/lib/rate-limit'
import { sendSms, parsePhoneNumbers, hasSmsleopardToken } from '@/lib/smsleopard'

export type SmsComposerTarget = 'all' | 'specific_role' | 'specific_user' | 'specific_numbers'
export type SmsComposerRole = 'admin' | 'teacher' | 'student' | 'parent'

type SendBulkSmsInput = {
  message: string
  target?: SmsComposerTarget
  role?: SmsComposerRole
  user_ids?: string[]
  numbers?: string[] | string
}

function parseNumbersInput(raw?: string | string[]): { numbers: string[]; error?: string } {
  const { numbers, dropped } = parsePhoneNumbers(raw)
  if (numbers.length === 0) {
    const hint = dropped.length > 0
      ? ` Not recognized: ${dropped.slice(0, 5).join(', ')}.`
      : ''
    return { numbers: [], error: `Enter at least one valid phone number (07XXXXXXXX).${hint}` }
  }
  return { numbers }
}

async function collectPhoneNumbers(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  input: Pick<SendBulkSmsInput, 'target' | 'role' | 'user_ids' | 'numbers'>,
): Promise<{ numbers: string[]; error?: string }> {
  const target = input.target
  const parsedProvided = parseNumbersInput(input.numbers)

  // A caller who supplies explicit numbers wants THOSE numbers used, no matter
  // the role or target. Only target='all' overrides this, because that means
  // "broadcast to everyone in the database".
  if (parsedProvided.numbers.length > 0 && target !== 'all') {
    return parsedProvided
  }

  if (target === 'specific_numbers') {
    return parsedProvided
  }

  if (target === 'specific_user') {
    const ids = (input.user_ids || []).filter(Boolean)
    if (ids.length === 0) return { numbers: [], error: 'Select at least one recipient.' }
    const { data } = await adminClient.from('profiles').select('phone').in('id', ids)
    const { numbers } = parsePhoneNumbers((data || []).map((p: any) => p.phone))
    if (numbers.length === 0) return { numbers: [], error: 'No valid phone numbers found for the selected users.' }
    return { numbers }
  }

  if (target === 'specific_role') {
    if (input.role === 'teacher') {
      const { data } = await adminClient.from('teachers').select('phone')
      const { numbers } = parsePhoneNumbers((data || []).map((t: any) => t.phone))
      if (numbers.length === 0) return { numbers: [], error: 'No valid phone numbers found for teachers.' }
      return { numbers }
    }
    const role = input.role || 'student'
    const { data } = await adminClient.from('profiles').select('phone').eq('role', role)
    const { numbers } = parsePhoneNumbers((data || []).map((p: any) => p.phone))
    if (numbers.length === 0) return { numbers: [], error: `No valid phone numbers found for ${role}s.` }
    return { numbers }
  }

  if (target === 'all') {
    const [{ data: profiles }, { data: teachers }, { data: parents }] = await Promise.all([
      adminClient.from('profiles').select('phone'),
      adminClient.from('teachers').select('phone'),
      adminClient.from('parents').select('phone'),
    ])
    const { numbers } = parsePhoneNumbers([
      ...(profiles || []).map((p: any) => p.phone),
      ...(teachers || []).map((t: any) => t.phone),
      ...(parents || []).map((p: any) => p.phone),
    ])
    if (numbers.length === 0) return { numbers: [], error: 'No valid phone numbers found in the database.' }
    return { numbers }
  }

  return { numbers: [], error: 'Select a target (everyone, role, user, or specific numbers).' }
}

/**
 * Sends a bulk SMS through SMSLeopard to a role, a specific user, or everyone.
 * Admin-only and rate limited because every SMS costs money.
 */
export async function sendBulkSms(input: SendBulkSmsInput) {
  const message = String(input?.message || '').trim()
  if (!message) return { success: false, sent: 0, total: 0, error: 'SMS message is required.' }
  if (!hasSmsleopardToken()) {
    return {
      success: false,
      sent: 0,
      total: 0,
      error: 'SMS is not configured. Set SMSLEOPARD_API_KEY and SMSLEOPARD_API_SECRET.',
    }
  }

  let user
  try {
    const auth = await requireAdmin()
    user = auth.user
  } catch (error: any) {
    return { success: false, sent: 0, total: 0, error: error?.message || 'Unauthorized.' }
  }

  const { success: withinLimit } = rateLimit(`bulk_sms_${user.id}`, {
    limit: 10,
    windowMs: 60 * 1000,
  })
  if (!withinLimit) {
    return {
      success: false,
      sent: 0,
      total: 0,
      error: 'Too many SMS requests. Please wait a minute and try again.',
    }
  }

  const adminClient = await createAdminClient()
  const { numbers, error: collectError } = await collectPhoneNumbers(adminClient, input)
  if (collectError) {
    console.error('[sendBulkSms] No recipients collected.', {
      target: input.target,
      role: input.role,
      error: collectError,
    })
    return { success: false, sent: 0, total: 0, error: collectError }
  }

  console.log('[sendBulkSms] Recipients ready.', { target: input.target, role: input.role, count: numbers.length })
  const result = await sendSms(numbers, message)
  console.log('[sendBulkSms] Result.', { success: result.success, sent: result.sent, total: result.total, error: result.error })
  return result
}
