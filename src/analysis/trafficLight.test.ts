import { describe, expect, it } from 'vitest'
import { trafficLight } from './trafficLight'

describe('trafficLight', () => {
  it('is red whenever an exemption is needed, also across the border', () => {
    expect(trafficLight({ verdict: 'authorisation-needed', leavesSwitzerland: false })).toBe('red')
    expect(trafficLight({ verdict: 'authorisation-needed', leavesSwitzerland: true })).toBe('red')
  })

  it('is amber without a zone conflict if the corridor leaves Switzerland', () => {
    expect(trafficLight({ verdict: 'outside-vertical-limits', leavesSwitzerland: true })).toBe(
      'amber',
    )
  })

  it('is green without a zone conflict inside Switzerland', () => {
    expect(trafficLight({ verdict: 'no-zones', leavesSwitzerland: false })).toBe('green')
    expect(trafficLight({ verdict: 'outside-vertical-limits', leavesSwitzerland: false })).toBe(
      'green',
    )
    // Border unknown (not loaded): no reason to warn.
    expect(trafficLight({ verdict: 'no-zones', leavesSwitzerland: null })).toBe('green')
  })
})
