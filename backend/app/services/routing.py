"""
Road travel time via OpenRouteService (free, no credit card).

The leave-by feature needs door-to-clinic travel time. Haversine (in
token_engine) only knows straight-line distance; this asks a real routing engine
for actual driving time over the road network. We use OpenRouteService's Matrix
endpoint — a free key (no card) at openrouteservice.org/dev covers ~2,000
requests/day, far more than a clinic booking app needs.

Fails open: no key, a timeout, or any bad response returns None, and the caller
falls back to the haversine estimate. Real driving time is a nicety, never a
hard dependency.
"""
from __future__ import annotations

from typing import Optional

import httpx

from ..config import settings

_HTTP_TIMEOUT = httpx.Timeout(8.0, connect=4.0)


def driving_minutes(o_lat: float, o_lng: float, d_lat: float, d_lng: float) -> Optional[int]:
    """Driving minutes from origin to destination, or None if unavailable.

    Note ORS takes coordinates as [longitude, latitude] — the reverse of the
    usual lat/lng order — and returns durations in seconds.
    """
    key = (settings.openrouteservice_api_key or "").strip()
    if not key:
        return None
    payload = {
        "locations": [[o_lng, o_lat], [d_lng, d_lat]],
        "metrics": ["duration"],
        "sources": [0],
        "destinations": [1],
    }
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            res = client.post(
                f"{settings.openrouteservice_base_url}/v2/matrix/driving-car",
                headers={"Authorization": key, "Content-Type": "application/json"},
                json=payload,
            )
        if res.status_code >= 400:
            print(f"[routing] ORS error {res.status_code}: {res.text[:200]}")
            return None
        seconds = res.json()["durations"][0][0]
        if seconds is None:                       # ORS returns null when unroutable
            return None
        return max(1, round(float(seconds) / 60.0))
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        print(f"[routing] failed, falling back to haversine: {exc}")
        return None
