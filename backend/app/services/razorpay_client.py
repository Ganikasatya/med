"""
Razorpay client — thin wrapper over the REST API (no SDK dependency).

Only two operations are needed for booking-fee payments:
  * create_order()      — server creates an order with the fee amount; the
                          returned order_id is what the browser checkout opens.
  * verify_signature()  — after the patient pays, the browser returns
                          (order_id, payment_id, signature); we recompute the
                          HMAC with our secret to prove the payment is genuine
                          and wasn't forged client-side.

The key_secret never leaves the server. `is_configured()` lets callers degrade
gracefully (skip the payment step) when no keys are set.
"""
import hashlib
import hmac

import httpx

from ..config import settings

_API = "https://api.razorpay.com/v1"


def is_configured() -> bool:
    return bool(settings.razorpay_key_id and settings.razorpay_key_secret)


def create_order(amount_paise: int, receipt: str, notes: dict | None = None) -> dict:
    """Create a Razorpay order. amount_paise is the fee in the smallest unit
    (₹100 → 10000). Raises httpx.HTTPStatusError on a non-2xx from Razorpay."""
    resp = httpx.post(
        f"{_API}/orders",
        json={"amount": amount_paise, "currency": "INR", "receipt": receipt, "notes": notes or {}},
        auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
        timeout=20.0,
    )
    resp.raise_for_status()
    return resp.json()


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """True if `signature` is the genuine HMAC-SHA256 of "order_id|payment_id"
    keyed by our secret — i.e. the payment really happened on our account."""
    if not (order_id and payment_id and signature):
        return False
    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def webhook_configured() -> bool:
    return bool(settings.razorpay_webhook_secret)


def verify_webhook(raw_body: bytes, signature: str) -> bool:
    """True if a webhook request genuinely came from Razorpay — its signature is
    the HMAC-SHA256 of the raw body keyed by the dashboard webhook secret."""
    if not (settings.razorpay_webhook_secret and signature):
        return False
    expected = hmac.new(settings.razorpay_webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
