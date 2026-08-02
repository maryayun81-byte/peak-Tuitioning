import { fetchWithRetry } from './provider-utils'

const API_KEY = process.env.SMSLEOPARD_API_KEY || process.env.API_key
const API_SECRET = process.env.SMSLEOPARD_API_SECRET || process.env.API_secret
const ACCESS_TOKEN = process.env.SMSLEOPARD_ACCESS_TOKEN || process.env.Accesstoken
const SENDER_ID = process.env.SMSLEOPARD_SENDER_ID || 'SMS_Leopard'
const SMS_ENDPOINT = 'https://api.smsleopard.com/v1/sms/send'

export function hasSmsleopardToken() {
  return Boolean(API_KEY && API_SECRET)
}

// GSM 7-bit alphabet. Characters outside this set (emojis, exotic punctuation)
// are stripped because SMSLeopard rejects messages that contain them.
const GSM7_CHARS =
  '@\u00a3$\u00a5\u00e8\u00e9\u00f9\u00ec\u00f2\u00c7\n\u00d8\u00f8\r\u00c5\u00e5\u0394_\u03a6\u0393\u039b\u03a9\u03a0\u03a8\u03a3\u0398\u039e\u00c6\u00e6\u00df\u00c9 ' +
  '!"\u00a4%&\'()*+,-./0123456789:;<=>?\u00a1ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00c4\u00d6\u00d1\u00dc\u00a7\u00bf' +
  'abcdefghijklmnopqrstuvwxyz\u00e4\u00f6\u00f1\u00fc\u00e0' +
  '^{}\\[~]|\u20ac'
const GSM7_SET = new Set(GSM7_CHARS)

export function sanitizeSmsMessage(raw: string): string {
  return String(raw || '')
    .split('')
    .filter((ch) => GSM7_SET.has(ch))
    .join('')
}

/**
 * Normalizes a Kenyan phone number to E.164 format (+2547XXXXXXXX).
 * Accepts 07XXXXXXXX, 7XXXXXXXX, 2547XXXXXXXX and +2547XXXXXXXX, tolerating
 * spaces, dashes, dots and parentheses (e.g. "+254 712-345-678").
 * Returns null when the number cannot be normalized.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 12 && digits.startsWith('254')) return `+${digits}`
  if (digits.length === 10 && digits.startsWith('0')) return `+254${digits.slice(1)}`
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) return `+254${digits}`
  return null
}

/**
 * Parses a messy list of phone numbers into normalized (E.164) form.
 *
 * Accepts either a single string or an array of strings/numbers. Each entry
 * may contain several numbers separated by commas, newlines, semicolons, or
 * spaces (e.g. "0732737291, 0742 088173"). Returns every valid number plus a
 * list of the raw entries that could not be normalized, so callers can tell
 * the user exactly which number(s) were rejected instead of a generic error.
 */
export function parsePhoneNumbers(
  raw: string | (string | number | null | undefined)[] | null | undefined,
): { numbers: string[]; dropped: string[] } {
  const items = Array.isArray(raw) ? raw : [raw]
  const tokens = items
    .flatMap((item) => String(item ?? '').split(/[,;\n]+/))
    .map((s) => s.trim())
    .filter(Boolean)

  const numbers: string[] = []
  const dropped: string[] = []
  for (const token of tokens) {
    const normalized = normalizePhone(token)
    if (normalized) {
      numbers.push(normalized)
      continue
    }
    // A token like "0712 345 678" is one number; a token like
    // "0712345678 0723456789" is several numbers joined by spaces. Only split
    // when the token actually contains digits, so free text is dropped whole.
    const pieces = token.split(/\s+/).map((s) => s.trim()).filter(Boolean)
    if (pieces.length > 1 && /\d/.test(token)) {
      let matched = false
      for (const piece of pieces) {
        const p = normalizePhone(piece)
        if (p) {
          numbers.push(p)
          matched = true
        } else {
          dropped.push(piece)
        }
      }
      if (!matched) dropped.push(token)
    } else {
      dropped.push(token)
    }
  }
  return { numbers: [...new Set(numbers)], dropped: [...new Set(dropped)] }
}

export type SmsRecipient = {
  id: string
  cost: number
  number: string
  status: string
}

export type SendSmsResult = {
  success: boolean
  sent: number
  total: number
  recipients?: SmsRecipient[]
  error?: string
}

/** Maps SMSLeopard per-recipient status codes to human-readable reasons. */
const SMS_STATUS_MESSAGES: Record<string, string> = {
  queued: 'queued for delivery',
  sent: 'delivered',
  restricted_send_time:
    'Safaricom only allows promotional SMS between 8AM and 6PM — try again during those hours',
  invalid_phone: 'phone number is not a valid recipient',
  insufficient_balance: 'SMSLeopard account balance is insufficient',
  invalid_sender_id: 'sender ID is not approved on the SMSLeopard account',
}

function describeSmsStatuses(recipients: SmsRecipient[] | undefined): string[] {
  if (!Array.isArray(recipients) || recipients.length === 0) return []
  return [
    ...new Set(
      recipients
        .map((r) => r.status)
        .filter(Boolean)
        .map((status) => SMS_STATUS_MESSAGES[status] || `recipient status "${status}"`),
    ),
  ]
}

type SendSmsOptions = {
  source?: string
  retries?: number
  timeoutMs?: number
}

/**
 * Sends an SMS via SMSLeopard to one or many recipients.
 * Duplicate and invalid numbers are dropped before the request is made.
 *
 * NOTE: the request to SMSLeopard is server-to-server — it will never appear
 * in the browser's Network tab. Diagnostics are logged to the server terminal
 * (the process running `npm run dev`).
 */
export async function sendSms(
  numbers: (string | null | undefined)[],
  message: string,
  options: SendSmsOptions = {},
): Promise<SendSmsResult> {
  if (!hasSmsleopardToken()) {
    console.error('[SMS] Credentials missing — SMSLEOPARD_API_KEY / SMSLEOPARD_API_SECRET not set.')
    return {
      success: false,
      sent: 0,
      total: numbers.length,
      error: 'SMSLeopard credentials missing. Set SMSLEOPARD_API_KEY and SMSLEOPARD_API_SECRET.',
    }
  }

  const text = sanitizeSmsMessage(String(message || '').trim())
  if (!text) {
    return { success: false, sent: 0, total: numbers.length, error: 'SMS message cannot be empty.' }
  }

  const destination = Array.from(
    new Set(numbers.map(normalizePhone).filter((n): n is string => Boolean(n))),
  )

  if (destination.length === 0) {
    console.error('[SMS] No valid numbers after normalization.', { raw: numbers })
    return {
      success: false,
      sent: 0,
      total: numbers.length,
      error: 'No valid phone numbers provided.',
    }
  }

  const auth =
    ACCESS_TOKEN || Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')

  try {
    // SMSLeopard's documented primary method: POST with a JSON body where
    // `destination` is an array of {number} objects. (The GET/URL-params
    // variant is the only one that takes a comma-separated destination, and
    // it requires credentials as username/password query params.)
    const response = await fetchWithRetry(SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        source: options.source || SENDER_ID,
        message: text,
        destination: destination.map((number) => ({ number })),
      }),
      retries: options.retries ?? 1,
      timeoutMs: options.timeoutMs,
    })

    const data = await response.json().catch(() => ({}))

    if (response.ok) {
      const recipients: SmsRecipient[] = Array.isArray(data?.recipients) ? data.recipients : []
      const delivered = recipients.filter((r) => r.status === 'queued' || r.status === 'sent').length
      console.log('[SMS] Sent', {
        status: response.status,
        destination: destination.length,
        delivered,
        api: data?.message,
      })
      // Partially accepted sends (e.g. some recipients rejected) still come
      // back as success — surface the dropped ones so the caller knows.
      const problems = describeSmsStatuses(recipients).filter((r) => !r.startsWith('queued') && !r.startsWith('delivered'))
      if (problems.length > 0) {
        return {
          success: true,
          sent: delivered,
          total: destination.length,
          recipients,
          error: `Sent ${delivered}/${destination.length}. ${problems.join('; ')}.`,
        }
      }
      return {
        success: data?.success === true,
        sent: delivered || (data?.success === true ? destination.length : 0),
        total: destination.length,
        recipients,
      }
    }

    // SMSLeopard reports failures in the top-level `message` field, e.g.
    // "no valid recipients", "Insufficient balance", "Invalid sender ID".
    // "no valid recipients" is often NOT a bad number — the per-recipient
    // `status` field carries the real reason (e.g. restricted_send_time).
    const errDetail =
      data?.message ||
      data?.error_message ||
      data?.error?.message ||
      data?.error ||
      `${response.status} ${response.statusText}`
    const statusReasons = describeSmsStatuses(data?.recipients)
    const reason =
      statusReasons.length > 0
        ? `SMS not sent (${response.status}): ${statusReasons.join('; ')}.`
        : `HTTP ${response.status}: ${String(errDetail).slice(0, 300)}`
    console.error('[SMS] Rejected by SMSLeopard', {
      status: response.status,
      destination: destination.length,
      body: JSON.stringify(data).slice(0, 500),
    })
    return {
      success: false,
      sent: 0,
      total: destination.length,
      error: reason,
    }
  } catch (error: any) {
    console.error('[SMS] Request failed (network/transport)', {
      destination: destination.length,
      error: error?.message,
    })
    return {
      success: false,
      sent: 0,
      total: destination.length,
      error: error?.message || 'SMS request failed',
    }
  }
}
