import { describe, it, expect } from 'vitest'
import {
  sessionTimeRelation,
  isEndedUnfinished,
  isHappeningNow,
} from '@/lib/homeschooling/session-time'

// Thursday 2026-09-10. An 8:00–10:00 session viewed at 3 PM must read as
// past/ended — never "in progress".
const THU_3PM = new Date('2026-09-10T15:00:00')
const THU_9AM = new Date('2026-09-10T09:00:00')
const THU_7AM = new Date('2026-09-10T07:00:00')

const morning = {
  day: 'Thursday',
  start_time: '08:00',
  end_time: '10:00',
  status: 'IN_PROGRESS',
  student_status: 'IN_PROGRESS',
}

describe('sessionTimeRelation', () => {
  it('marks a morning session as past at 3 PM', () => {
    expect(sessionTimeRelation(morning, THU_3PM)).toBe('past')
  })
  it('marks it live at 9 AM and upcoming at 7 AM', () => {
    expect(sessionTimeRelation(morning, THU_9AM)).toBe('live')
    expect(sessionTimeRelation(morning, THU_7AM)).toBe('upcoming')
  })
  it('ignores sessions on other days', () => {
    expect(sessionTimeRelation({ ...morning, day: 'Friday' }, THU_3PM)).toBe('other-day')
  })
})

describe('isEndedUnfinished', () => {
  it('is true for the 8–10 session still in progress at 3 PM', () => {
    expect(isEndedUnfinished(morning, THU_3PM)).toBe(true)
  })
  it('is false while live, when completed, or when already MISSED/CANCELLED', () => {
    expect(isEndedUnfinished(morning, THU_9AM)).toBe(false)
    expect(isEndedUnfinished({ ...morning, student_status: 'COMPLETED' }, THU_3PM)).toBe(false)
    expect(isEndedUnfinished({ ...morning, student_status: 'SUBMITTED' }, THU_3PM)).toBe(false)
    expect(isEndedUnfinished({ ...morning, status: 'MISSED' }, THU_3PM)).toBe(false)
    expect(isEndedUnfinished({ ...morning, status: 'CANCELLED' }, THU_3PM)).toBe(false)
  })
})

describe('isHappeningNow', () => {
  it('is true only inside the slot for unfinished sessions', () => {
    expect(isHappeningNow(morning, THU_9AM)).toBe(true)
    expect(isHappeningNow(morning, THU_3PM)).toBe(false)
    expect(isHappeningNow(morning, THU_7AM)).toBe(false)
    expect(isHappeningNow({ ...morning, student_status: 'COMPLETED' }, THU_9AM)).toBe(false)
  })
})
