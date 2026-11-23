/** Formatting for the result panel. Kept separate so it can be tested. */
import type { ZoneProperties } from '@/types/zone'

export function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  if (total < 60) return `${total} s`
  const minutes = Math.floor(total / 60)
  if (minutes < 10) return `${minutes} min ${total % 60} s`
  if (minutes < 60) return `${Math.round(total / 60)} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

function formatLimit(metres: number, reference: 'AGL' | 'AMSL'): string {
  return `${Math.round(metres)} m ${reference === 'AGL' ? 'above ground' : 'above sea level'}`
}

/** Vertical extent of a zone in words, e.g. "from 120 m above ground, no upper limit". */
export function formatZoneHeights(zone: ZoneProperties): string {
  const upper =
    zone.upperLimitM === null
      ? 'no upper limit'
      : `up to ${formatLimit(zone.upperLimitM, zone.upperReference)}`
  const lower =
    zone.lowerLimitM === 0 && zone.lowerReference === 'AGL'
      ? 'from the ground'
      : `from ${formatLimit(zone.lowerLimitM, zone.lowerReference)}`
  return `${lower}, ${upper}`
}

/** e.g. "20 Nov 2026" */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'Europe/Zurich',
  }).format(new Date(iso))
}
