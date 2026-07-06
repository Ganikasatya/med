/**
 * Address search / autocomplete via Photon (photon.komoot.io) — free, no API
 * key, no billing. Used by <AddressAutocomplete> to suggest places as the user
 * types and resolve the pick to coordinates for the leave-by travel estimate.
 *
 * Complements lib/geo.js (OpenStreetMap Nominatim), which stays the one-shot
 * "resolve this exact address" fallback. Photon is tuned for type-ahead.
 */

import { loadGoogleMaps } from './googleMaps.js'

const PHOTON_URL = 'https://photon.komoot.io/api/'

/** Google Places predictions for `query` → [{label, placeId}] (coords resolved
 *  lazily on select via resolvePlaceCoords). Returns null to signal "use Photon". */
async function googlePredictions(query, { limit, lat, lng }) {
  const google = await loadGoogleMaps().catch(() => null)
  if (!google?.maps?.places) return null
  try {
    const svc = new google.maps.places.AutocompleteService()
    const req = { input: query, componentRestrictions: { country: 'in' } }
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      req.location = new google.maps.LatLng(Number(lat), Number(lng))
      req.radius = 50000
    }
    const preds = await new Promise((resolve) => {
      svc.getPlacePredictions(req, (p, status) => resolve(status === 'OK' && p ? p : []))
    })
    return preds.slice(0, limit).map((p) => ({ label: p.description, placeId: p.place_id, lat: null, lng: null }))
  } catch {
    return null
  }
}

/** Pull city/state/pincode/country out of a Google address_components array so
 *  forms can auto-fill the structured fields (not just the one-line address). */
function parseComponents(components = []) {
  const pick = (type) => components.find((c) => c.types?.includes(type))
  const city =
    pick('locality')?.long_name ||
    pick('administrative_area_level_2')?.long_name ||
    pick('postal_town')?.long_name ||
    ''
  return {
    city,
    state: pick('administrative_area_level_1')?.long_name || '',
    pincode: pick('postal_code')?.long_name || '',
    country: pick('country')?.long_name || '',
  }
}

/** Resolve a Google place_id to {lat, lng, city, state, pincode, country}
 *  (called when a prediction is picked). The structured fields are '' when
 *  Google doesn't return them; callers can ignore what they don't need. */
export async function resolvePlaceCoords(placeId) {
  const google = await loadGoogleMaps().catch(() => null)
  if (!google?.maps?.places || !placeId) return null
  try {
    const svc = new google.maps.places.PlacesService(document.createElement('div'))
    return await new Promise((resolve) => {
      svc.getDetails({ placeId, fields: ['geometry', 'address_components'] }, (place, status) => {
        const loc = place?.geometry?.location
        if (status !== 'OK' || !loc) return resolve(null)
        resolve({ lat: loc.lat(), lng: loc.lng(), ...parseComponents(place.address_components) })
      })
    })
  } catch {
    return null
  }
}

/** Build a human-readable one-line label from a Photon feature's properties. */
function formatLabel(p = {}) {
  const parts = [
    p.name,
    p.street && p.housenumber ? `${p.housenumber} ${p.street}` : p.street,
    p.district,
    p.city || p.town || p.village || p.county,
    p.state,
    p.postcode,
    p.country,
  ]
  // Drop blanks and collapse duplicates (e.g. name === city).
  const seen = new Set()
  return parts
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .join(', ')
}

/**
 * Search places matching `query`. Returns up to `limit` results as
 * `{ lat, lng, label }`. Empty array for short/blank queries or any error
 * (callers just show no suggestions). Pass `lat`/`lng` to bias results toward a
 * region (e.g. the clinic) so local matches rank first.
 */
export async function searchPlaces(query, { limit = 5, lat, lng, signal } = {}) {
  const q = (query || '').trim()
  if (q.length < 3) return []

  // Prefer Google Places autocomplete when a key is set; else fall back to Photon.
  const g = await googlePredictions(q, { limit, lat, lng })
  if (g && g.length) return g

  const params = new URLSearchParams({ q, limit: String(limit), lang: 'en' })
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    params.set('lat', String(lat))
    params.set('lon', String(lng))
  }
  try {
    const res = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data.features || [])
      .map((f) => {
        const [lon, la] = f.geometry?.coordinates || []
        return { lat: Number(la), lng: Number(lon), label: formatLabel(f.properties) }
      })
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.label)
  } catch {
    // AbortError (superseded keystroke) or network failure → no suggestions.
    return []
  }
}
