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
- Use small, traceable commits, one branch per phase.
- Record important decisions briefly in `docs/decisions.md` (D1, D2 …).
- If a data source behaves unexpectedly or something is unclear, **stop and ask**. Do not guess.
- Accessibility target is WCAG 2.1 AA: full keyboard support, list view as an alternative to the map,
  and a result panel that makes sense without the map. Prefer native HTML controls.

## Current status

- Phase 0 (spike) is done; see `docs/phase-0-spike.md`.
- Phase 1 (setup) is merged into `main` (repo: github.com/TomLuxor/basilink).
- Phase 2 (MVP features 1–7) is done on branch `phase-2-mvp`. **Merging into `main` and starting
  Phase 3 wait for the owner's OK.**
- Hosting: Vercel Hobby, connected to the GitHub repo (D21). `main` is production, every other
  branch gets a preview URL. No environment variables on Vercel.
- The repo secrets `ORS_API_KEY` and `VERCEL_DEPLOY_HOOK_URL` are set (2026-11-23).
- Open owner tasks:
  - regenerate the ORS key around 2026-11-30 (it was shown once in a session log), then update
    `.env.local` and the repo secret
  - after the first data commit by `github-actions[bot]`, check that the deploy hook made it live
  - confirm the ORS terms
- `.env.local` holds `ORS_API_KEY=…`. Never print its content.

## Commands

| Command                | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start the dev server                                 |
| `npm run build`        | Type check and build                                 |
| `npm test`             | Run Vitest                                           |
| `npm run lint`         | ESLint                                               |
| `npm run format:check` | Prettier check                                       |
| `npm run typecheck`    | vue-tsc                                              |
| `npm run data:zones`   | Refresh `public/data/` from FOCA                     |
| `npm run data:routes`  | Driving routes via ORS (`-- --missing` to fill gaps) |
| `npm run data:border`  | Swiss border around Basel                            |

On Windows, run Vitest from a terminal whose path starts with an upper-case drive letter (`D:\`).
A lower-case `d:\` makes every test fail with "reading 'config'" (vitest#5251).

## Conventions

- `scripts/` runs with Node's built-in type stripping. Use erasable TypeScript only, and import local
  files with the `.ts` extension.
- `src/config/region.ts` and `src/types/zone.ts` are shared with `scripts/`. Keep them free of browser APIs.
- Tests live next to the code as `*.test.ts` and run in the Node environment.
- `public/data/` is generated. Never edit it by hand.
- Build URLs to own files from `import.meta.env.BASE_URL`, never from `/`.
- Secrets (e.g. `ORS_API_KEY`) are only used by scripts in GitHub Actions or from `.env.local`.
  Never ship them to the browser, and never give a secret the `VITE_` prefix (Vite inlines those
  into the bundle).
- Default parameters must follow regulation and the SORA 2.5 method (D17). Every number in the
  UI is labelled as an assumption and names its source.

## Key facts from the spike (details in docs/phase-0-spike.md)

- BAZL zones: STAC collection `ch.bazl.einschraenkungen-drohnen` on data.geo.admin.ch.
  - Format is ED-269 v1.0, not ED-318.
  - License is Opendata BY.
  - Data is clipped at the Swiss border.
- `type`/`restriction` are constant. Categories come from `reason`; see D6 in `docs/decisions.md`.
- Vertical limits are in metres, AGL in Basel. `99999` is stored as `null` (unlimited).
- geo.admin height/profile API accepts LV95/LV03 only, so proj4 is needed.
- swisstopo vector basemap is blank abroad from zoom ~10. The aerial switch covers the EuroAirport.
- MapLibre 6 needs its worker URL set explicitly. See `BaseMap.vue`.
- Driving routes come from OpenRouteService, pre-computed for all site pairs by a script in
  GitHub Actions and stored in `public/data/` (D16). The browser never calls ORS.
- Lab-sample flights are BVLOS, so they belong to the specific category and need a FOCA
  authorisation. Defaults: 72 km/h, 80 m AGL, operational volume ±49.6 m and 0–115.4 m AGL,
  following SORA 2.5 Annex A (D17).
