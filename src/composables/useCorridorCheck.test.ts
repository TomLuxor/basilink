/**
 * The app state end to end, without a browser: the composable loads the real files from
 * public/data/ through a fake fetch, and the tests drive it like the UI does.
 */
import { readFile } from 'node:fs/promises'
import { effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCorridorCheck } from './useCorridorCheck'

/** Serves the app's own files from public/ and refuses everything else (no network in tests). */
async function fakeFetch(input: string | URL | Request): Promise<Response> {
  const url = String(input)
  if (!url.startsWith('/')) throw new Error(`No network in tests: ${url}`)
  const body = await readFile(new URL(`../../public${url}`, import.meta.url), 'utf8')
  return new Response(body, { headers: { 'Content-Type': 'application/json' } })
}

let scope: EffectScope

/** Creates the state inside an effect scope, so its watchers are stopped after each test. */
async function setup() {
  scope = effectScope()
  const check = scope.run(() => useCorridorCheck())!
  await vi.waitFor(() => expect(check.zones.value).not.toBeNull())
  return check
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
})

afterEach(() => {
  scope.stop()
  vi.unstubAllGlobals()
})

describe('choosing sites', () => {
  it('on the map: first click start, second destination, third starts over', async () => {
    const check = await setup()
    check.selectFromMap('usb')
    expect([check.fromId.value, check.toId.value]).toEqual(['usb', null])
    check.selectFromMap('usb')
    expect([check.fromId.value, check.toId.value]).toEqual(['usb', null])
    check.selectFromMap('ukbb')
    expect([check.fromId.value, check.toId.value]).toEqual(['usb', 'ukbb'])
    check.selectFromMap('bethesda')
    expect([check.fromId.value, check.toId.value]).toEqual(['bethesda', null])
  })

  it('never uses the same site as start and destination', async () => {
    const check = await setup()
    check.setFrom('usb')
    check.setTo('usb')
    expect([check.fromId.value, check.toId.value]).toEqual([null, 'usb'])
    check.setFrom('usb')
    expect([check.fromId.value, check.toId.value]).toEqual(['usb', null])
  })

  it('swaps start and destination', async () => {
    const check = await setup()
    check.setFrom('usb')
    check.setTo('viollier-allschwil')
    check.swap()
    expect([check.fromId.value, check.toId.value]).toEqual(['viollier-allschwil', 'usb'])
  })
})

describe('corridor check with the real data', () => {
  it('USB → Viollier needs an exemption because of the airport zone', async () => {
    const check = await setup()
    check.setFrom('usb')
    check.setTo('viollier-allschwil')
    const analysis = check.analysis.value!
    expect(analysis.verdict).toBe('authorisation-needed')
    expect(
      analysis.findings.some((f) => f.relation === 'conflict' && f.zone.category === 'aerodrome'),
    ).toBe(true)
    // The drone is faster than the car on this pair.
    expect(check.routeSummary.value!.durationS).toBeGreaterThan(analysis.flightTimeS)
    await vi.waitFor(() => expect(check.routeGeometry.value?.geometry.type).toBe('LineString'))
  })

  it('Bruderholz → Unilabs stays below the control zone and needs no exemption', async () => {
    const check = await setup()
    check.setFrom('ksbl-bruderholz')
    check.setTo('unilabs-basel')
    const analysis = check.analysis.value!
    expect(analysis.verdict).not.toBe('authorisation-needed')
    expect(analysis.findings.some((f) => f.relation === 'passes-below')).toBe(true)
  })

  it('warns when the corridor leaves Switzerland (Riehen → Liestal)', async () => {
    const check = await setup()
    check.setFrom('adullam-riehen')
    check.setTo('ksbl-liestal')
    expect(check.analysis.value!.leavesSwitzerland).toBe(true)
  })

  it('falls back to the default for an invalid parameter', async () => {
    const check = await setup()
    check.parameters.value = { ...check.parameters.value, cruiseSpeedKmh: Number.NaN }
    expect(check.volumes.value.speedMs).toBeCloseTo(72 / 3.6)
  })
})
