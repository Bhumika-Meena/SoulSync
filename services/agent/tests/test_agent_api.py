import hmac
import hashlib
import json
import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings

@pytest.mark.asyncio
async def test_healthz():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/healthz")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_agent_run_hmac_rejected_when_missing():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/internal/v1/agent/run", json={"userId": "u1", "threadId": "t1", "message": "hello"})
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_agent_run_hmac_rejected_when_tampered():
    transport = ASGITransport(app=app)
    payload = {"userId": "u1", "threadId": "t1", "message": "hello"}
    body_str = json.dumps(payload, separators=(",", ":"))
    ts = str(int(time.time()))
    bad_sig = hmac.new(b"wrong-key", f"{ts}{body_str}".encode(), hashlib.sha256).hexdigest()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/internal/v1/agent/run",
            content=body_str,
            headers={
                "Content-Type": "application/json",
                "x-internal-signature": bad_sig,
                "x-internal-timestamp": ts,
            },
        )
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_agent_run_hmac_accepted_when_valid():
    transport = ASGITransport(app=app)
    payload = {"userId": "u1", "threadId": "t1", "message": "hello"}
    body_str = json.dumps(payload, separators=(",", ":"))
    ts = str(int(time.time()))
    sig = hmac.new(settings.INTERNAL_AGENT_SECRET.encode(), f"{ts}{body_str}".encode(), hashlib.sha256).hexdigest()

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/internal/v1/agent/run",
            content=body_str,
            headers={
                "Content-Type": "application/json",
                "x-internal-signature": sig,
                "x-internal-timestamp": ts,
            },
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        body_text = response.text
        assert "event: agent.started" in body_text
        assert "event: agent.completed" in body_text
