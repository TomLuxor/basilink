import { describe, expect, it } from 'vitest'
import { parseDirectionsResponse } from './openrouteservice.ts'

describe('parseDirectionsResponse', () => {
  it('reads distance, duration and geometry of the first route', () => {
    const body = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { summary: { distance: 4120.5, duration: 540.2 } },
          geometry: {
            type: 'LineString',
            coordinates: [
              [7.58, 47.56],
              [7.59, 47.55],
            ],
          },
        },
      ],
    }
    expect(parseDirectionsResponse(body)).toEqual({
      distanceM: 4120.5,
      durationS: 540.2,
      geometry: body.features[0]!.geometry,
    })
  })

  it('rejects responses without a route', () => {
    expect(() => parseDirectionsResponse({ features: [] })).toThrow('Unexpected ORS response')
    expect(() => parseDirectionsResponse({ error: 'quota' })).toThrow('Unexpected ORS response')
  })
})
