import { describe, it, expect } from 'vitest'
import { defaultDailyRateFor } from '@/lib/billing-rates'

describe('defaultDailyRateFor', () => {
  it('defaults CBC classes to KES 200/day', () => {
    expect(defaultDailyRateFor({ curriculumName: 'CBC', className: 'Grade 7' })).toBe(200)
    expect(defaultDailyRateFor({ curriculumName: 'CBC', className: 'Grade 6' })).toBe(200)
    expect(defaultDailyRateFor({ curriculumName: 'CBC', className: 'Grade 8' })).toBe(200)
    expect(defaultDailyRateFor({ curriculumName: 'CBC', className: 'Grade 9' })).toBe(200)
  })

  it('defaults CBC to 200 even with no class name', () => {
    expect(defaultDailyRateFor({ curriculumName: 'CBC' })).toBe(200)
    expect(defaultDailyRateFor({ curriculumName: 'Competency Based Curriculum' })).toBe(200)
  })

  it('charges senior classes KES 250/day', () => {
    expect(defaultDailyRateFor({ curriculumName: 'CBC', className: 'Form 3' })).toBe(250)
    expect(defaultDailyRateFor({ curriculumName: 'CBC', className: 'Form 4' })).toBe(250)
    expect(defaultDailyRateFor({ curriculumName: 'CBC', className: 'Grade 10' })).toBe(250)
  })

  it('charges the 844 / 8-4-4 track KES 250/day', () => {
    expect(defaultDailyRateFor({ curriculumName: '844', className: 'Grade 10' })).toBe(250)
    expect(defaultDailyRateFor({ curriculumName: '8-4-4', className: 'Form 3' })).toBe(250)
  })

  it('uses the legacy class_level when class name is missing', () => {
    expect(defaultDailyRateFor({ curriculumName: 'CBC', classLevel: 'Form 4' })).toBe(250)
    expect(defaultDailyRateFor({ curriculumName: 'CBC', classLevel: 'Grade 7' })).toBe(200)
  })

  it('tolerates messy spacing and casing', () => {
    expect(defaultDailyRateFor({ curriculumName: ' CBC ', className: 'GRADE 10' })).toBe(250)
    expect(defaultDailyRateFor({ curriculumName: 'cbc', className: 'grade  9' })).toBe(200)
  })

  it('falls back to the junior rate when nothing is known', () => {
    expect(defaultDailyRateFor({})).toBe(200)
  })
})
