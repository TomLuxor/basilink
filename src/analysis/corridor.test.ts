import { describe, expect, it } from 'vitest'
import type { Lv95Point, Lv95Polygon } from './lv95'
import {
  corridorRing,
  distanceM,
  distanceToPolygonM,
  insidePolygon,
  pointToSegmentM,
  segmentToSegmentM,
} from './corridor'

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
      expect(pointToSegmentM(point, a, b)).toBeCloseTo(halfWidth, 6)
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

describe('segmentToSegmentM', () => {
  it('is 0 for crossing or touching segments', () => {
    expect(segmentToSegmentM([0, 0], [10, 10], [0, 10], [10, 0])).toBe(0)
    expect(segmentToSegmentM([0, 0], [10, 0], [5, 0], [5, 8])).toBe(0)
  })

  it('measures the gap between parallel and skewed segments', () => {
    expect(segmentToSegmentM([0, 0], [10, 0], [0, 30], [10, 30])).toBe(30)
    expect(segmentToSegmentM([0, 0], [10, 0], [13, 4], [20, 20])).toBe(5)
  })
})

describe('distanceToPolygonM', () => {
  // A 100 m square with a 40 m hole in the middle.
  const square: Lv95Polygon = [
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
      [0, 0],
    ],
    [
      [30, 30],
      [70, 30],
      [70, 70],
      [30, 70],
      [30, 30],
    ],
  ]

  it('knows which points are inside, holes excluded', () => {
    expect(insidePolygon([10, 10], square)).toBe(true)
    expect(insidePolygon([50, 50], square)).toBe(false)
    expect(insidePolygon([150, 50], square)).toBe(false)
  })

  it('is 0 when the line lies inside or crosses the area', () => {
    expect(distanceToPolygonM([10, 10], [20, 20], square)).toBe(0)
    expect(distanceToPolygonM([-50, 10], [150, 10], square)).toBe(0)
  })

  it('measures lines beside the area and inside the hole', () => {
    expect(distanceToPolygonM([-50, 120], [150, 120], square)).toBe(20)
    expect(distanceToPolygonM([40, 50], [60, 50], square)).toBe(10)
  })
})
