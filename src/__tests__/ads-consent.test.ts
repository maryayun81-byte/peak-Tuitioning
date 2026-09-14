import { describe, it, expect, beforeEach } from 'vitest'
import { CONSENT_KEY, getConsent, setConsent } from '@/lib/ads'

beforeEach(() => {
  window.localStorage.removeItem(CONSENT_KEY)
  document.cookie = `${CONSENT_KEY}=; Max-Age=0; Path=/`
})

describe('ads consent persistence', () => {
  it('starts undecided, then remembers the choice', () => {
    expect(getConsent()).toBeNull()
    setConsent('granted')
    expect(getConsent()).toBe('granted')
  })

  it('survives a localStorage wipe via the cookie fallback', () => {
    setConsent('denied')
    window.localStorage.removeItem(CONSENT_KEY) // e.g. user cleared site data partially
    expect(getConsent()).toBe('denied')
  })

  it('survives blocked localStorage via cookie + memory', () => {
    const orig = window.localStorage.setItem
    // Simulate "block cookies" browsers that throw on storage access.
    window.localStorage.setItem = () => { throw new Error('blocked') }
    try {
      setConsent('granted')
      expect(getConsent()).toBe('granted')
    } finally {
      window.localStorage.setItem = orig
    }
  })
})
