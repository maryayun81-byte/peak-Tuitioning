'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'
import { rateLimit } from '@/lib/rate-limit'
import { sendSms, normalizePhone, hasSmsleopardToken } from '@/lib/smsleopard'

export type SmsComposerTarget = 'all' | 'specific_role' | 'specific_user' | 'specific_numbers'
export type SmsComposerRole = 'admin' | 'teacher' | 'student' | 'parent'

type SendBulkSmsInput = {
  message: string
  target: SmsComposerTarget
  role?: SmsComposerRole
  user_ids?: string[]
  numbers?: string[]
}

function parseNumbersInput(raw?: string[]): { numbers: string[]; error?: string } {
  const chunks = (raw || [])
    .flatMap((item) => String(item || '').split(/[,;\n]+/))
    .map((s) => s.trim())
    .filter(Boolean)

  const numbers: string[] = []
  for (const chunk of chunks) {
    if (normalizePhone(chunk)) {
      numbers.push(chunk)
      continue
    }
    // A chunk like "0712 345 678" is a single number; a chunk like
    // "0712345678 0723456789" is two numbers separated by a space.
    const tokens = chunk.split(/\s+/).map((s) => s.trim()).filter(Boolean)
    for (const token of tokens) {
      if (normalizePhone(token)) numbers.push(token)
    }
  }

  if (numbers.length === 0) return { numbers: [], error: 'Enter at least one valid phone number.' }
  return { numbers }
}

async function collectPhoneNumbers(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  input: Pick<SendBulkSmsInput, 'target' | 'role' | 'user_ids' | 'numbers'>,
): Promise<{ numbers: string[]; error?: string }> {
  if (input.target === 'specific_numbers') {
    return parseNumbersInput(input.numbers)
  }

  if (input.target === 'specific_user') {
    const ids = (input.user_ids || []).filter(Boolean)
    if (ids.length === 0) return { numbers: [], error: 'Select at least one recipient.' }
    const { data } = await adminClient.from('profiles').select('phone').in('id', ids)
    return { numbers: (data || []).map((p: any) => p.phone) }
  }

  if (input.target === 'specific_role') {
    const role = input.role || 'student'
    // Parents are entered manually — the phone numbers saved in the DB are not reliable.
    if (role === 'parent') {
      return parseNumbersInput(input.numbers)
    }
    if (role === 'teacher') {
      const { data } = await adminClient.from('teachers').select('phone')
      return { numbers: (data || []).map((t: any) => t.phone) }
    }
    const { data } = await adminClient.from('profiles').select('phone').eq('role', role)
    return { numbers: (data || []).map((p: any) => p.phone) }
  }

  const [{ data: profiles }, { data: teachers }, { data: parents }] = await Promise.all([
    adminClient.from('profiles').select('phone'),
    adminClient.from('teachers').select('phone'),
    adminClient.from('parents').select('phone'),
  ])
  return {
    numbers: [
      ...(profiles || []).map((p: any) => p.phone),
      ...(teachers || []).map((t: any) => t.phone),
      ...(parents || []).map((p: any) => p.phone),
    ],
  }
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
  if (collectError) return { success: false, sent: 0, total: 0, error: collectError }

  return sendSms(numbers, message)
}
