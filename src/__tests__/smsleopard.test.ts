import { describe, it, expect } from 'vitest'
import { parsePhoneNumbers, normalizePhone } from '@/lib/smsleopard'

describe('parsePhoneNumbers', () => {
  it('parses a single comma-separated string inside an array', () => {
    const { numbers, dropped } = parsePhoneNumbers([
      '0732737291,  0717327243, 0797665352, 0754556499, 0742 088173',
    ])
    expect(numbers).toEqual([
      '+254732737291',
      '+254717327243',
      '+254797665352',
      '+254754556499',
      '+254742088173',
    ])
    expect(dropped).toEqual([])
  })

  it('accepts a bare comma-separated string', () => {
    const { numbers } = parsePhoneNumbers('0711111111,0722222222')
    expect(numbers).toEqual(['+254711111111', '+254722222222'])
  })

  it('accepts a mix of formats and separators', () => {
    const { numbers } = parsePhoneNumbers([
      '0712 345 678',
      '2547-2233-4455',
      '+254 733-111-222',
      '0111222333',
    ])
    expect(numbers).toEqual([
      '+254712345678',
      '+254722334455',
      '+254733111222',
      '+254111222333',
    ])
  })

  it('splits numbers that are separated only by spaces', () => {
    const { numbers } = parsePhoneNumbers('0712345678 0723456789')
    expect(numbers).toEqual(['+254712345678', '+254723456789'])
  })

  it('drops invalid entries and reports them', () => {
    const { numbers, dropped } = parsePhoneNumbers('0712345678, not a number, 123')
    expect(numbers).toEqual(['+254712345678'])
    expect(dropped).toEqual(['not a number', '123'])
  })

  it('handles empty/undefined input', () => {
    expect(parsePhoneNumbers(undefined).numbers).toEqual([])
    expect(parsePhoneNumbers([]).numbers).toEqual([])
    expect(parsePhoneNumbers('').numbers).toEqual([])
  })

  it('deduplicates repeated numbers', () => {
    const { numbers } = parsePhoneNumbers(['0712345678, 0712 345 678'])
    expect(numbers).toEqual(['+254712345678'])
  })
})

describe('normalizePhone', () => {
  it('normalizes 10-digit 0-prefixed Kenyan numbers', () => {
    expect(normalizePhone('0732737291')).toBe('+254732737291')
  })
  it('normalizes 9-digit and 254-prefixed numbers', () => {
    expect(normalizePhone('712345678')).toBe('+254712345678')
    expect(normalizePhone('254712345678')).toBe('+254712345678')
    expect(normalizePhone('+254712345678')).toBe('+254712345678')
  })
  it('rejects short numbers', () => {
    expect(normalizePhone('123')).toBeNull()
    expect(normalizePhone('0742')).toBeNull()
  })
})
