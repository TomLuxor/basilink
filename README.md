# Basilink

**Drone corridors for lab samples in Basel.** Basilink is a pre-check tool for logistics and
operations teams in hospitals and labs. For a start and a destination, it checks whether a direct
drone corridor crosses official drone restriction zones published by the Federal Office of Civil
Aviation (FOCA/BAZL). It also compares the estimated flight time with the driving time.

> **Pre-check only.** Basilink does not replace an authorisation from FOCA or any other competent
> authority. Temporary restrictions (DABS/NOTAM) are not included.

Status: Phase 2 (MVP) is complete: corridor check, flight vs. road time, map and text results.
Phase 3 (accessibility review, responsive polish, docs, deployment) follows.

## How the check works

1. Pick a start and a destination: in the selects, in the site list, or by clicking two sites on
   the map.
2. Around the direct line, Basilink builds the **operational volume** that a drone could occupy.
   Its size follows the SORA 2.5 method used by FOCA. With the defaults it extends ±49.6 m around
   the line and up to 115.4 m above ground.
3. The volume is intersected with the FOCA restriction zones. The calculation runs in the Swiss
   grid LV95 (metres) and takes each zone's lower and upper limit into account.
4. The result lists every zone as one of:
   - **conflict**
   - **passes below**
   - **ground risk buffer only**

   It also names the authorities to contact, and warns if the corridor leaves Switzerland.

5. The flight time (direct line at cruise speed) is compared with a pre-computed driving route.

All assumptions can be changed in the panel. Their sources are documented in
[docs/decisions.md](docs/decisions.md) (D17, D18).

## Getting started

Requires Node.js 22.18+ or 24.12+.

```sh
npm install
npm run dev          # start the app on http://localhost:5173
```

| Command                | What it does                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run build`        | Type check and production build into `dist/`                                                          |
| `npm test`             | Unit tests (Vitest)                                                                                   |
| `npm run lint`         | ESLint                                                                                                |
| `npm run format:check` | Prettier                                                                                              |
| `npm run typecheck`    | vue-tsc                                                                                               |
| `npm run data:zones`   | Download the latest FOCA zones and rewrite `public/data/`                                             |
| `npm run data:routes`  | Compute driving routes for all site pairs (needs `ORS_API_KEY`; add `-- --missing` to fill gaps only) |
| `npm run data:border`  | Download the Swiss border around Basel (rarely needed)                                                |

## How the zone data gets into the app

`scripts/fetch-zones.ts` downloads the FOCA UAS zones in ED-269 format from
[data.geo.admin.ch](https://data.geo.admin.ch/browser/index.html#/collections/ch.bazl.einschraenkungen-drohnen).
It keeps the zones around Basel, simplifies them and writes a static GeoJSON file plus a metadata
file with the "data as of" date. A GitHub Action runs it every day and commits only when FOCA
published new data.

## Deployment

The app is a static site on GitHub Pages. `.github/workflows/deploy.yml` builds and publishes on
every push to `main`. One-time setup: repository Settings → Pages → Source: "GitHub Actions".

To build locally under a sub-path like on Pages:

```sh
BASE_PATH=/basilink npm run build && BASE_PATH=/basilink npx vite preview   # then open /basilink/
```

Driving routes are pre-computed with OpenRouteService, so no API key ever reaches the browser.
`.github/workflows/update-routes.yml` refreshes them monthly and needs the repository secret
`ORS_API_KEY`. For local runs, put `ORS_API_KEY=…` in `.env.local`, which is git-ignored.

## Project structure

```
scripts/           data preparation (runs in Node, no build step)
src/analysis/      the corridor check: LV95, SORA volumes, geometry, heights (unit-tested)
src/components/    Vue components
src/composables/   app state (useCorridorCheck)
src/config/        region, base maps, flight defaults, zone categories
src/data/          curated sites, route file names, data loading
src/map/           MapLibre overlay layers
src/types/         shared data types (also used by scripts/)
public/data/       generated data: zones, border, routes (do not edit by hand)
docs/              spike report and decision log
```

## Documentation

- [docs/phase-0-spike.md](docs/phase-0-spike.md): verified data sources, limits and risks
- [docs/decisions.md](docs/decisions.md): decisions and their reasons

## Troubleshooting

**Windows: every test fails with "Cannot read properties of undefined (reading 'config')".**
Your terminal reports the project path with a lower-case drive letter (`d:\…`). Vitest then loads
itself twice. Open the terminal in `D:\…` (upper case) and run the tests again. See
[vitest#5251](https://github.com/vitest-dev/vitest/issues/5251). CI is not affected.

## Data sources and licenses

Drone restriction zones: © FOCA (Opendata BY). Base map, imagery, border and terrain: © swisstopo.
Routes: © openrouteservice.org by HeiGIT, map data © OpenStreetMap contributors. A full
`DATA_SOURCES.md` follows in Phase 3.
