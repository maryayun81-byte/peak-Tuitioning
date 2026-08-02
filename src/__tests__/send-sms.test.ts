import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'

// sendSms reads credentials at module load, so set them before importing.
process.env.SMSLEOPARD_API_KEY = 'test-key'
process.env.SMSLEOPARD_API_SECRET = 'test-secret'

let sendSms: typeof import('@/lib/smsleopard').sendSms

beforeAll(async () => {
  sendSms = (await import('@/lib/smsleopard')).sendSms
})

const ORIGINAL_FETCH = global.fetch

afterEach(() => {
  global.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

function mockFetch(ok: boolean, body: unknown) {
  const fetched = vi.fn().mockResolvedValue({ ok, json: async () => body })
  global.fetch = fetched as unknown as typeof fetch
  return fetched
}

describe('sendSms', () => {
  it('POSTs a JSON body with destination as {number} objects', async () => {
    const fetched = mockFetch(true, { success: true, recipients: [] })

    const result = await sendSms(
      ['0732737291', '0717327243', '0797665352', '0754556499'],
      'Hello students',
    )

    expect(result.success).toBe(true)
    const [url, init] = fetched.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.smsleopard.com/v1/sms/send')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toContain('application/json')
    expect((init.headers as Record<string, string>).Authorization).toContain('Basic')
    const body = JSON.parse(init.body as string)
    expect(body.destination).toEqual([
      { number: '+254732737291' },
      { number: '+254717327243' },
      { number: '+254797665352' },
      { number: '+254754556499' },
    ])
    expect(body.message).toBe('Hello students')
    expect(body.source).toBeDefined()
  })

  it('returns no-valid-numbers error when all numbers are rejected', async () => {
    const result = await sendSms(['123', 'not a number'], 'Hello')
    expect(result.success).toBe(false)
    expect(result.error).toContain('No valid phone numbers provided')
  })

  it('surfaces the SMSLeopard top-level message on a rejected request', async () => {
    mockFetch(false, { success: false, message: 'no valid recipients', recipients: null })
    const result = await sendSms(['0732737291'], 'Hello')
    expect(result.success).toBe(false)
    expect(result.error).toContain('no valid recipients')
  })

  it('explains restricted send time instead of the cryptic message', async () => {
    mockFetch(false, {
      success: false,
      message: 'no valid recipients',
      recipients: [{ id: '', cost: 0, number: '+254798971625', status: 'restricted_send_time' }],
    })
    const result = await sendSms(['0798971625'], 'Hello')
    expect(result.success).toBe(false)
    expect(result.error).toContain('8AM and 6PM')
  })

  it('drops duplicate numbers before sending', async () => {
    const fetched = mockFetch(true, { success: true })
    const result = await sendSms(['0732737291', '+254732737291', '0732 737291'], 'Hi')
    expect(result.success).toBe(true)
    const [, init] = fetched.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.destination).toEqual([{ number: '+254732737291' }])
  })

  it('counts queued recipients as sent', async () => {
    mockFetch(true, {
      success: true,
      message: 'Sent to 2/2. Cost KES 1.80',
      recipients: [
        { id: 'a', cost: 0.9, number: '+254732737291', status: 'queued' },
        { id: 'b', cost: 0.9, number: '+254717327243', status: 'queued' },
      ],
    })
    const result = await sendSms(['0732737291', '0717327243'], 'Hello')
    expect(result.success).toBe(true)
    expect(result.sent).toBe(2)
    expect(result.total).toBe(2)
  })
})
