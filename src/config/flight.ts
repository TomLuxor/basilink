/**
 * Flight parameters the user can change, and their defaults.
 * How the defaults were derived (Swiss regulation, JARUS SORA 2.5 Annex A, reference aircraft)
 * is documented in docs/decisions.md, D17. The UI labels every value as an assumption.
 */

export interface FlightParameters {
  /** Cruise speed in km/h. Used for the flight time and as V0 in the SORA formulas. */
  cruiseSpeedKmh: number
  /** Planned flight altitude above ground in metres (height of the flight geography, H_FG). */
  flightAltitudeM: number
  /** Largest dimension of the drone incl. rotors in metres (CD). */
  characteristicDimensionM: number
  /** Extra horizontal margin on top of the SORA contingency volume (S_Add). */
  extraHorizontalM: number
  /** Extra vertical margin on top of the SORA contingency volume (H_Add). */
  extraVerticalM: number
}

export const DEFAULT_FLIGHT_PARAMETERS: FlightParameters = {
  cruiseSpeedKmh: 72,
  flightAltitudeM: 80,
  characteristicDimensionM: 1.5,
  extraHorizontalM: 0,
  extraVerticalM: 0,
}

/** The drone the speed and mass assumptions are based on. */
export const REFERENCE_AIRCRAFT = {
  name: 'Matternet M3',
  cruiseSpeedKmh: 72,
  maxTakeOffMassKg: 21,
  url: 'https://www.matternet.com/our-system-aircraft',
}

/**
 * Height limit that matters in Basel: maximum height in the open category and the standard
 * scenarios, and the floor of the Basel control zone (CTR BALE) for drones above 250 g.
 */
export const HEIGHT_LIMIT_M = 120
