/**
 * Vercel Function: driving times with typical traffic for one ordered site pair (D29).
 *
 *   GET /api/drive-times?from=usb&to=viollier-allschwil
 *
 * MAPBOX_TOKEN is a Vercel environment variable. During `npm run dev`, vite.config.ts serves this
 * function and reads the token from .env.local. The logic and its tests are in src/server/.
 */
import { handleDriveTimes } from '../src/server/driveTimes.js'

export function GET(request: Request): Promise<Response> {
  return handleDriveTimes(new URL(request.url).searchParams, process.env.MAPBOX_TOKEN)
}
