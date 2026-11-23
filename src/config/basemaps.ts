/**
 * swisstopo vector base maps (verified in docs/phase-0-spike.md).
 * The light map keeps overlays readable. The aerial map is offered because the swisstopo
 * vector map is empty outside Switzerland at street level, while the aerial imagery also
 * covers the EuroAirport (on French soil) and the border area.
 */
export type BasemapId = 'light' | 'aerial'

export const BASEMAPS: Record<BasemapId, { label: string; styleUrl: string }> = {
  light: {
    label: 'Map',
    styleUrl: 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json',
  },
  aerial: {
    label: 'Aerial',
    styleUrl: 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.imagerybasemap.vt/style.json',
  },
}
