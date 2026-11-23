import type { ZoneCategory } from '@/types/zone'

/**
 * Labels and colours per zone category (derived from the ED-269 `reason`, see D6).
 * Colours stay close to the FOCA map so users recognise them, but are darkened for contrast.
 * The order is used for legends and for grouping results: air traffic first.
 */
export const ZONE_CATEGORIES: Record<
  ZoneCategory,
  { label: string; description: string; colour: string }
> = {
  aerodrome: {
    label: 'Aerodrome',
    description: 'Airport or airfield zone',
    colour: '#b91c1c',
  },
  ctr: {
    label: 'Control zone (CTR)',
    description: 'Controlled airspace around an airport, usually from 120 m above ground',
    colour: '#86198f',
  },
  sensitive: {
    label: 'Sensitive site',
    description: 'E.g. prison, substation, military site',
    colour: '#1d4ed8',
  },
  nature: {
    label: 'Nature and wildlife',
    description: 'Nature reserve or wildlife protection area',
    colour: '#b45309',
  },
  other: {
    label: 'Other',
    description: 'Other restriction',
    colour: '#475569',
  },
}

export const ZONE_CATEGORY_ORDER: ZoneCategory[] = [
  'aerodrome',
  'ctr',
  'sensitive',
  'nature',
  'other',
]
