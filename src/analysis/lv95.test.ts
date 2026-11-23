import { describe, expect, it } from 'vitest'
import { toLv95, toWgs84 } from './lv95'

// Reference points from the geo.admin.ch address search, which returns WGS84 and LV95
// for the same address (requested on 2026-11-23).
const REFERENCES = [
  {
    name: 'Hagmattstrasse 14, Allschwil',
    wgs84: [7.543109, 47.557224],
    lv95: [2607864.5, 1267395.4],
  },
  { name: 'Rheinstrasse 26, Liestal', wgs84: [7.731073, 47.488003], lv95: [2622040.3, 1259734.3] },
  { name: 'Aeschenvorstadt 57, Basel', wgs84: [7.593902, 47.552216], lv95: [2611688.5, 1266844.5] },
]

describe('toLv95', () => {
  it.each(REFERENCES)('matches swisstopo within 1.5 m for $name', ({ wgs84, lv95 }) => {
    const [east, north] = toLv95(wgs84)
    expect(Math.abs(east - lv95[0]!)).toBeLessThan(1.5)
    expect(Math.abs(north - lv95[1]!)).toBeLessThan(1.5)
  })
})

describe('toWgs84', () => {
  it('is the inverse of toLv95 (round trip below 1 cm)', () => {
    const start = [7.59, 47.555]
    const [lon, lat] = toWgs84(toLv95(start))
    expect(lon).toBeCloseTo(start[0]!, 7)
    expect(lat).toBeCloseTo(start[1]!, 7)
  })
})
