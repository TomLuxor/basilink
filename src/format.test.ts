import { describe, expect, it } from 'vitest'
import type { ZoneProperties } from '@/types/zone'
import { formatDistance, formatDuration, formatHeightRange } from './format'

describe('formatDistance', () => {
  it('uses metres below 1 km and kilometres above', () => {
    expect(formatDistance(850.4)).toBe('850 m')
    expect(formatDistance(3071)).toBe('3.1 km')
  })
})

describe('formatDuration', () => {
  it('shows seconds, minutes and hours as appropriate', () => {
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(154)).toBe('2 min 34 s')
    expect(formatDuration(693)).toBe('12 min')
    expect(formatDuration(3900)).toBe('1 h 5 min')
  })
})

describe('formatHeightRange', () => {
  const zone = (overrides: Partial<ZoneProperties>) =>
    ({
      lowerLimitM: 0,
      lowerReference: 'AGL',
      upperLimitM: null,
      upperReference: 'AGL',
      ...overrides,
    }) as ZoneProperties

  it('shows ground-based and elevated zones compactly', () => {
    expect(formatHeightRange(zone({}))).toBe('ground – no limit')
    expect(formatHeightRange(zone({ upperLimitM: 150 }))).toBe('ground – 150 m')
    expect(formatHeightRange(zone({ lowerLimitM: 120 }))).toBe('120 m – no limit')
  })

  it('marks limits above sea level', () => {
    expect(formatHeightRange(zone({ upperLimitM: 600, upperReference: 'AMSL' }))).toBe(
      'ground – 600 m a.s.l.',
    )
  })
})
