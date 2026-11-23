/**
 * App state in one place: loaded data, selected sites, flight parameters, and the corridor
 * analysis derived from them. Components only display this state or call the actions.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson'
import {
  analyseCorridor,
  checkCorridor,
  prepareArea,
  prepareZones,
  type PreparedZone,
} from '@/analysis/analyse'
import type { Lv95Polygon } from '@/analysis/lv95'
import { computeVolumes } from '@/analysis/sora'
import { trafficLight } from '@/analysis/trafficLight'
import type { TerrainRange } from '@/analysis/vertical'
import {
  DEFAULT_FLIGHT_PARAMETERS,
  sanitizeParameters,
  type FlightParameters,
} from '@/config/flight'
import type { DriveTimes } from '@/data/driveTimes'
import {
  loadDriveTimes,
  loadRouteGeometry,
  loadRouteIndex,
  loadSwitzerland,
  loadTerrainRange,
  loadZoneMeta,
  loadZones,
} from '@/data/load'
import { routeKey, type RouteIndex } from '@/data/routes'
import { SITES } from '@/data/sites'
import type { ZoneDataMeta, ZoneProperties } from '@/types/zone'

export function useCorridorCheck() {
  // --- Data, loaded once ---
  const zones = shallowRef<FeatureCollection<Polygon, ZoneProperties> | null>(null)
  const zoneMeta = shallowRef<ZoneDataMeta | null>(null)
  const routeIndex = shallowRef<RouteIndex | null>(null)
  const preparedZones = shallowRef<PreparedZone[] | null>(null)
  const switzerland = shallowRef<Lv95Polygon[] | undefined>(undefined)
  const loadError = ref<string | null>(null)

  async function load() {
    try {
      const [zoneData, meta, border, index] = await Promise.all([
        loadZones(),
        loadZoneMeta(),
        loadSwitzerland(),
        loadRouteIndex(),
      ])
      zones.value = zoneData
      zoneMeta.value = meta
      routeIndex.value = index
      preparedZones.value = prepareZones(zoneData.features)
      switzerland.value = prepareArea(border.geometry)
    } catch (error) {
      console.error(error)
      loadError.value = 'The zone data could not be loaded. Please reload the page.'
    }
  }
  void load()

  // --- Selection and parameters ---
  const fromId = ref<string | null>(null)
  const toId = ref<string | null>(null)
  const parameters = ref<FlightParameters>({ ...DEFAULT_FLIGHT_PARAMETERS })

  const from = computed(() => SITES.find((site) => site.id === fromId.value) ?? null)
  const to = computed(() => SITES.find((site) => site.id === toId.value) ?? null)
  const pairKey = computed(() =>
    from.value && to.value ? routeKey(from.value.id, to.value.id) : null,
  )
  const validParameters = computed(() => sanitizeParameters(parameters.value))
  const volumes = computed(() => computeVolumes(validParameters.value))

  /** Clicking on the map: first click sets the start, second the destination, third starts over. */
  function selectFromMap(id: string) {
    if (!fromId.value || (toId.value && id !== toId.value)) {
      fromId.value = id
      toId.value = null
    } else if (id !== fromId.value) {
      toId.value = id
    }
  }

  function setFrom(id: string | null) {
    if (id && id === toId.value) toId.value = null
    fromId.value = id
  }

  function setTo(id: string | null) {
    if (id && id === fromId.value) fromId.value = null
    toId.value = id
  }

  function swap() {
    ;[fromId.value, toId.value] = [toId.value, fromId.value]
  }

  /** From the pair matrix: sets start and destination at once. */
  function selectPair(from: string, to: string) {
    fromId.value = from
    toId.value = to
  }

  function resetParameters() {
    parameters.value = { ...DEFAULT_FLIGHT_PARAMETERS }
  }

  /**
   * Traffic light of every site pair for the matrix: `pairLights[i][j]` for SITES[i] and
   * SITES[j], j < i (the corridor is the same in both directions). It uses the current
   * parameters. Vue computes it only while the matrix reads it, in about 60 ms.
   */
  const pairLights = computed(() => {
    const zoneList = preparedZones.value
    if (!zoneList) return null
    return SITES.map((a, i) =>
      SITES.slice(0, i).map((b) =>
        trafficLight(
          checkCorridor({
            from: a.position,
            to: b.position,
            parameters: validParameters.value,
            zones: zoneList,
            switzerland: switzerland.value,
          }),
        ),
      ),
    )
  })

  // --- Terrain heights, fetched only when a zone has limits above sea level ---
  const terrain = shallowRef<{ key: string; range: TerrainRange } | null>(null)
  const terrainError = ref(false)

  // --- The analysis ---
  const analysis = computed(() => {
    if (!from.value || !to.value || !preparedZones.value) return null
    return analyseCorridor({
      from: from.value.position,
      to: to.value.position,
      parameters: validParameters.value,
      zones: preparedZones.value,
      switzerland: switzerland.value,
      terrain: terrain.value?.key === pairKey.value ? terrain.value.range : undefined,
    })
  })

  watch(analysis, async (result) => {
    const key = pairKey.value
    if (!result?.needsTerrain || !key) return
    terrainError.value = false
    try {
      const range = await loadTerrainRange(result.lineLv95)
      if (pairKey.value === key) terrain.value = { key, range }
    } catch (error) {
      console.error(error)
      terrainError.value = true
    }
  })

  // --- Driving route (pre-computed) ---
  const routeSummary = computed(() =>
    pairKey.value ? (routeIndex.value?.routes[pairKey.value] ?? null) : null,
  )
  const routeGeometry = shallowRef<Feature<LineString> | null>(null)

  watch([pairKey, routeIndex], async ([key]) => {
    routeGeometry.value = null
    if (!key || !routeSummary.value || !from.value || !to.value) return
    try {
      const geometry = await loadRouteGeometry(from.value.id, to.value.id)
      if (pairKey.value === key) routeGeometry.value = geometry
    } catch (error) {
      console.error(error)
    }
  })

  // --- Driving times with typical traffic: asked live, only while "By time of day" is open ---
  const trafficOpen = ref(false)
  /** Only the current pair is kept: Mapbox forbids storing its results (D29). */
  const trafficResult = shallowRef<{ key: string; times: DriveTimes } | null>(null)
  const driveTimesError = ref(false)
  const driveTimes = computed(() =>
    trafficResult.value?.key === pairKey.value ? trafficResult.value.times : null,
  )

  watch([pairKey, trafficOpen], async ([key, open]) => {
    if (!open || !key || !from.value || !to.value || trafficResult.value?.key === key) return
    trafficResult.value = null
    driveTimesError.value = false
    try {
      const times = await loadDriveTimes(from.value.id, to.value.id)
      if (pairKey.value === key) trafficResult.value = { key, times }
    } catch (error) {
      console.error(error)
      if (pairKey.value === key) driveTimesError.value = true
    }
  })

  return {
    sites: SITES,
    zones,
    zoneMeta,
    routeIndex,
    loadError,
    fromId,
    toId,
    from,
    to,
    parameters,
    volumes,
    analysis,
    terrainError,
    routeSummary,
    routeGeometry,
    trafficOpen,
    driveTimes,
    driveTimesError,
    pairLights,
    selectFromMap,
    selectPair,
    setFrom,
    setTo,
    swap,
    resetParameters,
  }
}
