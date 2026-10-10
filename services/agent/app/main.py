import os
import re
import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.stream import router as agent_router
from app.core.config import settings
from app.core.logging import (
    setup_logging,
    correlation_id_ctx,
    SAFE_CORRELATION_ID_REGEX,
)

# Initialize structured JSON logging
setup_logging()

app = FastAPI(
    title="SoulSync AI Agent Service",
    version="0.1.0",
    description="Stateful reasoning engine built with LangGraph",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-correlation-id", "x-request-id"],
)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        corr_id = (
            request.headers.get("x-correlation-id")
            or request.headers.get("x-request-id")
            or ""
        ).strip()

        if not corr_id or not SAFE_CORRELATION_ID_REGEX.match(corr_id):
            corr_id = str(uuid.uuid4())

        token = correlation_id_ctx.set(corr_id)
        try:
            response: Response = await call_next(request)
            response.headers["x-correlation-id"] = corr_id
            response.headers["x-request-id"] = corr_id
            return response
        finally:
            correlation_id_ctx.reset(token)


app.add_middleware(CorrelationIdMiddleware)

app.include_router(agent_router)


@app.get("/healthz")
async def health_check():
    """Lightweight liveness probe indicating process is running."""
    return {"status": "ok", "service": "soulsync-agent", "version": "0.1.0"}


@app.get("/health/ready")
@app.get("/readyz")
async def readiness_check(response: Response):
    """Readiness probe verifying service is properly configured to process work.
    
    Checks that secret and gateway URL are configured, without making unbounded
    remote external model calls or leaking secret values.
    """
    is_ready = bool(settings.INTERNAL_AGENT_SECRET and settings.INTERNAL_GATEWAY_URL)
    if settings.is_production:
        dev_secret = "soulsync-internal-agent-secret-do-not-use-in-production"
        if settings.INTERNAL_AGENT_SECRET == dev_secret or len(settings.INTERNAL_AGENT_SECRET) < 32:
            is_ready = False

    if not is_ready:
        response.status_code = 503
        return {
            "status": "not_ready",
            "service": "soulsync-agent",
            "configured": False,
        }

    return {
        "status": "ready",
        "service": "soulsync-agent",
        "configured": True,
    }
