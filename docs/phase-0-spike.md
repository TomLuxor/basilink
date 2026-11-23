# Phase 0 – Technical spike

Date: 2026-11-23. All findings below were verified with live requests on that date unless marked
_(unverified)_. No application code was written in this phase.

## TL;DR

| Topic                    | Status                  | Key point                                                                                                              |
| ------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| BAZL UAS zones           | ✅ works                | Static download via STAC, Opendata BY. Format is **ED-269 v1.0**, not ED-318. Data is **clipped at the Swiss border**. |
| Vertical limits          | ✅ clear                | Metres; Basel zones are all **AGL**. AMSL only occurs in Geneva. `99999` = unlimited.                                  |
| Height API               | ✅ works                | **LV95/LV03 only**, no WGS84. Covers some km beyond the border. Not needed for current Basel zones.                    |
| swisstopo vector basemap | ⚠️ works with a gap     | MapLibre style JSON, CORS open. **Blank beyond the border from zoom ~10.** Aerial imagery covers the EuroAirport.      |
| Routing (ORS)            | ✅ feasible             | Free key, ~2,000 directions/day. Needs server-side proxy.                                                              |
| Traffic-aware routing    | 🔍 options              | Mapbox (100k/month free), TomTom (~2,500/day free), Google (5k/month free, **not allowed on non-Google maps**).        |
| DE drone zones           | ✅ data exists          | dipul WFS/WMS, GeoJSON output, but **CC BY-ND 4.0** (no derivatives) and limits in **ft MSL**.                         |
| FR drone zones           | ⚠️ raster only          | Géoportail WMS (open category). SIA has an ED-269 dataset, download path unverified.                                   |
| Hospitals                | ✅ better than expected | Basel-Stadt publishes hospitals as GeoJSON points (Opendata BY). BAG data has no coordinates and is BY-ASK.            |

**Domain insight for the demo:** 8 of 13 Basel-Stadt hospitals lie inside zone `LFSB001` (EuroAirport
aerodrome zone, drones > 250 g prohibited at any height). All 13 lie inside `CTR0016` (CTR BALE,
drones > 250 g prohibited above 120 m AGL). The competent authority for both is the **French DGAC**
(ATC unit Bâle-Mulhouse). Most city corridors will therefore be "authorisation required", and the
answer to "who do I ask?" is a French authority. That is a realistic and explainable demo story.

---

## 1. BAZL drone restriction zones

### Access

- Layer ID: `ch.bazl.einschraenkungen-drohnen` (found via `api3.geo.admin.ch/rest/services/api/SearchServer?type=layers`).
- STAC collection: `https://data.geo.admin.ch/api/stac/v1/collections/ch.bazl.einschraenkungen-drohnen`
- One item (`einschraenkungen-drohnen`) with these assets:
  - `…_4326.geojson`: GeoJSON, flattened properties, 13.9 MB
  - `…_4326.json`: **ED-269 exchange format** ("Swiss UAS Geozones according to ED-269 - format version 1.0"), 18 MB
  - `…_2056.json`, `.gpkg`, `.shp.zip`, `.xtf.zip` (LV95 variants)
- Base URL: `https://data.geo.admin.ch/ch.bazl.einschraenkungen-drohnen/einschraenkungen-drohnen/`
- Served via CloudFront with `ETag` and `Last-Modified` headers, so change detection is cheap.
- Recommendation: resolve the asset URL through STAC in the data script. Do not hard-code file URLs.

### Data model

- **ED-269, not ED-318.** No ED-318 variant exists on STAC or the BAZL page. The two standards are
  structurally similar. A small mapping step in the data script isolates the app from the format.
- 1,288 zones nationwide. **`type` is always `COMMON` and `restriction` is always `REQ_AUTHORISATION`**,
  so neither field can drive colouring.
- Useful discriminators:
  - `reason`: `NATURE` (820), `SENSITIVE` (288), `AIR_TRAFFIC` (180)
  - Identifier prefix: `CTR…`, `LS…`/`LF…` aerodromes, `BLns…`/`BLwr…` (cantonal BL), `SVA…` (substations), and so on
  - BAZL's own colours embedded in the GeoJSON: NATURE `#ffaa00`, SENSITIVE `#0041be`, AIR_TRAFFIC
    `#900050` (aerodrome zone/CTR) and `#b11313` (aerodrome perimeter)
- Restriction semantics are in free text, `restrictionConditions`. Example: "The operation of unmanned
  aircraft weighing more than 250 g is prohibited from an altitude of 120 m above ground." Weight
  thresholds are therefore not machine-readable and need an explicit assumption (drone > 250 g).
- Authority contact (`authorityName`, `service`, `email`, `phone`, `siteURL`) is included and useful
  for the result panel.
- Temporary zones: 37 nationwide (`permanent: NO` with `startDateTime`/`endDateTime`), none in the
  Basel bbox today.
- ED-269 features can have several volumes (`geometry[]`, up to 63). Today every multi-volume feature
  uses identical limits for all its volumes, and none are in Basel.

### Vertical limits

| Lower–upper                        | Ref      | Count (CH)                         |
| ---------------------------------- | -------- | ---------------------------------- |
| 0 – 99999 m                        | AGL/AGL  | 899                                |
| 0 – 99999 m                        | AGL/AMSL | 138 volumes (70 zones, all Geneva) |
| 0 – 200 / 150 / 120 / 300 / 2000 m | AGL/AGL  | 304                                |
| 120 – 99999 m                      | AGL/AGL  | 18 (CTRs)                          |
| 60 – 99999 m                       | AGL/AGL  | 1                                  |

- `uomDimensions` is always `M`. `99999` is a sentinel for "unlimited".
- **Basel region: all limits are AGL.** The flight altitude parameter (AGL) can therefore be compared
  directly, and no terrain lookup is needed for the current data.
- The AMSL branch should still exist and be unit-tested, for Geneva-type data and German CTRs in ft MSL.

### Basel region (bbox 7.45, 47.42 – 7.82, 47.65)

282 zones in total:

- 267 NATURE: cantonal BL zones `BLns` 181 and `BLwr` 86
- 11 SENSITIVE: 8 prisons/justice facilities, 3 substations, mostly 0–150/200 m AGL
- 4 AIR_TRAFFIC:
  - `LFSB001` LFSB Basel-Mulhouse, 0 – unlimited AGL, authority DGAC
  - `CTR0016` CTR BALE, **120 m** – unlimited AGL, authority DGAC
  - `LSPD001` LSPD Dittingen (aerodrome zone)
  - `LSPD002` LSPD Dittingen (aerodrome perimeter)

**EuroAirport coverage:** the data is clipped at the Swiss border. Point tests on the EuroAirport
runway, the terminal (FR) and Weil am Rhein (DE) return **no zone**. `LFSB001` and `CTR0016` only
contain their Swiss parts. A corridor that leaves Swiss territory would look "clear" there, which is
wrong. The MVP must flag "corridor leaves Switzerland: zones abroad not checked".

### Size

The Basel subset with slim properties and coordinates rounded to 5 decimals (~1 m) is ~890 KB raw and
**~160 KB gzipped**, before any simplification. Shipping it as a static file is clearly fine.

### Update rhythm

- ISO metadata (geocat `c3ebd7ba-0fd5-411a-9074-3d0cdc46bc4d`): `maintenanceFrequency = asNeeded`.
- Observed: STAC `updated` 2026-11-20. Short-notice temporary zones exist, for example
  `OS_142 LSMO Locarno` from 2026-11-30 to 2026-12-04.
- Recommendation: a **daily** GitHub Action that compares `ETag`/hash and commits only on change.
  Show the ED-269 export timestamp ("created on …") as "data as of" in the UI.

### License

**Opendata BY**: free use including commercial, source attribution mandatory ("Source: FOCA / BAZL").
STAC lists `license: proprietary`, but links to the opendata.swiss BY terms, and geocat confirms BY.

### Related BAZL datasets worth knowing

- `ch.bazl.spitallandeplaetze` (hospital helipads): 4 in the region, Universitätsspital, Bruderholz,
  Liestal and Rehab Basel. BAZL lists hospital heliports as "areas with heightened risk of collision".
  They are not restriction zones, but are relevant information for hospital-to-hospital corridors.
- `ch.bazl.uas-aktivitaetszonen` (UAS Awareness Zones): authorised BVLOS operations, for information only.
- DABS (Daily Airspace Bulletin Switzerland): temporary NOTAM-based restrictions. It is **not** in the
  dataset and must be named in the disclaimer.

## 2. geo.admin API (height, profile, search)

- Height: `https://api3.geo.admin.ch/rest/services/height?easting=…&northing=…&sr=2056` returns `{"height":"268.1"}`.
- Profile: `https://api3.geo.admin.ch/rest/services/profile.json?geom=<LineString>&sr=2056&nb_points=N`
  returns `[{alts:{COMB,DTM2,DTM25}, dist, easting, northing}]`.
- **Both reject `sr=4326`** ("valid number for the spatial reference system model: 21781, 2056"),
  so proj4 is needed for LV95 conversion in any case.
- Both return values for points a few km into FR/DE (Saint-Louis, Weil am Rhein, Mulhouse).
- Search: `SearchServer?type=locations&sr=4326` geocodes hospitals, e.g. "Universitätsspital Basel"
  returns lat/lon.
- CORS is `*` on all endpoints. No key or registration is required.
- Terms (FSDI general terms): free of charge under fair use. A web app with an average of up to
  20,000 users per day counts as fair use. Attribution is required ("© Data: swisstopo").

## 3. swisstopo vector basemap in MapLibre

Verified style URLs (HTTP 200, CORS `*`, style spec v8):

- `https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json` (light; recommended for overlays)
- `https://vectortiles.geo.admin.ch/styles/ch.swisstopo.basemap.vt/style.json` (colour; uses a sprite _array_, which MapLibre ≥ 3 supports)
- `https://vectortiles.geo.admin.ch/styles/ch.swisstopo.imagerybasemap.vt/style.json` (SWISSIMAGE + vector labels)
- `ch.swisstopo.leichte-basiskarte.vt` also resolves. `lightbasemap-winter` returns 404.

Sources are `ch.swisstopo.base.vt` and `ch.swisstopo.relief.vt` (v1.0.0, zoom 0–14, bounds 3.57,
44.18 – 13.66, 48.88). TileJSON attribution is "© swisstopo".

**Gap beyond the border.** Tile content per zoom level:

| Zoom | Alsace (FR)              | EuroAirport  | Basel (CH)     |
| ---- | ------------------------ | ------------ | -------------- |
| ≤ 9  | roads, water, places     | —            | full           |
| 10   | empty                    | coarse       | full           |
| 12   | empty                    | 1 road layer | full           |
| 14   | empty (admin layer only) | empty        | full (~250 KB) |

At street zoom the EuroAirport, Saint-Louis and Weil am Rhein render as blank background.
**SWISSIMAGE does cover them** (visually checked: the EuroAirport terminal is visible). Options:

1. Light basemap plus a "Aerial" toggle to the imagery style. Zero extra dependencies. **Recommended for the MVP.**
2. Add an OSM-based underlay for areas outside Switzerland, e.g. OpenFreeMap
   (`tiles.openfreemap.org`, no key, OpenMapTiles schema, attribution OpenFreeMap/OpenMapTiles/OSM).
   Better cartography abroad, but two styles have to be merged. Better suited to the cross-border stretch goal.

3D (stretch goal): MapLibre `fill-extrusion` can draw AGL volumes over flat ground. I found no
MapLibre-compatible terrain-RGB from swisstopo (one guessed path returned 404). Cesium quantized-mesh
terrain exists (`3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/layer.json`, HTTP 200). Flat extrusion is
acceptable for AGL volumes in Basel.

## 4. Routing

### OpenRouteService (driving-car)

- `api.openrouteservice.org/v2/directions/driving-car` returns `401 Authorization field missing`
  without a key. A free account and API key are needed.
- Standard (free) plan, per the openrouteservice.org/plans page (JS-rendered; figures from the page
  snippet, to confirm in the dashboard): **Directions 2,000/day, 40/min**. Matrix 500/day.
- CORS is open, but the key must not ship to the browser, so it goes behind a Vercel Function proxy.
- Design idea: the proxy accepts only **location IDs from the curated list**, not arbitrary
  coordinates. That makes it abuse-resistant and cacheable, because the number of pairs is small and fixed.
- Attribution: openrouteservice / HeiGIT and © OpenStreetMap contributors _(exact wording to confirm)_.
- ORS durations come from speed profiles and do **not** account for traffic.

### Traffic-aware alternatives (for the adapter layer later)

| Provider                                | Free tier                                                            | Paid            | Display constraint                                                                     |
| --------------------------------------- | -------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| Mapbox Directions `driving-traffic`     | 100,000 req/month (verified on mapbox.com/pricing)                   | $2.00 / 1,000   | _Unverified_. Check the Product Terms for map-pairing rules.                           |
| TomTom Routing                          | ~2,500 non-tile req/day (TomTom store page; sources partly conflict) | pay-as-you-grow | _Unverified_                                                                           |
| Google Routes API (Pro = traffic-aware) | 5,000/month                                                          | $10 / 1,000     | **Results shown on a map must be on a Google Map.** Excluded with a swisstopo basemap. |
| HERE                                    | not checked                                                          | —               | —                                                                                      |

Recommendation: start with ORS. Keep a `RoutingProvider` interface (`getRoute(from, to, departAt?)`)
so that Mapbox or TomTom can be added for the "rush hour vs. night" stretch goal.

## 5. German and French drone zones (research only)

### Germany: dipul (BMDV / DFS)

- WMS and WFS: `https://uas-betrieb.de/geoservices/dipul/{wms|wfs}`. WFS 2.0 supports `application/json` output.
- Request one feature type per call. Combining types with `BBOX` fails with HTTP 400.
- 31 feature types, including `kontrollzonen`, `flugplaetze`, `krankenhaeuser`, `labore`,
  `naturschutzgebiete`, `wohngrundstuecke` and `temporaere_betriebseinschraenkungen`.
- Near Basel (Weil/Lörrach/Grenzach) the counts are:
  - 3 CTR parts, "Basel Eastern/Northern/Southern Part (CTR)", **0–1000 ft MSL**
  - 2 aerodromes, including the Lörrach hospital helipad
  - 3 hospitals, 12 nature reserves, 14 residential zones
- License: **CC BY-ND 4.0** ("keine Bearbeitungen"), attribution "dipul, CC-BY-ND 4.0". Clipping or
  simplifying the data and redistributing it as a static file is likely not allowed. Live WMS display
  or live WFS queries of unmodified data are the safer route _(not legal advice)_.
- The vertical model differs from Switzerland: ft MSL for CTRs, m AGL elsewhere.

### France: DGAC / SIA / Géoplateforme

- Géoplateforme WMS layer `TRANSPORTS.DRONES.RESTRICTIONS` ("Restrictions UAS catégorie Ouverte et
  Aéromodélisme", edition June 2026, attribution DGAC). It is **raster only** (no WFS layer found), covers
  the open/recreational category and excludes temporary restrictions.
- SIA publishes an ED-269 "zones géographiques UAS" dataset (user guide v2024-05-27). The download
  path and license are **unverified**. A community project (github.com/thomasdubdub/france-uas-geographical-zones)
  converts it to GeoJSON.
- The Swiss dataset already contains the Swiss parts of LFSB/CTR BALE, with the DGAC as authority.

## 6. Locations (hospitals, labs)

- **Basel-Stadt "Spitäler"** (opendata.swiss `spitaler`, Opendata BY):
  `https://api.geo.bs.ch/stac/v1/download/SPTL/latest/geojson` returns a ZIP containing `spital.geojson`.
  It has 13 points in CRS84 with name, category, emergency department flag and address.
- Basel-Landschaft hospitals (Bruderholz, Liestal) are not in that file. Use geo.admin search or BAZL
  helipad coordinates, and document the source per entry.
- BAG "Kennzahlen der Schweizer Spitäler" (2024: XLSX) has **no coordinates** and is licensed
  **BY-ASK** (commercial use needs permission). Use it as a reference for names and types only.
- Labs: no open dataset researched yet. They will be curated manually with a source per entry in Phase 2.

## 7. Recommended stack

| Area           | Choice                                                                         | Why                                                                                                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Language/build | TypeScript strict, Vite, ESLint (flat config) + Prettier                       | As proposed; standard and fast.                                                                                                                                                                                                                                                            |
| UI framework   | Vue 3, `<script setup>`                                                        | Readable single-file components, easy to explain. No reason to deviate.                                                                                                                                                                                                                    |
| Map            | **MapLibre GL JS**                                                             | swisstopo ships MapLibre-ready styles (verified). WebGL vector rendering. `fill-extrusion` covers the 3D stretch goal. OpenLayers would handle LV95 natively, but the look is less modern and that is not needed. Cesium only if a true terrain-3D stretch is wanted, because it is heavy. |
| Geometry       | **proj4 + small Turf modules** (`@turf/intersect`, `@turf/boolean-intersects`) | The height/profile API is LV95-only, so proj4 is required anyway. Analysis runs in LV95 metres: the corridor is a line plus a buffer, built as a simple "stadium" polygon in metres that is easy to whiteboard. Turf does the planar polygon ops. Display stays WGS84.                     |
| Styling        | Tailwind CSS                                                                   | Fast and consistent. Accessible controls use **native HTML** (radio groups, buttons, `<select>`) instead of a component library.                                                                                                                                                           |
| Data pipeline  | Node script (TypeScript) in `scripts/`                                         | STAC → ED-269 JSON → Basel bbox → one feature per volume → simplify/round → `public/data/zones-basel.geojson` + `meta.json`.                                                                                                                                                               |
| Data refresh   | GitHub Action, daily, commit on change                                         | Git history shows data changes. Vercel redeploys on push. More transparent than Vercel Cron.                                                                                                                                                                                               |
| Routing        | ORS behind a Vercel Function                                                   | Key stays server-side, location-ID allowlist, provider adapter.                                                                                                                                                                                                                            |
| Tests/CI       | Vitest; GitHub Actions: lint, typecheck (`vue-tsc`), test, build               | As proposed.                                                                                                                                                                                                                                                                               |
| Hosting        | Vercel Hobby                                                                   | Personal and non-commercial use fits _(Vercel terms not re-verified)_.                                                                                                                                                                                                                     |

## 8. Risks

1. **Border clipping.** Swiss zones stop at the border, so corridors into FR/DE are under-reported.
   Mitigation: detect when a corridor leaves Switzerland and warn. This needs a Swiss boundary polygon
   (swissBOUNDARIES3D, _availability to verify in Phase 1_).
2. **Blank basemap abroad at street zoom.** Mitigation: imagery toggle now, OSM underlay later.
3. **Almost every city pair is affected by LFSB001/CTR0016.** The traffic-light matrix would be
   mostly amber or red. Result categories must be meaningful: for example "no zone", "authorisation
   needed (n authorities)", and "below CTR floor" as a distinct state.
4. **Free-text restrictions.** Weight thresholds and conditions are not machine-readable, so an
   explicit assumption is needed (drone > 250 g) and the original text is shown.
5. **Temporary restrictions (DABS/NOTAM) are not covered.** This goes in the disclaimer. Temporary
   zones in the dataset need validity handling.
6. **Format drift (ED-269 → ED-318).** Isolated in the data script.
7. **Licensing abroad.** DE is BY-ND (no static redistribution). FR vector data is unverified.
8. **ORS quota (2,000/day).** Fine for a demo with a fixed pair list and caching. Abuse is prevented by the ID allowlist.

## 9. Decisions needed

See the conversation summary for the list with recommendations. They will be recorded in
`docs/decisions.md` once confirmed.

## Sources

- STAC: https://data.geo.admin.ch/api/stac/v1/collections/ch.bazl.einschraenkungen-drohnen
- geocat metadata: https://www.geocat.ch/geonetwork/srv/eng/catalog.search#/metadata/c3ebd7ba-0fd5-411a-9074-3d0cdc46bc4d
- BAZL page: https://www.bazl.admin.ch/en/geographical-flight-restrictions
- opendata.swiss terms: https://opendata.swiss/en/terms-of-use
- FSDI terms: https://www.geo.admin.ch/en/general-terms-of-use-fsdi
- swisstopo styles: https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json
- ORS plans: https://openrouteservice.org/plans/
- Mapbox pricing: https://www.mapbox.com/pricing
- Google Routes billing: https://developers.google.com/maps/documentation/routes/usage-and-billing
- Google Routes policies: https://developers.google.cn/maps/documentation/routes/policies
- TomTom pricing: https://developer.tomtom.com/pricing
- dipul WFS/WMS terms: https://dipul.de/homepage/de/informationen/geografische-gebiete/wfs-wms/
- Géoplateforme WMS: https://data.geopf.fr/wms-r/wms?SERVICE=WMS&REQUEST=GetCapabilities
- SIA UAS dataset guide: https://www.sia.aviation-civile.gouv.fr/pub/media/news/file/g/u/guide_utilisation_ds_uas_v2024-05-27.pdf
- Basel-Stadt hospitals: https://opendata.swiss/de/dataset/spitaler
- BAG hospital key figures 2024: https://opendata.swiss/de/dataset/kennzahlen-der-schweizer-spitaler-2024
