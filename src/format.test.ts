import { describe, expect, it } from 'vitest'
import type { ZoneProperties } from '@/types/zone'
import { formatDistance, formatDuration, formatZoneHeights } from './format'

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

describe('formatZoneHeights', () => {
  const zone = (overrides: Partial<ZoneProperties>) =>
    ({
      lowerLimitM: 0,
      lowerReference: 'AGL',
      upperLimitM: null,
      upperReference: 'AGL',
      ...overrides,
    }) as ZoneProperties

  it('describes ground-based and elevated zones', () => {
    expect(formatZoneHeights(zone({}))).toBe('from the ground, no upper limit')
    expect(formatZoneHeights(zone({ upperLimitM: 150 }))).toBe(
      'from the ground, up to 150 m above ground',
    )
    expect(formatZoneHeights(zone({ lowerLimitM: 120 }))).toBe(
      'from 120 m above ground, no upper limit',
    )
    expect(formatZoneHeights(zone({ upperLimitM: 600, upperReference: 'AMSL' }))).toBe(
      'from the ground, up to 600 m above sea level',
    )
  })
})
