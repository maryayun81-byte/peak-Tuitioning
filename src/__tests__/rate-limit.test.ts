import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear global state if necessary, but rateLimit uses a local-ish cache.
    // We might need to use unique identifiers for each test.
  })

  it('should allow requests within the limit', () => {
    const id = 'test-id-1'
    const result = rateLimit(id, { limit: 2, windowMs: 1000 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('should block requests exceeding the limit', () => {
    const id = 'test-id-2'
    rateLimit(id, { limit: 1, windowMs: 1000 })
    const result = rateLimit(id, { limit: 1, windowMs: 1000 })
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should reset after the window expires', async () => {
    vi.useFakeTimers()
    const id = 'test-id-3'
    const windowMs = 1000
    
    rateLimit(id, { limit: 1, windowMs })
    
    // Fast forward time
    vi.advanceTimersByTime(windowMs + 1)
    
    const result = rateLimit(id, { limit: 1, windowMs })
    expect(result.success).toBe(true)
    
    vi.useRealTimers()
  })
})
