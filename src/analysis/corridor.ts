/**
 * The corridor around the direct line between two sites, in LV95 metres.
 *
 * Buffering a straight segment by a distance w gives a "stadium" shape: a rectangle along
 * the segment plus a half circle at each end. Building it directly keeps the geometry easy
 * to follow and exact in metres (no geodesic approximations needed in LV95).
 */
import type { Lv95Point } from './lv95'

export function distanceM(a: Lv95Point, b: Lv95Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

/**
 * Closed polygon ring (counter-clockwise) of all points within `halfWidth` metres of the
 * segment a–b. If a and b are equal, the result is a circle.
 */
export function corridorRing(
  a: Lv95Point,
  b: Lv95Point,
  halfWidth: number,
  stepsPerHalfCircle = 16,
): Lv95Point[] {
  const direction = Math.atan2(b[1] - a[1], b[0] - a[0])
  const ring: Lv95Point[] = []

  // Half circle around the end point b, then around the start point a.
  for (const [centre, startAngle] of [
    [b, direction - Math.PI / 2],
    [a, direction + Math.PI / 2],
  ] as const) {
    for (let i = 0; i <= stepsPerHalfCircle; i++) {
      const angle = startAngle + (Math.PI * i) / stepsPerHalfCircle
      ring.push([centre[0] + halfWidth * Math.cos(angle), centre[1] + halfWidth * Math.sin(angle)])
    }
  }

  ring.push(ring[0]!)
  return ring
}
