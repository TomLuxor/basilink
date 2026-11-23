/**
 * A traffic light per site pair, for the overview matrix. It rates the restriction zones only:
 * every flight beyond visual line of sight needs a FOCA authorisation anyway.
 */
import type { CorridorCheck } from './analyse'

export type TrafficLight =
  /** At least one zone needs an exemption. */
  | 'red'
  /** No zone conflict in Switzerland, but the corridor leaves the country. */
  | 'amber'
  /** No zone conflict, and the corridor stays in Switzerland. */
  | 'green'

export function trafficLight(
  check: Pick<CorridorCheck, 'verdict' | 'leavesSwitzerland'>,
): TrafficLight {
  if (check.verdict === 'authorisation-needed') return 'red'
  if (check.leavesSwitzerland) return 'amber'
  return 'green'
}
