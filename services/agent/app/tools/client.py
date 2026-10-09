import hmac
import hashlib
import json
import time
import uuid
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings

class ToolClient:
    """Internal HTTP client for executing authorized tools via NestJS Tool Gateway."""

    def __init__(self, base_url: Optional[str] = None, secret: Optional[str] = None):
        self.base_url = base_url or settings.INTERNAL_GATEWAY_URL
        self.secret = secret or settings.INTERNAL_AGENT_SECRET

    def _sign_request(self, body_dict: Dict[str, Any]) -> tuple[str, Dict[str, str]]:
        timestamp = str(int(time.time()))
        # Serialize to compact JSON for consistent string representation
        body_str = json.dumps(body_dict, separators=(",", ":"))
        payload_to_sign = f"{timestamp}{body_str}"
        signature = hmac.new(
            self.secret.encode("utf-8"),
            payload_to_sign.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "x-internal-signature": signature,
            "x-internal-timestamp": timestamp,
        }
        return body_str, headers

    async def execute_tool(
        self, tool: str, user_id: str, payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        tool_payload = dict(payload or {})
        tool_payload.setdefault("_nonce", uuid.uuid4().hex[:16])
        body_dict = {
            "tool": tool,
            "userId": user_id,
            "payload": tool_payload,
        }
        body_str, headers = self._sign_request(body_dict)

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                self.base_url,
                content=body_str,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    async def get_recent_journal_entries(
        self, user_id: str, limit: int = 5
    ) -> Dict[str, Any]:
        return await self.execute_tool(
            "get_recent_journal_entries",
            user_id,
            {"limit": limit},
        )

    async def get_emotion_trends(
        self, user_id: str, days: int = 7
    ) -> Dict[str, Any]:
        return await self.execute_tool(
            "get_emotion_trends",
            user_id,
            {"days": days},
        )

    async def search_memory(
        self, user_id: str, query: str, limit: int = 5, min_similarity: float = 0.2
    ) -> Dict[str, Any]:
        return await self.execute_tool(
            "search_memory",
            user_id,
            {"query": query, "limit": limit, "minSimilarity": min_similarity},
        )

    async def create_wellness_goal(
        self,
        user_id: str,
        title: str,
        description: Optional[str] = None,
        target_date: Optional[str] = None,
        approved: bool = False,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "title": title,
            "approved": approved,
        }
        if description:
            payload["description"] = description
        if target_date:
            payload["targetDate"] = target_date

        return await self.execute_tool("create_wellness_goal", user_id, payload)
