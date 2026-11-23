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

/**
 * Vertical extent of a zone, e.g. "ground – no limit" or "120 m – no limit". Heights are above
 * ground unless marked "a.s.l." (above sea level).
 */
export function formatHeightRange(zone: ZoneProperties): string {
  const limit = (metres: number, reference: 'AGL' | 'AMSL') =>
    `${Math.round(metres)} m${reference === 'AMSL' ? ' a.s.l.' : ''}`
  const lower =
    zone.lowerLimitM === 0 && zone.lowerReference === 'AGL'
      ? 'ground'
      : limit(zone.lowerLimitM, zone.lowerReference)
  const upper =
    zone.upperLimitM === null ? 'no limit' : limit(zone.upperLimitM, zone.upperReference)
  return `${lower} – ${upper}`
}

/** e.g. "20 Nov 2026" */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'Europe/Zurich',
  }).format(new Date(iso))
}
