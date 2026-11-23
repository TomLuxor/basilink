/**
 * Size of the operational volume and the ground risk buffer around a flight, following
 * JARUS SORA 2.5 Annex A (JAR_doc_26, 13.05.2024), section A.5.2.
 *
 * Case covered: multirotor, manual reaction, stopping as the contingency manoeuvre,
 * barometric altitude measurement and the simplified 1:1 rule for the ground risk buffer.
 * Variable names follow the symbols in the document so the code can be checked against it.
 *
 *   operational volume = flight geography (FG) + contingency volume (CV)
 *   ground risk buffer (GRB) = area on the ground around the operational volume
 */
import type { FlightParameters } from '@/config/flight'

/** Gravitational acceleration as used in the Annex A examples. */
const G = 9.81

/** Standard values from Annex A, A.5.2.3. An operator may replace them with evidence. */
export const SORA_STANDARD_VALUES = {
  /** S_GNSS: GNSS position error. */
  gnssErrorM: 3,
  /** S_Pos: position holding error. */
  positionHoldingErrorM: 3,
  /** S_K: map error. */
  mapErrorM: 1,
  /** t_R: reaction time for a manual reaction. */
  reactionTimeS: 1,
  /** Θ: maximum pitch angle of a multirotor while stopping. */
  maxPitchDeg: 45,
  /** H_AM: altitude measurement error with a barometric altimeter. */
  altitudeMeasurementErrorM: 1,
}

export interface FlightVolumes {
  /** V0 in m/s. */
  speedMs: number
  /** S_FG: width of the flight geography along a straight line (3 × CD). */
  flightGeographyWidthM: number
  /** S_CV: horizontal extent of the contingency volume, incl. the extra margin S_Add. */
  contingencyHorizontalM: number
  /** H_CV: top of the contingency volume above ground, incl. the extra margin H_Add. */
  contingencyTopM: number
  /** S_GRB: ground risk buffer beyond the contingency volume (1:1 rule). */
  groundRiskBufferM: number
  /** Half width of the operational volume around the direct line: S_FG / 2 + S_CV. */
  corridorHalfWidthM: number
}

export function computeVolumes(parameters: FlightParameters): FlightVolumes {
  const s = SORA_STANDARD_VALUES
  const v0 = parameters.cruiseSpeedKmh / 3.6
  const cd = parameters.characteristicDimensionM

  // Horizontal contingency: errors + reaction distance + stopping distance (multirotor).
  const reactionDistance = v0 * s.reactionTimeS // S_R
  const stoppingDistance = v0 ** 2 / (2 * G * Math.tan((s.maxPitchDeg * Math.PI) / 180)) // S_CM
  const contingencyHorizontalM =
    s.gnssErrorM +
    s.positionHoldingErrorM +
    s.mapErrorM +
    reactionDistance +
    stoppingDistance +
    parameters.extraHorizontalM

  // Vertical contingency: altitude error + climb during the reaction time + climb while
  // the forward kinetic energy turns into height (multirotor).
  const reactionHeight = v0 * 0.7 * s.reactionTimeS // H_R
  const manoeuvreHeight = v0 ** 2 / (2 * G) // H_CM
  const contingencyTopM =
    parameters.flightAltitudeM +
    s.altitudeMeasurementErrorM +
    reactionHeight +
    manoeuvreHeight +
    parameters.extraVerticalM

  const flightGeographyWidthM = 3 * cd
  return {
    speedMs: v0,
    flightGeographyWidthM,
    contingencyHorizontalM,
    contingencyTopM,
    groundRiskBufferM: contingencyTopM + cd / 2,
    corridorHalfWidthM: flightGeographyWidthM / 2 + contingencyHorizontalM,
  }
}
