import hmac
import hashlib
import json
import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings

def _get_auth_headers(body_dict: dict) -> tuple[str, dict]:
    body_str = json.dumps(body_dict, separators=(",", ":"))
    ts = str(int(time.time()))
    sig = hmac.new(
        settings.INTERNAL_AGENT_SECRET.encode(),
        f"{ts}{body_str}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return body_str, {
        "Content-Type": "application/json",
        "x-internal-signature": sig,
        "x-internal-timestamp": ts,
    }

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
    body_str, headers = _get_auth_headers(payload)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/internal/v1/agent/run",
            content=body_str,
            headers=headers,
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        body_text = response.text
        assert "event: agent.started" in body_text
        assert "event: agent.completed" in body_text

@pytest.mark.asyncio
async def test_agent_resume_rejection_flow():
    """Verify resuming an action with approved=False cancels and produces cancellation message."""
    transport = ASGITransport(app=app)
    
    # 1. Propose goal action
    run_payload = {
        "userId": "user_api_rej",
        "threadId": "thread_api_rej",
        "message": "I want to start a habit of daily walking",
    }
    body_str, headers = _get_auth_headers(run_payload)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/internal/v1/agent/run", content=body_str, headers=headers)
        assert res.status_code == 200
        assert "event: approval.required" in res.text

        # 2. Resume with approved=False
        resume_payload = {
            "userId": "user_api_rej",
            "threadId": "thread_api_rej",
            "actionId": "act_thread_api_rej",
            "approved": False,
        }
        r_body_str, r_headers = _get_auth_headers(resume_payload)
        res_resume = await ac.post("/internal/v1/agent/resume", content=r_body_str, headers=r_headers)
        assert res_resume.status_code == 200
        resume_text = res_resume.text
        assert "event: approval.required" not in resume_text
        assert "cancelled" in resume_text.lower()

@pytest.mark.asyncio
async def test_agent_resume_duplicate_rejected():
    """Verify duplicate submission of the same action is rejected with 409 Conflict."""
    transport = ASGITransport(app=app)
    action_id = "act_duplicate_test"

    # Register action by running
    run_payload = {
        "userId": "user_api_dup",
        "threadId": "thread_api_dup",
        "message": "Set a goal to meditate",
    }
    body_str, headers = _get_auth_headers(run_payload)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post("/internal/v1/agent/run", content=body_str, headers=headers)

        resume_payload = {
            "userId": "user_api_dup",
            "threadId": "thread_api_dup",
            "actionId": "act_thread_api_dup",
            "approved": False,
        }
        r_body, r_headers = _get_auth_headers(resume_payload)
        first_res = await ac.post("/internal/v1/agent/resume", content=r_body, headers=r_headers)
        assert first_res.status_code == 200

        # Duplicate attempt
        second_res = await ac.post("/internal/v1/agent/resume", content=r_body, headers=r_headers)
        assert second_res.status_code == 409
        assert "already been processed" in second_res.text

@pytest.mark.asyncio
async def test_agent_resume_cross_user_forbidden():
    """Verify unauthorized users cannot resume or approve another user's action."""
    transport = ASGITransport(app=app)
    
    # User 1 proposes action
    run_payload = {
        "userId": "user_owner",
        "threadId": "thread_cross_user",
        "message": "Help me set a goal for sleep hygiene",
    }
    body_str, headers = _get_auth_headers(run_payload)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post("/internal/v1/agent/run", content=body_str, headers=headers)

        # Attacker / other user attempts to resume User 1's action
        attacker_payload = {
            "userId": "user_attacker",
            "threadId": "thread_cross_user",
            "actionId": "act_thread_cross_user",
            "approved": True,
        }
        a_body, a_headers = _get_auth_headers(attacker_payload)
        res = await ac.post("/internal/v1/agent/resume", content=a_body, headers=a_headers)
        assert res.status_code == 403
        assert "not belong to the authenticated user" in res.text
