/**
 * The corridor around the direct line between two sites, in LV95 metres.
 *
 * Buffering a straight segment by a distance w gives a "stadium" shape: a rectangle along
 * the segment plus a half circle at each end. Every point of it is at most w from the segment.
 * The check therefore only needs distances: a zone lies in the corridor exactly when its
 * distance to the flight line is at most w. The stadium polygon is only built for the map.
 * All of this is plain metric geometry in LV95.
 */
import type { Lv95Point, Lv95Polygon } from './lv95'

export function distanceM(a: Lv95Point, b: Lv95Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

/** Shortest distance from point p to the segment a–b. */
export function pointToSegmentM(p: Lv95Point, a: Lv95Point, b: Lv95Point): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  const lengthSquared = dx * dx + dy * dy
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** true if the segments a–b and c–d cross each other. */
function segmentsCross(a: Lv95Point, b: Lv95Point, c: Lv95Point, d: Lv95Point): boolean {
  // The sign of a cross product tells on which side of a line a point lies.
  const side = (o: Lv95Point, p: Lv95Point, q: Lv95Point) =>
    Math.sign((p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]))
  return side(c, d, a) * side(c, d, b) < 0 && side(a, b, c) * side(a, b, d) < 0
}

/** Shortest distance between the segments a–b and c–d (0 if they cross). */
export function segmentToSegmentM(a: Lv95Point, b: Lv95Point, c: Lv95Point, d: Lv95Point) {
  if (segmentsCross(a, b, c, d)) return 0
  // Otherwise the closest points include an end point of one of the segments. Touching
  // segments are covered here too: their distance is 0.
  return Math.min(
    pointToSegmentM(a, c, d),
    pointToSegmentM(b, c, d),
    pointToSegmentM(c, a, b),
    pointToSegmentM(d, a, b),
  )
}

/** Ray casting: true if p lies inside the closed ring. */
function insideRing(p: Lv95Point, ring: Lv95Point[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!
    const [xj, yj] = ring[j]!
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** true if p lies inside the polygon: inside the outer ring and in none of its holes. */
export function insidePolygon(p: Lv95Point, polygon: Lv95Polygon): boolean {
  const [outer, ...holes] = polygon
  return !!outer && insideRing(p, outer) && !holes.some((hole) => insideRing(p, hole))
}

/** Shortest distance from the segment a–b to the outline of the polygon (all its rings). */
export function distanceToOutlineM(a: Lv95Point, b: Lv95Point, polygon: Lv95Polygon): number {
  let shortest = Infinity
  for (const ring of polygon) {
    for (let i = 1; i < ring.length; i++) {
      shortest = Math.min(shortest, segmentToSegmentM(a, b, ring[i - 1]!, ring[i]!))
    }
  }
  return shortest
}

/**
 * Shortest distance between the segment a–b and the polygon area: 0 if they overlap. If the
 * segment does not cross the outline, it lies either completely inside (then a is inside) or
 * completely outside, where the distance to the outline is the answer.
 */
export function distanceToPolygonM(a: Lv95Point, b: Lv95Point, polygon: Lv95Polygon): number {
  return insidePolygon(a, polygon) ? 0 : distanceToOutlineM(a, b, polygon)
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
