import { describe, expect, it } from 'vitest'
import { DEFAULT_FLIGHT_PARAMETERS, type FlightParameters } from '@/config/flight'
import { computeVolumes } from './sora'

describe('computeVolumes', () => {
  // The worked multirotor example in JARUS SORA 2.5 Annex A, A.5.2:
  // V0 = 10 m/s, H_FG = 100 m, CD = 1.5 m → S_CV = 22.1 m, H_CV = 113.1 m, S_GRB = 113.85 m.
  const jarusExample: FlightParameters = {
    cruiseSpeedKmh: 36,
    flightAltitudeM: 100,
    characteristicDimensionM: 1.5,
    extraHorizontalM: 0,
    extraVerticalM: 0,
  }

  it('reproduces the JARUS SORA 2.5 Annex A multirotor example', () => {
    const volumes = computeVolumes(jarusExample)
    expect(volumes.contingencyHorizontalM).toBeCloseTo(22.1, 1)
    expect(volumes.contingencyTopM).toBeCloseTo(113.1, 1)
    expect(volumes.groundRiskBufferM).toBeCloseTo(113.85, 1)
  })

  it('gives the documented defaults (docs/decisions.md, D17)', () => {
    const volumes = computeVolumes(DEFAULT_FLIGHT_PARAMETERS)
    expect(volumes.speedMs).toBeCloseTo(20, 6)
    expect(volumes.flightGeographyTopM).toBe(80)
    expect(volumes.contingencyHorizontalM).toBeCloseTo(47.4, 1)
    expect(volumes.contingencyTopM).toBeCloseTo(115.4, 1)
    expect(volumes.groundRiskBufferM).toBeCloseTo(116.1, 1)
    expect(volumes.corridorHalfWidthM).toBeCloseTo(49.6, 1)
  })

  it('keeps the default operational volume below 120 m above ground', () => {
    expect(computeVolumes(DEFAULT_FLIGHT_PARAMETERS).contingencyTopM).toBeLessThan(120)
  })

  it('adds the extra margins on top of the SORA values', () => {
    const base = computeVolumes(jarusExample)
    const extra = computeVolumes({ ...jarusExample, extraHorizontalM: 10, extraVerticalM: 5 })
    expect(extra.contingencyHorizontalM - base.contingencyHorizontalM).toBeCloseTo(10, 6)
    expect(extra.contingencyTopM - base.contingencyTopM).toBeCloseTo(5, 6)
  })

  it('grows the contingency volume with speed', () => {
    const slow = computeVolumes({ ...jarusExample, cruiseSpeedKmh: 36 })
    const fast = computeVolumes({ ...jarusExample, cruiseSpeedKmh: 72 })
    expect(fast.contingencyHorizontalM).toBeGreaterThan(slow.contingencyHorizontalM)
    expect(fast.contingencyTopM).toBeGreaterThan(slow.contingencyTopM)
  })
})
