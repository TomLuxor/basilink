# Decisions

Short records of the decisions that shape Basilink. The evidence behind most of them is in
[phase-0-spike.md](phase-0-spike.md). Newest decisions go at the bottom.

## 2026-11-23 – Confirmed after Phase 0

### D1 Frontend stack: Vue 3, TypeScript strict, Vite, Tailwind CSS

Single-file components with `<script setup>` are readable and easy to explain. Tailwind keeps
styling consistent without writing a design system. The project was scaffolded with `create-vue`
and then trimmed:

- **Removed:** Oxlint (it duplicates ESLint), the Vue devtools plugin, `npm-run-all2`, and for now
  jsdom/test-utils.
- **Kept:** ESLint (flat config) for code quality and Prettier for formatting.

### D2 Map: MapLibre GL JS with the swisstopo vector base map

- swisstopo publishes MapLibre-ready style JSON with open CORS. Rendering is WebGL vector, and
  `fill-extrusion` covers the 3D stretch goal.
- **OpenLayers** handles LV95 natively, but looks less modern and offers nothing the MVP needs.
- **CesiumJS** is heavy. Reconsider it only for a true terrain-3D view.
- MapLibre 6 computes its worker URL at runtime, and that breaks after bundling. The worker is
  imported with `?url` and passed to `setWorkerUrl()`.

### D3 Border gap in the base map: offer aerial imagery

The swisstopo vector map is empty outside Switzerland from zoom ~10, but SWISSIMAGE covers the
EuroAirport and the border area. The app offers a "Map / Aerial" switch. An OSM-based underlay
(e.g. OpenFreeMap) is deferred to the cross-border stretch goal.

### D4 Geometry: analyse in LV95 metres (proj4), Turf only for polygon operations

The geo.admin height and profile APIs accept LV95/LV03 only, so proj4 is needed anyway. In LV95
the corridor is simple to build and explain: a straight line plus a buffer in metres. Turf modules
(`intersect`, `boolean-intersects`) do the planar polygon operations. The map displays WGS84.
_To be implemented in Phase 2._

### D5 Zone data pipeline

| Topic       | Decision                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Source      | FOCA ED-269 JSON (`*_4326.json`), found through the STAC catalogue rather than a hard-coded file URL.       |
| Region      | Zones whose bounding box touches the region are kept _whole_, not clipped, so shapes stay correct.          |
| Volumes     | One GeoJSON feature per zone volume, with flat properties (`src/types/zone.ts`) that MapLibre can style on. |
| Units       | Limits in metres. `99999` is stored as `null` ("unlimited"). Feet are converted. AGL/AMSL are kept.         |
| Size        | Simplified with a ~1 m tolerance and coordinates rounded to 6 decimals: 507 KB, 98 KB gzipped.              |
| Determinism | Output is deterministic (sorted, one feature per line), so git diffs show real changes only.                |
| Validation  | The script fails loudly on unknown units, references, geometry types or a non-ED-269 source.                |

### D6 Zone categories for colours and grouping

The source has the same `type` and `restriction` value for every zone. Categories are therefore
derived from `reason`:

- `nature`
- `sensitive`
- `aerodrome` (air traffic)
- `ctr` (air traffic, identifier starts with `CTR`; usually starts at 120 m AGL)
- `other` (fallback)

### D7 Data refresh: daily GitHub Action, commit on change

The Action is more transparent than Vercel Cron, because the git history shows every data change
and the push triggers a redeploy. It runs daily because FOCA publishes temporary zones at short
notice. The UI shows the FOCA export date as "data as of".

### D8 Cross-border handling in the MVP: warn, do not analyse

The Swiss data stops at the border. When a corridor leaves Switzerland, the result must say that
zones abroad were not checked. German data (dipul, CC BY-ND 4.0, no derivatives) and French data
(raster only) are stretch goals.

### D9 Routing: OpenRouteService behind a Vercel Function

- The API key stays on the server.
- The function accepts **location IDs from the curated list only**, not free coordinates. That
  makes it abuse-resistant and cacheable.
- A small provider interface allows a traffic-aware provider later (Mapbox or TomTom).
- Google Routes is excluded, because its results may only be shown on a Google map.

### D10 Default assumptions (shown as assumptions, adjustable in the UI)

| Parameter       | Default   | Note                                                                       |
| --------------- | --------- | -------------------------------------------------------------------------- |
| Flight altitude | 100 m AGL | Below the CTR floor of 120 m AGL                                           |
| Cruise speed    | 60 km/h   |                                                                            |
| Corridor width  | 100 m     | 50 m on each side of the direct line                                       |
| Drone mass      | > 250 g   | Many zone conditions apply only above 250 g; lab-sample drones are heavier |

### D11 Result states instead of a plain red/green

Most Basel corridors touch the EuroAirport zone (`LFSB001`, authority: French DGAC). The result
therefore uses these states:

- no zone touched
- passes below a zone's lower limit (e.g. below the CTR)
- authorisation needed, listing each competent authority

### D12 Locations

- **Hospitals in Basel-Stadt:** cantonal open data (Opendata BY, with coordinates).
- **Bruderholz and Liestal (BL):** geocoded via geo.admin search.
- **BAG hospital key figures:** reference only, because the data has no coordinates and the
  license is BY-ASK.
- **Labs:** curated manually.

Every entry documents its source.

### D13 Tests

- Vitest, with tests next to the code (`*.test.ts`).
- Tests run in the Node environment, because the tested code is plain logic.
- CI runs lint, format check, type check, tests and build on every push and pull request.

### D14 Hosting

Vercel Hobby for personal, non-commercial use, with the domain `basilink.ch`. Registration is
pending; the domain looked unregistered on 2026-11-23.
