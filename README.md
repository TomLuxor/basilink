# Basilink

**Drone corridors for lab samples in Basel.** Basilink is a pre-check tool for logistics and
operations teams in hospitals and labs. For a start and a destination, it checks whether a direct
drone corridor crosses official drone restriction zones published by the Federal Office of Civil
Aviation (FOCA/BAZL). It also compares the estimated flight time with the driving time.

> **Pre-check only.** Basilink does not replace an authorisation from FOCA or any other competent
> authority. Temporary restrictions (DABS/NOTAM) are not included.

Status: Phase 1 (setup) is complete: base map, zone data pipeline and CI. The corridor analysis
follows in Phase 2.

## Getting started

Requires Node.js 22.18+ or 24.12+.

```sh
npm install
npm run dev          # start the app on http://localhost:5173
```

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run build`        | Type check and production build into `dist/`              |
| `npm test`             | Unit tests (Vitest)                                       |
| `npm run lint`         | ESLint                                                    |
| `npm run format:check` | Prettier                                                  |
| `npm run typecheck`    | vue-tsc                                                   |
| `npm run data:zones`   | Download the latest FOCA zones and rewrite `public/data/` |

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

Driving routes will be pre-computed with OpenRouteService in a GitHub Action, so no API key ever
reaches the browser. The key is stored as the repository secret `ORS_API_KEY`. For local runs,
put it in `.env.local`, which is git-ignored.

## Project structure

```
scripts/           data preparation (runs in Node, no build step)
src/components/    Vue components
src/config/        region and base map settings
src/types/         shared data types (also used by scripts/)
public/data/       generated zone data (do not edit by hand)
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

Drone restriction zones: © FOCA (Opendata BY). Base map and imagery: © swisstopo. A full
`DATA_SOURCES.md` follows in Phase 3.
