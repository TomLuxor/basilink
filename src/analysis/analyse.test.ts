import { describe, expect, it } from 'vitest'
import { DEFAULT_FLIGHT_PARAMETERS } from '@/config/flight'
import type { ZoneFeature, ZoneProperties } from '@/types/zone'
import { analyseCorridor, groupByCategory, prepareArea, prepareZones } from './analyse'
import { toLv95, toWgs84, type Lv95Point } from './lv95'

// Test layout in LV95 metres: a 2 km flight due east. With the default parameters the
// operational volume reaches 49.6 m from the line and the ground risk buffer 165.7 m.
const START = toLv95([7.58, 47.56])
const END: Lv95Point = [START[0] + 2000, START[1]]
const from = toWgs84(START)
const to = toWgs84(END)

/** Axis-aligned rectangle in metres relative to START, as a WGS84 ring. */
function rectangle(x1: number, y1: number, x2: number, y2: number) {
  const corners: Lv95Point[] = [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
    [x1, y1],
  ]
  return corners.map(([x, y]) => toWgs84([START[0] + x, START[1] + y]))
}

function zone(
  id: string,
  ring: ReturnType<typeof rectangle>,
  overrides: Partial<ZoneProperties> = {},
): ZoneFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {
      id,
      zoneId: id,
      name: `Zone ${id}`,
      category: 'sensitive',
      reason: 'SENSITIVE',
      restriction: 'The operation of unmanned aircraft is prohibited.',
      message: '',
      permanent: true,
      validFrom: null,
      validTo: null,
      lowerLimitM: 0,
      lowerReference: 'AGL',
      upperLimitM: 150,
      upperReference: 'AGL',
      authorityName: `Authority ${id}`,
      authorityService: '',
      authorityEmail: '',
      authorityPhone: '',
      authorityUrl: '',
      ...overrides,
    },
  }
}

function analyse(zones: ZoneFeature[], extra: Partial<Parameters<typeof analyseCorridor>[0]> = {}) {
  return analyseCorridor({
    from,
    to,
    parameters: DEFAULT_FLIGHT_PARAMETERS,
    zones: prepareZones(zones),
    ...extra,
  })
}

describe('analyseCorridor', () => {
  it('measures the distance and the flight time at cruise speed', () => {
    const result = analyse([])
    expect(result.distanceM).toBeCloseTo(2000, 3)
    expect(result.flightTimeS).toBeCloseTo(100, 3) // 2000 m at 20 m/s
    expect(result.verdict).toBe('no-zones')
  })

  it('reports a zone on the line as a conflict, with its authority', () => {
    const result = analyse([zone('A', rectangle(950, -50, 1050, 50))])
    expect(result.findings.map((f) => [f.zone.id, f.relation])).toEqual([['A', 'conflict']])
    expect(result.verdict).toBe('authorisation-needed')
    expect(result.authorities).toEqual([
      expect.objectContaining({ name: 'Authority A', zoneNames: ['Zone A'] }),
    ])
  })

  it('reports a zone 40 m beside the line as a conflict (inside the contingency volume)', () => {
    const result = analyse([zone('A', rectangle(950, 40, 1050, 90))])
    expect(result.findings[0]?.relation).toBe('conflict')
  })

  it('passes below a control zone that starts at 120 m above ground', () => {
    const ctr = zone('CTR', rectangle(-500, -500, 2500, 500), {
      category: 'ctr',
      lowerLimitM: 120,
      upperLimitM: null,
    })
    const result = analyse([ctr])
    expect(result.findings[0]?.relation).toBe('passes-below')
    expect(result.verdict).toBe('outside-vertical-limits')
    expect(result.authorities).toEqual([])
  })

  it('flags a CTR as conflict once the flight altitude is too high', () => {
    const ctr = zone('CTR', rectangle(-500, -500, 2500, 500), {
      lowerLimitM: 120,
      upperLimitM: null,
    })
    const result = analyse([ctr], {
      parameters: { ...DEFAULT_FLIGHT_PARAMETERS, flightAltitudeM: 100 },
    })
    expect(result.findings[0]?.relation).toBe('conflict')
  })

  it('notes zones that only the ground risk buffer touches', () => {
    const result = analyse([zone('B', rectangle(1000, 80, 1100, 130))])
    expect(result.findings[0]?.relation).toBe('ground-risk-buffer')
    expect(result.verdict).toBe('no-zones')
  })

  it('ignores zones outside the ground risk buffer', () => {
    expect(analyse([zone('far', rectangle(1000, 1000, 1100, 1100))]).findings).toEqual([])
  })

  it('treats AMSL zones as conflicts until terrain heights are known', () => {
    const amsl = zone('H', rectangle(950, -50, 1050, 50), {
      lowerLimitM: 500,
      lowerReference: 'AMSL',
      upperLimitM: null,
      upperReference: 'AMSL',
    })
    const withoutTerrain = analyse([amsl])
    expect(withoutTerrain.needsTerrain).toBe(true)
    expect(withoutTerrain.findings[0]?.relation).toBe('conflict')

    // Terrain 260–300 m: the corridor reaches 300 + 115.4 m, below the zone at 500 m.
    const withTerrain = analyse([amsl], { terrain: { minM: 260, maxM: 300 } })
    expect(withTerrain.needsTerrain).toBe(false)
    expect(withTerrain.findings[0]?.relation).toBe('passes-below')
  })

  it('sorts conflicts first and lists each authority once', () => {
    const result = analyse([
      zone('B', rectangle(1000, 80, 1100, 130)),
      zone('A1', rectangle(100, -20, 200, 20), { authorityName: 'Same' }),
      zone('A2', rectangle(500, -20, 600, 20), { authorityName: 'Same' }),
    ])
    expect(result.findings.map((f) => f.relation)).toEqual([
      'conflict',
      'conflict',
      'ground-risk-buffer',
    ])
    expect(result.authorities).toHaveLength(1)
    expect(result.authorities[0]?.zoneNames).toEqual(['Zone A1', 'Zone A2'])
  })

  it('warns when the corridor leaves Swiss territory', () => {
    const inside = prepareArea({
      type: 'Polygon',
      coordinates: [rectangle(-1000, -1000, 3000, 1000)],
    })
    const tooSmall = prepareArea({
      type: 'Polygon',
      coordinates: [rectangle(-1000, -1000, 1500, 1000)],
    })
    expect(analyse([], { switzerland: inside }).leavesSwitzerland).toBe(false)
    expect(analyse([], { switzerland: tooSmall }).leavesSwitzerland).toBe(true)
    expect(analyse([]).leavesSwitzerland).toBeNull()
  })
})

describe('groupByCategory', () => {
  it('groups findings in the fixed category order and skips empty groups', () => {
    const result = analyse([
      zone('N', rectangle(100, -20, 200, 20), { category: 'nature' }),
      zone('C', rectangle(500, -20, 600, 20), { category: 'ctr' }),
    ])
    expect(groupByCategory(result.findings).map((g) => g.category)).toEqual(['ctr', 'nature'])
  })
})
