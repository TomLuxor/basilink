import { describe, expect, it } from 'vitest'
import type { Position } from 'geojson'
import type { BBox } from '../../src/config/region.ts'
import type { ZoneFeature } from '../../src/types/zone.ts'
import {
  categorize,
  parseExportDate,
  serializeFeatureCollection,
  simplifyZone,
  toMetres,
  toZoneFeatures,
  type Ed269Collection,
  type Ed269Volume,
  type Ed269Zone,
} from './transform.ts'

const BASEL: BBox = [7.45, 47.42, 7.82, 47.65]

/** A small square (about 100 m) with its south-west corner at the given position. */
function square(lon: number, lat: number): Position[][] {
  const d = 0.001
  return [
    [
      [lon, lat],
      [lon + d, lat],
      [lon + d, lat + d],
      [lon, lat + d],
      [lon, lat],
    ],
  ]
}

function volume(overrides: Partial<Ed269Volume> = {}): Ed269Volume {
  return {
    uomDimensions: 'M',
    lowerLimit: 0,
    lowerVerticalReference: 'AGL',
    upperLimit: 150,
    upperVerticalReference: 'AGL',
    horizontalProjection: { type: 'Polygon', coordinates: square(7.59, 47.55) },
    ...overrides,
  }
}

function zone(overrides: Partial<Ed269Zone> = {}): Ed269Zone {
  return {
    identifier: 'TEST001',
    name: 'Test zone',
    reason: ['SENSITIVE'],
    restrictionConditions: ['The operation of unmanned aircraft is prohibited.'],
    message: 'Exemption permits may be applied for.',
    applicability: [{ permanent: 'YES' }],
    zoneAuthority: [
      {
        name: 'Canton Test',
        service: 'Police',
        email: 'test@example.ch',
        phone: '',
        siteURL: 'https://example.ch',
      },
    ],
    geometry: [volume()],
    ...overrides,
  }
}

function collection(...zones: Ed269Zone[]): Ed269Collection {
  return { title: 'Test', description: 'according to ED-269', features: zones }
}

describe('categorize', () => {
  it('splits air traffic zones into control zones and aerodromes', () => {
    expect(categorize(['AIR_TRAFFIC'], 'CTR0016')).toBe('ctr')
    expect(categorize(['AIR_TRAFFIC'], 'LFSB001')).toBe('aerodrome')
  })

  it('maps sensitive and nature reasons', () => {
    expect(categorize(['SENSITIVE'], 'LOH0001')).toBe('sensitive')
    expect(categorize(['NATURE'], 'BLns001')).toBe('nature')
  })

  it('prefers air traffic when a zone has several reasons', () => {
    expect(categorize(['NATURE', 'AIR_TRAFFIC'], 'X1')).toBe('aerodrome')
  })

  it('falls back to "other" for unknown reasons', () => {
    expect(categorize(['EMERGENCY'], 'X1')).toBe('other')
  })
})

describe('toMetres', () => {
  it('keeps metres and converts feet', () => {
    expect(toMetres(120, 'M')).toBe(120)
    expect(toMetres(1000, 'FT')).toBe(304.8)
  })

  it('rejects unknown units', () => {
    expect(() => toMetres(1, 'NM')).toThrow('Unsupported unit')
  })
})

describe('parseExportDate', () => {
  it('reads the timestamp from the ED-269 title', () => {
    expect(parseExportDate('SwissUASGeozones - created on 2026-11-20T16:05:46.782+01:00')).toBe(
      '2026-11-20T16:05:46.782+01:00',
    )
  })

  it('returns null when there is no valid date', () => {
    expect(parseExportDate('SwissUASGeozones')).toBeNull()
    expect(parseExportDate('created on yesterday')).toBeNull()
  })
})

describe('toZoneFeatures', () => {
  it('maps a zone to flat properties', () => {
    const [feature] = toZoneFeatures(collection(zone()), BASEL)
    expect(feature?.properties).toMatchObject({
      id: 'TEST001',
      zoneId: 'TEST001',
      category: 'sensitive',
      permanent: true,
      validFrom: null,
      lowerLimitM: 0,
      lowerReference: 'AGL',
      upperLimitM: 150,
      upperReference: 'AGL',
      authorityName: 'Canton Test',
    })
  })

  it('treats 99999 as "no upper limit"', () => {
    const input = zone({ geometry: [volume({ upperLimit: 99999 })] })
    const [feature] = toZoneFeatures(collection(input), BASEL)
    expect(feature?.properties.upperLimitM).toBeNull()
  })

  it('keeps AMSL references and converts feet', () => {
    const input = zone({
      geometry: [volume({ uomDimensions: 'FT', upperLimit: 1000, upperVerticalReference: 'AMSL' })],
    })
    const [feature] = toZoneFeatures(collection(input), BASEL)
    expect(feature?.properties).toMatchObject({ upperLimitM: 304.8, upperReference: 'AMSL' })
  })

  it('keeps the validity period of temporary zones', () => {
    const input = zone({
      applicability: [
        {
          permanent: 'NO',
          startDateTime: '2026-11-30T07:00:00.000+01:00',
          endDateTime: '2026-12-04T23:59:00.000+01:00',
        },
      ],
    })
    const [feature] = toZoneFeatures(collection(input), BASEL)
    expect(feature?.properties).toMatchObject({
      permanent: false,
      validFrom: '2026-11-30T07:00:00.000+01:00',
      validTo: '2026-12-04T23:59:00.000+01:00',
    })
  })

  it('creates one feature per volume with numbered ids', () => {
    const input = zone({ geometry: [volume(), volume({ lowerLimit: 120 })] })
    const ids = toZoneFeatures(collection(input), BASEL).map((f) => f.properties.id)
    expect(ids).toEqual(['TEST001-1', 'TEST001-2'])
  })

  it('drops zones outside the region and sorts by id', () => {
    const geneva = zone({
      identifier: 'GE01',
      geometry: [
        volume({ horizontalProjection: { type: 'Polygon', coordinates: square(6.1, 46.2) } }),
      ],
    })
    const features = toZoneFeatures(
      collection(zone({ identifier: 'B2' }), geneva, zone({ identifier: 'A1' })),
      BASEL,
    )
    expect(features.map((f) => f.properties.id)).toEqual(['A1', 'B2'])
  })

  it('fails loudly on data it does not understand', () => {
    const circle = zone({
      geometry: [volume({ horizontalProjection: { type: 'Circle', coordinates: [] } })],
    })
    expect(() => toZoneFeatures(collection(circle), BASEL)).toThrow('unsupported geometry')

    const wgs84 = zone({ geometry: [volume({ upperVerticalReference: 'WGS84' })] })
    expect(() => toZoneFeatures(collection(wgs84), BASEL)).toThrow('Unsupported vertical reference')
  })
})

describe('simplifyZone', () => {
  /** A ring with a point every ~0.1 m along its bottom edge, like the dense FOCA arcs. */
  function denseZone(): ZoneFeature {
    const bottom: Position[] = Array.from({ length: 101 }, (_, i) => [7.59 + i * 0.000001, 47.55])
    const ring = [...bottom, [7.5901, 47.551], [7.59, 47.551], [7.59, 47.55]]
    const [feature] = toZoneFeatures(
      collection(
        zone({
          geometry: [volume({ horizontalProjection: { type: 'Polygon', coordinates: [ring] } })],
        }),
      ),
      BASEL,
    )
    if (!feature) throw new Error('fixture missing')
    return feature
  }

  it('removes points that add less than about a metre of detail', () => {
    const before = denseZone()
    const after = simplifyZone(before)
    expect(after.geometry.coordinates[0]!.length).toBeLessThan(
      before.geometry.coordinates[0]!.length,
    )
    expect(after.geometry.coordinates[0]!.length).toBeGreaterThanOrEqual(4)
  })

  it('keeps rings closed and rounds to 6 decimals', () => {
    const ring = simplifyZone(denseZone()).geometry.coordinates[0]!
    expect(ring.at(0)).toEqual(ring.at(-1))
    for (const [lon, lat] of ring) {
      expect(lon).toBe(Math.round(lon! * 1e6) / 1e6)
      expect(lat).toBe(Math.round(lat! * 1e6) / 1e6)
    }
  })

  it('keeps the properties unchanged', () => {
    const before = denseZone()
    expect(simplifyZone(before).properties).toEqual(before.properties)
  })
})

describe('serializeFeatureCollection', () => {
  it('writes valid GeoJSON with one feature per line', () => {
    const features = toZoneFeatures(
      collection(zone({ identifier: 'A1' }), zone({ identifier: 'B2' })),
      BASEL,
    )
    const text = serializeFeatureCollection(features)
    expect(JSON.parse(text)).toEqual({ type: 'FeatureCollection', features })
    expect(text.split('\n').filter((line) => line.startsWith('{"type":"Feature"'))).toHaveLength(2)
  })
})
