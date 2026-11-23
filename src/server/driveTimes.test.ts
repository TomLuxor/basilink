import { describe, expect, it, vi } from 'vitest'
import { DEPARTURE_TIMES, type DriveTimes } from '@/data/driveTimes'
import { directionsUrl, handleDriveTimes, typicalWeekday } from './driveTimes'

const TOKEN = 'test-token'
const MONDAY = new Date('2026-11-23T10:00:00Z')

describe('typicalWeekday', () => {
  it('picks the next Tuesday at least two days ahead', () => {
    expect(typicalWeekday(new Date('2026-11-22T12:00:00Z'))).toBe('2026-11-24') // Sunday
    expect(typicalWeekday(MONDAY)).toBe('2026-12-01')
    expect(typicalWeekday(new Date('2026-11-24T12:00:00Z'))).toBe('2026-12-01') // Tuesday
    expect(typicalWeekday(new Date('2026-11-28T12:00:00Z'))).toBe('2026-12-01') // Saturday
  })
})

describe('directionsUrl', () => {
  it('asks for one departure without route geometry', () => {
    const url = new URL(directionsUrl([7.58, 47.56], [7.55, 47.57], '2026-12-01T07:30', TOKEN))
    expect(url.pathname).toBe('/directions/v5/mapbox/driving-traffic/7.58,47.56;7.55,47.57')
    expect(url.searchParams.get('depart_at')).toBe('2026-12-01T07:30')
    expect(url.searchParams.get('overview')).toBe('false')
  })
})

/** Fake Mapbox: the duration grows with the departure hour, so the order can be checked. */
function fakeMapbox(status = 200) {
  return vi.fn(async (input: string | URL | Request) => {
    const departAt = new URL(String(input)).searchParams.get('depart_at')!
    const hour = Number(departAt.slice(11, 13))
    const body =
      status === 200
        ? { code: 'Ok', routes: [{ duration: 600 + hour + 0.4, distance: 5000 }] }
        : { message: 'Not Authorized - Invalid Token' }
    return Response.json(body, { status })
  })
}

const query = (from: string, to: string) => new URLSearchParams({ from, to })

describe('handleDriveTimes', () => {
  it('returns one rounded duration per departure time, never cached', async () => {
    const mapbox = fakeMapbox()
    const response = await handleDriveTimes(query('usb', 'ukbb'), TOKEN, MONDAY, mapbox)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const body = (await response.json()) as DriveTimes
    expect(body.date).toBe('2026-12-01')
    expect(body.times).toEqual([
      { departure: '07:30', durationS: 607 },
      { departure: '12:00', durationS: 612 },
      { departure: '17:30', durationS: 617 },
      { departure: '22:00', durationS: 622 },
    ])
    expect(mapbox).toHaveBeenCalledTimes(DEPARTURE_TIMES.length)
  })

  it('accepts listed sites only, and two different ones', async () => {
    const mapbox = fakeMapbox()
    for (const [from, to] of [
      ['usb', 'somewhere'],
      ['usb', 'usb'],
      ['', ''],
    ] as const) {
      expect((await handleDriveTimes(query(from, to), TOKEN, MONDAY, mapbox)).status).toBe(400)
    }
    expect(mapbox).not.toHaveBeenCalled()
  })

  it('says so when no token is set', async () => {
    const mapbox = fakeMapbox()
    const response = await handleDriveTimes(query('usb', 'ukbb'), undefined, MONDAY, mapbox)
    expect(response.status).toBe(503)
    expect(mapbox).not.toHaveBeenCalled()
  })

  it('reports a Mapbox error without revealing the token', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await handleDriveTimes(query('usb', 'ukbb'), TOKEN, MONDAY, fakeMapbox(401))
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain(TOKEN)
    expect(JSON.stringify(log.mock.calls)).not.toContain(TOKEN)
    log.mockRestore()
  })
})
