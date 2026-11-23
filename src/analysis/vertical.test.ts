import { describe, expect, it } from 'vitest'
import { verticalRelation } from './vertical'

const agl = (lowerLimitM: number, upperLimitM: number | null) => ({
  lowerLimitM,
  lowerReference: 'AGL' as const,
  upperLimitM,
  upperReference: 'AGL' as const,
})

describe('verticalRelation with AGL limits', () => {
  it('passes below a control zone that starts at 120 m', () => {
    expect(verticalRelation(agl(120, null), 115.4)).toBe('below')
  })

  it('counts touching the lower limit as overlap', () => {
    expect(verticalRelation(agl(120, null), 120)).toBe('overlaps')
  })

  it('overlaps zones that start at the ground, whatever their upper limit', () => {
    expect(verticalRelation(agl(0, 150), 115.4)).toBe('overlaps')
    expect(verticalRelation(agl(0, null), 30)).toBe('overlaps')
  })
})

describe('verticalRelation with AMSL limits', () => {
  const terrain = { minM: 250, maxM: 380 }

  it('asks for terrain heights when they are not known', () => {
    const zone = { ...agl(0, 500), upperReference: 'AMSL' as const }
    expect(verticalRelation(zone, 115)).toBe('needs-terrain')
  })

  it('compares above sea level when the terrain is known', () => {
    // Corridor: 250 m (lowest ground) to 380 + 115 = 495 m above sea level.
    const highZone = {
      lowerLimitM: 600,
      lowerReference: 'AMSL' as const,
      upperLimitM: null,
      upperReference: 'AMSL' as const,
    }
    expect(verticalRelation(highZone, 115, terrain)).toBe('below')

    const lowZone = {
      lowerLimitM: 0,
      lowerReference: 'AGL' as const,
      upperLimitM: 240,
      upperReference: 'AMSL' as const,
    }
    expect(verticalRelation(lowZone, 115, terrain)).toBe('above')

    const crossingZone = { ...highZone, lowerLimitM: 450 }
    expect(verticalRelation(crossingZone, 115, terrain)).toBe('overlaps')
  })
})
