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

type SendSmsOptions = {
  source?: string
  retries?: number
  timeoutMs?: number
}

/**
 * Sends an SMS via SMSLeopard to one or many recipients.
 * Duplicate and invalid numbers are dropped before the request is made.
 */
export async function sendSms(
  numbers: (string | null | undefined)[],
  message: string,
  options: SendSmsOptions = {},
): Promise<SendSmsResult> {
  if (!hasSmsleopardToken()) {
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
  ).map((number) => number.replace(/^\+/, ''))

  if (destination.length === 0) {
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
    const params = new URLSearchParams({
      message: text,
      destination: destination.join(','),
      source: options.source || SENDER_ID,
    })
    const response = await fetchWithRetry(`${SMS_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      retries: options.retries ?? 1,
      timeoutMs: options.timeoutMs,
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (response.ok) {
      const recipients: SmsRecipient[] = Array.isArray(data?.recipients) ? data.recipients : []
      return {
        success: true,
        sent: data?.success === true ? recipients.length || destination.length : 0,
        total: destination.length,
        recipients,
      }
    }

    const errDetail =
      data?.error_message ||
      data?.error?.message ||
      data?.error ||
      data?.message ||
      `${response.status} ${response.statusText}`
    return {
      success: false,
      sent: 0,
      total: destination.length,
      error: String(errDetail).slice(0, 300),
    }
  } catch (error: any) {
    return {
      success: false,
      sent: 0,
      total: destination.length,
      error: error?.message || 'SMS request failed',
    }
  }
}
