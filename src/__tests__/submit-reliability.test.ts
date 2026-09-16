import { describe, it, expect, vi } from 'vitest'
import { submitWithRetry, isRetryableError, friendlyMessage, SubmitError } from '@/lib/submitReliability'

describe('isRetryableError', () => {
  it('retries network failures', () => {
    expect(isRetryableError(new TypeError('fetch failed'))).toBe(true)
    expect(isRetryableError(new Error('Network request failed'))).toBe(true)
    expect(isRetryableError(new Error('timeout of 15000ms exceeded'))).toBe(true)
    expect(isRetryableError({ message: 'Connection reset', code: 'ECONNRESET' })).toBe(true)
  })

  it('never retries auth, RLS or validation failures', () => {
    expect(isRetryableError({ message: 'permission denied', code: '42501' })).toBe(false)
    expect(isRetryableError(new Error('new row violates row-level security'))).toBe(false)
    expect(isRetryableError(new Error('JWT expired'))).toBe(false)
    expect(isRetryableError({ message: 'duplicate key value', code: '409' })).toBe(false)
  })
})

describe('submitWithRetry', () => {
  it('succeeds first try without extra attempts', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const states: number[] = []
    const result = await submitWithRetry(fn, { retries: 3, baseDelayMs: 1, onState: (s) => states.push(s.attempt) })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(states).toEqual([1])
  })

  it('retries network failures at least 3 times then throws with attempt count', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const states: number[] = []
    await expect(
      submitWithRetry(fn, { retries: 3, baseDelayMs: 1, onState: (s) => states.push(s.attempt) })
    ).rejects.toMatchObject({ name: 'SubmitError', attempts: 4 })
    expect(fn).toHaveBeenCalledTimes(4)
    expect(states).toEqual([1, 2, 3, 4])
  })

  it('fails fast on non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue({ message: 'permission denied', code: '42501' })
    await expect(submitWithRetry(fn, { retries: 3, baseDelayMs: 1 })).rejects.toMatchObject({ attempts: 1, retryable: false })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('recovers when a later attempt succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('recovered')
    const result = await submitWithRetry(fn, { retries: 3, baseDelayMs: 1 })
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe('friendlyMessage', () => {
  it('explains session and permission failures clearly', () => {
    expect(friendlyMessage(new Error('JWT expired'))).toMatch(/log in again/i)
    expect(friendlyMessage({ message: 'x', code: '42501' })).toMatch(/log(ging)? out/i)
  })
})
