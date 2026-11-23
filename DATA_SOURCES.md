# Data sources

Every piece of data Basilink shows: where it comes from, under which terms, how it gets into the
app, and how fresh it is. Decisions behind these choices are in [docs/decisions.md](docs/decisions.md).

| Data                        | Provider                                 | Terms                             | In the app                     | Refresh                  |
| --------------------------- | ---------------------------------------- | --------------------------------- | ------------------------------ | ------------------------ |
| Drone restriction zones     | FOCA (BAZL)                              | Opendata BY                       | static file in `public/data`   | daily (GitHub Action)    |
| Base map and aerial imagery | swisstopo                                | FSDI general terms, attribution   | loaded live by the browser     | by swisstopo             |
| Swiss national border       | swisstopo swissBOUNDARIES3D              | free use, source must be provided | static file in `public/data`   | by hand (rarely changes) |
| Terrain heights             | swisstopo via geo.admin API              | FSDI general terms, attribution   | loaded live, only if needed    | by swisstopo             |
| Hospitals in Basel-Stadt    | Canton of Basel-Stadt                    | Opendata BY                       | curated in `src/data/sites.ts` | by hand                  |
| Other sites                 | swisstopo gazetteer, company websites    | facts (name, address, position)   | curated in `src/data/sites.ts` | by hand                  |
| Driving routes              | openrouteservice (HeiGIT), OpenStreetMap | ORS terms, OSM: ODbL              | static files in `public/data`  | monthly (GitHub Action)  |

All attributions also appear in the app: in the map's attribution line and in the "Data sources"
section of the panel.

## Drone restriction zones (FOCA)

- **What:** the official UAS geographical zones of Switzerland, published by the Federal Office of
  Civil Aviation (FOCA, German: BAZL).
- **Where:** STAC collection
  [`ch.bazl.einschraenkungen-drohnen`](https://data.geo.admin.ch/browser/index.html#/collections/ch.bazl.einschraenkungen-drohnen)
  on data.geo.admin.ch, file `einschraenkungen-drohnen_4326.json`. Background:
  [bazl.admin.ch](https://www.bazl.admin.ch/en/geographical-flight-restrictions).
- **Format:** ED-269 version 1.0 (not ED-318), WGS 84. Vertical limits are in metres, above ground
  (AGL) or above sea level (AMSL); `99999` means unlimited.
- **Terms:** [Opendata BY](https://opendata.swiss/en/terms-of-use#terms_by): free use, including
  commercial use; the source must be named ("Source: FOCA").
- **Processing:** `scripts/fetch-zones.ts` downloads the file, keeps every zone volume whose
  bounding box overlaps the region around Basel, stores one feature per volume, derives a category
  from the `reason` field (D6), drops outline detail below about 1 m, rounds coordinates to 6
  decimals and writes `public/data/zones-basel.geojson`. The
  export date of the file is stored in `public/data/zones-meta.json` and shown as "data as of".
- **Refresh:** `.github/workflows/update-zones.yml` runs daily. It commits only when FOCA published
  new data and only after the unit tests pass with it.
- **Limits:** the data set ends at the Swiss border. Zones in Germany and France are not included;
  the app warns when a corridor leaves Switzerland. Temporary restrictions published via DABS or
  NOTAM are not part of this data set.

## Base map and aerial imagery (swisstopo)

- **What:** the swisstopo light base map and the aerial imagery base map, as vector tile styles:
  - [`ch.swisstopo.lightbasemap.vt`](https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json)
  - [`ch.swisstopo.imagerybasemap.vt`](https://vectortiles.geo.admin.ch/styles/ch.swisstopo.imagerybasemap.vt/style.json)
- **Terms:** [FSDI general terms of use](https://www.geo.admin.ch/en/general-terms-of-use-fsdi):
  free of charge under fair use (a web app with up to 20,000 users per day on average); attribution
  "© swisstopo".
- **In the app:** the browser loads styles and tiles directly from geo.admin.ch. Nothing is stored
  in this repository. The light map is nearly blank abroad, so the aerial imagery is offered for
  the area around the EuroAirport (D3).

## Swiss national border (swisstopo swissBOUNDARIES3D)

- **What:** the national boundary of Switzerland, used to warn when a corridor leaves the country.
- **Where:** geo.admin API, layer `ch.swisstopo.swissboundaries3d-land-flaeche.fill`, feature `CH`.
  Metadata: [geocat](https://www.geocat.ch/geonetwork/srv/eng/catalog.search#/metadata/c5bd42e6-033f-4d43-a398-320b42538798).
- **Terms:** free use, the source must be provided.
- **Processing:** `scripts/fetch-border.ts` clips the boundary to the map area around Basel,
  simplifies it and writes `public/data/switzerland-basel.geojson`. Run it by hand
  (`npm run data:border`); national borders rarely change.

## Terrain heights (swisstopo, geo.admin profile service)

- **What:** the terrain height along the direct line, from
  `api3.geo.admin.ch/rest/services/profile.json` (LV95 coordinates only).
- **Terms:** FSDI general terms (see above); attribution "© swisstopo".
- **In the app:** requested by the browser only when a zone along the corridor has a limit above
  sea level. In the Basel region all zones are currently defined above ground, so the service is
  rarely called. If it fails, such zones count as conflicts and the result says so.

## Sites

Curated by hand in [`src/data/sites.ts`](src/data/sites.ts). Every site lists its source in the
app's site list (D20).

- **13 hospitals in Basel-Stadt:** Canton of Basel-Stadt, open data set
  ["Spitäler"](https://opendata.swiss/de/dataset/spitaler), Opendata BY.
- **Cantonal Hospital Baselland, Bruderholz and Liestal:** positions from the swisstopo gazetteer
  (geo.admin search API), FSDI terms.
- **Viollier laboratory centre, Allschwil:** name and address from
  [viollier.ch](https://www.viollier.ch/en/allschwil); position from the geo.admin address search.
- **Unilabs Basel:** name and address from the
  [Unilabs centre directory](https://center.unilabs.ch/en/basel-city/basel/unilabs-basel-1553);
  position from the geo.admin address search.

No open data set of medical laboratories was found. The federal hospital key figures (BAG) have
no coordinates and are licensed BY-ASK, so they are not used.

## Driving routes (openrouteservice)

- **What:** the fastest car route for every ordered pair of sites (17 sites, 272 routes), with
  distance, duration without traffic and the road geometry.
- **Where:** openrouteservice Directions API, profile `driving-car`, operated by HeiGIT
  (`api.heigit.org/openrouteservice`). The road network is OpenStreetMap.
- **Terms:** attribution "© openrouteservice.org by HeiGIT | Map data © OpenStreetMap
  contributors". OpenStreetMap data is licensed under the
  [ODbL](https://www.openstreetmap.org/copyright). The ORS terms of service
  (`account.heigit.org/info/tos`) need a login and are to be confirmed by the owner (D16).
- **Processing:** `scripts/fetch-routes.ts` requests every pair (below 40 requests per minute),
  simplifies each geometry by 2 m and writes `public/data/routes/index.json` plus one GeoJSON file
  per pair. The browser never calls openrouteservice, so no API key reaches it (D16, D19).
- **Refresh:** `.github/workflows/update-routes.yml` runs monthly with the repository secret
  `ORS_API_KEY`, and only commits after the unit tests pass with the new routes.

## Method references (no data imported)

- **Corridor dimensions:** JARUS, SORA 2.5 Annex A, section A.5.2
  ([PDF](http://jarus-rpas.org/wp-content/uploads/2024/06/SORA-v2.5-Annex-A-Release.JAR_doc_26-pdf.pdf);
  the site offers no HTTPS). FOCA applies SORA 2.5 to new applications (D17).
- **Reference aircraft:** Matternet M3, cruise speed and take-off mass from
  [matternet.com](https://matternet.com/our-system-aircraft).

## Not included, and why

- **German drone zones (dipul):** licensed CC BY-ND 4.0, which does not allow clipped or converted
  copies. Limits are in feet above sea level.
- **French drone zones:** no verified official vector source and licence yet.
- **DABS and NOTAM:** temporary restrictions are published daily and are not in the FOCA data set.
  The app's disclaimer says so.
