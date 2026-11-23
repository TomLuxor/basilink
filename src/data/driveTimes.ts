/**
 * Driving times with typical traffic (docs/decisions.md, D29). Unlike the routes, they are not
 * pre-computed: Mapbox forbids storing its results, so the Vercel Function api/drive-times.ts
 * asks Mapbox live whenever someone opens "By time of day".
 *
 * Shared between the app and the function, so keep it free of browser APIs.
 */

/** Departure times on a normal working day, local time in Switzerland. */
export const DEPARTURE_TIMES = ['07:30', '12:00', '17:30', '22:00'] as const

export interface DriveTimes {
  /** e.g. "Mapbox Directions, profile driving-traffic" */
  provider: string
  /** The working day the times are predicted for, YYYY-MM-DD (always a Tuesday). */
  date: string
  /** One entry per departure time, in the order of DEPARTURE_TIMES. */
  times: { departure: string; durationS: number }[]
}

/** Path of the function for one ordered pair, relative to the site root. */
export function driveTimesPath(fromId: string, toId: string): string {
  const query = new URLSearchParams({ from: fromId, to: toId })
  return `api/drive-times?${query}`
}
