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

_Superseded by D16 (GitHub Pages has no server functions)._

- The API key stays on the server.
- The function accepts **location IDs from the curated list only**, not free coordinates. That
  makes it abuse-resistant and cacheable.
- A small provider interface allows a traffic-aware provider later (Mapbox or TomTom).
- Google Routes is excluded, because its results may only be shown on a Google map.

### D10 Default assumptions (shown as assumptions, adjustable in the UI)

_Superseded by D17 (defaults derived from regulation and the SORA method)._

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

_Superseded by D15._

Vercel Hobby for personal, non-commercial use, with the domain `basilink.ch`. Registration is
pending; the domain looked unregistered on 2026-11-23.

## 2026-11-23 – Owner changes after Phase 1

### D15 Hosting: GitHub Pages, no custom domain for now

_Superseded by D21 (Vercel)._

- `.github/workflows/deploy.yml` builds and publishes on every push to `main`.
- The site lives under `/<repo>/`. `actions/configure-pages` provides that path, and the build
  reads it as `BASE_PATH`. With a custom domain it becomes empty again, without code changes.
- App code builds data URLs from `import.meta.env.BASE_URL`, never from `/`.
- A push made with `GITHUB_TOKEN` does not trigger other workflows. The zone update workflow
  therefore calls the deploy workflow itself after a data commit.
- One-time setup: Settings → Pages → Source: "GitHub Actions". The repository must be public on
  a free plan.

### D16 Driving routes are pre-computed, not fetched in the browser

GitHub Pages only serves static files, so there is no place to hide an API key at runtime. The
site list is fixed anyway (see D9), so:

- A Node script (`scripts/fetch-routes.ts`, Phase 2) asks OpenRouteService (`driving-car`) for
  every ordered pair of sites. It stays below 40 requests per minute and writes
  `public/data/routes.json` with geometry, distance, duration and date.
- The key lives in the GitHub secret `ORS_API_KEY`, and locally in `.env.local` (git-ignored).
  It never reaches the browser.
- The script runs on demand and monthly. Road networks change slowly.
- Gains: no key exposure, no quota abuse, instant results, and the demo works even if ORS is down.
- Cost: driving times exist only for listed sites, not for free points.
- The traffic-dependent stretch goal still fits: pre-compute per time slot with a provider that
  accepts a departure time.
- Attribution: "© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors".
- According to search results, ORS results are licensed CC BY 4.0. The terms page (now
  `account.heigit.org/info/tos`) could not be read automatically. _Open: the owner confirms the
  terms after logging in._

### D17 Defaults follow Swiss regulation and the SORA method

**Legal frame, checked on 2026-11-23:**

- Since 1 January 2023 Switzerland applies the EU drone regulation (EU) 2019/947 (FOCA).
- A lab-sample flight is BVLOS, so it falls in the **specific category** and needs an operational
  authorisation from FOCA (STS, PDRA or SORA). Basilink never replaces that authorisation.
- The open category and the standard scenarios are limited to **120 m above ground** (FOCA).
- In Basel, CTR BALE prohibits drones > 250 g **from 120 m AGL**. Zone LFSB001 prohibits them at
  any height (zone data).
- Since 1 April 2026 FOCA accepts new SORA applications only under **SORA 2.5**.

**Method:** JARUS SORA 2.5 Annex A (JAR_doc_26, 13.05.2024), section A.5.2. These are the
standard values and formulas for the contingency volume and the ground risk buffer of a
multirotor. JARUS calls them illustrative, and an operator may replace them with evidence.

| Quantity                 | Formula (A.5.2)                                          | Standard values                                |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------- |
| Horizontal contingency   | S_CV = S_GNSS + S_Pos + S_K + V0·t_R + V0² / (2·g·tan θ) | S_GNSS 3 m, S_Pos 3 m, S_K 1 m, t_R 1 s, θ 45° |
| Vertical contingency     | H_CV = H_FG + H_AM + 0.7·V0·t_R + V0² / (2·g)            | H_AM 1 m (barometric)                          |
| Ground risk buffer (1:1) | S_GRB = H_CV + CD/2                                      | —                                              |
| Flight geography width   | S_FG ≥ 3·CD                                              | —                                              |

**Reference aircraft:** Matternet M3. Matternet drones were used for the Swiss Post lab-sample
flights between hospitals. Primary source: matternet.com/our-system-aircraft.

- Cruise speed 72 km/h (20 m/s)
- MTOW 21 kg
- Max operating altitude 121 m (400 ft)
- The characteristic dimension (CD) is not published, so the JARUS example value of 1.5 m is used.

**Defaults that follow from this (V0 = 20 m/s):**

| Parameter                       | Default                                   | Derivation                                                                                                 |
| ------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Cruise speed V0                 | 72 km/h                                   | M3 cruise speed. Also used for the flight time.                                                            |
| Horizontal contingency S_CV     | 47.4 m                                    | 3 + 3 + 1 + 20 + 20.4                                                                                      |
| Vertical contingency            | H_FG + 35.4 m                             | 1 + 14 + 20.4                                                                                              |
| Flight altitude H_FG            | **80 m AGL**                              | Largest 5 m step that keeps H_CV ≤ 120 m AGL; H_CV = 115.4 m                                               |
| Operational volume (zone check) | ±49.6 m around the line; 0 to 115.4 m AGL | FG (3·CD = 4.5 m) + CV. Vertically from the ground, because take-off and landing pass through all heights. |
| Ground risk buffer              | 116.1 m beyond the CV                     | 1:1 rule. Shown for information; zones touched only by the GRB are reported as a note, not a conflict.     |
| Drone mass                      | 21 kg MTOW (> 250 g, < 25 kg)             | Zone conditions for > 250 g apply.                                                                         |
| Extra margin S_Add / H_Add      | 0 m                                       | The configurable buffer from the brief, as foreseen in the Annex A template.                               |

- The UI shows every value as an assumption, with its source.
- Users can change V0, H_FG, CD and the extra margins. The derived volumes update immediately.
- Flight time is the straight-line distance divided by V0. Take-off, climb, descent and handling
  are not included, and the UI says so.

## 2026-11-23 – Phase 2 (MVP)

### D18 Analysis rules

- **What is checked:** the operational volume (flight geography + contingency volume, D17) around
  the direct line. Vertically it reaches from the ground up to H_CV, because take-off and landing
  pass through every height.
- **Per zone:**

  | Result                  | When                                                                                               |
  | ----------------------- | -------------------------------------------------------------------------------------------------- |
  | Conflict                | Horizontal and vertical overlap. Touching a limit counts as overlap ("from 120 m" includes 120 m). |
  | Passes below / above    | Horizontal overlap, but no height overlap, e.g. below CTR BALE.                                    |
  | Ground risk buffer only | Only the ground risk buffer touches the zone. A note, not a conflict.                              |

- **Verdict:**
  - "exemption needed" if any zone conflicts
  - otherwise "no zone conflict", with any passed zones listed
- **Authorities:** the result lists every authority of a conflicting zone once, with contact details.
- **AMSL limits:** these need the terrain height. It comes from the geo.admin profile service
  (LV95 only), and only when such a zone is touched. The comparison is conservative: the corridor
  is as tall as possible, the zone as large as possible. Until the terrain is known, the zone
  counts as a conflict.
- **Border:** if any part of the operational volume lies outside Switzerland (swissBOUNDARIES3D,
  clipped to the map area), the result warns that zones abroad were not checked (D8).
- **Weight:** zone rules for drones above 250 g are assumed to apply (reference aircraft 21 kg).
  The restriction text is shown verbatim.
- **Temporary zones:** included and labelled with their validity period. The check does not filter
  by date.

### D19 Routing host and pairs

- Requests go to `api.heigit.org/openrouteservice/…`. According to the ORS FAQ, accounts moved to
  HeiGIT in 2025. A third-party guide (unverified) says `api.openrouteservice.org` will be retired.
- Routes are computed for every **ordered** pair, because one-way streets make A→B and B→A differ.
  17 sites give 272 requests, about 8 minutes at < 40 requests per minute.
- A geometry file is loaded only for the selected pair. All 272 files together are 152 KB gzipped.

### D20 Sites

- 13 hospitals from the Basel-Stadt open data set (all categories, because all send samples).
- KSBL Bruderholz and Liestal from the swisstopo gazetteer.
- Two labs, each verified on the company's own site:
  - Viollier laboratory centre, Allschwil (staffed 24/7)
  - Unilabs Basel (cytology and pathology)
- Positions of the labs come from the geo.admin address search.
- No open data set of medical labs was found.

## 2026-11-23 – Owner changes after Phase 2

### D21 Hosting: Vercel instead of GitHub Pages

Supersedes D15. The owner connected the repository to Vercel (Hobby plan).

- Vercel builds every push: `main` is the production site, every other branch gets a preview URL.
  It detects the Vite setup on its own (`npm run build`, output `dist/`), so there is no
  `vercel.json`.
- The site lives at the domain root. The `BASE_PATH` setting and the Pages workflow are gone.
  App code still builds its own URLs from `import.meta.env.BASE_URL`.
- There is still no server code, so D16 stands: routes stay pre-computed and Vercel needs no
  environment variables. A secret must never get the `VITE_` prefix, because Vite inlines such
  variables into the browser bundle.
- On the Hobby plan, "only the account owner can trigger deployments" (Vercel KB, "Why aren't
  commits triggering deployments"). Data commits by `github-actions[bot]` are therefore expected
  not to deploy. After a data commit, the update workflows call a Vercel deploy hook (repository
  secret `VERCEL_DEPLOY_HOOK_URL`). The hook builds the latest commit on `main`.
- The Vercel docs do not say whether a deploy hook skips the commit author check. _To verify at
  the first data commit by the bot._ Without the secret, the workflow only warns, and the new data
  goes live with the next deployment.
