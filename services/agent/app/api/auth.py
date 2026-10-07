import hmac
import hashlib
import time
from fastapi import Request, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from app.core.config import settings

sig_header = APIKeyHeader(name="x-internal-signature", auto_error=False)
ts_header = APIKeyHeader(name="x-internal-timestamp", auto_error=False)

async def verify_internal_hmac(request: Request):
    """Verify incoming internal request HMAC-SHA256 signature and timestamp."""
    signature = request.headers.get("x-internal-signature")
    timestamp_str = request.headers.get("x-internal-timestamp")

    if not signature or not timestamp_str:
        raise HTTPException(
            status_code=401,
            detail="Missing x-internal-signature or x-internal-timestamp header",
        )

    try:
        timestamp = int(timestamp_str)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid x-internal-timestamp format",
        )

    now = int(time.time())
    # 5 minutes window
    if abs(now - timestamp) > 300:
        raise HTTPException(
            status_code=401,
            detail="Internal request timestamp expired or outside acceptable replay window",
        )

    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8") if body_bytes else "{}"
    payload_to_sign = f"{timestamp_str}{body_str}"

    expected_signature = hmac.new(
        settings.INTERNAL_AGENT_SECRET.encode("utf-8"),
        payload_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(
            status_code=401,
            detail="Invalid internal HMAC signature",
        )

    return True
