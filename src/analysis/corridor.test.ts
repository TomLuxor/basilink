import { describe, expect, it } from 'vitest'
import type { Lv95Point } from './lv95'
import { corridorRing, distanceM } from './corridor'

/** Shortest distance from point p to the segment a–b. */
function distanceToSegment(p: Lv95Point, a: Lv95Point, b: Lv95Point): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  const lengthSquared = dx * dx + dy * dy
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Signed area (shoelace formula); positive for counter-clockwise rings. */
function signedArea(ring: Lv95Point[]): number {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i]![0] * ring[i + 1]![1] - ring[i + 1]![0] * ring[i]![1]
  }
  return sum / 2
}

describe('distanceM', () => {
  it('measures straight-line distance in metres', () => {
    expect(distanceM([2600000, 1200000], [2603000, 1204000])).toBe(5000)
  })
})

describe('corridorRing', () => {
  const a: Lv95Point = [2611000, 1267000]
  const b: Lv95Point = [2614000, 1263000] // 5 km to the south-east
  const halfWidth = 50

  it('is a closed, counter-clockwise ring', () => {
    const ring = corridorRing(a, b, halfWidth)
    expect(ring.at(0)).toEqual(ring.at(-1))
    expect(signedArea(ring)).toBeGreaterThan(0)
  })

  it('keeps every vertex exactly at the buffer distance from the segment', () => {
    for (const point of corridorRing(a, b, halfWidth)) {
      expect(distanceToSegment(point, a, b)).toBeCloseTo(halfWidth, 6)
    }
  })

  it('has about the area of a stadium (2·w·L + π·w²)', () => {
    const expected = 2 * halfWidth * distanceM(a, b) + Math.PI * halfWidth ** 2
    const actual = signedArea(corridorRing(a, b, halfWidth, 64))
    expect(Math.abs(actual - expected) / expected).toBeLessThan(0.001)
  })

  it('becomes a circle when start and end are the same', () => {
    for (const point of corridorRing(a, a, halfWidth)) {
      expect(distanceM(point, a)).toBeCloseTo(halfWidth, 6)
    }
  })
})
