/**
 * Travel-time helpers for the leave-by feature. Kept in sync with the backend
 * (services/token_engine.py): straight-line distance, padded for real roads,
 * over an assumed average speed.
 */

import { loadGoogleMaps } from './googleMaps.js'

export const AVG_SPEED_KMPH = 30
export const DETOUR_FACTOR = 1.3

/** Great-circle distance between two lat/lng points, in kilometres. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Estimated door-to-clinic travel time (minutes) from a straight-line distance.
 *  Clamped to [1, 1440] — the backend rejects anything over a day. */
export function travelMinutesFromKm(km) {
  const m = Math.round((km * DETOUR_FACTOR) / AVG_SPEED_KMPH * 60)
  return Math.min(1440, Math.max(1, m))
}

/** A coordinate is usable only if it's a finite number that isn't blank/null.
 *  Clinics with no stored location read back as null/'' -> Number() === 0,
 *  which would otherwise measure distance to the equator ("null island"). */
function validCoord(v) {
  if (v == null || v === '') return false
  return Number.isFinite(Number(v))
}

/** Travel minutes between an origin {lat,lng} and a clinic {latitude,longitude},
 *  or null when either point is unknown / unset. */
export function travelMinutesBetween(origin, clinic) {
  if (!origin || !clinic) return null
  const { lat, lng } = origin
  if (!validCoord(lat) || !validCoord(lng)) return null
  if (!validCoord(clinic.latitude) || !validCoord(clinic.longitude)) return null
  const oLat = Number(lat)
  const oLng = Number(lng)
  const cLat = Number(clinic.latitude)
  const cLng = Number(clinic.longitude)
  // Exact (0,0) on either side means "no location set", not a real place.
  if ((oLat === 0 && oLng === 0) || (cLat === 0 && cLng === 0)) return null
  return travelMinutesFromKm(haversineKm(oLat, oLng, cLat, cLng))
}

/**
 * Real road travel time (minutes) via Google Distance Matrix when a key is set,
 * else the straight-line haversine estimate. Always async; returns null if
 * either point is unknown.
 */
export async function roadTravelMinutes(origin, clinic) {
  const fallback = travelMinutesBetween(origin, clinic)
  if (fallback == null) return null
  const oLat = Number(origin.lat), oLng = Number(origin.lng)
  const cLat = Number(clinic.latitude), cLng = Number(clinic.longitude)
  const google = await loadGoogleMaps().catch(() => null)
  if (!google) return fallback
  try {
    const svc = new google.maps.DistanceMatrixService()
    const resp = await new Promise((resolve, reject) => {
      svc.getDistanceMatrix(
        {
          origins: [{ lat: oLat, lng: oLng }],
          destinations: [{ lat: cLat, lng: cLng }],
          travelMode: google.maps.TravelMode.DRIVING,
          // departureTime=now makes Google return live-traffic duration.
          drivingOptions: { departureTime: new Date(), trafficModel: google.maps.TrafficModel.BEST_GUESS },
        },
        (r, status) => (status === 'OK' ? resolve(r) : reject(new Error(status))),
      )
    })
    const el = resp?.rows?.[0]?.elements?.[0]
    // Prefer duration_in_traffic (live traffic) when available, else base road time.
    const dur = el?.duration_in_traffic || el?.duration
    if (el?.status === 'OK' && dur) {
      return Math.min(1440, Math.max(1, Math.round(dur.value / 60)))
    }
  } catch {
    /* quota / network / no route → fall back */
  }
  return fallback
}

/**
 * Turn a postal address into {lat, lng} using OpenStreetMap's free Nominatim
 * geocoder (no API key). Returns null if the address can't be resolved; throws
 * only if the service itself is unreachable. Defaults the country to India.
 */
export async function geocodeAddress({ address, city, state, pincode, country = 'India' } = {}) {
  const p = (s) => (s == null ? '' : String(s).trim())
  const A = p(address), C = p(city), S = p(state), P = p(pincode), K = p(country) || 'India'

  // Prefer Google Geocoding when a key is configured (better Indian coverage).
  const google = await loadGoogleMaps().catch(() => null)
  if (google) {
    const q = [A, C, S, P, K].filter(Boolean).join(', ')
    if (q) {
      try {
        const { results } = await new google.maps.Geocoder().geocode({ address: q, region: 'in' })
        if (results?.[0]) {
          const loc = results[0].geometry.location
          return { lat: loc.lat(), lng: loc.lng(), label: results[0].formatted_address }
        }
      } catch {
        /* fall through to Nominatim */
      }
    }
  }

  // Try the most specific query first, then fall back to coarser ones. A full
  // Indian street address often won't match OSM, but the city / pincode will —
  // and an area-level pin is still fine for travel-time estimates.
  const queries = [
    [A, C, S, P, K],
    [C, S, P, K],
    [P, C, K],
    [A, C, S, K],
    [C, S, K],
  ]
    .map((parts) => parts.filter(Boolean).join(', '))
    .filter((q, i, arr) => q && arr.indexOf(q) === i)
  if (queries.length === 0) return null

  for (const q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`
    let res
    try {
      res = await fetch(url, { headers: { Accept: 'application/json' } })
    } catch {
      throw new Error('Address lookup service is unreachable. Check your connection or enter coordinates.')
    }
    if (!res.ok) continue
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      const lat = Number(data[0].lat)
      const lng = Number(data[0].lon)
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    }
  }
  return null
}

/**
 * Free deep-link that opens the real Google Maps app/site with driving
 * directions (origin → destination). No API call / quota — just a URL handoff,
 * like Uber/Rapido's "Navigate". Accepts {lat,lng} or {latitude,longitude}.
 * Returns null if the destination has no usable coordinates.
 */
export function mapsDirectionsUrl(origin, dest) {
  const dLat = dest?.lat ?? dest?.latitude
  const dLng = dest?.lng ?? dest?.longitude
  if (dLat == null || dLng == null || (Number(dLat) === 0 && Number(dLng) === 0)) return null
  const d = `${dLat},${dLng}`
  const oLat = origin?.lat ?? origin?.latitude
  const oLng = origin?.lng ?? origin?.longitude
  if (oLat != null && oLng != null && !(Number(oLat) === 0 && Number(oLng) === 0)) {
    return `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${d}&travelmode=driving`
  }
  return `https://www.google.com/maps/search/?api=1&query=${d}`
}

/**
 * Promise wrapper around the browser Geolocation API.
 * Resolves to {lat, lng}; rejects with a friendly message.
 */
export function getCurrentPosition(options = { enableHighAccuracy: true, timeout: 10000 }) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not supported on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Enter the distance instead.'
            : 'Could not get your location. Enter the distance instead.'
        reject(new Error(msg))
      },
      options,
    )
  })
}
