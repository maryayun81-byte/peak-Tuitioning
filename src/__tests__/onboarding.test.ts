import { describe, it, expect } from 'vitest'
import { isStudentFullyOnboarded } from '@/lib/onboarding'

describe('isStudentFullyOnboarded', () => {
  it('returns true only when BOTH flags are true', () => {
    expect(isStudentFullyOnboarded({ onboarded: true }, { has_onboarded: true })).toBe(true)
    expect(isStudentFullyOnboarded({ onboarded: true }, { has_onboarded: false })).toBe(false)
    expect(isStudentFullyOnboarded({ onboarded: false }, { has_onboarded: true })).toBe(false)
    expect(isStudentFullyOnboarded({ onboarded: false }, { has_onboarded: false })).toBe(false)
  })

  it('treats null/missing flags as not onboarded (never grants on a single flag)', () => {
    expect(isStudentFullyOnboarded(null, { has_onboarded: true })).toBe(false)
    expect(isStudentFullyOnboarded({ onboarded: true }, null)).toBe(false)
    expect(isStudentFullyOnboarded(null, null)).toBe(false)
    expect(isStudentFullyOnboarded(undefined, { has_onboarded: true })).toBe(false)
  })

  it('guards the historical bypass: profile flag alone never grants access', () => {
    // This exact combination previously let drifted accounts skip onboarding.
    expect(isStudentFullyOnboarded({ onboarded: false }, { has_onboarded: true })).toBe(false)
  })
})
