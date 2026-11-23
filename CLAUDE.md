# Basilink – project context

Portfolio web app: **drone corridors for lab samples in the Basel region**. For a start/destination
pair (hospital ↔ lab, hospital ↔ hospital), check whether a straight drone corridor intersects the
official BAZL/FOCA UAS restriction zones, taking their vertical limits into account. Then compare the
estimated flight time with driving time on the road.

- Audience: logistics and operations managers in hospitals and labs.
- **Pre-check only.** It never replaces a BAZL/FOCA (or DGAC) authorisation, and the UI must say so clearly.
- Purpose: shown in job applications in Switzerland, including Solutions Engineering roles. The owner
  must be able to explain every part, so **prefer simple, readable code over clever code**. No
  unnecessary abstractions or libraries.

## Working rules

- Code, comments, README, docs and UI are in **English**.
- Work in phases and wait for the owner's OK between them:
  - Phase 0: spike
  - Phase 1: setup
  - Phase 2: MVP features 1–7
  - Phase 3: accessibility, responsive layout, tests, docs, deploy
- Use small, traceable commits.
- Record important decisions briefly in `docs/decisions.md`.
- If a data source behaves unexpectedly or something is unclear, **stop and ask**. Do not guess.
- Accessibility target is WCAG 2.1 AA: full keyboard support, list view as an alternative to the map,
  and a result panel that makes sense without the map.

## Current status

- Phase 0 (spike) is done. Findings are in `docs/phase-0-spike.md`.
- **Waiting for the owner's OK and decisions before Phase 1.**

## Key facts from the spike (details in docs/phase-0-spike.md)

- BAZL zones: STAC collection `ch.bazl.einschraenkungen-drohnen` on data.geo.admin.ch.
  - Format is ED-269 v1.0, not ED-318.
  - License is Opendata BY.
  - Data is clipped at the Swiss border.
- `type`/`restriction` are constant. Use `reason` (NATURE / SENSITIVE / AIR_TRAFFIC) for categories.
- Vertical limits are in metres, AGL in Basel, with `99999` meaning unlimited.
- geo.admin height/profile API accepts LV95/LV03 only, so proj4 is needed.
- swisstopo vector basemap is blank abroad from zoom ~10. SWISSIMAGE covers the EuroAirport.
- Routing uses OpenRouteService behind a Vercel Function. The API key stays server-side.
