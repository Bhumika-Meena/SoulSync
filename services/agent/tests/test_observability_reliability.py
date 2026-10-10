"""SoulSync Agent Observability & Reliability Tests (Phase 10 Batch 4).

Deterministic tests covering:
1. Correlation ID extraction, sanitization, and propagation.
2. Concurrent-request correlation isolation via contextvars.
3. ToolClient correlation forwarding without breaking HMAC signatures.
4. Prevention of duplicate terminal events in SSE event streams.
5. Readiness probe (/health/ready) vs. liveness probe (/healthz).
"""

import asyncio
import json
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.core.logging import (
    correlation_id_ctx,
    get_correlation_id,
    set_correlation_id,
)
from app.tools.client import ToolClient
from app.graph.state import AgentState
from app.api.stream import stream_workflow_events


@pytest.mark.asyncio
async def test_healthz_liveness_probe():
    """Verify /healthz is a lightweight probe returning 200 without dependency overhead."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/healthz")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["service"] == "soulsync-agent"


@pytest.mark.asyncio
async def test_health_readiness_probe_success():
    """Verify /health/ready returns 200 ready when service is configured."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health/ready")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ready"
        assert data["configured"] is True


@pytest.mark.asyncio
async def test_health_readiness_probe_fails_on_weak_production_secret():
    """Verify /health/ready returns 503 not_ready in production with weak secret."""
    orig_env = settings.ENVIRONMENT
    orig_secret = settings.INTERNAL_AGENT_SECRET
    settings.ENVIRONMENT = "production"
    settings.INTERNAL_AGENT_SECRET = "soulsync-internal-agent-secret-do-not-use-in-production"

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.get("/health/ready")
            assert res.status_code == 503
            data = res.json()
            assert data["status"] == "not_ready"
            assert data["configured"] is False
    finally:
        settings.ENVIRONMENT = orig_env
        settings.INTERNAL_AGENT_SECRET = orig_secret


@pytest.mark.asyncio
async def test_correlation_id_middleware_preserves_valid_id():
    """Verify valid incoming correlation identifier is echoed in response headers."""
    transport = ASGITransport(app=app)
    valid_corr_id = "corr_session_abc12345"

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/healthz", headers={"x-correlation-id": valid_corr_id})
        assert res.status_code == 200
        assert res.headers.get("x-correlation-id") == valid_corr_id
        assert res.headers.get("x-request-id") == valid_corr_id


@pytest.mark.asyncio
async def test_correlation_id_middleware_sanitizes_malformed_id():
    """Verify malformed incoming correlation ID is replaced with a clean UUID."""
    transport = ASGITransport(app=app)
    malformed_id = "invalid id with spaces & <script>"

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/healthz", headers={"x-correlation-id": malformed_id})
        assert res.status_code == 200
        assigned_id = res.headers.get("x-correlation-id")
        assert assigned_id is not None
        assert assigned_id != malformed_id
        assert " " not in assigned_id
        assert "<" not in assigned_id


@pytest.mark.asyncio
async def test_concurrent_request_correlation_isolation():
    """Verify concurrent async tasks maintain strict request-scoped correlation isolation."""
    async def task_worker(task_id: str, expected_corr: str):
        token = set_correlation_id(expected_corr)
        try:
            # Yield control to event loop to simulate concurrent task switching
            await asyncio.sleep(0.01)
            actual_corr = get_correlation_id()
            assert actual_corr == expected_corr
            return actual_corr
        finally:
            correlation_id_ctx.reset(token)

    results = await asyncio.gather(
        task_worker("task_1", "corr_isolated_alpha_111"),
        task_worker("task_2", "corr_isolated_beta_222"),
        task_worker("task_3", "corr_isolated_gamma_333"),
    )

    assert results == [
        "corr_isolated_alpha_111",
        "corr_isolated_beta_222",
        "corr_isolated_gamma_333",
    ]


@pytest.mark.asyncio
async def test_tool_client_propagates_correlation_headers():
    """Verify ToolClient attaches active correlation ID to signed internal requests."""
    token = set_correlation_id("corr_tool_forwarding_777")
    try:
        client = ToolClient()
        _, headers = client._sign_request({"tool": "search_memory", "userId": "u1"})
        assert headers.get("x-correlation-id") == "corr_tool_forwarding_777"
        assert headers.get("x-request-id") == "corr_tool_forwarding_777"
        assert "x-internal-signature" in headers
        assert "x-internal-timestamp" in headers
    finally:
        correlation_id_ctx.reset(token)


@pytest.mark.asyncio
async def test_stream_workflow_events_prevents_duplicate_terminal_events():
    """Verify stream does not emit duplicate terminal events even if completion occurs."""
    state = AgentState(
        user_id="user_stream_test",
        thread_id="thread_stream_test",
        message="Hello companion",
    )
    config = {"configurable": {"thread_id": "thread_stream_test"}}

    events = []
    async for event_chunk in stream_workflow_events(state, config):
        events.append(event_chunk)

    terminal_events = [
        ev for ev in events if "event: agent.completed" in ev or "event: agent.error" in ev
    ]

    # Exactly one terminal event must be emitted
    assert len(terminal_events) == 1
