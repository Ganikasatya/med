import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { Navigation } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { isGoogleEnabled, loadGoogleMaps } from '../../lib/googleMaps.js'

/** A free deep-link that opens the real Google Maps app/site with driving
 *  directions (origin → clinic). No API call, no quota — just like Uber/Rapido. */
function OpenInMapsButton({ clinic, origin }) {
  const dest = `${clinic[0]},${clinic[1]}`
  const url = origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${dest}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${dest}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-2.5 right-2.5 z-[1200] inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[12px] font-bold text-brand-blue shadow-md ring-1 ring-slate-200 backdrop-blur hover:bg-white"
    >
      <Navigation className="h-3.5 w-3.5" /> Open in Google Maps
    </a>
  )
}

/** Inline pin SVG as a data-URI (reused by the Google renderer's markers). */
function pinDataUri(color) {
  const svg = `<svg width="30" height="42" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="#ffffff"/></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

/** Google Maps renderer (used when a key is configured). */
function GoogleClinicMap({ clinic, origin, clinicLabel, originLabel, height, className }) {
  const ref = useRef(null)
  const cKey = clinic ? clinic.join(',') : ''
  const oKey = origin ? origin.join(',') : ''
  useEffect(() => {
    let cancelled = false
    loadGoogleMaps().then((google) => {
      if (cancelled || !google || !ref.current) return
      const icon = (color) => ({ url: pinDataUri(color), scaledSize: new google.maps.Size(30, 42), anchor: new google.maps.Point(15, 42) })
      const map = new google.maps.Map(ref.current, {
        center: { lat: clinic[0], lng: clinic[1] }, zoom: 14,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      })
      const bounds = new google.maps.LatLngBounds()
      const cPos = { lat: clinic[0], lng: clinic[1] }
      new google.maps.Marker({ position: cPos, map, title: clinicLabel, icon: icon('#2563eb') })
      bounds.extend(cPos)
      if (origin) {
        const oPos = { lat: origin[0], lng: origin[1] }
        new google.maps.Marker({ position: oPos, map, title: originLabel, icon: icon('#059669') })
        bounds.extend(oPos)
        map.fitBounds(bounds, 48)
        // Draw the REAL driving route (follows roads); fall back to a straight
        // line if the Directions API isn't enabled / has no route.
        const renderer = new google.maps.DirectionsRenderer({
          map, suppressMarkers: true, preserveViewport: true,
          polylineOptions: { strokeColor: '#2563eb', strokeWeight: 4, strokeOpacity: 0.85 },
        })
        new google.maps.DirectionsService().route(
          { origin: oPos, destination: cPos, travelMode: google.maps.TravelMode.DRIVING, drivingOptions: { departureTime: new Date() } },
          (res, status) => {
            if (status === 'OK') renderer.setDirections(res)
            else new google.maps.Polyline({ path: [oPos, cPos], map, strokeColor: '#2563eb', strokeOpacity: 0.6, strokeWeight: 3, geodesic: true })
          },
        )
      } else {
        map.setCenter(cPos); map.setZoom(14)
      }
    })
    return () => { cancelled = true }
  }, [cKey, oKey, clinicLabel, originLabel])
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 ${className}`} style={{ height }}>
      <div ref={ref} className="h-full w-full" />
      <OpenInMapsButton clinic={clinic} origin={origin} />
    </div>
  )
}

/**
 * Lightweight interactive map (Leaflet + free OpenStreetMap tiles, no API key).
 *
 * Shows the clinic location and, optionally, the patient's origin plus a line
 * between them. Coordinates are { latitude, longitude } for the clinic and
 * { lat, lng } for the origin — matching how the rest of the app stores them.
 *
 * We build markers with an inline-SVG divIcon instead of Leaflet's default
 * image marker, because the default icon's image paths break under Vite's
 * bundler. This keeps the component asset-free and self-contained.
 */

function pin(color) {
  return L.divIcon({
    className: 'clinic-map-pin',
    html: `<svg width="30" height="42" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="#ffffff"/>
    </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  })
}

const CLINIC_ICON = pin('#2563eb') // brand blue
const ORIGIN_ICON = pin('#059669') // emerald

/** Keep the view framed on whatever points we have, re-fitting when they move. */
function FitBounds({ points }) {
  const map = useMap()
  useMemo(() => {
    if (points.length === 1) {
      map.setView(points[0], 14)
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points).pad(0.25))
    }
  }, [map, points])
  return null
}

export default function ClinicMap({
  clinic,
  origin = null,
  clinicLabel = 'Clinic',
  originLabel = 'You',
  height = 240,
  className = '',
}) {
  const clinicLatLng = clinic && clinic.latitude != null && clinic.longitude != null
    ? [Number(clinic.latitude), Number(clinic.longitude)]
    : null
  const originLatLng = origin && origin.lat != null && origin.lng != null
    ? [Number(origin.lat), Number(origin.lng)]
    : null

  const points = [clinicLatLng, originLatLng].filter(
    (p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]) && !(p[0] === 0 && p[1] === 0),
  )

  if (!points.length) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 ${className}`}
        style={{ height }}
      >
        Location not available
      </div>
    )
  }

  // Google Maps when a key is set; otherwise the free Leaflet/OpenStreetMap map.
  if (isGoogleEnabled()) {
    return (
      <GoogleClinicMap
        clinic={clinicLatLng && points.includes(clinicLatLng) ? clinicLatLng : points[0]}
        origin={originLatLng && points.includes(originLatLng) ? originLatLng : null}
        clinicLabel={clinicLabel}
        originLabel={originLabel}
        height={height}
        className={className}
      />
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 ${className}`} style={{ height }}>
      <OpenInMapsButton clinic={clinicLatLng || points[0]} origin={originLatLng} />
      <MapContainer center={points[0]} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {clinicLatLng && (
          <Marker position={clinicLatLng} icon={CLINIC_ICON}>
            <Popup>{clinicLabel}</Popup>
          </Marker>
        )}
        {originLatLng && (
          <Marker position={originLatLng} icon={ORIGIN_ICON}>
            <Popup>{originLabel}</Popup>
          </Marker>
        )}
        {clinicLatLng && originLatLng && (
          <Polyline positions={[originLatLng, clinicLatLng]} pathOptions={{ color: '#2563eb', weight: 3, dashArray: '6 6', opacity: 0.7 }} />
        )}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  )
}
