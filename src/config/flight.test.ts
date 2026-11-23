import { describe, expect, it } from 'vitest'
import { DEFAULT_FLIGHT_PARAMETERS, sanitizeParameters } from './flight'

describe('sanitizeParameters', () => {
  it('keeps valid values', () => {
    const input = { ...DEFAULT_FLIGHT_PARAMETERS, cruiseSpeedKmh: 50, flightAltitudeM: 60 }
    expect(sanitizeParameters(input)).toEqual(input)
  })

  it('falls back to the default for empty or out-of-range values', () => {
    const input = {
      ...DEFAULT_FLIGHT_PARAMETERS,
      cruiseSpeedKmh: Number.NaN, // empty number input
      flightAltitudeM: 5000,
      extraHorizontalM: -10,
    }
    expect(sanitizeParameters(input)).toEqual(DEFAULT_FLIGHT_PARAMETERS)
  })
})
